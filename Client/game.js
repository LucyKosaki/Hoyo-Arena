// --- This file handles all IN-GAME logic ---
import { ui } from './ui.js'; 
import { playVictoryMusic, playDefeatMusic } from './audio.js'; // --- NEW IMPORT

// Game-specific state
let socket = null;
let myPlayerIndex = -1;
let myRoomId = null;
let myTeamName = ""; 
let gameState = {};
let draggedItemIndex = null; 
let confirmCallback = null; 
let logMessage; // Will be set by initGame

// --- Track Exchanges for the current turn ---
let currentTurnExchanges = []; 

// --- Master lists provided by main.js ---
let allCharactersList = {};
let allEffectsList = {};

/**
 * Initializes the game screen and all in-game event listeners.
 */
export function initGame(socketInstance, state, pIndex, rId, tName, logFunc, masterCharacters, masterEffects) {
    // Set global game vars
    socket = socketInstance;
    gameState = state;
    myPlayerIndex = pIndex;
    myRoomId = rId;
    myTeamName = tName;
    logMessage = logFunc; 
    
    // --- Store the master lists ---
    allCharactersList = masterCharacters;
    allEffectsList = masterEffects;
    
    // Set up listeners that only apply when in-game
    ui.endTurnBtn.addEventListener('click', onEndTurnClick);
    ui.giveUpBtn.addEventListener('click', onGiveUpClick); 
    ui.exchangeBtn.addEventListener('click', onExchangeClick);
    ui.modalCancelBtn.addEventListener('click', onCancelChakraPicker);
    ui.confirmNoBtn.addEventListener('click', hideConfirmModal);
    ui.confirmYesBtn.addEventListener('click', onConfirmYes);
    ui.backToLobbyBtn.addEventListener('click', onBackToLobbyClick);
}

/**
 * The main render loop for the game.
 */
export function renderGame(newState) {
    gameState = newState;
    
    // --- RESET Exchange Queue on new state ---
    currentTurnExchanges = []; 
    
    // --- Rehydrate Maps (Socket.io converts Maps to Objects) ---
    rehydrateProperties(gameState);
    
    if (!gameState.gameActive) {
        if (!gameState.winner) return; 
        endGame(gameState.winner, myTeamName);
        return;
    }
    if (!gameState.teams || !gameState.teams[0]) {
        return;
    }
    
    const myTurn = (gameState.currentTeamIndex === myPlayerIndex);
    const isBusy = (gameState.turnPhase !== 'planning');
    const team = gameState.teams[gameState.currentTeamIndex];
    const totalChakra = team ? (team.chakra.green + team.chakra.blue + team.chakra.red + team.chakra.white) : 0;

    ui.endTurnBtn.disabled = !myTurn || isBusy;
    ui.exchangeBtn.disabled = !myTurn || isBusy || totalChakra < 5;
    ui.giveUpBtn.disabled = isBusy;

    renderRosters();
    renderChakraBanks();
    renderSkillQueue();
    
    if (myTurn) {
        document.getElementById('active-team-area').style.display = 'block';
        renderActiveSkills();
    } else {
        document.getElementById('active-team-area').style.display = 'none';
    }
}

// --- HELPER: Rehydrate Maps ---
function rehydrateProperties(state) {
    if (!state.teams) return;
    state.teams.forEach(team => {
        team.characters.forEach(char => {
            // Convert plain object to Map if necessary
            if (char.properties && !(char.properties instanceof Map)) {
                if (Array.isArray(char.properties)) {
                     char.properties = new Map(char.properties);
                } else {
                     char.properties = new Map(Object.entries(char.properties));
                }
            }
            // Do the same for resources
            if (char.resources && !(char.resources instanceof Map)) {
                if (Array.isArray(char.resources)) {
                     char.resources = new Map(char.resources);
                } else {
                     char.resources = new Map(Object.entries(char.resources));
                }
            }
        });
    });
}

/**
 * Renders the final end game modal.
 */
export function endGame(winnerName) {
    if (!ui.endGameModal.classList.contains('hidden')) return; 
    
    if (winnerName === myTeamName) {
        ui.endGameText.textContent = "You Win!";
        ui.endGameText.className = "win";
        playVictoryMusic(); // --- NEW: Play Victory Music
    } else {
        ui.endGameText.textContent = "You Lose!";
        ui.endGameText.className = "loss";
        playDefeatMusic(); // --- NEW: Play Defeat Music
    }
    
    ui.endGameModal.classList.remove('hidden');
    document.body.classList.add('modal-active');

    document.getElementById('active-team-area').style.display = 'none';
    ui.endTurnBtn.disabled = true;
    ui.exchangeBtn.disabled = true;
    ui.giveUpBtn.disabled = true;
}

// --- RENDER FUNCTIONS (FOR IN-GAME) ---

function renderChakraBanks() {
    if (!gameState.teams || !gameState.teams[0]) return; 
    const t1 = gameState.teams[0];
    const t2 = gameState.teams[1];
    
    const t1Total = t1.chakra.green + t1.chakra.blue + t1.chakra.red + t1.chakra.white;
    const t2Total = t2.chakra.green + t2.chakra.blue + t2.chakra.red + t2.chakra.white;

    ui.t1ChakraBank.innerHTML = `
        <div class="chakra-orb green">G: ${t1.chakra.green}</div>
        <div class="chakra-orb blue">B: ${t1.chakra.blue}</div>
        <div class="chakra-orb red">R: ${t1.chakra.red}</div>
        <div class="chakra-orb white">W: ${t1.chakra.white}</div>
        <div class="chakra-orb any">Any: ${t1Total}</div>
    `;
    ui.t2ChakraBank.innerHTML = `
        <div class="chakra-orb green">G: ${t2.chakra.green}</div>
        <div class="chakra-orb blue">B: ${t2.chakra.blue}</div>
        <div class="chakra-orb red">R: ${t2.chakra.red}</div>
        <div class="chakra-orb white">W: ${t2.chakra.white}</div>
        <div class="chakra-orb any">Any: ${t2Total}</div>
    `;
}

// --- HELPER: Classify Effects for UI ---
function getEffectUIType(effectModel) {
    if (!effectModel) return 'neutral';
    const name = effectModel.name.toLowerCase();
    if (name.includes('stun') || name.includes('poison') || name.includes('affliction')) return 'debuff';
    if (name.includes('invulnerable') || name.includes('shield') || name.includes('defense') || name.includes('buff')) return 'buff';
    return 'neutral';
}

// --- NEW HELPER: Get Human Readable Duration ---
function getDurationText(duration) {
    if (duration >= 900) return "Permanent";
    if (duration <= 1) return "Ends this turn.";
    const turns = Math.ceil(duration / 2);
    return `${turns} turn${turns > 1 ? 's' : ''} left`;
}

// --- NEW HELPER: Smart Property Text (Full Sentences) ---
function getFriendlyPropertyName(key, value) {
    // Clean common prefixes
    if (key.startsWith('Stun_')) {
        return `This character is stunned (${key.replace('Stun_', '')}).`;
    }
    if (key.startsWith('Override_') && key.endsWith('_ActionTarget')) {
        const skill = key.replace('Override_', '').replace('_ActionTarget', '').replace(/_/g, ' ');
        return `[${skill}] targets ${value}.`;
    }
    
    // Handle common stats
    switch(key) {
        case 'Invulnerable': return "This character is invulnerable.";
        case 'IgnoreStuns': return "This character ignores stuns.";
        case 'DamageReduction': return `This character takes ${value} less damage.`;
        case 'IncreaseDamageTaken': return `This character takes ${value} more damage.`;
        case 'BonusDamage': return `This character deals ${value} more damage.`;
        case 'DestructibleDefense': return `This character has ${value} destructible defense.`;
        
        case 'IncDamageDealt_All': return `This character deals ${value} more damage.`;
        case 'DecDamageDealt_All': return `This character deals ${value} less damage.`;
        
        case 'IncDamageDealt_Physical': return `This character deals ${value} more physical damage.`;
        case 'DecDamageDealt_Physical': return `This character deals ${value} less physical damage.`;
        
        case 'IncDamageDealt_Energy': return `This character deals ${value} more energy damage.`;
        case 'DecDamageDealt_Energy': return `This character deals ${value} less energy damage.`;
        
        case 'InvertHealing': return "This character takes damage from healing.";
        case 'InvertHelpfulHarmful': return "This character treats helpful skills as harmful.";
        case 'Inverted': return "This character is Inverted.";
        
        // Fallback
        default: 
            if(key.startsWith('CostMod_')) return `Cost Changed (${key.replace('CostMod_', '')}: ${value})`;
            return `${key}: ${value}`;
    }
}

// --- CLIENT SIDE CONDITION CHECKER ---
function checkTargetReqs(skill, caster, target) {
    if (!skill.targetReqs || skill.targetReqs.length === 0) return true;

    for (const cond of skill.targetReqs) {
        let left;
        let right = cond.value;

        // We only implement Target checks here for now
        if (cond.field === 'Target.HealthPercent') {
            left = (target.hp / target.maxHp) * 100;
        } else if (cond.field === 'Target.Health') {
            left = target.hp;
        } else if (cond.field === 'Target.HasProperty') {
            left = target.properties.has(right);
            right = true; // If we are checking HasProperty('Marked'), left is boolean
        } else if (cond.field === 'Target.DoesNotHaveProperty') {
            left = !target.properties.has(right);
            right = true;
        } else if (cond.field === 'Target.HasEffect') {
             // Check active effects
             left = target.activeEffects.some(e => e.model.name === right);
             right = true;
        } else if (cond.field === 'Target.IsStunned') {
             left = target.properties.has('Stun_Full') || target.properties.has('Stun_Physical') || 
                    target.properties.has('Stun_Energy') || target.properties.has('Stun_Strategic');
             right = true;
        }
        
        // Basic Ops
        let result = false;
        const op = cond.operator;
        
        if (op === '==' || op === 'HasEffect' || op === 'HasProperty') result = (left == right);
        else if (op === '!=') result = (left != right);
        else if (op === '<') result = (left < right);
        else if (op === '<=') result = (left <= right);
        else if (op === '>') result = (left > right);
        else if (op === '>=') result = (left >= right);
        
        if (!result) return false;
    }
    
    return true;
}

// --- REWRITTEN: renderRosters with INTELLIGENT Tooltips ---
function renderRosters() {
    if (!gameState.teams || !gameState.teams[0]) return;
    document.body.classList.toggle('awaiting-target', gameState.turnPhase === 'selectingTarget');

    for (let t = 0; t < 2; t++) {
        for (let c = 0; c < 3; c++) {
            const character = gameState.teams[t].characters[c];
            const cardSet = ui.charCards[`t${t}`];
            const card = cardSet[c].card;

            cardSet[c].name.textContent = character.name;
            cardSet[c].hpLabel.textContent = `HP: ${character.hp} / ${character.maxHp}`;
            cardSet[c].hpBar.style.width = `${(character.hp / character.maxHp) * 100}%`;

            card.classList.toggle('dead', character.hp <= 0);

            // --- Effect Icon Rendering ---
            cardSet[c].buffs.innerHTML = ''; 
            
            // 1. Group Active Effects by Source Skill Name
            const effectGroups = {};
            
            character.activeEffects.forEach(activeEffect => {
                const effectModel = allEffectsList[activeEffect.model.name];
                if (!effectModel) return; 
                
                if (effectModel.isInvisible && t !== myPlayerIndex) return;
                
                const sourceName = activeEffect.sourceSkillName || effectModel.name;
                const key = sourceName; 
                
                if (!effectGroups[key]) {
                    effectGroups[key] = {
                        sourceName: sourceName,
                        model: effectModel, 
                        count: 0,
                        instances: [] 
                    };
                }
                effectGroups[key].count++;
                effectGroups[key].instances.push(activeEffect);
            });
            
            // 2. Generate Icons
            for (const key in effectGroups) {
                const group = effectGroups[key];
                const model = group.model;
                let uiType = getEffectUIType(model);
                let extraClass = '';
                
                let tooltipContent = `<h5>${group.sourceName}</h5>`;
                
                // B. DYNAMIC STATUS LINES
                group.instances.forEach(inst => {
                    const actions = [];
                    if (allEffectsList[inst.model.name].logicBlocks) {
                        allEffectsList[inst.model.name].logicBlocks.forEach(block => {
                            block.actions.forEach(act => actions.push(act));
                        });
                    }
                    
                    const durationText = inst.isPermanent ? "Permanent" : getDurationText(inst.duration);
                    const colorClass = (!inst.isPermanent && inst.duration <= 1) ? 'expiring-text' : '';

                    if (actions.length === 0) {
                        // Fallback for simple effects
                        tooltipContent += `<div class="tooltip-entry"><span class="tooltip-timer ${colorClass}">${durationText}</span></div>`;
                    } else {
                        // List the "Primary" things this instance does
                        actions.forEach(action => {
                            let desc = "";
                            
                            // --- STANDARD ACTIONS ---
                            if (action.type === 'SetProperty') desc = getFriendlyPropertyName(action.property, action.propertyValue);
                            else if (action.type === 'Stun') desc = getFriendlyPropertyName(`Stun_${action.stunType}`, true);
                            else if (action.type === 'ModifySkillTargetType') desc = getFriendlyPropertyName(`Override_${action.targetSkill || 'All'}_ActionTarget`, action.newTargetType);
                            
                            else if (action.type === 'ModifySkillMechanics') {
                                const skill = action.targetSkill || "All Skills";
                                const parts = [];
                                if (action.mechanics?.ignoreInvuln) parts.push("ignores invulnerability");
                                if (action.mechanics?.uncounterable) parts.push("cannot be countered or reflected");
                                if (parts.length > 0) desc = `[${skill}] ${parts.join(' and ')}.`;
                            }
                            
                            else if (action.type === 'IncreaseDamageDealt') desc = `This character deals ${action.amount} more damage.`;
                            else if (action.type === 'DecreaseDamageDealt') desc = `This character deals ${action.amount} less damage.`;
                            else if (action.type === 'Damage' && inst.model.name.includes('Poison')) desc = `This character takes ${action.amount} damage.`;

                            // 1. ModifySkillCost
                            else if (action.type === 'ModifySkillCost') {
                                const skillName = action.targetSkill ? `[${action.targetSkill}]` : "Skills";
                                const cc = action.costChange || {};
                                if (cc.setRandom) {
                                    desc = `${skillName} cost changed to 1 Random energy.`;
                                } else {
                                    let parts = [];
                                    if (cc.green !== 0) parts.push(`${Math.abs(cc.green)} ${cc.green > 0 ? 'more' : 'less'} Green`);
                                    if (cc.blue !== 0) parts.push(`${Math.abs(cc.blue)} ${cc.blue > 0 ? 'more' : 'less'} Blue`);
                                    if (cc.red !== 0) parts.push(`${Math.abs(cc.red)} ${cc.red > 0 ? 'more' : 'less'} Red`);
                                    if (cc.white !== 0) parts.push(`${Math.abs(cc.white)} ${cc.white > 0 ? 'more' : 'less'} White`);
                                    if (cc.any !== 0) parts.push(`${Math.abs(cc.any)} ${cc.any > 0 ? 'more' : 'less'} Any`);
                                    
                                    if (parts.length > 0) {
                                        desc = `${skillName} cost: ${parts.join(', ')}.`;
                                    }
                                }
                            }
                            // 2. InvertHealing
                            else if (action.type === 'InvertHealing') {
                                desc = "Healing effects damage this character instead.";
                            }
                            // 3. InvertHelpfulHarmful
                            else if (action.type === 'InvertHelpfulHarmful') {
                                desc = "This character treats helpful skills as harmful (and vice-versa).";
                            }
                            // 4. ConvertProperty
                            else if (action.type === 'ConvertProperty') {
                                desc = `Converting ${action.sourceProperty} into ${action.targetProperty}.`;
                            }
                            // 5. ApplyDelayedEffect
                            else if (action.type === 'ApplyDelayedEffect') {
                                desc = `Will apply [${action.effectName}] in ${action.delayTurns} turn(s).`;
                            }
                            
                            if (desc) {
                                tooltipContent += `
                                    <div class="tooltip-entry dynamic-status">
                                        <span class="status-name">${desc}</span>
                                        <span class="tooltip-timer ${colorClass}">${durationText}</span>
                                    </div>
                                `;
                            }
                        });
                        
                        if (tooltipContent.endsWith(`<h5>${group.sourceName}</h5>`)) {
                             tooltipContent += `<div class="tooltip-entry"><span class="tooltip-timer ${colorClass}">${durationText}</span></div>`;
                        }
                    }
                });

                let shortest = Infinity;
                group.instances.forEach(i => {
                    if (!i.isPermanent && i.duration < shortest) shortest = i.duration;
                });
                
                let iconText = '';
                if (shortest === Infinity) iconText = 'P';
                else if (shortest <= 1) {
                    iconText = 'Exp';
                    extraClass = 'expiring';
                } else {
                    iconText = Math.ceil(shortest / 2).toString();
                }

                cardSet[c].buffs.innerHTML += `
                    <div class="effect-icon ${uiType} ${extraClass}">
                        <div class="effect-tooltip">
                            ${tooltipContent}
                        </div>
                        ${group.count > 1 ? `<span class="effect-stack-count">${group.count}</span>` : ''}
                        <span class="effect-duration">${iconText}</span>
                    </div>
                `;
            }

            card.onclick = null; 
            card.classList.remove('targetable');
            card.classList.remove('targetable-static'); 
            
            if (gameState.turnPhase === 'selectingTarget' && character.hp > 0 && myPlayerIndex === gameState.currentTeamIndex) {
                const { skill, modifiedCost, targetGroup } = gameState.pendingSkill;
                const currentTeam = gameState.currentTeamIndex;
                const hasUntargetable = character.properties instanceof Map ? character.properties.get('Invulnerable') === true : false;

                let isValidTarget = false;
                let isAOE = false;

                const isEnemy = t !== currentTeam;
                const isAlly = t === currentTeam;
                const isSelf = (t === currentTeam && c === gameState.pendingSkill.charIndex);
                const activeChar = gameState.teams[currentTeam].characters[gameState.pendingSkill.charIndex];

                if (targetGroup === 'Enemy' && isEnemy && !hasUntargetable) isValidTarget = true;
                if (targetGroup === 'Ally' && isAlly) isValidTarget = true; 
                if (targetGroup === 'Self' && isSelf) isValidTarget = true;
                
                if (targetGroup === 'AllyOrEnemy') {
                    if (isAlly) isValidTarget = true;
                    if (isEnemy && !hasUntargetable) isValidTarget = true;
                }

                if (targetGroup === 'AllEnemies' && isEnemy) {
                    isValidTarget = true;
                    isAOE = true;
                }
                if (targetGroup === 'AllAllies' && isAlly) {
                    isValidTarget = true;
                    isAOE = true;
                }
                if (targetGroup === 'AllAlliesAndEnemies') {
                    if (isAlly) isValidTarget = true;
                    if (isEnemy && !hasUntargetable) isValidTarget = true;
                    isAOE = true;
                }
                if (targetGroup === 'AllyTeamOrEnemyTeam') {
                    if (isAlly) isValidTarget = true;
                    if (isEnemy && !hasUntargetable) isValidTarget = true;
                    isAOE = true;
                }
                
                // --- NEW: Check Target Requirements ---
                if (isValidTarget) {
                    if (!checkTargetReqs(skill, activeChar, character)) {
                        isValidTarget = false;
                    }
                }

                if (isValidTarget) {
                    if (isAOE) {
                        card.classList.add('targetable-static');
                    } else {
                        card.classList.add('targetable');
                    }
                    card.onclick = () => onTargetSelect(t, c);
                }
            }
        }
    }
    document.getElementById('team1-container').classList.toggle('active-team', gameState.currentTeamIndex === 0);
    document.getElementById('team2-container').classList.toggle('active-team', gameState.currentTeamIndex === 1);
}

// --- Renders active team skills ---
function renderActiveSkills() {
    if (!gameState.teams || !gameState.teams[0] || myPlayerIndex === -1 || myPlayerIndex !== gameState.currentTeamIndex) {
        document.getElementById('active-team-area').style.display = 'none';
        return;
    }

    const activeTeam = gameState.teams[gameState.currentTeamIndex];
    ui.activeTeamName.textContent = activeTeam.name;

    for (let c = 0; c < 3; c++) {
        const character = activeTeam.characters[c];
        const skillSet = ui.skillSetCards[c];

        skillSet.name.textContent = character.name;
        skillSet.skills.innerHTML = ''; 

        if (character.hp <= 0) {
            skillSet.set.classList.add('dead');
            continue;
        }
        skillSet.set.classList.remove('dead');

        character.skills.slice(0, 4).forEach((skill, s_idx) => {
            const modifiedCost = getModifiedSkillCost(skill, character);
            skillSet.skills.innerHTML += createSkillButtonHTML(skill, c, s_idx, modifiedCost);
        });
    }

    addSkillListeners();
}

// --- Helper: HTML for Skill Button ---
function createSkillButtonHTML(skill, charIndex, skillIndex, modifiedCost) {
    let costText = '';
    if (modifiedCost.green > 0) costText += `<span class="cost-orb green">${modifiedCost.green}G</span>`;
    if (modifiedCost.blue > 0) costText += `<span class="cost-orb blue">${modifiedCost.blue}B</span>`;
    if (modifiedCost.red > 0) costText += `<span class="cost-orb red">${modifiedCost.red}R</span>`;
    if (modifiedCost.white > 0) costText += `<span class="cost-orb white">${modifiedCost.white}W</span>`;
    if (modifiedCost.any > 0) costText += `<span class="cost-orb any">${modifiedCost.any}A</span>`;
    if (costText === '') costText = 'Free';

    const turnsLeft = Math.ceil(skill.currentCD / 2);

    return `
        <button class="skill-button" 
                title="${skill.description || 'No description.'}" 
                data-char-index="${charIndex}" 
                data-skill-index="${skillIndex}">
            <span class="skill-name">${skill.name}</span>
            <div class="skill-cost">${costText}</div>
            ${skill.currentCD > 0 ? `<div class="skill-cooldown">${turnsLeft}</div>` : ''}
        </button>
    `;
}

// --- SKILL QUEUE RENDERING & DRAG LOGIC ---

function renderSkillQueue() {
    ui.skillQueueBar.innerHTML = ''; 
    if (!gameState.skillQueue) return;

    gameState.skillQueue.forEach((queuedSkill, index) => {
        const pill = document.createElement('div');
        pill.className = 'queue-pill';
        pill.draggable = true;
        pill.dataset.queueIndex = index; 
        
        const attacker = gameState.teams[gameState.currentTeamIndex].characters[queuedSkill.charIndex];
        const skill = attacker.skills[queuedSkill.skillIndex];
        
        pill.innerHTML = `${skill.name}`;
        
        pill.addEventListener('dragstart', (e) => {
            draggedItemIndex = index;
            e.target.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        
        pill.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            e.target.classList.add('drag-over');
        });
        
        pill.addEventListener('dragleave', (e) => {
            e.target.classList.remove('drag-over');
        });
        
        pill.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
            draggedItemIndex = null;
            document.querySelectorAll('.queue-pill').forEach(p => p.classList.remove('drag-over'));
        });
        
        pill.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetIndex = index;
            if (draggedItemIndex === targetIndex) return;
            const draggedSkill = gameState.skillQueue.splice(draggedItemIndex, 1)[0];
            gameState.skillQueue.splice(targetIndex, 0, draggedSkill);
            renderSkillQueue();
        });

        ui.skillQueueBar.appendChild(pill);
    });
}


// --- SKILL & TARGETING LOGIC ---

function getModifiedSkillCost(skill, character) {
    let cost = { ...skill.cost };
    
    const getVal = (prop) => {
        if (character.properties instanceof Map) {
            const propObj = character.properties.get(prop);
            return propObj ? propObj.value : 0;
        }
        return 0;
    };

    // Check global random set
    if (getVal('CostSet_Random') > 0) {
         return { green: 0, blue: 0, red: 0, white: 0, any: 1 };
    }

    cost.green = (cost.green || 0) + getVal('CostMod_Green');
    cost.blue = (cost.blue || 0) + getVal('CostMod_Blue');
    cost.red = (cost.red || 0) + getVal('CostMod_Red');
    cost.white = (cost.white || 0) + getVal('CostMod_White');
    cost.any = (cost.any || 0) + getVal('CostMod_Any');
    
    // Check specific skill modifiers
    if (skill.name) {
        const skillNameSafe = skill.name.replace(/\s+/g, '_');
        const propKey = `CostSet_${skillNameSafe}_Random`;
        const specificRandom = getVal(propKey);
        if (specificRandom > 0) {
             return { green: 0, blue: 0, red: 0, white: 0, any: 1 };
        }
        cost.green += getVal(`CostMod_${skillNameSafe}_Green`);
        cost.blue += getVal(`CostMod_${skillNameSafe}_Blue`);
        cost.red += getVal(`CostMod_${skillNameSafe}_Red`);
        cost.white += getVal(`CostMod_${skillNameSafe}_White`);
        cost.any += getVal(`CostMod_${skillNameSafe}_Any`);
    }

    if (cost.green < 0) cost.green = 0;
    if (cost.blue < 0) cost.blue = 0;
    if (cost.red < 0) cost.red = 0;
    if (cost.white < 0) cost.white = 0;
    if (cost.any < 0) cost.any = 0;
    
    return cost;
}

function isStunned(character, skillClass) {
    const props = character.properties;
    if (!(props instanceof Map)) return false;

    if (props.get('IgnoreStuns')) return false;
    if (props.get('Stun_Full')) return true;
    if (skillClass === 'Physical' && props.get('Stun_Physical')) return true;
    if (skillClass === 'Energy' && props.get('Stun_Energy')) return true;
    if (skillClass === 'Strategic' && props.get('Stun_Strategic')) return true;
    if (skillClass !== 'Strategic' && props.get('Stun_NonStrategic')) return true;
    return false;
}

function addSkillListeners() {
    if (!gameState.teams || !gameState.teams[0]) return;
    const activeTeam = gameState.teams[gameState.currentTeamIndex];
    const isBusy = gameState.turnPhase !== 'planning';

    document.querySelectorAll('#active-team-area .skill-button').forEach(button => {
        const charIndex = parseInt(button.dataset.charIndex);
        const skillIndex = parseInt(button.dataset.skillIndex);
        const character = activeTeam.characters[charIndex];
        const skill = character.skills[skillIndex];
        
        const modifiedCost = getModifiedSkillCost(skill, character);
        const stunned = isStunned(character, skill.skillClass);
        
        const charHasQueuedSkill = gameState.skillQueue.some(q => q.charIndex === charIndex);
        const thisSkillIsQueued = gameState.skillQueue.some(q => q.charIndex === charIndex && q.skillIndex === skillIndex);
        
        const thisSkillIsPending = gameState.turnPhase === 'selectingTarget' &&
                                  gameState.pendingSkill &&
                                  gameState.pendingSkill.charIndex === charIndex &&
                                  gameState.pendingSkill.skillIndex === skillIndex;

        button.classList.toggle('queued', thisSkillIsQueued);
        button.classList.toggle('pending', thisSkillIsPending); 

        if (!gameState.gameActive ||
            (isBusy && !thisSkillIsPending) || 
            character.hp <= 0 ||
            stunned || 
            skill.currentCD > 0 ||
            (!thisSkillIsQueued && !canAfford(activeTeam, modifiedCost)) || 
            (!thisSkillIsQueued && charHasQueuedSkill)
           ) 
        {
            button.disabled = true;
            if(stunned) button.title = `Cannot use: ${skill.skillClass} skills are stunned!`;
        } else {
            button.disabled = false;
        }

        button.onclick = () => onSkillClick(charIndex, skillIndex, modifiedCost); 
        button.oncontextmenu = (e) => e.preventDefault();
    });
}

function onSkillClick(charIndex, skillIndex, modifiedCost) { 
    const thisSkillIsQueued = gameState.skillQueue.some(q => q.charIndex === charIndex);
    const thisSkillIsPending = gameState.turnPhase === 'selectingTarget' &&
                              gameState.pendingSkill &&
                              gameState.pendingSkill.charIndex === charIndex &&
                              gameState.pendingSkill.skillIndex === skillIndex;

    if (thisSkillIsPending) {
        logMessage("Target selection canceled.");
        cancelSelection(); 
        return;
    }
    
    if (gameState.turnPhase === 'selectingTarget') {
        cancelSelection(); 
        startSkillSelection(charIndex, skillIndex, modifiedCost); 
        return;
    }

    if (thisSkillIsQueued) {
        undoSkill(charIndex);
        return;
    }

    startSkillSelection(charIndex, skillIndex, modifiedCost); 
}

function hasValidTargets(targetType) {
    const currentTeamIdx = gameState.currentTeamIndex;
    const enemyTeamIdx = 1 - currentTeamIdx;
    
    // --- NEW: Support Extended Target Types ---
    
    const hasAlive = (teamIdx) => gameState.teams[teamIdx].characters.some(char => char.hp > 0);
    const hasAliveEnemy = () => gameState.teams[enemyTeamIdx].characters.some(char => {
        const invuln = char.properties instanceof Map ? char.properties.get('Invulnerable') : false;
        return char.hp > 0 && !invuln;
    });
    
    if (targetType === 'Enemy') return hasAliveEnemy();
    if (targetType === 'Ally') return hasAlive(currentTeamIdx);
    if (targetType === 'Self') return gameState.teams[currentTeamIdx].characters[gameState.pendingSkill.charIndex].hp > 0;
    
    if (targetType === 'AllyOrEnemy') return hasAlive(currentTeamIdx) || hasAliveEnemy();
    if (targetType === 'AllEnemies') return hasAliveEnemy();
    if (targetType === 'AllAllies') return hasAlive(currentTeamIdx);
    if (targetType === 'AllAlliesAndEnemies') return hasAlive(currentTeamIdx) || hasAliveEnemy();
    if (targetType === 'AllyTeamOrEnemyTeam') return hasAlive(currentTeamIdx) || hasAliveEnemy();

    return false;
}

function startSkillSelection(charIndex, skillIndex, modifiedCost) { 
    const activeTeam = gameState.teams[gameState.currentTeamIndex];
    const character = activeTeam.characters[charIndex];
    const skill = character.skills[skillIndex];

    if (!canAfford(activeTeam, modifiedCost)) {
        logMessage("Not enough Chakra!");
        return;
    }
    
    // --- NEW: Check for Override Target Type Property ---
    // Client-side look for "Override_[SkillName]_TargetType" string property
    let targetType = skill.targetType;
    const skillNameSafe = skill.name.replace(/\s+/g, '_');
    const overrideProp = `Override_${skillNameSafe}_TargetType`;
    
    // Helper to get prop
    const getVal = (prop) => {
        if (character.properties instanceof Map) {
            const propObj = character.properties.get(prop);
            return propObj ? propObj.value : null;
        }
        return null;
    };
    
    const overrideVal = getVal(overrideProp);
    if (overrideVal && typeof overrideVal === 'string') {
        targetType = overrideVal;
        // console.log(`Client Override Target: ${targetType}`);
    }
    // --------------------------------------------------

    gameState.pendingSkill = { charIndex, skillIndex, skill, targetGroup: targetType, modifiedCost };

    if (targetType === 'Self') {
        onTargetSelect(gameState.currentTeamIndex, charIndex);
        return;
    }
    
    if (!hasValidTargets(targetType)) {
        logMessage(`No valid targets available for ${skill.name}.`);
        gameState.pendingSkill = null; 
        return; 
    }

    gameState.turnPhase = 'selectingTarget';
    logMessage(`Select a ${targetType} for ${skill.name}... (Right-click to cancel)`);
    document.addEventListener('contextmenu', cancelSelection);
    renderActiveSkills();
    renderRosters();
}

function onTargetSelect(targetTeamIndex, targetCharIndex) {
    gameState.pendingTarget = { teamIndex: targetTeamIndex, charIndex: targetCharIndex };
    resolveSkillPayment();
}

function resolveSkillPayment() {
    const { skill, modifiedCost } = gameState.pendingSkill;
    const { cost } = skill; 

    if (!cost.any || cost.any === 0) {
        payCost(gameState.teams[gameState.currentTeamIndex], modifiedCost);
        queueSkill(modifiedCost);
        return;
    }
    
    gameState.turnPhase = 'selectingRainbowCost';
    
    const team = gameState.teams[gameState.currentTeamIndex];
    const available = { ...team.chakra };
    
    available.green -= (modifiedCost.green || 0);
    available.blue -= (modifiedCost.blue || 0);
    available.red -= (modifiedCost.red || 0);
    available.white -= (modifiedCost.white || 0);
    
    const anyCost = cost.any || 0; 
    
    showChakraPicker(
        `Select ${anyCost} Chakra for ${skill.name}`,
        anyCost,
        available,
        (selectedOrbs) => {
            const payment = { ...modifiedCost };
            payment.any = 0; 
            
            selectedOrbs.forEach(orb => {
                payment[orb] = (payment[orb] || 0) + 1;
            });
            
            payCost(team, payment);
            queueSkill(payment);
        }
    );
}

function queueSkill(payment) {
    const { charIndex, skillIndex } = gameState.pendingSkill;
    const { teamIndex, charIndex: targetChar } = gameState.pendingTarget;
    
    gameState.skillQueue.push({
        charIndex: charIndex,
        skillIndex: skillIndex,
        target: { teamIndex: teamIndex, charIndex: targetChar },
        payment: payment 
    });
    
    logMessage(`${gameState.teams[gameState.currentTeamIndex].characters[charIndex].name} queues a skill.`);
    
    renderSkillQueue();
    renderChakraBanks(); // --- NEW: Update visual chakra after queuing ---
    
    cancelSelection(); 
}


function undoSkill(charIndex) {
    const queueIndex = gameState.skillQueue.findIndex(q => q.charIndex === charIndex);
    if (queueIndex === -1) return;
    
    const queuedSkill = gameState.skillQueue[queueIndex];
    const activeTeam = gameState.teams[gameState.currentTeamIndex];
    
    refundCost(activeTeam, queuedSkill.payment);
    gameState.skillQueue.splice(queueIndex, 1);
    
    logMessage(`${activeTeam.characters[charIndex].name}'s skill un-queued.`);
    renderActiveSkills();
    renderSkillQueue();
    renderChakraBanks();
}

function cancelSelection() {
    gameState.turnPhase = 'planning';
    gameState.pendingSkill = null;
    gameState.pendingTarget = null;
    document.removeEventListener('contextmenu', cancelSelection);
    renderActiveSkills();
    renderRosters();
    renderChakraBanks(); // --- NEW: Ensure visuals are reset if cancelled ---
}

// --- COST & AFFORDABILITY ---

function payCost(team, payment) {
    team.chakra.green -= (payment.green || 0);
    team.chakra.blue -= (payment.blue || 0);
    team.chakra.red -= (payment.red || 0);
    team.chakra.white -= (payment.white || 0);
    team.chakra.any -= (payment.any || 0); 
}

function refundCost(team, payment) {
    team.chakra.green += (payment.green || 0);
    team.chakra.blue += (payment.blue || 0);
    team.chakra.red += (payment.red || 0);
    team.chakra.white += (payment.white || 0);
    team.chakra.any += (payment.any || 0); 
}

function canAfford(team, cost) {
    if (!team) return false; 
    
    const modifiedCost = { ...cost }; 
    
    if (team.chakra.green < (modifiedCost.green || 0) ||
        team.chakra.blue < (modifiedCost.blue || 0) ||
        team.chakra.red < (modifiedCost.red || 0) ||
        team.chakra.white < (modifiedCost.white || 0)) {
        return false;
    }
    
    const remainingChakra = (team.chakra.green - (modifiedCost.green || 0)) +
                            (team.chakra.blue - (modifiedCost.blue || 0)) +
                            (team.chakra.red - (modifiedCost.red || 0)) +
                            (team.chakra.white - (modifiedCost.white || 0));
                            
    return remainingChakra >= (modifiedCost.any || 0);
}

// --- CHAKRA MODAL LOGIC ---

function showChakraPicker(title, numToPick, available, onComplete) {
    ui.modalOverlay.classList.remove('hidden');
    document.body.classList.add('modal-active');
    
    ui.modalTitle.textContent = title;
    
    let selected = [];
    let currentAvailable = { ...available };
    
    function updatePrompt() {
        ui.modalPrompt.textContent = `Selected ${selected.length} of ${numToPick}`;
    }
    
    function renderModalOrbs() {
        ui.modalChakraBank.innerHTML = '';
        
        ['green', 'blue', 'red', 'white'].forEach(type => {
            const btn = document.createElement('button');
            btn.className = `modal-orb ${type}`;
            btn.textContent = `${type.charAt(0).toUpperCase()}: ${currentAvailable[type]}`;
            btn.disabled = currentAvailable[type] <= 0;
            
            btn.onclick = () => {
                selected.push(type);
                currentAvailable[type]--;
                updatePrompt();
                renderModalOrbs();
                
                if (selected.length === numToPick) {
                    if (gameState.turnPhase === 'selectingExchangeGain') {
                        hideChakraPicker();
                        onComplete(selected[0]);
                    } else {
                        hideChakraPicker();
                        onComplete(selected);
                    }
                }
            };
            ui.modalChakraBank.appendChild(btn);
        });
    }

    updatePrompt();
    renderModalOrbs();
}

function hideChakraPicker() {
    ui.modalOverlay.classList.add('hidden');
    if (ui.confirmModal.classList.contains('hidden') && ui.endGameModal.classList.contains('hidden')) {
        document.body.classList.remove('modal-active');
    }
    renderActiveSkills();
    renderChakraBanks();
}

// --- CHAKRA EXCHANGE LOGIC ---

function onExchangeClick() {
    if (!gameState.teams || !gameState.teams[0]) return;
    const team = gameState.teams[gameState.currentTeamIndex];
    if (!team) return;
    const total = team.chakra.green + team.chakra.blue + team.chakra.red + team.chakra.white;
    
    if (total < 5) {
        logMessage("Not enough chakra to exchange (need 5).");
        return;
    }
    
    if (gameState.turnPhase !== 'planning') return;
    
    gameState.turnPhase = 'selectingExchangeGain';
    
    showChakraPicker(
        "Exchange: Select 1 Chakra to GAIN",
        1,
        { green: 1, blue: 1, red: 1, white: 1 }, 
        (orbToGain) => {
            gameState.pendingExchange.gain = orbToGain;
            gameState.turnPhase = 'selectingExchangeCost';
            showChakraPicker(
                `Exchange: Select 5 Chakra to SPEND (0/5)`,
                5,
                { ...team.chakra }, 
                (orbsToSpend) => {
                    finishExchange(orbsToSpend);
                }
            );
        }
    );
}

function finishExchange(orbsToSpend) {
    const team = gameState.teams[gameState.currentTeamIndex];
    const orbToGain = gameState.pendingExchange.gain;
    
    const payment = { green: 0, blue: 0, red: 0, white: 0 };
    orbsToSpend.forEach(orb => payment[orb]++);
    payCost(team, payment);
    
    team.chakra[orbToGain]++;
    
    // --- NEW: Track the exchange ---
    currentTurnExchanges.push({
        gain: orbToGain,
        cost: payment
    });
    // -------------------------------
    
    logMessage(`Exchanged 5 chakra for 1 ${orbToGain} chakra.`);
    
    gameState.turnPhase = 'planning';
    gameState.pendingExchange = {};
    renderActiveSkills();
    renderChakraBanks();
}

// --- MODAL & BUTTON LOGIC ---
function showConfirmModal(prompt, onConfirm) {
    ui.confirmPrompt.textContent = prompt;
    confirmCallback = onConfirm; 
    ui.confirmModal.classList.remove('hidden');
    document.body.classList.add('modal-active');
}

function hideConfirmModal() {
    ui.confirmModal.classList.add('hidden');
    if (ui.modalOverlay.classList.contains('hidden') && ui.endGameModal.classList.contains('hidden')) {
        document.body.classList.remove('modal-active');
    }
    confirmCallback = null;
}

function onGiveUpClick() {
    if (!gameState.gameActive || gameState.turnPhase !== 'planning') return;

    showConfirmModal("Are you sure you want to give up? This will count as a loss.", () => {
        logMessage("You have forfeited the match.");
        socket.emit('forfeit', { roomId: myRoomId });
        hideConfirmModal();
    });
}

function onCancelChakraPicker() {
    logMessage("Action canceled.");
    hideChakraPicker();
    cancelSelection(); 
    gameState.pendingExchange = {};
    gameState.turnPhase = 'planning'; 
    renderActiveSkills();
    renderChakraBanks();
}

function onConfirmYes() {
    if (confirmCallback) {
        confirmCallback();
    }
}

function onBackToLobbyClick() {
    // Clean up local modals
    ui.endGameModal.classList.add('hidden');
    document.body.classList.remove('modal-active');
    
    // Signal Main Controller to switch views
    const event = new Event('backToLobby');
    document.dispatchEvent(event);
}

function onEndTurnClick() {
    if (!gameState.gameActive || !myRoomId) return;
    
    if (gameState.currentTeamIndex !== myPlayerIndex) {
        logMessage("It's not your turn!");
        return;
    }
    
    console.log("Submitting turn to server...");
    socket.emit('submitTurn', { 
        roomId: myRoomId, 
        skillQueue: gameState.skillQueue,
        exchangeQueue: currentTurnExchanges // --- NEW: Send exchange history ---
    });
        
    renderActiveSkills();
    renderSkillQueue();
    renderChakraBanks();
}
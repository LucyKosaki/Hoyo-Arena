// --- Master Lists (loaded in server.js) ---
let masterCharacterList = {};
let masterEffectList = {};

// --- Unique ID for active effects ---
let nextEffectId = 0;

// --- NEW: The Event Bus ---
class EventBus {
    constructor() {
        this.listeners = {};
    }
    on(event, listener) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
    }
    off(event, listener) {
        if (!this.listeners[event]) {
            return;
        }
        this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    }
    emit(event, payload) {
        if (!this.listeners[event]) {
            return;
        }
        // Clone listeners to avoid mutation issues during emit
        [...this.listeners[event]].forEach(listener => listener(payload));
    }
}

// --- The Main Game Engine ---
class Game {
    constructor(allCharacters, allEffects) {
        masterCharacterList = allCharacters;
        masterEffectList = allEffects;

        this.eventBus = new EventBus();
        
        this.gameState = {
            gameTurn: 0, 
            currentTeamIndex: 0,
            gameActive: false, 
            hasStarted: false,
            turnPhase: 'planning', 
            pendingSkill: null,
            pendingTarget: null,
            pendingExchange: {},
            skillQueue: [], 
            teams: [null, null], 
            winner: null,
            winnerId: null, 
            loserId: null,
            finalTeam1: [], 
            finalTeam2: []
        };
        this.players = [null, null]; 
        this.isRanked = false;
        
        this.registerCoreListeners();
    }

    // --- SANITIZER FUNCTION ---
    getSanitizedState() {
        const cleanState = { ...this.gameState };

        if (cleanState.teams) {
            cleanState.teams = cleanState.teams.map(team => {
                if (!team) return null;
                return {
                    ...team,
                    characters: team.characters.map(char => {
                        return {
                            ...char,
                            // Convert Maps to Objects for JSON serialization
                            properties: char.properties instanceof Map ? Object.fromEntries(char.properties) : char.properties,
                            resources: char.resources instanceof Map ? Object.fromEntries(char.resources) : char.resources,
                            
                            activeEffects: char.activeEffects.map(eff => ({
                                ...eff,
                                caster: { 
                                    id: eff.caster.id, 
                                    name: eff.caster.name, 
                                    teamIndex: eff.caster.teamIndex, 
                                    charIndex: eff.caster.charIndex 
                                },
                                target: { 
                                    id: eff.target.id, 
                                    name: eff.target.name, 
                                    teamIndex: eff.target.teamIndex, 
                                    charIndex: eff.target.charIndex 
                                },
                                listeners: [] 
                            }))
                        };
                    })
                };
            });
        }
        return cleanState;
    }
    
    // --- CORE LISTENER (The Game's "Rules") ---
    registerCoreListeners() {
        this.eventBus.on('OnHeal', (payload) => {
            const { caster, target, amount, log } = payload;
            if (target.hp <= 0) return;

            if (this.characterHasProperty(target, 'Inverted') && caster.teamIndex === target.teamIndex) {
                log.push(`...but ${target.name} is Inverted! Healing becomes damage!`);
                this.eventBus.emit('OnDamage', { 
                    ...payload, 
                    amount: amount,
                    damageType: 'Affliction' 
                });
                return;
            }

            if (this.characterHasProperty(target, 'IgnoreHealing')) {
                log.push(`...but ${target.name} ignores all healing!`);
                return;
            }
            if (this.characterHasProperty(target, 'InvertHealing')) {
                log.push(`...but ${target.name} is afflicted and takes ${amount} damage instead!`);
                this.eventBus.emit('OnDamage', { ...payload, damageType: 'Affliction' });
                return;
            }
            
            target.hp += amount;
            if (target.hp > target.maxHp) target.hp = target.maxHp;
            log.push(`...healing ${target.name} for ${amount} HP! (${target.hp} HP)`);
            
            this.eventBus.emit('OnHealReceived', payload); 
        });

        this.eventBus.on('OnDamage', (payload) => {
            const { caster, target, amount, damageType, log, skill, ignoreInvuln } = payload;
            if (target.hp <= 0) return;

            if (this.characterHasProperty(target, 'Inverted') && caster.teamIndex !== target.teamIndex) {
                log.push(`...but ${target.name} is Inverted! Damage becomes healing!`);
                this.eventBus.emit('OnHeal', { 
                    ...payload, 
                    amount: amount 
                });
                return;
            }

            // --- UPDATED: Check properties for Ignore Invuln override ---
            let overrideIgnoreInvuln = false;
            if (skill && skill.name) {
                const skillNameSafe = skill.name.replace(/\s+/g, '_');
                if (this.characterHasProperty(caster, `Override_${skillNameSafe}_IgnoreInvuln`)) {
                    overrideIgnoreInvuln = true;
                }
            }
            
            const skillIgnoresInvuln = skill && skill.ignoreInvuln;

            // --- UPDATED: Class-Specific Invulnerability Check ---
            const specificInvuln = skill && skill.skillClass && this.characterHasProperty(target, `Invulnerable_${skill.skillClass}`);

            if ((this.characterHasProperty(target, 'Invulnerable') || specificInvuln) && !ignoreInvuln && !skillIgnoresInvuln && !overrideIgnoreInvuln) {
                log.push(`...but ${target.name} is Invulnerable! The damage is nullified.`);
                return;
            }
            
            let finalAmount = amount;
            
            // --- DAMAGE DEALING MODIFIERS (CASTER) ---
            const bonusDamage = this.getCharacterProperty(caster, 'BonusDamage', 'number');
            if (bonusDamage > 0) {
                finalAmount += bonusDamage;
                log.push(`...${caster.name}'s attack is boosted, adding ${bonusDamage} damage!`);
            }
            
            // 2. Calculated Increases (IncDamageDealt_*)
            let damageIncrease = 0;
            damageIncrease += this.getCharacterProperty(caster, 'IncDamageDealt_All', 'number');
            damageIncrease += this.getCharacterProperty(caster, `IncDamageDealt_${damageType}`, 'number');
            if (damageType !== 'Affliction') {
                damageIncrease += this.getCharacterProperty(caster, 'IncDamageDealt_NonAffliction', 'number');
            }
            
            if (damageIncrease > 0) {
                finalAmount += damageIncrease;
                log.push(`...${caster.name}'s damage is increased by ${damageIncrease}!`);
            }
            
            // 3. Calculated Decreases (DecDamageDealt_*)
            let damageDecrease = 0;
            damageDecrease += this.getCharacterProperty(caster, 'DecreaseDamageDealt', 'number'); 
            
            damageDecrease += this.getCharacterProperty(caster, 'DecDamageDealt_All', 'number');
            damageDecrease += this.getCharacterProperty(caster, `DecDamageDealt_${damageType}`, 'number');
            if (damageType !== 'Affliction') {
                damageDecrease += this.getCharacterProperty(caster, 'DecDamageDealt_NonAffliction', 'number');
            }

            if (damageDecrease > 0) {
                finalAmount -= damageDecrease;
                log.push(`...${caster.name}'s damage is weakened by ${damageDecrease}!`);
            }

            // --- DAMAGE TAKING MODIFIERS (TARGET) ---
            const increaseDamageTaken = this.getCharacterProperty(target, 'IncreaseDamageTaken', 'number');
            if (increaseDamageTaken > 0) {
                finalAmount += increaseDamageTaken;
                log.push(`...${target.name} is vulnerable, taking ${increaseDamageTaken} extra damage!`);
            }

            if (damageType !== 'Affliction') {
                const dd = this.getCharacterProperty(target, 'DestructibleDefense', 'number');
                if (dd > 0) {
                    if (finalAmount >= dd) {
                        finalAmount -= dd;
                        log.push(`...${target.name}'s shield breaks, absorbing ${dd} damage!`);
                        this.removeCharacterProperty(target, 'DestructibleDefense');
                        this.eventBus.emit('OnDestructibleDefenseBroken', { target, log });
                    } else {
                        this.setCharacterProperty(target, 'DestructibleDefense', dd - finalAmount, 999, log, false); 
                        log.push(`...${target.name}'s shield absorbs ${finalAmount} damage! (${dd - finalAmount} left)`);
                        finalAmount = 0;
                    }
                }

                const isPiercing = this.characterHasProperty(caster, 'IsPiercing');
                
                if (finalAmount > 0 && damageType !== 'Piercing' && !isPiercing) {
                    const reduction = this.getCharacterProperty(target, 'DamageReduction', 'number');
                    if (reduction > 0) {
                        finalAmount -= reduction;
                        log.push(`...${target.name}'s Damage Reduction absorbs ${reduction} damage!`);
                        if (finalAmount < 0) finalAmount = 0;
                    }
                } else if (isPiercing && finalAmount > 0) {
                    log.push(`...${caster.name}'s attack is Piercing, ignoring damage reduction!`);
                }
            }

            if (finalAmount <= 0) {
                log.push(`...${target.name} takes no damage!`);
                this.eventBus.emit('OnDamageDealt', { ...payload, finalAmount: 0 });
                return;
            }

            target.hp -= finalAmount;
            if (target.hp < 0) target.hp = 0;
            log.push(`...${target.name} takes ${finalAmount} ${damageType} damage! (${target.hp} HP left)`);

            this.eventBus.emit('OnDamageDealt', { ...payload, finalAmount });
            this.eventBus.emit('OnDamageTaken', { ...payload, finalAmount });
            
            if (target.hp === 0) {
                 this.eventBus.emit('OnDeath', { caster, target, log });
                 if (target.teamIndex === caster.teamIndex) {
                     this.eventBus.emit('OnDeath_Ally', { caster, target, log });
                 } else {
                     this.eventBus.emit('OnCharacterKill', { caster, target, log });
                 }
            }
        });
        
        this.eventBus.on('OnResourceChange', (payload) => {
            const { target, resource, amount, log } = payload;
            
            if (resource === 'Energy_Random') {
                const colors = ['green', 'blue', 'red', 'white'];
                const team = this.gameState.teams[target.teamIndex];
                if (amount > 0) {
                    for (let i=0; i < amount; i++) {
                        const color = colors[Math.floor(Math.random() * 4)];
                        team.chakra[color]++;
                        log.push(`...${target.name} gains 1 ${color} chakra!`);
                        this.eventBus.emit('OnResourceGain', { target, resource, amount, log });
                    }
                } else {
                    const toRemove = Math.abs(amount);
                    for(let i=0; i<toRemove; i++) {
                        const available = colors.filter(c => team.chakra[c] > 0);
                        if (available.length > 0) {
                            const color = available[Math.floor(Math.random() * available.length)];
                            team.chakra[color]--;
                            log.push(`...${target.name} loses 1 ${color} chakra!`);
                            this.eventBus.emit('OnResourceLoss', { target, resource, amount, log });
                        }
                    }
                }
            }
            else {
                const current = target.resources.get(resource) || 0;
                let newValue = current + amount;
                if (newValue < 0) newValue = 0;
                
                target.resources.set(resource, newValue);
                log.push(`...${target.name} ${amount > 0 ? 'gains' : 'loses'} ${Math.abs(amount)} ${resource}! (Now ${newValue})`);
            }
        });
    }

    // --- GAME STATE & INIT ---
    getNewSkill(skill) {
        return JSON.parse(JSON.stringify(skill));
    }
    
    startGameWithTeams(team1, team2) {
        this.gameState.teams = [
            this.createTeamData(team1, this.players[0].username, 0),
            this.createTeamData(team2, this.players[1].username, 1)
        ];
        
        this.gameState.teams[0].name = this.players[0].username;
        this.gameState.teams[1].name = this.players[1].username;
        
        this.gameState.finalTeam1 = team1;
        this.gameState.finalTeam2 = team2;

        this.gameState.currentTeamIndex = Math.random() < 0.5 ? 0 : 1;
        this.gameState.gameTurn = 1; 
        const starterName = this.gameState.teams[this.gameState.currentTeamIndex].name;
        
        const startLog = [`A coin flip determines ${starterName} will go first! (Turn ${this.gameState.gameTurn})`];
        const gainLog = [this.giveStartingChakra()];

        this.gameState.gameActive = true;
        this.gameState.hasStarted = true;
        
        const passiveLog = ["--- Applying Passive Effects ---"];
        const allChars = [...this.gameState.teams[0].characters, ...this.gameState.teams[1].characters];
        allChars.forEach(char => {
            const charModel = masterCharacterList[char.id];
            if (charModel.passiveEffects && charModel.passiveEffects.length > 0) {
                charModel.passiveEffects.forEach(effectName => {
                    passiveLog.push(`...${char.name}'s passive '${effectName}' activates!`);
                    // --- UPDATED: Pass 'Passive' as sourceSkillName ---
                    this.createActiveEffect(effectName, char, char, 999, passiveLog, 1, true, 'Unique', 'Passive', 'Passive');
                });
            }
            this.eventBus.emit('OnGameStart', { target: char, log: passiveLog });
        });
        
        return { 
            gainLog, 
            startLog,
            passiveLog, 
            startingPlayerIndex: this.gameState.currentTeamIndex 
        };
    }
    
    createTeamData(charIdArray, teamName, teamIndex) {
        return {
            name: teamName, 
            chakra: { green: 0, blue: 0, red: 0, white: 0 },
            characters: charIdArray.map((id, charIndex) => {
                const char = masterCharacterList[id];
                return {
                    id: char.id,
                    name: char.name,
                    hp: 100, 
                    maxHp: 100,
                    activeEffects: [], 
                    skills: char.skills.map(this.getNewSkill),
                    teamIndex: teamIndex,
                    charIndex: charIndex,
                    properties: new Map(), 
                    resources: new Map(), 
                    skillHistory: [], 
                    lastSkillUsed: null, 
                }
            })
        };
    }
    
    // --- CHAKRA & COST LOGIC ---
    giveStartingChakra() {
        const chakraTypes = ['green', 'blue', 'red', 'white'];
        const randomType = chakraTypes[Math.floor(Math.random() * chakraTypes.length)];
        const startingTeam = this.gameState.teams[this.gameState.currentTeamIndex];
        startingTeam.chakra[randomType]++;
        const typeName = randomType.charAt(0).toUpperCase() + randomType.slice(1);
        return `${startingTeam.name} gains 1 starting chakra: 1 ${typeName}.`;
    }
    gainTurnChakra(team) {
        const numChakra = team.characters.filter(c => c.hp > 0).length;
        const chakraTypes = ['green', 'blue', 'red', 'white'];
        const gained = { green: 0, blue: 0, red: 0, white: 0 };
        for (let i = 0; i < numChakra; i++) {
            const randomType = chakraTypes[Math.floor(Math.random() * chakraTypes.length)];
            team.chakra[randomType]++;
            gained[randomType]++;
        }
        let gains = [];
        if (gained.green > 0) gains.push(`${gained.green} Green`);
        if (gained.blue > 0) gains.push(`${gained.blue} Blue`);
        if (gained.red > 0) gains.push(`${gained.red} Red`);
        if (gained.white > 0) gains.push(`${gained.white} White`);
        return `${team.name} gains ${numChakra} chakra: ${gains.join(', ')}.`;
    }
    payCost(team, payment) {
        team.chakra.green -= (payment.green || 0);
        team.chakra.blue -= (payment.blue || 0);
        team.chakra.red -= (payment.red || 0);
        team.chakra.white -= (payment.white || 0);
    }
    
    getModifiedSkillCost(skill, character) {
        let cost = { ...skill.cost };
        
        if (this.getCharacterProperty(character, 'CostSet_Random', 'number') > 0) {
            return { green: 0, blue: 0, red: 0, white: 0, any: 1 };
        }

        cost.green = (cost.green || 0) + this.getCharacterProperty(character, 'CostMod_Green', 'number');
        cost.blue = (cost.blue || 0) + this.getCharacterProperty(character, 'CostMod_Blue', 'number');
        cost.red = (cost.red || 0) + this.getCharacterProperty(character, 'CostMod_Red', 'number');
        cost.white = (cost.white || 0) + this.getCharacterProperty(character, 'CostMod_White', 'number');
        cost.any = (cost.any || 0) + this.getCharacterProperty(character, 'CostMod_Any', 'number');

        if (skill.name) {
            const skillNameSafe = skill.name.replace(/\s+/g, '_'); 
            
            if (this.getCharacterProperty(character, `CostSet_${skillNameSafe}_Random`, 'number') > 0) {
                return { green: 0, blue: 0, red: 0, white: 0, any: 1 };
            }
            
            cost.green += this.getCharacterProperty(character, `CostMod_${skillNameSafe}_Green`, 'number');
            cost.blue += this.getCharacterProperty(character, `CostMod_${skillNameSafe}_Blue`, 'number');
            cost.red += this.getCharacterProperty(character, `CostMod_${skillNameSafe}_Red`, 'number');
            cost.white += this.getCharacterProperty(character, `CostMod_${skillNameSafe}_White`, 'number');
            cost.any += this.getCharacterProperty(character, `CostMod_${skillNameSafe}_Any`, 'number');
        }

        if (cost.green < 0) cost.green = 0;
        if (cost.blue < 0) cost.blue = 0;
        if (cost.red < 0) cost.red = 0;
        if (cost.white < 0) cost.white = 0;
        if (cost.any < 0) cost.any = 0;
        
        return cost;
    }
    
    // --- BATTLE LOGIC & PROPERTY HELPERS ---
    getCharacterProperty(character, propertyName, type = 'boolean') {
        const prop = character.properties.get(propertyName);
        if (prop === undefined) {
            return type === 'number' ? 0 : false;
        }
        if (type === 'number') {
            return Number(prop.value) || 0;
        }
        return prop.value === true; 
    }
    
    characterHasProperty(character, propertyName) {
        return this.getCharacterProperty(character, propertyName, 'boolean');
    }

    setCharacterProperty(character, propertyName, value, durationTurns = 0, log, doLog = true) {
        const duration = (durationTurns === 0 || durationTurns > 900) ? 999 : durationTurns * 2; 
        
        if (propertyName === 'DestructibleDefense') {
            const current = this.getCharacterProperty(character, 'DestructibleDefense', 'number');
            value += current;
            if(doLog) log.push(`...${character.name} gains ${value - current} ${propertyName}! (Now ${value})`);
        } else if (propertyName.startsWith('Stun_')) {
             const stunType = propertyName.split('_')[1]; 
             if(doLog) log.push(`...${character.name} is stunned (${stunType})!`);
             this.eventBus.emit('OnStunApplied', { target: character, log });
             
             for (let i = character.activeEffects.length - 1; i >= 0; i--) {
                 const eff = character.activeEffects[i];
                 if (eff.executionType === 'Control') {
                     let shouldCancel = false;
                     if (stunType === 'Full') shouldCancel = true;
                     else if (stunType === eff.skillClass) shouldCancel = true;
                     else if (stunType === 'Strategic' && eff.skillClass === 'Strategic') shouldCancel = true;
                     else if (stunType === 'NonStrategic' && eff.skillClass !== 'Strategic') shouldCancel = true;

                     if (shouldCancel) {
                         if(log) log.push(`...${character.name}'s control skill '${eff.model.name}' is cancelled by the stun!`);
                         this.removeActiveEffect(eff, character, log);
                     }
                 }
             }
        } else {
            if(doLog) log.push(`...${character.name} gains property '${propertyName}'!`);
        }
        
        if (propertyName.startsWith('IncDamageDealt_') || propertyName.startsWith('DecDamageDealt_')) {
             const current = this.getCharacterProperty(character, propertyName, 'number');
             value += current; 
        }

        character.properties.set(propertyName, { value, duration });
    }
    
    removeCharacterProperty(character, propertyName) {
        character.properties.delete(propertyName);
    }

    isStunned(character, skillClass) {
        if (this.characterHasProperty(character, 'IgnoreStuns')) return false; 
        if (this.characterHasProperty(character, 'Stun_Full')) return true;
        if (skillClass === 'Physical' && this.characterHasProperty(character, 'Stun_Physical')) return true;
        if (skillClass === 'Energy' && this.characterHasProperty(character, 'Stun_Energy')) return true;
        if (skillClass === 'Strategic' && this.characterHasProperty(character, 'Stun_Strategic')) return true;
        if (skillClass !== 'Strategic' && this.characterHasProperty(character, 'Stun_NonStrategic')) return true;
        return false;
    }

    findTarget(targetString, caster, selectedTarget) {
        const enemyTeam = this.gameState.teams[1 - caster.teamIndex].characters.filter(c => c.hp > 0);
        const allyTeam = this.gameState.teams[caster.teamIndex].characters.filter(c => c.hp > 0);

        switch (targetString) {
            case 'Self':
            case 'Caster': 
                return [caster];
            case 'SelectedTarget':
            case 'Event.Target': 
            case 'Event.Caster': 
            case 'AllyOrEnemy': // Treated as selected single target
                return [selectedTarget];
            case 'AllEnemies':
                return enemyTeam;
            case 'AllAllies':
                return allyTeam;
            case 'RandomEnemy':
                return enemyTeam.length ? [enemyTeam[Math.floor(Math.random() * enemyTeam.length)]] : [];
            case 'RandomAlly':
                 return allyTeam.length ? [allyTeam[Math.floor(Math.random() * allyTeam.length)]] : [];
            case 'AllAllies_ExceptSelf':
                 return allyTeam.filter(c => c.id !== caster.id);
            
            // --- NEW TARGET TYPES ---
            case 'AllAlliesAndEnemies':
                return [...allyTeam, ...enemyTeam];
            case 'AllyTeamOrEnemyTeam':
                // Returns the whole team of the selected target
                if (!selectedTarget) return [];
                if (selectedTarget.teamIndex === caster.teamIndex) {
                    return allyTeam;
                } else {
                    return enemyTeam;
                }
            
            default:
                return [];
        }
    }
    
    // --- ACTION PROCESSOR ---
    applyActions(actions, caster, selectedTarget, skill, log, eventPayload = null) {
        if (eventPayload && eventPayload.isCancelled) {
             log.push(`...but the skill was countered!`);
             return; 
        }
        if (eventPayload && eventPayload.reflectedTo) {
             log.push(`...the skill is reflected to ${eventPayload.reflectedTo.name}!`);
             selectedTarget = eventPayload.reflectedTo;
        }
        
        // --- NEW: Check for Skill Overrides (Target) ---
        let overrideTarget = null;
        if (skill && skill.name) {
            const skillNameSafe = skill.name.replace(/\s+/g, '_');
            const propName = `Override_${skillNameSafe}_ActionTarget`;
            if (caster.properties instanceof Map && caster.properties.has(propName)) {
                overrideTarget = caster.properties.get(propName).value;
            }
        }

        for (const action of actions) {
            const conditionsMet = this.checkConditions(
                action.conditions, eventPayload, null, caster, selectedTarget 
            );

            if (!conditionsMet) continue; 

            let targets = [];
            
            // --- NEW: Apply Target Override ---
            let finalTargetString = action.target;
            if (overrideTarget && action.target === 'SelectedTarget') {
                finalTargetString = overrideTarget;
            }
            // --------------------------

            if (eventPayload && finalTargetString.startsWith('Event.')) {
                 if(finalTargetString === 'Event.Target') targets = [eventPayload.target];
                 else if(finalTargetString === 'Event.Caster') targets = [eventPayload.caster];
                 else if(finalTargetString === 'Event.Effect') targets = [eventPayload.effect]; 
            } else {
                targets = this.findTarget(finalTargetString, caster, selectedTarget);
            }
            
            if (targets.length === 0) continue;

            for (const target of targets) {
                if (target.hp <= 0 && action.type !== 'SetHealth' && action.type !== 'Revive') continue; 

                switch (action.type) {
                    case 'Damage':
                        this.eventBus.emit('OnDamage', {
                            caster, target, skill, amount: action.amount,
                            damageType: action.damageType, log,
                            ignoreInvuln: action.ignoreInvuln || false
                        });
                        break;
                    
                    case 'DamageBasedOnStat': {
                        // --- UPDATED: Support MissingHealth & DeadAllies ---
                        const [targetType, resourceType, resourceName] = action.statToScale.split('.');
                        let statOwner = (targetType === 'Caster') ? caster : target;
                        let statValue = 0;

                        if (resourceType === 'Resource') {
                             statValue = statOwner.resources.get(resourceName) || 0;
                        } else if (resourceType === 'MissingHealth') {
                             statValue = statOwner.maxHp - statOwner.hp;
                        } else if (resourceType === 'DeadAllies') {
                             // Count dead allies for the owner's team
                             const team = this.gameState.teams[statOwner.teamIndex];
                             statValue = team.characters.filter(c => c.hp <= 0).length;
                        }

                        const totalDamage = (action.baseAmount || 0) + (statValue * (action.scaleFactor || 0));
                        
                        this.eventBus.emit('OnDamage', {
                            caster, target, skill, amount: totalDamage,
                            damageType: action.damageType, log,
                            ignoreInvuln: action.ignoreInvuln || false
                        });
                        break;
                    }
                        
                    case 'Heal':
                        this.eventBus.emit('OnHeal', {
                            caster, target, skill, amount: action.amount, log
                        });
                        break;
                    
                    case 'StealHealth':
                        this.eventBus.emit('OnDamage', {
                            caster, target, skill, amount: action.amount,
                            damageType: 'Affliction', log, 
                            ignoreInvuln: true 
                        });
                        this.eventBus.emit('OnHeal', {
                            caster, target: caster, skill, amount: action.amount, log
                        });
                        break;
                    
                    case 'SetHealth':
                        target.hp = action.amount;
                        if (target.hp > target.maxHp) target.hp = target.maxHp;
                        if (target.hp < 0) target.hp = 0;
                        log.push(`...${target.name}'s health is set to ${target.hp}!`);
                        break;
                        
                    // --- NEW: SwapHealth Action ---
                    case 'SwapHealth':
                        const tempHp = caster.hp;
                        caster.hp = target.hp;
                        target.hp = tempHp;
                        if (caster.hp > caster.maxHp) caster.hp = caster.maxHp;
                        if (target.hp > target.maxHp) target.hp = target.maxHp;
                        log.push(`...${caster.name} and ${target.name} swapped Health!`);
                        break;

                    case 'ModifyMaxHealth':
                        target.maxHp += action.amount;
                        if (target.maxHp < 1) target.maxHp = 1;
                        if (action.amount > 0) { 
                             target.hp += action.amount;
                        }
                        if (target.hp > target.maxHp) target.hp = target.maxHp;
                        log.push(`...${target.name}'s Max HP changes by ${action.amount}! (Now ${target.maxHp})`);
                        break;

                    case 'Execute':
                        if (target.hp <= action.amount) {
                            target.hp = 0;
                            log.push(`...${target.name} is Executed!`);
                            this.eventBus.emit('OnDeath', { caster, target, log });
                        } else {
                            log.push(`...${target.name} survives the execution attempt.`);
                        }
                        break;
                    
                    case 'ExecuteBasedOnStat': {
                        const [targetType, resourceType, resourceName] = action.statToScale.split('.');
                        let statOwner = (targetType === 'Caster') ? caster : target;
                        let statValue = statOwner.resources.get(resourceName) || 0;
                        const threshold = (action.baseAmount || 0) + (statValue * (action.scaleFactor || 0));

                        if (target.hp <= threshold) {
                            target.hp = 0;
                            log.push(`...${target.name} is Executed! (Threshold: ${threshold})`);
                            this.eventBus.emit('OnDeath', { caster, target, log });
                        } else {
                            log.push(`...${target.name} survives the execution attempt.`);
                        }
                        break;
                    }

                    case 'RemoveEffect':
                        // --- UPDATED: Allow removing multiple stacks ---
                        const amountToRemove = action.amount || 1;
                        let removedCount = 0;

                        if (action.removeBySourceClass) {
                            // Bulk removal ignores amount (removes all matching)
                            for (let i = target.activeEffects.length - 1; i >= 0; i--) {
                                const eff = target.activeEffects[i];
                                const isEnemy = (eff.caster.teamIndex !== target.teamIndex);
                                
                                const isHarmful = isEnemy;
                                const isHelpful = !isEnemy;

                                if (action.removeBySourceClass === 'Harmful' && isHarmful) {
                                    this.removeActiveEffect(eff, target, log);
                                }
                                else if (action.removeBySourceClass === 'Helpful' && isHelpful) {
                                    this.removeActiveEffect(eff, target, log);
                                }
                            }
                        } 
                        else if (action.effectName) {
                            // Loop to remove X instances
                            for (let i = target.activeEffects.length - 1; i >= 0; i--) {
                                if (removedCount >= amountToRemove) break; // Stop if we removed enough

                                if (target.activeEffects[i].model.name === action.effectName) {
                                    this.removeActiveEffect(target.activeEffects[i], target, log);
                                    removedCount++;
                                }
                            }
                            if (removedCount > 0) {
                                log.push(`...Removed ${removedCount} stack(s) of ${action.effectName}.`);
                            }
                        } else {
                            log.push(`...RemoveEffect called without a name.`);
                        }
                        break;
                        
                    case 'ApplyEffect':
                        const skillClass = skill ? skill.skillClass : 'Unique';
                        const executionType = skill ? skill.executionType : 'Instant';

                        this.createActiveEffect(
                            action.effectName, caster, target, 
                            action.duration, log, 1, false, 
                            skillClass, executionType,
                            skill ? skill.name : 'Passive' 
                        );
                        break;

                    case 'ModifyResource':
                         this.eventBus.emit('OnResourceChange', {
                            caster, target, skill, 
                            resource: action.resource, 
                            amount: action.amount, log
                        });
                        break;
                    
                    case 'ConsumeResource':
                        this.eventBus.emit('OnResourceChange', {
                            caster, target, skill,
                            resource: action.resource,
                            amount: -Math.abs(action.amount),
                            log
                        });
                        break;
                    case 'SetResource':
                        target.resources.set(action.resource, action.amount);
                        log.push(`...${target.name}'s ${action.resource} set to ${action.amount}!`);
                        break;
                        
                    case 'Stun': {
                        const propName = `Stun_${action.stunType}`;
                        this.setCharacterProperty(target, propName, true, 1, log); 
                        break;
                    }

                    case 'IncreaseCooldown':
                        if (action.targetSkill) {
                            target.skills.forEach(s => {
                                if (s.name === action.targetSkill) {
                                    s.currentCD += (action.amount * 2);
                                    log.push(`...${target.name}'s '${s.name}' cooldown increased by ${action.amount}!`);
                                }
                            });
                        } else {
                            target.skills.forEach(s => {
                                if (s.currentCD > 0) s.currentCD += (action.amount * 2);
                            });
                            log.push(`...${target.name}'s active cooldowns increased by ${action.amount}!`);
                        }
                        break;
                    case 'ModifySkillCooldown':
                        if (action.targetSkill) {
                            target.skills.forEach(s => {
                                if (s.name === action.targetSkill) {
                                    s.currentCD += (action.amount * 2);
                                    if (s.currentCD < 0) s.currentCD = 0;
                                    log.push(`...${target.name}'s '${s.name}' cooldown modified by ${action.amount}!`);
                                }
                            });
                        } else {
                            target.skills.forEach(s => {
                                if (s.currentCD > 0 || action.amount < 0) {
                                     s.currentCD += (action.amount * 2);
                                     if (s.currentCD < 0) s.currentCD = 0;
                                }
                            });
                            log.push(`...${target.name}'s active cooldowns modified by ${action.amount}!`);
                        }
                        break;

                    case 'ResetCooldowns':
                        target.skills.forEach(s => { s.currentCD = 0; });
                        log.push(`...${target.name}'s cooldowns are reset!`);
                        break;
                    
                    case 'ModifySkillCost':
                        const costChange = action.costChange;
                        let prefix = 'CostMod';
                        
                        if (action.targetSkill) {
                            const skillNameSafe = action.targetSkill.replace(/\s+/g, '_');
                            prefix = `CostMod_${skillNameSafe}`;
                            log.push(`...${target.name}'s '${action.targetSkill}' cost is modified!`);
                        } else {
                            log.push(`...${target.name}'s global skill costs are modified!`);
                        }

                        if (costChange.setRandom) {
                             this.setCharacterProperty(target, action.targetSkill ? `CostSet_${action.targetSkill.replace(/\s+/g, '_')}_Random` : 'CostSet_Random', 1, action.duration, log);
                        } else {
                             if(costChange.any) this.setCharacterProperty(target, `${prefix}_Any`, costChange.any, action.duration, log);
                             if(costChange.green) this.setCharacterProperty(target, `${prefix}_Green`, costChange.green, action.duration, log);
                             if(costChange.blue) this.setCharacterProperty(target, `${prefix}_Blue`, costChange.blue, action.duration, log);
                             if(costChange.red) this.setCharacterProperty(target, `${prefix}_Red`, costChange.red, action.duration, log);
                             if(costChange.white) this.setCharacterProperty(target, `${prefix}_White`, costChange.white, action.duration, log);
                        }
                        break;
                    
                    case 'ExtendDuration': {
                        const efName = action.effectName;
                        const existing = target.activeEffects.find(e => e.model.name === efName);
                        if (existing && !existing.isPermanent) {
                             existing.duration += (action.duration * 2);
                             log.push(`...${efName} on ${target.name} extended by ${action.duration} turns!`);
                        }
                        break;
                    }
                    
                    case 'InvertHealing': {
                        this.setCharacterProperty(target, 'InvertHealing', true, action.duration, log);
                        break;
                    }
                    
                    case 'InvertHelpfulHarmful': {
                        this.setCharacterProperty(target, 'InvertHelpfulHarmful', true, action.duration, log);
                        break;
                    }
                    
                    case 'UseSkill': {
                         if (action.skillName) {
                             const skillToUse = target.skills.find(s => s.name === action.skillName);
                             if (skillToUse) {
                                 log.push(`...${target.name} is forced to use ${skillToUse.name}!`);
                                 this.applyActions(skillToUse.instantActions, target, selectedTarget, skillToUse, log, eventPayload);
                             }
                         }
                         break;
                    }
                    
                    case 'IncreaseDamageDealt': {
                        const category = action.damageCategory || 'All';
                        const propName = `IncDamageDealt_${category}`;
                        this.setCharacterProperty(target, propName, action.amount, action.duration, log);
                        break;
                    }
                    case 'DecreaseDamageDealt': {
                        const category = action.damageCategory || 'All';
                        const propName = `DecDamageDealt_${category}`;
                        this.setCharacterProperty(target, propName, action.amount, action.duration, log);
                        break;
                    }

                    case 'SetProperty':
                        this.setCharacterProperty(target, action.property, action.propertyValue, action.duration, log);
                        break;
                    
                    case 'SwapSkill': {
                        const skillIndex = target.skills.findIndex(s => s.name === action.skillToSwap);
                        if (skillIndex === -1) {
                            log.push(`...Action 'SwapSkill' failed: Caster ${target.name} has no skill named '${action.skillToSwap}'.`);
                            break;
                        }

                        const newSkillData = masterCharacterList[target.id]?.skills.find(s => s.name === action.newSkill);
                        if (!newSkillData) {
                            log.push(`...Action 'SwapSkill' failed: Master list has no skill named '${action.newSkill}' for ${target.name}.`);
                            break;
                        }

                        const originalSkillName = target.skills[skillIndex].originalSkill || target.skills[skillIndex].name;
                        
                        target.skills[skillIndex] = this.getNewSkill(newSkillData); 
                        target.skills[skillIndex].originalSkill = originalSkillName; 
                        
                        log.push(`...${target.name}'s '${originalSkillName}' becomes '${action.newSkill}'!`);
                        break;
                    }

                    case 'RevertForm': {
                        let reverted = false;
                        for (let i = 0; i < target.skills.length; i++) {
                            const originalSkillName = target.skills[i].originalSkill;
                            if (originalSkillName) {
                                const originalSkillData = masterCharacterList[target.id]?.skills.find(s => s.name === originalSkillName);
                                if (originalSkillData) {
                                    target.skills[i] = this.getNewSkill(originalSkillData);
                                    reverted = true;
                                }
                            }
                        }
                        if (reverted) log.push(`...${target.name} reverts to their original form!`);
                        break;
                    }
                    
                    case 'ConvertProperty': {
                        const sourceValue = this.getCharacterProperty(target, action.sourceProperty, 'number');
                        const convertedValue = Math.floor(sourceValue * (action.conversionFactor || 1.0));
                        
                        this.setCharacterProperty(target, action.targetProperty, convertedValue, action.duration, log);
                        
                        if (action.removeSource) {
                            this.removeCharacterProperty(target, action.sourceProperty);
                            log.push(`...${target.name}'s ${action.sourceProperty} is consumed.`);
                        }
                        break;
                    }

                    case 'ApplyDelayedEffect': {
                        const newEffectName = `Delayed_${action.effectName}`;
                        const tempEffectModel = {
                            name: newEffectName,
                            description: `Applies ${action.effectName} after a delay.`,
                            isPermanent: false,
                            isInvisible: true,
                            maxStacks: 1,
                            logicBlocks: [
                                {
                                    trigger: 'OnTurnEnd',
                                    conditions: [
                                        { field: 'Effect.StackCount', operator: '==', value: action.delayTurns || 1 }
                                    ],
                                    actions: [
                                        { type: 'ApplyEffect', target: 'Self', effectName: action.effectName, duration: action.duration },
                                        { type: 'RemoveEffect', target: 'Self', effectName: newEffectName }
                                    ]
                                },
                                {
                                    trigger: 'OnTurnEnd',
                                    conditions: [],
                                    actions: [
                                        { type: 'ModifyResource', target: 'Self', resource: `Stack_${newEffectName}`, amount: 1 }
                                    ]
                                }
                            ]
                        };
                        masterEffectList[newEffectName] = tempEffectModel;
                        this.createActiveEffect(newEffectName, caster, target, 99, log, 0, false, 'Unique', 'Instant'); 
                        delete masterEffectList[newEffectName]; 
                        break;
                    }
                    
                    case 'ModifySkillProperty': {
                         log.push(`...Skill property modified (Engine update).`);
                         break;
                    }

                    case 'CopySkill': {
                         if (!eventPayload || !eventPayload.skill) break;
                         const skillToCopy = eventPayload.skill;
                         if (skillToCopy.isUnique) {
                             log.push(`...but ${skillToCopy.name} cannot be copied!`);
                             break;
                         }
                         const slot = caster.skills.length - 1;
                         caster.skills[slot] = this.getNewSkill(skillToCopy);
                         log.push(`...${caster.name} copies ${skillToCopy.name}!`);
                         break;
                    }
                    
                    case 'CounterSkill': {
                         // --- UPDATED: Check global Uncounterable property ---
                         if (this.characterHasProperty(caster, 'Uncounterable')) {
                             log.push(`...but ${caster.name} is Uncounterable!`);
                             break;
                         }
                         
                         // --- UPDATED: Check if the specific skill is uncounterable from schema ---
                         if (eventPayload && eventPayload.skill && eventPayload.skill.uncounterable) {
                             log.push(`...but ${eventPayload.skill.name} cannot be countered!`);
                             break;
                         }
                         
                         if (eventPayload && eventPayload.skill) {
                              const s = eventPayload.skill;
                              const sName = s.name.replace(/\s+/g, '_');
                              const attacker = eventPayload.caster; 
                              if (this.characterHasProperty(attacker, `Override_${sName}_Uncounterable`)) {
                                   log.push(`...but ${attacker.name}'s ${s.name} cannot be countered!`);
                                   break;
                              }
                         }
                         
                         if (eventPayload) {
                             eventPayload.isCancelled = true;
                             log.push(`...${caster.name} COUNTERS the skill!`);
                         }
                         break;
                    }
                    
                    case 'ReflectSkill': {
                         // --- UPDATED: Check global Uncounterable property for Reflects too ---
                         if (this.characterHasProperty(caster, 'Uncounterable')) {
                             log.push(`...but ${caster.name} is Uncounterable (Unreflectable)!`);
                             break;
                         }
                         
                         // --- UPDATED: Check if the specific skill is uncounterable (and thus unreflectable) from schema ---
                         if (eventPayload && eventPayload.skill && eventPayload.skill.uncounterable) {
                             log.push(`...but ${eventPayload.skill.name} cannot be reflected!`);
                             break;
                         }

                         if (eventPayload && eventPayload.skill) {
                              const s = eventPayload.skill;
                              const sName = s.name.replace(/\s+/g, '_');
                              const attacker = eventPayload.caster; 
                              if (this.characterHasProperty(attacker, `Override_${sName}_Uncounterable`)) { 
                                   log.push(`...but ${attacker.name}'s ${s.name} cannot be reflected!`);
                                   break;
                              }
                         }

                         if (eventPayload) {
                             eventPayload.reflectedTo = eventPayload.caster;
                             log.push(`...${caster.name} REFLECTS the skill!`);
                         }
                         break;
                    }

                    // --- NEW: ModifySkillMechanics Action Logic ---
                    case 'ModifySkillMechanics': {
                        const mode = action.mode || 'Set';
                        const mechanics = action.mechanics || {};
                        
                        // If a specific skill is named, use it. Otherwise, apply to ALL of the target's skills.
                        let skillNames = [];
                        if (action.targetSkill) {
                            skillNames.push(action.targetSkill);
                        } else {
                            target.skills.forEach(s => skillNames.push(s.name));
                        }

                        skillNames.forEach(sName => {
                            const safeName = sName.replace(/\s+/g, '_');
                            
                            // 1. Handle Ignore Invulnerability
                            if (mechanics.ignoreInvuln) {
                                const propName = `Override_${safeName}_IgnoreInvuln`;
                                if (mode === 'Remove') {
                                    this.removeCharacterProperty(target, propName);
                                    if (log) log.push(`...${target.name}'s '${sName}' no longer ignores invulnerability.`);
                                } else {
                                    this.setCharacterProperty(target, propName, true, action.duration, log, false); // false = silent log
                                }
                            }

                            // 2. Handle Uncounterable (and Unreflectable)
                            if (mechanics.uncounterable) {
                                const propName = `Override_${safeName}_Uncounterable`;
                                if (mode === 'Remove') {
                                    this.removeCharacterProperty(target, propName);
                                    if (log) log.push(`...${target.name}'s '${sName}' is no longer uncounterable.`);
                                } else {
                                    this.setCharacterProperty(target, propName, true, action.duration, log, false);
                                }
                            }
                        });
                        
                        if (log && mode === 'Set') {
                            const mechList = [];
                            if (mechanics.ignoreInvuln) mechList.push("Ignore Invuln");
                            if (mechanics.uncounterable) mechList.push("Uncounterable");
                            const targetStr = action.targetSkill ? `'${action.targetSkill}'` : "all skills";
                            log.push(`...${target.name}'s ${targetStr} gain [${mechList.join(', ')}]!`);
                        }
                        break;
                    }
                    
                    // --- NEW: ModifySkillTargetType Logic ---
                    case 'ModifySkillTargetType': {
                        const skillName = action.targetSkill;
                        if (!skillName) {
                            if (log) log.push("...ModifySkillTargetType failed: No target skill specified.");
                            break;
                        }
                        const safeName = skillName.replace(/\s+/g, '_');
                        const propName = `Override_${safeName}_ActionTarget`;
                        
                        this.setCharacterProperty(target, propName, action.newTargetType, action.duration, log);
                        break;
                    }
                }
            }
        }
    }
    
    // --- CONDITION CHECKER ---
    checkConditions(conditions, eventPayload, activeEffect, skillCaster, skillTarget) {
        if (!conditions || conditions.length === 0) {
            return true; 
        }
        
        const isInstantAction = (activeEffect === null);
        const caster = isInstantAction ? skillCaster : activeEffect.caster;
        const target = isInstantAction ? skillTarget : activeEffect.target;
        const event = eventPayload;
        
        for (const cond of conditions) {
            let left;
            let right = cond.value;

            const fieldParts = cond.field.split('.');
            let source = null;
            
            if (fieldParts[0] === 'Event')     source = event;
            else if (fieldParts[0] === 'Target')  source = target;
            else if (fieldParts[0] === 'Caster')  source = caster; 
            else if (fieldParts[0] === 'Effect')  source = activeEffect;
            else if (fieldParts[0] === 'Game')  source = this.gameState;
            
            if (source) {
                if (fieldParts[1] === 'Health') left = source.hp;
                else if (fieldParts[1] === 'HealthPercent') left = (source.hp / source.maxHp) * 100;
                
                // *** UPDATED: Enable counting effects ***
                else if (fieldParts[1] === 'EffectCount') {
                    const effectName = fieldParts[2];
                    left = source.activeEffects.filter(e => e.model.name === effectName).length;
                }
                
                else if (fieldParts[1] === 'HasEffect') left = source.activeEffects.some(e => e.model.name === right);
                else if (fieldParts[1] === 'HasProperty') left = this.characterHasProperty(source, right);
                else if (fieldParts[1] === 'IsStunned') left = this.isStunned(source, 'Full');
                else if (fieldParts[1] === 'DamageAmount') left = source?.finalAmount;
                else if (fieldParts[1] === 'Skill' && fieldParts[2] === 'Class') left = source?.skill?.skillClass;
                else if (fieldParts[1] === 'StackCount') left = source?.stacks;
                else if (fieldParts[1] === 'LastSkillUsed') left = source.lastSkillUsed;
                else if (fieldParts[1] === 'Resource') left = source.resources.get(fieldParts[2]) || 0;
                else if (fieldParts[1] === 'TurnNumber') left = source.gameTurn;
                else if (fieldParts[1] === 'HasTriggeredThisTurn') left = source?.properties?.get('HasTriggeredThisTurn') === true;
                else if (fieldParts[1] === 'HasAlly') {
                     const team = this.gameState.teams[source.teamIndex];
                     left = team.characters.filter(c => c.hp > 0 && c.id !== source.id).length > 0;
                }
                else if (fieldParts[1] === 'HasUsedSkill') {
                     left = source.skillHistory && source.skillHistory.includes(right);
                }
            }

            let result = false;
            switch (cond.operator) {
                case '==': result = (left == right); break;
                case '!=': result = (left != right); break;
                case '>':  result = (left > right); break;
                case '>=': result = (left >= right); break;
                case '<':  result = (left < right); break;
                case '<=': result = (left <= right); break;
                case 'HasEffect': result = (left === true); break;
                case 'DoesNotHaveEffect': result = (left === false); break;
                case 'IsClass': result = (left === right); break;
                case 'IsNotClass': result = (left !== right); break;
                case 'HasProperty': result = (event?.skill?.properties?.[right] === true); break; 
                case 'DoesNotHaveProperty': result = (event?.skill?.properties?.[right] !== true); break;
                case 'LastSkillUsed': result = (left === right); break;
                case 'IsTurnNumber_Even': result = (left % 2 === 0); break;
                case 'IsTurnNumber_Odd': result = (left % 2 !== 0); break;
                case 'IsMultipleOf': result = (left % parseInt(right, 10) === 0); break;
                
                case 'IsCaster':
                    result = (eventPayload?.caster && caster.id === eventPayload.caster.id && caster.teamIndex === eventPayload.caster.teamIndex);
                    break;
                case 'IsNotCaster':
                    result = (!eventPayload?.caster || (caster.id !== eventPayload.caster.id || caster.teamIndex !== eventPayload.caster.teamIndex));
                    break;
                case 'IsTarget':
                     result = (eventPayload?.target && target.id === eventPayload.target.id && target.teamIndex === eventPayload.target.teamIndex);
                    break;
                case 'IsNotTarget':
                     result = (!eventPayload?.target || (target.id !== eventPayload.target.id || target.teamIndex !== eventPayload.target.teamIndex));
                    break;
                case 'IsAlly':
                    result = (eventPayload?.caster && caster.teamIndex === eventPayload.caster.teamIndex);
                    break;
                case 'IsEnemy':
                    result = (eventPayload?.caster && caster.teamIndex !== eventPayload.caster.teamIndex);
                    break;
                case 'Caster.HasAlly': result = left; break; 
                case 'Caster.HasUsedSkill': result = left; break;
            }
            
            if (!result) return false;
        }
        return true;
    }

    // --- ACTIVE EFFECT MANAGEMENT ---
    // UPDATED: Added sourceSkillName parameter
    createActiveEffect(effectName, caster, target, duration, log, initialStacks = 1, isPermanent = false, skillClass = 'Unique', executionType = 'Instant', sourceSkillName = 'Unknown Source') {
        const effectModel = masterEffectList[effectName];
        if (!effectModel) {
            log.push(`!! ENGINE ERROR: Cannot find Effect model: ${effectName} !!`);
            return;
        }

        const existingEffects = target.activeEffects.filter(e => e.model.name === effectName);
        const count = existingEffects.length;

        // --- UPDATED: Independent Stacking Logic ---
        if (count > 0 && count < effectModel.maxStacks) {
            // Create NEW instance for independent stacking
            // Do NOT return here, proceed to create new activeEffect object
        } else if (count >= effectModel.maxStacks) {
            // If max stacks reached, refresh the oldest one (or just the first one found)
            const existing = existingEffects[0];
            existing.duration = isPermanent ? 999 : (duration * 2);
            log.push(`...${target.name}'s '${effectName}' refreshed!`);
            return; 
        }

        const activeEffect = {
            id: nextEffectId++,
            model: effectModel,
            caster: caster,
            target: target,
            duration: isPermanent ? 999 : duration * 2, 
            isPermanent: isPermanent,
            stacks: initialStacks,
            listeners: [],
            properties: new Map(),
            skillClass: skillClass,
            executionType: executionType,
            sourceSkillName: sourceSkillName // --- NEW: Store Source Name
        };

        for (const logicBlock of effectModel.logicBlocks) {
            if (logicBlock.trigger === 'OnEffectApply') {
                const selfPayload = { caster: caster, target: target, log: log, event: 'OnEffectApply' };
                const conditionsMet = this.checkConditions(logicBlock.conditions, selfPayload, activeEffect, caster, target);
                if (conditionsMet) {
                    log.push(`...Effect '${activeEffect.model.name}' on ${target.name} triggers instantly!`);
                    this.applyActions(logicBlock.actions, caster, target, null, log, selfPayload);
                }
            } 
            else {
                const listener = (payload) => {
                    if (!target.activeEffects.includes(activeEffect)) return; 
                    
                    if (activeEffect.executionType === 'Action') {
                         if (this.isStunned(activeEffect.caster, activeEffect.skillClass)) {
                             return;
                         }
                    }

                    const conditionsMet = this.checkConditions(logicBlock.conditions, payload, activeEffect, activeEffect.caster, activeEffect.target);
                    
                    if (conditionsMet) {
                        this.applyActions(logicBlock.actions, activeEffect.caster, payload.target, null, log, payload);
                    }
                };
                
                activeEffect.listeners.push({ event: logicBlock.trigger, func: listener });
                this.eventBus.on(logicBlock.trigger, listener);
            }
        }

        target.activeEffects.push(activeEffect);
        if (effectModel.name !== "DestructibleDefense") { 
             log.push(`...${target.name} gains effect: '${effectName}'!`);
        }
    }
    
    removeActiveEffect(effect, target, log) {
        // --- UPDATED: Smart Property Cleanup ---
        for (const logicBlock of effect.model.logicBlocks) {
            if (logicBlock.trigger === 'OnEffectApply') {
                
                for (const action of logicBlock.actions) {
                    if (action.type === 'SetProperty') {
                        const propName = action.property;
                        const valToRemove = action.propertyValue;

                        // 1. Numeric Properties (Damage/Defense) -> Subtract value
                        if (typeof valToRemove === 'number') {
                            const current = this.getCharacterProperty(target, propName, 'number');
                            const newValue = current - valToRemove;
                            
                             if (newValue !== 0) { 
                                const otherProvider = target.activeEffects.some(e => 
                                    e.id !== effect.id && 
                                    e.model.logicBlocks.some(b => b.trigger === 'OnEffectApply' && b.actions.some(a => a.type === 'SetProperty' && a.property === propName))
                                );

                                if (!otherProvider && newValue <= 0) {
                                     this.removeCharacterProperty(target, propName);
                                } else {
                                     this.setCharacterProperty(target, propName, newValue, 999, log, false); 
                                }
                            } else {
                                this.removeCharacterProperty(target, propName);
                            }
                        } 
                        // 2. Boolean/String Properties (Stun, Invuln) -> Check other sources
                        else {
                            const otherProvider = target.activeEffects.some(e => 
                                e.id !== effect.id && 
                                e.model.logicBlocks.some(b => b.trigger === 'OnEffectApply' && b.actions.some(a => a.type === 'SetProperty' && a.property === propName))
                            );
                            if (!otherProvider) {
                                this.removeCharacterProperty(target, propName);
                            }
                        }
                    }
                    // Handle other property-setting actions (like Stun action shorthand)
                    else if (action.type === 'Stun') {
                        const propName = `Stun_${action.stunType}`;
                        const otherProvider = target.activeEffects.some(e => 
                            e.id !== effect.id && 
                            e.model.logicBlocks.some(b => b.trigger === 'OnEffectApply' && b.actions.some(a => a.type === 'Stun' && a.stunType === action.stunType))
                        );
                        if (!otherProvider) {
                            this.removeCharacterProperty(target, propName);
                        }
                    }
                     else if (action.type === 'IncreaseDamageDealt' || action.type === 'DecreaseDamageDealt') {
                         const category = action.damageCategory || 'All';
                         const prefix = action.type === 'IncreaseDamageDealt' ? 'Inc' : 'Dec';
                         const propName = `${prefix}DamageDealt_${category}`;
                         
                         const current = this.getCharacterProperty(target, propName, 'number');
                         const newValue = current - (action.amount || 0);
                         
                         if (newValue <= 0) {
                             this.removeCharacterProperty(target, propName);
                         } else {
                             this.setCharacterProperty(target, propName, newValue, 999, log, false);
                         }
                     }
                }
            }
        }

        for (const listener of effect.listeners) {
            this.eventBus.off(listener.event, listener.func);
        }
        
        const index = target.activeEffects.findIndex(e => e.id === effect.id);
        if (index > -1) {
            target.activeEffects.splice(index, 1);
            if (effect.model.name !== "DestructibleDefense") {
                log.push(`...${target.name}'s '${effect.model.name}' effect has expired.`);
            }
        }
    }

    // --- END TURN ---
    async endTurn() {
        if (!this.gameState.gameActive) return [];

        const attackerTeamIdx = this.gameState.currentTeamIndex;
        const enemyTeamIdx = 1 - attackerTeamIdx;
        const attackerTeam = this.gameState.teams[attackerTeamIdx];
        const enemyTeam = this.gameState.teams[enemyTeamIdx];
        
        let log = []; 

        log.push(`--- ${attackerTeam.name}'s Battle Phase Begins! ---`);

        if (this.gameState.currentTurnExchanges) {
             this.gameState.currentTurnExchanges.forEach(ex => {
                  attackerTeam.chakra[ex.gain]++;
                  this.payCost(attackerTeam, ex.cost);
             });
        }
        
        const queueToExecute = [...this.gameState.skillQueue];
        this.gameState.skillQueue = []; 

        const activeCharIndices = queueToExecute.map(q => q.charIndex);
        attackerTeam.characters.forEach((char, index) => {
            if (!activeCharIndices.includes(index) && char.hp > 0) {
                this.eventBus.emit('OnSkillNotUsed', { target: char, caster: char, log });
            }
        });
        
        for (const queuedSkill of queueToExecute) {
            const charIndex = queuedSkill.charIndex;
            const skillIndex = queuedSkill.skillIndex;
            
            const attacker = attackerTeam.characters[charIndex];
            const skill = attacker.skills[skillIndex];
            
            // --- VALIDATION: Target Requirements ---
            // We do this BEFORE cost payment to avoid refund logic on failure
            let primaryTarget = this.gameState.teams[queuedSkill.target.teamIndex]
                                    .characters[queuedSkill.target.charIndex];
                                    
            if (skill.targetReqs && skill.targetReqs.length > 0) {
                const reqsMet = this.checkConditions(skill.targetReqs, {}, null, attacker, primaryTarget);
                if (!reqsMet) {
                    log.push(`${attacker.name}'s ${skill.name} failed: Target Requirements not met!`);
                    continue; 
                }
            }
            // ---------------------------------------
            
            if (attacker.hp <= 0) {
                log.push(`${attacker.name}'s ${skill.name} fizzles (character is K.O.)`);
                continue;
            }

            if (this.isStunned(attacker, skill.skillClass)) {
                log.push(`${attacker.name} is stunned and cannot use ${skill.name}!`);
                continue;
            }
            
            
            this.payCost(attackerTeam, queuedSkill.payment);
            skill.currentCD = skill.cooldown * 2; 
            attacker.lastSkillUsed = skill.name; 
            attacker.skillHistory.push(skill.name);
            
            log.push(`${attacker.name} uses ${skill.name}!`);
            
            let eventContext = { 
                caster: attacker, 
                target: primaryTarget, 
                skill, 
                log, 
                isCancelled: false, 
                reflectedTo: null 
            };

            this.eventBus.emit('OnTargeted', eventContext);
            if (eventContext.reflectedTo) {
                primaryTarget = eventContext.reflectedTo;
                eventContext.target = primaryTarget; 
            }

            this.eventBus.emit('OnSkillUse', eventContext);
            
            this.applyActions(skill.instantActions, attacker, primaryTarget, skill, log, eventContext);
            
            if (this.checkWinCondition(log)) return log;
        }
        
        log.push("--- End of Turn Phase ---");
        const allChars = [...attackerTeam.characters, ...enemyTeam.characters];
        
        for (const char of allChars) { 
            if (char.hp > 0) {
                this.eventBus.emit('OnTurnEnd', { caster: char, target: char, log });
            }
        }
        
        if (this.checkWinCondition(log)) return log; 

        log.push("--- Cleanup Phase ---");
        allChars.forEach(char => {
            char.skills.forEach(skill => {
                if (skill.currentCD > 0) skill.currentCD--;
            });
            
            for (const [propName, propData] of char.properties.entries()) {
                if (propData.duration < 999) { 
                    propData.duration--;
                    if (propData.duration <= 0) {
                        char.properties.delete(propName);
                        log.push(`...${char.name}'s '${propName}' property has worn off.`);
                    }
                }
            }
            
            for (let i = char.activeEffects.length - 1; i >= 0; i--) {
                const effect = char.activeEffects[i];
                effect.properties.delete('HasTriggeredThisTurn');

                if (effect.isPermanent) continue;
                effect.duration--;
                if (effect.duration <= 0) {
                    this.removeActiveEffect(effect, char, log);
                }
            }
        });

        this.gameState.currentTeamIndex = 1 - this.gameState.currentTeamIndex;
        if (this.gameState.currentTeamIndex === 0) {
            this.gameState.gameTurn++;
        }
        const newTeam = this.gameState.teams[this.gameState.currentTeamIndex];
        
        log.push(`--- It is now ${newTeam.name}'s turn! (Turn ${this.gameState.gameTurn}) ---`);
        
        log.push(this.gainTurnChakra(newTeam));

        for (const char of newTeam.characters) {
            if (char.hp > 0) {
                this.eventBus.emit('OnTurnStart', { caster: char, target: char, log });
            }
        }

        return log;
    }
    
    // --- WIN CHECKS ---
    isTeamDead(team) {
        return team.characters.every(c => c.hp <= 0);
    }
    checkWinCondition(log) {
        if (!this.gameState.teams[0] || !this.gameState.teams[1]) return false;
        const t1Dead = this.isTeamDead(this.gameState.teams[0]);
        const t2Dead = this.isTeamDead(this.gameState.teams[1]);
        if (t1Dead) {
            this.gameState.gameActive = false;
            this.gameState.winner = this.players[1].username;
            this.gameState.winnerId = this.players[1].id;
            this.gameState.loserId = this.players[0].id;
            log.push(`--- ${this.gameState.winner} wins! ---`);
            return true;
        }
        if (t2Dead) {
            this.gameState.gameActive = false;
            this.gameState.winner = this.players[0].username;
            this.gameState.winnerId = this.players[0].id;
            this.gameState.loserId = this.players[1].id;
            log.push(`--- ${this.gameState.winner} wins! ---`);
            return true;
        }
        return false;
    }
    forfeitGame(playerIndex) {
        if (!this.gameState.gameActive && this.gameState.winner) return;
        this.gameState.gameActive = false;
        const loserIndex = playerIndex;
        const winnerIndex = 1 - playerIndex;
        const winner = this.players[winnerIndex];
        const loser = this.players[loserIndex];
        if (winner) {
            this.gameState.winner = winner.username;
            this.gameState.winnerId = winner.id;
        }
        if (loser) {
            this.gameState.loserId = loser.id;
        }
        console.log(`Game over: Player ${playerIndex + 1} forfeited.`);
    }
}

module.exports = Game;
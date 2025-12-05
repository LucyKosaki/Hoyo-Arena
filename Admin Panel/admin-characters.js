// --- UPDATED: admin-characters.js ---
import { 
    apiFetch, adminMessage, masterCharacterList, globalGameStats, 
    masterEffectList, ui, openModal, closeModal, renderCharacterList 
} from './admin.js';

import { 
    getDynamicFieldHTML, 
    saveDynamicFields,
    getActionPillHTML,
    getConditionPillHTML,
    openLogicModal,
    currentEdit,
    tempModalAction,
    resetEditState
} from './admin-effects.js';

// --- STATE ---
let tempSkills = []; 
let tempPassiveEffects = []; 
let tempCategories = [];

export function initCharacterTab() {
    ui.addCharForm.addEventListener('submit', addCharacter);
    ui.loadCharactersBtn.addEventListener('click', loadAllCharacters);
    ui.editCharDetailsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveCharacterChanges(ui.editCharDetailsForm.dataset.charId);
    });
    ui.editCharCancelBtn.addEventListener('click', closeCharacterModal);
    document.getElementById('add-skill-btn').addEventListener('click', addSkill);

    const tagInput = document.getElementById('char-tag-input');
    if (tagInput) {
        tagInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addCategoryTag(tagInput.value);
                tagInput.value = '';
            }
        });
        tagInput.addEventListener('blur', () => {
            if (tagInput.value.trim()) {
                addCategoryTag(tagInput.value);
                tagInput.value = '';
            }
        });
    }
}

// --- CHARACTER MANAGEMENT ---
export async function loadAllCharacters() {
    try {
        const chars = await apiFetch('characters');
        masterCharacterList.clear(); 
        chars.forEach(char => masterCharacterList.set(char.id, char));
        renderCharacterList(Array.from(masterCharacterList.values()));
        updateTagSuggestions();
    } catch (err) {
        adminMessage.textContent = 'Failed to load characters list.';
    }
}
async function addCharacter(e) {
    e.preventDefault();
    adminMessage.textContent = "Adding...";
    const id = document.getElementById('char-id').value.toLowerCase().trim();
    const name = document.getElementById('char-name').value;
    try {
        const data = await apiFetch('add-character', 'POST', { id, name });
        adminMessage.textContent = `Success! Added ${data.name}.`;
        ui.addCharForm.reset();
        await loadAllCharacters(); 
    } catch (err) {
        adminMessage.textContent = err.message;
    }
}

// --- CHARACTER MODAL LOGIC ---

export function openCharacterModal(char) {
    ui.editCharDetailsForm.dataset.charId = char.id;
    ui.editCharTitle.textContent = `Edit Character: ${char.name}`;
    ui.editCharNameInput.value = char.name;
    ui.charIdValue.textContent = char.id;
    ui.editCharDesc.value = char.description || ''; 
    
    // --- NEW: Load Image Fields (Direct Assignment) ---
    document.getElementById('edit-char-icon').value = char.icon || '';
    document.getElementById('edit-char-splash').value = char.splashArt || '';
    // -----------------------------
    
    tempPassiveEffects = char.passiveEffects ? [...char.passiveEffects] : [];
    ui.editCharPassives.value = tempPassiveEffects.join(', ');

    tempCategories = char.categories ? [...char.categories] : [];
    renderTags();
    
    tempSkills = JSON.parse(JSON.stringify(char.skills)).map(s => ({...s, isCollapsed: true})); 
    
    renderSkillForms();
    openModal('edit-char-modal');
}
function closeCharacterModal() {
    closeModal('edit-char-modal');
    tempSkills = []; 
    tempPassiveEffects = [];
    tempCategories = [];
    resetEditState();
}

function addCategoryTag(val) {
    const tag = val.trim();
    if (!tag) return;
    if (!tempCategories.includes(tag)) {
        tempCategories.push(tag);
        renderTags();
    }
}

function removeCategoryTag(index) {
    tempCategories.splice(index, 1);
    renderTags();
}

function renderTags() {
    const container = document.getElementById('char-tag-list');
    if (!container) return;
    
    container.innerHTML = '';
    tempCategories.forEach((tag, index) => {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.innerHTML = `${tag} <span class="close-tag" data-index="${index}">&times;</span>`;
        chip.querySelector('.close-tag').addEventListener('click', (e) => {
            e.stopPropagation();
            removeCategoryTag(index);
        });
        container.appendChild(chip);
    });
}

function updateTagSuggestions() {
    const datalist = document.getElementById('existing-char-tags');
    if (!datalist) return;
    
    datalist.innerHTML = '';
    const allTags = new Set();
    masterCharacterList.forEach(char => {
        if (char.categories && Array.isArray(char.categories)) {
            char.categories.forEach(t => allTags.add(t));
        }
    });
    Array.from(allTags).sort().forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        datalist.appendChild(option);
    });
}

// --- SKILL & ACTION RENDERING ---

function addSkill() {
    tempSkills.push({
        name: "New Skill",
        icon: "", // Default empty
        cost: {},
        cooldown: 0,
        description: "",
        skillClass: 'Physical',
        executionType: 'Instant',
        targetType: 'Enemy',
        targetReqs: [], 
        instantActions: [],
        isCollapsed: false 
    });
    renderSkillForms();
}

function deleteSkill(index) {
    if (confirm("Delete this skill?")) {
        tempSkills.splice(index, 1);
        renderSkillForms();
    }
}

function toggleSkillCollapse(index) {
    tempSkills[index].isCollapsed = !tempSkills[index].isCollapsed;
    const group = ui.skillFormsContainer.querySelector(`.skill-group[data-skill-index="${index}"]`);
    const body = group.querySelector('.skill-body');
    const toggleIcon = group.querySelector('.toggle-icon');
    
    if (tempSkills[index].isCollapsed) {
        body.classList.add('hidden');
        toggleIcon.className = 'fas fa-chevron-right toggle-icon';
        group.classList.add('collapsed');
    } else {
        body.classList.remove('hidden');
        toggleIcon.className = 'fas fa-chevron-down toggle-icon';
        group.classList.remove('collapsed');
    }
}

function renderSkillForms() {
    ui.skillFormsContainer.innerHTML = '';
    tempSkills.forEach((skill, index) => {
        const skillGroup = document.createElement('div');
        skillGroup.className = `skill-group ${skill.isCollapsed ? 'collapsed' : ''}`;
        skillGroup.dataset.skillIndex = index;
        
        const skillClassOptions = ['Physical', 'Energy', 'Strategic', 'Affliction']
            .sort() 
            .map(c => `<option value="${c}" ${skill.skillClass === c ? 'selected' : ''}>${c}</option>`).join('');
            
        const executionTypeOptions = ['Instant', 'Action', 'Control']
            .sort() 
            .map(t => `<option value="${t}" ${skill.executionType === t ? 'selected' : ''}>${t}</option>`).join('');
        
        const targetTypeOptions = [
            'Enemy', 'Ally', 'Self', 
            'AllEnemies', 'AllAllies', 
            'AllyOrEnemy', 'AllyTeamOrEnemyTeam', 'AllAlliesAndEnemies'
        ].map(t => `<option value="${t}" ${skill.targetType === t ? 'selected' : ''}>${t}</option>`).join('');

        const isHidden = index >= 4;
        const headerText = isHidden ? `Skill ${index + 1} (Hidden/Swap Only)` : `Skill ${index + 1}`;
        const summaryText = skill.name ? `: ${skill.name}` : '';

        // Added Skill Icon input field
        skillGroup.innerHTML = `
            <div class="skill-header-bar">
                <div class="skill-title-section">
                    <i class="fas ${skill.isCollapsed ? 'fa-chevron-right' : 'fa-chevron-down'} toggle-icon"></i>
                    <h3>${headerText} <span class="skill-summary">${summaryText}</span></h3>
                </div>
                <button type="button" class="delete-item-btn delete-skill-btn" data-index="${index}">Delete</button>
            </div>
            
            <div class="skill-body ${skill.isCollapsed ? 'hidden' : ''}">
                <div class="form-grid">
                    <div>
                        <label>Skill Name</label>
                        <input type="text" class="skill-name" value="${skill.name}">
                    </div>
                    <div>
                        <label>Skill Icon URL</label>
                        <input type="text" class="skill-icon" value="${skill.icon || ''}" placeholder="assets/icons/skill.png">
                    </div>
                </div>
                
                <label>Description</label>
                <textarea class="skill-description">${skill.description || ''}</textarea>
                
                <div class="skill-class-grid">
                    <div>
                        <label>Skill Class</label>
                        <select class="skill-class">${skillClassOptions}</select>
                    </div>
                    <div>
                        <label>Execution Type</label>
                        <select class="skill-execution">${executionTypeOptions}</select>
                    </div>
                    <div>
                        <label>Skill Target Type</label>
                        <select class="skill-target-type">${targetTypeOptions}</select>
                    </div>
                    <div class="effect-config-checkbox" style="grid-column: 1 / -1;">
                        <input type="checkbox" class="skill-unique" ${skill.isUnique ? 'checked' : ''}>
                        <label>Is Unique? (Cannot be copied)</label>
                    </div>
                    <div class="effect-config-checkbox" style="grid-column: 1 / -1;">
                        <input type="checkbox" class="skill-uncounterable" ${skill.uncounterable ? 'checked' : ''}>
                        <label>Uncounterable? (Cannot be countered/reflected)</label>
                    </div>
                    <div class="effect-config-checkbox" style="grid-column: 1 / -1;">
                        <input type="checkbox" class="skill-ignore-invuln" ${skill.ignoreInvuln ? 'checked' : ''}>
                        <label>Ignore Invulnerability? (Entire skill bypasses)</label>
                    </div>
                </div>
                
                <label>Cost</label>
                <div class="skill-cost-grid">
                    <label>Green <input type="number" class="skill-cost-green" value="${skill.cost.green || 0}"></label>
                    <label>Blue <input type="number" class="skill-cost-blue" value="${skill.cost.blue || 0}"></label>
                    <label>Red <input type="number" class="skill-cost-red" value="${skill.cost.red || 0}"></label>
                    <label>White <input type="number" class="skill-cost-white" value="${skill.cost.white || 0}"></label>
                    <label>Any <input type="number" class="skill-cost-any" value="${skill.cost.any || 0}"></label>
                </div>
                <label>Cooldown</label>
                <input type="number" class="skill-cooldown" value="${skill.cooldown || 0}">
                
                <hr>
                <label>Target Requirements (Target must meet these to be clickable)</label>
                <ul class="reqs-list" data-skill-index="${index}"></ul>
                <button type="button" class="add-btn add-req-btn" data-skill-index="${index}">Add Requirement</button>
                
                <hr>
                <label>Instant Actions</label>
                <ul class="actions-list" data-skill-index="${index}"></ul>
                <button type="button" class="add-action-btn" data-skill-index="${index}">Add Action</button>
            </div>
        `;
        
        ui.skillFormsContainer.appendChild(skillGroup);
        
        // Listeners
        skillGroup.querySelector('.skill-header-bar').addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-skill-btn')) return;
            toggleSkillCollapse(index);
        });

        skillGroup.querySelector('.delete-skill-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSkill(index);
        });
        
        const nameInput = skillGroup.querySelector('.skill-name');
        nameInput.addEventListener('input', (e) => {
            skill.name = e.target.value;
            skillGroup.querySelector('.skill-summary').textContent = `: ${e.target.value}`;
        });

        // Render Target Reqs
        const reqsList = skillGroup.querySelector('.reqs-list');
        if (skill.targetReqs) {
            skill.targetReqs.forEach((req, reqIndex) => {
                reqsList.appendChild(renderReqPill(req, index, reqIndex));
            });
        }
        
        skillGroup.querySelector('.add-req-btn').addEventListener('click', () => {
            Object.assign(currentEdit, {
                skillIndex: index,
                conditionIndex: -1, 
                type: 'skillTargetReq',
                context: 'character'
            });
            openLogicModal('condition', null, 'character'); 
        });

        // Render Actions
        const actionsList = skillGroup.querySelector('.actions-list');
        if (skill.instantActions) { 
            skill.instantActions.forEach((action, actionIndex) => {
                actionsList.appendChild(
                    renderActionPill(action, index, actionIndex)
                );
            });
        } else {
            skill.instantActions = []; 
        }
    });

    ui.skillFormsContainer.querySelectorAll('.add-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sIndex = parseInt(e.target.dataset.skillIndex);
            Object.assign(currentEdit, {
                skillIndex: sIndex, 
                actionIndex: -1, 
                type: 'action',
                context: 'character',
                logicBlockIndex: null,
                conditionIndex: null,
                subConditionIndex: null
            });
            openActionModal(null); 
        });
    });
}

function renderReqPill(req, skillIndex, reqIndex) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = getConditionPillHTML(req, reqIndex); 
    const pill = wrapper.firstElementChild;
    
    // Re-bind buttons specifically for Reqs
    const editBtn = pill.querySelector('.edit-condition-btn');
    editBtn.onclick = (e) => {
        e.stopPropagation();
        Object.assign(currentEdit, {
            skillIndex: skillIndex,
            conditionIndex: reqIndex,
            type: 'skillTargetReq',
            context: 'character'
        });
        openLogicModal('condition', tempSkills[skillIndex].targetReqs[reqIndex], 'character');
    };

    const deleteBtn = pill.querySelector('.delete-condition-btn');
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        tempSkills[skillIndex].targetReqs.splice(reqIndex, 1);
        renderSkillForms(); 
    };
    
    return pill;
}

function renderActionPill(action, skillIndex, actionIndex) {
    const tempWrapper = document.createElement('div');
    tempWrapper.innerHTML = getActionPillHTML(action, actionIndex); 
    
    const pill = tempWrapper.firstElementChild;
    if (!pill) {
        return document.createElement('li'); 
    }

    const editBtn = pill.querySelector('.edit-action-btn');
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            Object.assign(currentEdit, {
                skillIndex: skillIndex, 
                actionIndex: actionIndex,
                type: 'action',
                context: 'character',
                logicBlockIndex: null,
                conditionIndex: null,
                subConditionIndex: null
            });
            openActionModal(action); 
        });
    }

    const deleteBtn = pill.querySelector('.delete-action-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteInstantAction(skillIndex, actionIndex);
        });
    }
    
    return pill;
}


function rerenderSkillActions(skillIndex) {
    const actionsList = ui.skillFormsContainer.querySelector(`.actions-list[data-skill-index="${skillIndex}"]`);
    if (!actionsList) return;
    
    actionsList.innerHTML = '';
    tempSkills[skillIndex].instantActions.forEach((action, actionIndex) => {
        actionsList.appendChild(
            renderActionPill(action, skillIndex, actionIndex)
        );
    });
}

function deleteInstantAction(skillIndex, actionIndex) {
    tempSkills[skillIndex].instantActions.splice(actionIndex, 1);
    rerenderSkillActions(skillIndex);
}

function openActionModal(action) {
    openLogicModal('action', action, currentEdit.context);
}

export function saveCharacterLogicModal() {
    const { skillIndex, actionIndex, conditionIndex, type, subConditionIndex } = currentEdit;
    
    if (currentEdit.context !== 'character') return;

    if (type === 'action') { 
        const newAction = saveDynamicFields('action');
        
        if (actionIndex === -1) { 
            if (!tempSkills[skillIndex].instantActions) {
                tempSkills[skillIndex].instantActions = [];
            }
            tempSkills[skillIndex].instantActions.push(newAction);
        } else { 
            tempSkills[skillIndex].instantActions[actionIndex] = newAction;
        }
        
        rerenderSkillActions(skillIndex); 
    
    } else if (type === 'actionCondition') {
        const newCondition = saveDynamicFields('condition');
        let action = tempModalAction;
        if (!action.conditions) action.conditions = [];
        
        if (subConditionIndex === -1) { 
            action.conditions.push(newCondition);
        } else { 
            action.conditions[subConditionIndex] = newCondition;
        }
        currentEdit.type = 'action'; 
        openLogicModal('action', action, 'character');
        return; 

    } 
    else if (type === 'skillTargetReq' || type === 'condition') {
        const newReq = saveDynamicFields('condition'); 
        if (!tempSkills[skillIndex].targetReqs) {
            tempSkills[skillIndex].targetReqs = [];
        }

        if (conditionIndex === -1) {
            tempSkills[skillIndex].targetReqs.push(newReq);
        } else {
            tempSkills[skillIndex].targetReqs[conditionIndex] = newReq;
        }
        renderSkillForms(); 
    }
    
    closeModal('edit-logic-modal');
    resetEditState();
}

async function saveCharacterChanges(charId) {
    adminMessage.textContent = "Saving...";
    try {
        const newName = ui.editCharNameInput.value;
        const newDescription = ui.editCharDesc.value; 
        
        // --- NEW: Read image fields (Direct Access) ---
        const newIcon = document.getElementById('edit-char-icon').value;
        const newSplash = document.getElementById('edit-char-splash').value;
        
        const newPassives = ui.editCharPassives.value
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        
        ui.skillFormsContainer.querySelectorAll('.skill-group').forEach((group, index) => {
            const skill = tempSkills[index]; 
            
            skill.name = group.querySelector('.skill-name').value;
            // --- NEW: Read Skill Icon ---
            skill.icon = group.querySelector('.skill-icon').value; 
            
            skill.description = group.querySelector('.skill-description').value;
            skill.cooldown = parseInt(group.querySelector('.skill-cooldown').value, 10) || 0;
            
            skill.skillClass = group.querySelector('.skill-class').value;
            skill.executionType = group.querySelector('.skill-execution').value;
            skill.targetType = group.querySelector('.skill-target-type').value;
            
            skill.isUnique = group.querySelector('.skill-unique').checked;
            skill.uncounterable = group.querySelector('.skill-uncounterable').checked;
            skill.ignoreInvuln = group.querySelector('.skill-ignore-invuln').checked;
            
            skill.cost = {
                green: parseInt(group.querySelector('.skill-cost-green').value, 10) || 0,
                blue: parseInt(group.querySelector('.skill-cost-blue').value, 10) || 0,
                red: parseInt(group.querySelector('.skill-cost-red').value, 10) || 0,
                white: parseInt(group.querySelector('.skill-cost-white').value, 10) || 0,
                any: parseInt(group.querySelector('.skill-cost-any').value, 10) || 0
            };
            
            delete skill.isCollapsed;
        });
        
        const data = await apiFetch(`characters/${charId}`, 'PUT', {
            name: newName,
            description: newDescription, 
            skills: tempSkills,
            passiveEffects: newPassives,
            categories: tempCategories,
            icon: newIcon,
            splashArt: newSplash
        });
        
        adminMessage.textContent = `Character ${data.name} updated successfully!`;
        closeCharacterModal();
        await loadAllCharacters();

    } catch (err) {
        adminMessage.textContent = err.message;
    }
}
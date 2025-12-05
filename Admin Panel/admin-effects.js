// --- UPDATED: admin-effects.js ---
import { 
    apiFetch, adminMessage, masterCharacterList, 
    masterEffectList, ui, openModal, closeModal,
    MASTER_RESOURCE_LIST 
} from './admin.js';

// --- STATE ---
let tempEffect = {}; 

export let currentEdit = {
    logicBlockIndex: null,
    conditionIndex: null, 
    actionIndex: null, 
    context: 'effect', 
    subConditionIndex: null,
    type: null 
};
export let tempModalAction = {}; 

export function resetEditState() {
    Object.assign(currentEdit, {
        logicBlockIndex: null, conditionIndex: null, actionIndex: null,
        context: 'effect', type: null, subConditionIndex: null
    });
    Object.keys(tempModalAction).forEach(key => delete tempModalAction[key]);
    if (tempModalAction.conditions) {
        tempModalAction.conditions.length = 0;
    } else {
        tempModalAction.conditions = [];
    }
}


// --- CONSTANTS ---
const MASTER_TRIGGER_LIST = [
    'OnAttemptDeath', 'OnCharacterKill', 'OnDamageDealt', 'OnDamageTaken', 'OnDeath', 'OnDeath_Ally', 'OnDeath_Enemy',
    'OnDestructibleDefenseBroken', 'OnEffectApply', 'OnEffectRemove', 'OnGameStart', 'OnHealthChange', 
    'OnHealReceived', 'OnResourceGain', 'OnResourceLoss', 'OnSkillNotUsed', 'OnSkillUse',
    'OnSkillUse_ByAlly', 'OnSkillUse_ByEnemy', 'OnSkillUse_Class_Affliction', 'OnSkillUse_Class_Energy',
    'OnSkillUse_Class_Physical', 'OnSkillUse_Class_Strategic', 'OnSkillUse_Harmful', 'OnSkillUse_Helpful',
    'OnStunApplied', 'OnTargeted', 'OnTurnEnd', 'OnTurnStart'
].sort();

const MASTER_ACTION_LIST = [
    'ApplyDelayedEffect', 'ApplyEffect', 'ConsumeResource', 'CounterSkill', 'Damage', 'DamageBasedOnStat',
    'Execute', 'ExtendDuration', 'Heal', 'IncreaseCooldown', 'InvertHealing', 'InvertHelpfulHarmful',
    'IncreaseDamageDealt', 'DecreaseDamageDealt', 
    'ModifyMaxHealth', 'ModifyResource', 'ModifySkillCost', 'ModifySkillTargetType', 
    'ModifySkillMechanics', 
    'ReflectSkill', 
    'RemoveEffect', 'ResetCooldowns', 'RevertForm', 'SetHealth', 'SetProperty', 'SetResource', 'StealHealth',
    'Stun', 'SwapHealth', 'SwapSkill', 'Transform', 'UseSkill', 
    'ModifySkillCooldown',
    'ExecuteBasedOnStat', 'ConvertProperty'
].sort();

const MASTER_CONDITION_FIELD_LIST = [
    'Caster.HasAlly', 'Caster.HasUsedSkill', 'Caster.LastSkillUsed', 
    'Effect.HasTriggeredThisTurn', 'Effect.StackCount', 'Event.DamageAmount', 'Event.Skill.Class',
    'Event.Skill.HasProperty', 'Game.TurnNumber', 'Target.HasEffect', 'Target.Health',
    'Target.HealthPercent', 'Target.IsStunned', 'Target.Resource.DestructibleDefense'
].sort();

const MASTER_CONDITION_OPERATOR_LIST = [
    '!=', '<', '<=', '==', '>', '>=', 'DoesNotHaveEffect', 'DoesNotHaveProperty', 'HasEffect',
    'HasProperty', 'IsAlly', 'IsCaster', 'IsClass', 'IsEnemy', 'IsNotAlly', 'IsNotCaster',
    'IsNotClass', 'IsNotEnemy', 'IsNotTarget', 'IsTarget', 'IsTurnNumber_Even', 'IsTurnNumber_Odd',
    'LastSkillUsed', 'IsMultipleOf'
].sort();


const MASTER_TARGET_LIST = [
    'AllAllies', 'AllAllies_ExceptSelf', 'AllEnemies', 'Caster', 'Event.Caster', 'Event.Target',
    'RandomAlly', 'RandomEnemy', 'SelectedTarget', 'Self',
    'AllAlliesAndEnemies', 'AllyOrEnemy', 'AllyTeamOrEnemyTeam' 
].sort();

export function initEffectTab() {
    ui.loadEffectsBtn.addEventListener('click', loadAllEffects);
    ui.addNewEffectBtn.addEventListener('click', () => openEffectModal(null));
    ui.editEffectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveEffectChanges(ui.editEffectForm.dataset.effectDbId);
    });
    ui.editEffectCancelBtn.addEventListener('click', closeEffectModal);
    ui.addLogicBlockBtn.addEventListener('click', addLogicBlock);
}

// --- EFFECT LIST MANAGEMENT ---
export async function loadAllEffects() {
    try {
        const effects = await apiFetch('effects');
        masterEffectList.clear();
        effects.sort((a, b) => a.name.localeCompare(b.name));
        effects.forEach(effect => masterEffectList.set(effect.name, effect));
        renderEffectList(effects);
    } catch (err) {
        adminMessage.textContent = 'Failed to load effects list.';
    }
}
function renderEffectList(effects) {
    ui.effectList.innerHTML = '';
    ui.effectListHeader.classList.remove('hidden');
    
    effects.forEach(effect => {
        const card = document.createElement('div');
        card.className = 'effect-card'; 
        card.innerHTML = `
            <span>${effect.name}</span>
            <span class="item-desc">${effect.description || 'No description'}</span>
            <span class="num-col">${effect.logicBlocks.length}</span>
            <div class="effect-actions">
                <button class="edit-effect-btn">Edit</button>
                <button class="delete-effect-btn">Delete</button>
            </div>
        `;
        card.querySelector('.edit-effect-btn').addEventListener('click', () => openEffectModal(effect));
        card.querySelector('.delete-effect-btn').addEventListener('click', () => deleteEffect(effect));
        ui.effectList.appendChild(card);
    });
}
export function openEffectModal(effect) {
    const isNew = effect === null;
    tempEffect = isNew 
        ? { name: "", description: "", maxStacks: 1, isPermanent: false, isInvisible: false, logicBlocks: [] } 
        : JSON.parse(JSON.stringify(effect));
    
    ui.editEffectTitle.textContent = isNew ? "Create New Effect" : `Edit Effect: ${effect.name}`;
    ui.editEffectForm.dataset.effectDbId = isNew ? "" : effect._id;
    
    ui.effectNameInput.value = tempEffect.name;
    ui.effectDescInput.value = tempEffect.description;
    ui.effectMaxStacksInput.value = tempEffect.maxStacks;
    ui.effectIsPermanentInput.checked = tempEffect.isPermanent;
    ui.effectIsInvisibleInput.checked = tempEffect.isInvisible;
    
    ui.effectNameInput.disabled = !isNew; 
    
    renderLogicBlocks();
    openModal('edit-effect-modal');
}
function closeEffectModal() {
    closeModal('edit-effect-modal');
    tempEffect = {};
}
async function saveEffectChanges(effectDbId) {
    adminMessage.textContent = "Saving effect...";
    
    tempEffect.name = ui.effectNameInput.value;
    tempEffect.description = ui.effectDescInput.value;
    tempEffect.maxStacks = parseInt(ui.effectMaxStacksInput.value, 10) || 1;
    tempEffect.isPermanent = ui.effectIsPermanentInput.checked;
    tempEffect.isInvisible = ui.effectIsInvisibleInput.checked;
    
    try {
        let endpoint = 'effects';
        let method = 'POST';
        if (effectDbId) {
            endpoint = `effects/${effectDbId}`;
            method = 'PUT';
        }
        await apiFetch(endpoint, method, tempEffect);
        adminMessage.textContent = `Effect ${tempEffect.name} saved successfully!`;
        closeEffectModal();
        loadAllEffects();
    } catch (err) {
        adminMessage.textContent = err.message;
    }
}
async function deleteEffect(effect) {
    if (!window.confirm(`Are you sure you want to delete the effect "${effect.name}"? This could break characters that use it.`)) {
        return;
    }
    try {
        await apiFetch(`effects/${effect._id}`, 'DELETE');
        adminMessage.textContent = `Effect ${effect.name} deleted.`;
        loadAllEffects();
    } catch (err) {
        adminMessage.textContent = err.message;
    }
}

// --- LOGIC BLOCK MANAGEMENT ---
function renderLogicBlocks() {
    ui.logicBlocksContainer.innerHTML = '';
    if (!tempEffect.logicBlocks) {
        tempEffect.logicBlocks = [];
    }
    tempEffect.logicBlocks.forEach((block, index) => {
        const blockEl = document.createElement('div');
        blockEl.className = 'logic-block';
        blockEl.dataset.index = index;
        blockEl.innerHTML = `
            <div class="logic-block-header">
                <h4>Trigger: ${block.trigger}</h4>
                <button type="button" class="edit-logic-block-btn" data-index="${index}">Edit Trigger</button>
                <button type="button" class="delete-logic-block-btn" data-index="${index}">X</button>
            </div>
            <label>Conditions (ALL must be true)</label>
            <ul class="conditions-list" data-index="${index}">
                ${(block.conditions || []).map((cond, cIndex) => getConditionPillHTML(cond, cIndex)).join('')}
            </ul>
            <button type="button" class="add-condition-btn" data-index="${index}">Add Condition</button>
            <label>Actions (Run in order)</label>
            <ul class="actions-list" data-index="${index}">
                ${(block.actions || []).map((act, aIndex) => getActionPillHTML(act, aIndex)).join('')}
            </ul>
            <button type="button" class="add-action-btn" data-index="${index}">Add Action</button>
        `;
        ui.logicBlocksContainer.appendChild(blockEl);
    });
    
    // Add all listeners
    ui.logicBlocksContainer.querySelectorAll('.edit-logic-block-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            Object.assign(currentEdit, {
                logicBlockIndex: parseInt(e.target.dataset.index, 10),
                context: 'effect',
                type: 'trigger',
                conditionIndex: null,
                actionIndex: null,
                subConditionIndex: null
            });
            openLogicModal('trigger', tempEffect.logicBlocks[currentEdit.logicBlockIndex]);
        });
    });
    ui.logicBlocksContainer.querySelectorAll('.delete-logic-block-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index, 10);
            tempEffect.logicBlocks.splice(index, 1);
            renderLogicBlocks();
        });
    });
    ui.logicBlocksContainer.querySelectorAll('.add-condition-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            Object.assign(currentEdit, {
                logicBlockIndex: parseInt(e.target.dataset.index, 10),
                conditionIndex: -1,
                context: 'effect',
                type: 'condition',
                actionIndex: null,
                subConditionIndex: null
            });
            openLogicModal('condition', null);
        });
    });
    ui.logicBlocksContainer.querySelectorAll('.add-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            Object.assign(currentEdit, {
                logicBlockIndex: parseInt(e.target.dataset.index, 10),
                actionIndex: -1,
                context: 'effect',
                type: 'action',
                conditionIndex: null,
                subConditionIndex: null
            });
            openLogicModal('action', null);
        });
    });
    ui.logicBlocksContainer.querySelectorAll('.edit-condition-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pill = e.target.closest('.condition-pill');
            Object.assign(currentEdit, {
                logicBlockIndex: parseInt(pill.closest('.logic-block').dataset.index, 10),
                conditionIndex: parseInt(pill.dataset.index, 10),
                context: 'effect',
                type: 'condition',
                actionIndex: null,
                subConditionIndex: null
            });
            openLogicModal('condition', tempEffect.logicBlocks[currentEdit.logicBlockIndex].conditions[currentEdit.conditionIndex]);
        });
    });
    ui.logicBlocksContainer.querySelectorAll('.delete-condition-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pill = e.target.closest('.condition-pill');
            const blockIndex = parseInt(pill.closest('.logic-block').dataset.index, 10);
            const condIndex = parseInt(pill.dataset.index, 10);
            tempEffect.logicBlocks[blockIndex].conditions.splice(condIndex, 1);
            renderLogicBlocks();
        });
    });
    ui.logicBlocksContainer.querySelectorAll('.edit-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pill = e.target.closest('.action-pill');
            Object.assign(currentEdit, {
                logicBlockIndex: parseInt(pill.closest('.logic-block').dataset.index, 10),
                actionIndex: parseInt(pill.dataset.index, 10),
                context: 'effect',
                type: 'action',
                conditionIndex: null,
                subConditionIndex: null
            });
            openLogicModal('action', tempEffect.logicBlocks[currentEdit.logicBlockIndex].actions[currentEdit.actionIndex]);
        });
    });
    ui.logicBlocksContainer.querySelectorAll('.delete-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pill = e.target.closest('.action-pill');
            const blockIndex = parseInt(pill.closest('.logic-block').dataset.index, 10);
            const actIndex = parseInt(pill.dataset.index, 10);
            tempEffect.logicBlocks[blockIndex].actions.splice(actIndex, 1);
            renderLogicBlocks();
        });
    });
}
function addLogicBlock() {
    tempEffect.logicBlocks.push({
        trigger: 'OnGameStart',
        conditions: [],
        actions: []
    });
    renderLogicBlocks();
}

// --- DYNAMIC LOGIC MODAL ---
export function openLogicModal(type, data, context = 'effect') {
    currentEdit.type = type;
    currentEdit.context = context; 
    ui.editLogicModal.dataset.context = context;

    let title = 'Edit';
    let renderData; 

    if (type === 'action') {
        tempModalAction = data ? JSON.parse(JSON.stringify(data)) : { conditions: [] };
        renderData = tempModalAction;
        title = (currentEdit.actionIndex === -1 && currentEdit.context !== 'effect') ? 'Add Instant Action' : 'Edit Action';
    } else if (type === 'actionCondition') {
        renderData = (currentEdit.subConditionIndex === -1) ? null : tempModalAction.conditions[currentEdit.subConditionIndex];
        title = (currentEdit.subConditionIndex === -1) ? 'Add Action Condition' : 'Edit Action Condition';
    } else if (type === 'condition') {
        renderData = data;
        title = (currentEdit.conditionIndex === -1 && currentEdit.context === 'effect') ? 'Add Condition' : 'Edit Condition';
    } else if (type === 'trigger') {
        renderData = data;
        title = 'Edit Trigger';
    }

    ui.editLogicTitle.textContent = title;
    ui.editLogicFieldsContainer.innerHTML = getDynamicFieldHTML(type, renderData);
    
    // --- UPDATED: Handle dynamic visibility for Custom Condition ---
    if (type === 'condition' || type === 'actionCondition') {
        const condSelect = document.getElementById('logic-cond-field-select');
        const customInput = document.getElementById('logic-cond-field-custom');
        if (condSelect && customInput) {
            condSelect.addEventListener('change', () => {
                customInput.classList.toggle('hidden', condSelect.value !== 'CUSTOM');
            });
        }
    }
    
    function onActionTypeChange() {
        const actionTypeSelect = document.getElementById('logic-action-type');
        if (!actionTypeSelect) return; 

        const conditions = tempModalAction.conditions || [];
        const newActionType = actionTypeSelect.value;
        const defaultTarget = currentEdit.context === 'effect' ? 'Event.Target' : 'SelectedTarget';
        
        tempModalAction = { 
            type: newActionType, 
            target: defaultTarget, 
            conditions: conditions 
        }; 
        
        ui.editLogicFieldsContainer.innerHTML = getDynamicFieldHTML('action', tempModalAction);
        
        const newSelect = document.getElementById('logic-action-type');
        if (newSelect) {
            newSelect.addEventListener('change', onActionTypeChange);
        }
        const resourceSelect = document.getElementById('logic-action-resource-select');
        if (resourceSelect) {
            resourceSelect.addEventListener('change', () => {
                const customInput = document.getElementById('logic-action-resource-custom');
                if (customInput) {
                    customInput.classList.toggle('hidden', resourceSelect.value !== 'CUSTOM');
                }
            });
        }
        
        // Re-attach RemoveEffect listener if needed
        const removeModeSelect = document.getElementById('logic-action-remove-mode');
        if(removeModeSelect) {
            removeModeSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                document.getElementById('remove-effect-name-group').classList.toggle('hidden', val !== 'Name');
                document.getElementById('remove-effect-category-group').classList.toggle('hidden', val !== 'Category');
            });
        }
    }

    const actionTypeSelect = document.getElementById('logic-action-type');
    if (actionTypeSelect) {
        actionTypeSelect.addEventListener('change', onActionTypeChange);
    }

    const resourceSelect = document.getElementById('logic-action-resource-select');
    if (resourceSelect) {
        resourceSelect.addEventListener('change', () => {
            const customInput = document.getElementById('logic-action-resource-custom');
            if (customInput) {
                customInput.classList.toggle('hidden', resourceSelect.value !== 'CUSTOM');
            }
        });
    }
    
    // Add listener for RemoveEffect (initial load)
    const removeModeSelect = document.getElementById('logic-action-remove-mode');
    if(removeModeSelect) {
        removeModeSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            document.getElementById('remove-effect-name-group').classList.toggle('hidden', val !== 'Name');
            document.getElementById('remove-effect-category-group').classList.toggle('hidden', val !== 'Category');
        });
    }

    openModal('edit-logic-modal');
}

export function saveEffectLogicModal() {
    const { logicBlockIndex, conditionIndex, actionIndex, type, subConditionIndex } = currentEdit;

    if (currentEdit.context !== 'effect') return; 

    if (type === 'trigger') {
        tempEffect.logicBlocks[logicBlockIndex].trigger = saveDynamicFields('trigger');
    }
    else if (type === 'condition') {
        const newCondition = saveDynamicFields('condition');
        if (conditionIndex === -1) { 
            if (!tempEffect.logicBlocks[logicBlockIndex].conditions) {
                tempEffect.logicBlocks[logicBlockIndex].conditions = [];
            }
            tempEffect.logicBlocks[logicBlockIndex].conditions.push(newCondition);
        } else { 
            tempEffect.logicBlocks[logicBlockIndex].conditions[conditionIndex] = newCondition;
        }
    }
    else if (type === 'action') {
        const newAction = saveDynamicFields('action'); 
        if (actionIndex === -1) { 
            if (!tempEffect.logicBlocks[logicBlockIndex].actions) {
                tempEffect.logicBlocks[logicBlockIndex].actions = [];
            }
            tempEffect.logicBlocks[logicBlockIndex].actions.push(newAction);
        } else { 
            tempEffect.logicBlocks[logicBlockIndex].actions[actionIndex] = newAction;
        }
    }
    else if (type === 'actionCondition') {
        const newCondition = saveDynamicFields('condition');
        
        if (!tempModalAction.conditions) {
            tempModalAction.conditions = [];
        }
        
        if (subConditionIndex === -1) { 
            tempModalAction.conditions.push(newCondition);
        } else { 
            tempModalAction.conditions[subConditionIndex] = newCondition;
        }

        currentEdit.type = 'action'; 
        openLogicModal('action', tempModalAction, 'effect');
        return; 
    }
    
    renderLogicBlocks(); 
    closeModal('edit-logic-modal');
    
    resetEditState();
}

// --- PILL HTML HELPERS ---
export function getActionPillHTML(action, index) {
    if (!action || !action.type || !action.target) {
        return `<li class="action-pill" data-index="${index}"><span>[Corrupted Action]</span></li>`;
    }
    
    let conditionalTag = (action.conditions && action.conditions.length > 0) ? `<span class="pill-tag">CONDITIONAL</span>` : '';
    let desc = `${conditionalTag} <b>[${action.type}]</b> on <b>${action.target}</b>`;
    
    if (action.type === 'Damage') desc += `: ${action.amount} ${action.damageType} dmg`;
    if (action.type === 'DamageBasedOnStat') desc += `: ${action.baseAmount || 0} + ${action.scaleFactor || 1} x <b>${action.statToScale}</b>`;
    
    if (action.type === 'Heal' || action.type === 'StealHealth' || action.type === 'SetHealth' || action.type === 'ModifyMaxHealth') {
        desc += `: ${action.amount} HP`;
    }
    
    if (action.type === 'SwapHealth') desc += `: swap current HP`; 
    
    if (action.type === 'ApplyEffect') desc += `: apply "<b>${action.effectName}</b>" for ${action.duration} turns`;
    
    if (action.type === 'ModifyResource' || action.type === 'ConsumeResource' || action.type === 'SetResource') {
        desc += `: ${action.amount} <b>${action.resource}</b>`;
    }
    
    if (action.type === 'Stun') desc += `: ${action.stunType} stun`;
    if (action.type === 'SetProperty') desc += `: SET <b>${action.property}</b> = <b>${action.propertyValue}</b> for ${action.duration} turns`;
    if (action.type === 'ApplyDelayedEffect') desc += `: apply "<b>${action.effectName}</b>" after ${action.delayTurns} turns`;
    if (action.type === 'Execute') desc += `: if HP <= <b>${action.amount}</b>`;
    if (action.type === 'ExecuteBasedOnStat') desc += `: if HP <= ${action.baseAmount || 0} + ${action.scaleFactor || 1} x <b>${action.statToScale}</b>`;
    if (action.type === 'SwapSkill') desc += `: swap "<b>${action.skillToSwap}</b>" for "<b>${action.newSkill}</b>"`;
    if (action.type === 'RevertForm') desc += `: reverts all swapped skills`;
    if (action.type === 'ConvertProperty') desc += `: convert <b>${action.sourceProperty}</b> to <b>${action.targetProperty}</b>`;
    
    if (action.type === 'ModifySkillCost') desc += `: (Green: ${action.costChange?.green || 0}, Blue: ${action.costChange?.blue || 0}...)`;
    
    if (action.type === 'RemoveEffect') {
        if (action.removeBySourceClass) {
            desc += `: remove ALL <b>${action.removeBySourceClass}</b> effects`;
        } else {
            desc += `: remove "${action.effectName || 'Last Added'}" (${action.amount || 1})`;
        }
    }
    
    if (action.type === 'ExtendDuration') desc += `: extend "${action.effectName}" by ${action.duration} turns`;
    if (action.type === 'IncreaseCooldown') desc += `: increase by ${action.amount}`;
    if (action.type === 'InvertHealing' || action.type === 'InvertHelpfulHarmful') desc += `: for ${action.duration} turns`;
    if (action.type === 'UseSkill') desc += `: force use "${action.skillName}"`;
    if (action.type === 'IncreaseDamageDealt') desc += `: Increase ${action.damageCategory} dmg by ${action.amount} for ${action.duration} turns`;
    if (action.type === 'DecreaseDamageDealt') desc += `: Decrease ${action.damageCategory} dmg by ${action.amount} for ${action.duration} turns`;
    if (action.type === 'ModifySkillCooldown') desc += `: Modify "${action.targetSkill || 'Global'}" CD by ${action.amount}`;
    if (action.type === 'ModifySkillTargetType') desc += `: Change "${action.targetSkill || 'Global'}" target to ${action.newTargetType}`;
    
    if (action.type === 'ModifySkillMechanics') {
        const mechs = [];
        if (action.mechanics?.ignoreInvuln) mechs.push("Ignore Invuln");
        if (action.mechanics?.uncounterable) mechs.push("Uncounterable");
        const mode = action.mode === 'Remove' ? 'REMOVE' : 'SET';
        const skill = action.targetSkill || 'All Skills';
        desc += `: ${mode} [${mechs.join(', ')}] on "${skill}"`;
    }

    return `
        <li class="action-pill" data-index="${index}">
            <span>${desc}</span>
            <div class="pill-buttons">
                <button type="button" class="edit-item-btn edit-action-btn">Edit</button>
                <button type="button" class="delete-item-btn delete-action-btn">X</button>
            </div>
        </li>
    `;
}
export function getConditionPillHTML(condition, index) {
    if (!condition || !condition.field) {
        return `<li class="condition-pill" data-index="${index}"><span>[Corrupted Condition]</span></li>`;
    }
    let desc = `IF <b>${condition.field}</b> ${condition.operator} <b>${condition.value}</b>`;
    
    return `
        <li class="condition-pill" data-index="${index}">
            <span>${desc}</span>
            <div class="pill-buttons">
                <button type="button" class="edit-item-btn edit-condition-btn">Edit</button>
                <button type="button" class="delete-item-btn delete-condition-btn">X</button>
            </div>
        </li>
    `;
}

// --- DYNAMIC FORM HTML HELPERS ---
export function getDynamicFieldHTML(type, data) {
    if (type === 'trigger') {
        const options = MASTER_TRIGGER_LIST.map(t => `<option value="${t}" ${data.trigger === t ? 'selected' : ''}>${t}</option>`).join('');
        return `
            <label>Trigger Event</label>
            <select id="logic-trigger">${options}</select>
        `;
    }
    // --- UPDATED: Condition UI with Custom Field Support ---
    if (type === 'condition' || type === 'actionCondition') {
        const fieldOptions = MASTER_CONDITION_FIELD_LIST.map(f => `<option value="${f}" ${data?.field === f ? 'selected' : ''}>${f}</option>`).join('');
        const opOptions = MASTER_CONDITION_OPERATOR_LIST.map(o => `<option value="${o}" ${data?.operator === o ? 'selected' : ''}>${o}</option>`).join('');
        
        // Check if the current value is not in the master list (implies custom)
        const isCustom = data?.field && !MASTER_CONDITION_FIELD_LIST.includes(data.field);

        return `
            <label>Field</label>
            <select id="logic-cond-field-select">
                ${fieldOptions}
                <option value="CUSTOM" ${isCustom ? 'selected' : ''}>Custom...</option>
            </select>
            <input type="text" id="logic-cond-field-custom" 
                   class="${isCustom ? '' : 'hidden'}" 
                   value="${isCustom ? data.field : ''}" 
                   placeholder="e.g., Caster.EffectCount.Thunder_Charge" 
                   style="margin-top:5px;">

            <label>Operator</label>
            <select id="logic-cond-op">${opOptions}</select>
            <label>Value</label>
            <input type="text" id="logic-cond-value" value="${data?.value || ''}">
        `;
    }
    if (type === 'action') {
        const actionOptions = MASTER_ACTION_LIST.map(a => `<option value="${a}" ${data?.type === a ? 'selected' : ''}>${a}</option>`).join('');
        const targetOptions = MASTER_TARGET_LIST.map(t => `<option value="${t}" ${data?.target === t ? 'selected' : ''}>${t}</option>`).join('');
        
        let fields = `
            <div class="form-grid">
                <div>
                    <label>Action Type</label>
                    <select id="logic-action-type">${actionOptions}</select>
                </div>
                <div>
                    <label>Action Target</label>
                    <select id="logic-action-target">${targetOptions}</select>
                </div>
            </div>
        `;
        
        const actionType = data?.type || 'Damage'; 
        const find = (id) => document.getElementById(id);

        if (actionType === 'ModifySkillCost') {
            const cc = data?.costChange || {};
            fields += `
                <label>Target Skill (Optional - leave empty for global)</label>
                <input type="text" id="logic-action-target-skill" value="${data?.targetSkill || ''}" placeholder="e.g., Rasengan">
                
                <div class="effect-config-checkbox">
                     <input type="checkbox" id="logic-action-cost-random" ${cc.setRandom ? 'checked' : ''}>
                     <label for="logic-action-cost-random">Set cost to 1 Random?</label>
                </div>
                <label>Cost Modifiers (Negative reduces cost)</label>
                <div class="skill-cost-grid">
                    <label>Green <input type="number" id="logic-action-cost-green" value="${cc.green || 0}"></label>
                    <label>Blue <input type="number" id="logic-action-cost-blue" value="${cc.blue || 0}"></label>
                    <label>Red <input type="number" id="logic-action-cost-red" value="${cc.red || 0}"></label>
                    <label>White <input type="number" id="logic-action-cost-white" value="${cc.white || 0}"></label>
                    <label>Any <input type="number" id="logic-action-cost-any" value="${cc.any || 0}"></label>
                </div>
                <label>Duration (0.5 increments)</label>
                <input type="number" id="logic-action-duration" value="${data?.duration || 1}" step="0.5">
            `;
        }
        // --- UPDATED: Remove Effect Logic (Added Amount) ---
        else if (actionType === 'RemoveEffect') {
            const mode = data?.removeBySourceClass ? 'Category' : 'Name';
            fields += `
                <label>Removal Mode</label>
                <select id="logic-action-remove-mode">
                    <option value="Name" ${mode === 'Name' ? 'selected' : ''}>By Name</option>
                    <option value="Category" ${mode === 'Category' ? 'selected' : ''}>By Category (Harmful/Helpful)</option>
                </select>
                
                <div id="remove-effect-name-group" class="${mode === 'Name' ? '' : 'hidden'}">
                    <label>Effect Name (Exact Match)</label>
                    <input type="text" id="logic-action-effect-name" value="${data?.effectName || ''}" placeholder="e.g., Poison_Basic">
                    
                    <label>Amount (Stacks to Remove)</label>
                    <input type="number" id="logic-action-amount" value="${data?.amount || 1}">
                </div>
                
                <div id="remove-effect-category-group" class="${mode === 'Category' ? '' : 'hidden'}">
                    <label>Category relative to Target</label>
                    <select id="logic-action-remove-category">
                        <option value="Harmful" ${data?.removeBySourceClass === 'Harmful' ? 'selected' : ''}>Harmful (from Enemies)</option>
                        <option value="Helpful" ${data?.removeBySourceClass === 'Helpful' ? 'selected' : ''}>Helpful (from Allies)</option>
                    </select>
                </div>
            `;
        }
        else if (actionType === 'ExtendDuration') {
            fields += `
                <label>Effect Name (Exact Match)</label>
                <input type="text" id="logic-action-effect-name" value="${data?.effectName || ''}">
                <label>Turns to add</label>
                <input type="number" id="logic-action-duration" value="${data?.duration || 1}" step="0.5">
            `;
        }
        else if (actionType === 'IncreaseCooldown' || actionType === 'ModifySkillCooldown') {
             fields += `
                <label>Target Skill (Optional - Leave empty for Global)</label>
                <input type="text" id="logic-action-target-skill" value="${data?.targetSkill || ''}">
                <label>Amount (Turns)</label>
                <input type="number" id="logic-action-amount" value="${data?.amount || 1}">
             `;
        }
        else if (actionType === 'InvertHealing' || actionType === 'InvertHelpfulHarmful') {
            fields += `
                <label>Duration</label>
                <input type="number" id="logic-action-duration" value="${data?.duration || 1}" step="0.5">
            `;
        }
        else if (actionType === 'UseSkill') {
            fields += `
                <label>Skill Name to Force Use</label>
                <input type="text" id="logic-action-skill-name" value="${data?.skillName || ''}" placeholder="e.g., Rasengan">
            `;
        }
        else if (actionType === 'ModifySkillTargetType') {
            fields += `
                <label>Target Skill (Required)</label>
                <input type="text" id="logic-action-target-skill" value="${data?.targetSkill || ''}" placeholder="e.g., Kojaku Shot">
                
                <label>New Target Type</label>
                <select id="logic-action-new-target-type">
                    <option value="Enemy" ${data?.newTargetType === 'Enemy' ? 'selected' : ''}>Enemy</option>
                    <option value="Ally" ${data?.newTargetType === 'Ally' ? 'selected' : ''}>Ally</option>
                    <option value="Self" ${data?.newTargetType === 'Self' ? 'selected' : ''}>Self</option>
                    <option value="AllEnemies" ${data?.newTargetType === 'AllEnemies' ? 'selected' : ''}>All Enemies</option>
                    <option value="AllAllies" ${data?.newTargetType === 'AllAllies' ? 'selected' : ''}>All Allies</option>
                    <option value="AllAlliesAndEnemies" ${data?.newTargetType === 'AllAlliesAndEnemies' ? 'selected' : ''}>All Allies & Enemies</option>
                    <option value="AllyOrEnemy" ${data?.newTargetType === 'AllyOrEnemy' ? 'selected' : ''}>Ally Or Enemy</option>
                    <option value="AllyTeamOrEnemyTeam" ${data?.newTargetType === 'AllyTeamOrEnemyTeam' ? 'selected' : ''}>Ally Team Or Enemy Team</option>
                </select>
                
                <label>Duration (0.5 increments)</label>
                <input type="number" id="logic-action-duration" value="${data?.duration || 1}" step="0.5">
            `;
        }
        else if (actionType === 'IncreaseDamageDealt' || actionType === 'DecreaseDamageDealt') {
            const cat = data?.damageCategory || 'All';
            fields += `
                <label>Amount to Change</label>
                <input type="number" id="logic-action-amount" value="${data?.amount || 5}">
                
                <label>Damage Category</label>
                <select id="logic-action-damage-category">
                    <option value="All" ${cat === 'All' ? 'selected' : ''}>All</option>
                    <option value="Physical" ${cat === 'Physical' ? 'selected' : ''}>Physical Only</option>
                    <option value="Energy" ${cat === 'Energy' ? 'selected' : ''}>Energy Only</option>
                    <option value="Affliction" ${cat === 'Affliction' ? 'selected' : ''}>Affliction Only</option>
                    <option value="NonAffliction" ${cat === 'NonAffliction' ? 'selected' : ''}>Non-Affliction</option>
                </select>
                
                <label>Duration (0.5 increments)</label>
                <input type="number" id="logic-action-duration" value="${data?.duration || 1}" step="0.5">
            `;
        }
        else if (actionType === 'Damage') {
            fields += `
                <div class="form-grid">
                    <div>
                        <label>Amount</label>
                        <input type="number" id="logic-action-amount" value="${data?.amount || 10}">
                    </div>
                    <div>
                        <label>Damage Type</label>
                        <select id="logic-action-damage-type">
                            <option value="Physical" ${data?.damageType === 'Physical' ? 'selected' : ''}>Physical</option>
                            <option value="Energy" ${data?.damageType === 'Energy' ? 'selected' : ''}>Energy</option>
                            <option value="Affliction" ${data?.damageType === 'Affliction' ? 'selected' : ''}>Affliction</option>
                            <option value="Piercing" ${data?.damageType === 'Piercing' ? 'selected' : ''}>Piercing</option>
                        </select>
                    </div>
                </div>
            `;
        }
        else if (actionType === 'DamageBasedOnStat') {
            fields += `
                <div class="form-grid">
                    <div>
                        <label>Base Amount</label>
                        <input type="number" id="logic-action-base-amount" value="${data?.baseAmount || 0}">
                    </div>
                    <div>
                        <label>Scale Factor</label>
                        <input type="number" step="0.1" id="logic-action-scale-factor" value="${data?.scaleFactor || 1}">
                    </div>
                </div>
                <label>Stat to Scale</label>
                <input type="text" id="logic-action-stat-to-scale" value="${data?.statToScale || 'Caster.Resource_MyStack'}" placeholder="e.g., Caster.Resource_Stacks, Caster.MissingHealth">
                <label>Damage Type</label>
                <select id="logic-action-damage-type">
                    <option value="Physical" ${data?.damageType === 'Physical' ? 'selected' : ''}>Physical</option>
                    <option value="Energy" ${data?.damageType === 'Energy' ? 'selected' : ''}>Energy</option>
                    <option value="Affliction" ${data?.damageType === 'Affliction' ? 'selected' : ''}>Affliction</option>
                    <option value="Piercing" ${data?.damageType === 'Piercing' ? 'selected' : ''}>Piercing</option>
                </select>
            `;
        }
        else if (actionType === 'Execute') {
            fields += `
                <label>Execute if Target HP is <= Amount</label>
                <input type="number" id="logic-action-amount" value="${data?.amount || 10}">
            `;
        }
        else if (actionType === 'ExecuteBasedOnStat') {
            fields += `
                <div class="form-grid">
                    <div>
                        <label>Base Threshold</label>
                        <input type="number" id="logic-action-base-amount" value="${data?.baseAmount || 0}">
                    </div>
                    <div>
                        <label>Scale Factor</label>
                        <input type="number" step="0.1" id="logic-action-scale-factor" value="${data?.scaleFactor || 1}">
                    </div>
                </div>
                <label>Stat to Scale Threshold</label>
                <input type="text" id="logic-action-stat-to-scale" value="${data?.statToScale || 'Caster.Resource_MyStack'}" placeholder="e.g., Caster.Resource_Stacks">
            `;
        }
        else if (actionType === 'Heal' || actionType === 'StealHealth' || actionType === 'SetHealth' || actionType === 'ModifyMaxHealth') {
            fields += `
                <label>Amount</label>
                <input type="number" id="logic-action-amount" value="${data?.amount || 10}">
            `;
        }
        else if (actionType === 'ApplyEffect') {
            const effectOptions = Array.from(masterEffectList.keys())
                .sort()
                .map(name => `<option value="${name}" ${data?.effectName === name ? 'selected' : ''}>${name}</option>`)
                .join('');
            fields += `
                <label>Effect Name (from Effects tab)</label>
                <select id="logic-action-effect-name">${effectOptions}</select>
                <label>Duration (0.5 increments)</label>
                <input type="number" id="logic-action-duration" value="${data?.duration || 1}" step="0.5">
            `;
        }
        else if (actionType === 'ApplyDelayedEffect') {
            const effectOptions = Array.from(masterEffectList.keys())
                .sort()
                .map(name => `<option value="${name}" ${data?.effectName === name ? 'selected' : ''}>${name}</option>`)
                .join('');
            fields += `
                <label>Effect Name (from Effects tab)</label>
                <select id="logic-action-effect-name">${effectOptions}</select>
                <div class="form-grid">
                    <div>
                        <label>Duration (turns)</label>
                        <input type="number" id="logic-action-duration" value="${data?.duration || 1}" step="0.5">
                    </div>
                    <div>
                        <label>Delay (turns)</label>
                        <input type="number" id="logic-action-delay-turns" value="${data?.delayTurns || 1}">
                    </div>
                </div>
            `;
        }
        else if (actionType === 'ModifyResource' || actionType === 'ConsumeResource' || actionType === 'SetResource') {
            const resourceSelect = find('logic-action-resource-select')?.value;
            const resourceOptions = MASTER_RESOURCE_LIST
                .map(name => `<option value="${name}" ${data?.resource === name ? 'selected' : ''}>${name}</option>`)
                .join('');
            
            const isCustom = data?.resource && !MASTER_RESOURCE_LIST.includes(data.resource);
            
            fields += `
                <label>Resource Name</label>
                <select id="logic-action-resource-select">
                    ${resourceOptions}
                    <option value="CUSTOM" ${isCustom ? 'selected' : ''}>Custom...</option>
                </select>
                <input 
                    type="text" 
                    id="logic-action-resource-custom" 
                    class="${isCustom ? '' : 'hidden'}" 
                    value="${isCustom ? data.resource : ''}" 
                    placeholder="e.g., MyNewResource_Stack">
                
                <label>Amount (can be negative)</label>
                <input type="number" id="logic-action-amount" value="${data?.amount || 1}">
            `;
        }
        else if (actionType === 'Stun') {
             fields += `
                <label>Stun Type</label>
                <select id="logic-action-stun-type">
                    <option value="Full" ${data?.stunType === 'Full' ? 'selected' : ''}>Full</option>
                    <option value="Physical" ${data?.stunType === 'Physical' ? 'selected' : ''}>Physical</option>
                    <option value="Energy" ${data?.stunType === 'Energy' ? 'selected' : ''}>Energy</option>
                    <option value="Strategic" ${data?.stunType === 'Strategic' ? 'selected' : ''}>Strategic</option>
                    <option value="NonStrategic" ${data?.stunType === 'NonStrategic' ? 'selected' : ''}>NonStrategic</option>
                </select>
            `;
        }
        else if (actionType === 'SetProperty') {
            fields += `
                <label>Property Name</label>
                <input type="text" id="logic-action-property" value="${data?.property || 'Invulnerable'}" placeholder="e.g., Invulnerable, IgnoreStuns, BonusDamage">
                <div class="form-grid">
                    <div>
                        <label>Property Value (true, 10, etc.)</label>
                        <input type="text" id="logic-action-property-value" value="${data?.propertyValue !== undefined ? data.propertyValue : 'true'}">
                    </div>
                    <div>
                        <label>Duration (0.5 increments)</label>
                        <input type="number" id="logic-action-duration" value="${data?.duration || 1}" step="0.5">
                    </div>
                </div>
            `;
        }
        else if (actionType === 'SwapSkill') {
            fields += `
                <label>Skill Name to Swap</label>
                <input type="text" id="logic-action-skill-to-swap" value="${data?.skillToSwap || ''}" placeholder="e.g., Rasengan">
                <label>New Skill Name</label>
                <input type="text" id="logic-action-new-skill" value="${data?.newSkill || ''}" placeholder="e.g., Hidden_Rasengan">
            `;
        }
        else if (actionType === 'RevertForm' || actionType === 'SwapHealth') {
            // No fields needed
        }
        else if (actionType === 'ConvertProperty') {
            fields += `
                <label>Source Property Name</label>
                <input type="text" id="logic-action-source-property" value="${data?.sourceProperty || 'DestructibleDefense'}" placeholder="e.g., DestructibleDefense">
                <label>Target Property Name</label>
                <input type="text" id="logic-action-target-property" value="${data?.targetProperty || 'DamageReduction'}" placeholder="e.g., DamageReduction">
                <div class="form-grid">
                    <div>
                        <label>Conversion Factor</label>
                        <input type="number" step="0.1" id="logic-action-conversion-factor" value="${data?.conversionFactor || 1.0}">
                    </div>
                    <div>
                        <label>Duration (turns)</label>
                        <input type="number" id="logic-action-duration" value="${data?.duration || 1}" step="0.5">
                    </div>
                </div>
                <div class="effect-config-checkbox">
                    <input type="checkbox" id="logic-action-remove-source" ${data?.removeSource !== false ? 'checked' : ''}>
                    <label for="logic-action-remove-source">Remove Source Property after conversion?</label>
                </div>
            `;
        }
        else if (actionType === 'ModifySkillMechanics') {
            const mech = data?.mechanics || {};
            fields += `
                <label>Target Skill (Leave empty for ALL Skills)</label>
                <input type="text" id="logic-action-target-skill" value="${data?.targetSkill || ''}" placeholder="e.g., Meteor Smash">
                
                <label>Action Mode</label>
                <select id="logic-action-mode">
                    <option value="Set" ${data?.mode !== 'Remove' ? 'selected' : ''}>Set (Enable)</option>
                    <option value="Remove" ${data?.mode === 'Remove' ? 'selected' : ''}>Remove (Disable)</option>
                </select>

                <label>Mechanics to Modify</label>
                <div class="effect-config-checkbox">
                    <input type="checkbox" id="logic-action-mech-invuln" ${mech.ignoreInvuln ? 'checked' : ''}>
                    <label for="logic-action-mech-invuln">Ignore Invulnerability</label>
                </div>
                <div class="effect-config-checkbox">
                    <input type="checkbox" id="logic-action-mech-uncounter" ${mech.uncounterable ? 'checked' : ''}>
                    <label for="logic-action-mech-uncounter">Uncounterable & Unreflectable</label>
                </div>

                <label>Duration (0.5 increments)</label>
                <input type="number" id="logic-action-duration" value="${data?.duration || 1}" step="0.5">
            `;
        }
        
        fields += `
            <hr>
            <label>Action Conditions (ALL must be true for this action to run)</label>
            <ul class="conditions-list sub-list" id="action-conditions-list">
                ${(data?.conditions || []).map((cond, cIndex) => getConditionPillHTML(cond, cIndex)).join('')}
            </ul>
            <button type="button" class="add-btn add-action-condition-btn">Add Condition</button>
        `;
        
        setTimeout(() => {
            const list = document.getElementById('action-conditions-list');
            if (!list) return;

            document.querySelector('.add-action-condition-btn').addEventListener('click', () => {
                tempModalAction = saveDynamicFields('action');
                
                Object.assign(currentEdit, {
                    subConditionIndex: -1, 
                    type: 'actionCondition'
                });
                
                openLogicModal('actionCondition', null, currentEdit.context);
            });
            
            list.querySelectorAll('.edit-condition-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const pill = e.target.closest('.condition-pill');
                    const cIndex = parseInt(pill.dataset.index, 10);
                    
                    Object.assign(currentEdit, {
                        subConditionIndex: cIndex,
                        type: 'actionCondition'
                    });
                    
                    openLogicModal('actionCondition', tempModalAction.conditions[cIndex], currentEdit.context);
                });
            });
            list.querySelectorAll('.delete-condition-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const pill = e.target.closest('.condition-pill');
                    const cIndex = parseInt(pill.dataset.index, 10);
                    
                    tempModalAction = saveDynamicFields('action');
                    tempModalAction.conditions.splice(cIndex, 1);
                    currentEdit.type = 'action';
                    
                    openLogicModal('action', tempModalAction, currentEdit.context); 
                });
            });

        }, 0);
        
        return fields;
    }
    return ''; 
}

export function saveDynamicFields(type) {
    if (type === 'trigger') {
        const el = document.getElementById('logic-trigger');
        return el ? el.value : null;
    }
    
    // --- UPDATED: Save Logic for Condition (Custom support) ---
    if (type === 'condition' || type === 'actionCondition') { 
        const selectEl = document.getElementById('logic-cond-field-select');
        const customEl = document.getElementById('logic-cond-field-custom');
        
        let fieldVal = selectEl ? selectEl.value : null;
        if (fieldVal === 'CUSTOM') fieldVal = customEl.value; // Use custom input

        const opEl = document.getElementById('logic-cond-op');
        const valEl = document.getElementById('logic-cond-value');
        return {
            field: fieldVal,
            operator: opEl ? opEl.value : null,
            value: valEl ? valEl.value : null,
        };
    }
    
    if (type === 'action') {
        const find = (id) => document.getElementById(id);

        const typeEl = find('logic-action-type');
        const targetEl = find('logic-action-target');
        
        const actionType = typeEl ? typeEl.value : null;
        const target = targetEl ? targetEl.value : null;
        
        const action = {
            type: actionType,
            target: target,
            conditions: [] 
        };
        
        const conditionList = document.getElementById('action-conditions-list');
        if (conditionList) {
            conditionList.querySelectorAll('.condition-pill').forEach(pill => {
                const span = pill.querySelector('span');
                if (!span) return;

                const text = span.innerText;
                const parts = text.replace('IF ', '').replace(/<b>/g, '').replace(/<\/b>/g, '').split(' ');
                
                if (parts.length >= 3) { 
                    action.conditions.push({
                        field: parts[0],
                        operator: parts[1],
                        value: parts.slice(2).join(' ')
                    });
                } else if (parts.length === 2) { 
                     action.conditions.push({
                        field: parts[0],
                        operator: parts[1],
                        value: ""
                    });
                }
            });
        }
        
        if (actionType === 'ModifySkillCost') {
            action.targetSkill = find('logic-action-target-skill')?.value;
            action.costChange = {
                setRandom: find('logic-action-cost-random')?.checked || false,
                green: parseInt(find('logic-action-cost-green')?.value, 10) || 0,
                blue: parseInt(find('logic-action-cost-blue')?.value, 10) || 0,
                red: parseInt(find('logic-action-cost-red')?.value, 10) || 0,
                white: parseInt(find('logic-action-cost-white')?.value, 10) || 0,
                any: parseInt(find('logic-action-cost-any')?.value, 10) || 0
            };
            action.duration = parseFloat(find('logic-action-duration')?.value) || 1; 
        }
        // --- UPDATED: Save Logic for RemoveEffect (Amount support) ---
        else if (actionType === 'RemoveEffect') {
            const mode = find('logic-action-remove-mode')?.value;
            if (mode === 'Category') {
                action.removeBySourceClass = find('logic-action-remove-category')?.value;
            } else {
                action.effectName = find('logic-action-effect-name')?.value;
                // Save Amount
                action.amount = parseInt(find('logic-action-amount')?.value, 10) || 1;
            }
        }
        else if (actionType === 'ExtendDuration') {
            action.effectName = find('logic-action-effect-name')?.value;
            action.duration = parseFloat(find('logic-action-duration')?.value) || 1; 
        }
        else if (actionType === 'IncreaseCooldown' || actionType === 'ModifySkillCooldown') {
            action.amount = parseInt(find('logic-action-amount')?.value, 10) || 1;
            action.targetSkill = find('logic-action-target-skill')?.value;
        }
        else if (actionType === 'InvertHealing' || actionType === 'InvertHelpfulHarmful') {
            action.duration = parseFloat(find('logic-action-duration')?.value) || 1; 
        }
        else if (actionType === 'UseSkill') {
            action.skillName = find('logic-action-skill-name')?.value;
        }
        else if (actionType === 'IncreaseDamageDealt' || actionType === 'DecreaseDamageDealt') {
            action.amount = parseInt(find('logic-action-amount')?.value, 10) || 5;
            action.damageCategory = find('logic-action-damage-category')?.value || 'All';
            action.duration = parseFloat(find('logic-action-duration')?.value) || 1;
        }
        else if (actionType === 'Damage') {
            action.amount = parseInt(find('logic-action-amount')?.value, 10) || 0;
            action.damageType = find('logic-action-damage-type')?.value;
        }
        else if (actionType === 'DamageBasedOnStat') {
            action.baseAmount = parseInt(find('logic-action-base-amount')?.value, 10) || 0;
            action.scaleFactor = parseFloat(find('logic-action-scale-factor')?.value) || 1.0;
            action.statToScale = find('logic-action-stat-to-scale')?.value;
            action.damageType = find('logic-action-damage-type')?.value;
        }
        else if (actionType === 'Execute') {
            action.amount = parseInt(find('logic-action-amount')?.value, 10) || 0;
        }
        else if (actionType === 'ExecuteBasedOnStat') {
            action.baseAmount = parseInt(find('logic-action-base-amount')?.value, 10) || 0;
            action.scaleFactor = parseFloat(find('logic-action-scale-factor')?.value) || 1.0;
            action.statToScale = find('logic-action-stat-to-scale')?.value;
            action.statToScale = find('logic-action-stat-to-scale')?.value;
        }
        else if (actionType === 'Heal' || actionType === 'StealHealth' || actionType === 'SetHealth' || actionType === 'ModifyMaxHealth') {
            action.amount = parseInt(find('logic-action-amount')?.value, 10) || 0;
        }
        else if (actionType === 'ApplyEffect') {
            action.effectName = find('logic-action-effect-name')?.value;
            action.duration = parseFloat(find('logic-action-duration')?.value) || 1; 
        }
        else if (actionType === 'ApplyDelayedEffect') {
            action.effectName = find('logic-action-effect-name')?.value;
            action.duration = parseFloat(find('logic-action-duration')?.value) || 1; 
            action.delayTurns = parseInt(find('logic-action-delay-turns')?.value, 10) || 1;
        }
        else if (actionType === 'ModifyResource' || actionType === 'ConsumeResource' || actionType === 'SetResource') {
            const resourceSelect = find('logic-action-resource-select')?.value;
            if (resourceSelect === 'CUSTOM') {
                action.resource = find('logic-action-resource-custom')?.value;
            } else {
                action.resource = resourceSelect;
            }
            action.amount = parseInt(find('logic-action-amount')?.value, 10) || 1;
        }
        else if (actionType === 'Stun') {
            action.stunType = find('logic-action-stun-type')?.value;
        }
        else if (actionType === 'SetProperty') {
            action.property = find('logic-action-property')?.value;
            const val = find('logic-action-property-value')?.value;
            if (val && val.toLowerCase() === 'true') action.propertyValue = true;
            else if (val && val.toLowerCase() === 'false') action.propertyValue = false;
            else action.propertyValue = isNaN(parseFloat(val)) ? val : parseFloat(val);
            action.duration = parseFloat(find('logic-action-duration')?.value) || 1; 
        }
        else if (actionType === 'SwapSkill') {
            action.skillToSwap = find('logic-action-skill-to-swap')?.value;
            action.newSkill = find('logic-action-new-skill')?.value;
        }
        else if (actionType === 'ConvertProperty') {
            action.sourceProperty = find('logic-action-source-property')?.value;
            action.targetProperty = find('logic-action-target-property')?.value;
            action.conversionFactor = parseFloat(find('logic-action-conversion-factor')?.value) || 1.0;
            action.duration = parseFloat(find('logic-action-duration')?.value) || 1; 
            action.removeSource = find('logic-action-remove-source')?.checked || false;
        }
        else if (actionType === 'ModifySkillTargetType') {
            action.targetSkill = find('logic-action-target-skill')?.value;
            action.newTargetType = find('logic-action-new-target-type')?.value;
            action.duration = parseFloat(find('logic-action-duration')?.value) || 1;
        }
        else if (actionType === 'ModifySkillMechanics') {
            action.targetSkill = find('logic-action-target-skill')?.value;
            action.mode = find('logic-action-mode')?.value;
            action.mechanics = {
                ignoreInvuln: find('logic-action-mech-invuln')?.checked || false,
                uncounterable: find('logic-action-mech-uncounter')?.checked || false
            };
            action.duration = parseFloat(find('logic-action-duration')?.value) || 1;
        }
        
        console.log("Final saved action object:", JSON.parse(JSON.stringify(action))); 
        return action;
    }
}
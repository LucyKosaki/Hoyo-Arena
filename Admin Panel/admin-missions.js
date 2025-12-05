// admin-missions.js
import { 
    apiFetch, adminMessage, ui, openModal, closeModal, masterCharacterList 
} from './admin.js';

let tempMission = {};
let draggedMission = null; 

export function initMissionTab() {
    // Attach Listeners
    if (ui.loadMissionsBtn) ui.loadMissionsBtn.addEventListener('click', loadMissions);
    if (ui.addNewMissionBtn) ui.addNewMissionBtn.addEventListener('click', () => openMissionModal(null));
    
    const saveOrderBtn = document.getElementById('save-mission-order-btn');
    if (saveOrderBtn) saveOrderBtn.addEventListener('click', saveMissionOrder);
    
    if (ui.editMissionForm) {
        ui.editMissionForm.addEventListener('submit', (e) => { 
            e.preventDefault();
            saveMissionChanges(ui.editMissionForm.dataset.missionDbId);
        });
    }
    
    if (ui.editMissionCancelBtn) ui.editMissionCancelBtn.addEventListener('click', closeMissionModal);
    if (ui.addGoalBtn) ui.addGoalBtn.addEventListener('click', addMissionGoal);
    if (ui.addRewardBtn) ui.addRewardBtn.addEventListener('click', addMissionReward);
}

// --- MISSION MANAGEMENT ---
export async function loadMissions() {
    try {
        const missions = await apiFetch('missions');
        missions.sort((a, b) => (a.order || 0) - (b.order || 0));
        renderMissionList(missions);
    } catch (err) {
        adminMessage.textContent = "Failed to load missions.";
    }
}

function renderMissionList(missions) {
    ui.missionList.innerHTML = '';
    ui.missionListHeader.classList.remove('hidden');
    
    missions.forEach(mission => {
        const card = document.createElement('div');
        card.className = 'mission-card';
        card.draggable = true; 
        card.dataset.id = mission._id; 
        
        const goalDesc = mission.goals.map(g => {
            let desc = `${g.type} (${g.amount})`;
            if (g.requiredCharacters && g.requiredCharacters.length) {
                desc += ` [${g.requiredCharacters.join(g.logic === 'AND' ? '&' : '|')}]`;
            }
            return desc;
        }).join(', ') || 'No goals';
        
        const rewardDesc = mission.rewards.map(r => `${r.type} (${r.amount || r.characterId})`).join(', ') || 'No rewards';
        
        let reqText = "";
        if (mission.requirements) {
            if(mission.requirements.minElo) reqText += `Elo > ${mission.requirements.minElo} `;
            // --- UPDATED: Display list of prev missions ---
            if(mission.requirements.previousMissionIds && mission.requirements.previousMissionIds.length) {
                reqText += `Prev: [${mission.requirements.previousMissionIds.join(', ')}]`;
            }
        }

        card.innerHTML = `
            <div class="drag-handle">☰</div>
            <div>
                <span class="mission-name">${mission.name}</span> <small>(${mission.category || 'Others'})</small>
                <div style="font-size: 0.8em; color: #f0e68c;">${reqText}</div>
            </div>
            <span class="mission-desc" title="${goalDesc}">${goalDesc}</span>
            <span class="mission-desc">${rewardDesc}</span>
            <div class="mission-actions">
                <button class="edit-mission-btn">Edit</button>
                <button class="delete-mission-btn">Delete</button>
            </div>
        `;
        
        card.querySelector('.edit-mission-btn').addEventListener('click', () => openMissionModal(mission));
        card.querySelector('.delete-mission-btn').addEventListener('click', () => deleteMission(mission));
        
        card.addEventListener('dragstart', (e) => {
            draggedMission = card;
            e.dataTransfer.effectAllowed = 'move';
            card.classList.add('dragging');
        });
        card.addEventListener('dragend', () => {
            draggedMission = null;
            card.classList.remove('dragging');
        });
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const list = ui.missionList;
            const afterElement = getDragAfterElement(list, e.clientY);
            if (afterElement == null) {
                list.appendChild(draggedMission);
            } else {
                list.insertBefore(draggedMission, afterElement);
            }
        });
        
        ui.missionList.appendChild(card);
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.mission-card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

async function saveMissionOrder() {
    adminMessage.textContent = "Saving order...";
    const cards = document.querySelectorAll('.mission-card');
    const updates = [];
    cards.forEach((card, index) => {
        updates.push({ id: card.dataset.id, order: index });
    });
    try {
        const promises = updates.map(u => apiFetch(`missions/${u.id}`, 'PUT', { order: u.order }));
        await Promise.all(promises);
        adminMessage.textContent = "Order saved successfully!";
    } catch (err) {
        adminMessage.textContent = "Error saving order.";
    }
}


function openMissionModal(mission = null) {
    const isNew = mission === null;
    // Use previousMissionIds (Array) or fallback to old previousMissionId (String) for migration
    let prevIds = [];
    if (mission && mission.requirements) {
        if (mission.requirements.previousMissionIds && mission.requirements.previousMissionIds.length > 0) {
            prevIds = mission.requirements.previousMissionIds;
        } else if (mission.requirements.previousMissionId) {
            prevIds = [mission.requirements.previousMissionId];
        }
    }

    tempMission = isNew ? { 
        name: "", missionId: "", description: "", picture: "", 
        goals: [], rewards: [], category: "Others",
        requirements: { minElo: 0, previousMissionIds: [] }
    } : JSON.parse(JSON.stringify(mission));
    
    // If we had a legacy mission object without the new array structure, patch it in memory
    if (!tempMission.requirements) tempMission.requirements = { minElo: 0, previousMissionIds: [] };
    if (!tempMission.requirements.previousMissionIds) tempMission.requirements.previousMissionIds = prevIds;

    ui.editMissionTitle.textContent = isNew ? "Create New Mission" : "Edit Mission";
    ui.missionIdInput.value = tempMission.missionId || "";
    ui.missionNameInput.value = tempMission.name || "";
    ui.missionDescInput.value = tempMission.description || "";
    ui.missionPicInput.value = tempMission.picture || "";
    
    const catSelect = document.getElementById('mission-category');
    if(catSelect) catSelect.value = tempMission.category || "Others";

    ui.missionIdInput.disabled = !isNew; 
    ui.editMissionForm.dataset.missionDbId = isNew ? "" : mission._id;
    
    // --- UPDATED: Set Requirement Values ---
    if (ui.missionReqEloInput) ui.missionReqEloInput.value = tempMission.requirements.minElo || 0;
    // Join array to string for input
    if (ui.missionReqPrevInput) ui.missionReqPrevInput.value = (tempMission.requirements.previousMissionIds || []).join(', ');
    
    renderMissionGoals();
    renderMissionRewards();
    openModal('edit-mission-modal');
}

function closeMissionModal() {
    closeModal('edit-mission-modal');
    tempMission = {};
}

function renderMissionGoals() {
    ui.missionGoalsList.innerHTML = '';
    
    const allCats = new Set();
    masterCharacterList.forEach(c => {
        if(c.categories) c.categories.forEach(cat => allCats.add(cat));
    });
    const catOptions = Array.from(allCats).sort().map(c => `<option value="${c}">`).join('');
    
    let dl = document.getElementById('mission-cat-options');
    if(!dl) {
        const div = document.createElement('div');
        div.innerHTML = `<datalist id="mission-cat-options">${catOptions}</datalist>`;
        document.body.appendChild(div.firstChild);
    } else {
        dl.innerHTML = catOptions; 
    }

    tempMission.goals.forEach((goal, index) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        
        const charStr = (goal.requiredCharacters || []).join(', ');
        const catStr = (goal.requiredCategories || []).join(', ');
        const logic = goal.logic || 'OR';

        item.innerHTML = `
            <div class="list-item-header">
                <h4>Goal ${index + 1}</h4>
                <button type="button" class="delete-item-btn" data-index="${index}">X</button>
            </div>
            
            <div style="margin-bottom:10px;">
                <label style="font-size:0.8em; color:#aaa;">Display Text</label>
                <input type="text" class="goal-desc" value="${goal.description || ''}" placeholder="e.g. Win with Naruto or Sasuke">
            </div>

            <div class="list-item-grid">
                <div style="grid-column: span 2;">
                    <label style="font-size:0.8em; color:#aaa;">Type & Amount</label>
                    <div style="display:flex; gap:10px;">
                        <select class="goal-type" style="flex:1;">
                            <option value="WIN_GAMES" ${goal.type === 'WIN_GAMES' ? 'selected' : ''}>Win Games</option>
                            <option value="WIN_STREAK" ${goal.type === 'WIN_STREAK' ? 'selected' : ''}>Win Streak</option>
                        </select>
                        <input type="number" class="goal-amount" value="${goal.amount || 1}" placeholder="Amount" style="width:80px;">
                    </div>
                </div>
                
                <div>
                    <label style="font-size:0.8em; color:#aaa;">Character IDs (Comma sep.)</label>
                    <input type="text" class="goal-char-ids" value="${charStr}" placeholder="e.g. naruto, sasuke">
                </div>
                <div>
                    <label style="font-size:0.8em; color:#aaa;">Categories (Comma sep.)</label>
                    <input type="text" class="goal-categories" list="mission-cat-options" value="${catStr}" placeholder="e.g. Akatsuki, Captain">
                </div>
                
                <div style="grid-column: span 2;">
                    <label style="font-size:0.8em; color:#aaa;">Requirement Logic</label>
                    <select class="goal-logic">
                        <option value="OR" ${logic === 'OR' ? 'selected' : ''}>Match ANY (OR) - Team needs at least 1 match</option>
                        <option value="AND" ${logic === 'AND' ? 'selected' : ''}>Match ALL (AND) - Team needs ALL specified chars/cats</option>
                    </select>
                </div>
            </div>
        `;
        
        item.querySelector('.delete-item-btn').addEventListener('click', () => {
            tempMission.goals.splice(index, 1);
            renderMissionGoals();
        });
        
        item.querySelector('.goal-desc').addEventListener('input', (e) => goal.description = e.target.value);
        item.querySelector('.goal-type').addEventListener('change', (e) => goal.type = e.target.value);
        item.querySelector('.goal-amount').addEventListener('input', (e) => goal.amount = parseInt(e.target.value) || 0);
        item.querySelector('.goal-logic').addEventListener('change', (e) => goal.logic = e.target.value);
        
        item.querySelector('.goal-char-ids').addEventListener('blur', (e) => {
            goal.requiredCharacters = e.target.value.split(',').map(s => s.trim()).filter(s => s);
        });
        item.querySelector('.goal-categories').addEventListener('blur', (e) => {
            goal.requiredCategories = e.target.value.split(',').map(s => s.trim()).filter(s => s);
        });

        ui.missionGoalsList.appendChild(item);
    });
}

function addMissionGoal() {
    tempMission.goals.push({ 
        type: 'WIN_GAMES', 
        amount: 1, 
        description: "New Goal",
        requiredCharacters: [],
        requiredCategories: [],
        logic: 'OR'
    });
    renderMissionGoals();
}

function renderMissionRewards() {
    ui.missionRewardsList.innerHTML = '';
    tempMission.rewards.forEach((reward, index) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-header">
                <h4>Reward ${index + 1}</h4>
                <button type="button" class="delete-item-btn" data-index="${index}">X</button>
            </div>
            <div class="list-item-grid">
                <select class="reward-type" data-index="${index}">
                    <option value="hoyo" ${reward.type === 'hoyo' ? 'selected' : ''}>Hoyo</option>
                    <option value="primogems" ${reward.type === 'primogems' ? 'selected' : ''}>Primogems</option>
                    <option value="character" ${reward.type === 'character' ? 'selected' : ''}>Character</option>
                </select>
                <div class="reward-value-field"></div>
            </div>
        `;
        
        item.querySelector('.delete-item-btn').addEventListener('click', () => {
            tempMission.rewards.splice(index, 1);
            renderMissionRewards();
        });
        
        const typeSelect = item.querySelector('.reward-type');
        typeSelect.addEventListener('change', (e) => {
            const newType = e.target.value;
            reward.type = newType;
            if (newType === 'character') {
                delete reward.amount;
            } else {
                delete reward.characterId;
            }
            renderMissionRewards();
        });
        
        const valueField = item.querySelector('.reward-value-field');
        if (reward.type === 'character') {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'reward-char-id';
            input.value = reward.characterId || '';
            input.placeholder = "Character ID";
            input.addEventListener('input', (e) => { reward.characterId = e.target.value; });
            valueField.appendChild(input);
        } else {
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'reward-amount';
            input.value = reward.amount || 0;
            input.placeholder = "Amount";
            input.addEventListener('input', (e) => { reward.amount = parseInt(e.target.value, 10) || 0; });
            valueField.appendChild(input);
        }
        
        ui.missionRewardsList.appendChild(item);
    });
}

function addMissionReward() {
    tempMission.rewards.push({ type: 'hoyo', amount: 100 });
    renderMissionRewards();
}

async function saveMissionChanges(missionDbId) {
    adminMessage.textContent = "Saving mission...";
    tempMission.missionId = ui.missionIdInput.value;
    tempMission.name = ui.missionNameInput.value;
    tempMission.description = ui.missionDescInput.value;
    tempMission.picture = ui.missionPicInput.value;
    
    const catSelect = document.getElementById('mission-category');
    tempMission.category = catSelect ? catSelect.value : "Others";

    // --- UPDATED: Read Static Requirements and split comma-separated IDs ---
    tempMission.requirements = {
        minElo: ui.missionReqEloInput ? parseInt(ui.missionReqEloInput.value) || 0 : 0,
        previousMissionIds: ui.missionReqPrevInput ? ui.missionReqPrevInput.value.split(',').map(s => s.trim()).filter(s => s) : []
    };

    try {
        let endpoint = 'missions';
        let method = 'POST';
        if (missionDbId) {
            endpoint = `missions/${missionDbId}`;
            method = 'PUT';
        }
        await apiFetch(endpoint, method, tempMission);
        adminMessage.textContent = `Mission ${tempMission.name} saved successfully!`;
        closeMissionModal();
        loadMissions();
    } catch (err) {
        adminMessage.textContent = err.message;
    }
}

async function deleteMission(mission) {
    if (!window.confirm(`Are you sure you want to delete the mission "${mission.name}"?`)) {
        return;
    }
    try {
        await apiFetch(`missions/${mission._id}`, 'DELETE');
        adminMessage.textContent = `Mission ${mission.name} deleted.`;
        loadMissions();
    } catch (err) {
        adminMessage.textContent = err.message;
    }
}
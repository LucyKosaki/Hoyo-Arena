import { ui } from './ui.js';

// --- State ---
let socket = null;
let expandedMissionIds = JSON.parse(localStorage.getItem('sa_expanded_missions') || '[]');

// --- Initialization ---
export function initMissions(socketInstance) {
    socket = socketInstance;
}

// --- Render Logic ---
export function renderMissions(lobbyData) {
    ui.missionNotificationDot.classList.add('hidden'); // Reset dot
    
    const container = document.getElementById('mission-list');
    if (!container) return;
    container.innerHTML = '';
    
    // Filters (grabbed directly from DOM to avoid circular dependencies if UI isn't fully ready)
    const catFilterEl = document.getElementById('mission-filter-category');
    const hideCompletedEl = document.getElementById('filter-hide-completed');
    const showLockedEl = document.getElementById('filter-show-locked');

    const catFilter = catFilterEl ? catFilterEl.value : 'ALL';
    const hideCompleted = hideCompletedEl ? hideCompletedEl.checked : false;
    const showLocked = showLockedEl ? showLockedEl.checked : true;

    let claimableCount = 0;

    lobbyData.missions.forEach(mission => {
        // 1. Filter Category
        if (catFilter !== 'ALL' && mission.category !== catFilter) return;

        // 2. Check Progress
        let userMission = lobbyData.userMissions.find(m => m.missionId === mission.missionId);
        const isCompleted = userMission && userMission.isCompleted;
        const isClaimed = userMission && userMission.isClaimed;
        
        if (hideCompleted && isClaimed) return;

        // 3. Check Locked Status
        let isLocked = false;
        if (mission.requirements) {
            if (mission.requirements.minElo > 0 && lobbyData.elo < mission.requirements.minElo) isLocked = true;
            
            if (mission.requirements.previousMissionIds && mission.requirements.previousMissionIds.length > 0) {
                const allPrevsMet = mission.requirements.previousMissionIds.every(prevId => {
                    const prev = lobbyData.userMissions.find(m => m.missionId === prevId);
                    return prev && prev.isCompleted;
                });
                if (!allPrevsMet) isLocked = true;
            }
            // Fallback for legacy single ID
            else if (mission.requirements.previousMissionId) {
                const prev = lobbyData.userMissions.find(m => m.missionId === mission.requirements.previousMissionId);
                if (!prev || !prev.isCompleted) isLocked = true;
            }
        }
        
        if (!showLocked && isLocked) return;

        if (isCompleted && !isClaimed) {
            claimableCount++;
        }

        // 4. Build Card
        const card = document.createElement('div');
        card.className = `mission-card ${isLocked ? 'locked' : ''} ${expandedMissionIds.includes(mission.missionId) ? 'expanded' : ''}`;
        
        // Status Text
        let statusHtml = '';
        if (isLocked) statusHtml = '<span class="mission-status-text status-locked">Locked</span>';
        else if (isClaimed) statusHtml = '<span class="mission-status-text status-completed">Complete</span>';
        else if (isCompleted) statusHtml = '<button class="mission-claim-btn">Claim</button>';
        else statusHtml = '<span class="mission-status-text status-active">Active</span>';

        // Summary Progress
        let goalsCompleted = 0;
        mission.goals.forEach((g, i) => {
            const key = `goal_${i}`;
            const progress = userMission && userMission.progress ? (userMission.progress[key] || 0) : 0;
            if (progress >= g.amount) goalsCompleted++;
        });
        const summaryText = `${goalsCompleted}/${mission.goals.length} Goals`;

        // Requirements Text
        let reqHtml = '';
        if (isLocked) {
            const reqList = [];
            if (mission.requirements.minElo > 0) reqList.push(`${mission.requirements.minElo} ELO`);
            
            if (mission.requirements.previousMissionIds && mission.requirements.previousMissionIds.length > 0) {
                const names = mission.requirements.previousMissionIds.map(pid => {
                    const pm = lobbyData.missions.find(m => m.missionId === pid);
                    return pm ? pm.name : pid;
                });
                reqList.push(`Complete: ${names.join(', ')}`);
            }
            if (reqList.length > 0) {
                reqHtml = `<div style="color: #e67e22; font-size: 0.9em; margin-bottom: 10px; font-weight: bold;">Requires: ${reqList.join(' | ')}</div>`;
            }
        }

        card.innerHTML = `
            <div class="mission-header">
                <div class="mission-icon"></div>
                <div class="mission-info-summary">
                    <h4>${mission.name}</h4>
                    <div class="mission-progress-text">${summaryText}</div>
                </div>
                <div class="mission-actions-right">
                    ${statusHtml}
                </div>
                <div class="mission-expand-btn">
                    <i class="fa-solid fa-chevron-down"></i>
                </div>
            </div>
            <div class="mission-expanded-content">
                <p class="mission-description">${mission.description}</p>
                ${reqHtml}
                <div class="mission-goals-container"></div>
            </div>
        `;
        
        if (isCompleted && !isClaimed) {
            card.querySelector('.mission-claim-btn').addEventListener('click', (e) => {
                e.stopPropagation(); 
                claimMission(mission.missionId, lobbyData.userMissions, (updatedData) => {
                    // Simple callback to update local data ref if needed, 
                    // though usually we wait for server response to re-render whole lobby
                    Object.assign(lobbyData, updatedData);
                    renderMissions(lobbyData); // Re-render self
                });
            });
        }
        
        card.querySelector('.mission-expand-btn').addEventListener('click', () => {
            toggleMissionExpand(card, mission.missionId);
        });
        
        // Render Goals
        const goalsContainer = card.querySelector('.mission-goals-container');
        mission.goals.forEach((goal, index) => {
            const key = `goal_${index}`;
            const current = userMission && userMission.progress ? (userMission.progress[key] || 0) : 0;
            const max = goal.amount;
            const percent = Math.min(100, (current / max) * 100);
            
            let goalText = goal.description;
            if (!goalText) {
                goalText = `${goal.type === 'WIN_GAMES' ? 'Win' : 'Streak'} ${max}`;
                if (goal.requiredCharacters && goal.requiredCharacters.length) goalText += ` w/ ${goal.requiredCharacters[0]}..`;
            }

            goalsContainer.innerHTML += `
                <div class="mission-goal-row">
                    <div class="goal-desc-line">
                        <span class="goal-desc-text">${goalText}</span>
                        <span class="goal-progress-nums">${current}/${max}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-bar-inner" style="width: ${percent}%"></div>
                    </div>
                </div>
            `;
        });
        
        container.appendChild(card);
    });
    
    if (claimableCount > 0) {
        ui.missionNotificationDot.classList.remove('hidden');
    }
}

function toggleMissionExpand(card, missionId) {
    const isExpanded = card.classList.contains('expanded');
    
    if (isExpanded) {
        card.classList.remove('expanded');
        expandedMissionIds = expandedMissionIds.filter(id => id !== missionId);
    } else {
        card.classList.add('expanded');
        if (!expandedMissionIds.includes(missionId)) {
            expandedMissionIds.push(missionId);
        }
    }
    localStorage.setItem('sa_expanded_missions', JSON.stringify(expandedMissionIds));
}

async function claimMission(missionId, userMissionsList, successCallback) {
    try {
        const token = socket.io.opts.query.token;
        const res = await fetch('http://localhost:5000/api/missions/claim', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ missionId })
        });
        const data = await res.json();
        if (res.ok) {
            alert("Rewards claimed!");
            // Update the specific mission in the list to avoid full page reload requirement
            const um = userMissionsList.find(m => m.missionId === missionId);
            if(um) um.isClaimed = true;
            
            successCallback(data); // Pass back updated user stats
        } else {
            alert(data.msg);
        }
    } catch (err) {
        console.error(err);
    }
}
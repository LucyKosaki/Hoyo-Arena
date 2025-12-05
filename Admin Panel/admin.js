// --- UPDATED: Import new Effect tab logic ---
import { initCharacterTab, loadAllCharacters, openCharacterModal, saveCharacterLogicModal } from './admin-characters.js'; 
import { initEffectTab, loadAllEffects, openEffectModal, saveEffectLogicModal } from './admin-effects.js';
// --- NEW: Import News tab logic ---
import { initNews } from './admin-news.js';
// --- NEW: Import Mission tab logic ---
import { initMissionTab, loadMissions } from './admin-missions.js';

// --- STATE ---
let token = null;
export let masterCharacterList = new Map(); 
export let masterEffectList = new Map(); 
export let globalGameStats = []; 
export const MASTER_RESOURCE_LIST = [
    'DestructibleDefense', 'Energy_Random', 'Draw_Stacks', 'Rage_Points', 'Quincy_Energy', 
    'Kinshara_Mark', 'Loaded_Stack', 'Fulfill_Stack'
].sort();

// Temp state for other tabs (Shop/Gacha still in this file for now)
let tempShopItem = {}; 
let tempGachaBanner = {}; 
let currentSort = { key: 'totalUses', order: 'desc' }; 
let currentEditingRarityPool = null; 

// --- DOM ELEMENT REFERENCES ---
let loginContainer, adminPanel, adminLoginForm, logoutBtn, 
    loadUsersBtn, userList, userListHeader, 
    editUserModal, editUserTitle, editUserForm, editEloInput, editCharGrid, editCancelBtn;

export let adminMessage;

let tabButtons, tabContents;
let loadStatsBtn, statsTableContainer;

// Shop Elements
let loadShopItemsBtn, addNewShopItemBtn, shopItemList, shopItemListHeader,
    editShopItemModal, editShopItemTitle, editShopItemForm, editShopItemCancelBtn,
    shopItemIdInput, shopItemNameInput, shopItemDescInput, shopItemIconInput,
    shopItemTypeSelect, shopItemTypeField, shopItemCurrencySelect, shopItemCostInput;

// Gacha Elements
let loadBannersBtn, addNewBannerBtn, bannerList, bannerListHeader,
    editGachaModal, editGachaTitle, editGachaForm, editGachaCancelBtn,
    gachaBannerIdInput, gachaBannerNameInput, gachaBannerCurrencySelect, gachaBannerCostInput,
    gachaRarityPoolsContainer, gachaBannerRulesInput, 
    gachaGoldPityApplies, gachaGoldPityLimit, gachaPurplePityApplies, gachaPurplePityLimit;
    
// Add Pool Item Modal
let addPoolItemModal, addPoolItemForm, addPoolItemTitle, poolItemTypeSelect,
    poolItemFieldsContainer, addPoolItemCancelBtn;
    
let loadEffectsBtn, addNewEffectBtn;
let editHoyoInput, editPrimoInput;

// Export the main UI object (for child modules)
export const ui = {};

// --- Wrap all logic in DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. INITIALIZE ALL DOM ELEMENTS ---
    loginContainer = document.getElementById('login-container');
    adminPanel = document.getElementById('admin-panel');
    adminLoginForm = document.getElementById('admin-login-form');
    adminMessage = document.getElementById('admin-message');
    logoutBtn = document.getElementById('logout-btn');
    loadUsersBtn = document.getElementById('load-users-btn');
    userList = document.getElementById('user-list');
    userListHeader = document.getElementById('user-list-header');
    
    // Character Tab
    ui.addCharForm = document.getElementById('add-char-form');
    ui.loadCharactersBtn = document.getElementById('load-characters-btn'); 
    ui.charList = document.getElementById('char-list');
    ui.charListHeader = document.getElementById('char-list-header');
    ui.editCharDesc = document.getElementById('edit-char-desc');
    ui.editCharModal = document.getElementById('edit-char-modal');
    ui.editCharTitle = document.getElementById('edit-char-title');
    ui.editCharNameInput = document.getElementById('edit-char-name');
    ui.charIdValue = document.getElementById('char-id-value');
    ui.skillFormsContainer = document.getElementById('skill-forms-container');
    ui.editCharCancelBtn = document.getElementById('edit-char-cancel-btn');
    ui.editCharDetailsForm = document.getElementById('edit-char-details-form');
    ui.editCharPassives = document.getElementById('edit-char-passives'); 
    ui.skillTargetType = document.getElementById('skill-target-type');

    // Effect Tab
    ui.loadEffectsBtn = document.getElementById('load-effects-btn');
    ui.addNewEffectBtn = document.getElementById('add-new-effect-btn');
    ui.effectList = document.getElementById('effect-list');
    ui.effectListHeader = document.getElementById('effect-list-header');
    ui.editEffectModal = document.getElementById('edit-effect-modal');
    ui.editEffectTitle = document.getElementById('edit-effect-title');
    ui.editEffectForm = document.getElementById('edit-effect-form');
    ui.editEffectCancelBtn = document.getElementById('edit-effect-cancel-btn');
    ui.effectNameInput = document.getElementById('effect-name');
    ui.effectDescInput = document.getElementById('effect-desc');
    ui.effectMaxStacksInput = document.getElementById('effect-max-stacks');
    ui.effectIsPermanentInput = document.getElementById('effect-is-permanent');
    ui.effectIsInvisibleInput = document.getElementById('effect-is-invisible');
    ui.logicBlocksContainer = document.getElementById('logic-blocks-container');
    ui.addLogicBlockBtn = document.getElementById('add-logic-block-btn');
    
    // Logic Modal
    ui.editLogicModal = document.getElementById('edit-logic-modal');
    ui.editLogicTitle = document.getElementById('edit-logic-title');
    ui.editLogicForm = document.getElementById('edit-logic-form');
    ui.editLogicFieldsContainer = document.getElementById('edit-logic-fields-container');
    ui.editLogicCancelBtn = document.getElementById('edit-logic-cancel-btn');

    // --- NEW: Mission Tab UI Elements ---
    ui.loadMissionsBtn = document.getElementById('load-missions-btn');
    ui.addNewMissionBtn = document.getElementById('add-new-mission-btn');
    ui.missionList = document.getElementById('mission-list');
    ui.missionListHeader = document.getElementById('mission-list-header');
    ui.editMissionModal = document.getElementById('edit-mission-modal');
    ui.editMissionTitle = document.getElementById('edit-mission-title');
    ui.editMissionForm = document.getElementById('edit-mission-form');
    ui.editMissionCancelBtn = document.getElementById('edit-mission-cancel-btn');
    ui.missionIdInput = document.getElementById('mission-id');
    ui.missionNameInput = document.getElementById('mission-name');
    ui.missionDescInput = document.getElementById('mission-desc');
    ui.missionPicInput = document.getElementById('mission-pic');
    // --- UPDATED: New Bound Elements for Requirements ---
    ui.missionReqEloInput = document.getElementById('mission-req-elo-input');
    ui.missionReqPrevInput = document.getElementById('mission-req-prev-input');
    // ---
    ui.missionGoalsList = document.getElementById('mission-goals-list');
    ui.addGoalBtn = document.getElementById('add-goal-btn');
    ui.missionRewardsList = document.getElementById('mission-rewards-list');
    ui.addRewardBtn = document.getElementById('add-reward-btn');
    // ---

    // Modals
    editUserModal = document.getElementById('edit-user-modal');
    editUserTitle = document.getElementById('edit-user-title');
    editUserForm = document.getElementById('edit-user-form');
    editEloInput = document.getElementById('edit-elo');
    editCharGrid = document.getElementById('edit-char-grid');
    editCancelBtn = document.getElementById('edit-cancel-btn');
    editHoyoInput = document.getElementById('edit-hoyo');
    editPrimoInput = document.getElementById('edit-primogems');

    // Tabs
    tabButtons = document.querySelectorAll('.tab-btn');
    tabContents = document.querySelectorAll('.tab-content');
    
    // Stats
    loadStatsBtn = document.getElementById('load-stats-btn');
    statsTableContainer = document.getElementById('stats-table-container');

    // Shop
    loadShopItemsBtn = document.getElementById('load-shop-items-btn');
    addNewShopItemBtn = document.getElementById('add-new-shop-item-btn');
    shopItemList = document.getElementById('shop-item-list');
    shopItemListHeader = document.getElementById('shop-item-list-header');
    editShopItemModal = document.getElementById('edit-shop-item-modal');
    editShopItemTitle = document.getElementById('edit-shop-item-title');
    editShopItemForm = document.getElementById('edit-shop-item-form');
    editShopItemCancelBtn = document.getElementById('edit-shop-item-cancel-btn');
    shopItemIdInput = document.getElementById('shop-item-id');
    shopItemNameInput = document.getElementById('shop-item-name');
    shopItemDescInput = document.getElementById('shop-item-desc');
    shopItemIconInput = document.getElementById('shop-item-icon');
    shopItemTypeSelect = document.getElementById('shop-item-type');
    shopItemTypeField = document.getElementById('shop-item-type-field');
    shopItemCurrencySelect = document.getElementById('shop-item-currency');
    shopItemCostInput = document.getElementById('shop-item-cost');
    
    // Gacha
    loadBannersBtn = document.getElementById('load-banners-btn');
    addNewBannerBtn = document.getElementById('add-new-banner-btn');
    bannerList = document.getElementById('banner-list');
    bannerListHeader = document.getElementById('banner-list-header');
    editGachaModal = document.getElementById('edit-gacha-modal');
    editGachaTitle = document.getElementById('edit-gacha-title');
    editGachaForm = document.getElementById('edit-gacha-form');
    editGachaCancelBtn = document.getElementById('edit-gacha-cancel-btn');
    gachaBannerIdInput = document.getElementById('gacha-banner-id');
    gachaBannerNameInput = document.getElementById('gacha-banner-name');
    gachaBannerCurrencySelect = document.getElementById('gacha-banner-currency');
    gachaBannerCostInput = document.getElementById('gacha-banner-cost');
    gachaRarityPoolsContainer = document.getElementById('gacha-rarity-pools');
    gachaBannerRulesInput = document.getElementById('gacha-banner-rules'); 
    gachaGoldPityApplies = document.getElementById('gacha-gold-pity-applies');
    gachaGoldPityLimit = document.getElementById('gacha-gold-pity-limit');
    gachaPurplePityApplies = document.getElementById('gacha-purple-pity-applies');
    gachaPurplePityLimit = document.getElementById('gacha-purple-pity-limit');
    
    // Add Pool Item Modal
    addPoolItemModal = document.getElementById('add-pool-item-modal');
    addPoolItemForm = document.getElementById('add-pool-item-form');
    addPoolItemTitle = document.getElementById('add-pool-item-title');
    poolItemTypeSelect = document.getElementById('pool-item-type');
    poolItemFieldsContainer = document.getElementById('pool-item-fields-container');
    addPoolItemCancelBtn = document.getElementById('add-pool-item-cancel-btn');

    // --- 2. EVENT LISTENERS ---
    initListeners();
    
    // Initial check for existing token on page load
    checkAdminAuth();
}); 


// --- API FUNCTIONS ---
export const API_URL = 'http://localhost:5000';

export async function apiFetch(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json',
        'x-auth-token': token
    };
    const config = { method, headers };
    if (body) {
        config.body = JSON.stringify(body);
    }
    const res = await fetch(`${API_URL}/api/admin/${endpoint}`, config);
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.msg || `Error on ${method} ${endpoint}`);
    }
    return data;
}

// --- INITIALIZATION AND AUTH ---

async function login(username, password) {
    try {
        const res = await fetch(`${API_URL}/api/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.msg || 'Login failed');
        
        token = data.token;
        localStorage.setItem('admin-token', token);
        await checkAdminAuth();
    } catch (err) {
        adminMessage.textContent = err.message;
    }
}

async function checkAdminAuth() {
    if (!token) {
        token = localStorage.getItem('admin-token');
        if (!token) {
            showLogin(); 
            return; 
        }
    }
    try {
        await apiFetch('auth');
        showApp(); 
    } catch (err) {
        logout();
        adminMessage.textContent = 'Session expired or not authorized.';
    }
}

function showLogin() {
    loginContainer.classList.remove('hidden');
    adminPanel.classList.add('hidden');
}

async function showApp() {
    loginContainer.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    
    // Pre-load data for all tabs
    await loadAllCharacters();
    await loadAllEffects(); 
    await loadStats();
    await loadMissions(); 
    await loadShopItems();
    await loadGachaBanners(); 
    
    // --- Initialize Sub-Modules ---
    initCharacterTab();
    initEffectTab();
    initNews();
    initMissionTab(); // --- NEW
}

function initListeners() {
    // Auth listeners
    adminLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;
        login(username, password);
    });
    
    // Tab Listeners
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            tabContents.forEach(content => {
                content.id === `${tabId}-page` ? content.classList.remove('hidden') : content.classList.add('hidden');
            });
        });
    });
    
    // Admin Panel Actions
    loadUsersBtn.addEventListener('click', loadUsers);
    loadStatsBtn.addEventListener('click', loadStats);
    // Mission listeners moved to admin-missions.js
    loadShopItemsBtn.addEventListener('click', loadShopItems); 
    addNewShopItemBtn.addEventListener('click', () => openShopItemModal(null)); 
    loadBannersBtn.addEventListener('click', loadGachaBanners); 
    addNewBannerBtn.addEventListener('click', () => openGachaModal(null)); 
    logoutBtn.addEventListener('click', logout);
    
    ui.loadEffectsBtn.addEventListener('click', loadAllEffects);
    ui.addNewEffectBtn.addEventListener('click', () => openEffectModal(null)); 
    
    // Modal Listeners
    editCancelBtn.addEventListener('click', closeUserModal);
    // editMissionCancelBtn listener moved
    editShopItemCancelBtn.addEventListener('click', closeShopItemModal); 
    editGachaCancelBtn.addEventListener('click', closeGachaModal); 
    addPoolItemCancelBtn.addEventListener('click', closeAddPoolItemModal); 
    
    // Dynamic Modal Listeners
    // addGoal/Reward listeners moved
    shopItemTypeSelect.addEventListener('change', renderShopItemFields); 
    addPoolItemForm.addEventListener('submit', onAddPoolItemSubmit); 
    poolItemTypeSelect.addEventListener('change', renderPoolItemFields); 

    // Save Listeners (attach to forms)
    editUserForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveUserChanges(editUserForm.dataset.userId);
    });
    // Mission form listener moved
    editShopItemForm.addEventListener('submit', (e) => { 
        e.preventDefault();
        saveShopItemChanges(editShopItemForm.dataset.itemDbId);
    });
    editGachaForm.addEventListener('submit', (e) => { 
        e.preventDefault();
        saveGachaBannerChanges(editGachaForm.dataset.bannerDbId);
    });
    
    // --- NEW: Central listener for the dynamic logic modal ---
    ui.editLogicForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Read context from the currently open modal's state
        // (This state is set in admin-characters.js or admin-effects.js)
        const context = ui.editLogicModal.dataset.context; 
        if (context === 'character') {
            saveCharacterLogicModal();
        } else if (context === 'effect') {
            saveEffectLogicModal();
        }
    });
    ui.editLogicCancelBtn.addEventListener('click', () => closeModal('edit-logic-modal'));
}

function logout() {
    token = null;
    localStorage.removeItem('admin-token');
    showLogin();
    adminMessage.textContent = "You have been logged out.";
}

export function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}
export function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// --- USER MANAGEMENT ---
async function loadUsers() {
    try {
        const users = await apiFetch('users');
        userList.innerHTML = ''; 
        userListHeader.classList.remove('hidden');
        users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-card';
            if (user.isAdmin) {
                card.classList.add('admin');
            }
            const date = new Date(user.registerDate).toLocaleDateString('en-US');
            card.innerHTML = `
                <span class="user-name">${user.username}</span>
                <span class="user-date">${date}</span>
                <span>${user.elo}</span>
                <button class="edit-user-btn">Edit</button>
            `;
            card.querySelector('.edit-user-btn').addEventListener('click', () => openUserModal(user));
            userList.appendChild(card);
        });
    } catch (err) {
        adminMessage.textContent = 'Failed to load users.';
    }
}
function openUserModal(user) {
    editUserForm.dataset.userId = user._id;
    editUserTitle.textContent = `Edit User: ${user.username}`;
    editEloInput.value = user.elo;
    editHoyoInput.value = user.hoyo || 0;
    editPrimoInput.value = user.primogems || 0;
    
    editCharGrid.innerHTML = '';
    Array.from(masterCharacterList.values()).forEach(char => {
        const isUnlocked = user.unlockedCharacters.includes(char.id);
        const label = document.createElement('label');
        label.className = 'char-checkbox';
        label.innerHTML = `
            <input type="checkbox" value="${char.id}" ${isUnlocked ? 'checked' : ''}>
            ${char.name}
        `;
        editCharGrid.appendChild(label);
    });
    editUserModal.classList.remove('hidden');
}
function closeUserModal() {
    editUserModal.classList.add('hidden');
}
async function saveUserChanges(userId) {
    adminMessage.textContent = "Saving...";
    const newElo = parseInt(editEloInput.value, 10);
    const newHoyo = parseInt(editHoyoInput.value, 10);
    const newPrimogems = parseInt(editPrimoInput.value, 10);
    
    const newUnlockedChars = [];
    editCharGrid.querySelectorAll('input:checked').forEach(input => {
        newUnlockedChars.push(input.value);
    });
    
    try {
        await apiFetch(`users/${userId}`, 'PUT', {
            elo: newElo,
            hoyo: newHoyo,
            primogems: newPrimogems,
            unlockedCharacters: newUnlockedChars
        });
        adminMessage.textContent = 'User updated successfully!';
        closeUserModal();
        loadUsers(); 
    } catch (err) {
        adminMessage.textContent = err.message;
    }
}

// --- *** NEW: DELETE CHARACTER FUNCTION *** ---
async function deleteCharacter(char) {
    if (!window.confirm(`Are you sure you want to delete "${char.name} (${char.id})"? This is permanent and cannot be undone.`)) {
        return;
    }
    
    try {
        adminMessage.textContent = "Deleting character...";
        await apiFetch(`characters/${char.id}`, 'DELETE');
        adminMessage.textContent = `Character ${char.name} deleted successfully.`;
        // Refresh both the character list and the stats to remove them
        await loadAllCharacters();
        await loadStats();
    } catch (err) {
        adminMessage.textContent = `Error deleting character: ${err.message}`;
    }
}
// --- *** END OF NEW FUNCTION *** ---

// --- STATS PAGE LOGIC ---
async function loadStats() {
    try {
        const stats = await apiFetch('stats');
        globalGameStats = stats; 
        renderStatsTable(stats);
        if (masterCharacterList.size > 0) {
            renderCharacterList(Array.from(masterCharacterList.values()));
        }
    } catch (err) {
        adminMessage.textContent = "Failed to load stats.";
    }
}
function renderStatsTable(stats) {
    stats.sort((a, b) => {
        let valA = a[currentSort.key];
        let valB = b[currentSort.key];
        if (typeof valA === 'string') {
            return (valA || "").localeCompare(valB || "") * (currentSort.order === 'asc' ? 1 : -1);
        }
        return (valA - valB) * (currentSort.order === 'asc' ? 1 : -1);
    });
    
    statsTableContainer.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'stats-table';
    const headers = [
        { key: 'name', label: 'Character' },
        { key: 'totalUses', label: 'Total Uses' },
        { key: 'totalWinRate', label: 'Total Win %' },
        { key: 'rankedUses', label: 'Ranked Uses' },
        { key: 'rankedWinRate', label: 'Ranked Win %' },
        { key: 'unrankedUses', label: 'Unranked Uses' },
        { key: 'unrankedWinRate', label: 'Unranked Win %' },
    ];
    let thead = '<thead><tr>';
    headers.forEach(h => {
        let sortClass = '';
        let arrow = '';
        if (h.key === currentSort.key) {
            sortClass = currentSort.order === 'asc' ? 'sorted-asc' : 'sorted-desc';
            arrow = currentSort.order === 'asc' ? '▲' : '▼';
        }
        thead += `<th data-key="${h.key}" class="${sortClass}">${h.label} <span class="sort-arrow">${arrow}</span></th>`;
    });
    thead += '</tr></thead>';
    table.innerHTML = thead;
    const tbody = document.createElement('tbody');
    stats.forEach(s => {
        tbody.innerHTML += `
            <tr>
                <td>${s.name}</td>
                <td class="num-col">${s.totalUses}</td>
                <td class="num-col">${(s.totalWinRate * 100).toFixed(0)}%</td>
                <td class="num-col">${s.rankedUses}</td>
                <td class="num-col">${(s.rankedWinRate * 100).toFixed(0)}%</td>
                <td class="num-col">${s.unrankedUses}</td>
                <td class="num-col">${(s.unrankedWinRate * 100).toFixed(0)}%</td>
            </tr>
        `;
    });
    table.appendChild(tbody);
    statsTableContainer.appendChild(table);
    table.querySelectorAll('th').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.key;
            if (!key) return;
            if (currentSort.key === key) {
                currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.key = key;
                currentSort.order = 'desc';
            }
            renderStatsTable(stats); 
        });
    });
}
// --- UPDATED: This function is now exported ---
export function renderCharacterList(characters) {
    ui.charList.innerHTML = '';
    ui.charListHeader.classList.remove('hidden');
    characters.sort((a,b) => a.name.localeCompare(b.name));
    
    characters.forEach(char => {
        const card = document.createElement('div');
        card.className = 'char-display-card';
        const stats = globalGameStats.find(s => s.id === char.id) || {};
        const uses = stats.totalUses || 0;
        const winRate = (stats.totalWinRate || 0);
        
        // --- *** UPDATED: Added delete button *** ---
        card.innerHTML = `
            <span>${char.name} (${char.id})</span>
            <span>${uses} uses (${(winRate * 100).toFixed(0)}%)</span>
            <div class="char-actions">
                <button class="edit-char-btn">Edit</button>
                <button class="delete-char-btn delete-item-btn">Delete</button>
            </div>
        `;
        // --- *** END OF UPDATE *** ---
        
        // --- FIX: Call the imported openCharacterModal function ---
        card.querySelector('.edit-char-btn').addEventListener('click', () => openCharacterModal(char));
        
        // --- *** NEW: Add listener for delete button *** ---
        card.querySelector('.delete-char-btn').addEventListener('click', () => deleteCharacter(char));
        // --- *** END OF NEW LISTENER *** ---
        
        ui.charList.appendChild(card);
    });
}


// --- SHOP MANAGEMENT ---
async function loadShopItems() {
    try {
        const items = await apiFetch('shop-items');
        renderShopItemList(items);
    } catch (err) {
        adminMessage.textContent = "Failed to load shop items.";
    }
}
function renderShopItemList(items) {
    shopItemList.innerHTML = '';
    shopItemListHeader.classList.remove('hidden');
    
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'shop-item-card';
        
        card.innerHTML = `
            <span>${item.name} (${item.itemId})</span>
            <span class="item-desc">${item.type}</span>
            <span class="item-desc">${item.cost} ${item.currency}</span>
            <div class="shop-item-actions">
                <button class="edit-item-btn">Edit</button>
                <button class="delete-item-btn">Delete</button>
            </div>
        `;
        
        card.querySelector('.edit-item-btn').addEventListener('click', () => openShopItemModal(item));
        card.querySelector('.delete-item-btn').addEventListener('click', () => deleteShopItem(item));
        shopItemList.appendChild(card);
    });
}
function openShopItemModal(item = null) {
    const isNew = item === null;
    tempShopItem = isNew ? { name: "", itemId: "", description: "", icon_url: "", type: "character", cost: 100, currency: "hoyo" } : JSON.parse(JSON.stringify(item));
    
    editShopItemTitle.textContent = isNew ? "Create New Shop Item" : "Edit Shop Item";
    shopItemIdInput.value = tempShopItem.itemId || "";
    shopItemNameInput.value = tempShopItem.name || "";
    shopItemDescInput.value = tempShopItem.description || "";
    shopItemIconInput.value = tempShopItem.icon_url || "";
    shopItemTypeSelect.value = tempShopItem.type;
    shopItemCurrencySelect.value = tempShopItem.currency;
    shopItemCostInput.value = tempShopItem.cost || 0;
    
    shopItemIdInput.disabled = !isNew; 
    editShopItemForm.dataset.itemDbId = isNew ? "" : item._id;

    renderShopItemFields();
    editShopItemModal.classList.remove('hidden');
}
function closeShopItemModal() {
    editShopItemModal.classList.add('hidden');
    tempShopItem = {};
}
function renderShopItemFields() {
    const type = shopItemTypeSelect.value;
    shopItemTypeField.innerHTML = '';
    
    if (type === 'character') {
        shopItemTypeField.innerHTML = `
            <label for="shop-char-id">Character ID</label>
            <input type="text" id="shop-char-id" value="${tempShopItem.characterId || ''}" placeholder="e.g., 'gaara'">
        `;
    }
}
async function saveShopItemChanges(itemDbId) {
    adminMessage.textContent = "Saving item...";
    
    const type = shopItemTypeSelect.value;
    const updatedItem = {
        itemId: shopItemIdInput.value,
        name: shopItemNameInput.value,
        description: shopItemDescInput.value,
        icon_url: shopItemIconInput.value,
        type: type,
        currency: shopItemCurrencySelect.value,
        cost: parseInt(shopItemCostInput.value, 10) || 0
    };

    if (type === 'character') {
        updatedItem.characterId = document.getElementById('shop-char-id').value;
    }
    
    try {
        let endpoint = 'shop-items';
        let method = 'POST';
        
        if (itemDbId) {
            endpoint = `shop-items/${itemDbId}`;
            method = 'PUT';
        }

        await apiFetch(endpoint, method, updatedItem);
        
        adminMessage.textContent = `Shop item ${updatedItem.name} saved successfully!`;
        closeShopItemModal();
        loadShopItems();
    } catch (err) {
        adminMessage.textContent = err.message;
    }
}
async function deleteShopItem(item) {
    if (!window.confirm(`Are you sure you want to delete the item "${item.name}"?`)) {
        return;
    }
    
    try {
        await apiFetch(`shop-items/${item._id}`, 'DELETE');
        adminMessage.textContent = `Item ${item.name} deleted.`;
        loadShopItems();
    } catch (err) {
        adminMessage.textContent = err.message;
    }
}

// --- GACHA MANAGEMENT ---
async function loadGachaBanners() {
    try {
        const banners = await apiFetch('gacha-banners');
        renderBannerList(banners);
    } catch (err) {
        adminMessage.textContent = "Failed to load banners.";
    }
}
function renderBannerList(banners) {
    bannerList.innerHTML = '';
    bannerListHeader.classList.remove('hidden');

    banners.forEach(banner => {
        const card = document.createElement('div');
        card.className = 'banner-card';
        
        const rates = banner.rarities.map(r => `${r.rarity} (${r.rate*100}%)`).join(', ');
        let pityInfo = 'No Pity';
        if (banner.pity?.gold.applies || banner.pity?.purple.applies) {
            let parts = [];
            if(banner.pity.gold.applies) parts.push(`G-${banner.pity.gold.limit}`);
            if(banner.pity.purple.applies) parts.push(`P-${banner.pity.purple.limit}`);
            pityInfo = `Pity: ${parts.join(' / ')}`;
        }

        card.innerHTML = `
            <span>${banner.name} (${banner.bannerId})</span>
            <span class="banner-desc">${banner.cost} ${banner.currency}</span>
            <span class="banner-desc" title="${rates}">${pityInfo}</span>
            <div class="banner-actions">
                <button class="edit-banner-btn">Edit</button>
                <button class="delete-banner-btn">Delete</button>
            </div>
        `;
        
        card.querySelector('.edit-banner-btn').addEventListener('click', () => openGachaModal(banner));
        card.querySelector('.delete-banner-btn').addEventListener('click', () => deleteGachaBanner(banner));
        bannerList.appendChild(card);
    });
}
function openGachaModal(banner = null) {
    const isNew = banner === null;
    const defaultPity = { gold: { applies: false, limit: 90 }, purple: { applies: false, limit: 10 } };
    tempGachaBanner = isNew ? { name: "", bannerId: "", cost: 1, currency: "primogems", rarities: [], rules: "", pity: defaultPity } : JSON.parse(JSON.stringify(banner));
    
    if (!tempGachaBanner.pity) tempGachaBanner.pity = defaultPity;
    if (!tempGachaBanner.pity.gold) tempGachaBanner.pity.gold = defaultPity.gold;
    if (!tempGachaBanner.pity.purple) tempGachaBanner.pity.purple = defaultPity.purple;

    editGachaTitle.textContent = isNew ? "Create New Banner" : "Edit Banner";
    gachaBannerIdInput.value = tempGachaBanner.bannerId || "";
    gachaBannerNameInput.value = tempGachaBanner.name || "";
    gachaBannerCurrencySelect.value = tempGachaBanner.currency;
    gachaBannerCostInput.value = tempGachaBanner.cost;
    gachaBannerRulesInput.value = tempGachaBanner.rules || ""; 
    
    gachaGoldPityApplies.value = tempGachaBanner.pity.gold.applies.toString();
    gachaGoldPityLimit.value = tempGachaBanner.pity.gold.limit;
    gachaPurplePityApplies.value = tempGachaBanner.pity.purple.applies.toString();
    gachaPurplePityLimit.value = tempGachaBanner.pity.purple.limit;
    
    gachaBannerIdInput.disabled = !isNew; 
    editGachaForm.dataset.bannerDbId = isNew ? "" : banner._id;

    renderRarityPools();
    editGachaModal.classList.remove('hidden');
}
function closeGachaModal() {
    editGachaModal.classList.add('hidden');
    tempGachaBanner = {};
}
function renderRarityPools() {
    gachaRarityPoolsContainer.innerHTML = '';
    
    if (!tempGachaBanner.rarities.find(r => r.rarity === 'gold')) {
        tempGachaBanner.rarities.push({ rarity: 'gold', rate: 0.03, pool: [] });
    }
    if (!tempGachaBanner.rarities.find(r => r.rarity === 'purple')) {
        tempGachaBanner.rarities.push({ rarity: 'purple', rate: 0.14, pool: [] });
    }
    if (!tempGachaBanner.rarities.find(r => r.rarity === 'blue')) {
        tempGachaBanner.rarities.push({ rarity: 'blue', rate: 0.83, pool: [] });
    }
    tempGachaBanner.rarities.sort((a,b) => a.rarity === 'gold' ? -1 : (a.rarity === 'purple' && b.rarity === 'blue' ? -1 : 1));

    tempGachaBanner.rarities.forEach(rarityPool => {
        const poolEl = document.createElement('div');
        poolEl.className = 'rarity-pool';
        poolEl.innerHTML = `
            <div class="rarity-pool-header">
                <h3 style="color:${rarityPool.rarity}; text-transform: uppercase;">${rarityPool.rarity} Pool</h3>
                <label for="rate-${rarityPool.rarity}">Rate (0.0 - 1.0)</label>
                <input type="number" step="0.01" id="rate-${rarityPool.rarity}" class="rarity-rate-input" value="${rarityPool.rate}">
            </div>
            <ul class="pool-list">
                ${rarityPool.pool.map((item, index) => renderPoolItemPill(item, index, rarityPool.rarity)).join('')}
            </ul>
            <button type="button" class="add-btn add-pool-item-btn">Add Reward to Pool</button>
        `;
        
        poolEl.querySelector('.add-pool-item-btn').addEventListener('click', () => {
            currentEditingRarityPool = rarityPool; 
            openAddPoolItemModal();
        });
        
        poolEl.querySelectorAll('.pool-item-pill .delete-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index, 10);
                rarityPool.pool.splice(index, 1);
                renderRarityPools();
            });
        });
        
        gachaRarityPoolsContainer.appendChild(poolEl);
    });
}
function renderPoolItemPill(item, index, rarity) {
    let name = "Unknown";
    if (item.type === 'character') {
        const char = masterCharacterList.get(item.characterId); 
        name = char ? char.name : `[${item.characterId}]`;
    }
    if (item.type === 'hoyo') name = `${item.amount} Hoyo`;
    if (item.type === 'primogems') name = `${item.amount} Primogems`;

    return `
        <li class="pool-item-pill rarity-${rarity}">
            <span class="pool-item-name">${name}</span>
            <button type="button" class="delete-item-btn" data-index="${index}">X</button>
        </li>
    `;
}
function openAddPoolItemModal() {
    addPoolItemForm.reset();
    renderPoolItemFields();
    addPoolItemModal.classList.remove('hidden');
}
function closeAddPoolItemModal() {
    addPoolItemModal.classList.add('hidden');
    currentEditingRarityPool = null;
}
function renderPoolItemFields() {
    const type = poolItemTypeSelect.value;
    poolItemFieldsContainer.innerHTML = '';
    
    if (type === 'character') {
        poolItemFieldsContainer.innerHTML = `
            <label for="pool-item-char-id">Character ID</label>
            <input type="text" id="pool-item-char-id" placeholder="e.g., 'gaara'" required>
        `;
    } else { // hoyo or primogems
        poolItemFieldsContainer.innerHTML = `
            <label for="pool-item-amount">Amount</label>
            <input type="number" id="pool-item-amount" value="1" required>
        `;
    }
}
function onAddPoolItemSubmit(e) {
    e.preventDefault();
    if (!currentEditingRarityPool) return;
    
    const type = poolItemTypeSelect.value;
    const newItem = { type: type };
    
    if (type === 'character') {
        newItem.characterId = document.getElementById('pool-item-char-id').value;
    } else {
        newItem.amount = parseInt(document.getElementById('pool-item-amount').value, 10);
    }
    
    currentEditingRarityPool.pool.push(newItem);
    renderRarityPools();
    closeAddPoolItemModal();
}
async function saveGachaBannerChanges(bannerDbId) {
    adminMessage.textContent = "Saving banner...";
    
    tempGachaBanner.bannerId = gachaBannerIdInput.value;
    tempGachaBanner.name = gachaBannerNameInput.value;
    tempGachaBanner.currency = gachaBannerCurrencySelect.value;
    tempGachaBanner.cost = parseInt(gachaBannerCostInput.value, 10);
    tempGachaBanner.rules = gachaBannerRulesInput.value; 
    
    tempGachaBanner.pity = {
        gold: {
            applies: gachaGoldPityApplies.value === 'true',
            limit: parseInt(gachaGoldPityLimit.value, 10) || 90
        },
        purple: {
            applies: gachaPurplePityApplies.value === 'true',
            limit: parseInt(gachaPurplePityLimit.value, 10) || 10
        }
    };
    
    tempGachaBanner.rarities.forEach(pool => {
        const rateInput = gachaRarityPoolsContainer.querySelector(`#rate-${pool.rarity}`);
        pool.rate = parseFloat(rateInput.value) || 0;
    });

    try {
        let endpoint = 'gacha-banners';
        let method = 'POST';
        
        if (bannerDbId) {
            endpoint = `gacha-banners/${bannerDbId}`;
            method = 'PUT';
        }

        // --- FIX: 'updatedBanner' was not defined. Save 'tempGachaBanner' ---
        await apiFetch(endpoint, method, tempGachaBanner);
        
        adminMessage.textContent = `Banner ${tempGachaBanner.name} saved successfully!`;
        closeGachaModal();
        loadGachaBanners();
    } catch (err) {
        adminMessage.textContent = err.message;
    }
}
async function deleteGachaBanner(banner) {
    if (!window.confirm(`Are you sure you want to delete the banner "${banner.name}"? This cannot be undone.`)) {
        return;
    }
    
    try {
        await apiFetch(`gacha-banners/${banner._id}`, 'DELETE');
        adminMessage.textContent = `Banner ${banner.name} deleted.`;
        loadGachaBanners();
    } catch (err) {
        adminMessage.textContent = err.message;
    }
}
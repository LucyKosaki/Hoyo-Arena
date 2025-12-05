import { ui } from './ui.js';
import { initMissions, renderMissions } from './missions.js'; 

// --- State ---
let socket = null;
let logMessage = null; 
let lobbyData = null;

// Persistent Selection
let selectedTeam = JSON.parse(localStorage.getItem('sa_selected_team') || '[]');

// Categories
const CATEGORY_ORDER = [
    'Guns Girl Z', 
    'Honkai Impact 3rd', 
    'Genshin Impact', 
    'Honkai Star Rail', 
    'Zenless Zone Zero', 
    'Others'
];
let activeCategory = CATEGORY_ORDER[0]; 

// Shop State
let activeShopCategory = 'character'; 

// Pagination State
let charCurrentPage = 1;
const CHARS_PER_PAGE = 33; 

// Info Card State
let openedCharId = null;
let selectedSkillIndex = null; 

// Gacha State
let selectedBannerId = null;
let currentHistoryPage = 1;

// --- Initialization ---
export function initLobby(socketInstance, logFunc) {
    socket = socketInstance;
    logMessage = logFunc;
    
    // --- Safety Bindings (in case ui.js wasn't updated) ---
    if (!ui.skillInfoStats) {
        ui.skillInfoStats = document.getElementById('skill-info-stats');
        ui.charInfoTags = document.getElementById('char-info-tags');
        ui.skillCostRow = document.getElementById('skill-cost-row');
        ui.skillCdRow = document.getElementById('skill-cd-row');
        ui.skillClassRow = document.getElementById('skill-class-row');
        ui.skillExecRow = document.getElementById('skill-exec-row');
    }

    initMissions(socket);
    
    setupHexNavigation();
    setupCategoryTabs(); 
    setupSelectionListeners();
    setupShopListeners();
    setupGachaListeners();
    
    // Pagination Listeners
    if (ui.charPrevBtn) {
        ui.charPrevBtn.addEventListener('click', () => {
            if (charCurrentPage > 1) {
                charCurrentPage--;
                renderCharacterGrid();
            }
        });
        ui.charNextBtn.addEventListener('click', () => {
            if (!ui.charNextBtn.disabled) {
                charCurrentPage++;
                renderCharacterGrid();
            }
        });
    }
    
    // Mission Filters
    if (ui.missionFilterCategory) {
        ui.missionFilterCategory.addEventListener('change', () => renderMissions(lobbyData));
        ui.filterHideCompleted.addEventListener('change', () => renderMissions(lobbyData));
        ui.filterShowLocked.addEventListener('change', () => renderMissions(lobbyData));
    }
    
    socket.off('matchmakingCanceled').on('matchmakingCanceled', () => {
        updateTeamSlots(); 
    });
}

// --- Render Logic ---
export function renderLobby(data) {
    lobbyData = data;
    if (!lobbyData) return;

    // 1. Player Info
    ui.playerNameDisplay.textContent = lobbyData.username;
    ui.playerEloDisplay.textContent = `ELO: ${lobbyData.elo}`;
    ui.playerHoyoDisplay.textContent = `Hoyo: ${lobbyData.hoyo}`;
    ui.playerPrimoDisplay.textContent = `Primos: ${lobbyData.primogems}`;
    
    // 2. Character Grid & Tabs
    renderCategoryTabs();
    renderCharacterGrid(); 
    updateTeamSlots();
    
    // 3. Sub-Views
    renderShop();
    renderMissions(lobbyData);
    renderGachaBanners();
}

// --- NAVIGATION ---
function setupHexNavigation() {
    ui.hexButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            if (target) {
                openSubView(target);
            } else {
                alert("This feature is not yet implemented.");
            }
        });
    });

    ui.backToHubBtn.addEventListener('click', closeSubView);
}

function openSubView(viewName) {
    if (viewName === 'shop') {
        const leftDefault = document.getElementById('left-col-default-content');
        const shopView = document.getElementById('shop-main-view');
        
        if (shopView.classList.contains('hidden')) {
            leftDefault.classList.add('hidden');
            shopView.classList.remove('hidden');
        } else {
            leftDefault.classList.remove('hidden');
            shopView.classList.add('hidden');
        }
        return; 
    }

    ui.lobbyHub.classList.add('hidden'); 
    ui.subViewContainer.classList.remove('hidden'); 
    
    ui.missionsPage.classList.add('hidden');
    ui.gachaPage.classList.add('hidden');
    
    if (viewName === 'missions') ui.missionsPage.classList.remove('hidden');
    if (viewName === 'gacha') ui.gachaPage.classList.remove('hidden');
}

function closeSubView() {
    ui.subViewContainer.classList.add('hidden');
    ui.lobbyHub.classList.remove('hidden');
}

// --- CHARACTER SELECTION & TABS ---

function setupCategoryTabs() {
    // Logic moved to renderCategoryTabs to ensure update on load
}

function renderCategoryTabs() {
    ui.charCategoryTabs.innerHTML = '';
    
    CATEGORY_ORDER.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `char-tab-btn ${activeCategory === cat ? 'active' : ''}`;
        btn.textContent = cat;
        btn.onclick = () => {
            activeCategory = cat;
            charCurrentPage = 1; 
            renderCategoryTabs(); 
            renderCharacterGrid();
        };
        ui.charCategoryTabs.appendChild(btn);
    });
}

function renderCharacterGrid() {
    ui.charSelectGrid.innerHTML = '';
    
    const allChars = Object.values(lobbyData.allCharacters).filter(char => {
        const charCats = char.categories || [];
        
        if (activeCategory === 'Others') {
            const mainCategories = CATEGORY_ORDER.filter(c => c !== 'Others');
            return !charCats.some(c => mainCategories.includes(c));
        } else {
            return charCats.includes(activeCategory);
        }
    });

    allChars.sort((a, b) => {
        const aOwned = lobbyData.unlockedCharacters.includes(a.id);
        const bOwned = lobbyData.unlockedCharacters.includes(b.id);
        if (aOwned && !bOwned) return -1;
        if (!aOwned && bOwned) return 1;
        return a.name.localeCompare(b.name);
    });

    // --- PAGINATION LOGIC ---
    const totalItems = allChars.length;
    const totalPages = Math.ceil(totalItems / CHARS_PER_PAGE) || 1;
    
    if (charCurrentPage > totalPages) charCurrentPage = totalPages;
    if (charCurrentPage < 1) charCurrentPage = 1;
    
    const startIndex = (charCurrentPage - 1) * CHARS_PER_PAGE;
    const endIndex = startIndex + CHARS_PER_PAGE;
    const itemsToShow = allChars.slice(startIndex, endIndex);

    itemsToShow.forEach(char => {
        const isUnlocked = lobbyData.unlockedCharacters.includes(char.id);
        const isSelected = selectedTeam.includes(char.id);
        
        const card = document.createElement('div');
        card.className = `grid-char-card ${isUnlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''}`;
        card.title = char.name;
        
        let contentHtml = '';
        if (char.icon) {
            contentHtml = `<div class="grid-char-img" style="background-image: url('${char.icon}'); background-size: cover; background-position: center;"></div>`;
        } else {
            contentHtml = `<div class="grid-char-img" style="background-color: #444; display:flex; align-items:center; justify-content:center;">${char.name[0]}</div>`;
        }
        card.innerHTML = contentHtml;
        
        if (isUnlocked) {
            card.draggable = true;
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', char.id);
            });
            
            card.addEventListener('click', () => {
                if (openedCharId === char.id) {
                    ui.charInfoCard.classList.add('hidden-slide');
                    ui.profileCard.classList.remove('collapsed'); 
                    openedCharId = null;
                } else {
                    showCharacterInfo(char);
                    ui.profileCard.classList.add('collapsed'); 
                    openedCharId = char.id;
                }
            });
        }
        
        ui.charSelectGrid.appendChild(card);
    });
    
    ui.charPageIndicator.textContent = `Page ${charCurrentPage} / ${totalPages}`;
    ui.charPrevBtn.disabled = charCurrentPage <= 1;
    ui.charNextBtn.disabled = charCurrentPage >= totalPages;
}

// --- INFO CARD LOGIC ---

function showCharacterInfo(char) {
    // 1. Reset to Character Mode
    selectedSkillIndex = null;
    renderCharInfoContent(char);
    
    // 2. Set Splash Art
    if (char.splashArt) {
        ui.charInfoArt.style.backgroundImage = `url('${char.splashArt}')`;
        ui.charInfoArt.style.backgroundColor = 'transparent';
    } else {
        ui.charInfoArt.style.backgroundImage = 'none';
        ui.charInfoArt.style.backgroundColor = '#222';
    }
    
    ui.charInfoSkills.innerHTML = '';

    // --- Helper: Create Icon with Click Listener ---
    const createSkillIcon = (skill, index) => {
        const icon = document.createElement('div');
        icon.className = 'info-skill-icon';
        
        if (skill.icon) {
            icon.style.backgroundImage = `url('${skill.icon}')`;
            icon.style.backgroundSize = 'cover';
            icon.textContent = '';
        } else {
            icon.style.backgroundImage = 'none';
            icon.textContent = skill.name[0]; 
        }
        
        // Click Listener for toggling view
        icon.onclick = () => toggleSkillView(char, index, icon);
        
        return icon;
    };

    // --- SKILL CAROUSEL RENDER ---
    const totalSkills = char.skills.length;
    const VISIBLE_COUNT = 4;

    if (totalSkills <= VISIBLE_COUNT) {
        // Normal rendering
        char.skills.forEach((skill, idx) => {
            ui.charInfoSkills.appendChild(createSkillIcon(skill, idx));
        });
    } else {
        // Carousel rendering
        let currentIndex = 0;
        const maxIndex = totalSkills - VISIBLE_COUNT;

        const wrapper = document.createElement('div');
        wrapper.className = 'skills-carousel-wrapper';

        const leftBtn = document.createElement('button');
        leftBtn.className = 'skill-nav-btn left';
        leftBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
        
        const rightBtn = document.createElement('button');
        rightBtn.className = 'skill-nav-btn right';
        rightBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';

        const viewport = document.createElement('div');
        viewport.className = 'skills-viewport';
        
        const track = document.createElement('div');
        track.className = 'skills-track';

        // Populate track
        char.skills.forEach((skill, idx) => {
            track.appendChild(createSkillIcon(skill, idx));
        });

        viewport.appendChild(track);
        wrapper.appendChild(leftBtn);
        wrapper.appendChild(viewport);
        wrapper.appendChild(rightBtn);
        
        ui.charInfoSkills.appendChild(wrapper);

        // Carousel Update Function
        const updateCarousel = () => {
            // Icon width 68 + Gap 16 = 84px step
            const offset = -(currentIndex * 84); 
            track.style.transform = `translateX(${offset}px)`;
            
            leftBtn.disabled = currentIndex === 0;
            rightBtn.disabled = currentIndex >= maxIndex;
        };

        // Listeners
        leftBtn.onclick = () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateCarousel();
            }
        };
        rightBtn.onclick = () => {
            if (currentIndex < maxIndex) {
                currentIndex++;
                updateCarousel();
            }
        };

        // Initialize
        updateCarousel();
    }

    ui.charInfoCard.classList.remove('hidden-slide');
}

// --- Toggle between Char and Skill Views ---
function toggleSkillView(char, index, iconElement) {
    // Deselect previous icon visually
    document.querySelectorAll('.info-skill-icon').forEach(el => el.classList.remove('active'));

    if (selectedSkillIndex === index) {
        // Revert to Character View
        selectedSkillIndex = null;
        renderCharInfoContent(char);
    } else {
        // Switch to Skill View
        selectedSkillIndex = index;
        iconElement.classList.add('active');
        renderSkillInfo(char.skills[index]);
    }
}

function renderCharInfoContent(char) {
    ui.charInfoName.textContent = char.name;
    ui.charInfoDesc.textContent = char.description || "No description available.";
    ui.charInfoDesc.classList.remove('skill-mode'); 
    
    // Show Tags, Hide Stats
    ui.charInfoTags.classList.remove('hidden');
    ui.skillInfoStats.classList.add('hidden');
    
    ui.charInfoTags.innerHTML = '';
    if (char.categories) {
        char.categories.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'char-tag';
            span.textContent = tag;
            ui.charInfoTags.appendChild(span);
        });
    }
}

function renderSkillInfo(skill) {
    ui.charInfoName.textContent = skill.name;
    ui.charInfoDesc.textContent = skill.description || "No description available.";
    ui.charInfoDesc.classList.add('skill-mode'); 
    
    // Hide Tags, Show Stats
    ui.charInfoTags.classList.add('hidden');
    ui.skillInfoStats.classList.remove('hidden');
    
    // 1. Costs
    // Add "Cost: " label
    ui.skillCostRow.innerHTML = '<span class="skill-stat-label">Cost:</span>';
    
    const cost = skill.cost;
    const addOrb = (type, amt) => {
        const orb = document.createElement('div');
        orb.className = `mini-orb ${type}`;
        orb.textContent = amt > 1 ? amt : '';
        ui.skillCostRow.appendChild(orb);
    };
    if (cost.green) addOrb('green', cost.green);
    if (cost.blue) addOrb('blue', cost.blue);
    if (cost.red) addOrb('red', cost.red);
    if (cost.white) addOrb('white', cost.white);
    if (cost.any) addOrb('any', cost.any);
    
    // If only label exists (no orbs), show "No Cost"
    if (ui.skillCostRow.childNodes.length === 1) {
        ui.skillCostRow.innerHTML += '<span style="font-size:0.8em; color:#aaa;">No Cost</span>';
    }

    // 2. Cooldown
    ui.skillCdRow.innerHTML = `<span class="skill-stat-label">Cooldown:</span> ${skill.cooldown}`;

    // 3. Class & Unique
    let classText = skill.skillClass;
    if (skill.isUnique) classText += ", Unique";
    ui.skillClassRow.innerHTML = `<span class="skill-stat-label">Classes:</span> ${classText}`;

    // 4. Execution
    ui.skillExecRow.innerHTML = `<span class="skill-stat-label">Execution Type:</span> ${skill.executionType}`;
}


// --- ACTIVE SLOTS (DROP TARGETS) ---
function updateTeamSlots() {
    ui.charSelectTeamSlots.forEach((slot, index) => {
        slot.innerHTML = '';
        slot.className = 'team-slot'; 
        
        const charId = selectedTeam[index];
        if (charId) {
            const char = lobbyData.allCharacters[charId];
            if (char) {
                slot.classList.add('filled');
                if (char.icon) {
                    slot.style.backgroundImage = `url('${char.icon}')`;
                    slot.textContent = '';
                } else {
                    slot.textContent = char.name; 
                }
                
                const removeBtn = document.createElement('div');
                removeBtn.innerHTML = '&times;';
                removeBtn.style.cssText = "position:absolute; top:-5px; right:-5px; background:red; color:white; border-radius:50%; width:15px; height:15px; font-size:10px; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10;";
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    selectedTeam[index] = null; 
                    selectedTeam = selectedTeam.filter(id => id !== null);
                    saveTeam();
                    updateTeamSlots();
                    renderCharacterGrid(); 
                };
                slot.style.position = 'relative';
                slot.appendChild(removeBtn);
            }
        } else {
            slot.textContent = `Slot ${index + 1}`;
            slot.style.backgroundImage = 'none';
        }
        
        slot.ondragover = (e) => e.preventDefault();
        slot.ondrop = (e) => {
            e.preventDefault();
            const droppedCharId = e.dataTransfer.getData('text/plain');
            if (droppedCharId) {
                if (!selectedTeam.includes(droppedCharId)) {
                    selectedTeam[index] = droppedCharId;
                    saveTeam();
                    updateTeamSlots();
                    renderCharacterGrid();
                }
            }
        };
    });
    
    const validTeam = selectedTeam.filter(id => id);
    const isReady = validTeam.length === 3;
    
    ui.findUnrankedBtn.disabled = !isReady;
    ui.findRankedBtn.disabled = !isReady;
    
    ui.findUnrankedBtn.innerHTML = isReady ? "Play<br>Unranked" : "Select 3<br>Characters";
    ui.findRankedBtn.innerHTML = isReady ? "Play<br>Ranked" : "Select 3<br>Characters";
}

function saveTeam() {
    const cleanTeam = selectedTeam.filter(id => id);
    localStorage.setItem('sa_selected_team', JSON.stringify(cleanTeam));
    selectedTeam = cleanTeam;
}

// --- STANDARD EVENT LISTENERS ---
function setupSelectionListeners() {
    ui.findUnrankedBtn.addEventListener('click', () => {
        socket.emit('findGame', { team: selectedTeam, mode: 'unranked' });
        showMatchmakingModal();
    });
    ui.findRankedBtn.addEventListener('click', () => {
        socket.emit('findGame', { team: selectedTeam, mode: 'ranked' });
        showMatchmakingModal();
    });
    ui.matchmakingCancelBtn.addEventListener('click', () => {
        socket.emit('cancelMatchmaking');
        hideMatchmakingModal();
    });
}

function showMatchmakingModal() {
    ui.matchmakingModal.classList.remove('hidden');
    document.body.classList.add('modal-active'); 
}

function hideMatchmakingModal() {
    ui.matchmakingModal.classList.add('hidden');
    document.body.classList.remove('modal-active');
}

// --- SHOP LOGIC ---
function setupShopListeners() {
    ui.purchaseConfirmNoBtn.addEventListener('click', () => {
        ui.purchaseConfirmModal.classList.add('hidden');
    });
    
    document.querySelectorAll('.shop-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.shop-tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            activeShopCategory = e.target.dataset.cat;
            renderShop(); 
        });
    });
}

function renderShop() {
    document.getElementById('shop-hoyo-display').textContent = lobbyData.hoyo;
    document.getElementById('shop-primo-display').textContent = lobbyData.primogems;

    ui.shopGrid.innerHTML = '';
    
    const filteredItems = lobbyData.shopItems.filter(item => item.type === activeShopCategory);
    
    filteredItems.forEach(item => {
        const isOwned = lobbyData.purchasedShopItems.includes(item.itemId) || 
                        (item.type === 'character' && lobbyData.unlockedCharacters.includes(item.characterId));
        
        const card = document.createElement('div');
        card.className = 'shop-item-card';
        let overlay = '';
        if (isOwned) overlay = `<div class="shop-item-overlay owned">Owned</div>`;

        const tooltip = `
            <div class="shop-item-tooltip">
                <span class="tooltip-title">${item.name}</span>
                <span class="tooltip-cat">${item.type}</span>
                <span class="tooltip-desc">${item.description}</span>
            </div>
        `;

        card.innerHTML = `
            ${overlay}
            <div class="shop-item-image">
                ${item.name[0]}
            </div>
            <div class="shop-item-details">
                <div class="shop-item-name">${item.name}</div>
                <div class="shop-item-price">${item.cost} ${item.currency}</div>
            </div>
            ${tooltip}
        `;
        
        if (!isOwned) {
            card.addEventListener('click', () => openPurchaseModal(item));
        }
        
        ui.shopGrid.appendChild(card);
    });
}

function openPurchaseModal(item) {
    ui.purchaseConfirmText.textContent = `Buy ${item.name} for ${item.cost} ${item.currency}?`;
    ui.purchaseConfirmModal.classList.remove('hidden');
    const newYesBtn = ui.purchaseConfirmYesBtn.cloneNode(true);
    ui.purchaseConfirmYesBtn.parentNode.replaceChild(newYesBtn, ui.purchaseConfirmYesBtn);
    ui.purchaseConfirmYesBtn = newYesBtn;
    ui.purchaseConfirmYesBtn.addEventListener('click', () => {
        buyItem(item);
        ui.purchaseConfirmModal.classList.add('hidden');
    });
}

async function buyItem(item) {
    try {
        const token = socket.io.opts.query.token;
        const res = await fetch('http://localhost:5000/api/shop/buy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify({ itemId: item.itemId })
        });
        const data = await res.json();
        if (res.ok) {
            alert(data.message);
            lobbyData.hoyo = data.hoyo;
            lobbyData.primogems = data.primogems;
            lobbyData.unlockedCharacters = data.unlockedCharacters;
            lobbyData.purchasedShopItems = data.purchasedShopItems;
            renderLobby(lobbyData);
        } else {
            alert(data.msg);
        }
    } catch (err) { console.error(err); }
}

function setupGachaListeners() {
    ui.gachaPull1Btn.addEventListener('click', () => performPull(1));
    ui.gachaPull10Btn.addEventListener('click', () => performPull(10));
    ui.gachaDetailsBtn.addEventListener('click', openGachaDetails);
    ui.gachaResultsCloseBtn.addEventListener('click', () => ui.gachaResultsModal.classList.add('hidden'));
    ui.gachaInfoCloseBtn.addEventListener('click', () => ui.gachaInfoModal.classList.add('hidden'));
    
    document.querySelectorAll('#gacha-info-modal .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#gacha-info-modal .tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            document.querySelectorAll('.gacha-info-tab').forEach(t => t.classList.add('hidden'));
            document.getElementById(`${e.target.dataset.tab}-page`).classList.remove('hidden');
            if(e.target.dataset.tab === 'info-history') loadGachaHistory(selectedBannerId, 1);
        });
    });
    ui.gachaHistoryPrevBtn.addEventListener('click', () => { if (currentHistoryPage > 1) loadGachaHistory(selectedBannerId, currentHistoryPage - 1); });
    ui.gachaHistoryNextBtn.addEventListener('click', () => loadGachaHistory(selectedBannerId, currentHistoryPage + 1));
}

function renderGachaBanners() {
    ui.gachaBannerList.innerHTML = '';
    const banners = Object.values(lobbyData.gachaBanners);
    banners.forEach(banner => {
        const card = document.createElement('div');
        card.className = `gacha-banner-card ${selectedBannerId === banner.bannerId ? 'active' : ''}`;
        card.innerHTML = `<div class="gacha-banner-card-image"></div><h4>${banner.name}</h4>`;
        card.addEventListener('click', () => selectBanner(banner));
        ui.gachaBannerList.appendChild(card);
    });
    if (!selectedBannerId && banners.length > 0) selectBanner(banners[0]);
}

function selectBanner(banner) {
    selectedBannerId = banner.bannerId;
    document.querySelectorAll('.gacha-banner-card').forEach(c => c.classList.remove('active'));
    renderGachaBanners();
    ui.gachaMainContent.classList.remove('hidden');
    ui.gachaBannerName.textContent = banner.name;
    const pity = lobbyData.userPity[banner.bannerId] || { goldPity: 0, purplePity: 0 };
    const goldLimit = banner.pity.gold.applies ? banner.pity.gold.limit : '-';
    const purpleLimit = banner.pity.purple.applies ? banner.pity.purple.limit : '-';
    ui.gachaPityGold.textContent = `Guaranteed Gold in: ${typeof goldLimit === 'number' ? (goldLimit - pity.goldPity) : '-'}`;
    ui.gachaPityPurple.textContent = `Guaranteed Purple in: ${typeof purpleLimit === 'number' ? (purpleLimit - pity.purplePity) : '-'}`;
    ui.gachaPull1Btn.textContent = `Pull x1 (${banner.cost} ${banner.currency})`;
    ui.gachaPull10Btn.textContent = `Pull x10 (${banner.cost * 10} ${banner.currency})`;
}

async function performPull(amount) {
    if (!selectedBannerId) return;
    try {
        const token = socket.io.opts.query.token;
        const res = await fetch('http://localhost:5000/api/gacha/pull', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify({ bannerId: selectedBannerId, pullAmount: amount })
        });
        const data = await res.json();
        if (res.ok) {
            lobbyData.hoyo = data.hoyo;
            lobbyData.primogems = data.primogems;
            lobbyData.unlockedCharacters = data.unlockedCharacters;
            lobbyData.userPity[selectedBannerId] = data.pity;
            renderLobby(lobbyData);
            selectBanner(lobbyData.gachaBanners[selectedBannerId]);
            showGachaResults(data.results);
        } else { alert(data.msg); }
    } catch (err) { console.error(err); }
}

function showGachaResults(results) {
    ui.gachaResultsGrid.innerHTML = '';
    results.forEach(res => {
        const item = document.createElement('div');
        item.className = `gacha-result-item rarity-${res.rarity}`;
        let text = '';
        if (res.item.type === 'character') {
            const charName = lobbyData.allCharacters[res.item.characterId]?.name || res.item.characterId;
            text = charName;
        } else { text = `${res.item.amount} ${res.item.type}`; }
        item.textContent = text;
        ui.gachaResultsGrid.appendChild(item);
    });
    ui.gachaResultsModal.classList.remove('hidden');
}

function openGachaDetails() {
    if (!selectedBannerId) return;
    const banner = lobbyData.gachaBanners[selectedBannerId];
    ui.gachaRulesText.textContent = banner.rules;
    ui.gachaRatesList.innerHTML = '';
    banner.rarities.forEach(r => {
        const section = document.createElement('div');
        section.className = `rate-${r.rarity}`;
        section.innerHTML = `<h5>${r.rarity} (${(r.rate * 100).toFixed(1)}%)</h5>`;
        const poolDiv = document.createElement('div');
        poolDiv.className = 'gacha-info-pool';
        r.pool.forEach(item => {
            const span = document.createElement('span');
            span.className = 'gacha-info-pool-item';
            if (item.type === 'character') span.textContent = lobbyData.allCharacters[item.characterId]?.name || item.characterId;
            else span.textContent = `${item.amount} ${item.type}`;
            poolDiv.appendChild(span);
        });
        section.appendChild(poolDiv);
        ui.gachaRatesList.appendChild(section);
    });
    ui.gachaInfoModal.classList.remove('hidden');
}

async function loadGachaHistory(bannerId, page) {
    try {
        const token = socket.io.opts.query.token;
        const res = await fetch(`http://localhost:5000/api/gacha/history/${bannerId}?page=${page}`, {
            headers: { 'x-auth-token': token }
        });
        const data = await res.json();
        ui.gachaHistoryList.innerHTML = '';
        if (data.pulls.length === 0) ui.gachaHistoryList.innerHTML = '<p>No history found.</p>';
        else {
            data.pulls.forEach(pull => {
                const item = document.createElement('div');
                item.className = 'gacha-history-item';
                let name = "Unknown";
                if (pull.result.type === 'character') name = lobbyData.allCharacters[pull.result.characterId]?.name || pull.result.characterId;
                else name = `${pull.result.amount} ${pull.result.type}`;
                item.innerHTML = `<span class="item-name rarity-${pull.rarity}">[${pull.rarity.toUpperCase()}] ${name}</span><span class="date">${new Date(pull.pullDate).toLocaleString()}</span>`;
                ui.gachaHistoryList.appendChild(item);
            });
        }
        currentHistoryPage = data.currentPage;
        ui.gachaHistoryPageNum.textContent = `Page ${data.currentPage} / ${data.totalPages || 1}`;
        ui.gachaHistoryPrevBtn.disabled = data.currentPage <= 1;
        ui.gachaHistoryNextBtn.disabled = data.currentPage >= data.totalPages;
    } catch (err) { console.error("Failed to load history:", err); ui.gachaHistoryList.innerHTML = '<p>Error loading history.</p>'; }
}
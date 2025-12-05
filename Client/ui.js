export const ui = {};

// --- Binds elements for the Portal (Website) screen ---
export function bindPortalElements() {
    ui.portalPlayBtn = document.getElementById('portal-play-btn');
    ui.portalLoginBtn = document.getElementById('portal-login-btn'); // For fallback/mobile if needed
    
    // Sidebar Login Elements
    ui.loginAccordion = document.getElementById('login-accordion');
    ui.loginTriggerBtn = document.getElementById('login-trigger-btn');
    ui.loginDropdown = document.getElementById('login-dropdown');
    ui.loggedOutContent = document.getElementById('logged-out-content');
    ui.loggedInContent = document.getElementById('logged-in-content');
    ui.portalLoginForm = document.getElementById('portal-login-form');
    ui.portalRegisterForm = document.getElementById('portal-register-form');
    ui.portalLogoutBtn = document.getElementById('portal-logout-btn');
    ui.welcomeUserText = document.getElementById('welcome-user-text');
    ui.portalAuthMessage = document.getElementById('portal-auth-message');
    ui.plUsername = document.getElementById('pl-username');
    ui.plPassword = document.getElementById('pl-password');
    ui.prUsername = document.getElementById('pr-username');
    ui.prPassword = document.getElementById('pr-password');
    ui.loginText = document.getElementById('login-text');
    ui.loginIcon = document.getElementById('login-icon');

    // News Elements
    ui.newsGrid = document.getElementById('news-grid');
    ui.newsGridView = document.getElementById('news-grid-view');
    ui.singleArticleView = document.getElementById('single-article-view');
    ui.prevPageBtn = document.getElementById('prev-page-btn');
    ui.nextPageBtn = document.getElementById('next-page-btn');
    ui.pageIndicator = document.getElementById('page-indicator');
    ui.backToNewsBtn = document.getElementById('back-to-news-btn');
    ui.fullArticleTitle = document.getElementById('full-article-title');
    ui.fullArticleDate = document.getElementById('full-article-date');
    ui.fullArticleBody = document.getElementById('full-article-body');
}

// Binds elements for the Standalone Auth screen
export function bindAuthElements() {
    ui.authContainer = document.getElementById('auth-container');
    ui.loginForm = document.getElementById('login-form');
    ui.registerForm = document.getElementById('register-form');
    ui.authMessage = document.getElementById('auth-message');
    ui.backToPortalBtn = document.getElementById('back-to-portal-btn'); 
}

// ... bindLobbyElements ...
export function bindLobbyElements() {
    ui.lobbyScreen = document.getElementById('lobby-screen');
    ui.lobbyHub = document.getElementById('lobby-hub');
    ui.subViewContainer = document.getElementById('sub-view-container');
    ui.backToHubBtn = document.getElementById('back-to-hub-btn');
    
    // --- NEW: Bind Profile Card Container ---
    ui.profileCard = document.querySelector('.profile-card');
    // ----------------------------------------
    
    ui.playerNameDisplay = document.getElementById('player-name-display');
    ui.playerEloDisplay = document.getElementById('player-elo-display'); 
    ui.playerHoyoDisplay = document.getElementById('player-hoyo-display');
    ui.playerPrimoDisplay = document.getElementById('player-primo-display');
    ui.charInfoCard = document.getElementById('char-info-card');
    ui.charInfoName = document.getElementById('char-info-name');
    ui.charInfoDesc = document.getElementById('char-info-desc');
    ui.charInfoTags = document.getElementById('char-info-tags');
    ui.charInfoSkills = document.getElementById('char-info-skills');
    ui.charInfoArt = document.getElementById('char-info-art');
    ui.charCategoryTabs = document.getElementById('char-category-tabs');
    ui.charSelectGrid = document.getElementById('char-select-grid');
    
    // PAGINATION CONTROLS
    ui.charPrevBtn = document.getElementById('char-prev-btn');
    ui.charNextBtn = document.getElementById('char-next-btn');
    ui.charPageIndicator = document.getElementById('char-page-indicator');
    
    ui.charSelectTeamSlots = [ document.getElementById('slot-1'), document.getElementById('slot-2'), document.getElementById('slot-3') ];
    ui.findUnrankedBtn = document.getElementById('find-unranked-btn'); 
    ui.findRankedBtn = document.getElementById('find-ranked-btn'); 
    ui.hexButtons = document.querySelectorAll('.hex-btn');
    ui.missionNotificationDot = document.getElementById('mission-notification-dot');
    ui.missionsPage = document.getElementById('missions-page');
    ui.shopPage = document.getElementById('shop-page');
    ui.gachaPage = document.getElementById('gacha-page');
    ui.matchmakingModal = document.getElementById('matchmaking-modal');
    ui.matchmakingCancelBtn = document.getElementById('matchmaking-cancel-btn');
    ui.missionList = document.getElementById('mission-list');
    ui.missionFilterCategory = document.getElementById('mission-filter-category');
    ui.filterHideCompleted = document.getElementById('filter-hide-completed');
    ui.filterShowLocked = document.getElementById('filter-show-locked');
    ui.shopGrid = document.getElementById('shop-grid');
    ui.gachaBannerList = document.getElementById('gacha-banner-list'); 
    ui.gachaMainContent = document.getElementById('gacha-main-content');
    ui.gachaBannerName = document.getElementById('gacha-banner-name'); 
    ui.gachaPull1Btn = document.getElementById('gacha-pull-1-btn');
    ui.gachaPull10Btn = document.getElementById('gacha-pull-10-btn');
    ui.gachaDetailsBtn = document.getElementById('gacha-details-btn');
    ui.gachaPityGold = document.getElementById('gacha-pity-gold');
    ui.gachaPityPurple = document.getElementById('gacha-pity-purple');
    ui.purchaseConfirmModal = document.getElementById('purchase-confirm-modal');
    ui.purchaseConfirmText = document.getElementById('purchase-confirm-text');
    ui.purchaseConfirmYesBtn = document.getElementById('purchase-confirm-yes-btn');
    ui.purchaseConfirmNoBtn = document.getElementById('purchase-confirm-no-btn');
    ui.gachaResultsModal = document.getElementById('gacha-results-modal');
    ui.gachaResultsGrid = document.getElementById('gacha-results-grid');
    ui.gachaResultsCloseBtn = document.getElementById('gacha-results-close-btn');
    ui.gachaInfoModal = document.getElementById('gacha-info-modal');
    ui.gachaInfoCloseBtn = document.getElementById('gacha-info-close-btn');
    ui.gachaRatesList = document.getElementById('gacha-rates-list');
    ui.gachaHistoryList = document.getElementById('gacha-history-list');
    ui.gachaHistoryPrevBtn = document.getElementById('gacha-history-prev-btn');
    ui.gachaHistoryPageNum = document.getElementById('gacha-history-page-num');
    ui.gachaHistoryNextBtn = document.getElementById('gacha-history-next-btn');
    ui.gachaRulesText = document.getElementById('gacha-rules-text'); 
}

export function bindGameElements() {
    ui.gameWrapper = document.getElementById('game-wrapper');
    ui.gameLog = document.getElementById('game-log');
    ui.endTurnBtn = document.getElementById('end-turn-btn');
    ui.giveUpBtn = document.getElementById('give-up-btn');
    ui.exchangeBtn = document.getElementById('exchange-btn');
    ui.t1ChakraBank = document.getElementById('t1-chakra-bank');
    ui.t2ChakraBank = document.getElementById('t2-chakra-bank');
    ui.t1TeamName = document.getElementById('t1-team-name');
    ui.t2TeamName = document.getElementById('t2-team-name');
    ui.activeTeamName = document.getElementById('active-team-name');
    ui.skillQueueBar = document.getElementById('skill-queue-bar');
    ui.modalOverlay = document.getElementById('modal-overlay');
    ui.modalTitle = document.getElementById('modal-title');
    ui.modalPrompt = document.getElementById('modal-prompt');
    ui.modalChakraBank = document.getElementById('modal-chakra-bank');
    ui.modalCancelBtn = document.getElementById('modal-cancel-btn');
    ui.endGameModal = document.getElementById('end-game-modal');
    ui.endGameText = document.getElementById('end-game-text');
    ui.backToLobbyBtn = document.getElementById('back-to-lobby-btn');
    ui.confirmModal = document.getElementById('confirm-modal');
    ui.confirmTitle = document.getElementById('confirm-title');
    ui.confirmPrompt = document.getElementById('confirm-prompt');
    ui.confirmYesBtn = document.getElementById('confirm-yes-btn');
    ui.confirmNoBtn = document.getElementById('confirm-no-btn');
    ui.charCards = {
        t0: [ 
            { card: document.getElementById('t1-c0'), name: document.getElementById('t1-c0-name'), hpBar: document.getElementById('t1-c0-hp-bar'), hpLabel: document.getElementById('t1-c0-hp-label'), buffs: document.getElementById('t1-c0-buffs') },
            { card: document.getElementById('t1-c1'), name: document.getElementById('t1-c1-name'), hpBar: document.getElementById('t1-c1-hp-bar'), hpLabel: document.getElementById('t1-c1-hp-label'), buffs: document.getElementById('t1-c1-buffs') },
            { card: document.getElementById('t1-c2'), name: document.getElementById('t1-c2-name'), hpBar: document.getElementById('t1-c2-hp-bar'), hpLabel: document.getElementById('t1-c2-hp-label'), buffs: document.getElementById('t1-c2-buffs') }
        ],
        t1: [ 
            { card: document.getElementById('t2-c0'), name: document.getElementById('t2-c0-name'), hpBar: document.getElementById('t2-c0-hp-bar'), hpLabel: document.getElementById('t2-c0-hp-label'), buffs: document.getElementById('t2-c0-buffs') },
            { card: document.getElementById('t2-c1'), name: document.getElementById('t2-c1-name'), hpBar: document.getElementById('t2-c1-hp-bar'), hpLabel: document.getElementById('t2-c1-hp-label'), buffs: document.getElementById('t2-c1-buffs') },
            { card: document.getElementById('t2-c2'), name: document.getElementById('t2-c2-name'), hpBar: document.getElementById('t2-c2-hp-bar'), hpLabel: document.getElementById('t2-c2-hp-label'), buffs: document.getElementById('t2-c2-buffs') }
        ]
    };
    ui.skillSetCards = [
        { set: document.getElementById('c0-skill-set'), name: document.getElementById('c0-skill-name'), skills: document.getElementById('c0-skills') },
        { set: document.getElementById('c1-skill-set'), name: document.getElementById('c1-skill-name'), skills: document.getElementById('c1-skills') },
        { set: document.getElementById('c2-skill-set'), name: document.getElementById('c2-skill-name'), skills: document.getElementById('c2-skills') }
    ];
}
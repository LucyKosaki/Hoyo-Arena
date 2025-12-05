export const AUTH_TEMPLATE = `
    <div id="auth-container">
        <h2>Login or Register</h2>
        <form id="login-form">
            <input type="text" id="login-username" placeholder="Username" required>
            <input type="password" id="login-password" placeholder="Password" required>
            <button type="submit">Login</button>
        </form>
        <form id="register-form">
            <input type="text" id="register-username" placeholder="Username" required>
            <input type="password" id="register-password" placeholder="Password" required>
            <button type="submit">Register</button>
        </form>
        <p id="auth-message"></p>
    </div>
`;

export const LOBBY_TEMPLATE = `
    <div id="lobby-screen">
        <div id="lobby-hub">
            <div class="lobby-left-col">
                <div id="left-col-default-content">
                    <div class="profile-card glass-panel">
                        <div class="profile-avatar"></div>
                        <div class="profile-details">
                            <div class="profile-name-row">
                                <span id="player-name-display" class="profile-name">Player</span>
                                <span class="profile-level">Level 22</span>
                            </div>
                            <div class="profile-stat-row">
                                <span class="profile-stat">Title: Marshmallow</span>
                                <span class="profile-stat" id="player-elo-display">ELO: 1000</span>
                            </div>
                            <div class="profile-stat-row">
                                <span class="profile-stat">Guild: ElysiaStans</span>
                                <span class="profile-stat">Rank: Emanator</span>
                            </div>
                            <div class="profile-resources">
                                <span id="player-hoyo-display" class="res-hoyo">Hoyo: 0</span>
                                <span id="player-primo-display" class="res-primo">Primos: 0</span>
                            </div>
                        </div>
                    </div>

                    <div id="char-info-card" class="char-info-card glass-panel hidden-slide">
                        <div class="char-info-content">
                            <div class="char-info-img-container">
                                <div id="char-info-art" class="char-info-art"></div>
                            </div>
                            
                            <div class="char-info-text">
                                <h2 id="char-info-name">Name</h2>
                                
                                <div class="char-info-body custom-scrollbar">
                                    <p id="char-info-desc" class="char-desc">...</p>
                                </div>

                                <div class="char-info-footer">
                                    <div id="char-info-tags" class="char-tags"></div>
                                    
                                    <div id="skill-info-stats" class="skill-info-stats hidden">
                                        <div class="skill-stats-left">
                                            <div id="skill-cost-row" class="skill-stat-row"></div>
                                            <div id="skill-cd-row" class="skill-stat-row text-stat"></div>
                                        </div>
                                        <div class="skill-stats-right">
                                            <div id="skill-class-row" class="skill-stat-row text-stat align-right"></div>
                                            <div id="skill-exec-row" class="skill-stat-row text-stat align-right"></div>
                                        </div>
                                    </div>

                                    <div class="char-info-separator"></div>
                                    <div class="char-info-skills" id="char-info-skills"></div>
                                </div>
                            </div>
                            
                        </div>
                    </div>

                    <div class="char-selection-container glass-panel">
                        <div class="char-tabs" id="char-category-tabs"></div>
                        <div id="char-select-grid" class="char-grid custom-scrollbar"></div>
                        <div class="char-pagination">
                            <button id="char-prev-btn" class="page-btn"><i class="fa-solid fa-chevron-left"></i></button>
                            <span id="char-page-indicator">Page 1 / 1</span>
                            <button id="char-next-btn" class="page-btn"><i class="fa-solid fa-chevron-right"></i></button>
                        </div>
                    </div>
                </div>

                <div id="shop-main-view" class="shop-panel glass-panel hidden">
                    <div class="shop-header">
                        <h1 class="shop-title">Hoyo Shop</h1>
                        <div class="shop-currencies">
                            <div class="shop-currency-item hoyo"><span id="shop-hoyo-display">0</span> Hoyo</div>
                            <div class="shop-currency-item crystal"><span id="shop-crystal-display">200</span> Crystals</div>
                            <div class="shop-currency-item poly"><span id="shop-poly-display">400</span> Polys</div>
                            
                            <div class="shop-currency-item primo"><span id="shop-primo-display">0</span> Primos</div>
                            <div class="shop-currency-item jade"><span id="shop-jade-display">1250</span> Jades</div>
                            <div class="shop-currency-item"></div> </div>
                    </div>
                    <div class="shop-body">
                        <div class="shop-tabs">
                            <button class="shop-tab-btn active" data-cat="character">Characters</button>
                            <button class="shop-tab-btn" data-cat="item">Items</button>
                            <button class="shop-tab-btn" data-cat="image">Images</button>
                            <button class="shop-tab-btn" data-cat="border">Borders</button>
                            <button class="shop-tab-btn" data-cat="music">Music</button>
                            <button class="shop-tab-btn" data-cat="title">Titles</button>
                        </div>
                        <div class="shop-content custom-scrollbar">
                            <div id="shop-grid" class="shop-grid">
                                </div>
                        </div>
                    </div>
                </div>
                
            </div>

            <div class="lobby-right-col">
                <div class="hex-menu-grid">
                    <div class="hex-row">
                        <button class="hex-btn placeholder-btn">
                            <i class="fa-solid fa-user-ninja"></i>
                            <span>Profile</span>
                        </button>
                        <button class="hex-btn placeholder-btn">
                            <i class="fa-solid fa-trophy"></i>
                            <span>Awards</span>
                        </button>
                        <button class="hex-btn placeholder-btn">
                            <i class="fa-solid fa-gear"></i>
                            <span>Settings</span>
                        </button>
                    </div>
                    <div class="hex-row">
                        <button class="hex-btn placeholder-btn">
                            <i class="fa-solid fa-shield-halved"></i>
                            <span>Guild</span>
                        </button>
                        <button class="hex-btn" data-target="gacha">
                            <i class="fa-solid fa-meteor"></i>
                            <span>Gacha</span>
                        </button>
                        <button class="hex-btn" data-target="shop">
                            <i class="fa-solid fa-store"></i>
                            <span>Shop</span>
                        </button>
                    </div>
                    <div class="hex-row">
                        <button class="hex-btn placeholder-btn">
                            <i class="fa-solid fa-user-group"></i>
                            <span>Friends</span>
                        </button>
                        <button class="hex-btn" data-target="missions">
                            <i class="fa-solid fa-scroll"></i>
                            <span>Missions</span>
                            <div id="mission-notification-dot" class="hex-notify hidden"></div>
                        </button>
                        <button class="hex-btn placeholder-btn">
                            <i class="fa-solid fa-ticket"></i>
                            <span>Codes</span>
                        </button>
                    </div>
                </div>

                <div class="play-actions-row">
                    <button id="find-ranked-btn" class="action-btn cyan-btn" disabled>Play<br>Ranked</button>
                    <button id="find-unranked-btn" class="action-btn cyan-btn" disabled>Play<br>Unranked</button>
                    <button class="action-btn cyan-btn placeholder-btn">Lobby<br>Play</button>
                </div>

                <div class="active-team-panel glass-panel">
                    <h3>Active Characters</h3>
                    <div class="active-slots-row" id="char-select-team">
                        <div class="team-slot" id="slot-1"></div>
                        <div class="team-slot" id="slot-2"></div>
                        <div class="team-slot" id="slot-3"></div>
                    </div>
                </div>
            </div>
        </div>

        <div id="sub-view-container" class="sub-view-overlay hidden">
            <button id="back-to-hub-btn" class="back-home-btn">&lt; Back to Home</button>
            
            <div id="missions-page" class="sub-page hidden">
                <div class="mission-filters glass-panel">
                    <select id="mission-filter-category">
                        <option value="ALL">All Categories</option>
                        <option value="Guns Girl Z">Guns Girl Z</option>
                        <option value="Honkai Impact 3rd">Honkai Impact 3rd</option>
                        <option value="Genshin Impact">Genshin Impact</option>
                        <option value="Honkai Star Rail">Honkai Star Rail</option>
                        <option value="Zenless Zone Zero">Zenless Zone Zero</option>
                        <option value="Others">Others</option>
                    </select>
                    <div class="mission-filter-toggles">
                        <label><input type="checkbox" id="filter-hide-completed"> Hide Completed</label>
                        <label><input type="checkbox" id="filter-show-locked" checked> Show Locked</label>
                    </div>
                </div>
                <div id="mission-list"></div>
            </div>
            
            <div id="gacha-page" class="sub-page hidden">
                <div class="gacha-layout glass-panel">
                    <div class="gacha-banner-list-container">
                        <h3>Select Banner</h3>
                        <div id="gacha-banner-list"></div>
                    </div>
                    <div class="gacha-main-container">
                        <h3 id="gacha-banner-name">No Banner Selected</h3>
                        <div id="gacha-main-content" class="hidden">
                            <div class="gacha-banner-image"></div>
                            <div class="gacha-pity-counter">
                                <span id="gacha-pity-gold">Guaranteed Gold in: -</span>
                                <span id="gacha-pity-purple">Guaranteed Purple in: -</span>
                            </div>
                            <div class="gacha-controls">
                                <button id="gacha-pull-1-btn" class="gacha-btn pull-1">Pull x1</button>
                                <button id="gacha-pull-10-btn" class="gacha-btn pull-10">Pull x10</button>
                                <button id="gacha-details-btn" class="gacha-btn details">View Details</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <div id="matchmaking-modal" class="modal-overlay hidden">
        <div class="modal-content">
            <h3>Matchmaking...</h3>
            <button id="matchmaking-cancel-btn" class="cancel-btn">Cancel</button>
        </div>
    </div>
    
    <div id="purchase-confirm-modal" class="modal-overlay hidden">
        <div class="modal-content">
            <h3 id="purchase-confirm-title">Confirm Purchase</h3>
            <p id="purchase-confirm-text"></p>
            <div class="modal-buttons">
                <button id="purchase-confirm-yes-btn" class="save-btn">Buy</button>
                <button id="purchase-confirm-no-btn" class="cancel-btn">Cancel</button>
            </div>
        </div>
    </div>

    <div id="gacha-results-modal" class="modal-overlay hidden">
        <div class="modal-content gacha-results-content">
            <h3>Pull Results</h3>
            <div id="gacha-results-grid"></div>
            <div class="modal-buttons">
                <button id="gacha-results-close-btn" class="cancel-btn">Close</button>
            </div>
        </div>
    </div>

    <div id="gacha-info-modal" class="modal-overlay hidden">
        <div class="modal-content" style="max-width: 600px;">
            <nav class="tabs">
                <button class="tab-btn active" data-tab="info-details">Information</button>
                <button class="tab-btn" data-tab="info-history">History</button>
            </nav>
            <div id="info-details-page" class="tab-content gacha-info-tab active">
                <h4>Rules</h4>
                <p id="gacha-rules-text"></p>
                <hr>
                <h4>Item Pool</h4>
                <div id="gacha-rates-list"></div>
            </div>
            <div id="info-history-page" class="tab-content gacha-info-tab hidden">
                <div id="gacha-history-list"></div>
                <div class="gacha-history-pagination">
                    <button id="gacha-history-prev-btn" disabled>&lt; Prev</button>
                    <span id="gacha-history-page-num">Page 1 / 1</span>
                    <button id="gacha-history-next-btn" disabled>Next &gt;</button>
                </div>
            </div>
            <div class="modal-buttons">
                <button id="gacha-info-close-btn" class="cancel-btn">Close</button>
            </div>
        </div>
    </div>
`;

export const GAME_TEMPLATE = `
    <div id="game-wrapper">
        <div id="game-board">
            <h1>Shinobi Arena</h1>
            <div id="game-container">
                <div class="team-container" id="team1-container">
                    <h2 id="t1-team-name">Team 1</h2>
                    <div class="chakra-bank" id="t1-chakra-bank"></div>
                    <div class="team-roster" id="t1-roster">
                        <div class="char-card" id="t1-c0"><h4 id="t1-c0-name"></h4><div class="stat-bar"><div class="stat-bar-label" id="t1-c0-hp-label"></div><div class="stat-bar-inner" id="t1-c0-hp-bar"></div></div><div class="buff-container" id="t1-c0-buffs"></div></div>
                        <div class="char-card" id="t1-c1"><h4 id="t1-c1-name"></h4><div class="stat-bar"><div class="stat-bar-label" id="t1-c1-hp-label"></div><div class="stat-bar-inner" id="t1-c1-hp-bar"></div></div><div class="buff-container" id="t1-c1-buffs"></div></div>
                        <div class="char-card" id="t1-c2"><h4 id="t1-c2-name"></h4><div class="stat-bar"><div class="stat-bar-label" id="t1-c2-hp-label"></div><div class="stat-bar-inner" id="t1-c2-hp-bar"></div></div><div class="buff-container" id="t1-c2-buffs"></div></div>
                    </div>
                </div>
                <div class="team-container" id="team2-container">
                    <h2 id="t2-team-name">Team 2</h2>
                    <div class="chakra-bank" id="t2-chakra-bank"></div>
                    <div class="team-roster" id="t2-roster">
                        <div class="char-card" id="t2-c0"><h4 id="t2-c0-name"></h4><div class="stat-bar"><div class="stat-bar-label" id="t2-c0-hp-label"></div><div class="stat-bar-inner" id="t2-c0-hp-bar"></div></div><div class="buff-container" id="t2-c0-buffs"></div></div>
                        <div class="char-card" id="t2-c1"><h4 id="t2-c1-name"></h4><div class="stat-bar"><div class="stat-bar-label" id="t2-c1-hp-label"></div><div class="stat-bar-inner" id="t2-c1-hp-bar"></div></div><div class="buff-container" id="t2-c1-buffs"></div></div>
                        <div class="char-card" id="t2-c2"><h4 id="t2-c2-name"></h4><div class="stat-bar"><div class="stat-bar-label" id="t2-c2-hp-label"></div><div class="stat-bar-inner" id="t2-c2-hp-bar"></div></div><div class="buff-container" id="t2-c2-buffs"></div></div>
                    </div>
                </div>
            </div>
            <div id="active-team-area">
                <h3>Active Team: <span id="active-team-name"></span>'s Turn</h3>
                <div id="active-team-skills">
                    <div class="char-skill-set" id="c0-skill-set"><h4 id="c0-skill-name"></h4><div class="active-skills-container" id="c0-skills"></div></div>
                    <div class="char-skill-set" id="c1-skill-set"><h4 id="c1-skill-name"></h4><div class="active-skills-container" id="c1-skills"></div></div>
                    <div class="char-skill-set" id="c2-skill-set"><h4 id="c2-skill-name"></h4><div class="active-skills-container" id="c2-skills"></div></div>
                </div>
            </div>
            <div id="skill-queue-bar"></div>
            <div id="controls-log-container">
                <div id="game-log"></div>
                <div id="controls">
                    <button id="exchange-btn">Exchange (5:1)</button>
                    <button id="end-turn-btn" disabled>End Turn</button>
                    <button id="give-up-btn">Give Up</button> 
                </div>
            </div>
        </div>
    </div>
    
    <div id="end-game-modal" class="modal-overlay hidden">
        <div class="modal-content">
            <h2 id="end-game-text"></h2>
            <button id="back-to-lobby-btn">Back to Lobby</button>
        </div>
    </div>
    <div id="confirm-modal" class="modal-overlay hidden">
        <div class="modal-content">
            <h3 id="confirm-title">Are you sure?</h3>
            <p id="confirm-prompt"></p>
            <div class="modal-buttons">
                <button id="confirm-yes-btn">Yes</button>
                <button id="confirm-no-btn">No</button>
            </div>
        </div>
    </div>
    <div id="modal-overlay" class="modal-overlay hidden">
        <div id="chakra-picker-modal" class="modal-content">
            <h3 id="modal-title">Select Chakra</h3>
            <div id="modal-prompt"></div>
            <div id="modal-chakra-bank"></div>
            <button id="modal-cancel-btn">Cancel</button>
        </div>
    </div>
`;
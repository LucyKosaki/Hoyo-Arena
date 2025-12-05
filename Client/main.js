// client/main.js
import { ui, bindAuthElements, bindLobbyElements, bindGameElements } from './ui.js';
// --- FIX: Removed PORTAL_TEMPLATE from imports ---
import { AUTH_TEMPLATE, LOBBY_TEMPLATE, GAME_TEMPLATE } from './templates.js';
import { initAuth } from './auth.js';
import { initLobby, renderLobby } from './lobby.js'; 
import { initGame, renderGame, endGame } from './game.js';
import { playLobbyMusic, playBattleMusic } from './audio.js';

document.addEventListener('DOMContentLoaded', () => {

    const appContainer = document.getElementById('app');
    
    // --- STATE ---
    let socket = null;
    let myPlayerIndex = -1;
    let myRoomId = null;
    let myTeamName = ""; 
    let gameState = {};
    let allCharactersList = {};
    let allEffectsList = {};
    
    let currentView = ''; 

    // --- VIEW MANAGEMENT ---

    // 1. Login View (Default Start for Game Client)
    function renderLoginView() {
        if (currentView === 'login') return;
        currentView = 'login';

        document.body.classList.remove('modal-active');
        document.body.classList.add('login-mode');
        document.body.style.overflow = 'hidden'; 
        
        appContainer.innerHTML = AUTH_TEMPLATE;
        bindAuthElements();
        initAuth(connectToSocket, logMessage); 
        
        playLobbyMusic();
    }
    
    // 2. Lobby View
    function renderLobbyView() {
        if (currentView === 'lobby') return;
        currentView = 'lobby';

        document.body.classList.remove('login-mode', 'modal-active');
        document.body.style.overflow = 'hidden';
        
        appContainer.innerHTML = LOBBY_TEMPLATE;
        bindLobbyElements();
        
        playLobbyMusic();
        
        if (socket) {
            initLobby(socket, logMessage);
        }
    }
    
    // 3. Game View
    function renderGameView() {
        if (currentView === 'game') return;
        currentView = 'game';

        document.body.classList.remove('login-mode', 'modal-active');
        document.body.style.overflow = 'auto';
        
        appContainer.innerHTML = GAME_TEMPLATE;
        bindGameElements();
        
        playBattleMusic();
    }

    function logMessage(message) {
        if (ui.gameLog) {
            const p = document.createElement('p');
            p.textContent = message;
            ui.gameLog.appendChild(p);
            ui.gameLog.scrollTop = ui.gameLog.scrollHeight;
        } else {
            console.log(message);
        }
    }
    
    // --- INITIALIZE GAME APP ---
    // Check if we have a token (maybe from previous session)
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
        connectToSocket(storedToken);
    } else {
        renderLoginView();
    }

    // --- SOCKET LOGIC ---
    function connectToSocket(token) {
        if (socket) socket.disconnect();

        socket = io('http://localhost:5000', {
            query: { token }
        });
        
        socket.on('connect', () => {
            console.log('Connected to server.');
            // Immediately ask for lobby data to trigger the view switch
            socket.emit('getLobbyData');
        });

        socket.on('lobbyData', (data) => {
            allCharactersList = data.allCharacters;
            allEffectsList = data.allEffects;
            
            // Switch to Lobby UI and populate it
            renderLobbyView(); 
            renderLobby(data); 
        });
        
        socket.on('disconnect', () => {
            console.log('Disconnected.');
            socket = null;
            renderLoginView(); 
            if(ui.authMessage) ui.authMessage.textContent = "Disconnected. Please log in again.";
        });

        socket.on('gameFound', ({ roomId, playerIndex }) => {
            myRoomId = roomId;
            myPlayerIndex = playerIndex;
            renderGameView();
            initGame(socket, {}, myPlayerIndex, myRoomId, "", logMessage, allCharactersList, allEffectsList);
            logMessage(`Match found! You are Player ${playerIndex + 1}. Starting game...`);
        });

        socket.on('waitingForMatch', () => {
            if (ui.findUnrankedBtn) {
                ui.findUnrankedBtn.disabled = true;
                ui.findRankedBtn.disabled = true;
                ui.findUnrankedBtn.textContent = "Waiting...";
                ui.findRankedBtn.textContent = "Waiting...";
            }
        });

        socket.on('updateState', (newState) => {
            if (myPlayerIndex === -1) return; 
            try {
                const isLocalStateEmpty = !gameState.gameActive || !gameState.teams;
                const gameJustStarting = isLocalStateEmpty && newState.gameActive;
                
                if (gameJustStarting) {
                    if (!newState.teams[myPlayerIndex]) return;
                    myTeamName = newState.teams[myPlayerIndex].name;
                    initGame(socket, newState, myPlayerIndex, myRoomId, myTeamName, logMessage, allCharactersList, allEffectsList);
                }
                gameState = newState;
                if(gameState.gameActive) {
                    renderGameView(); // Ensure view is correct
                    renderGame(newState, myPlayerIndex, myTeamName);
                }
                if (!gameState.gameActive && gameState.winner) {
                    endGame(gameState.winner, myTeamName);
                }
            } catch (err) {
                console.error("Error in updateState:", err);
            }
        });

        socket.on('battleLog', (log) => {
            if(!log) return;
            log.forEach((msg, index) => {
                setTimeout(() => { logMessage(msg); }, index * 500); 
            });
        });
        
        document.addEventListener('backToLobby', () => {
            socket.emit('getLobbyData');
        });

        socket.on('log', (msg) => logMessage(msg));
        socket.on('errorMsg', (msg) => logMessage(`ERROR: ${msg}`));
    }
});
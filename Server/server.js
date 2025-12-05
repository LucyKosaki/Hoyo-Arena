require('dotenv').config(); // This must be at the top
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const Game = require('./gameLogic.js');
const { MONGO_URI } = require('./config.js'); 
const User = require('./models/User.js');
const Character = require('./models/Character.js');
const Effect = require('./models/Effect.js'); 
const GameMatch = require('./models/GameMatch.js');
const Mission = require('./models/Mission.js');
const UserMission = require('./models/UserMission.js');
const ShopItem = require('./models/ShopItem.js');
const GachaBanner = require('./models/GachaBanner.js'); 
const UserPity = require('./models/UserPity.js');

// --- Configuration ---
const app = express();
const PORT = 5000; 

const ALLOWED_ORIGINS = [
    "http://127.0.0.1:8080", 
    "http://127.0.0.1:8081"  
];

// --- Middleware ---
app.use(cors({ origin: ALLOWED_ORIGINS })); 
app.use(express.json()); 

// --- Socket.io Setup ---
const server = http.createServer(app); 
const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS, 
        methods: ["GET", "POST"],
        credentials: true
    }
});

// --- Database Connection ---
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- GAME MANAGEMENT ---
let unrankedPool = []; 
let rankedPool = [];   
let gameRooms = {}; 
let masterCharacterList = {};
let masterEffectList = {}; 
let masterGachaBanners = {}; 

async function loadCharacters() {
    try {
        const allChars = await Character.find({}).lean();
        allChars.forEach(char => {
            masterCharacterList[char.id] = char;
        });
        console.log(`Loaded ${allChars.length} characters from DB.`);
    } catch (err) {
        console.error("Error loading characters:", err);
        process.exit(1); 
    }
}

async function loadEffects() {
    try {
        const allEffects = await Effect.find({}).lean();
        allEffects.forEach(effect => {
            masterEffectList[effect.name] = effect;
        });
        console.log(`Loaded ${allEffects.length} effects from DB.`);
    } catch (err) {
        console.error("Error loading effects:", err);
        process.exit(1); 
    }
}

async function loadBanners() {
    try {
        const allBanners = await GachaBanner.find({}).lean();
        allBanners.forEach(banner => {
            masterGachaBanners[banner.bannerId] = banner;
        });
        console.log(`Loaded ${allBanners.length} gacha banners from DB.`);
    } catch (err) {
        console.error("Error loading banners:", err);
        process.exit(1);
    }
}


// --- Routes ---
app.use('/api/users', require('./api/users'));
app.use('/api/admin', require('./api/admin.js')(masterCharacterList, masterGachaBanners, masterEffectList)); 
app.use('/api/missions', require('./api/missions.js')); 
app.use('/api/shop', require('./api/shop.js')); 
app.use('/api/gacha', require('./api/gacha.js')); 
app.use('/api/news', require('./api/news'));

app.use('/uploads', express.static('uploads')); 


// --- Socket.io Authentication Middleware ---
io.use((socket, next) => {
    const token = socket.handshake.query.token;
    if (!token) {
        return next(new Error('Authentication error: No token provided.'));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return next(new Error('Authentication error: Invalid token.'));
        }
        socket.decoded_token = decoded;
        next();
    });
});

// --- REAL-TIME LOGIC ---
io.on('connection', (socket) => {
    // 1. Extract user data directly from the token payload based on your logs
    const user = socket.decoded_token.user;

    if (!user || !user.id || !user.username) {
         console.log("Socket connection rejected: Invalid token payload structure.");
         console.log("Payload received:", socket.decoded_token);
         return socket.disconnect(true);
    }

    // 2. Attach user to socket for easy access elsewhere
    socket.user = user;

    console.log(`A user connected: ${user.username} (Socket: ${socket.id})`);

    // --- Player Actions ---
    socket.on('getLobbyData', async () => {
        try {
            // Get all data in parallel
            // NOTE: We use 'user.id' here, which comes directly from the token
            const [userData, allMissions, userMissions, allShopItems, userPityData] = await Promise.all([
                User.findById(user.id).select('unlockedCharacters username elo hoyo primogems purchasedShopItems'),
                Mission.find().sort({ order: 1 }), 
                UserMission.find({ userId: user.id }),
                ShopItem.find(),
                UserPity.find({ userId: user.id })
            ]);

            if (!userData) {
                return socket.emit('errorMsg', 'Could not find user data.');
            }
            
            // Convert pity data to an easier-to-use object
            const userPity = {};
            userPityData.forEach(pity => {
                userPity[pity.bannerId] = pity;
            });
            
            socket.emit('lobbyData', {
                allCharacters: masterCharacterList, 
                allEffects: masterEffectList, 
                unlockedCharacters: userData.unlockedCharacters,
                username: userData.username,
                elo: userData.elo,
                hoyo: userData.hoyo,
                primogems: userData.primogems,
                missions: allMissions,
                userMissions: userMissions,
                shopItems: allShopItems,
                purchasedShopItems: userData.purchasedShopItems,
                gachaBanners: masterGachaBanners,
                userPity: userPity
            });
        } catch (err) {
            console.error(err);
            socket.emit('errorMsg', 'Error fetching user data.');
        }
    });

    socket.on('findGame', async ({ team, mode }) => {
        console.log(`User ${user.username} is looking for a ${mode} game.`);
        
        if (unrankedPool.some(p => p.id === user.id) || rankedPool.some(p => p.id === user.id)) {
            return socket.emit('log', 'You are already in a queue.');
        }

        const userData = await User.findById(user.id).select('unlockedCharacters elo');
        const isUnique = new Set(team).size === 3;
        const isValid = team.every(id => userData.unlockedCharacters.includes(id)); 

        if (!isUnique || !isValid) {
            return socket.emit('errorMsg', 'Invalid team selection.');
        }

        const player = {
            id: user.id,
            username: user.username,
            socketId: socket.id,
            team: team,
            elo: userData.elo,
            joinedAt: Date.now() 
        };

        if (mode === 'unranked') {
            unrankedPool.push(player);
            socket.emit('log', 'You are in the unranked queue...');
        } else if (mode === 'ranked') {
            rankedPool.push(player);
            socket.emit('log', 'You are in the ranked queue...');
        }
        
        // Send wait event so client knows to show modal (though client opens modal optimistically)
        socket.emit('waitingForMatch'); 

        tryToMakeMatch(mode);
    });
    
    // --- NEW: Cancel Matchmaking ---
    socket.on('cancelMatchmaking', () => {
        // Remove from both pools
        unrankedPool = unrankedPool.filter(p => p.socketId !== socket.id);
        rankedPool = rankedPool.filter(p => p.socketId !== socket.id);
        
        console.log(`User ${user.username} canceled matchmaking.`);
        socket.emit('log', 'Matchmaking canceled.');
        socket.emit('matchmakingCanceled'); // --- ADDED: Notify client to reset UI
    });
    
    // --- UPDATED: submitTurn listener now accepts exchangeQueue ---
    socket.on('submitTurn', async ({ roomId, skillQueue, exchangeQueue }) => {
        const game = gameRooms[roomId];
        if (!game) return socket.emit('errorMsg', 'Game room not found.');

        const currentPlayerSocket = game.players[game.gameState.currentTeamIndex].socketId;
        if (socket.id !== currentPlayerSocket) {
            return socket.emit('errorMsg', 'Not your turn!');
        }
        
        game.gameState.skillQueue = skillQueue;
        // --- PASS THE EXCHANGES TO THE ENGINE ---
        game.gameState.currentTurnExchanges = exchangeQueue || []; 
        
        try {
            const battleLog = await game.endTurn();

            const safeState = game.getSanitizedState();
            io.to(roomId).emit('updateState', safeState);
            
            io.to(roomId).emit('battleLog', battleLog);
            
            if (!game.gameState.gameActive) {
                await processGameOver(game, roomId);
            }
        } catch (err) {
            console.error("Error during endTurn:", err);
            socket.emit('errorMsg', 'A critical error occurred while processing the turn.');
        }
    });

    socket.on('forfeit', async ({ roomId }) => {
        const game = gameRooms[roomId];
        if (!game) return; 

        const playerIndex = game.players.findIndex(p => p && p.socketId === socket.id);
        if (playerIndex === -1) return;

        game.forfeitGame(playerIndex);
        const { winner } = game.gameState;
        const loserName = game.players[playerIndex].username; 
        
        if (winner) {
            console.log(`Player ${user.username} forfeited. ${winner} wins.`);
            io.to(roomId).emit('log', `${loserName} has forfeited. ${winner} wins!`);
            
            const safeState = game.getSanitizedState();
            io.to(roomId).emit('updateState', safeState);
        }
        
        await processGameOver(game, roomId);
    });

    socket.on('disconnect', async () => {
        console.log(`A user disconnected: ${user.username} (${socket.id})`);
        
        unrankedPool = unrankedPool.filter(p => p.socketId !== socket.id);
        rankedPool = rankedPool.filter(p => p.socketId !== socket.id);

        let roomId = null;
        let game = null;
        for (const id in gameRooms) {
            const g = gameRooms[id];
            if (g.players.some(p => p && g.players[0].socketId === socket.id || g.players[1].socketId === socket.id)) {
                roomId = id;
                game = g;
                break;
            }
        }

        if (roomId && game) {
            console.log(`Player ${user.username} from room ${roomId} disconnected.`);
            
            const playerIndex = game.players.findIndex(p => p && p.socketId === socket.id);
            if (playerIndex > -1) {
                game.forfeitGame(playerIndex); 
                
                const { winner } = game.gameState;
                const loserName = game.players[playerIndex].username;

                const otherPlayer = game.players.find(p => p && p.socketId !== socket.id);
                
                if (otherPlayer) {
                    const otherPlayerSocket = io.sockets.sockets.get(otherPlayer.socketId);
                    if (otherPlayerSocket) {
                        if (winner) {
                            otherPlayerSocket.emit('log', `${loserName} disconnected. You win!`);
                            const safeState = game.getSanitizedState();
                            otherPlayerSocket.emit('updateState', safeState);
                        }
                    }
                }
                
                await processGameOver(game, roomId);
            }
        }
    });
});

// --- Matchmaking Function ---
function tryToMakeMatch(mode) {
    let p1 = null;
    let p2 = null;
    const pool = (mode === 'ranked') ? rankedPool : unrankedPool;

    if (pool.length < 2) {
        return; 
    }
    
    if (mode === 'unranked') {
        p1 = pool.shift();
        p2 = pool.shift();
    } 
    else if (mode === 'ranked') {
        pool.sort((a, b) => a.elo - b.elo);
        
        let bestMatchIndex = -1;
        let smallestDiff = Infinity;

        for (let i = 0; i < pool.length - 1; i++) {
            const diff = Math.abs(pool[i].elo - pool[i + 1].elo);
            if (diff < smallestDiff) {
                smallestDiff = diff;
                bestMatchIndex = i;
            }
        }

        if (bestMatchIndex === -1) return; 

        const p1_to_match = pool[bestMatchIndex];
        const p2_to_match = pool[bestMatchIndex + 1];
        const now = Date.now();
        
        const p1_wait = now - p1_to_match.joinedAt;
        const p2_wait = now - p2_to_match.joinedAt;
        
        const ELO_THRESHOLD = 200; 
        const TIME_THRESHOLD = 60000; 

        if (smallestDiff <= ELO_THRESHOLD) {
            const matchedPlayers = pool.splice(bestMatchIndex, 2);
            p1 = matchedPlayers[0];
            p2 = matchedPlayers[1];
        } else if (p1_wait > TIME_THRESHOLD || p2_wait > TIME_THRESHOLD) {
            const matchedPlayers = pool.splice(bestMatchIndex, 2);
            p1 = matchedPlayers[0];
            p2 = matchedPlayers[1];
        } else {
            return;
        }
    }
    
    if (p1 && p2) {
        console.log(`Found a ${mode} match! Creating game...`);

        const p1Socket = io.sockets.sockets.get(p1.socketId);
        const p2Socket = io.sockets.sockets.get(p2.socketId);
        
        if (!p1Socket || !p2Socket) {
            console.log("Error: A player disconnected before the match could be made.");
            if (p1Socket) pool.unshift(p1);
            if (p2Socket) pool.unshift(p2);
            return;
        }

        const roomId = `${p1.socketId}-${p2.socketId}`;
        
        const newGame = new Game(masterCharacterList, masterEffectList); 
        newGame.players[0] = p1; 
        newGame.players[1] = p2;
        newGame.isRanked = (mode === 'ranked'); 
        gameRooms[roomId] = newGame;

        p1Socket.join(roomId);
        p2Socket.join(roomId);

        const startInfo = newGame.startGameWithTeams(p1.team, p2.team);
        
        newGame.gameState.teams[0].name = p1.username;
        newGame.gameState.teams[1].name = p2.username;
        
        p1Socket.emit('gameFound', { 
            roomId: roomId, 
            playerIndex: 0
        });
        p2Socket.emit('gameFound', { 
            roomId: roomId, 
            playerIndex: 1
        });

        io.to(roomId).emit('battleLog', startInfo.startLog);
        io.to(roomId).emit('battleLog', startInfo.gainLog);
        io.to(roomId).emit('battleLog', startInfo.passiveLog);

        const safeState = newGame.getSanitizedState();
        io.to(roomId).emit('updateState', safeState);
    }
}

// --- HELPER: Check Team for Requirements ---
function checkTeamRequirements(team, goal) {
    const reqChars = goal.requiredCharacters || [];
    const reqCats = goal.requiredCategories || [];
    const logic = goal.logic || 'OR'; 

    if (reqChars.length === 0 && reqCats.length === 0) return true;

    let charMatches = 0;
    let catMatches = 0;

    reqChars.forEach(reqId => {
        if (team.includes(reqId)) charMatches++;
    });

    reqCats.forEach(reqCat => {
        const hasCat = team.some(charId => {
            const cData = masterCharacterList[charId];
            return cData && cData.categories && cData.categories.includes(reqCat);
        });
        if (hasCat) catMatches++;
    });

    if (logic === 'AND') {
        if (charMatches < reqChars.length) return false;
        if (catMatches < reqCats.length) return false;
        return true;
    } else {
        return (charMatches > 0 || catMatches > 0);
    }
}

function checkOpponentRequirements(opponentTeam, goal) {
    const oppChars = goal.opponentCharacters || [];
    const oppCats = goal.opponentCategories || [];

    if (oppChars.length === 0 && oppCats.length === 0) return true;

    for (const reqId of oppChars) {
        if (opponentTeam.includes(reqId)) return true;
    }

    for (const reqCat of oppCats) {
        const hasCat = opponentTeam.some(charId => {
            const cData = masterCharacterList[charId];
            return cData && cData.categories && cData.categories.includes(reqCat);
        });
        if (hasCat) return true;
    }

    return false;
}


// --- Game Over Function ---
async function processGameOver(game, roomId) {
    const { winnerId, loserId } = game.gameState; 
    if (!winnerId || !loserId) {
        delete gameRooms[roomId];
        return;
    }

    // History Save
    try {
        const match = new GameMatch({
            isRanked: game.isRanked,
            winnerId: winnerId,
            loserId: loserId,
            player1: { userId: game.players[0].id, characters: game.players[0].team },
            player2: { userId: game.players[1].id, characters: game.players[1].team }
        });
        await match.save();

        console.log(`Match ${roomId} saved to history.`);
    } catch (err) {
        console.error("Error saving match history:", err);
    }
    
    // Identify Teams
    let winnerTeam = [];
    let loserTeam = [];
    if (game.players[0].id.toString() === winnerId.toString()) {
        winnerTeam = game.players[0].team;
        loserTeam = game.players[1].team;
    } else {
        winnerTeam = game.players[1].team;
        loserTeam = game.players[0].team;
    }

    // --- NEW: Fetch STARTING state for requirements ---
    // We fetch these BEFORE updating the DB to get the "Start of Match" snapshot
    let winnerStart = null;
    let loserStart = null;
    try {
        winnerStart = await User.findById(winnerId);
        loserStart = await User.findById(loserId);
    } catch (err) {
        console.error("Error fetching user snapshots:", err);
    }

    // Update Stats & Win Streak (Global)
    if (game.isRanked) {
        await User.findByIdAndUpdate(winnerId, { $inc: { elo: 100 } });
        await User.findByIdAndUpdate(loserId, { $inc: { elo: -50 } });
    }

    // We update streaks in DB, but we don't use the return value for mission logic anymore
    await User.findByIdAndUpdate(winnerId, { $inc: { currentWinStreak: 1 } });
    await User.findByIdAndUpdate(loserId, { $set: { currentWinStreak: 0 } });
    
    // Calculate what the new streak IS based on the snapshot
    // If winnerStart was 5, they just won, so now it's 6.
    const calculatedWinnerStreak = (winnerStart.currentWinStreak || 0) + 1;

    // --- MISSION PROCESSING ---
    try {
        const allMissions = await Mission.find().lean();
        const winnerMissions = await UserMission.find({ userId: winnerId });
        const loserMissions = await UserMission.find({ userId: loserId });

        const getOrInitUserMission = (userId, missionId, list) => {
            let existing = list.find(m => m.missionId === missionId);
            if (!existing) {
                existing = new UserMission({ userId, missionId, progress: {} });
            }
            return existing;
        };

        // --- 1. PROCESS WINNER ---
        for (const mission of allMissions) {
            // A. Check Requirements against SNAPSHOT (Start of Match State)
            if (mission.requirements) {
                if (mission.requirements.minElo > 0 && winnerStart.elo < mission.requirements.minElo) continue;

                // --- UPDATED: Check Multiple Previous IDs ---

                if (mission.requirements.previousMissionIds && mission.requirements.previousMissionIds.length > 0) {

                    const allPrevsMet = mission.requirements.previousMissionIds.every(prevId => {

                        const prev = winnerMissions.find(m => m.missionId === prevId);

                        return prev && prev.isCompleted;

                    });

                    if (!allPrevsMet) continue;
                }
            }

            let userMission = getOrInitUserMission(winnerId, mission.missionId, winnerMissions);
            if (userMission.isCompleted) continue;

            let goalsMet = true;
            let isModified = false;

            for (let i = 0; i < mission.goals.length; i++) {
                const goal = mission.goals[i];
                const goalKey = `goal_${i}`; 
                let currentProgress = userMission.progress.get(goalKey) || 0;

                const teamMatch = checkTeamRequirements(winnerTeam, goal);
                const oppMatch = checkOpponentRequirements(loserTeam, goal);

                if (teamMatch && oppMatch) {
                    if (goal.type === 'WIN_GAMES') {
                        currentProgress++;
                        isModified = true;
                    } else if (goal.type === 'WIN_STREAK') {
                        // Use the calculated streak from the snapshot
                        currentProgress = calculatedWinnerStreak;
                        isModified = true;
                    }
                }
                
                userMission.progress.set(goalKey, currentProgress);
                if (currentProgress < goal.amount) goalsMet = false;
            }

            if (goalsMet) {
                userMission.isCompleted = true;
                isModified = true;
                const winnerPlayer = game.players.find(p => p && p.id.toString() === winnerId.toString());
                if(winnerPlayer) {
                    const s = io.sockets.sockets.get(winnerPlayer.socketId);
                    if (s) s.emit('log', `MISSION COMPLETED: ${mission.name}!`);
                }
            }

            if (isModified || userMission.isNew) {
                await userMission.save();
            }
        }

        // --- 2. PROCESS LOSER (Reset Streaks) ---
        for (const mission of allMissions) {
             if (!mission.goals.some(g => g.type === 'WIN_STREAK')) continue;

             // A. Check Requirements against SNAPSHOT (Start of Match State)
            if (mission.requirements) {
                if (mission.requirements.minElo > 0 && loserStart.elo < mission.requirements.minElo) continue;

                // --- UPDATED: Check Multiple Previous IDs ---

                if (mission.requirements.previousMissionIds && mission.requirements.previousMissionIds.length > 0) {

                    const allPrevsMet = mission.requirements.previousMissionIds.every(prevId => {

                        const prev = loserMissions.find(m => m.missionId === prevId);

                        return prev && prev.isCompleted;

                    });

                    if (!allPrevsMet) continue;
                }
            }

            let userMission = getOrInitUserMission(loserId, mission.missionId, loserMissions);
            if (userMission.isCompleted) continue;
            
            let isModified = false;

            for (let i = 0; i < mission.goals.length; i++) {
                const goal = mission.goals[i];
                if (goal.type !== 'WIN_STREAK') continue;

                const teamMatch = checkTeamRequirements(loserTeam, goal);
                const oppMatch = checkOpponentRequirements(winnerTeam, goal);

                if (teamMatch && oppMatch) {
                    const goalKey = `goal_${i}`;
                    if ((userMission.progress.get(goalKey) || 0) > 0) {
                        userMission.progress.set(goalKey, 0);
                        isModified = true;
                    }
                }
            }

            if (isModified) await userMission.save();
        }

    } catch (err) {
        console.error("Error processing missions:", err);
    }
    
    delete gameRooms[roomId];
}


// --- Game Tick ---
setInterval(() => {
    tryToMakeMatch('ranked');
}, 5000);


// --- Start the Server ---
async function startServer() {
    await loadCharacters();
    await loadEffects(); 
    await loadBanners(); 
    server.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

startServer();
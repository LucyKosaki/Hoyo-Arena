// Active Prototype/audio.js

// --- Audio Assets ---
// Ensure you add 'victory-theme.mp3' and 'defeat-theme.mp3' to your assets folder!
const lobbyMusic = new Audio('assets/bg_music/GGZ_Shopsation.aac');
lobbyMusic.loop = true;
lobbyMusic.volume = 0.3;

const battleMusic = new Audio('assets/bg_music/HSR_Crises.aac');
battleMusic.loop = true;
battleMusic.volume = 0.3;

const victoryMusic = new Audio('assets/bg_music/HI3rd_Y.aac');
victoryMusic.loop = false; // Set to false if you want it to play only once
victoryMusic.volume = 0.4;

const defeatMusic = new Audio('assets/bg_music/HI3rd_Rebirth.aac');
defeatMusic.loop = false;
defeatMusic.volume = 0.4;

// --- Helper: Stop a specific track ---
function stopTrack(track) {
    if (!track.paused) {
        track.pause();
        track.currentTime = 0; // Reset to start
    }
}

// --- Public Functions ---

export function playLobbyMusic() {
    // Stop everything else
    stopTrack(battleMusic);
    stopTrack(victoryMusic);
    stopTrack(defeatMusic);

    // Play Lobby (only if not already playing to prevent restarting/skipping)
    if (lobbyMusic.paused) {
        const playPromise = lobbyMusic.play();



        if (playPromise !== undefined) {

            playPromise.catch(error => {

                console.log("Autoplay prevented. Music will start on first click.");

                // Wait for the user to interact, then play

                document.addEventListener('click', () => {

                    if (lobbyMusic.paused) lobbyMusic.play();

                }, { once: true });

            });

        }
    }
}

export function playBattleMusic() {
    stopTrack(lobbyMusic);
    stopTrack(victoryMusic);
    stopTrack(defeatMusic);

    if (battleMusic.paused) {
        battleMusic.play().catch(e => console.log("Audio error:", e));
    }
}

export function playVictoryMusic() {
    stopTrack(lobbyMusic);
    stopTrack(battleMusic);
    stopTrack(defeatMusic);

    if (victoryMusic.paused) {
        victoryMusic.play().catch(e => console.log("Audio error:", e));
    }
}

export function playDefeatMusic() {
    stopTrack(lobbyMusic);
    stopTrack(battleMusic);
    stopTrack(victoryMusic);

    if (defeatMusic.paused) {
        defeatMusic.play().catch(e => console.log("Audio error:", e));
    }
}
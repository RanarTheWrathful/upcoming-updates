const fs = require('fs');
const path = require('path');

// Detect persistent or fallback path
const persistentPath = fs.existsSync('/var/data') ? '/var/data' : '/tmp';
const stateFile = path.join(persistentPath, 'serverState.json');

console.log(`[ServerState] Using data path: ${stateFile}`);

let serverState = {};

// Function to load server state from file
function loadServerState() {
    try {
        if (fs.existsSync(stateFile)) {
            const data = fs.readFileSync(stateFile, 'utf8');
            serverState = JSON.parse(data);
            console.log('[ServerState] Loaded existing state:', serverState);
        } else {
            console.warn('[ServerState] State file not found, initializing defaults.');
            serverState = {
                loreModeIndex: 0,
                bossWaves: 1,
                modeVotes: [],
                ranarDialog: 0
            };
            saveServerState();
        }
    } catch (err) {
        console.error('[ServerState] Error loading state:', err.message);
        serverState = {
            loreModeIndex: 0,
            bossWaves: 1,
            modeVotes: [],
            ranarDialog: 0
        };
    }
}

// Function to save server state to file
function saveServerState() {
    try {
        fs.writeFileSync(stateFile, JSON.stringify(serverState, null, 2));
        console.log('[ServerState] Saved state.');
    } catch (err) {
        console.error('[ServerState] Error saving state:', err.message);
    }
}

// Function to advance lore mode sequence
function advanceLoreSequence() {
    serverState.loreModeIndex++;
    console.log('[ServerState] Lore Advanced:', serverState.loreModeIndex);
    saveServerState();
}

// Function to reset lore mode index
function resetLoreIndex() {
    serverState.loreModeIndex = 0;
    console.log('[ServerState] Lore index reset.');
    saveServerState();
}

// Initialize server state on startup
loadServerState();

// Function to handle server shutdown
function handleServerShutdown() {
    console.log('[ServerState] Server shutting down, saving state...');
    saveServerState();
}

// Hook into process events for server shutdown
process.on('exit', handleServerShutdown);
process.on('SIGINT', handleServerShutdown);
process.on('SIGTERM', handleServerShutdown);

// Export functions to manipulate server state
module.exports = {
    getServerState: () => serverState,
    setServerState: (newState) => {
        serverState = newState;
        saveServerState();
    },
    advanceLoreSequence,
    resetLoreIndex
};

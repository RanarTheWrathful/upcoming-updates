const fs = require('fs');
  
let serverState = {}; 
   
// Function to load server state from file
function loadServerState() {
    try {  
        let data = fs.readFileSync('serverState.json');
        serverState = JSON.parse(data);
    } catch (err) {
        console.error('Error loading server state:', err.message);
        // Handle error as needed, maybe initialize with default state
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
    fs.writeFileSync('serverState.json', JSON.stringify(serverState, null, 2));
}

// Function to advance lore mode sequence
function advanceLoreSequence() {
    serverState.loreModeIndex++;
  console.log("Lore Advanced: "+serverState.loreModeIndex+".");
    saveServerState();
}

// Function to reset lore mode index
function resetLoreIndex() {
    serverState.loreModeIndex = 0;
    saveServerState();
}
// Initialize server state when this module is first required
loadServerState();

// Function to handle server shutdown
function handleServerShutdown() {
    // Perform any final updates to server state before shutdown
   // serverState.currentMode = "shutdownMode.js"; // Example change
    saveServerState();
}

// Hook into process events for server shutdown
process.on('exit', handleServerShutdown); // Handle normal server exit
process.on('SIGINT', handleServerShutdown); // Handle Ctrl+C in terminal
process.on('SIGTERM', handleServerShutdown); // Handle termination signal

// Export functions to manipulate server state
module.exports = {
    getServerState: () => serverState,
    setServerState: (newState) => {
        serverState = newState;
        saveServerState();
    },
    advanceLoreSequence: advanceLoreSequence,
    resetLoreIndex: resetLoreIndex
};
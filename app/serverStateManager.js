const fs = require('fs');
const path = require('path');
  
let serverState = {}; 
   
// Function to load server state from file
function loadServerState() {
    try {  
        let data = fs.readFileSync(path.join(__dirname, 'serverState.json'));
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
    const target = path.join(__dirname, 'serverState.json');
    const temp = target + '.tmp';
    const data = JSON.stringify(serverState, null, 2);
    fs.writeFileSync(temp, data);
    fs.renameSync(temp, target);
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

// Export functions to manipulate server state
module.exports = {
    getServerState: () => serverState,
    setServerState: (newState) => {
        serverState = newState;
        saveServerState();
    },
    advanceLoreSequence: advanceLoreSequence,
    resetLoreIndex: resetLoreIndex,
    saveServerState: saveServerState,
    handleServerShutdown: handleServerShutdown
};
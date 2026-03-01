const crypto = require('crypto');

// Simulates live weather updates and energy grid demand
// with occasional simulated spikes for testing

let currentTemp = 28.5; // Starts at 28.5 C
let currentDemand = 450; // Starts at 450 MW

function generateMockData() {
    // Add small random noise
    currentTemp += (Math.random() - 0.5) * 0.5;

    // Core relation: higher temp -> higher demand (AC usage etc.)
    // Add some noise to demand as well
    let targetDemand = 400 + (currentTemp - 25) * 20;
    currentDemand += (targetDemand - currentDemand) * 0.2 + (Math.random() - 0.5) * 10;

    // Ensure bounds
    if (currentTemp < 20) currentTemp = 20;
    if (currentTemp > 45) currentTemp = 45;
    if (currentDemand < 200) currentDemand = 200;

    return {
        timestamp: new Date().toISOString(),
        weather: {
            temperature: parseFloat(currentTemp.toFixed(2)),
            humidity: Math.floor(60 + Math.random() * 20),
            location: 'Aba, Nigeria'
        },
        grid: {
            demandMW: parseFloat(currentDemand.toFixed(2)),
            status: currentDemand > 600 ? 'WARNING' : 'NORMAL'
        }
    };
}

// Function to call to forcefully override data and simulate a spike
function simulateSpike() {
    currentTemp += 10; // Instant 10 degree jump
    return generateMockData();
}

module.exports = {
    generateMockData,
    simulateSpike
};

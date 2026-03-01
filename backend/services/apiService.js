const regionMapping = require('./regionMapping');

// In-memory cache replacing Redis for this environment
// Structure: { 'COAS': { data }, 'PJM': { data }, ... }
const regionCache = {};

// We also keep baseline "realData" for the heartbeat fluctuations, separated by region.
const realDataRegistry = {};

// Initialize the cache and registry for all supported regions
for (const regionId of Object.keys(regionMapping)) {
    regionCache[regionId] = [];
    realDataRegistry[regionId] = {
        temperature: 25,
        humidity: 50,
        demandMW: 5000,
        currentTemp: 25,
        currentDemand: 5000
    };
}

/**
 * Concurrently fetches both EIA and OpenWeather APIs for a given region.
 * Uses Promise.all to optimize network time.
 */
async function fetchRegionData(regionId) {
    const region = regionMapping[regionId];
    if (!region) return;

    const weatherApiKey = process.env.WEATHER_API_KEY;
    const eiaApiKey = process.env.EIA_API_KEY;

    try {
        const fetchPromises = [
            // EIA API fetching
            eiaApiKey ? fetch(`https://api.eia.gov/v2/electricity/rto/region-sub-ba-data/data/?frequency=hourly&data[0]=value&facets[subba][]=${region.eiaFacet}&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=5&api_key=${eiaApiKey}`).then(r => r.json()) : Promise.resolve(null),

            // OpenWeather API fetching
            weatherApiKey ? fetch(`https://api.openweathermap.org/data/2.5/weather?q=${region.weatherCity}&appid=${weatherApiKey}&units=metric`).then(r => r.json()) : Promise.resolve(null)
        ];

        const [eiaJson, weatherJson] = await Promise.all(fetchPromises);

        let newRealData = { ...realDataRegistry[regionId] };

        // Process Weather
        if (weatherJson && weatherJson.main) {
            newRealData.temperature = weatherJson.main.temp;
            newRealData.humidity = weatherJson.main.humidity;
            console.log(`[${regionId}] Weather updated: ${newRealData.temperature}°C in ${region.weatherCity}`);
        }

        // Process EIA
        if (eiaJson && eiaJson.response && eiaJson.response.data) {
            const validData = eiaJson.response.data.find(d => d.value !== null && d.value !== undefined);
            if (validData) {
                newRealData.demandMW = validData.value;
                console.log(`[${regionId}] EIA Grid Demand updated: ${newRealData.demandMW} MW`);
            }
        }

        // Snap the current simulation anchors directly to the new real data
        newRealData.currentTemp = newRealData.temperature;
        newRealData.currentDemand = newRealData.demandMW;

        realDataRegistry[regionId] = newRealData;

    } catch (err) {
        console.error(`[${regionId}] Failed to fetch APIs:`, err.message);
    }
}

/**
 * Fetches data for ALL registered regions.
 */
async function fetchAllRegions() {
    console.log("Fetching real data from APIs for all regions...");
    const fetchJobs = Object.keys(regionMapping).map(regionId => fetchRegionData(regionId));
    await Promise.all(fetchJobs);
    console.log("Completed concurrent fetch for all regions.");
}

/**
 * Generates the "live" heartbeat data based on the real baseline.
 * Returns the individual data point to be pushed via WebSocket.
 */
function generateLiveData(regionId) {
    const registry = realDataRegistry[regionId];
    if (!registry) return null;

    // Slowly drift toward the real value, with small noise
    registry.currentTemp += (registry.temperature - registry.currentTemp) * 0.1 + (Math.random() - 0.5) * 0.1;
    registry.currentDemand += (registry.demandMW - registry.currentDemand) * 0.1 + (Math.random() - 0.5) * 5;

    // Bounds
    if (registry.currentTemp < -20) registry.currentTemp = -20;
    if (registry.currentTemp > 60) registry.currentTemp = 60;
    if (registry.currentDemand < 0) registry.currentDemand = 0;

    const isWarning = registry.currentDemand > (registry.demandMW * 1.2);

    const dataPoint = {
        timestamp: new Date().toISOString(),
        regionId: regionId,
        displayName: regionMapping[regionId].displayName,
        weather: {
            temperature: parseFloat(Number(registry.currentTemp).toFixed(2)),
            humidity: registry.humidity,
            location: regionMapping[regionId].weatherCity
        },
        grid: {
            demandMW: parseFloat(Number(registry.currentDemand).toFixed(2)),
            status: isWarning ? 'WARNING' : 'NORMAL'
        }
    };

    // Store in our in-memory "Redis-like" rolling cache (last 20 items per region)
    regionCache[regionId].push(dataPoint);
    if (regionCache[regionId].length > 20) {
        regionCache[regionId].shift();
    }

    return dataPoint;
}

/**
 * Simulates a heat spike for a specific region.
 */
function simulateSpike(regionId) {
    const registry = realDataRegistry[regionId];
    if (registry) {
        registry.currentTemp += 10;
        registry.currentDemand += registry.demandMW * 0.3;
    }
    return generateLiveData(regionId);
}

/**
 * Resets a region's simulated heat spike back to its real baseline.
 */
function resetSpike(regionId) {
    const registry = realDataRegistry[regionId];
    if (registry) {
        // Snap back to true API values
        registry.currentTemp = registry.temperature;
        registry.currentDemand = registry.demandMW;
    }
    return generateLiveData(regionId);
}

// Initial fetch and scheduled interval mapping (every 15 minutes)
fetchAllRegions();
setInterval(fetchAllRegions, 15 * 60 * 1000);

module.exports = {
    regionMapping,
    regionCache,
    generateLiveData,
    simulateSpike,
    resetSpike
};

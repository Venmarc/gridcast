import { regionMapping } from './regionMapping';

// Use global to persist in-memory cache across Next.js API route handler invocations.
// In a true serverless environment, this is instance-scoped, but for a portfolio demo this is fine.
const globalMemory = global || globalThis;

if (!globalMemory.regionCache) globalMemory.regionCache = {};
if (!globalMemory.realDataRegistry) globalMemory.realDataRegistry = {};
if (!globalMemory.lastFetchTimes) globalMemory.lastFetchTimes = {};
if (globalMemory.isFetching === undefined) globalMemory.isFetching = false;

// Initialize missing regions in registries
for (const regionId of Object.keys(regionMapping)) {
    if (!globalMemory.regionCache[regionId]) globalMemory.regionCache[regionId] = [];
    if (globalMemory.lastFetchTimes[regionId] === undefined) globalMemory.lastFetchTimes[regionId] = 0;
    if (!globalMemory.realDataRegistry[regionId]) {
        globalMemory.realDataRegistry[regionId] = {
            temperature: 25,
            humidity: 50,
            demandMW: 5000,
            currentTemp: 25,
            currentDemand: 5000,
            hasRealData: false
        };
    }
}

export const regionCache = globalMemory.regionCache;
export const realDataRegistry = globalMemory.realDataRegistry;

export async function fetchRegionData(regionId) {
    const region = regionMapping[regionId];
    if (!region) return;

    const weatherApiKey = process.env.WEATHER_API_KEY;
    const eiaApiKey = process.env.EIA_API_KEY;

    try {
        const fetchPromises = [
            eiaApiKey ? fetch(`https://api.eia.gov/v2/electricity/rto/region-sub-ba-data/data/?frequency=hourly&data[0]=value&facets[subba][]=${region.eiaFacet}&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=5&api_key=${eiaApiKey}`).then(r => r.json()) : Promise.resolve(null),
            weatherApiKey ? fetch(`https://api.openweathermap.org/data/2.5/weather?q=${region.weatherCity}&appid=${weatherApiKey}&units=metric`).then(r => r.json()) : Promise.resolve(null)
        ];

        const [eiaJson, weatherJson] = await Promise.all(fetchPromises);
        let newRealData = { ...realDataRegistry[regionId] };

        if (weatherJson && weatherJson.main) {
            newRealData.temperature = weatherJson.main.temp;
            newRealData.humidity = weatherJson.main.humidity;
            console.log(`[${regionId}] Weather updated: ${newRealData.temperature}°C`);
        }

        if (eiaJson && eiaJson.response && eiaJson.response.data) {
            const validData = eiaJson.response.data.find(d => d.value !== null && d.value !== undefined);
            if (validData) {
                newRealData.demandMW = Number(validData.value);
                console.log(`[${regionId}] EIA Grid Demand updated: ${newRealData.demandMW} MW`);
            }
        }

        newRealData.currentTemp = newRealData.temperature;
        newRealData.currentDemand = newRealData.demandMW;
        newRealData.hasRealData = true;

        realDataRegistry[regionId] = newRealData;
        globalMemory.lastFetchTimes[regionId] = Date.now();

    } catch (err) {
        console.error(`[${regionId}] Failed to fetch APIs:`, err.message);
    }
}

export async function ensureDataFetched(targetRegionId = null) {
    const now = Date.now();
    const FETCH_INTERVAL = 15 * 60 * 1000;

    // Prevent concurrent fetch cycles
    if (globalMemory.isFetching) return;

    if (targetRegionId) {
        // Optimized: Only fetch the requested region if stale
        if (now - (globalMemory.lastFetchTimes[targetRegionId] || 0) > FETCH_INTERVAL) {
            console.log(`[${targetRegionId}] Fetching data (lazy load)...`);
            globalMemory.isFetching = true;
            try {
                await fetchRegionData(targetRegionId);
            } finally {
                globalMemory.isFetching = false;
            }
        }
    } else {
        // Fallback: Check all regions (rarely used now)
        const regionsToFetch = Object.keys(regionMapping).filter(
            id => now - (globalMemory.lastFetchTimes[id] || 0) > FETCH_INTERVAL
        );

        if (regionsToFetch.length > 0) {
            console.log(`Refreshing ${regionsToFetch.length} stale regions...`);
            globalMemory.isFetching = true;
            try {
                const fetchJobs = regionsToFetch.map(id => fetchRegionData(id));
                await Promise.allSettled(fetchJobs);
            } finally {
                globalMemory.isFetching = false;
            }
        }
    }
}

export function generateLiveData(regionId) {
    const registry = realDataRegistry[regionId];
    if (!registry || !registry.hasRealData) return null;

    // Throttle cache pushes to once per second to prevent pollution from multiple SSE connections.
    // Each connection will still get the latest simulated pulse, but the shared history won't 
    // grow at 2x/3x speed if multiple tabs are open.
    const lastPoint = regionCache[regionId][regionCache[regionId].length - 1];
    const now = Date.now();
    const isNewTick = !lastPoint || (now - new Date(lastPoint.timestamp).getTime() > 1000);

    registry.currentTemp += (registry.temperature - registry.currentTemp) * 0.1 + (Math.random() - 0.5) * 0.1;
    registry.currentDemand += (registry.demandMW - registry.currentDemand) * 0.1 + (Math.random() - 0.5) * 5;

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

    if (isNewTick) {
        regionCache[regionId].push(dataPoint);
        if (regionCache[regionId].length > 20) {
            regionCache[regionId].shift();
        }
    }

    return dataPoint;
}

export function simulateSpike(regionId) {
    const registry = realDataRegistry[regionId];
    if (registry) {
        registry.currentTemp += 10;
        registry.currentDemand += registry.demandMW * 0.3;
    }
    return generateLiveData(regionId);
}

export function resetSpike(regionId) {
    const registry = realDataRegistry[regionId];
    if (registry) {
        registry.currentTemp = registry.temperature;
        registry.currentDemand = registry.demandMW;
    }
    return generateLiveData(regionId);
}

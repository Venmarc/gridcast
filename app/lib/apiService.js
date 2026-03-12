import axios from 'axios';
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
        let eiaUrl = '';
        if (region.eiaType === 'subba') {
            eiaUrl = `https://api.eia.gov/v2/electricity/rto/region-sub-ba-data/data/?frequency=hourly&data[0]=value&facets[subba][]=${region.eiaFacet}&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=1&api_key=${eiaApiKey}`;
        } else {
            // Default to Balancing Authority (BA) endpoint
            eiaUrl = `https://api.eia.gov/v2/electricity/rto/region-data/data/?frequency=hourly&data[0]=value&facets[respondent][]=${region.eiaFacet}&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=1&api_key=${eiaApiKey}`;
        }

        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${region.weatherCity}&appid=${weatherApiKey}&units=metric`;

        const axiosOptions = { timeout: 10000 };

        const [eiaRes, weatherRes] = await Promise.all([
            eiaApiKey ? axios.get(eiaUrl, axiosOptions).catch(err => {
                console.error(`[${regionId}] EIA Fetch failed:`, err.message);
                return null;
            }) : Promise.resolve(null),
            weatherApiKey ? axios.get(weatherUrl, axiosOptions).catch(err => {
                console.error(`[${regionId}] Weather Fetch failed:`, err.message);
                return null;
            }) : Promise.resolve(null)
        ]);

        let newRealData = { ...realDataRegistry[regionId] };

        if (weatherRes && weatherRes.data && weatherRes.data.main) {
            newRealData.temperature = weatherRes.data.main.temp;
            newRealData.humidity = weatherRes.data.main.humidity;
            console.log(`[${regionId}] Weather updated: ${newRealData.temperature}°C`);
        }

        if (eiaRes && eiaRes.data && eiaRes.data.response && eiaRes.data.response.data) {
            const validData = eiaRes.data.response.data.find(d => d.value !== null && d.value !== undefined);
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
                for (const id of regionsToFetch) {
                    await fetchRegionData(id);
                    await new Promise(r => setTimeout(r, 200)); // Rate limiting buffer
                }
            } finally {
                globalMemory.isFetching = false;
            }
        }
    }
}

// Dedicated background poller. Designed to be called frequently but only
// fetch a very small number of regions at a time to stay under rate limits.
export async function triggerBackgroundPoll(activeRegionId) {
    if (globalMemory.isFetching) return;

    const now = Date.now();
    // In background, we consider data stale after 5 minutes (300000ms)
    // to keep it responsive enough for anomaly detection.
    const BACKGROUND_FETCH_INTERVAL = 300000;

    // Find all regions that need an update, absolutely prioritizing the active one.
    // Exclude the activeRegionId from the background list since SSE handles it.
    let staleRegions = Object.keys(regionMapping).filter(id => 
        id !== activeRegionId && 
        now - (globalMemory.lastFetchTimes[id] || 0) > BACKGROUND_FETCH_INTERVAL
    );

    // Sort by oldest fetch time first
    staleRegions.sort((a, b) => {
        return (globalMemory.lastFetchTimes[a] || 0) - (globalMemory.lastFetchTimes[b] || 0);
    });

    if (staleRegions.length > 0) {
        // Only grab the 2 oldest regions to fetch in this cycle.
        // This spreads the load out over many minutes.
        const batch = staleRegions.slice(0, 2);
        
        console.log(`[Background] Polling ${batch.length} stale regions: ${batch.join(', ')}`);
        globalMemory.isFetching = true;
        try {
            for (const id of batch) {
                await fetchRegionData(id);
                await new Promise(r => setTimeout(r, 500)); // Be gentle with EIA
            }
        } finally {
            globalMemory.isFetching = false;
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

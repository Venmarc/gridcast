import { realDataRegistry, triggerBackgroundPoll, regionCache } from '@/app/lib/apiService';
import { regionMapping } from '@/app/lib/regionMapping';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const body = await request.json();
        const activeRegionId = body.activeRegionId;
        const baselines = body.baselines || {};

        // 1. Kick off background data harvesting (non-blocking, fire-and-forget)
        triggerBackgroundPoll(activeRegionId).catch(console.error);

        const anomalies = [];

        // 2. Evaluate all regions against the provided baselines
        for (const [regionId, data] of Object.entries(realDataRegistry)) {
            // Skip the region the user is currently looking at
            if (regionId === activeRegionId) continue;
            
            // Skip if no real data has been fetched yet
            if (!data.hasRealData) continue;
            
            // Check if we even have a recent point generated in the cache
            const cache = regionCache[regionId];
            if (!cache || cache.length === 0) continue;
            
            // To ensure we don't alert purely based on the raw EIA fetch that isn't
            // fully 'smoothed' into the current simulation state, we use the registry's
            // current values (which are slightly smoothed on the server side on requests).
            const currentTempF = (data.currentTemp * 9 / 5) + 32;
            const currentDemand = data.currentDemand;

            let baseline = 细; // fallback

            // If a baseline was provided by the client, use it.
            if (baselines[regionId] && baselines[regionId].tempF !== null) {
                const tempDiff = currentTempF - baselines[regionId].tempF;
                const demandDiff = currentDemand - baselines[regionId].demandMW;

                let triggered = false;
                let alertType = null;
                let alertMessage = '';

                // Temp Spike Detection (>= 5.0 F difference)
                if (Math.abs(tempDiff) >= 5.0) {
                    triggered = true;
                    alertType = 'TEMP';
                    alertMessage = `Sudden temperature shift detected. Changed by ${tempDiff > 0 ? '+' : ''}${tempDiff.toFixed(1)}°F from baseline.`;
                }
                
                // Demand Spike Detection (>= 200 MW difference)
                // If both trigger, prioritize Grid Demand alert as it's more critical
                if (Math.abs(demandDiff) >= 200) {
                    triggered = true;
                    alertType = 'GRID';
                    alertMessage = `Critical demand fluctuation detected. Load shifted by ${demandDiff > 0 ? '+' : ''}${Math.round(demandDiff)} MW.`;
                }

                if (triggered) {
                    anomalies.push({
                        regionId,
                        displayName: regionMapping[regionId]?.displayName || regionId,
                        type: alertType,
                        message: alertMessage,
                        newBaseline: { tempF: currentTempF, demandMW: currentDemand }
                    });
                }
            } else {
                // Initialize a baseline for the client to track next time
                anomalies.push({
                    regionId,
                    type: 'INIT', // special type instructing client to just save the baseline
                    newBaseline: { tempF: currentTempF, demandMW: currentDemand }
                });
            }
        }

        return Response.json({ anomalies });
    } catch (error) {
        console.error("Global Status Check Failed:", error);
        return Response.json({ error: "Internal Server Error", anomalies: [] }, { status: 500 });
    }
}

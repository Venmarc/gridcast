import { NextResponse } from 'next/server';
import { regionCache, ensureDataFetched } from '@/app/lib/apiService';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');

    // Make sure initial background data has been fetched for this specific region
    await ensureDataFetched(regionId);

    if (!regionId || !regionCache[regionId]) {
        return NextResponse.json({ error: "Invalid or missing Region ID" }, { status: 400 });
    }

    // Filter out stale cache entries (e.g. older than 2 minutes)
    // If a region was not visited recently, its history gets stale and causes a false anomaly jump.
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    regionCache[regionId] = regionCache[regionId].filter(
        data => new Date(data.timestamp).getTime() > twoMinutesAgo
    );

    return NextResponse.json(regionCache[regionId]);
}

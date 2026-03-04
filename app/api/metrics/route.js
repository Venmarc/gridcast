import { NextResponse } from 'next/server';
import { regionCache, ensureDataFetched } from '@/app/lib/apiService';

export async function GET(request) {
    // Make sure initial background data has been fetched if cache is empty
    await ensureDataFetched();

    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');

    if (!regionId || !regionCache[regionId]) {
        return NextResponse.json({ error: "Invalid or missing Region ID" }, { status: 400 });
    }

    return NextResponse.json(regionCache[regionId]);
}

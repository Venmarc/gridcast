import { NextResponse } from 'next/server';
import { resetSpike } from '@/app/lib/apiService';

export async function POST(request) {
    try {
        const body = await request.json();
        const { regionId } = body;

        if (!regionId) {
            return NextResponse.json({ error: "Missing regionId" }, { status: 400 });
        }

        const data = resetSpike(regionId);
        return NextResponse.json({ message: 'Spike reset', data });

    } catch (err) {
        return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }
}

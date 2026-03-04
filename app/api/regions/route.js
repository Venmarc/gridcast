import { NextResponse } from 'next/server';
import { regionMapping } from '@/app/lib/regionMapping';

export async function GET() {
    return NextResponse.json(Object.values(regionMapping));
}

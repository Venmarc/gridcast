export const dynamic = 'force-dynamic';

import { ensureDataFetched, generateLiveData } from '@/app/lib/apiService';

export async function GET(request) {
    // 1. Initial Data Fetch
    await ensureDataFetched();

    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');

    if (!regionId) {
        return new Response('Missing regionId', { status: 400 });
    }

    // 2. Set headers for SSE
    const headers = new Headers({
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache, no-transform',
    });

    // 3. Create a TransformStream to send data back to the client
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const encoder = new TextEncoder();

    // Helper to send data
    const sendEvent = async (data) => {
        try {
            await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (err) {
            console.error('SSE write error:', err);
        }
    };

    // 4. Send the initial pulse
    const initialData = generateLiveData(regionId);
    if (initialData) {
        await sendEvent(initialData);
    }

    // 5. Setup Interval to stream new data every 2 seconds
    const intervalId = setInterval(async () => {
        const data = generateLiveData(regionId);
        if (data) {
            await sendEvent(data);
        }
    }, 2000);

    // 6. Cleanup if client disconnects
    request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        writer.close().catch(() => { });
        console.log(`SSE Client disconnected from ${regionId}`);
    });

    return new Response(stream.readable, { headers });
}

export const dynamic = 'force-dynamic';

import { ensureDataFetched, generateLiveData } from '@/app/lib/apiService';

export function GET(request) {
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');

    if (!regionId) {
        return new Response('Missing regionId', { status: 400 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (data) => {
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                } catch (err) {
                    console.error('SSE enqueue error:', err);
                }
            };

            // Kick off data fetch without blocking the response
            ensureDataFetched().catch(console.error);

            // Send initial pulse
            const initialData = generateLiveData(regionId);
            if (initialData) {
                sendEvent(initialData);
            }

            // Stream new data every 2 seconds
            const intervalId = setInterval(() => {
                const data = generateLiveData(regionId);
                if (data) {
                    sendEvent(data);
                }
            }, 2000);

            request.signal.addEventListener('abort', () => {
                clearInterval(intervalId);
                try {
                    controller.close();
                } catch (e) { }
                console.log(`SSE Client disconnected from ${regionId}`);
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache, no-transform',
            'X-Accel-Buffering': 'no',
        },
    });
}

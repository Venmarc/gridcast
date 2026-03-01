require('dotenv').config({ path: '../.env' });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { regionMapping, regionCache, generateLiveData, simulateSpike } = require('./services/apiService');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Endpoint to fetch available regions for the frontend dropdown
app.get('/api/regions', (req, res) => {
    res.json(Object.values(regionMapping));
});

// Endpoint to fetch the current historical cache for a region
app.get('/api/metrics/:regionId', (req, res) => {
    const { regionId } = req.params;
    if (regionCache[regionId]) {
        return res.json(regionCache[regionId]);
    }
    res.status(404).json({ error: "Region not found" });
});

// Endpoint to trigger a manual spike from the Antigravity browser/terminal
app.post('/api/simulate-spike', (req, res) => {
    const { regionId } = req.body;
    if (!regionId || !regionMapping[regionId]) {
        return res.status(400).json({ error: "Invalid region ID" });
    }

    // Trigger spike and get new point
    const data = simulateSpike(regionId);

    // Immediately emit to all connected clients in this region's room
    io.to(regionId).emit('grid_update', data);

    res.json({ message: 'Spike simulated', data });
});

// Polling and WebSocket broadcasting loop
// We broadcast a "live heartbeat" to all active rooms every 2 seconds
const POLLING_INTERVAL = 2000;

setInterval(() => {
    for (const regionId of Object.keys(regionMapping)) {
        // Generate the next live datapoint and advance the cache window
        const data = generateLiveData(regionId);

        // Broadcast via WebSockets ONLY to clients subscribed to this region
        io.to(regionId).emit('grid_update', data);
    }
}, POLLING_INTERVAL);

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    let currentRoom = null;

    // Listen for room subscription events
    socket.on('subscribe_region', (regionId) => {
        if (!regionMapping[regionId]) return;

        // Unsubscribe from previous room if exists
        if (currentRoom) {
            socket.leave(currentRoom);
        }

        // Join new room
        socket.join(regionId);
        currentRoom = regionId;
        console.log(`Client ${socket.id} subscribed to region ${regionId}`);

        // Immediately send them the current cache history for this region so the graph loads instantly
        socket.emit('grid_history', regionCache[regionId]);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    console.log(`EIA API Key loaded (first 5 chars): ${process.env.EIA_API_KEY ? process.env.EIA_API_KEY.substring(0, 5) : 'None'}`);
    console.log(`Weather API Key loaded (first 5 chars): ${process.env.WEATHER_API_KEY ? process.env.WEATHER_API_KEY.substring(0, 5) : 'None'}`);
});

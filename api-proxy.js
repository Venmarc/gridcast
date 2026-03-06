const express = require('express');
const axios = require('axios');
const app = express();
const port = 3005;

app.get('/proxy', async (req, res) => {
    try {
        const url = req.query.url;
        if (!url) return res.status(400).send('URL required');

        console.log('Proxying:', url);
        // Force IPv4 in Axios
        const response = await axios.get(url, {
            family: 4,
            timeout: 8000
        });

        res.json(response.data);
    } catch (error) {
        console.error('Proxy Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Local IPv4 Proxy Server running on port ${port}`);
});

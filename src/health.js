const express = require('express');
const path = require('path');

// Initialize Express app
const app = express();
const PORT = 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve status page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'status.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Health Server] Status page available on port ${PORT}`);
});

module.exports = app;

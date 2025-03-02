const express = require('express');
const path = require('path');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Serve status page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'status.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Health Server] Status page and health check available on port ${PORT}`);
    console.log(`[Health Server] Health check endpoint: http://0.0.0.0:${PORT}/health`);
});

module.exports = app;
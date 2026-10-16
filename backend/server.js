const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Root test endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Personal AI Assistant Backend API',
    status: 'online'
  });
});

// Health check endpoint for clients (such as the mobile app)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Personal AI Assistant backend is up and running!',
    timestamp: new Date().toISOString()
  });
});

// Start listening
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
  console.log(`Health check route: http://localhost:${PORT}/api/health`);
});

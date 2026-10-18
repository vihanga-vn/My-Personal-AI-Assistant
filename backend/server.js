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

// Database connection
const { connectDB } = require('./config/db');

// Routes
const chatRoutes = require('./routes/chat');
const conversationRoutes = require('./routes/conversations');
const memoryRoutes = require('./routes/memories');
const taskRoutes = require('./routes/tasks');

app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/tasks', taskRoutes);

// Start listening
app.listen(PORT, async () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
  console.log(`Health check route: http://localhost:${PORT}/api/health`);
  console.log(`Chat endpoint: POST http://localhost:${PORT}/api/chat`);
  console.log(`Conversations endpoint: http://localhost:${PORT}/api/conversations`);
  console.log(`Memories endpoint: http://localhost:${PORT}/api/memories`);
  console.log(`Tasks endpoint: http://localhost:${PORT}/api/tasks`);

  // Connect to MongoDB Atlas
  await connectDB();
});

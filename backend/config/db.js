const mongoose = require('mongoose');

/**
 * MongoDB Atlas Connection Module using Mongoose.
 * Reads MONGODB_URI from environment variables.
 */

let isConnected = false;

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim() === '') {
    console.warn('[MongoDB] MONGODB_URI is not set in environment variables. Running in memory-only mode.');
    return false;
  }

  // Ensure database name is included if URI ends with '/' or '.net/'
  let connectionUri = uri.trim();
  if (connectionUri.endsWith('.mongodb.net/') || connectionUri.endsWith('.mongodb.net')) {
    connectionUri = connectionUri.replace(/\/$/, '') + '/personal_assistant?retryWrites=true&w=majority';
  }

  try {
    const conn = await mongoose.connect(connectionUri, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = conn.connection.readyState === 1;
    console.log(`[MongoDB] Atlas connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return true;
  } catch (error) {
    isConnected = false;
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    if (error.message.includes('authentication failed')) {
      console.error('[MongoDB Tip]: Bad auth error. Please verify your database username and password in MongoDB Atlas > Database Access.');
    }
    return false;
  }
}

async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[MongoDB] Disconnected.');
  }
}

function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = {
  connectDB,
  disconnectDB,
  isDBConnected,
};

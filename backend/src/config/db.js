const mongoose = require('mongoose');

const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 2000;

let isEventListenerAttached = false;

const attachConnectionEventListeners = () => {
  if (isEventListenerAttached) return;
  isEventListenerAttached = true;

  mongoose.connection.on('connected', () => {
    console.log('[Database] MongoDB connection established');
  });

  mongoose.connection.on('error', (err) => {
    console.error(`[Database Error] MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[Database Warning] MongoDB disconnected. Auto-reconnect initiated...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[Database] MongoDB reconnected successfully');
  });
};

/**
 * Connect to MongoDB with auto-reconnect backoff logic.
 * @param {number} maxRetries - Maximum number of connection retry attempts (default: 5)
 * @param {number} retryInterval - Milliseconds between connection attempts (default: 2000ms)
 * @returns {Promise<mongoose.Connection>}
 */
const connectDB = async (maxRetries = MAX_RETRIES, retryInterval = RETRY_INTERVAL_MS) => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dogfood';

  attachConnectionEventListeners();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(
        `[Database Error] Connection attempt ${attempt}/${maxRetries} failed: ${error.message}`
      );

      if (attempt < maxRetries) {
        console.log(`[Database] Retrying connection in ${retryInterval / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
      } else {
        console.error(
          `[Database Error] Max retries (${maxRetries}) reached. Unable to connect to MongoDB.`
        );
        if (process.env.NODE_ENV !== 'test') {
          process.exit(1);
        }
        throw error;
      }
    }
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('[Database] MongoDB disconnected cleanly');
  } catch (error) {
    console.error(`[Database Error] Error during disconnection: ${error.message}`);
  }
};

connectDB.connectDB = connectDB;
connectDB.disconnectDB = disconnectDB;
module.exports = connectDB;


const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sattwik-kitchen';
  try {
    await mongoose.connect(uri);
    console.log('[sattwik] MongoDB connected');
  } catch (err) {
    console.error('[sattwik] MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;

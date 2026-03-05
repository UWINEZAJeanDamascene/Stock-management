const mongoose = require('mongoose');

const connectWithFallback = async (primaryUri, fallbackUri, maxRetries = 1) => {
  const tryConnect = async (uri, isFallback = false) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting to connect to ${isFallback ? 'local MongoDB' : 'MongoDB Atlas'}...`);
        const conn = await mongoose.connect(uri);
        return { success: true, conn, uri };
      } catch (error) {
        console.error(`Connection attempt ${attempt} failed: ${error.message}`);
        if (attempt < maxRetries) {
          console.log('Retrying in 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    return { success: false, error: error.message };
  };

  // Try primary (Atlas) first
  console.log('Trying MongoDB Atlas connection...');
  const primaryResult = await tryConnect(primaryUri, false);
  
  if (primaryResult.success) {
    console.log(`MongoDB Atlas Connected: ${primaryResult.conn.connection.host}`);
    return primaryResult.conn;
  }

  // Check if it's a connection refusal error (ECONNREFUSED)
  const isConnectionRefused = primaryResult.error && (
    primaryResult.error.includes('ECONNREFUSED') || 
    primaryResult.error.includes('ENOTFOUND') ||
    primaryResult.error.includes('querySrv')
  );

  if (isConnectionRefused) {
    console.log('MongoDB Atlas unreachable. Falling back to local MongoDB...');
    const fallbackResult = await tryConnect(fallbackUri, true);
    
    if (fallbackResult.success) {
      console.log(`Local MongoDB Connected: ${fallbackResult.conn.connection.host}`);
      return fallbackResult.conn;
    }
    
    console.error('Failed to connect to local MongoDB as well.');
  }

  console.error('All connection attempts failed.');
  process.exit(1);
};

const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI;
  const fallbackUri = process.env.MONGODB_URI_LOCAL;

  if (!primaryUri || !fallbackUri) {
    console.error('Missing MongoDB URI configuration in .env file');
    process.exit(1);
  }

  const conn = await connectWithFallback(primaryUri, fallbackUri);

  // Connection events
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
  });

  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  });
};

module.exports = connectDB;

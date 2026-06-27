import mongoose from 'mongoose';

mongoose.set('strictQuery', true);

/**
 * Connect to MongoDB. Retries are intentionally left to the operator /
 * process manager; we fail fast with a clear message on first connect.
 */
export async function connectDB(uri) {
  if (!uri) throw new Error('MONGO_URI is not defined');
  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
  });
  // eslint-disable-next-line no-console
  console.log(`✓ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

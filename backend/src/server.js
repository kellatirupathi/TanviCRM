import 'dotenv/config';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB(process.env.MONGO_URI);
    const app = createApp();
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`✓ TanviCRM API running on http://localhost:${PORT}`);
      // eslint-disable-next-line no-console
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('✗ Failed to start server:', err.message);
    process.exit(1);
  }
}

start();

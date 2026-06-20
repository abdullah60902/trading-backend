import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { seedDefaultSettings } from './models/Settings';
import { startStakingCron } from './utils/cron';
import http from 'http';
import { initSocket } from './utils/socket';

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Seed default configurations
    await seedDefaultSettings();

    // 3. Start Yield Cron jobs
    startStakingCron();

    // 4. Create HTTP server and initialize Socket.io
    const server = http.createServer(app);
    initSocket(server);

    // 5. Listen to incoming requests
    server.listen(env.PORT, () => {
      console.log(`=========================================`);
      console.log(`🚀 Crypto Platform Server running!`);
      console.log(`🔌 Mode: ${env.NODE_ENV}`);
      console.log(`⚡ Port: ${env.PORT}`);
      console.log(`=========================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const env_1 = require("./config/env");
const Settings_1 = require("./models/Settings");
const cron_1 = require("./utils/cron");
const http_1 = __importDefault(require("http"));
const socket_1 = require("./utils/socket");
const startServer = async () => {
    try {
        // 1. Connect to MongoDB
        await (0, db_1.connectDB)();
        // 2. Seed default configurations
        await (0, Settings_1.seedDefaultSettings)();
        // 3. Start Yield Cron jobs
        (0, cron_1.startStakingCron)();
        // 4. Create HTTP server and initialize Socket.io
        const server = http_1.default.createServer(app_1.default);
        (0, socket_1.initSocket)(server);
        // 5. Listen to incoming requests on 0.0.0.0 for Docker environments
        server.listen(env_1.env.PORT, '0.0.0.0', () => {
            console.log(`=========================================`);
            console.log(`🚀 Crypto Platform Server running!`);
            console.log(`🔌 Mode: ${env_1.env.NODE_ENV}`);
            console.log(`⚡ Port: ${env_1.env.PORT}`);
            console.log(`=========================================`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();

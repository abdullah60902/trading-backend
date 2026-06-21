"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./config/db");
const User_1 = require("./models/User");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const fixRoles = async () => {
    try {
        await (0, db_1.connectDB)();
        console.log('MongoDB connected.');
        const result = await User_1.User.updateMany({ role: { $in: ['admin', 'superadmin'] } }, { $set: { role: 'user' } });
        console.log(`Updated ${result.modifiedCount} users to 'user' role.`);
        process.exit(0);
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
};
fixRoles();

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("../config/env");
const Admin_1 = require("../models/Admin");
const main = async () => {
    await mongoose_1.default.connect(env_1.env.MONGO_URI);
    const admins = await Admin_1.Admin.find({}).select('email role status createdAt').lean();
    console.log(JSON.stringify(admins, null, 2));
    await mongoose_1.default.disconnect();
};
main().catch((err) => {
    console.error(err);
    process.exit(1);
});

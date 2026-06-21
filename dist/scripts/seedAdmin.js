"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const readline_1 = __importDefault(require("readline"));
const env_1 = require("../config/env");
const Admin_1 = require("../models/Admin");
const rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout,
});
const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));
const parseArg = (name) => {
    const search = `--${name}=`;
    const arg = process.argv.find((item) => item.startsWith(search));
    return arg ? arg.substring(search.length) : undefined;
};
const main = async () => {
    try {
        await mongoose_1.default.connect(env_1.env.MONGO_URI);
        const email = process.env.ADMIN_EMAIL ||
            parseArg('email') ||
            (await question('Admin email: '));
        const password = process.env.ADMIN_PASSWORD ||
            parseArg('password') ||
            (await question('Admin password: '));
        const firstName = process.env.ADMIN_FIRST_NAME ||
            parseArg('firstName') ||
            (await question('First name: '));
        const lastName = process.env.ADMIN_LAST_NAME ||
            parseArg('lastName') ||
            (await question('Last name: '));
        if (!email || !password || !firstName || !lastName) {
            throw new Error('All admin fields are required.');
        }
        const existingAdmin = await Admin_1.Admin.findOne({ email });
        if (existingAdmin) {
            console.log(`Admin already exists with email: ${email}`);
            process.exit(0);
        }
        const admin = new Admin_1.Admin({
            email,
            password,
            firstName,
            lastName,
            role: 'superadmin',
        });
        await admin.save();
        console.log('Master admin created successfully:');
        console.log(`  id: ${admin._id}`);
        console.log(`  email: ${admin.email}`);
        console.log(`  role: ${admin.role}`);
        console.log('Keep these credentials safe.');
    }
    catch (error) {
        console.error('Failed to seed admin account:', error);
        process.exit(1);
    }
    finally {
        rl.close();
        await mongoose_1.default.disconnect();
    }
};
main();

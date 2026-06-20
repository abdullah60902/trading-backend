import mongoose from 'mongoose';
import { connectDB } from './config/db';
import { User } from './models/User';
import dotenv from 'dotenv';

dotenv.config();

const fixRoles = async () => {
  try {
    await connectDB();
    console.log('MongoDB connected.');
    
    const result = await User.updateMany(
      { role: { $in: ['admin', 'superadmin'] } },
      { $set: { role: 'user' } }
    );
    
    console.log(`Updated ${result.modifiedCount} users to 'user' role.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

fixRoles();

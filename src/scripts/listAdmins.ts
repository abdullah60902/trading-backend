import mongoose from 'mongoose';
import { env } from '../config/env';
import { Admin } from '../models/Admin';

const main = async () => {
  await mongoose.connect(env.MONGO_URI);
  const admins = await Admin.find({}).select('email role status createdAt').lean();
  console.log(JSON.stringify(admins, null, 2));
  await mongoose.disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

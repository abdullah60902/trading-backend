import mongoose from 'mongoose';
import readline from 'readline';
import { env } from '../config/env';
import { Admin } from '../models/Admin';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt: string): Promise<string> =>
  new Promise((resolve) => rl.question(prompt, resolve));

const parseArg = (name: string): string | undefined => {
  const search = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(search));
  return arg ? arg.substring(search.length) : undefined;
};

const main = async (): Promise<void> => {
  try {
    await mongoose.connect(env.MONGO_URI);

    const email =
      process.env.ADMIN_EMAIL ||
      parseArg('email') ||
      (await question('Admin email: '));
    const password =
      process.env.ADMIN_PASSWORD ||
      parseArg('password') ||
      (await question('Admin password: '));
    const firstName =
      process.env.ADMIN_FIRST_NAME ||
      parseArg('firstName') ||
      (await question('First name: '));
    const lastName =
      process.env.ADMIN_LAST_NAME ||
      parseArg('lastName') ||
      (await question('Last name: '));

    if (!email || !password || !firstName || !lastName) {
      throw new Error('All admin fields are required.');
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.log(`Admin already exists with email: ${email}`);
      process.exit(0);
    }

    const admin = new Admin({
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
  } catch (error) {
    console.error('Failed to seed admin account:', error);
    process.exit(1);
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
};

main();

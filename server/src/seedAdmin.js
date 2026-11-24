// Run with: npm run seed:admin
// Public registration can only create role "user" accounts (by design), so
// this script is how the very first lab-technician/admin account gets made.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./config/db');
const userModel = require('./models/userModel');

const email = process.env.ADMIN_SEED_EMAIL;
const password = process.env.ADMIN_SEED_PASSWORD;
const name = process.env.ADMIN_SEED_NAME || 'Lab Technician Admin';

if (!email || !password) {
  console.error('Set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD in your .env before running this script.');
  process.exit(1);
}

const existing = userModel.findByEmail(email);

if (existing) {
  db.prepare(`UPDATE users SET role = 'admin' WHERE email = ?`).run(email);
  console.log(`Existing user ${email} promoted to admin.`);
} else {
  const passwordHash = bcrypt.hashSync(password, 10);
  userModel.create({ name, email, passwordHash, role: 'admin' });
  console.log(`Admin account created: ${email}`);
}

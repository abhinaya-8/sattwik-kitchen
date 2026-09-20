require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const Admin = require('../models/Admin');

(async () => {
  await connectDB();
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before using seed:admin.');
  const hash = bcrypt.hashSync(password, 10);
  const existing = await Admin.findOne({ email });

  if (existing) {
    existing.passwordHash = hash;
    existing.role = 'superadmin';
    await existing.save();
    console.log(`Admin password reset for ${email}`);
  } else {
    await Admin.create({ email, passwordHash: hash, name: process.env.ADMIN_NAME || 'Owner', role: 'superadmin' });
    console.log(`Admin created: ${email}`);
  }

  process.exit(0);
})();

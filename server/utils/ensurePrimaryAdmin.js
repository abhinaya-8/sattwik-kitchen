const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

async function ensurePrimaryAdmin() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');

  if (!email || !password) {
    console.warn('[sattwik] ADMIN_EMAIL / ADMIN_PASSWORD not set — primary admin bootstrap skipped');
    return null;
  }

  try {
    const existing = await Admin.findOne({ email });
    if (existing) {
      if (existing.role !== 'superadmin') {
        existing.role = 'superadmin';
        await existing.save();
      }
      return existing;
    }

    const admin = await Admin.create({
      email,
      name: process.env.ADMIN_NAME || 'Owner',
      passwordHash: bcrypt.hashSync(password, 10),
      role: 'superadmin'
    });
    console.log(`[sattwik] primary admin provisioned: ${email}`);
    return admin;
  } catch (err) {
    console.error('[sattwik] primary admin bootstrap failed:', err.message);
    return null;
  }
}

module.exports = ensurePrimaryAdmin;

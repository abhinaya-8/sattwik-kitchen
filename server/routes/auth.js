const router = require('express').Router();
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const { signToken, authRequired } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
  const admin = await Admin.findOne({ email: String(email).toLowerCase().trim() });
  if (!admin || !bcrypt.compareSync(String(password), admin.passwordHash)) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  res.json({
    token: signToken(admin),
    admin: { email: admin.email, name: admin.name, role: admin.role }
  });
});

router.post('/signup', async (req, res) => {
  const { name, email, password, confirmPassword } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!String(name || '').trim() || !cleanEmail.includes('@') || String(password || '').length < 8 || password !== confirmPassword) {
    return res.status(400).json({ message: 'Full name, valid email, matching passwords, and an 8-character password are required.' });
  }
  if (await Admin.exists({ email: cleanEmail })) return res.status(409).json({ message: 'An admin account already exists for this email.' });
  const admin = await Admin.create({ name: String(name).trim(), email: cleanEmail, passwordHash: bcrypt.hashSync(String(password), 12), role: 'admin' });
  res.status(201).json({ message: 'Admin account created. Please sign in.', admin: { email: admin.email, name: admin.name } });
});

router.post('/logout', authRequired, (req, res) => res.json({ message: 'Logged out' }));
router.get('/me', authRequired, (req, res) => res.json({ admin: req.admin }));

router.post('/change-password', authRequired, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' });
  const admin = await Admin.findById(req.admin.id);
  if (!bcrypt.compareSync(String(currentPassword || ''), admin.passwordHash)) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }
  admin.passwordHash = bcrypt.hashSync(String(newPassword), 10);
  await admin.save();
  res.json({ message: 'Password updated' });
});

module.exports = router;

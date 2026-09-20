const router = require('express').Router();
const bcrypt = require('bcryptjs');
const DeliveryMember = require('../models/DeliveryMember');
const { signDeliveryToken, deliveryAuthRequired } = require('../middleware/deliveryAuth');

function publicMember(member) {
  return { id: member._id, name: member.name, email: member.email, phone: member.phone };
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const member = await DeliveryMember.findOne({ email: String(email || '').trim().toLowerCase(), active: true }).select('+passwordHash');
  if (!member || !bcrypt.compareSync(String(password || ''), member.passwordHash)) {
    return res.status(401).json({ message: 'Invalid delivery email or password.' });
  }
  res.json({ token: signDeliveryToken(member), member: publicMember(member) });
});

router.post('/signup', async (req, res) => {
  const { name, email, phone, password, confirmPassword } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!String(name || '').trim() || !cleanEmail.includes('@') || !String(phone || '').trim() || String(password || '').length < 8 || password !== confirmPassword) {
    return res.status(400).json({ message: 'Full name, valid email, phone, matching passwords, and an 8-character password are required.' });
  }
  if (await DeliveryMember.exists({ email: cleanEmail })) return res.status(409).json({ message: 'A delivery account already exists for this email.' });
  const member = await DeliveryMember.create({ name: String(name).trim(), email: cleanEmail, phone: String(phone).trim(), passwordHash: bcrypt.hashSync(String(password), 12) });
  res.status(201).json({ message: 'Delivery account created. Please sign in.', member: publicMember(member) });
});

router.get('/me', deliveryAuthRequired, (req, res) => res.json({ member: publicMember(req.deliveryMember) }));
router.post('/logout', deliveryAuthRequired, (req, res) => res.json({ message: 'Logged out' }));

module.exports = router;

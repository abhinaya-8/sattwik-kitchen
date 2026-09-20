const router = require('express').Router();
const bcrypt = require('bcryptjs');
const Customer = require('../models/Customer');
const { signCustomerToken, customerAuthRequired } = require('../middleware/customerAuth');

function splitName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return { firstName: parts.shift() || '', lastName: parts.join(' ') || 'Customer' };
}

function publicCustomer(customer) {
  return {
    id: customer._id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    address: customer.address || '',
    area: customer.area || ''
  };
}

router.post('/signup', async (req, res) => {
  const { name, email, phone, password, address, area = '' } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!name || !cleanEmail.includes('@') || !phone || String(password || '').length < 8) {
    return res.status(400).json({ message: 'Name, valid email, phone, and an 8-character password are required.' });
  }

  const existing = await Customer.findOne({ email: cleanEmail }).select('+passwordHash');
  if (existing?.passwordHash) return res.status(409).json({ message: 'An account already exists for this email.' });

  const { firstName, lastName } = splitName(name);
  const customer = existing || new Customer({ email: cleanEmail });
  customer.firstName = firstName;
  customer.lastName = lastName;
  customer.phone = String(phone).trim();
  customer.address = String(address || '').trim();
  customer.area = String(area).trim();
  customer.passwordHash = bcrypt.hashSync(String(password), 12);
  await customer.save();

  res.status(201).json({ token: signCustomerToken(customer), customer: publicCustomer(customer) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const customer = await Customer.findOne({ email: String(email || '').trim().toLowerCase() }).select('+passwordHash');
  if (!customer || !customer.passwordHash || !bcrypt.compareSync(String(password || ''), customer.passwordHash)) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  res.json({ token: signCustomerToken(customer), customer: publicCustomer(customer) });
});

router.get('/me', customerAuthRequired, (req, res) => res.json({ customer: publicCustomer(req.customer) }));
router.post('/logout', customerAuthRequired, (req, res) => res.json({ message: 'Logged out' }));

module.exports = router;

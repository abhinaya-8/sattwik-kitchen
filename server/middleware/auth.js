const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

function signToken(admin) {
  return jwt.sign(
    { id: admin._id, email: admin.email, role: admin.role, type: 'admin' },
    process.env.JWT_SECRET || 'dev_secret_change_me',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authentication required' });
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
    const admin = await Admin.findById(payload.id).lean();
    if (!admin) return res.status(401).json({ message: 'Account no longer exists' });
    req.admin = { id: admin._id, email: admin.email, role: admin.role, name: admin.name };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }
}

module.exports = { signToken, authRequired };

const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

function signToken(admin) {
  return jwt.sign(
{ id: admin._id, email: admin.email, role: admin.role, type: 'admin', tv: admin.tokenVersion || 0 },    process.env.JWT_SECRET || 'dev_secret_change_me',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authentication required' });
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
    if (payload.type !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const admin = await Admin.findById(payload.id).lean();
    if (!admin) return res.status(401).json({ message: 'Account no longer exists' });
    if (!['admin', 'superadmin'].includes(admin.role)) return res.status(403).json({ message: 'Admin access required' });
    if ((payload.tv || 0) !== (admin.tokenVersion || 0)) {
      return res.status(401).json({ message: 'Password changed — please sign in again' });
    }
    req.admin = { id: admin._id, email: admin.email, role: admin.role, name: admin.name };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }
}
 
module.exports = { signToken, authRequired };

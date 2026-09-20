const router = require('express').Router();
const { authRequired } = require('../middleware/auth');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const mongoose = require('mongoose');

router.get('/', authRequired, async (req, res) => {
  const { search, area, page = 1, limit = 15 } = req.query;
  const match = {};
  if (search) {
    match.$or = ['firstName', 'lastName', 'phone', 'email'].map((field) => ({ [field]: new RegExp(search, 'i') }));
  }
  if (area) match.area = new RegExp(area, 'i');

  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, parseInt(limit, 10) || 15);

  const [data, total] = await Promise.all([
    Customer.find(match).sort('-createdAt').skip((p - 1) * l).limit(l).lean(),
    Customer.countDocuments(match)
  ]);

  const ids = data.map((customer) => new mongoose.Types.ObjectId(customer._id));
  const stats = await Order.aggregate([
    { $match: { customer: { $in: ids } } },
    { $group: { _id: '$customer', orders: { $sum: 1 }, spent: { $sum: '$totalAmount' }, lastOrder: { $max: '$createdAt' } } }
  ]);

  const statMap = Object.fromEntries(stats.map((s) => [String(s._id), s]));

  res.json({
    customers: data.map((customer) => ({
      ...customer,
      orders: statMap[String(customer._id)]?.orders || 0,
      spent: statMap[String(customer._id)]?.spent || 0,
      lastOrder: statMap[String(customer._id)]?.lastOrder || null
    })),
    total,
    page: p,
    pages: Math.ceil(total / l)
  });
});

router.get('/:id', authRequired, async (req, res) => {
  const customer = await Customer.findById(req.params.id).lean();
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  const orders = await Order.find({ customer: req.params.id }).sort('-createdAt').lean();
  res.json({ customer, orders });
});

module.exports = router;

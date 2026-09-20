const router = require('express').Router();
const Order = require('../models/Order');
const { customerAuthRequired } = require('../middleware/customerAuth');

router.get('/', customerAuthRequired, async (req, res) => {
  const orders = await Order.find({ $or: [{ customer: req.customer._id }, { customerId: req.customer._id }] })
    .sort('-placedAt -createdAt')
    .populate('deliveryMemberId', 'name phone')
    .lean();
  res.json({ orders });
});

router.get('/:id', customerAuthRequired, async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    $or: [{ customer: req.customer._id }, { customerId: req.customer._id }]
  }).populate('deliveryMemberId', 'name phone').lean();
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json({ order });
});

module.exports = router;

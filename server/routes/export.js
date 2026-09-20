const router = require('express').Router();
const { authRequired } = require('../middleware/auth');
const Order = require('../models/Order');
const { dateMatch } = require('../utils/constants');

function sendCsv(res, filename, header, rows) {
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [header.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

router.get('/orders.csv', authRequired, async (req, res) => {
  const match = dateMatch(req.query);
  if (req.query.status) match.status = req.query.status;

  const orders = await Order.find(match).sort('-createdAt').populate('customer', 'firstName lastName phone email area').lean();

  sendCsv(
    res,
    `orders-${Date.now()}.csv`,
    ['Order ID', 'Date', 'Customer', 'Phone', 'Email', 'Area', 'Items', 'Total', 'Status', 'Type'],
    orders.map((o) => [
      o.orderId,
      o.createdAt.toISOString().slice(0, 19).replace('T', ' '),
      `${o.customer?.firstName || ''} ${o.customer?.lastName || ''}`.trim(),
      o.customer?.phone || '',
      o.customer?.email || '',
      o.customer?.area || '',
      o.items.map((i) => `${i.productName} x${i.quantity}`).join('; '),
      o.totalAmount.toFixed(2),
      o.status,
      o.type
    ])
  );
});

router.get('/products.csv', authRequired, async (req, res) => {
  const analyticsController = require('../controllers/analyticsController');
  let analyticsData;
  const analyticsResponse = {
    json(data) {
      analyticsData = data;
    }
  };

  await analyticsController.products({ query: req.query }, analyticsResponse);
  sendCsv(
    res,
    `product-sales-${Date.now()}.csv`,
    ['Product', 'Category', 'Quantity Sold', 'Revenue', 'Orders'],
    (analyticsData?.products || []).map((p) => [p.name, p.category, p.quantity, Number(p.revenue).toFixed(2), p.orders])
  );
});

module.exports = router;

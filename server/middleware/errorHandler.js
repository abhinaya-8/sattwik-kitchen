function notFound(req, res) {
  res.status(404).json({ message: 'API endpoint not found' });
}

function errorHandler(err, req, res, next) {
  console.error('[api error]', err.message);
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Duplicate record — it already exists' });
  }
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
}

module.exports = { notFound, errorHandler };

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireCustomer } = require('../middleware/auth');

// GET /api/orders/mine — order history for the logged-in customer
router.get('/mine', requireCustomer, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC').all(req.session.customerId);
  const withItems = orders.map(o => ({
    ...o,
    items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id)
  }));
  res.json(withItems);
});

// GET /api/orders/lookup?order_number=...&email=... — guest order tracking
router.get('/lookup', (req, res) => {
  const { order_number, email } = req.query;
  if (!order_number || !email) return res.status(400).json({ error: 'Order number and email required.' });
  const order = db.prepare('SELECT * FROM orders WHERE order_number = ? AND customer_email = ?').get(order_number, email.toLowerCase());
  if (!order) return res.status(404).json({ error: 'Order not found. Check the order number and email.' });
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json(order);
});

module.exports = router;

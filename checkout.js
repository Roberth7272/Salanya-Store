const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const razorpayConfigured = RAZORPAY_KEY_ID.startsWith('rzp_')
  && RAZORPAY_KEY_SECRET.length > 5
  && !RAZORPAY_KEY_ID.includes('xxxx')
  && !RAZORPAY_KEY_SECRET.includes('xxxx');

let razorpayInstance = null;
if (razorpayConfigured) {
  const Razorpay = require('razorpay');
  razorpayInstance = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
}

function getCartDetails(req) {
  const cart = req.session.cart || [];
  const items = cart.map(item => {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(item.productId);
    if (!product) return null;
    return { productId: product.id, name: product.name, price: product.price, quantity: item.quantity };
  }).filter(Boolean);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping_fee = subtotal > 0 && subtotal < 999 ? 79 : 0;
  const total = subtotal + shipping_fee;
  return { items, subtotal, shipping_fee, total };
}

function generateOrderNumber() {
  return 'SLY' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 90 + 10);
}

// GET /api/checkout/config — tells the frontend whether Razorpay (or COD-only test mode) is active
router.get('/config', (req, res) => {
  res.json({
    razorpayEnabled: razorpayConfigured,
    keyId: razorpayConfigured ? RAZORPAY_KEY_ID : null
  });
});

// POST /api/checkout/create-order — creates a Razorpay order for the current cart
router.post('/create-order', (req, res) => {
  const { total } = getCartDetails(req);
  if (total <= 0) return res.status(400).json({ error: 'Your cart is empty.' });
  if (!razorpayConfigured) {
    return res.status(400).json({ error: 'Online payment is not configured yet. Use Cash on Delivery, or add Razorpay keys in .env.' });
  }

  razorpayInstance.orders.create({
    amount: total * 100, // paise
    currency: 'INR',
    receipt: generateOrderNumber()
  }).then(order => res.json(order))
    .catch(err => res.status(500).json({ error: 'Could not create payment order.', detail: err.message }));
});

// POST /api/checkout/place — finalizes an order (COD, or after Razorpay payment verified)
router.post('/place', (req, res) => {
  const { customer_name, customer_email, customer_phone, address, payment_method,
    razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!customer_name || !customer_phone || !address || !address.line1 || !address.city || !address.pincode) {
    return res.status(400).json({ error: 'Please fill in your name, phone, and full shipping address.' });
  }

  const { items, subtotal, shipping_fee, total } = getCartDetails(req);
  if (items.length === 0) return res.status(400).json({ error: 'Your cart is empty.' });

  let payment_status = 'unpaid';
  let status = 'pending';

  if (payment_method === 'razorpay') {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification details.' });
    }
    const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed. Please contact support before retrying.' });
    }
    payment_status = 'paid';
    status = 'paid';
  } else if (payment_method === 'cod') {
    payment_status = 'unpaid';
    status = 'pending';
  } else {
    return res.status(400).json({ error: 'Invalid payment method.' });
  }

  const orderNumber = generateOrderNumber();
  const addressStr = `${address.line1}${address.line2 ? ', ' + address.line2 : ''}, ${address.city}, ${address.state || ''} - ${address.pincode}`;

  const insertOrder = db.prepare(`INSERT INTO orders
    (order_number, customer_id, customer_name, customer_email, customer_phone, shipping_address,
     subtotal, shipping_fee, total, status, payment_status, razorpay_order_id, razorpay_payment_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const insertItem = db.prepare(`INSERT INTO order_items
    (order_id, product_id, product_name, price, quantity) VALUES (?, ?, ?, ?, ?)`);

  const tx = db.transaction(() => {
    const result = insertOrder.run(
      orderNumber, req.session.customerId || null, customer_name, customer_email || null, customer_phone,
      addressStr, subtotal, shipping_fee, total, status, payment_status,
      razorpay_order_id || null, razorpay_payment_id || null
    );
    const orderId = result.lastInsertRowid;
    items.forEach(i => {
      insertItem.run(orderId, i.productId, i.name, i.price, i.quantity);
      db.prepare('UPDATE products SET stock = MAX(stock - ?, 0) WHERE id = ?').run(i.quantity, i.productId);
    });
    return orderId;
  });

  const orderId = tx();
  req.session.cart = []; // clear cart

  res.json({ ok: true, orderId, orderNumber, total });
});

module.exports = router;

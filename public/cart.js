const express = require('express');
const router = express.Router();
const db = require('../db');

function getCartDetails(req) {
  const cart = req.session.cart || [];
  const items = cart.map(item => {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(item.productId);
    if (!product) return null;
    return {
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image_url: product.image_url,
      quantity: item.quantity,
      lineTotal: product.price * item.quantity,
      stock: product.stock
    };
  }).filter(Boolean);

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const shipping_fee = subtotal > 0 && subtotal < 999 ? 79 : 0; // free shipping over ₹999
  const total = subtotal + shipping_fee;
  return { items, subtotal, shipping_fee, total, count: items.reduce((s, i) => s + i.quantity, 0) };
}

// GET /api/cart
router.get('/', (req, res) => {
  res.json(getCartDetails(req));
});

// POST /api/cart/add { productId, quantity }
router.post('/add', (req, res) => {
  const { productId, quantity } = req.body;
  const qty = Math.max(1, parseInt(quantity) || 1);
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  if (!req.session.cart) req.session.cart = [];
  const existing = req.session.cart.find(i => i.productId === product.id);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + qty, product.stock);
  } else {
    req.session.cart.push({ productId: product.id, quantity: Math.min(qty, product.stock) });
  }
  res.json(getCartDetails(req));
});

// POST /api/cart/update { productId, quantity }
router.post('/update', (req, res) => {
  const { productId, quantity } = req.body;
  const qty = parseInt(quantity);
  if (!req.session.cart) req.session.cart = [];

  if (qty <= 0) {
    req.session.cart = req.session.cart.filter(i => i.productId !== parseInt(productId));
  } else {
    const item = req.session.cart.find(i => i.productId === parseInt(productId));
    if (item) item.quantity = qty;
  }
  res.json(getCartDetails(req));
});

// POST /api/cart/remove { productId }
router.post('/remove', (req, res) => {
  const { productId } = req.body;
  req.session.cart = (req.session.cart || []).filter(i => i.productId !== parseInt(productId));
  res.json(getCartDetails(req));
});

module.exports = router;

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Name, valid email, and a password (6+ characters) are required.' });
  }
  const existing = db.prepare('SELECT id FROM customers WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO customers (name, email, phone, password_hash) VALUES (?, ?, ?, ?)')
    .run(name, email.toLowerCase(), phone || null, hash);

  req.session.customerId = info.lastInsertRowid;
  res.json({ id: info.lastInsertRowid, name, email });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const customer = db.prepare('SELECT * FROM customers WHERE email = ?').get((email || '').toLowerCase());
  if (!customer || !bcrypt.compareSync(password || '', customer.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  req.session.customerId = customer.id;
  res.json({ id: customer.id, name: customer.name, email: customer.email });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.customerId = null;
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session.customerId) return res.json({ loggedIn: false });
  const customer = db.prepare('SELECT id, name, email, phone FROM customers WHERE id = ?').get(req.session.customerId);
  if (!customer) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, ...customer });
});

module.exports = router;

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new SqliteStore({ client: db, expired: { clear: true, intervalMs: 900000 } }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    secure: process.env.NODE_ENV === 'production' && process.env.TRUST_PROXY === 'true',
    httpOnly: true
  }
}));

// API routes
app.use('/api', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/checkout', require('./routes/checkout'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));

// Static files (storefront + admin panel HTML/CSS/JS)
app.use(express.static(path.join(__dirname, 'public')));

// Fallback: unknown non-API GET requests go to the storefront home
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (req.path.startsWith('/admin')) {
    return res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  SALANYA store running → http://localhost:${PORT}`);
  console.log(`  Admin panel           → http://localhost:${PORT}/admin\n`);
});

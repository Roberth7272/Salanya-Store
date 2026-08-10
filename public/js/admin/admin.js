const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

// --- Image upload for products ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'public', 'img', 'uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, ''))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
require('fs').mkdirSync(path.join(__dirname, '..', 'public', 'img', 'uploads'), { recursive: true });

// --- Auth ---
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get((email || '').toLowerCase());
  if (!admin || !bcrypt.compareSync(password || '', admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid admin email or password.' });
  }
  req.session.adminId = admin.id;
  res.json({ id: admin.id, email: admin.email, name: admin.name });
});

router.post('/logout', (req, res) => {
  req.session.adminId = null;
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!req.session.adminId) return res.json({ loggedIn: false });
  const admin = db.prepare('SELECT id, email, name FROM admins WHERE id = ?').get(req.session.adminId);
  res.json(admin ? { loggedIn: true, ...admin } : { loggedIn: false });
});

router.post('/change-password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.session.adminId);
  if (!bcrypt.compareSync(currentPassword || '', admin.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, admin.id);
  res.json({ ok: true });
});

// Everything below requires admin session
router.use(requireAdmin);

// --- Dashboard stats ---
router.get('/stats', (req, res) => {
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(total),0) AS s FROM orders WHERE payment_status='paid'").get().s;
  const totalOrders = db.prepare('SELECT COUNT(*) AS c FROM orders').get().c;
  const pendingOrders = db.prepare("SELECT COUNT(*) AS c FROM orders WHERE status='pending'").get().c;
  const totalCustomers = db.prepare('SELECT COUNT(*) AS c FROM customers').get().c;
  const totalProducts = db.prepare('SELECT COUNT(*) AS c FROM products WHERE is_active=1').get().c;
  const recentOrders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 8').all();
  const topProducts = db.prepare(`
    SELECT product_name, SUM(quantity) AS units_sold, SUM(price*quantity) AS revenue
    FROM order_items GROUP BY product_name ORDER BY units_sold DESC LIMIT 5
  `).all();
  res.json({ totalRevenue, totalOrders, pendingOrders, totalCustomers, totalProducts, recentOrders, topProducts });
});

// --- Products CRUD ---
router.get('/products', (req, res) => {
  const products = db.prepare(`SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id ORDER BY p.created_at DESC`).all();
  res.json(products);
});

router.get('/categories', (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY name').all());
});

router.post('/products', upload.single('image'), (req, res) => {
  const b = req.body;
  const slug = (b.slug || b.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const image_url = req.file ? `/img/uploads/${req.file.filename}` : (b.image_url || null);
  try {
    const info = db.prepare(`INSERT INTO products
      (name, slug, description, price, compare_price, category_id, finish, weight, size, stock, image_url, is_bestseller, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      b.name, slug, b.description || '', parseInt(b.price) || 0, b.compare_price ? parseInt(b.compare_price) : null,
      b.category_id || null, b.finish || '925 Sterling Silver', b.weight || '', b.size || '',
      parseInt(b.stock) || 0, image_url, b.is_bestseller ? 1 : 0, 1
    );
    res.json({ id: info.lastInsertRowid, ok: true });
  } catch (e) {
    res.status(400).json({ error: 'Could not create product (slug may already exist).', detail: e.message });
  }
});

router.put('/products/:id', upload.single('image'), (req, res) => {
  const b = req.body;
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });
  const image_url = req.file ? `/img/uploads/${req.file.filename}` : (b.image_url || existing.image_url);

  db.prepare(`UPDATE products SET name=?, description=?, price=?, compare_price=?, category_id=?, finish=?, weight=?, size=?, stock=?, image_url=?, is_bestseller=?, is_active=? WHERE id=?`)
    .run(
      b.name || existing.name, b.description ?? existing.description, parseInt(b.price) || existing.price,
      b.compare_price ? parseInt(b.compare_price) : existing.compare_price, b.category_id || existing.category_id,
      b.finish || existing.finish, b.weight || existing.weight, b.size || existing.size,
      b.stock !== undefined ? parseInt(b.stock) : existing.stock, image_url,
      b.is_bestseller !== undefined ? (b.is_bestseller ? 1 : 0) : existing.is_bestseller,
      b.is_active !== undefined ? (b.is_active ? 1 : 0) : existing.is_active,
      req.params.id
    );
  res.json({ ok: true });
});

router.delete('/products/:id', (req, res) => {
  db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// --- Orders ---
router.get('/orders', (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.json(orders);
});

router.get('/orders/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json(order);
});

router.patch('/orders/:id', (req, res) => {
  const { status, payment_status } = req.body;
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Order not found' });
  db.prepare('UPDATE orders SET status = COALESCE(?, status), payment_status = COALESCE(?, payment_status) WHERE id = ?')
    .run(status || null, payment_status || null, req.params.id);
  res.json({ ok: true });
});

// --- Customers ---
router.get('/customers', (req, res) => {
  const customers = db.prepare(`
    SELECT c.id, c.name, c.email, c.phone, c.created_at,
      COUNT(o.id) AS order_count,
      COALESCE(SUM(CASE WHEN o.payment_status='paid' THEN o.total ELSE 0 END), 0) AS total_spent
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    GROUP BY c.id ORDER BY c.created_at DESC
  `).all();
  res.json(customers);
});

router.get('/customers/:id', (req, res) => {
  const customer = db.prepare('SELECT id, name, email, phone, created_at FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  customer.orders = db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC').all(customer.id);
  res.json(customer);
});

module.exports = router;

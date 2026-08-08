const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/categories
router.get('/categories', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  res.json(categories);
});

// GET /api/products?category=slug&bestseller=1&q=search
router.get('/products', (req, res) => {
  let sql = `SELECT p.*, c.name AS category_name, c.slug AS category_slug
             FROM products p LEFT JOIN categories c ON p.category_id = c.id
             WHERE p.is_active = 1`;
  const params = [];

  if (req.query.category) {
    sql += ' AND c.slug = ?';
    params.push(req.query.category);
  }
  if (req.query.bestseller) {
    sql += ' AND p.is_bestseller = 1';
  }
  if (req.query.q) {
    sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    params.push(`%${req.query.q}%`, `%${req.query.q}%`);
  }
  sql += ' ORDER BY p.created_at DESC';

  const products = db.prepare(sql).all(...params);
  res.json(products);
});

// GET /api/products/:slug
router.get('/products/:slug', (req, res) => {
  const product = db.prepare(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug
     FROM products p LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.slug = ? AND p.is_active = 1`
  ).get(req.params.slug);

  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

module.exports = router;

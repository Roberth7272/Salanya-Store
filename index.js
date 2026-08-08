const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'salanya.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price INTEGER NOT NULL,          -- price in paise/subunits is overkill for INR whole rupees, storing as integer rupees
  compare_price INTEGER,
  category_id INTEGER,
  metal TEXT DEFAULT '925 Sterling Silver',
  finish TEXT,
  weight TEXT,
  size TEXT,
  stock INTEGER DEFAULT 10,
  image_url TEXT,
  is_bestseller INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  full_name TEXT,
  phone TEXT,
  line1 TEXT,
  line2 TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  is_default INTEGER DEFAULT 0,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT DEFAULT 'Admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL UNIQUE,
  customer_id INTEGER,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  shipping_address TEXT,
  subtotal INTEGER NOT NULL,
  shipping_fee INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',        -- pending, paid, processing, shipped, delivered, cancelled
  payment_status TEXT DEFAULT 'unpaid', -- unpaid, paid, failed, refunded
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  price INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
`);

// --- Seed categories + products if empty ---
const catCount = db.prepare('SELECT COUNT(*) AS c FROM categories').get().c;
if (catCount === 0) {
  const insertCat = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)');
  insertCat.run('For Her', 'for-her');
  insertCat.run('For Him', 'for-him');
  insertCat.run('Couple Collection', 'couple-collection');
  insertCat.run('Rings', 'rings');
  insertCat.run('Pendants', 'pendants');
  insertCat.run('Earrings', 'earrings');
  insertCat.run('Bracelets', 'bracelets');
}

const prodCount = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
if (prodCount === 0) {
  const insertP = db.prepare(`INSERT INTO products
    (name, slug, description, price, compare_price, category_id, finish, weight, size, stock, image_url, is_bestseller)
    VALUES (@name, @slug, @description, @price, @compare_price, @category_id, @finish, @weight, @size, @stock, @image_url, @is_bestseller)`);

  const pendants = db.prepare('SELECT id FROM categories WHERE slug=?').get('pendants').id;
  const rings = db.prepare('SELECT id FROM categories WHERE slug=?').get('rings').id;
  const bracelets = db.prepare('SELECT id FROM categories WHERE slug=?').get('bracelets').id;
  const earrings = db.prepare('SELECT id FROM categories WHERE slug=?').get('earrings').id;

  const products = [
    {
      name: 'Moonlight Embrace Pendant',
      slug: 'moonlight-embrace-pendant',
      description: 'A symbol of eternal love and togetherness. The moon embraces, the stars witness. A crescent moon cradles two figures seated together beneath a single star, hand-finished in oxidised antique silver. Crafted in 925 Sterling Silver, made to be cherished forever.',
      price: 2499, compare_price: 2999, category_id: pendants,
      finish: 'Oxidised Antique', weight: '6.5 - 7.5 gm', size: '~25 mm (Diameter), 24mm x 20mm x 3.2mm',
      stock: 25, image_url: '/img/brand/pendant-front-back.png', is_bestseller: 1
    },
    {
      name: 'Eternal Lotus Ring',
      slug: 'eternal-lotus-ring',
      description: 'An open lotus in full bloom, rendered in fine sterling silver detail. A quiet symbol of purity and new beginnings, worn as an everyday statement.',
      price: 1699, compare_price: 1999, category_id: rings,
      finish: 'Polished Silver', weight: '4 - 5 gm', size: 'Adjustable',
      stock: 30, image_url: '/img/eternal-lotus-ring.svg', is_bestseller: 1
    },
    {
      name: 'You & Me Bracelet',
      slug: 'you-and-me-bracelet',
      description: 'A delicate chain bracelet with an engraved "You & Me" bar — a small, constant reminder of a love story worth telling.',
      price: 1999, compare_price: 2299, category_id: bracelets,
      finish: 'Polished Silver', weight: '5 - 6 gm', size: 'Adjustable, 16-20cm',
      stock: 20, image_url: '/img/you-and-me-bracelet.svg', is_bestseller: 1
    },
    {
      name: 'Celestial Moon Earrings',
      slug: 'celestial-moon-earrings',
      description: 'Twin crescent moons dusted with fine engraved stars, light enough for every day, striking enough for every night.',
      price: 1599, compare_price: 1899, category_id: earrings,
      finish: 'Oxidised Antique', weight: '3 - 4 gm / pair', size: '~18mm drop',
      stock: 22, image_url: '/img/celestial-moon-earrings.svg', is_bestseller: 1
    },
    {
      name: 'Stardust Promise Ring',
      slug: 'stardust-promise-ring',
      description: 'A compass-star silhouette set into a slender polished band — a quiet promise, worn like a direction home.',
      price: 1499, compare_price: 1799, category_id: rings,
      finish: 'Polished Silver', weight: '3 - 4 gm', size: 'Adjustable',
      stock: 28, image_url: '/img/stardust-promise-ring.svg', is_bestseller: 1
    }
  ];
  const tx = db.transaction((items) => { items.forEach(p => insertP.run(p)); });
  tx(products);
}

// --- Auto-create first admin from .env if none exist ---
const adminCount = db.prepare('SELECT COUNT(*) AS c FROM admins').get().c;
if (adminCount === 0) {
  const email = process.env.ADMIN_EMAIL || 'admin@salanya.com';
  const pass = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const hash = bcrypt.hashSync(pass, 10);
  db.prepare('INSERT INTO admins (email, password_hash, name) VALUES (?, ?, ?)').run(email, hash, 'Admin');
  console.log(`[SALANYA] Default admin created — email: ${email}  (change the password after first login)`);
}

module.exports = db;

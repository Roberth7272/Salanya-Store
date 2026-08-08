# SALANYA — Wear Silver Art

A complete e-commerce store for 925 Sterling Silver jewellery: storefront, cart,
checkout with Razorpay payments, customer accounts, and a full admin panel.
Built with Node.js + Express + SQLite — no external database service required.

---

## 1. What's included

- **Storefront** — home, shop (with category filters), product detail, cart, checkout, order confirmation, guest order tracking
- **Payments** — Razorpay integration (cards / UPI / netbanking) with signature verification, plus Cash on Delivery
- **Customer accounts** — register, login, order history dashboard
- **Admin panel** (`/admin`) — login, sales dashboard, product management (add/edit/delete + image upload), order management (update status), customer list, password change
- 5 starter products pre-loaded (matching your reference designs), fully editable from the admin panel

---

## 2. Run it locally

Requires [Node.js](https://nodejs.org) version 18 or higher.

```bash
cd salanya
npm install
cp .env.example .env
```

Open `.env` and set at minimum:

```
SESSION_SECRET=some-long-random-string
ADMIN_EMAIL=you@yourdomain.com
ADMIN_PASSWORD=a-strong-password
```

Then start the server:

```bash
npm start
```

- Storefront: **http://localhost:3000**
- Admin panel: **http://localhost:3000/admin** (log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set above — this admin account is created automatically the first time the server starts)

The database (`db/salanya.db`) is created and seeded with your 5 products automatically on first run. No separate database setup needed.

---

## 3. Connecting real payments (Razorpay)

1. Create a free account at [razorpay.com](https://razorpay.com) (built for Indian businesses, supports UPI/cards/netbanking).
2. Go to **Settings → API Keys** in the Razorpay dashboard and generate keys. Start with **Test Mode** keys (`rzp_test_...`).
3. Put them in `.env`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
   ```
4. Restart the server. The checkout page will now show "Pay Online" as an active option, and the admin Settings page will show the gateway as Connected.
5. Once you've tested a few orders end-to-end, switch to your **Live Mode** keys in Razorpay and update `.env` again — same two lines.

Until Razorpay keys are added, customers can still complete orders via **Cash on Delivery** — the store is never blocked.

---

## 4. Deploying it live

The app is a standard Node.js server, so any of these work. Render is the easiest for a first deploy.

### Option A — Render.com (recommended, free tier available)
1. Push this folder to a GitHub repository.
2. On [render.com](https://render.com): **New → Web Service** → connect your repo.
3. Build command: `npm install`  ·  Start command: `npm start`
4. Add environment variables (same as your `.env`) under **Environment**: `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `NODE_ENV=production`.
5. **Important**: Render's free disk is ephemeral — for a real store add a **Render Disk** (Settings → Disks) mounted at `/opt/render/project/src/db` so your SQLite database and uploaded images persist across deploys. Paid tier, a few dollars/month, but worth it once you have real orders.
6. Deploy. Your store is live at the `.onrender.com` URL — add a custom domain (e.g. `salanya.com`) under Settings → Custom Domain.

### Option B — Railway.app
Same idea: connect the repo, set the same environment variables, add a persistent volume for `/app/db`, deploy.

### Option C — Your own VPS (DigitalOcean, AWS EC2, Hostinger VPS, etc.)
```bash
git clone <your-repo> && cd salanya
npm install
cp .env.example .env   # fill in real values
npm install -g pm2
pm2 start server.js --name salanya
pm2 save && pm2 startup   # keeps it running after reboot
```
Put Nginx in front for HTTPS (use [Certbot](https://certbot.eff.org) for a free SSL certificate) and point your domain's A record at the server.

**Whichever host you choose:** the database is a single file (`db/salanya.db`). Back it up regularly — a simple cron job copying it somewhere safe is enough at this scale.

---

## 5. Customizing after launch

Everything below is done through the **admin panel** at `/admin` — no code changes needed:
- Add/edit/remove products, prices, stock, and photos
- View and update order status as you pack and ship
- See every customer who has purchased and their total spend
- Change the admin password (Settings page)

To change branding text, colors, or layout, the relevant files are:
- `public/css/style.css` — storefront colors/fonts (currently your black/gold/silver palette)
- `public/index.html`, `shop.html`, etc. — page content
- `public/img/brand/` — your logo and product photography

---

## 6. Project structure

```
salanya/
├── server.js              Entry point
├── db/index.js             SQLite schema + auto-seed
├── routes/                 API: products, cart, auth, checkout, orders, admin
├── middleware/auth.js       Customer / admin session guards
├── public/                 Storefront pages (static HTML/CSS/JS)
│   └── admin/               Admin panel pages
└── .env.example             Copy to .env and fill in
```

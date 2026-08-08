// ---------- helpers ----------
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...opts
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function formatPrice(rupees) {
  return '₹' + Number(rupees).toLocaleString('en-IN');
}

function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2200);
}

function qs(sel, ctx = document) { return ctx.querySelector(sel); }
function qsa(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

// ---------- header / footer ----------
const HEADER_HTML = `
<div class="top-banner">FREE SHIPPING ON ALL PREPAID ORDERS OVER ₹999</div>
<nav class="navbar">
  <button class="mobile-menu-btn" id="mobileMenuBtn">☰</button>
  <div class="nav-links" id="navLinks">
    <a href="/shop.html">Shop</a>
    <a href="/shop.html?category=couple-collection">Collections</a>
    <a href="/shop.html">Gifting</a>
    <a href="/track-order.html">Track Order</a>
  </div>
  <a href="/" class="logo-block">
    <div class="logo-name">SALANYA</div>
    <div class="logo-tagline">WEAR SILVER ART</div>
  </a>
  <div class="nav-icons">
    <a href="/shop.html" title="Search">🔍</a>
    <a href="/account.html" title="Account">👤</a>
    <a href="/cart.html" title="Cart" style="font-size:16px;">
      🛍<span class="cart-badge" id="cartBadge" style="display:none;">0</span>
    </a>
  </div>
</nav>`;

const FOOTER_HTML = `
<footer>
  <div class="footer-grid">
    <div>
      <div class="logo-block" style="text-align:left; margin-bottom:14px;">
        <div class="logo-name" style="font-size:18px;">SALANYA</div>
        <div class="logo-tagline">WEAR SILVER ART</div>
      </div>
      <p style="color:var(--silver); font-size:14px;">925 Sterling Silver Fine Art Jewellery, crafted to celebrate love, art and timeless moments.</p>
    </div>
    <div><h4>SHOP</h4><ul>
      <li><a href="/shop.html">All Jewellery</a></li>
      <li><a href="/shop.html?category=rings">Rings</a></li>
      <li><a href="/shop.html?category=pendants">Pendants</a></li>
      <li><a href="/shop.html?category=earrings">Earrings</a></li>
      <li><a href="/shop.html?category=bracelets">Bracelets</a></li>
    </ul></div>
    <div><h4>COLLECTIONS</h4><ul>
      <li><a href="/shop.html?category=for-her">For Her</a></li>
      <li><a href="/shop.html?category=for-him">For Him</a></li>
      <li><a href="/shop.html?category=couple-collection">Couple Collection</a></li>
      <li><a href="/shop.html?bestseller=1">Best Sellers</a></li>
    </ul></div>
    <div><h4>HELP</h4><ul>
      <li><a href="/track-order.html">Track Order</a></li>
      <li><a href="/account.html">My Account</a></li>
      <li>Returns &amp; Exchanges</li>
      <li>Care Guide</li>
    </ul></div>
    <div>
      <h4>NEWSLETTER</h4>
      <p style="color:var(--silver); font-size:14px; margin-bottom:12px;">Be the first to know about new collections and exclusive offers.</p>
      <div class="form-group"><input type="email" placeholder="Enter your email"></div>
    </div>
  </div>
  <div class="footer-bottom">© ${new Date().getFullYear()} SALANYA. All Rights Reserved. · <a href="/admin/">Admin</a></div>
</footer>`;

function renderChrome() {
  const header = document.getElementById('site-header');
  const footer = document.getElementById('site-footer');
  if (header) header.innerHTML = HEADER_HTML;
  if (footer) footer.innerHTML = FOOTER_HTML;

  const btn = document.getElementById('mobileMenuBtn');
  const links = document.getElementById('navLinks');
  if (btn && links) {
    btn.addEventListener('click', () => {
      links.style.display = links.style.display === 'flex' ? 'none' : 'flex';
      links.style.flexDirection = 'column';
      links.style.position = 'absolute';
      links.style.top = '70px';
      links.style.left = '0';
      links.style.right = '0';
      links.style.background = '#0a0a0a';
      links.style.padding = '20px';
      links.style.borderBottom = '1px solid rgba(201,169,110,0.25)';
    });
  }
  refreshCartBadge();
}

async function refreshCartBadge() {
  try {
    const cart = await api('/api/cart');
    const badge = document.getElementById('cartBadge');
    if (badge) {
      if (cart.count > 0) { badge.style.display = 'flex'; badge.textContent = cart.count; }
      else { badge.style.display = 'none'; }
    }
  } catch (e) { /* ignore */ }
}

function productCardHTML(p) {
  return `
  <a class="product-card" href="/product.html?slug=${p.slug}">
    ${p.is_bestseller ? '<span class="badge-tag">Bestseller</span>' : ''}
    <div class="img-wrap"><img src="${p.image_url}" alt="${p.name}" loading="lazy"></div>
    <div class="info">
      <h3>${p.name}</h3>
      <div class="price">${formatPrice(p.price)}${p.compare_price ? `<span class="compare">${formatPrice(p.compare_price)}</span>` : ''}</div>
    </div>
  </a>`;
}

document.addEventListener('DOMContentLoaded', renderChrome);

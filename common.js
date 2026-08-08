async function aApi(path, opts = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function aFormatPrice(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
function aQs(s, c = document) { return c.querySelector(s); }
function aQsa(s, c = document) { return [...c.querySelectorAll(s)]; }

const SIDEBAR_HTML = `
<div class="admin-logo">SALANYA<small>ADMIN PANEL</small></div>
<nav class="admin-nav">
  <a href="/admin/dashboard.html" data-page="dashboard">Dashboard</a>
  <a href="/admin/products.html" data-page="products">Products</a>
  <a href="/admin/orders.html" data-page="orders">Orders</a>
  <a href="/admin/customers.html" data-page="customers">Customers</a>
  <a href="/admin/settings.html" data-page="settings">Settings</a>
  <a href="/" target="_blank">↗ View Store</a>
  <a href="#" id="adminLogoutLink">Logout</a>
</nav>`;

async function initAdminShell(activePage) {
  const me = await aApi('/api/admin/me');
  if (!me.loggedIn) { location.href = '/admin/index.html'; return null; }

  const sidebar = document.getElementById('adminSidebar');
  if (sidebar) {
    sidebar.innerHTML = SIDEBAR_HTML;
    const link = sidebar.querySelector(`[data-page="${activePage}"]`);
    if (link) link.classList.add('active');
    document.getElementById('adminLogoutLink').onclick = async (e) => {
      e.preventDefault();
      await aApi('/api/admin/logout', { method: 'POST' });
      location.href = '/admin/index.html';
    };
  }
  return me;
}

const API_PREFIX = '/api';
let token = localStorage.getItem('sattwikToken') || '';
let state = { overview: null, orders: [], products: [], customers: [], custom: null };

const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const adminName = document.getElementById('adminName');

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 
function setMessage(element, text, isSuccess = false) {
  if (!element) return;
  element.textContent = text;
  element.classList.toggle('success', Boolean(isSuccess));
}

function getAuthHeaders() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_PREFIX}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text || 'Request failed' }; }
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

async function loginAdmin(email, password) {
  const data = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  token = data.token;
  localStorage.setItem('sattwikToken', token);
  return data.admin;
}

function redirectToDashboard() {
  if (window.location.pathname.endsWith('/login.html')) {
    window.location.href = '/admin/dashboard.html';
  }
}

async function loadProfile() {
  try {
    const data = await api('/auth/me');
    adminName.textContent = data.admin?.name || 'Owner';
    if (window.io && !window.adminSocket) {
      window.adminSocket = io({ auth: { token } });
      window.adminSocket.on('order:updated', loadDashboardData);
    }
    redirectToDashboard();
  } catch (error) {
    localStorage.removeItem('sattwikToken');
    token = '';
    if (window.location.pathname.endsWith('/dashboard.html')) {
      window.location.href = '/admin/login.html';
    }
  }
}

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    loginMessage.textContent = 'Signing in...';

    try {
      const admin = await loginAdmin(email, password);
      loginMessage.textContent = `Welcome ${admin.name || admin.email}`;
      window.location.href = '/admin/dashboard.html';
    } catch (error) {
      loginMessage.textContent = error.message || 'Login failed';
    }
  });
}

if (window.location.pathname.endsWith('/dashboard.html')) {
  loadProfile();

  const navButtons = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.view-panel');
  navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      navButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
      views.forEach((view) => view.classList.toggle('active', view.id === `${button.dataset.view}View`));
    });
  });

  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn(error.message || 'Logout failed');
    }
    localStorage.removeItem('sattwikToken');
    token = '';
    window.location.href = '/admin/login.html';
  });

  document.getElementById('refreshBtn')?.addEventListener('click', loadDashboardData);
  document.querySelectorAll('[data-export]').forEach((button) => {
    button.addEventListener('click', () => exportData(button.dataset.export));
  });

  document.getElementById('statusFilter')?.addEventListener('change', loadDashboardData);
  document.getElementById('typeFilter')?.addEventListener('change', loadDashboardData);
  document.getElementById('fromDate')?.addEventListener('change', loadDashboardData);
  document.getElementById('toDate')?.addEventListener('change', loadDashboardData);

  loadDashboardData();
}

function currency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
}

function dateLabel(date) {
  const d = new Date(date);
  if (Number.isNaN(d.valueOf())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function parseFilters() {
  const params = new URLSearchParams();
  const status = document.getElementById('statusFilter')?.value ?? '';
  const type = document.getElementById('typeFilter')?.value ?? '';
  const from = document.getElementById('fromDate')?.value ?? '';
  const to = document.getElementById('toDate')?.value ?? '';
  if (status) params.set('status', status);
  if (type) params.set('type', type);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return params;
}

async function loadDashboardData() {
  try {
    const params = parseFilters();
    const [overview, revenue, products, categories, customers, orderStatus, custom] = await Promise.all([
      api(`/analytics/overview?${params.toString()}`),
      api(`/analytics/revenue?group=day&${params.toString()}`),
      api(`/analytics/products?${params.toString()}`),
      api(`/analytics/categories?${params.toString()}`),
      api(`/analytics/customers?${params.toString()}`),
      api(`/analytics/order-status?${params.toString()}`),
      api(`/analytics/custom?${params.toString()}`)
    ]);

    state.overview = overview;
    renderStats(overview);
    renderRevenueChart(revenue);
    renderStatusChart(orderStatus);
    renderTopProducts(products);
    renderCustomerInsights(customers);
    renderCustomTable(custom);
    renderOrdersTable();
    renderProductsTable();
    await renderCustomersTable();
    renderExports();
  } catch (error) {
    console.error(error);
  }
}

function renderStats(data) {
  const cards = [
    { label: 'Total orders', value: data.totalOrders || 0 },
    { label: 'Revenue', value: currency(data.totalRevenue) },
    { label: 'Pending', value: data.pendingOrders || 0 },
    { label: 'Delivered', value: data.completedOrders || 0 }
  ];

  document.getElementById('statsGrid').innerHTML = cards.map((card) => `
    <div class="stat-card">
      <small>${card.label}</small>
      <strong>${card.value}</strong>
    </div>
  `).join('');
}

function renderRevenueChart(data) {
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;
  if (window.revenueChartInstance) window.revenueChartInstance.destroy();
  window.revenueChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: data.labels || [],
      datasets: [{
        label: 'Revenue',
        data: data.revenue || [],
        borderColor: '#0c7a62',
        backgroundColor: 'rgba(12,122,98,.15)',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderStatusChart(data) {
  const canvas = document.getElementById('statusChart');
  if (!canvas) return;
  if (window.statusChartInstance) window.statusChartInstance.destroy();
  window.statusChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: (data.statuses || []).map((x) => x.status),
      datasets: [{
        data: (data.statuses || []).map((x) => x.count),
        backgroundColor: ['#4a230f', '#0c7a62', '#c89b54', '#79a3ff', '#7fc4a7', '#c95f57']
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });
}

function renderTopProducts(products) {
  const rows = (products.products || []).slice(0, 5);
  document.getElementById('topProductsTable').innerHTML = `
    <table>
      <thead><tr><th>Product</th><th>Qty</th><th>Revenue</th></tr></thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td>${row.name}</td>
            <td>${row.quantity}</td>
            <td>${currency(row.revenue)}</td>
          </tr>
        `).join('') || '<tr><td colspan="3">No data</td></tr>'}
      </tbody>
    </table>
  `;
}

function renderCustomerInsights(customers) {
  const customerRows = (customers.byArea || []).slice(0, 5);
  document.getElementById('customerInsights').innerHTML = `
    <table>
      <thead><tr><th>Area</th><th>Orders</th><th>Revenue</th></tr></thead>
      <tbody>
        ${customerRows.map((row) => `
          <tr>
            <td>${row.area}</td>
            <td>${row.orders}</td>
            <td>${currency(row.revenue)}</td>
          </tr>
        `).join('') || '<tr><td colspan="3">No data</td></tr>'}
      </tbody>
    </table>
  `;
}

async function renderOrdersTable() {
  const params = parseFilters();
  const data = await api(`/orders?${params.toString()}`);
  const orders = data.orders || [];
  const table = document.getElementById('ordersTable');
  table.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Order</th><th>Customer</th><th>Type</th><th>Date</th><th>Status</th><th>Delivery member</th><th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map((order) => `
          <tr>
            <td>${order.orderId}</td>
            <td>${order.customerDoc ? `${order.customerDoc.firstName} ${order.customerDoc.lastName}` : '—'}</td>
            <td>${order.type}</td>
            <td>${dateLabel(order.createdAt)}</td>
            <td>
              <select class="order-status-select" data-order-id="${order._id}" data-current-status="${order.status}">
                ${['PENDING', 'ACCEPTED', 'OUT_FOR_DELIVERY', 'DELIVERED'].map((status) => `<option value="${status}" ${order.status === status ? 'selected' : ''}>${status.replaceAll('_', ' ')}</option>`).join('')}
              </select>
              <span class="badge ${String(order.status).toLowerCase()}">${order.status}</span>
            </td>
            <td>${order.deliveryMemberDoc?.name || 'Unassigned'}</td>
            <td>${currency(order.totalAmount)}</td>
          </tr>
        `).join('') || '<tr><td colspan="7">No orders found</td></tr>'}
      </tbody>
    </table>
  `;
  table.querySelectorAll('.order-status-select').forEach((select) => select.addEventListener('change', async () => {
    const previous = select.dataset.currentStatus;
    try {
      await api(`/orders/${select.dataset.orderId}/status`, { method: 'PUT', body: JSON.stringify({ status: select.value }) });
      await loadDashboardData();
    } catch (error) {
      select.value = previous;
      alert(error.message || 'Status update failed');
    }
  }));
}

async function renderProductsTable() {
  const data = await api('/products/all');
  const products = data.products || [];
  const table = document.getElementById('productsTable');
  table.innerHTML = `
    <table>
      <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Active</th></tr></thead>
      <tbody>
        ${products.map((product) => `
          <tr>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${currency(product.price)}</td>
            <td><input class="stock-input" data-product-id="${product._id}" type="number" min="0" step="1" value="${product.stock}"><button class="stock-save" data-product-id="${product._id}">Save</button></td>
            <td>${product.active ? 'Yes' : 'No'}</td>
          </tr>
        `).join('') || '<tr><td colspan="5">No products found</td></tr>'}
      </tbody>
    </table>
  `;
  table.querySelectorAll('.stock-save').forEach((button) => button.addEventListener('click', async () => {
    const input = table.querySelector(`.stock-input[data-product-id="${button.dataset.productId}"]`);
    const stock = Number(input.value);
    if (!Number.isInteger(stock) || stock < 0) return alert('Stock must be a non-negative integer.');
    try {
      await api(`/products/${button.dataset.productId}/stock`, { method: 'PATCH', body: JSON.stringify({ stock }) });
      await renderProductsTable();
    } catch (error) { alert(error.message || 'Could not update stock'); }
  }));
}

async function renderCustomersTable() {
  const data = await api('/customers?limit=100');
  const rows = data.customers || [];
  document.getElementById('customersTable').innerHTML = `
    <table>
      <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Area</th><th>Address</th><th>Registered</th><th>Orders</th></tr></thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td>${row.firstName || ''} ${row.lastName || ''}</td>
            <td>${row.email || '—'}</td>
            <td>${row.phone || '—'}</td>
            <td>${row.area}</td>
            <td>${row.address || '—'}</td>
            <td>${dateLabel(row.createdAt)}</td>
            <td>${row.orders}</td>
          </tr>
        `).join('') || '<tr><td colspan="7">No customer data</td></tr>'}
      </tbody>
    </table>
  `;
}

function renderCustomTable(custom) {
  const rows = (custom.recent || []).slice(0, 10);
  const table = document.getElementById('customTable');
  const totalAmount = Number(custom.totalAmount || 0);
  table.innerHTML = `
    <table>
      <thead><tr><th>Type</th><th>Customer</th><th>Request</th><th>Status</th><th>Total</th></tr></thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td>${row.type}</td>
            <td>${row.customer ? `${row.customer.firstName} ${row.customer.lastName}` : '—'}</td>
            <td>${row.customRequest || '—'}</td>
            <td><span class="badge ${row.status}">${row.status}</span></td>
            <td>${currency(row.totalAmount)}</td>
          </tr>
        `).join('') || '<tr><td colspan="5">No custom orders</td></tr>'}
      </tbody>
      ${rows.length ? `<tfoot><tr><td colspan="4"><strong>Total</strong></td><td><strong>${currency(totalAmount)}</strong></td></tr></tfoot>` : ''}
    </table>
  `;
}

function renderExports() {
  // Placeholder; CSV export handled by browser download.
}

async function exportData(kind) {
  try {
    if (kind === 'demo-clear') {
      const result = await api('/clear-demo', { method: 'POST' });
      alert(result.message || 'Demo records cleared.');
      await loadDashboardData();
      return;
    }

    const params = parseFilters();
    const endpoint = kind === 'orders' ? 'orders.csv' : 'products.csv';
    const response = await fetch(`${API_PREFIX}/export/${endpoint}?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Export failed');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${kind}-export.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    alert(error.message || 'Export failed');
  }
}

if (document.getElementById('newProductBtn')) {
  document.getElementById('newProductBtn').addEventListener('click', async () => {
    const name = prompt('Product name');
    if (!name) return;
    const category = prompt('Category (Pickles/Powders/Tiffins/Sweets/Snacks)', 'Pickles');
    const price = Number(prompt('Price', '10.00')) || 0;
    try {
      await api('/products', {
        method: 'POST',
        body: JSON.stringify({ name, category, price, active: true, stock: 0, lowStockThreshold: 5 })
      });
      await loadDashboardData();
    } catch (error) {
      alert(error.message || 'Could not add product');
    }
  });
}


// ===============================
// ADMIN MANAGEMENT
// ===============================

const addAdminForm = document.getElementById('addAdminForm');
const addAdminMessage = document.getElementById('addAdminMessage');

if (addAdminForm) {
  addAdminForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = document.getElementById('newAdminName').value.trim();
    const email = document.getElementById('newAdminEmail').value.trim();
    const password = document.getElementById('newAdminPassword').value;
    const confirmPassword = document.getElementById('newAdminConfirmPassword').value;

    setMessage(addAdminMessage, 'Creating admin...');

    if (!name || !email || !password || !confirmPassword) {
      setMessage(addAdminMessage, 'Please fill in all fields.');
      return;
    }

    if (!EMAIL_PATTERN.test(email)) {
      setMessage(addAdminMessage, 'Enter a valid email address.');
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setMessage(
        addAdminMessage,
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessage(addAdminMessage, 'Passwords do not match.');
      return;
    }

    try {
      const result = await api('/auth/admins', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          password,
          confirmPassword
        })
      });

      setMessage(
        addAdminMessage,
        result.message || 'Admin created successfully.',
        true
      );

      addAdminForm.reset();

      await loadAdmins();
    } catch (error) {
      console.error('Add admin failed:', error);
      setMessage(
        addAdminMessage,
        error.message || 'Could not create admin.'
      );
    }
  });
}


// ===============================
// LOAD EXISTING ADMINS
// ===============================

async function loadAdmins() {
  const table = document.getElementById('adminsTable');
  if (!table) return;

  try {
    const data = await api('/auth/admins');
    const admins = data.admins || [];

    table.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${
            admins.map((admin) => `
              <tr>
                <td>${admin.name || '—'}</td>
                <td>${admin.email || '—'}</td>
                <td>${admin.role || 'admin'}</td>
                <td>${dateLabel(admin.createdAt)}</td>
              </tr>
            `).join('')
            || '<tr><td colspan="4">No admins found</td></tr>'
          }
        </tbody>
      </table>
    `;
  } catch (error) {
    console.error('Could not load admins:', error);
    table.innerHTML = `
      <p class="form-message">
        ${error.message || 'Could not load admins.'}
      </p>
    `;
  }
}


// Load admins when dashboard opens
if (window.location.pathname.endsWith('/dashboard.html')) {
  loadAdmins();
}



// ===============================
// CHANGE PASSWORD
// ===============================

const changePasswordForm = document.getElementById('changePasswordForm');
const changePasswordMessage = document.getElementById('changePasswordMessage');

if (changePasswordForm) {
  changePasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const currentPassword =
      document.getElementById('currentPassword').value;

    const newPassword =
      document.getElementById('newPassword').value;

    const confirmPassword =
      document.getElementById('confirmNewPassword').value;

    setMessage(changePasswordMessage, 'Updating password...');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage(changePasswordMessage, 'Please fill in all fields.');
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setMessage(
        changePasswordMessage,
        `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage(changePasswordMessage, 'New passwords do not match.');
      return;
    }

    try {
      const result = await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });

      setMessage(
        changePasswordMessage,
        result.message || 'Password updated successfully.',
        true
      );

      changePasswordForm.reset();

      if (result.reauthRequired) {
        setTimeout(() => {
          localStorage.removeItem('sattwikToken');
          token = '';
          window.location.href = '/admin/login.html';
        }, 1500);
      }

    } catch (error) {
      console.error('Change password failed:', error);
      setMessage(
        changePasswordMessage,
        error.message || 'Could not update password.'
      );
    }
  });
}
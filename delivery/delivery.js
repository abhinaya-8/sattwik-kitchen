const deliveryToken = localStorage.getItem('sattwikDeliveryToken');
const isDeliveryLogin = Boolean(document.getElementById('deliveryLoginForm'));
const isDeliverySignup = Boolean(document.getElementById('deliverySignupForm'));
const deliveryMessage = document.getElementById('deliveryMessage');

document.getElementById('deliverySignupForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = document.getElementById('deliverySignupPassword').value;
  const confirmPassword = document.getElementById('deliverySignupConfirmPassword').value;
  if (password !== confirmPassword) {
    deliveryMessage.textContent = 'Passwords do not match.';
    return;
  }
  deliveryMessage.textContent = 'Creating account...';
  try {
    const response = await fetch('/api/delivery-auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('deliverySignupName').value.trim(),
        email: document.getElementById('deliverySignupEmail').value.trim(),
        phone: document.getElementById('deliverySignupPhone').value.trim(),
        password,
        confirmPassword
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Signup failed');
    deliveryMessage.textContent = data.message;
    setTimeout(() => { window.location.href = '/delivery/login.html'; }, 700);
  } catch (error) {
    deliveryMessage.textContent = error.message;
  }
});

async function deliveryApi(path, options = {}) {
  const response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deliveryToken}`, ...(options.headers || {}) } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

if (!isDeliveryLogin && !isDeliverySignup && !deliveryToken) window.location.href = '/delivery/login.html';

document.getElementById('deliveryLoginForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  deliveryMessage.textContent = 'Signing in...';
  try {
    const response = await fetch('/api/delivery-auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: document.getElementById('deliveryEmail').value.trim(), password: document.getElementById('deliveryPassword').value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Login failed');
    localStorage.setItem('sattwikDeliveryToken', data.token);
    localStorage.setItem('sattwikDeliveryMember', JSON.stringify(data.member));
    window.location.href = '/delivery/dashboard.html';
  } catch (error) { deliveryMessage.textContent = error.message; }
});

function money(value) { return `$${Number(value || 0).toFixed(2)}`; }
function orderCard(order) {
  const next = { PENDING: 'ACCEPTED', ACCEPTED: 'OUT_FOR_DELIVERY', OUT_FOR_DELIVERY: 'DELIVERED' }[order.status];
  const actionText = { ACCEPTED: 'Accept Order', OUT_FOR_DELIVERY: 'Start Delivery', DELIVERED: 'Mark as Delivered' }[next];
  const customer = order.customer || {};
  const assigned = order.deliveryMemberId && String(order.deliveryMemberId._id || order.deliveryMemberId) === String(JSON.parse(localStorage.getItem('sattwikDeliveryMember') || '{}').id);
  const activeLabel = assigned && ['ACCEPTED', 'OUT_FOR_DELIVERY'].includes(order.status) ? '<strong class="active-delivery-label">MY ACTIVE DELIVERY</strong>' : '';
  const acceptedTime = order.acceptedAt ? `<div><strong>Accepted</strong><br>${new Date(order.acceptedAt).toLocaleString()}</div>` : '';
  return `<article class="delivery-order ${assigned ? 'assigned-delivery' : ''}" data-delivery-order="${order._id}">${activeLabel}<div class="delivery-order-head"><div><h2>${order.orderId}</h2><p>${customer.firstName || ''} ${customer.lastName || ''} • ${customer.phone || ''}</p></div><strong class="delivery-order-total">${money(order.totalAmount)}</strong></div><div class="delivery-details"><div><strong>Address</strong><br>${order.deliveryAddress || customer.address || customer.area || 'Not provided'}</div><div><strong>Current status</strong><br>${order.status}</div>${acceptedTime}<div class="delivery-items"><strong>Products</strong>${(order.items || []).map((item) => `<span>${item.productName} × ${item.quantity}</span>`).join('')}</div></div><div class="delivery-action"><button data-order-id="${order._id}" data-next-status="${next}" ${next ? '' : 'disabled'}>${actionText || 'Complete'}</button></div></article>`;
}

async function loadDeliveryOrders() {
  if (isDeliveryLogin) return;
  try {
    const data = await deliveryApi('/delivery-orders');
    document.getElementById('deliveryOrders').innerHTML = data.orders?.length ? data.orders.map(orderCard).join('') : '<div class="empty-delivery">There are no available delivery orders right now.</div>';
    document.querySelectorAll('[data-next-status]').forEach((button) => button.addEventListener('click', async () => {
      button.disabled = true;
      try { await deliveryApi(`/delivery-orders/${button.dataset.orderId}/status`, { method: 'PUT', body: JSON.stringify({ status: button.dataset.nextStatus }) }); await loadDeliveryOrders(); }
      catch (error) { deliveryMessage.textContent = error.message; await loadDeliveryOrders(); }
    }));
  } catch (error) { deliveryMessage.textContent = error.message; }
}

document.getElementById('deliveryLogout')?.addEventListener('click', () => { localStorage.removeItem('sattwikDeliveryToken'); localStorage.removeItem('sattwikDeliveryMember'); window.location.href = '/delivery/login.html'; });

if (!isDeliveryLogin && !isDeliverySignup) {
  deliveryApi('/delivery-auth/me').then((data) => { document.getElementById('memberName').textContent = data.member.name; }).catch(() => { localStorage.removeItem('sattwikDeliveryToken'); window.location.href = '/delivery/login.html'; });
  const socket = window.io ? io({ auth: { token: deliveryToken } }) : null;
  socket?.on('order:updated', loadDeliveryOrders);
  loadDeliveryOrders();
}

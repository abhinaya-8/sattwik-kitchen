const token = localStorage.getItem('sattwikCustomerToken');
const ordersList = document.getElementById('ordersList');
const ordersMessage = document.getElementById('ordersMessage');
const orderStatusSteps = ['PENDING', 'ACCEPTED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

if (!token) window.location.href = `/customer/login.html?return=${encodeURIComponent('/customer/orders.html')}`;

function money(value) { return `$${Number(value || 0).toFixed(2)}`; }
function dateLabel(value) { return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); }
function statusLabel(status) { return String(status || '').replaceAll('_', ' '); }
function renderOrder(order) {
  const currentIndex = orderStatusSteps.indexOf(order.status);
  const finalIndex = currentIndex >= 0 ? currentIndex : 0;
  return `
    <article class="order-card" data-order-id="${order._id}">
      <div class="order-card-header">
        <div><h2>${order.orderId}</h2><p>Placed ${dateLabel(order.placedAt || order.createdAt)}</p></div>
        <strong class="order-total">${money(order.totalAmount)}</strong>
      </div>
      <div class="timeline">
        ${orderStatusSteps.map((step, index) => `<div class="timeline-step ${index < finalIndex ? 'complete' : ''} ${index === finalIndex ? 'current' : ''}"><div class="dot">${index < finalIndex ? '✓' : index === finalIndex ? '●' : '○'}</div><span>${statusLabel(step)}</span></div>`).join('')}
      </div>
      <div class="order-items">${(order.items || []).map((item) => `<div class="order-item"><span>${item.productName} × ${item.quantity}</span><strong>${money(item.subtotal)}</strong></div>`).join('')}</div>
      ${order.deliveryAddress ? `<div class="order-address"><strong>Delivery address</strong><br>${order.deliveryAddress}</div>` : ''}
    </article>
  `;
}

function renderOrders(orders) {
  if (!orders.length) {
    ordersList.innerHTML = '<div class="empty-orders">You do not have any orders yet. Return to the menu to place one.</div>';
    return;
  }
  ordersList.innerHTML = orders.map(renderOrder).join('');
}

async function loadOrders() {
  try {
    const response = await fetch('/api/customer-orders', { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Could not load orders');
    renderOrders(data.orders || []);
  } catch (error) {
    ordersMessage.textContent = error.message;
  }
}

document.getElementById('logoutButton')?.addEventListener('click', async () => {
  try { await fetch('/api/customer-auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); } catch (error) { /* local logout still completes */ }
  localStorage.removeItem('sattwikCustomerToken');
  localStorage.removeItem('sattwikCustomer');
  window.location.href = '/';
});

const socket = window.io ? io({ auth: { token } }) : null;
socket?.on('order:updated', (updatedOrder) => {
  const card = document.querySelector(`[data-order-id="${updatedOrder._id}"]`);
  if (card) card.outerHTML = renderOrder(updatedOrder);
  else loadOrders();
});

loadOrders();

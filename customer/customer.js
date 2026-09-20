const authMessage = document.getElementById('authMessage');
const returnUrl = new URLSearchParams(window.location.search).get('return') || '/';

function finishAuth(data) {
  localStorage.setItem('sattwikCustomerToken', data.token);
  localStorage.setItem('sattwikCustomer', JSON.stringify(data.customer));
  window.location.href = returnUrl;
}

async function submitAuth(url, body) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Authentication failed');
  return data;
}

document.querySelectorAll('[data-auth-tab]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-auth-tab]').forEach((tab) => tab.classList.toggle('active', tab === button));
  document.querySelectorAll('[data-auth-panel]').forEach((panel) => panel.classList.toggle('hidden', panel.dataset.authPanel !== button.dataset.authTab));
  authMessage.textContent = '';
}));

document.getElementById('signinForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  authMessage.textContent = 'Signing in...';
  try {
    finishAuth(await submitAuth('/api/customer-auth/login', {
      email: document.getElementById('signinEmail').value.trim(),
      password: document.getElementById('signinPassword').value
    }));
  } catch (error) { authMessage.textContent = error.message; }
});

document.getElementById('signupForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  authMessage.textContent = 'Creating your account...';
  try {
    finishAuth(await submitAuth('/api/customer-auth/signup', {
      name: document.getElementById('signupName').value.trim(),
      email: document.getElementById('signupEmail').value.trim(),
      phone: document.getElementById('signupPhone').value.trim(),
      password: document.getElementById('signupPassword').value,
    }));
  } catch (error) { authMessage.textContent = error.message; }
});

const navToggle=document.querySelector('.nav-toggle');
const navLinks=document.querySelector('.nav-links');
navToggle?.addEventListener('click',()=>{
  const open=navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded',open?'true':'false');
});
document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',()=>{
  navLinks.classList.remove('open');
  navToggle?.setAttribute('aria-expanded','false');
}));

const customerAccountLink = document.getElementById('customerAccountLink');
const customerOrdersLink = document.getElementById('customerOrdersLink');
const customerLogoutBtn = document.getElementById('customerLogoutBtn');
let customerToken = localStorage.getItem('sattwikCustomerToken') || '';

function updateCustomerAuthUI() {
  customerToken = localStorage.getItem('sattwikCustomerToken') || '';
  if (customerToken) {
    customerAccountLink?.classList.add('hidden');
    customerOrdersLink?.classList.remove('hidden');
    customerLogoutBtn?.classList.remove('hidden');
  } else {
    customerAccountLink?.classList.remove('hidden');
    customerOrdersLink?.classList.add('hidden');
    customerLogoutBtn?.classList.add('hidden');
  }
}

async function performCustomerLogout() {
  try {
    if (customerToken) {
      await fetch('/api/customer-auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${customerToken}` } });
    }
  } catch (e) {}
  localStorage.removeItem('sattwikCustomerToken');
  localStorage.removeItem('sattwikCustomer');
  updateCustomerAuthUI();
  window.location.href = '/';
}

customerLogoutBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  performCustomerLogout();
});

updateCustomerAuthUI();

// Pickles / Powders / Custom Order tabs.
const menuTabs=document.querySelectorAll('[data-menu-tab]');
const menuPanels=document.querySelectorAll('[data-menu-panel]');
menuTabs.forEach(btn=>btn.addEventListener('click',()=>{
  const target=btn.dataset.menuTab;
  menuTabs.forEach(tab=>{
    const active=tab===btn;
    tab.classList.toggle('active',active);
    tab.setAttribute('aria-selected',active?'true':'false');
  });
  menuPanels.forEach(panel=>panel.classList.toggle('hidden',panel.dataset.menuPanel!==target));
}));

// Cart lives in the top-right header. Product +/- controls update it immediately.
const cart=new Map();
let customRequest='';
const cartButton=document.getElementById('cartButton');
const cartDrawer=document.getElementById('cartDrawer');
const cartBackdrop=document.getElementById('cartBackdrop');
const cartClose=document.getElementById('cartClose');
const cartItems=document.getElementById('cartItems');
const cartEmpty=document.getElementById('cartEmpty');
const cartTotal=document.getElementById('cartTotal');
const cartCount=document.getElementById('cartCount');
const customCartNote=document.getElementById('customCartNote');
const customerDetailsForm=document.getElementById('customerDetailsForm');
const customerFirstName=document.getElementById('customerFirstName');
const customerLastName=document.getElementById('customerLastName');
const customerPhone=document.getElementById('customerPhone');
const customerEmail=document.getElementById('customerEmail');
const customerFormStatus=document.getElementById('customerFormStatus');
const sendCartWhatsApp=document.getElementById('sendCartWhatsApp');

function money(value){return `$${value.toFixed(2)}`}

function openCart(){
  cartDrawer?.classList.add('open');
  cartBackdrop?.classList.add('open');
  cartDrawer?.setAttribute('aria-hidden','false');
  cartBackdrop?.setAttribute('aria-hidden','false');
  cartButton?.setAttribute('aria-expanded','true');
  document.body.classList.add('cart-open');
  setTimeout(()=>cartClose?.focus(),50);
}
function closeCart(){
  cartDrawer?.classList.remove('open');
  cartBackdrop?.classList.remove('open');
  cartDrawer?.setAttribute('aria-hidden','true');
  cartBackdrop?.setAttribute('aria-hidden','true');
  cartButton?.setAttribute('aria-expanded','false');
  document.body.classList.remove('cart-open');
}
cartButton?.addEventListener('click',openCart);
cartClose?.addEventListener('click',closeCart);
cartBackdrop?.addEventListener('click',closeCart);
document.addEventListener('keydown',e=>{if(e.key==='Escape') closeCart()});

function findProductCard(name){
  return [...document.querySelectorAll('.product-card')].find(card=>card.dataset.product===name);
}
function setProductDisplayQty(name,qty){
  const card=findProductCard(name);
  if(!card) return;
  const value=card.querySelector('.qty-value');
  if(value) value.textContent=String(qty);
  card.classList.toggle('selected',qty>0);
}
function setCartQty(name,price,qty){
  const safeQty=Math.max(0,Math.min(99,qty));
  if(safeQty===0) cart.delete(name);
  else cart.set(name,{price,qty:safeQty});
  setProductDisplayQty(name,safeQty);
  renderCart();
}

function customerDetailsValid(){
  const fields=[customerFirstName,customerLastName,customerPhone,customerEmail];
  return fields.every(field=>field && field.value.trim() && field.checkValidity());
}
function hasEnquiry(){return cart.size>0||Boolean(customRequest)}
function updateSendState(){
  const ready=hasEnquiry()&&customerDetailsValid();
  if(sendCartWhatsApp) sendCartWhatsApp.disabled=!ready;
  if(!customerFormStatus) return;
  if(!hasEnquiry()) customerFormStatus.textContent='Add at least one product or a custom request before sending your enquiry.';
  else if(!customerDetailsValid()) customerFormStatus.textContent='Complete your first name, last name, phone number and a valid email address.';
  else customerFormStatus.textContent='Ready — your contact details and order will be included in the WhatsApp message.';
  customerFormStatus.classList.toggle('ready',ready);
}

function renderCart(){
  if(!cartItems) return;
  cartItems.innerHTML='';
  let subtotal=0;
  let count=0;

  cart.forEach((item,name)=>{
    subtotal+=item.price*item.qty;
    count+=item.qty;
    const row=document.createElement('div');
    row.className='cart-item';

    const main=document.createElement('div');
    main.className='cart-item-main';
    main.innerHTML=`<strong>${name}</strong><small>${money(item.price)} each</small>`;

    const price=document.createElement('div');
    price.className='cart-item-price';
    price.textContent=money(item.price*item.qty);

    const stepper=document.createElement('div');
    stepper.className='cart-item-stepper';
    stepper.innerHTML=`<button type="button" aria-label="Decrease ${name}" data-cart-product="${name}" data-cart-delta="-1">−</button><span>${item.qty}</span><button type="button" aria-label="Increase ${name}" data-cart-product="${name}" data-cart-delta="1">+</button>`;

    const remove=document.createElement('button');
    remove.type='button';
    remove.className='cart-item-remove';
    remove.dataset.remove=name;
    remove.textContent='Remove';

    row.append(main,price,stepper,remove);
    cartItems.appendChild(row);
  });

  cartEmpty?.classList.toggle('hidden',hasEnquiry());
  if(customRequest){
    customCartNote.textContent=`Custom request: ${customRequest}`;
    customCartNote.classList.remove('hidden');
  }else{
    customCartNote.textContent='';
    customCartNote.classList.add('hidden');
  }
  if(cartTotal) cartTotal.textContent=money(subtotal);
  if(cartCount) cartCount.textContent=String(count);
  cartButton?.classList.toggle('has-items',hasEnquiry());
  updateSendState();
}

document.querySelectorAll('.product-card').forEach(card=>{
  const name=card.dataset.product;
  const price=Number(card.dataset.price);
  const qtyValue=card.querySelector('.qty-value');

  card.querySelector('.qty-minus')?.addEventListener('click',()=>{
    const current=Number(qtyValue?.textContent||0);
    setCartQty(name,price,current-1);
  });
  card.querySelector('.qty-plus')?.addEventListener('click',()=>{
    const current=Number(qtyValue?.textContent||0);
    setCartQty(name,price,current+1);
  });
});

cartItems?.addEventListener('click',e=>{
  const deltaButton=e.target.closest('[data-cart-delta]');
  if(deltaButton){
    const name=deltaButton.dataset.cartProduct;
    const item=cart.get(name);
    if(item) setCartQty(name,item.price,item.qty+Number(deltaButton.dataset.cartDelta));
    return;
  }
  const removeButton=e.target.closest('[data-remove]');
  if(removeButton){
    const name=removeButton.dataset.remove;
    const item=cart.get(name);
    if(item) setCartQty(name,item.price,0);
  }
});

document.getElementById('addCustomOrder')?.addEventListener('click',()=>{
  const input=document.getElementById('customOrderText');
  const status=document.getElementById('customOrderStatus');
  const value=input.value.trim();
  if(!value){
    status.textContent='Please add your custom order details first.';
    input.focus();
    return;
  }
  customRequest=value;
  status.textContent='Custom request added to your cart.';
  renderCart();
  openCart();
});

[customerFirstName,customerLastName,customerPhone,customerEmail].forEach(field=>{
  field?.addEventListener('input',updateSendState);
  field?.addEventListener('change',updateSendState);
});

customerDetailsForm?.addEventListener('submit',e=>{
  e.preventDefault();
  if(!hasEnquiry()){
    updateSendState();
    return;
  }
  if(!customerDetailsValid()){
    customerDetailsForm.reportValidity();
    updateSendState();
    return;
  }

  let subtotal=0;
  const lines=[
    'Hi Sattwik Kitchen, I would like to send an order enquiry.',
    '',
    'Customer details:',
    `First name: ${customerFirstName.value.trim()}`,
    `Last name: ${customerLastName.value.trim()}`,
    `Phone: ${customerPhone.value.trim()}`,
    `Email: ${customerEmail.value.trim()}`,
    '',
    'Order requirement:'
  ];

  cart.forEach((item,name)=>{
    const lineTotal=item.price*item.qty;
    subtotal+=lineTotal;
    lines.push(`• ${name} × ${item.qty} — ${money(lineTotal)}`);
  });
  if(cart.size) lines.push('',`Estimated item subtotal: ${money(subtotal)}`);
  if(customRequest) lines.push('',`Custom request: ${customRequest}`);
  lines.push('','Please confirm availability, final price, and delivery/pickup options.');

  window.open(`https://wa.me/16725881282?text=${encodeURIComponent(lines.join('\n'))}`,'_blank','noopener');
});

renderCart();

document.querySelectorAll('.plan-toggle button').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.plan-toggle button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const full=document.getElementById('fullPlans');
    const curry=document.getElementById('curryPlans');
    if(btn.dataset.plan==='full'){full.classList.remove('hidden');curry.classList.add('hidden')}
    else{curry.classList.remove('hidden');full.classList.add('hidden')}
  });
});

document.getElementById('orderForm')?.addEventListener('submit',e=>{
  e.preventDefault();
  const name=document.getElementById('name').value.trim();
  const interest=document.getElementById('interest').value;
  const area=document.getElementById('area').value.trim();
  const details=document.getElementById('details').value.trim();
  const lines=[`Hi Sattwik Kitchen, my name is ${name}.`,`I'm interested in: ${interest}.`];
  if(area) lines.push(`My area: ${area}.`);
  if(details) lines.push(`Order details: ${details}`);
  lines.push('Please let me know the availability and price.');
  window.open(`https://wa.me/16725881282?text=${encodeURIComponent(lines.join('\n'))}`,'_blank','noopener');
});

document.getElementById('year').textContent=new Date().getFullYear();
const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.1});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

require('dotenv').config();
const connectDB = require('../config/db');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const { TIFFIN_PRICES, tiffinDisplayName } = require('../utils/constants');

const IMG = {
  mango: 'https://res.cloudinary.com/spfurewl/image/upload/v1789330097/pickles.png',
  curryLeaf: 'https://res.cloudinary.com/spfurewl/image/upload/v1789330130/powders.png'
};

const PRODUCTS = [
  { name: 'Tomato Pickle', category: 'Pickles', price: 8.99, stock: 25, description: 'House-made tomato pickle prepared in small batches.' },
  { name: 'Mango Pickle', category: 'Pickles', price: 9.99, image: IMG.mango, stock: 40, lowStockThreshold: 8, description: 'Classic Andhra-style mango pickle.' },
  { name: 'Raw Tamarind Pickle', category: 'Pickles', price: 9.99, stock: 18, description: 'Tangy raw tamarind pickle.' },
  { name: 'Amla Pickle', category: 'Pickles', price: 11.99, stock: 3, lowStockThreshold: 5, description: 'Nutrient-rich amla pickle.' },
  { name: 'Gongura Pickle', category: 'Pickles', price: 11.99, stock: 22, description: 'Sorrel leaf pickle.' },
  { name: 'Pulihora Pulusu', category: 'Pickles', price: 6.99, stock: 30, description: 'Instant tamarind paste for pulihora.' },
  { name: 'Peanut Powder', category: 'Powders', price: 6.99, stock: 35, description: 'Roasted peanut podi.' },
  { name: 'Flax Seed Powder', category: 'Powders', price: 8.99, stock: 12, description: 'Ground flax seed powder.' },
  { name: 'Moringa Leaf Powder', category: 'Powders', price: 11.99, stock: 20, description: 'Dried moringa leaf powder.' },
  { name: 'Curry Leaf Powder', category: 'Powders', price: 11.99, image: IMG.curryLeaf, stock: 0, description: 'Roasted curry leaf podi.' }
];

const FIRST = ['Priya', 'Anitha', 'Ravi', 'Kiran', 'Divya', 'Suresh', 'Meena', 'Arjun', 'Lakshmi', 'Vikram', 'Sneha', 'Karthik'];
const LAST = ['Sharma', 'Reddy', 'Nair', 'Patel', 'Kumar', 'Iyer', 'Singh', 'Verma', 'Rao', 'Menon', 'Kaur', 'Das'];
const AREAS = ['Burnaby', 'New Westminster', 'Surrey', 'Delta', 'Coquitlam', 'Richmond'];
const STATUSES = ['DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'ACCEPTED', 'ACCEPTED', 'OUT_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'PENDING', 'PENDING', 'CANCELLED'];

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const ri = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function clearDemo() {
  const orders = await Order.deleteMany({ isDemo: true });
  const customers = await Customer.deleteMany({ isDemo: true });
  console.log(`Cleared demo data: ${orders.deletedCount} orders, ${customers.deletedCount} customers`);
}

(async () => {
  await connectDB();

  if (process.argv.includes('--clear')) {
    await clearDemo();
    process.exit(0);
  }

  const existingNames = new Set((await Product.find({}, 'name')).map((p) => p.name));
  const toInsert = PRODUCTS.filter((p) => !existingNames.has(p.name)).map((p) => ({ ...p, isDemo: true }));
  if (toInsert.length) await Product.insertMany(toInsert);
  const products = await Product.find().lean();
  console.log(`${products.length} products ready`);

  const customers = [];
  for (let i = 0; i < 12; i++) {
    const firstName = FIRST[i];
    const lastName = rnd(LAST);
    const phone = `+1 604 555 0${100 + i}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    const existingCustomer = await Customer.findOne({ phone });
    customers.push(existingCustomer || await Customer.create({
      firstName,
      lastName,
      phone,
      email,
      area: rnd(AREAS),
      isDemo: true
    }));
  }

  const now = Date.now();
  const orders = [];

  for (let d = 0; d < 90; d++) {
    const dailyCount = Math.random() < 0.35 ? 0 : ri(1, 4);
    for (let i = 0; i < dailyCount; i++) {
      const customer = rnd(customers);
      const createdAt = new Date(now - d * 86400000 - ri(8, 20) * 3600000);
      const roll = Math.random();
      let items = [];
      let type = 'product';
      let tiffinPlan = { packageType: null, size: null, price: null };
      let customRequest = '';

      if (roll < 0.62) {
        const picks = [...products].sort(() => Math.random() - 0.5).slice(0, ri(1, 3));
        items = picks.map((product) => {
          const quantity = ri(1, 4);
          return {
            productId: product._id,
            productName: product.name,
            category: product.category,
            priceAtPurchase: product.price,
            quantity,
            subtotal: Math.round(product.price * quantity * 100) / 100
          };
        });
      } else if (roll < 0.8) {
        type = 'tiffin';
        const pkg = rnd(['full', 'curry-only']);
        const size = rnd(['single', 'couple', 'family']);
        const price = TIFFIN_PRICES[pkg][size];
        items = [{
          productId: null,
          productName: tiffinDisplayName(pkg, size),
          category: 'Tiffin Plans',
          priceAtPurchase: price,
          quantity: 1,
          subtotal: price
        }];
        tiffinPlan = { packageType: pkg, size, price };
      } else if (roll < 0.9) {
        type = 'custom';
        const trays = ri(2, 6);
        const guests = ri(10, 40);
        customRequest = `Demo custom request: ${trays} trays of assorted snacks for a weekend gathering of ${guests} guests.`;
        items = [{
          productId: null,
          productName: `${trays} Snack Trays (${guests} guests)`,
          category: 'Custom',
          priceAtPurchase: 50,
          quantity: trays,
          subtotal: trays * 50
        }];
      } else {
        type = 'catering';
        const guests = ri(20, 80);
        customRequest = `Demo catering enquiry: vegetarian catering for ${guests} guests, South Indian menu preferred.`;
        items = [{
          productId: null,
          productName: `Vegetarian Catering (${guests} guests)`,
          category: 'Catering',
          priceAtPurchase: 25,
          quantity: guests,
          subtotal: guests * 25
        }];
      }

      const totalAmount = Math.round(items.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100;
      const status = d < 2 ? rnd(['PENDING', 'ACCEPTED', 'OUT_FOR_DELIVERY']) : rnd(STATUSES);

      orders.push({
        customer: customer._id,
        items,
        type,
        tiffinPlan,
        customRequest,
        totalAmount,
        status,
        isDemo: true,
        createdAt,
        updatedAt: createdAt
      });
    }
  }

  await Order.insertMany(orders);
  console.log(`Seeded ${orders.length} demo orders across the last 90 days`);
  console.log('Done. Login at /admin/login.html with the admin email/password.');
  process.exit(0);
})();

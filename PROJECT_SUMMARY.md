# Sattwik Kitchen Project Summary

## Project Overview

Sattwik Kitchen is a full-stack ordering, delivery tracking, and business analytics system built with:

- Node.js
- Express
- MongoDB
- Mongoose
- JWT authentication
- bcrypt password hashing
- Socket.IO real-time updates
- HTML, CSS, and JavaScript frontend pages

The existing public website design and cart functionality were preserved.

## Local URLs

Public customer website:

http://localhost:5000

Customer login:

http://localhost:5000/customer/login

Customer My Orders:

http://localhost:5000/customer/orders

Admin login:

http://localhost:5000/admin/login.html

Admin dashboard:

http://localhost:5000/admin/dashboard.html

Delivery login:

http://localhost:5000/delivery/login

Delivery dashboard:

http://localhost:5000/delivery/dashboard

## Customer Workflow

1. Customer opens the public website.
2. Customer browses products and adds products or tiffin plans to the cart.
3. Customer clicks the order button.
4. If the customer is not logged in, the customer is redirected to customer login.
5. Cart contents are stored in localStorage and preserved during login.
6. Customer signs up or signs in.
7. Customer returns to the existing checkout flow.
8. Customer submits the order.
9. The backend verifies product prices from MongoDB.
10. The order is saved with status PENDING.
11. The customer can track the order through My Orders.
12. A WhatsApp confirmation message is opened after the order is saved.

Customers do not need access to the admin or delivery pages.

## Customer Authentication

Customer signup requires:

- Full name
- Email
- Phone
- Password
- Delivery address
- Area

Customer sign-in requires:

- Email
- Password

Authentication uses:

- bcrypt password hashing
- JWT tokens
- Protected order creation endpoints
- Customer-specific order queries

Important files:

- customer/login.html
- customer/orders.html
- customer/customer.js
- customer/customer-orders.js
- customer/customer.css
- server/routes/customerAuth.js
- server/middleware/customerAuth.js

## Order Database Records

Each order stores:

- orderId
- customer
- customerId
- items
- product names
- quantities
- price at purchase
- item subtotals
- totalAmount
- deliveryAddress
- deliveryMemberId
- status
- placedAt
- acceptedAt
- outForDeliveryAt
- deliveredAt
- createdAt
- updatedAt

The backend calculates totals using database prices instead of trusting browser-submitted prices.

## Order Status Workflow

Valid delivery status sequence:

PENDING
  -> ACCEPTED
  -> OUT_FOR_DELIVERY
  -> DELIVERED

CANCELLED is also supported for administrative cancellation.

The backend rejects invalid status jumps. For example, an order cannot move directly from PENDING to DELIVERED.

## Delivery Member Workflow

Delivery members use a separate portal.

1. Delivery member signs in.
2. Delivery member sees pending orders and assigned active orders.
3. Delivery member accepts a pending order.
4. Order changes to ACCEPTED.
5. Delivery member starts delivery.
6. Order changes to OUT_FOR_DELIVERY.
7. Delivery member completes delivery.
8. Order changes to DELIVERED.

The delivery page shows:

- Order ID
- Customer name
- Phone number
- Delivery address
- Ordered products
- Quantities
- Total amount
- Current order status

Important files:

- delivery/login.html
- delivery/dashboard.html
- delivery/delivery.js
- delivery/delivery.css
- server/models/DeliveryMember.js
- server/routes/deliveryAuth.js
- server/routes/deliveryOrders.js
- server/middleware/deliveryAuth.js

Delivery accounts are created through the delivery signup page.

## Real-Time Tracking

Socket.IO is used for real-time status updates.

When a delivery member changes an order:

1. Backend validates the status transition.
2. MongoDB is updated.
3. The relevant timestamp is saved.
4. The backend emits an order:updated event.
5. The customer receives the update in My Orders.
6. The admin dashboard refreshes its order and analytics data.
7. The delivery dashboard refreshes its order list.

MongoDB remains the source of truth. If a browser disconnects, the page reloads the latest state from the API.

Important files:

- server/server.js
- server/utils/orderEvents.js
- customer/customer-orders.js
- delivery/delivery.js
- admin/admin.js

## Admin Dashboard

The existing admin dashboard includes:

- Admin login
- Overview KPIs
- Revenue trend
- Order status chart
- Product sales
- Customer insights
- Custom and catering orders
- Product inventory
- CSV exports
- Status controls
- Real-time order refresh

Admin pages:

- admin/login.html
- admin/dashboard.html
- admin/admin.js
- admin/admin.css

Admin accounts are created through the admin signup page.

## CSV Exports

The admin dashboard supports:

- Orders CSV export
- Product sales CSV export

The export endpoints are:

- /api/export/orders.csv
- /api/export/products.csv

The frontend downloads the CSV responses as files.

## Product Data

Products are stored in MongoDB and loaded dynamically by the public website.

Currently database-backed categories include:

- Pickles
- Powders

Sweets and snacks currently use the original Facebook links from the supplied website and have not yet been converted into database-backed product sections.

## Seed Data

The project includes a repeatable seed script:

npm run seed

The seed script creates or reuses:

- Products
- Demo customers
- Demo orders
- Admin account
- Delivery member account

The seed script is designed to avoid duplicate customer errors when run repeatedly.

## Environment Configuration

Environment files:

- .env
- .env.example

Important variables:

- PORT
- MONGO_URI
- JWT_SECRET
- JWT_EXPIRES_IN
- ADMIN_EMAIL
- ADMIN_PASSWORD
- DELIVERY_EMAIL
- DELIVERY_PASSWORD
- DELIVERY_NAME
- DELIVERY_PHONE
- WHATSAPP_NUMBER

## Main Backend Files

- server/server.js
- server/config/db.js
- server/models/Product.js
- server/models/Customer.js
- server/models/Order.js
- server/models/Admin.js
- server/models/DeliveryMember.js
- server/controllers/orderController.js
- server/controllers/productController.js
- server/controllers/analyticsController.js
- server/routes/orders.js
- server/routes/products.js
- server/routes/customerAuth.js
- server/routes/customerOrders.js
- server/routes/deliveryAuth.js
- server/routes/deliveryOrders.js
- server/routes/analytics.js
- server/routes/export.js
- server/middleware/auth.js
- server/middleware/customerAuth.js
- server/middleware/deliveryAuth.js
- server/utils/orderEvents.js
- server/utils/seed.js

## Verification Completed

The following flow was tested successfully against the local MongoDB database:

Signup -> authenticated customer order -> PENDING -> ACCEPTED -> OUT_FOR_DELIVERY -> DELIVERED

Verification confirmed:

- Customer signup works.
- Customer login works.
- Authenticated order creation works.
- New orders start as PENDING.
- Delivery login works.
- Valid status transitions work.
- Status timestamps are stored.
- Customer My Orders returns the updated status.
- Admin authentication works.
- CSV exports return real data.
- Customer and delivery route aliases return HTTP 200.
- JavaScript syntax checks pass.
- MongoDB connection works locally.

## Local Setup Commands

Install dependencies:

npm install

Seed the database:

npm run seed

Start the application:

npm start

Development mode:

npm run dev

## Current Limitations

- Sweets and snacks still point to the original Facebook pages.
- GPS and live map tracking are not implemented.
- Payment processing is not implemented.
- The default admin and delivery passwords should be changed before deployment.
- Production deployment still requires secure environment variables, HTTPS, and a production MongoDB connection.

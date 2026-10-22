# ChandWeb Procurement — Full-Stack MERN Application

A production-ready procurement tracking and logging web application built with MongoDB, Express.js, React.js (Vite), and Node.js. Designed around your team's actual Google Sheets workflow.

---

## Workflow Modules

| Module | Mirrors Sheet | Description |
|--------|--------------|-------------|
| **Procurement Indents** | Procurement Indent Status File | Plan what materials to order |
| **Purchase Orders** | My Orders | Track orders placed with vendors |
| **Goods Received** | Goods Receiving Data | Log deliveries with invoice details |
| **Product Master** | PMST | Raw material catalog |
| **Vendors** | — | Supplier database |
| **Reports** | — | Price history, CSV exports |

---

## Prerequisites

- Node.js v18+
- MongoDB v6+ (running locally on `mongodb://localhost:27017`)

---

## Quick Start

### 1. Backend Setup

```bash
cd server
cp .env.example .env       # Edit if needed
npm install
npm run seed               # Load demo data (vendors, products, 30+ records)
npm run dev                # Starts on http://localhost:5080
```

### 2. Frontend Setup

```bash
cd client
npm install
npm run dev                # Starts on http://localhost:5180
```

### 3. Open the App

Visit **http://localhost:5180**

---

## Demo Login Credentials

| Name | Email | Password | Role |
|------|-------|----------|------|
| Admin | admin@chandweb.com | Admin@123 | admin |
| Mathangi | mathangi@chandweb.com | Admin@123 | manager |
| Abdul | abdul@chandweb.com | Admin@123 | manager |
| Diya | diya@chandweb.com | Admin@123 | viewer |

---

## Price Calculation Formula

| Unit | Conversion | Result |
|------|-----------|--------|
| kg | — | price ÷ qty |
| grams / gm | ÷ 1000 | price ÷ (qty/1000) |
| tonnes | × 1000 | price ÷ (qty×1000) |
| litres, pieces, boxes, nos | — | price per unit (no /kg shown) |

---

## REST API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Indents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/indents` | List all indents (search, filter, paginate) |
| POST | `/api/indents` | Create indent |
| GET | `/api/indents/:id` | Get indent detail |
| PUT | `/api/indents/:id` | Update indent |
| DELETE | `/api/indents/:id` | Delete indent |

### Purchase Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/procurement` | List all orders |
| POST | `/api/procurement` | Create order (auto-calculates price/kg) |
| GET | `/api/procurement/:id` | Get order + price comparison |
| PUT | `/api/procurement/:id` | Update order |
| DELETE | `/api/procurement/:id` | Delete order |

### Goods Receipts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/goods-receipts` | List all receipts |
| POST | `/api/goods-receipts` | Record receipt (auto-calculates price/kg) |
| GET | `/api/goods-receipts/:id` | Get receipt + price comparison |
| PUT | `/api/goods-receipts/:id` | Update receipt |
| DELETE | `/api/goods-receipts/:id` | Delete receipt (admin only) |

### Vendors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vendors` | List vendors |
| GET | `/api/vendors/dropdown` | Minimal list for selectors |
| POST | `/api/vendors` | Create vendor |
| GET | `/api/vendors/:id` | Get vendor detail |
| PUT | `/api/vendors/:id` | Update vendor |
| DELETE | `/api/vendors/:id` | Delete vendor (blocked if has history) |
| GET | `/api/vendors/:id/history` | Purchase history |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/price-history/:productCode` | Full price history for a product |
| GET | `/api/reports/monthly?year=2026` | Monthly receipt summary |
| GET | `/api/reports/vendor-summary` | Vendor-wise totals |
| GET | `/api/reports/export/goods-receipts` | CSV export |
| GET | `/api/reports/export/indents` | CSV export |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Summary stats + price alerts |

---

## Project Structure

```
ChandWeb/
├── server/
│   ├── config/db.js
│   ├── middleware/        auth.js, errorHandler.js
│   ├── models/            User, Vendor, Product, Indent, Procurement, GoodsReceipt
│   ├── controllers/       authController, vendorController, indentController,
│   │                      procurementController, goodsReceiptController,
│   │                      dashboardController, reportsController, productController
│   ├── routes/            auth, vendors, indents, procurement, goodsReceipts,
│   │                      dashboard, reports, products
│   ├── utils/priceCalculator.js
│   ├── seed/seed.js
│   └── index.js
│
└── client/
    ├── src/
    │   ├── api/axios.js
    │   ├── context/AuthContext.jsx
    │   ├── components/    Layout, Sidebar, MobileHeader, UI, StatusBadge,
    │   │                  PriceComparison, PriceCalculatorPreview, VendorSelector
    │   ├── pages/         Login, Dashboard, IndentList/Form/Detail,
    │   │                  ProcurementList/Form/Detail, GoodsReceiptList/Form/Detail,
    │   │                  VendorList/Form/Detail, ProductList, Reports
    │   └── utils/helpers.js
    └── vite.config.js
```

---

## Environment Variables

### server/.env
```
PORT=5080
MONGO_URI=mongodb://localhost:27017/chandweb_procurement
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d
NODE_ENV=development
```

---

## Future Extensibility

The modular architecture supports adding:
- Purchase approvals workflow
- Goods receipt → inventory transfer
- Supplier quotations
- Payment tracking
- Attachments (invoices/photos)
- WhatsApp/email notifications
- Role-based approval chains

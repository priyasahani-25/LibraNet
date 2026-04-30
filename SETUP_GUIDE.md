# LibraNet — Complete Setup Guide
## Node.js + Express + MongoDB + Vanilla JS Frontend

---

## PREREQUISITES

Install these before starting:

| Tool       | Version  | Download                        |
|------------|----------|---------------------------------|
| Node.js    | 18+      | https://nodejs.org              |
| MongoDB    | 6+       | https://www.mongodb.com/try/download/community |
| npm        | 9+       | Comes with Node.js              |

Verify installations:
```bash
node --version     # should print v18.x.x or higher
npm --version      # should print 9.x.x or higher
mongod --version   # should print v6.x.x or higher
```

---

## STEP 1 — Clone / Create Project Structure

Create the folder structure exactly as shown:

```
libranet/
├── backend/
│   ├── server.js
│   ├── seed.js
│   ├── .env
│   ├── package.json
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   ├── Book.js
│   │   ├── Member.js
│   │   ├── Transaction.js
│   │   └── OtherModels.js       ← Fine, Supplier, PurchaseOrder
│   ├── routes/
│   │   ├── auth.js
│   │   ├── books.js
│   │   ├── members.js
│   │   ├── transactions.js
│   │   ├── fines.js             ← exports fineRouter
│   │   ├── suppliers.js         ← exports supplierRouter
│   │   ├── purchaseOrders.js    ← exports poRouter
│   │   ├── reports.js           ← exports reportRouter
│   │   └── _combined.js         ← all four routers defined here
│   └── middleware/
│       └── auth.js
└── frontend/
    ├── index.html
    ├── css/
    │   └── style.css
    └── js/
        ├── api.js
        └── app.js
```

---

## STEP 2 — Start MongoDB

### Option A: Local MongoDB (Recommended for development)

```bash
# macOS (with Homebrew)
brew services start mongodb-community

# Ubuntu/Debian Linux
sudo systemctl start mongod

# Windows — run in Command Prompt as Administrator
net start MongoDB

# Or start manually on any OS
mongod --dbpath /data/db
```

Verify MongoDB is running:
```bash
mongosh
# You should see: Current Mongosh Log ID: ...
# Type: exit  to quit
```

### Option B: MongoDB Atlas (Cloud — Free Tier)
1. Go to https://cloud.mongodb.com
2. Create a free cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string
5. Replace MONGO_URI in `.env` with your connection string:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/libranet
   ```

---

## STEP 3 — Configure Environment Variables

Edit `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/libranet
JWT_SECRET=libranet_super_secret_key_2026
FINE_PER_DAY=10
```

> ⚠️  Change JWT_SECRET to a long random string in production.

---

## STEP 4 — Install Backend Dependencies

```bash
cd libranet/backend
npm install
```

This installs:
- **express** — web framework
- **mongoose** — MongoDB ODM
- **jsonwebtoken** — JWT authentication
- **bcryptjs** — password hashing
- **cors** — cross-origin requests
- **dotenv** — environment variables
- **morgan** — HTTP request logger
- **nodemon** — auto-restart on file changes (dev)

---

## STEP 5 — Seed the Database

Populate MongoDB with sample data (books, members, transactions, fines):

```bash
cd libranet/backend
node seed.js
```

Expected output:
```
✅ MongoDB Connected: localhost
🌱 Seeding database...
🗑  Cleared existing data
👥 Created 6 members
📚 Created 10 books
🏭 Created 3 suppliers
✅ Database seeded successfully!

─────────────────────────────────────────
  Librarian Login:
  Email   : librarian@libranet.com
  Password: librarian123
─────────────────────────────────────────
```

---

## STEP 6 — Start the Server

```bash
cd libranet/backend

# For development (auto-restarts on changes):
npm run dev

# For production:
npm start
```

Expected output:
```
✅ MongoDB Connected: localhost
🚀 LibraNet server running at http://localhost:5000
📚 API base: http://localhost:5000/api
```

---

## STEP 7 — Open the App

Open your browser and go to:
```
http://localhost:5000
```

Login with:
- **Email:**    librarian@libranet.com
- **Password:** librarian123

---

## API ENDPOINTS REFERENCE

### Authentication
| Method | Endpoint           | Description        |
|--------|--------------------|--------------------|
| POST   | /api/auth/login    | Login              |
| POST   | /api/auth/register | Register user      |
| GET    | /api/auth/me       | Get current user   |

### Books
| Method | Endpoint                  | Description                    |
|--------|---------------------------|--------------------------------|
| GET    | /api/books                | List all books (search/filter) |
| GET    | /api/books/:id            | Get single book                |
| POST   | /api/books                | Add new book                   |
| PUT    | /api/books/:id            | Update book                    |
| DELETE | /api/books/:id            | Delete book                    |
| GET    | /api/books/stats/summary  | Book statistics                |

**Query parameters for GET /api/books:**
```
?search=algorithms    → search title/author/isbn
?subject=Mathematics  → filter by subject
?status=available     → filter by status
?page=1&limit=20      → pagination
```

### Members
| Method | Endpoint                    | Description       |
|--------|-----------------------------|-------------------|
| GET    | /api/members                | List all members  |
| GET    | /api/members/:id            | Get single member |
| POST   | /api/members                | Add new member    |
| PUT    | /api/members/:id            | Update member     |
| DELETE | /api/members/:id            | Delete member     |
| GET    | /api/members/stats/summary  | Member statistics |

### Transactions
| Method | Endpoint                        | Description           |
|--------|---------------------------------|-----------------------|
| GET    | /api/transactions               | List all transactions |
| POST   | /api/transactions/issue         | Issue a book          |
| POST   | /api/transactions/return        | Return a book         |
| POST   | /api/transactions/renew         | Renew a book          |
| GET    | /api/transactions/overdue/list  | List all overdue      |

**Issue book body:**
```json
{
  "bookId":   "64abc123...",
  "memberId": "64def456...",
  "dueDays":  14
}
```

**Return book body:**
```json
{
  "transactionId": "64xyz789..."
}
```

### Fines
| Method | Endpoint                  | Description        |
|--------|---------------------------|--------------------|
| GET    | /api/fines                | List fines         |
| POST   | /api/fines/:id/collect    | Collect a fine     |
| POST   | /api/fines/:id/waive      | Waive a fine       |

### Suppliers
| Method | Endpoint            | Description         |
|--------|---------------------|---------------------|
| GET    | /api/suppliers      | List all suppliers  |
| POST   | /api/suppliers      | Add supplier        |
| PUT    | /api/suppliers/:id  | Update supplier     |
| DELETE | /api/suppliers/:id  | Delete supplier     |

### Purchase Orders
| Method | Endpoint                    | Description        |
|--------|-----------------------------|--------------------|
| GET    | /api/purchase-orders        | List all orders    |
| POST   | /api/purchase-orders        | Create new order   |
| PUT    | /api/purchase-orders/:id    | Update order       |

### Reports
| Method | Endpoint              | Description               |
|--------|-----------------------|---------------------------|
| GET    | /api/reports/dashboard | Dashboard stats + recent  |
| GET    | /api/reports/monthly   | Monthly activity report   |

---

## DATABASE SCHEMA (MongoDB Collections)

### books
```js
{
  bookId:          "BK-0001",          // auto-generated
  title:           "Introduction to Algorithms",
  author:          "Cormen, Leiserson",
  isbn:            "978-0-262-04630-5", // unique
  subject:         "Computer Science",
  publisher:       "MIT Press",
  edition:         "4th Edition",
  totalCopies:     8,
  availableCopies: 6,
  damagedCopies:   0,
  lostCopies:      0,
  status:          "available",        // available | issued | reserved | overdue
  location:        "A-12",
  createdAt, updatedAt
}
```

### members
```js
{
  memberId:          "MB-0001",         // auto-generated
  name:              "Ravi Kumar",
  email:             "ravi@student.com", // unique
  password:          "<bcrypt hash>",
  memberType:        "student",          // student | staff
  department:        "CSE",
  rollNo:            "CSE2021001",
  phone:             "9123456780",
  membershipStatus:  "active",           // active | suspended | expired
  membershipExpiry:  ISODate,
  booksIssued:       2,
  maxBooksAllowed:   4,                  // 10 for staff
  outstandingFines:  150,
  totalFinesPaid:    0,
  role:              "member",           // member | librarian | admin
  createdAt, updatedAt
}
```

### transactions
```js
{
  transactionId: "TX-0001",
  type:          "issue",               // issue | return | renew
  book:          ObjectId → books,
  member:        ObjectId → members,
  issuedBy:      ObjectId → members,
  issueDate:     ISODate,
  dueDate:       ISODate,
  returnDate:    ISODate,
  renewCount:    0,
  status:        "active",              // active | returned | overdue | lost
  fineAmount:    0,
  finePaid:      false,
  createdAt, updatedAt
}
```

### fines
```js
{
  fineId:      "FN-0001",
  transaction: ObjectId → transactions,
  member:      ObjectId → members,
  book:        ObjectId → books,
  daysOverdue: 15,
  ratePerDay:  10,
  totalAmount: 150,
  amountPaid:  0,
  status:      "pending",               // pending | partial | paid | waived
  paidDate:    ISODate,
  collectedBy: ObjectId → members,
  createdAt, updatedAt
}
```

### suppliers
```js
{
  supplierId:    "SUP-01",
  name:          "Tata McGraw-Hill",
  contactPerson: "Rajesh Sharma",
  phone:         "011-41234567",
  email:         "orders@tmh.in",
  city:          "New Delhi",
  gstin:         "07ABCDE1234F1Z5",
  status:        "active",
  totalOrders:   18,
  totalAmount:   250000,
  createdAt, updatedAt
}
```

### purchaseorders
```js
{
  poNumber:     "PO-2026-001",
  supplier:     ObjectId → suppliers,
  orderedBy:    ObjectId → members,
  items: [{
    title: "...", author: "...", isbn: "...",
    quantity: 5, unitPrice: 1250, totalPrice: 6250
  }],
  totalBooks:   5,
  totalAmount:  6250,
  orderDate:    ISODate,
  expectedDate: ISODate,
  receivedDate: ISODate,
  status:       "pending",              // pending|approved|in_transit|received|cancelled
  invoiceNumber: "INV-2026-001",
  createdAt, updatedAt
}
```

---

## ROLES & PERMISSIONS

| Action                     | Member | Librarian | Admin |
|----------------------------|--------|-----------|-------|
| View books & catalog       | ✓      | ✓         | ✓     |
| Search books               | ✓      | ✓         | ✓     |
| Add / Edit / Delete books  | ✗      | ✓         | ✓     |
| Issue / Return books       | ✗      | ✓         | ✓     |
| View own transactions      | ✓      | ✓         | ✓     |
| View all transactions      | ✗      | ✓         | ✓     |
| Manage members             | ✗      | ✓         | ✓     |
| Collect / waive fines      | ✗      | ✓         | ✓     |
| Manage purchase orders     | ✗      | ✓         | ✓     |
| Manage suppliers           | ✗      | ✓         | ✓     |
| View reports               | ✗      | ✓         | ✓     |

---

## TROUBLESHOOTING

**"MongoServerError: connect ECONNREFUSED"**
→ MongoDB is not running. Start it first (see Step 2).

**"JWT malformed" or 401 errors**
→ Clear localStorage in browser and log in again.

**"Cannot GET /api/books" — 404**
→ Make sure server is running on port 5000. Check terminal for errors.

**"Email already registered" on seed**
→ Normal if you seed twice. Seed clears all data first — safe to run again.

**Port 5000 already in use**
→ Change PORT in `.env` to 5001 or kill the process:
  ```bash
  # macOS/Linux
  lsof -ti:5000 | xargs kill
  # Windows
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  ```

**Nodemon not found**
→ Install globally: `npm install -g nodemon`

---

## PRODUCTION DEPLOYMENT TIPS

1. Set `NODE_ENV=production` in environment
2. Use a strong random `JWT_SECRET` (32+ characters)
3. Use MongoDB Atlas for the database
4. Deploy backend to: Railway, Render, or Heroku
5. Serve frontend as static files via the Express server (already configured)
6. Use HTTPS (SSL certificate via Let's Encrypt / Cloudflare)
7. Add rate limiting: `npm install express-rate-limit`
8. Add helmet for security headers: `npm install helmet`

---

## QUICK COMMANDS SUMMARY

```bash
# 1. Start MongoDB
mongod

# 2. Install dependencies
cd libranet/backend && npm install

# 3. Seed sample data
node seed.js

# 4. Start server
npm run dev

# 5. Open browser
open http://localhost:5000
```

---

## FEATURES IMPLEMENTED

✅ Librarian authentication (JWT)
✅ Book catalog — add, edit, delete, search, filter
✅ Member management — students and staff
✅ Issue books with loan period
✅ Return books with automatic fine calculation
✅ Renew books (up to 2 renewals)
✅ Overdue tracking and alerts
✅ Fine management — collect and waive
✅ Fine calculator
✅ Purchase order management
✅ Supplier directory
✅ Dashboard with live stats
✅ Monthly reports
✅ Top borrowed subjects chart
✅ Auto-generated IDs (BK-0001, MB-0001, TX-0001, etc.)
✅ Password hashing with bcrypt
✅ Protected API routes
✅ Responsive dark-mode UI

---

*LibraNet v1.0 — Built with Node.js, Express, MongoDB*

# LibraNet — E-Book Management System
Full-stack: Node.js + Express + MongoDB + HTML/CSS/JS

## Project Structure
```
libranet/
├── backend/
│   ├── server.js            # Express app entry point
│   ├── .env                 # Environment variables
│   ├── config/
│   │   └── db.js            # MongoDB connection
│   ├── models/
│   │   ├── Book.js
│   │   ├── Member.js
│   │   ├── Transaction.js
│   │   ├── Fine.js
│   │   ├── Supplier.js
│   │   └── PurchaseOrder.js
│   ├── routes/
│   │   ├── books.js
│   │   ├── members.js
│   │   ├── transactions.js
│   │   ├── fines.js
│   │   ├── suppliers.js
│   │   ├── purchaseOrders.js
│   │   └── reports.js
│   └── middleware/
│       └── auth.js
└── frontend/
    ├── index.html
    ├── css/
    │   └── style.css
    └── js/
        ├── api.js
        ├── dashboard.js
        ├── books.js
        ├── members.js
        ├── transactions.js
        ├── fines.js
        ├── purchase.js
        └── reports.js
```

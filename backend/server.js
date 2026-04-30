const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/books',          require('./routes/books'));
app.use('/api/members',        require('./routes/members'));
app.use('/api/transactions',   require('./routes/transactions'));
app.use('/api/fines',          require('./routes/fines'));
app.use('/api/suppliers',      require('./routes/suppliers'));
app.use('/api/purchase-orders',require('./routes/purchaseOrders'));
app.use('/api/reports',        require('./routes/reports'));
app.use('/api/auth',           require('./routes/auth'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'LibraNet API is running', time: new Date() });
});

// Catch-all: serve frontend for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 LibraNet server running at http://localhost:${PORT}`);
  console.log(`📚 API base: http://localhost:${PORT}/api\n`);
});

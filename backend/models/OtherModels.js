const mongoose = require('mongoose');

// ─── FINE MODEL ────────────────────────────────────────────────────────────────
const fineSchema = new mongoose.Schema({
  fineId: { type: String, unique: true },
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true,
  },
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
  },
  daysOverdue:  { type: Number, required: true },
  ratePerDay:   { type: Number, default: 10 },
  totalAmount:  { type: Number, required: true },
  amountPaid:   { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'waived'],
    default: 'pending',
  },
  paidDate:     { type: Date },
  collectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
  },
  remarks: { type: String },
}, { timestamps: true });

fineSchema.pre('save', async function (next) {
  if (!this.fineId) {
    const count = await mongoose.model('Fine').countDocuments();
    this.fineId = `FN-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});
fineSchema.index(
  { member: 1, book: 1, status: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { status: 'pending' } 
  }
);
// ─── SUPPLIER MODEL ────────────────────────────────────────────────────────────
const supplierSchema = new mongoose.Schema({
  supplierId: { type: String, unique: true },
  name:        { type: String, required: true, trim: true },
  contactPerson: { type: String, trim: true },
  phone:       { type: String, trim: true },
  email:       { type: String, trim: true, lowercase: true },
  address:     { type: String, trim: true },
  city:        { type: String, trim: true },
  gstin:       { type: String, trim: true },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  totalOrders: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
}, { timestamps: true });

supplierSchema.pre('save', async function (next) {
  if (!this.supplierId) {
    const count = await mongoose.model('Supplier').countDocuments();
    this.supplierId = `SUP-${String(count + 1).padStart(2, '0')}`;
  }
  next();
});

// ─── PURCHASE ORDER MODEL ──────────────────────────────────────────────────────
const purchaseOrderSchema = new mongoose.Schema({
  poNumber: { type: String, unique: true },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
  },
  orderedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
  },
  items: [{
    title:     { type: String, required: true },
    author:    { type: String },
    isbn:      { type: String },
    quantity:  { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number },
  }],
  totalBooks:  { type: Number },
  totalAmount: { type: Number },
  orderDate:   { type: Date, default: Date.now },
  expectedDate:{ type: Date },
  receivedDate:{ type: Date },
  status: {
    type: String,
    enum: ['pending', 'approved', 'in_transit', 'received', 'cancelled'],
    default: 'pending',
  },
  invoiceNumber: { type: String, trim: true },
  invoiceDate:   { type: Date },
  notes:         { type: String, trim: true },
}, { timestamps: true });

purchaseOrderSchema.pre('save', async function (next) {
  if (!this.poNumber) {
    const count = await mongoose.model('PurchaseOrder').countDocuments();
    const year = new Date().getFullYear();
    this.poNumber = `PO-${year}-${String(count + 1).padStart(3, '0')}`;
  }
  // Auto-calculate totals
  if (this.items && this.items.length > 0) {
    this.items.forEach(item => { item.totalPrice = item.quantity * item.unitPrice; });
    this.totalBooks  = this.items.reduce((s, i) => s + i.quantity, 0);
    this.totalAmount = this.items.reduce((s, i) => s + i.totalPrice, 0);
  }
  next();
});

const Fine          = mongoose.model('Fine',          fineSchema);
const Supplier      = mongoose.model('Supplier',      supplierSchema);
const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

module.exports = { Fine, Supplier, PurchaseOrder };

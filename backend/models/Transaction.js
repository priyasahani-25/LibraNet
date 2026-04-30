const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    unique: true,
    // Auto-generated: TX-0001, TX-0002 ...
  },
  type: {
    type: String,
    enum: ['issue', 'return', 'renew'],
    required: true,
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
  },
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
  },
  issuedBy: {                           // librarian who processed it
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
  },
  issueDate: {
    type: Date,
    default: Date.now,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  returnDate: { type: Date },
  renewCount:  { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['active', 'returned', 'overdue', 'lost'],
    default: 'active',
  },
  fineAmount:  { type: Number, default: 0 },
  finePaid:    { type: Boolean, default: false },
  remarks:     { type: String, trim: true },
}, { timestamps: true });

// Auto-generate transactionId
transactionSchema.pre('save', async function (next) {
  if (!this.transactionId) {
    const count = await mongoose.model('Transaction').countDocuments();
    this.transactionId = `TX-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Virtual: days overdue
transactionSchema.virtual('daysOverdue').get(function () {
  if (this.status === 'returned') return 0;
  const now = this.returnDate || new Date();
  const diff = Math.floor((now - this.dueDate) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
});

module.exports = mongoose.model('Transaction', transactionSchema);

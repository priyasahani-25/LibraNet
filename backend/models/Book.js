const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  bookId: {
    type: String,
    unique: true,
    // Auto-generated: BK-0001, BK-0002, ...
  },
  title: {
    type: String,
    required: [true, 'Book title is required'],
    trim: true,
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true,
  },
  isbn: {
    type: String,
    required: [true, 'ISBN is required'],
    unique: true,
    trim: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  publisher: {
    type: String,
    trim: true,
  },
  edition: {
    type: String,
    trim: true,
  },
  totalCopies: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  availableCopies: {
    type: Number,
    default: function () { return this.totalCopies; },
  },
  damagedCopies: { type: Number, default: 0 },
  lostCopies:    { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['available', 'issued', 'reserved', 'overdue'],
    default: 'available',
  },
  location: { type: String, trim: true }, // shelf/rack info
  addedDate: { type: Date, default: Date.now },
}, { timestamps: true });

// Auto-generate bookId before saving
bookSchema.pre('save', async function (next) {
  if (!this.bookId) {
    const count = await mongoose.model('Book').countDocuments();
    this.bookId = `BK-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Virtual: computed status
bookSchema.virtual('computedStatus').get(function () {
  if (this.availableCopies === 0) return 'all_issued';
  return 'available';
});

module.exports = mongoose.model('Book', bookSchema);

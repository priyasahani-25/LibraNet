const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const memberSchema = new mongoose.Schema({
  memberId: {
    type: String,
    unique: true,
    // Auto-generated: MB-0001 for students, ST-0001 for staff
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: { type: String, trim: true },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false,
  },
  memberType: {
    type: String,
    enum: ['student', 'staff'],
    required: true,
    default: 'student',
  },
  department: { type: String, trim: true },
  rollNo: { type: String, trim: true },        // for students
  employeeId: { type: String, trim: true },    // for staff
  address: { type: String, trim: true },
  membershipStatus: {
    type: String,
    enum: ['active', 'suspended', 'expired'],
    default: 'active',
  },
  membershipExpiry: {
    type: Date,
    default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
  },
  booksIssued: { type: Number, default: 0 },
  maxBooksAllowed: {
    type: Number,
    default: function () { return this.memberType === 'staff' ? 10 : 4; },
  },
  totalFinesPaid: { type: Number, default: 0 },
  outstandingFines: { type: Number, default: 0 },
  role: {
    type: String,
    enum: ['member', 'librarian', 'admin'],
    default: 'member',
  },
}, { timestamps: true });

// Auto-generate memberId
memberSchema.pre('save', async function (next) {
  if (!this.memberId) {
    const prefix = this.memberType === 'staff' ? 'ST' : 'MB';
    const count = await mongoose.model('Member').countDocuments({ memberType: this.memberType });
    this.memberId = `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }
  // Hash password
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

memberSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Member', memberSchema);

const express     = require('express');
const router      = express.Router();
const Transaction = require('../models/Transaction');
const Book        = require('../models/Book');
const Member      = require('../models/Member');
const { Fine }    = require('../models/OtherModels');
const { protect, librarianOnly } = require('../middleware/auth');

const FINE_PER_DAY = Number(process.env.FINE_PER_DAY) || 10;
const LOAN_DAYS    = 14; // default loan period

// GET /api/transactions
router.get('/', protect, async (req, res) => {
  try {
    const { status, memberId, bookId, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status)   query.status = status;
    if (memberId) query.member = memberId;
    if (bookId)   query.book   = bookId;

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .populate('book',   'title author bookId isbn')
      .populate('member', 'name memberId email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const currentDate = new Date();
    const finePerDay = 10;

    const dynamicTransactions = transactions.map(txn => {
      const txnObj = txn.toObject ? txn.toObject() : { ...txn }; 
      
      if (txnObj.status === 'overdue' && txnObj.dueDate < currentDate) {
        const diffTime = Math.abs(currentDate - new Date(txnObj.dueDate));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        txnObj.fineAmount = diffDays * finePerDay;
      }
      return txnObj;
    });

    res.json({ success: true, total, transactions: dynamicTransactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/transactions/issue — issue a book
router.post('/issue', protect, librarianOnly, async (req, res) => {
  try {
    const { bookId, memberId, dueDays } = req.body;

    const book   = await Book.findById(bookId);
    const member = await Member.findById(memberId);

    if (!book)   return res.status(404).json({ success: false, message: 'Book not found' });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    if (book.availableCopies <= 0)
      return res.status(400).json({ success: false, message: 'No copies available' });
    if (member.booksIssued >= member.maxBooksAllowed)
      return res.status(400).json({ success: false, message: 'Member has reached max book limit' });
    if (member.membershipStatus !== 'active')
      return res.status(400).json({ success: false, message: 'Member is not active' });

    const loanDays = dueDays || LOAN_DAYS;
    const dueDate  = new Date(Date.now() + loanDays * 24 * 60 * 60 * 1000);

    const txn = await Transaction.create({
      type: 'issue', book: bookId, member: memberId,
      issuedBy: req.user._id,
      issueDate: new Date(), dueDate,
      status: 'active',
    });

    // Update book and member counts
    await Book.findByIdAndUpdate(bookId, {
      $inc: { availableCopies: -1 },
      status: book.availableCopies - 1 === 0 ? 'issued' : 'available',
    });
    await Member.findByIdAndUpdate(memberId, { $inc: { booksIssued: 1 } });

    const populated = await Transaction.findById(txn._id)
      .populate('book',   'title author bookId')
      .populate('member', 'name memberId');

    res.status(201).json({ success: true, transaction: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/transactions/return — return a book
router.post('/return', protect, librarianOnly, async (req, res) => {
  try {
    const { transactionId } = req.body;

    const txn = await Transaction.findOne({ _id: transactionId })
      .populate('book').populate('member');

    if (!txn)                      return res.status(404).json({ success: false, message: 'Transaction not found' });
    if (txn.status === 'returned') return res.status(400).json({ success: false, message: 'Book already returned' });

    const returnDate  = new Date();
    const daysOverdue = Math.max(0, Math.floor((returnDate - txn.dueDate) / (1000 * 60 * 60 * 24)));
    const fineAmount  = daysOverdue * FINE_PER_DAY;

    txn.returnDate = returnDate;
    txn.status     = 'returned';
    txn.fineAmount = fineAmount;
    await txn.save();

    // Restore available copies
    await Book.findByIdAndUpdate(txn.book._id, {
      $inc: { availableCopies: 1 },
      status: 'available',
    });
    await Member.findByIdAndUpdate(txn.member._id, { $inc: { booksIssued: -1 } });

    // Create fine record if applicable
    let fine = null;
if (fineAmount > 0) {
      // 1. Ask the database: Does a pending fine already exist for this specific transaction?
      const existingFine = await Fine.findOne({ 
        transaction: txn._id, 
        status: 'pending' 
      });

      // 2. Only create a NEW fine if one doesn't exist
      if (!existingFine) {
        fine = await Fine.create({
          transaction: txn._id,
          member:      txn.member._id,
          book:        txn.book._id,
          daysOverdue, 
          ratePerDay:  FINE_PER_DAY, 
          totalAmount: fineAmount
        });
        
        await Member.findByIdAndUpdate(txn.member._id, { $inc: { outstandingFines: fineAmount } });
      } else {
        // 3. If it DOES exist, just grab the existing one so we don't duplicate it!
        fine = existingFine;
      }
    }

    res.json({ success: true, transaction: txn, fine, daysOverdue, fineAmount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/transactions/renew — renew a book
router.post('/renew', protect, async (req, res) => {
  try {
    const { transactionId } = req.body;
    const txn = await Transaction.findById(transactionId);
    if (!txn) return res.status(404).json({ success: false, message: 'Transaction not found' });
    if (txn.status !== 'active') return res.status(400).json({ success: false, message: 'Can only renew active transactions' });
    if (txn.renewCount >= 2) return res.status(400).json({ success: false, message: 'Maximum renewals reached (2)' });

    txn.dueDate    = new Date(txn.dueDate.getTime() + LOAN_DAYS * 24 * 60 * 60 * 1000);
    txn.renewCount += 1;
    txn.type       = 'renew';
    await txn.save();

    res.json({ success: true, transaction: txn });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/transactions/overdue — list all overdue
router.get('/overdue/list', protect, async (req, res) => {
  try {
    const overdue = await Transaction.find({
      status: 'active',
      dueDate: { $lt: new Date() },
    })
      .populate('book',   'title author bookId')
      .populate('member', 'name memberId email phone')
      .sort({ dueDate: 1 });

    // Mark overdue in DB
    const ids = overdue.map(t => t._id);
    await Transaction.updateMany({ _id: { $in: ids } }, { status: 'overdue' });

    const enriched = overdue.map(t => ({
      ...t.toObject(),
      daysOverdue: Math.floor((new Date() - t.dueDate) / (1000 * 60 * 60 * 24)),
      estimatedFine: Math.floor((new Date() - t.dueDate) / (1000 * 60 * 60 * 24)) * FINE_PER_DAY,
    }));

    res.json({ success: true, count: overdue.length, transactions: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

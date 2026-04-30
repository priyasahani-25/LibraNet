const express     = require('express');
const router      = express.Router();
const { Fine, Supplier, PurchaseOrder } = require('../models/OtherModels');
const Member      = require('../models/Member');
const Transaction = require('../models/Transaction');
const Book        = require('../models/Book');
const { protect, librarianOnly } = require('../middleware/auth');

// ══════════════════ FINES ══════════════════════════════════════════════════════

const fineRouter = express.Router();

// GET /api/fines
fineRouter.get('/', protect, async (req, res) => {
  try {
    const { status, memberId } = req.query;
    const query = {};
    if (status)   query.status = status;
    if (memberId) query.member = memberId;

    const fines = await Fine.find(query)
      .populate('member',      'name memberId email')
      .populate('book',        'title author')
      .populate('transaction', 'transactionId dueDate issueDate')
      .sort({ createdAt: -1 });

    const totalPending = fines.filter(f => f.status === 'pending').reduce((s, f) => s + f.totalAmount, 0);
    res.json({ success: true, count: fines.length, totalPending, fines });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/fines/:id/collect — collect a fine
fineRouter.post('/:id/collect', protect, librarianOnly, async (req, res) => {
  try {
    const { amountPaid } = req.body;
    const fine = await Fine.findById(req.params.id);
    if (!fine) return res.status(404).json({ success: false, message: 'Fine not found' });

    fine.amountPaid    = (fine.amountPaid || 0) + amountPaid;
    fine.status        = fine.amountPaid >= fine.totalAmount ? 'paid' : 'partial';
    fine.paidDate      = fine.status === 'paid' ? new Date() : fine.paidDate;
    fine.collectedBy   = req.user._id;
    await fine.save();

    await Member.findByIdAndUpdate(fine.member, {
      $inc: { outstandingFines: -amountPaid, totalFinesPaid: amountPaid },
    });
    await Transaction.findByIdAndUpdate(fine.transaction, {
      finePaid: fine.status === 'paid',
    });

    res.json({ success: true, fine });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/fines/:id/waive
fineRouter.post('/:id/waive', protect, librarianOnly, async (req, res) => {
  try {
    const fine = await Fine.findByIdAndUpdate(req.params.id,
      { status: 'waived', collectedBy: req.user._id },
      { new: true }
    );
    await Member.findByIdAndUpdate(fine.member, { $inc: { outstandingFines: -fine.totalAmount } });
    res.json({ success: true, fine });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ══════════════════ SUPPLIERS ═══════════════════════════════════════════════════

const supplierRouter = express.Router();

supplierRouter.get('/', protect, async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    res.json({ success: true, suppliers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

supplierRouter.post('/', protect, librarianOnly, async (req, res) => {
  try {
    const supplier = await Supplier.create(req.body);
    res.status(201).json({ success: true, supplier });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

supplierRouter.put('/:id', protect, librarianOnly, async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, supplier });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

supplierRouter.delete('/:id', protect, librarianOnly, async (req, res) => {
  try {
    await Supplier.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Supplier deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ══════════════════ PURCHASE ORDERS ═════════════════════════════════════════════

const poRouter = express.Router();

poRouter.get('/', protect, async (req, res) => {
  try {
    const orders = await PurchaseOrder.find()
      .populate('supplier', 'name supplierId city')
      .populate('orderedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

poRouter.post('/', protect, librarianOnly, async (req, res) => {
  try {
    const order = await PurchaseOrder.create({ ...req.body, orderedBy: req.user._id });
    await Supplier.findByIdAndUpdate(req.body.supplier, {
      $inc: { totalOrders: 1, totalAmount: order.totalAmount },
    });
    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

poRouter.put('/:id', protect, librarianOnly, async (req, res) => {
  try {
    const order = await PurchaseOrder.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ══════════════════ REPORTS ═════════════════════════════════════════════════════

const reportRouter = express.Router();

// GET /api/reports/dashboard — summary stats for dashboard
reportRouter.get('/dashboard', protect, async (req, res) => {
  try {
    const [
      totalBooks, totalMembers, activeMembers,
      issuedTxns, overdueCount, pendingFines
    ] = await Promise.all([
      Book.countDocuments(),
      Member.countDocuments(),
      Member.countDocuments({ membershipStatus: 'active' }),
      Transaction.countDocuments({ status: { $in: ['active', 'overdue'] } }),
      Transaction.countDocuments({ status: 'overdue' }),
      Fine.aggregate([{ $match: { status: 'pending' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    ]);

    const recentTxns = await Transaction.find()
      .populate('book',   'title')
      .populate('member', 'name memberId')
      .sort({ createdAt: -1 })
      .limit(8);

    const topSubjects = await Transaction.aggregate([
      { $match: { status: { $in: ['active', 'returned', 'overdue'] } } },
      { $lookup: { from: 'books', localField: 'book', foreignField: '_id', as: 'bookData' } },
      { $unwind: '$bookData' },
      { $group: { _id: '$bookData.subject', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    res.json({
      success: true,
      stats: {
        totalBooks, totalMembers, activeMembers,
        booksIssued: issuedTxns,
        overdueCount,
        pendingFines: pendingFines[0]?.total || 0,
      },
      recentTxns,
      topSubjects,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/monthly — monthly activity
reportRouter.get('/monthly', protect, async (req, res) => {
  try {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    const [issued, returned, newMembers, finesCollected] = await Promise.all([
      Transaction.countDocuments({ type: 'issue', issueDate: { $gte: start } }),
      Transaction.countDocuments({ status: 'returned', returnDate: { $gte: start } }),
      Member.countDocuments({ createdAt: { $gte: start } }),
      Fine.aggregate([
        { $match: { status: 'paid', paidDate: { $gte: start } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } },
      ]),
    ]);

    res.json({
      success: true,
      report: {
        month: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
        booksIssued: issued, booksReturned: returned,
        newMembers,
        finesCollected: finesCollected[0]?.total || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = { fineRouter, supplierRouter, poRouter, reportRouter };

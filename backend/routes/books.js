const express = require('express');
const router  = express.Router();
const Book    = require('../models/Book');
const { protect, librarianOnly } = require('../middleware/auth');

// GET /api/books — list all books (with search & filter)
router.get('/', protect, async (req, res) => {
  try {
    const { search, subject, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { title:   { $regex: search, $options: 'i' } },
        { author:  { $regex: search, $options: 'i' } },
        { isbn:    { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }
    if (subject) query.subject = { $regex: subject, $options: 'i' };
    if (status)  query.status  = status;

    const total = await Book.countDocuments(query);
    const books = await Book.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, total, page: Number(page), books });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/books/:id — single book
router.get('/:id', protect, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    res.json({ success: true, book });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/books — add new book (librarian only)
router.post('/', protect, librarianOnly, async (req, res) => {
  try {
  const bookData = {
      ...req.body,
      availableCopies: req.body.totalCopies // Automatically set available to match total!
    };
    const book = await Book.create(bookData);
    res.status(201).json({ success: true, book });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ success: false, message: 'ISBN already exists' });
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/books/:id — update book
router.put('/:id', protect, librarianOnly, async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    res.json({ success: true, book });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/books/:id
router.delete('/:id', protect, librarianOnly, async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    res.json({ success: true, message: 'Book deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/books/stats/summary
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const total     = await Book.countDocuments();
    const available = await Book.countDocuments({ availableCopies: { $gt: 0 } });
    const totalCopies     = await Book.aggregate([{ $group: { _id: null, sum: { $sum: '$totalCopies' }     } }]);
    const availableCopies = await Book.aggregate([{ $group: { _id: null, sum: { $sum: '$availableCopies' } } }]);
    const damaged = await Book.aggregate([{ $group: { _id: null, sum: { $sum: '$damagedCopies' } } }]);
    const lost    = await Book.aggregate([{ $group: { _id: null, sum: { $sum: '$lostCopies' }    } }]);

    res.json({
      success: true,
      stats: {
        totalTitles:      total,
        availableTitles:  available,
        totalCopies:      totalCopies[0]?.sum     || 0,
        availableCopies:  availableCopies[0]?.sum || 0,
        damagedCopies:    damaged[0]?.sum         || 0,
        lostCopies:       lost[0]?.sum            || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

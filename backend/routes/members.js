const express = require('express');
const router  = express.Router();
const Member  = require('../models/Member');
const { protect, librarianOnly } = require('../middleware/auth');

// GET /api/members
router.get('/', protect, librarianOnly, async (req, res) => {
  try {
    const { search, memberType, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name:     { $regex: search, $options: 'i' } },
        { email:    { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } },
        { rollNo:   { $regex: search, $options: 'i' } },
      ];
    }
    if (memberType) query.memberType = memberType;
    if (status)     query.membershipStatus = status;

    const total   = await Member.countDocuments(query);
    const members = await Member.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, total, members });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/members/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id).select('-password');
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    res.json({ success: true, member });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/members — librarian registers a new member
router.post('/', protect, librarianOnly, async (req, res) => {
  try {
    const member = await Member.create(req.body);
    res.status(201).json({ success: true, member: { ...member.toObject(), password: undefined } });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ success: false, message: 'Email already exists' });
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/members/:id
router.put('/:id', protect, librarianOnly, async (req, res) => {
  try {
    const { password, ...rest } = req.body;  // never update password via this route
    const member = await Member.findByIdAndUpdate(req.params.id, rest, {
      new: true, runValidators: true,
    }).select('-password');
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    res.json({ success: true, member });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/members/:id
router.delete('/:id', protect, librarianOnly, async (req, res) => {
  try {
    await Member.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Member deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/members/stats/summary
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const total    = await Member.countDocuments();
    const students = await Member.countDocuments({ memberType: 'student' });
    const staff    = await Member.countDocuments({ memberType: 'staff' });
    const active   = await Member.countDocuments({ membershipStatus: 'active' });
    res.json({ success: true, stats: { total, students, staff, active } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

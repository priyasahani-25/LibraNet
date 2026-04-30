const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const Member  = require('../models/Member');
const { protect } = require('../middleware/auth');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, memberType, department, phone, role } = req.body;
    const exists = await Member.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    const member = await Member.create({ name, email, password, memberType, department, phone, role });
    const token  = signToken(member._id);
    res.status(201).json({ success: true, token, member: { ...member.toObject(), password: undefined } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const member = await Member.findOne({ email }).select('+password');
    if (!member || !(await member.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const token = signToken(member._id);
    res.json({
      success: true, token,
      member: {
        _id: member._id, name: member.name, email: member.email,
        role: member.role, memberId: member.memberId, memberType: member.memberType,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, member: req.user });
});

module.exports = router;

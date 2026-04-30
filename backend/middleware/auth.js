const jwt = require('jsonwebtoken');
const Member = require('../models/Member');

// Protect route — must be logged in
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await Member.findById(decoded.id).select('-password');
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token is invalid or expired' });
  }
};

// Restrict to librarian or admin
const librarianOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'librarian' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access restricted to librarians' });
  }
};

module.exports = { protect, librarianOnly };

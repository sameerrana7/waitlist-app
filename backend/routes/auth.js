const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../firebase/config');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ─── POST /api/auth/login ───────────────────────────────────────────
// Manager login with email + password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    // Fetch manager from Firebase
    const snapshot = await db.ref('managers').orderByChild('email').equalTo(email).once('value');
    const data = snapshot.val();

    if (!data) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const managerId = Object.keys(data)[0];
    const manager = data[managerId];

    // Verify password
    const isValid = await bcrypt.compare(password, manager.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: managerId,
        email: manager.email,
        name: manager.name,
        role: manager.role || 'manager',
        branchId: manager.branchId,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: managerId,
        email: manager.email,
        name: manager.name,
        role: manager.role,
        branchId: manager.branchId,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/auth/register ────────────────────────────────────────
// Register a new manager (admin only in production — open for setup)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, branchName } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, message: 'Name, email and password required' });
    }

    // Check if email already exists
    const existing = await db.ref('managers').orderByChild('email').equalTo(email).once('value');
    if (existing.val()) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create branch
    const branchRef = db.ref('branches').push();
    await branchRef.set({
      name: branchName || `${name}'s Restaurant`,
      createdAt: Date.now(),
    });

    // Create manager
    const managerRef = db.ref('managers').push();
    await managerRef.set({
      email,
      name,
      passwordHash,
      role: 'manager',
      branchId: branchRef.key,
      createdAt: Date.now(),
    });

    // Generate token
    const token = jwt.sign(
      { id: managerRef.key, email, name, role: 'manager', branchId: branchRef.key },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(201).json({
      success: true,
      token,
      user: { id: managerRef.key, email, name, role: 'manager', branchId: branchRef.key },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/auth/me ───────────────────────────────────────────────
// Get current logged in user
router.get('/me', authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;

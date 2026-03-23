const express = require('express');
const { db } = require('../firebase/config');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const AVG_MINS_PER_GROUP = 12;

// Helper: pad token number
const padToken = (n) => `W-${String(n).padStart(2, '0')}`;

// Helper: current time string
const nowTime = () =>
  new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

// ─── POST /api/queue/join ────────────────────────────────────────────
// Customer joins the queue (no auth required)
router.post('/join', async (req, res) => {
  try {
    const { name, phone, partySize, branchId } = req.body;

    if (!name || !phone || !partySize || !branchId) {
      return res.status(400).json({ success: false, message: 'name, phone, partySize, branchId are required' });
    }

    if (phone.replace(/\D/g, '').length < 8) {
      return res.status(400).json({ success: false, message: 'Invalid phone number' });
    }

    if (partySize < 1 || partySize > 20) {
      return res.status(400).json({ success: false, message: 'Party size must be between 1 and 20' });
    }

    // Increment daily counter atomically
    const counterRef = db.ref(`meta/${branchId}/counter`);
    const newCount = await counterRef.transaction((current) => (current || 0) + 1);
    const token = padToken(newCount.snapshot.val());

    // Add to queue
    const entry = {
      token,
      name: name.trim(),
      phone: phone.trim(),
      partySize: Number(partySize),
      status: 'waiting',
      branchId,
      joinedAt: nowTime(),
      createdAt: Date.now(),
    };

    const ref = await db.ref(`waitlist/${branchId}`).push(entry);

    // Get current position
    const snapshot = await db.ref(`waitlist/${branchId}`)
      .orderByChild('status').equalTo('waiting').once('value');
    const waitingCount = snapshot.numChildren();
    const estimatedWait = waitingCount <= 1 ? '< 5' : String((waitingCount - 1) * AVG_MINS_PER_GROUP);

    return res.status(201).json({
      success: true,
      data: {
        id: ref.key,
        ...entry,
        position: waitingCount,
        estimatedWait,
      },
    });
  } catch (err) {
    console.error('Join queue error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/queue/:branchId ────────────────────────────────────────
// Get full queue for a branch (manager only)
router.get('/:branchId', authMiddleware, async (req, res) => {
  try {
    const { branchId } = req.params;

    // Make sure manager owns this branch
    if (req.user.branchId !== branchId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const snapshot = await db.ref(`waitlist/${branchId}`).once('value');
    const data = snapshot.val() || {};

    const entries = Object.entries(data)
      .map(([id, entry]) => ({ id, ...entry }))
      .sort((a, b) => a.createdAt - b.createdAt);

    const waiting = entries.filter((e) => e.status === 'waiting');
    const metaSnap = await db.ref(`meta/${branchId}`).once('value');
    const meta = metaSnap.val() || {};

    return res.json({
      success: true,
      data: {
        entries,
        stats: {
          waiting: waiting.length,
          seated: meta.seated || 0,
          total: meta.total || 0,
          estimatedWait: waiting.length > 0 ? String(waiting.length * AVG_MINS_PER_GROUP) : '0',
        },
      },
    });
  } catch (err) {
    console.error('Get queue error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/queue/:branchId/status ─────────────────────────────────
// Public: how many waiting + estimated wait (for customer check-in page)
router.get('/:branchId/status', async (req, res) => {
  try {
    const { branchId } = req.params;
    const snapshot = await db.ref(`waitlist/${branchId}`)
      .orderByChild('status').equalTo('waiting').once('value');
    const waitingCount = snapshot.numChildren();

    return res.json({
      success: true,
      data: {
        waiting: waitingCount,
        estimatedWait: waitingCount === 0 ? '< 5' : String(waitingCount * AVG_MINS_PER_GROUP),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PATCH /api/queue/:branchId/:entryId/call ────────────────────────
// Manager calls next customer
router.patch('/:branchId/:entryId/call', authMiddleware, async (req, res) => {
  try {
    const { branchId, entryId } = req.params;
    if (req.user.branchId !== branchId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await db.ref(`waitlist/${branchId}/${entryId}`).update({
      status: 'calling',
      calledAt: Date.now(),
    });

    // Log activity
    await db.ref(`logs/${branchId}`).push({
      action: 'called',
      entryId,
      by: req.user.name,
      timestamp: Date.now(),
      time: nowTime(),
    });

    return res.json({ success: true, message: 'Customer called' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PATCH /api/queue/:branchId/:entryId/seat ────────────────────────
// Manager marks customer as seated
router.patch('/:branchId/:entryId/seat', authMiddleware, async (req, res) => {
  try {
    const { branchId, entryId } = req.params;
    if (req.user.branchId !== branchId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await db.ref(`waitlist/${branchId}/${entryId}`).update({
      status: 'seated',
      seatedAt: Date.now(),
    });

    // Increment seated + total counters
    await db.ref(`meta/${branchId}/seated`).transaction((v) => (v || 0) + 1);
    await db.ref(`meta/${branchId}/total`).transaction((v) => (v || 0) + 1);

    await db.ref(`logs/${branchId}`).push({
      action: 'seated',
      entryId,
      by: req.user.name,
      timestamp: Date.now(),
      time: nowTime(),
    });

    return res.json({ success: true, message: 'Customer seated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PATCH /api/queue/:branchId/:entryId/skip ────────────────────────
// Manager skips customer (moves to end)
router.patch('/:branchId/:entryId/skip', authMiddleware, async (req, res) => {
  try {
    const { branchId, entryId } = req.params;
    if (req.user.branchId !== branchId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await db.ref(`waitlist/${branchId}/${entryId}`).update({
      status: 'waiting',
      createdAt: Date.now() + 999999, // push to end
    });

    await db.ref(`logs/${branchId}`).push({
      action: 'skipped',
      entryId,
      by: req.user.name,
      timestamp: Date.now(),
      time: nowTime(),
    });

    return res.json({ success: true, message: 'Customer skipped' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── DELETE /api/queue/:branchId/:entryId ────────────────────────────
// Manager removes customer from queue
router.delete('/:branchId/:entryId', authMiddleware, async (req, res) => {
  try {
    const { branchId, entryId } = req.params;
    if (req.user.branchId !== branchId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await db.ref(`waitlist/${branchId}/${entryId}`).remove();

    await db.ref(`logs/${branchId}`).push({
      action: 'removed',
      entryId,
      by: req.user.name,
      timestamp: Date.now(),
      time: nowTime(),
    });

    return res.json({ success: true, message: 'Customer removed' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── DELETE /api/queue/:branchId/reset ───────────────────────────────
// Manager resets the entire day
router.delete('/:branchId/reset/all', authMiddleware, async (req, res) => {
  try {
    const { branchId } = req.params;
    if (req.user.branchId !== branchId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await db.ref(`waitlist/${branchId}`).remove();
    await db.ref(`logs/${branchId}`).remove();
    await db.ref(`meta/${branchId}`).set({ counter: 0, seated: 0, total: 0 });

    return res.json({ success: true, message: 'Day reset successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

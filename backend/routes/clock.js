const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/clock?date=2026-03-16  — get all clock records for a date
router.get('/', async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  try {
    const { rows } = await db.query(
      `SELECT c.*, e.name, e.position, e.shift_group, e.area
       FROM clock_records c
       JOIN employees e ON c.employee_id = e.id
       WHERE c.date = $1
       ORDER BY e.name`,
      [date]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clock/employee/:id?date=...  — get one employee's record for a date
router.get('/employee/:id', async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  try {
    const { rows } = await db.query(
      `SELECT * FROM clock_records WHERE employee_id = $1 AND date = $2`,
      [req.params.id, date]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clock/in  — body: { employee_id, date? }
router.post('/in', async (req, res) => {
  const { employee_id, date } = req.body;
  if (!employee_id) return res.status(400).json({ error: 'employee_id required' });
  const d = date || new Date().toISOString().split('T')[0];
  const now = new Date();
  try {
    const { rows } = await db.query(
      `INSERT INTO clock_records (employee_id, date, clock_in)
       VALUES ($1, $2, $3)
       ON CONFLICT (employee_id, date)
       DO UPDATE SET clock_in = $3, updated_at = NOW()
       RETURNING *`,
      [employee_id, d, now]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clock/out  — body: { employee_id, date? }
router.post('/out', async (req, res) => {
  const { employee_id, date } = req.body;
  if (!employee_id) return res.status(400).json({ error: 'employee_id required' });
  const d = date || new Date().toISOString().split('T')[0];
  const now = new Date();
  try {
    const { rows } = await db.query(
      `INSERT INTO clock_records (employee_id, date, clock_out)
       VALUES ($1, $2, $3)
       ON CONFLICT (employee_id, date)
       DO UPDATE SET clock_out = $3, updated_at = NOW()
       RETURNING *`,
      [employee_id, d, now]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取某天考勤 GET /api/attendance?date=2026-03-16
router.get('/', async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  try {
    const { rows } = await db.query(
      `SELECT a.*, e.name, e.position, e.shift_group, e.area, e.nationality, e.contract_status
       FROM attendance a
       JOIN employees e ON a.employee_id = e.id
       WHERE a.date = $1
       ORDER BY e.name`,
      [date]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 设置某员工某天考勤 POST /api/attendance
// body: { employee_id, date, status, note }
router.post('/', async (req, res) => {
  const { employee_id, date, status, note } = req.body;
  if (!employee_id || !date || !status) {
    return res.status(400).json({ error: 'employee_id, date, status required' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO attendance (employee_id, date, status, note)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (employee_id, date)
       DO UPDATE SET status = $3, note = $4, updated_at = NOW()
       RETURNING *`,
      [employee_id, date, status, note || null]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

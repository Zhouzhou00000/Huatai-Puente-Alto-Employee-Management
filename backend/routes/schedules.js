const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取某月排班 (query: ?year=2025&month=3)
router.get('/', async (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) return res.status(400).json({ error: 'year and month required' });

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // last day of month

  try {
    const { rows } = await db.query(
      `SELECT s.*, e.name, e.shift_group, e.contract_status, e.daily_wage, e.position
       FROM schedules s
       JOIN employees e ON s.employee_id = e.id
       WHERE s.work_date >= $1 AND s.work_date <= $2
       ORDER BY e.id, s.work_date`,
      [startDate, endDate]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 批量更新排班 (upsert)
router.post('/batch', async (req, res) => {
  const { schedules } = req.body; // [{employee_id, work_date, shift_value}]
  if (!schedules || !Array.isArray(schedules)) {
    return res.status(400).json({ error: 'schedules array required' });
  }

  try {
    const results = [];
    for (const s of schedules) {
      const { rows } = await db.query(
        `INSERT INTO schedules (employee_id, work_date, shift_value)
         VALUES ($1, $2, $3)
         ON CONFLICT (employee_id, work_date)
         DO UPDATE SET shift_value = $3
         RETURNING *`,
        [s.employee_id, s.work_date, s.shift_value]
      );
      results.push(rows[0]);
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新单个排班
router.put('/:employee_id/:date', async (req, res) => {
  const { shift_value } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO schedules (employee_id, work_date, shift_value)
       VALUES ($1, $2, $3)
       ON CONFLICT (employee_id, work_date)
       DO UPDATE SET shift_value = $3
       RETURNING *`,
      [req.params.employee_id, req.params.date, shift_value]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

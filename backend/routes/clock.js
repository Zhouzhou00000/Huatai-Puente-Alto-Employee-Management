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

// GET /api/clock/month?year=2026&month=3&employee_id=5  — get all records for an employee in a month
router.get('/month', async (req, res) => {
  const { year, month, employee_id } = req.query;
  if (!year || !month) return res.status(400).json({ error: 'year and month required' });
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
  try {
    let query = `SELECT c.*, e.name FROM clock_records c JOIN employees e ON c.employee_id = e.id WHERE c.date >= $1 AND c.date <= $2`;
    const params = [startDate, endDate];
    if (employee_id) {
      query += ` AND c.employee_id = $3`;
      params.push(employee_id);
    }
    query += ` ORDER BY c.date`;
    const { rows } = await db.query(query, params);
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

// POST /api/clock/lunch-out  — start lunch break
router.post('/lunch-out', async (req, res) => {
  const { employee_id, date } = req.body;
  if (!employee_id) return res.status(400).json({ error: 'employee_id required' });
  const d = date || new Date().toISOString().split('T')[0];
  const now = new Date();
  try {
    const { rows } = await db.query(
      `UPDATE clock_records SET lunch_out = $1, updated_at = NOW()
       WHERE employee_id = $2 AND date = $3 RETURNING *`,
      [now, employee_id, d]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'No clock-in record found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clock/lunch-in  — end lunch break
router.post('/lunch-in', async (req, res) => {
  const { employee_id, date } = req.body;
  if (!employee_id) return res.status(400).json({ error: 'employee_id required' });
  const d = date || new Date().toISOString().split('T')[0];
  const now = new Date();
  try {
    const { rows } = await db.query(
      `UPDATE clock_records SET lunch_in = $1, updated_at = NOW()
       WHERE employee_id = $2 AND date = $3 RETURNING *`,
      [now, employee_id, d]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'No clock-in record found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clock/edit  — admin edit clock times
// body: { employee_id, date, clock_in?, clock_out?, lunch_out?, lunch_in? }
router.put('/edit', async (req, res) => {
  const { employee_id, date, clock_in, clock_out, lunch_out, lunch_in } = req.body;
  if (!employee_id || !date) return res.status(400).json({ error: 'employee_id and date required' });

  // Build timestamp from date + time string (e.g. "10:30")
  const toTimestamp = (timeStr) => {
    if (!timeStr && timeStr !== '') return undefined;
    if (timeStr === '') return null; // empty string = clear
    return new Date(`${date}T${timeStr}:00`);
  };

  try {
    // Check if record exists
    const existing = await db.query(
      `SELECT id FROM clock_records WHERE employee_id = $1 AND date = $2`,
      [employee_id, date]
    );

    if (existing.rows.length === 0) {
      // Create new record
      const ci = toTimestamp(clock_in);
      const co = toTimestamp(clock_out);
      const lo = toTimestamp(lunch_out);
      const li = toTimestamp(lunch_in);
      const { rows } = await db.query(
        `INSERT INTO clock_records (employee_id, date, clock_in, clock_out, lunch_out, lunch_in)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [employee_id, date, ci || null, co || null, lo || null, li || null]
      );
      return res.json(rows[0]);
    }

    // Update existing — only update fields that were provided
    const sets = [];
    const params = [];
    let idx = 1;

    if (clock_in !== undefined) {
      sets.push(`clock_in = $${idx}`);
      params.push(toTimestamp(clock_in));
      idx++;
    }
    if (clock_out !== undefined) {
      sets.push(`clock_out = $${idx}`);
      params.push(toTimestamp(clock_out));
      idx++;
    }
    if (lunch_out !== undefined) {
      sets.push(`lunch_out = $${idx}`);
      params.push(toTimestamp(lunch_out));
      idx++;
    }
    if (lunch_in !== undefined) {
      sets.push(`lunch_in = $${idx}`);
      params.push(toTimestamp(lunch_in));
      idx++;
    }

    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

    sets.push('updated_at = NOW()');
    params.push(employee_id, date);

    const { rows } = await db.query(
      `UPDATE clock_records SET ${sets.join(', ')} WHERE employee_id = $${idx} AND date = $${idx + 1} RETURNING *`,
      params
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

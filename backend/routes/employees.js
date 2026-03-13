const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取所有员工
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM employees ORDER BY contract_status, id'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取单个员工
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 新增员工
router.post('/', async (req, res) => {
  const { name, rut, position, contract_status, has_contract, shift_group, contract_end_date, nationality, daily_wage, area, notes } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO employees (name, rut, position, contract_status, has_contract, shift_group, contract_end_date, nationality, daily_wage, area, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [name, rut || null, position, contract_status, has_contract, shift_group || null, contract_end_date || null, nationality || 'Chile', daily_wage || 0, area || null, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新员工
router.put('/:id', async (req, res) => {
  const { name, rut, position, contract_status, has_contract, shift_group, contract_end_date, nationality, daily_wage, area, notes } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE employees SET name=$1, rut=$2, position=$3, contract_status=$4, has_contract=$5, shift_group=$6, contract_end_date=$7, nationality=$8, daily_wage=$9, area=$10, notes=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [name, rut || null, position, contract_status, has_contract, shift_group || null, contract_end_date || null, nationality, daily_wage || 0, area || null, notes || null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除员工
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

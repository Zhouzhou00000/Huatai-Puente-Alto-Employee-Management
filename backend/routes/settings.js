const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取所有设置
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT key, value FROM settings');
    const obj = {};
    rows.forEach(r => { obj[r.key] = r.value; });
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新单个设置
router.put('/:key', async (req, res) => {
  const { value } = req.body;
  try {
    await db.query(
      `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [req.params.key, String(value)]
    );
    res.json({ key: req.params.key, value: String(value) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取所有公告 (置顶优先，然后按时间倒序)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM announcements ORDER BY pinned DESC, created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 新增公告
router.post('/', async (req, res) => {
  const { title, content, priority, pinned } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO announcements (title, content, priority, pinned)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, content, priority || 'normal', pinned || false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新公告
router.put('/:id', async (req, res) => {
  const { title, content, priority, pinned } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE announcements SET title=$1, content=$2, priority=$3, pinned=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [title, content, priority, pinned, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除公告
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM announcements WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

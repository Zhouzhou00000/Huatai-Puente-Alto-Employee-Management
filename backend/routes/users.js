const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

// Avatar upload config
const AVATAR_DIR = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.params.id}-${Date.now()}${ext}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG/PNG/WebP allowed'));
    }
  }
});

// 登录验证
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    // 1. Check system users table first
    const { rows: userRows } = await db.query(
      'SELECT id, username, name, role, avatar, permissions FROM users WHERE username = $1 AND password = $2 AND active = true',
      [username, password]
    );
    if (userRows.length > 0) {
      return res.json(userRows[0]);
    }

    // 2. Check employees table by name
    const { rows: empRows } = await db.query(
      `SELECT id, name, role, password, contract_status
       FROM employees WHERE name = $1 AND password = $2 AND contract_status != '已离职'`,
      [username, password]
    );
    if (empRows.length > 0) {
      const emp = empRows[0];
      // Map employee role to system role
      const sysRole = emp.role === '管理员' ? 'admin' : 'staff';
      // Default permissions based on employee role
      let permissions = '';
      if (emp.role === '主管') {
        permissions = 'home,employees,schedule,announcements,attendance';
      } else if (emp.role === '管理员') {
        permissions = ''; // admin gets all by default
      } else {
        permissions = 'home,schedule,announcements,attendance';
      }
      return res.json({
        id: emp.id,
        username: emp.name,
        name: emp.name,
        role: sysRole,
        empRole: emp.role,
        isEmployee: true,
        permissions: permissions,
      });
    }

    return res.status(401).json({ error: '用户名或密码错误' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取所有用户
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, username, name, role, active, permissions, created_at FROM users ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 创建用户
router.post('/', async (req, res) => {
  const { username, password, name, role } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO users (username, password, name, role) VALUES ($1, $2, $3, $4)
       RETURNING id, username, name, role, active, created_at`,
      [username, password || '123456', name, role || 'staff']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: '用户名已存在 / Usuario ya existe' });
    }
    res.status(500).json({ error: err.message });
  }
});

// 更新用户
router.put('/:id', async (req, res) => {
  const { username, name, role, active, permissions } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE users SET username=$1, name=$2, role=$3, active=$4, permissions=$5, updated_at=NOW()
       WHERE id=$6 RETURNING id, username, name, role, active, permissions, created_at`,
      [username, name, role, active !== false, permissions || '', req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: '用户名已存在 / Usuario ya existe' });
    }
    res.status(500).json({ error: err.message });
  }
});

// 重置用户密码
router.put('/:id/reset-password', async (req, res) => {
  const { password } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, name',
      [password || '123456', req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Password reset', user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 上传头像
router.post('/:id/avatar', avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Delete old avatar file if exists
    const { rows: old } = await db.query('SELECT avatar FROM users WHERE id = $1', [req.params.id]);
    if (old.length > 0 && old[0].avatar) {
      const oldPath = path.join(AVATAR_DIR, old[0].avatar);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const { rows } = await db.query(
      'UPDATE users SET avatar = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, name, role, avatar',
      [req.file.filename, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取单个用户 (profile)
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, username, name, role, active, avatar, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新个人资料 (name, password) — supports both users and employees table
router.put('/:id/profile', async (req, res) => {
  const { name, password, isEmployee } = req.body;
  const id = req.params.id;
  try {
    if (isEmployee) {
      // Update employees table
      let query, params;
      if (password) {
        query = 'UPDATE employees SET name=$1, password=$2, updated_at=NOW() WHERE id=$3 RETURNING id, name';
        params = [name, password, id];
      } else {
        query = 'UPDATE employees SET name=$1, updated_at=NOW() WHERE id=$2 RETURNING id, name';
        params = [name, id];
      }
      const { rows } = await db.query(query, params);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json({ id: rows[0].id, name: rows[0].name, isEmployee: true });
    }

    // Update users table
    let query, params;
    if (password) {
      query = 'UPDATE users SET name=$1, password=$2, updated_at=NOW() WHERE id=$3 RETURNING id, username, name, role, avatar';
      params = [name, password, id];
    } else {
      query = 'UPDATE users SET name=$1, updated_at=NOW() WHERE id=$2 RETURNING id, username, name, role, avatar';
      params = [name, id];
    }
    const { rows } = await db.query(query, params);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除用户
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

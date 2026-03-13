const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

// 上传目录
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// multer 配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${req.params.employeeId}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型 / Tipo de archivo no soportado'));
    }
  }
});

// 获取员工所有文件
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM employee_files WHERE employee_id = $1 ORDER BY file_type, created_at DESC',
      [req.params.employeeId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 上传文件
router.post('/employee/:employeeId', upload.single('file'), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { file_type, payslip_year, payslip_month } = req.body;

    if (!file_type || !['contract', 'finiquito', 'photo', 'payslip'].includes(file_type)) {
      // 删除已上传的文件
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '无效的文件类型' });
    }

    const { rows } = await db.query(
      `INSERT INTO employee_files (employee_id, file_type, original_name, stored_name, mime_type, file_size, payslip_year, payslip_month)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        employeeId,
        file_type,
        req.file.originalname,
        req.file.filename,
        req.file.mimetype,
        req.file.size,
        payslip_year || null,
        payslip_month || null,
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 下载/查看文件
router.get('/:fileId/download', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM employee_files WHERE id = $1', [req.params.fileId]);
    if (rows.length === 0) return res.status(404).json({ error: '文件不存在' });

    const file = rows[0];
    const filePath = path.join(UPLOAD_DIR, file.stored_name);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件已丢失' });
    }

    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.original_name)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除文件
router.delete('/:fileId', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM employee_files WHERE id = $1', [req.params.fileId]);
    if (rows.length === 0) return res.status(404).json({ error: '文件不存在' });

    const file = rows[0];
    const filePath = path.join(UPLOAD_DIR, file.stored_name);

    // 删除磁盘文件
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 删除数据库记录
    await db.query('DELETE FROM employee_files WHERE id = $1', [req.params.fileId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

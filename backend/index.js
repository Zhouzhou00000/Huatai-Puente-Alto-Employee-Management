const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Auto-migrate: create tables if not exist
const db = require('./db');
db.query(`
  CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT '未记录',
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, date)
  );
  CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
  CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
`).then(() => console.log('Attendance table ready')).catch(e => console.error('Migration error:', e.message));

db.query(`
  CREATE TABLE IF NOT EXISTS clock_records (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    clock_in TIMESTAMP,
    clock_out TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, date)
  );
  CREATE INDEX IF NOT EXISTS idx_clock_date ON clock_records(date);
  CREATE INDEX IF NOT EXISTS idx_clock_employee ON clock_records(employee_id);
`).then(() => console.log('Clock records table ready')).catch(e => console.error('Migration error:', e.message));

db.query(`
  CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMP DEFAULT NOW()
  );
  INSERT INTO settings (key, value) VALUES ('mobile_only', 'false') ON CONFLICT (key) DO NOTHING;
`).then(() => console.log('Settings table ready')).catch(e => console.error('Migration error:', e.message));

// Auto-migrate: add avatar column to users
db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(500)`)
  .then(() => console.log('Users avatar column ready'))
  .catch(e => console.error('Avatar migration error:', e.message));

// Serve avatar uploads statically
const path = require('path');
app.use('/api/avatars', express.static(path.join(__dirname, 'uploads', 'avatars')));

// Routes
app.use('/api/employees', require('./routes/employees'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/files', require('./routes/files'));
app.use('/api/users', require('./routes/users'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/clock', require('./routes/clock'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/translate', require('./routes/translate'));
app.use('/api/whatsapp', require('./routes/whatsapp'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

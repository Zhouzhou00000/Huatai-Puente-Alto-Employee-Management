const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

async function initDB() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('Schema created successfully');

    // Check if data already exists
    const { rows } = await pool.query('SELECT COUNT(*) FROM employees');
    if (parseInt(rows[0].count) === 0) {
      const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
      await pool.query(seed);
      console.log('Seed data inserted');
    } else {
      console.log('Data already exists, skipping seed');
    }

    await pool.end();
    console.log('Database initialization complete');
  } catch (err) {
    console.error('Database init error:', err.message);
    process.exit(1);
  }
}

initDB();

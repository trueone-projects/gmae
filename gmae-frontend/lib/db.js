// gmae-frontend/lib/db.js
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'gmae_db',
  password: 'Arva279279',
  port: 5432,
  ssl: false, // Penting agar tidak error SSL
});

module.exports = pool;
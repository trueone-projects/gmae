const { Pool } = require('pg');

// Gunakan URL koneksi database cloud jika tersedia, jika tidak gunakan local credentials
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Arva279279@localhost:5432/gmae_db';

const pool = new Pool({
  connectionString: connectionString,
  // Aktifkan SSL hanya jika terhubung ke cloud database (seperti Neon DB/Supabase)
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

module.exports = pool;
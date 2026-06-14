import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT id, run_name, trust_level, transparency, created_at, details FROM state_history ORDER BY created_at DESC LIMIT 10'
    );
    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error("Gagal menarik data riwayat dari DB:", err.message);
    
    // Kirim status 500 dengan pesan kesalahan database
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

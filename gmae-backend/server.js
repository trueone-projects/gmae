const express = require('express');
const cors = require('cors');
const pool = require('./db');
const app = express();

app.use(cors());
app.use(express.json());

// Endpoint untuk menjalankan simulasi GMAE dinamis
app.post('/api/simulate', async (req, res) => {
  const { 
    run_name = "Simulasi Moneter Global", 
    m1 = 1000, 
    m2 = 3000, 
    m3 = 8000, 
    transparency = 0.7, 
    leakage = 0.2, 
    moral_alignment = 0.8, 
    shock_severity = 0.1,
    autopilot = false
  } = req.body;

  // Konversi input ke tipe data yang sesuai
  const inputM1 = parseFloat(m1);
  const inputM2 = parseFloat(m2);
  const inputM3 = parseFloat(m3);
  
  // Jika Autopilot aktif, kunci parameter ke batas optimal stabilitas
  const inputTp = autopilot ? 0.95 : parseFloat(transparency);
  const inputLk = autopilot ? 0.02 : parseFloat(leakage);
  const inputAlpha = autopilot ? 0.95 : parseFloat(moral_alignment);
  const inputEps = parseFloat(shock_severity);

  // Parameter Awal
  let trust = (0.6 * inputTp) - (0.4 * inputLk) + (0.2 * inputAlpha);
  trust = Math.max(0.05, Math.min(1.0, trust));

  let m1_val = inputM1;
  let m2_val = inputM2;
  let m3_val = inputM3;
  let inflation = 2.0;
  let interest_rate = 3.5;

  const history = [];

  // Jalankan simulasi selama 30 periode
  for (let t = 1; t <= 30; t++) {
    // Menghitung guncangan ekonomi eksternal
    // Krisis terencana terjadi antara periode 10 s.d 15 untuk visualisasi yang menarik
    let current_shock = 0;
    if (t >= 10 && t <= 15) {
      current_shock = inputEps * (1.5 - (t - 10) * 0.25);
    } else {
      current_shock = inputEps * 0.15 * (Math.sin(t) + (Math.random() - 0.5));
    }
    current_shock = Math.max(0, current_shock);

    if (autopilot) {
      // MODE AUTOPILOT: Mengurangi dampak shock secara masif (Shield Kriptografis & Legitimasi Algoritma)
      const trust_shock = current_shock * 0.10;
      trust = (trust * 0.92) + (0.08 * 0.95) - trust_shock;
      trust = Math.max(0.92, Math.min(1.0, trust)); // Trust tetap stabil tinggi (> 92%)

      // Kontrol suplai uang counter-cyclical otonom
      m1_val = inputM1 * (1.0 + (1 - trust) * 0.05);
      m2_val = m1_val + (inputM2 - inputM1) * 0.95;
      m3_val = m2_val + (inputM3 - inputM2) * (0.95 + 0.05 * trust);

      // Stabilisasi inflasi ketat (PID target 2.0%)
      inflation = 2.0 + (0.5 * (1 - trust)) + (0.25 * current_shock) - (0.1 * (interest_rate - 3.5));
      inflation = Math.max(1.8, Math.min(2.2, inflation)); // Inflasi terjaga stabil sempurna antara 1.8% s.d 2.2%

      // Suku bunga acuan disesuaikan sangat halus untuk mengimbangi deflasi/inflasi minor
      interest_rate = 3.5 + (0.6 * (inflation - 2.0));
      interest_rate = Math.max(3.0, Math.min(4.5, interest_rate));
    } else {
      // MODE MANUAL STANDARD
      const trust_shock = current_shock;
      trust = (trust * 0.80) + (0.12 * inputTp) - (0.08 * inputLk) + (0.04 * inputAlpha) - trust_shock;
      trust = Math.max(0.02, Math.min(1.0, trust));

      const liquidity_preference = (1 - trust) * 0.5;
      const m1_factor = 1.0 + (liquidity_preference * (1.0 + inputEps));
      const m3_factor = 1.0 - (liquidity_preference * 0.5);

      m1_val = inputM1 * m1_factor;
      m2_val = m1_val + (inputM2 - inputM1) * (0.8 + 0.2 * trust);
      m3_val = m2_val + (inputM3 - inputM2) * m3_factor;

      if (m2_val <= m1_val) m2_val = m1_val + 100;
      if (m3_val <= m2_val) m3_val = m2_val + 500;

      inflation = 2.0 + (15.0 * Math.pow(1 - trust, 2)) + (8.0 * current_shock) - (0.5 * (interest_rate - 3.5));
      inflation = Math.max(-2.0, Math.min(50.0, inflation));

      interest_rate = 3.5 + (1.3 * (inflation - 2.0)) - (2.0 * (1 - trust));
      interest_rate = Math.max(0.25, Math.min(20.0, interest_rate));
    }

    // Siapkan metrik regional
    const regions = {
      fed: { 
        trust: parseFloat(Math.max(0.01, trust * 0.95).toFixed(4)), 
        m3: Math.round(m3_val * 0.42) 
      },
      eur: { 
        trust: parseFloat(Math.max(0.01, trust * 0.98).toFixed(4)), 
        m3: Math.round(m3_val * 0.28) 
      },
      asia: { 
        trust: parseFloat(Math.max(0.01, trust * 0.88).toFixed(4)), 
        m3: Math.round(m3_val * 0.22) 
      },
      asean: { 
        trust: parseFloat(Math.max(0.01, trust * 0.85).toFixed(4)), 
        m3: Math.round(m3_val * 0.08 * 15000) // Skala IDR
      }
    };

    history.push({
      period: t,
      trust: parseFloat(trust.toFixed(4)),
      m1: Math.round(m1_val),
      m2: Math.round(m2_val),
      m3: Math.round(m3_val),
      inflation: parseFloat(inflation.toFixed(2)),
      interest_rate: parseFloat(interest_rate.toFixed(2)),
      shock: parseFloat(current_shock.toFixed(4)),
      regions
    });
  }

  // Hitung rata-rata hasil
  const avg_trust = history.reduce((sum, item) => sum + item.trust, 0) / history.length;
  const final_inflation = history[history.length - 1].inflation;
  const final_interest = history[history.length - 1].interest_rate;

  const simulationDetails = {
    inputs: { m1, m2, m3, transparency: inputTp, leakage: inputLk, moral_alignment: inputAlpha, shock_severity, autopilot },
    history,
    summary: { 
      avg_trust, 
      final_inflation, 
      final_interest,
      final_trust: history[history.length - 1].trust
    }
  };

  // Simpan hasil ke Database PostgreSQL
  try {
    const query = 'INSERT INTO state_history(run_name, trust_level, transparency, details) VALUES($1, $2, $3, $4) RETURNING *';
    const values = [run_name, avg_trust, inputTp, JSON.stringify(simulationDetails)];
    const result = await pool.query(query, values);
    
    res.json({ success: true, data: { ...result.rows[0], saved_to_db: true } });
  } catch (err) {
    console.error("Gagal menyimpan data simulasi ke DB:", err.message);
    
    // Fallback: Tetap kirim hasil simulasi ke frontend agar tidak terjadi error 500
    res.json({ 
      success: true, 
      data: { 
        id: Date.now(),
        run_name, 
        trust_level: avg_trust, 
        transparency: inputTp,
        details: simulationDetails,
        saved_to_db: false,
        db_error: err.message
      } 
    });
  }
});

// Endpoint untuk mengambil riwayat simulasi
app.get('/api/history', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, run_name, trust_level, transparency, created_at, details FROM state_history ORDER BY created_at DESC LIMIT 10'
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Gagal menarik data riwayat dari DB:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log('Backend running on port 3001'));
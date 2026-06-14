'use client';

import { useState, useEffect } from 'react';
import { sendSimulationData, getHistoryData } from '../lib/api';

// Tipe data untuk struktur hasil simulasi
interface RegionMetrics {
  trust: number;
  m3: number;
}

interface SimulationStep {
  period: number;
  trust: number;
  m1: number;
  m2: number;
  m3: number;
  inflation: number;
  interest_rate: number;
  shock: number;
  regions: {
    fed: RegionMetrics;
    eur: RegionMetrics;
    asia: RegionMetrics;
    asean: RegionMetrics;
  };
}

interface SimulationDetails {
  inputs: {
    m1: number;
    m2: number;
    m3: number;
    transparency: number;
    leakage: number;
    moral_alignment: number;
    shock_severity: number;
    autopilot?: boolean;
  };
  history: SimulationStep[];
  summary: {
    avg_trust: number;
    final_inflation: number;
    final_interest: number;
    final_trust: number;
  };
}

interface HistoryRun {
  id: number;
  run_name: string;
  trust_level: number;
  transparency: number;
  created_at: string;
  details: SimulationDetails;
}

// Simulasi Awal Bawaan (Default Mock Data) saat halaman dimuat
const generateDefaultMockData = (): SimulationDetails => {
  const history: SimulationStep[] = [];
  let trust = 0.65;
  for (let t = 1; t <= 30; t++) {
    let current_shock = 0;
    if (t >= 10 && t <= 15) {
      current_shock = 0.1 * (1.5 - (t - 10) * 0.25);
    } else {
      current_shock = 0.01 * Math.sin(t);
    }
    current_shock = Math.max(0, current_shock);
    trust = trust * 0.82 + 0.12 * 0.7 - 0.08 * 0.2 + 0.04 * 0.8 - current_shock;
    trust = Math.max(0.05, Math.min(1.0, trust));

    const m1_val = 1000 * (1.0 + (1 - trust) * 0.2);
    const m2_val = m1_val + 2000 * (0.8 + 0.2 * trust);
    const m3_val = m2_val + 5000 * (0.6 + 0.4 * trust);
    const inflation = 2.0 + 15 * Math.pow(1 - trust, 2) - 0.5 * (3.5 - 3.5);
    const interest_rate = 3.5 + 1.2 * (inflation - 2.0);

    history.push({
      period: t,
      trust: parseFloat(trust.toFixed(4)),
      m1: Math.round(m1_val),
      m2: Math.round(m2_val),
      m3: Math.round(m3_val),
      inflation: parseFloat(inflation.toFixed(2)),
      interest_rate: parseFloat(interest_rate.toFixed(2)),
      shock: parseFloat(current_shock.toFixed(4)),
      regions: {
        fed: { trust: parseFloat((trust * 0.95).toFixed(4)), m3: Math.round(m3_val * 0.42) },
        eur: { trust: parseFloat((trust * 0.98).toFixed(4)), m3: Math.round(m3_val * 0.28) },
        asia: { trust: parseFloat((trust * 0.88).toFixed(4)), m3: Math.round(m3_val * 0.22) },
        asean: { trust: parseFloat((trust * 0.85).toFixed(4)), m3: Math.round(m3_val * 0.08 * 15000) }
      }
    });
  }
  return {
    inputs: {
      m1: 1000,
      m2: 3000,
      m3: 8000,
      transparency: 0.7,
      leakage: 0.2,
      moral_alignment: 0.8,
      shock_severity: 0.1,
      autopilot: false
    },
    history,
    summary: {
      avg_trust: 0.63,
      final_inflation: history[29].inflation,
      final_interest: history[29].interest_rate,
      final_trust: history[29].trust
    }
  };
};

export default function CentralBankDashboard() {
  // Input States
  const [runName, setRunName] = useState('Kebijakan Moneter Stabil');
  const [m1, setM1] = useState(1000);
  const [m2, setM2] = useState(3000);
  const [m3, setM3] = useState(8000);
  const [transparency, setTransparency] = useState(0.7);
  const [leakage, setLeakage] = useState(0.2);
  const [moralAlignment, setMoralAlignment] = useState(0.8);
  const [shockSeverity, setShockSeverity] = useState(0.1);
  const [autopilot, setAutopilot] = useState(false); // Mode Autopilot GMAE

  // Simulation Results State
  const [simData, setSimData] = useState<SimulationDetails>(generateDefaultMockData());
  const [loading, setLoading] = useState(false);
  const [historyList, setHistoryList] = useState<HistoryRun[]>([]);
  const [dbStatus, setDbStatus] = useState<string | null>(null);

  // Load history from DB
  const fetchHistory = async () => {
    try {
      const data = await getHistoryData();
      if (Array.isArray(data)) {
        setHistoryList(data);
        setDbStatus('Connected');
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
      setDbStatus('Mock (Offline DB)');
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Run Simulation Action
  const handleSimulate = async () => {
    setLoading(true);
    try {
      const payload = {
        run_name: autopilot ? `Autopilot: ${runName}` : runName,
        m1,
        m2,
        m3,
        transparency: autopilot ? 0.95 : transparency,
        leakage: autopilot ? 0.02 : leakage,
        moral_alignment: autopilot ? 0.95 : moralAlignment,
        shock_severity: shockSeverity,
        autopilot
      };
      const response = await sendSimulationData(payload);
      if (response && response.success) {
        if (response.data.details) {
          setSimData(response.data.details);
        } else {
          setSimData(response.data);
        }
        await fetchHistory();
      }
    } catch (error) {
      alert('Gagal terhubung ke backend Node.js! Menggunakan simulasi lokal.');
      const localSim = generateDefaultMockData();
      setSimData(localSim);
    } finally {
      setLoading(false);
    }
  };

  // Muat data simulasi dari riwayat
  const handleLoadHistory = (run: HistoryRun) => {
    setSimData(run.details);
    setRunName(run.run_name);
    setM1(run.details.inputs.m1);
    setM2(run.details.inputs.m2);
    setM3(run.details.inputs.m3);
    setTransparency(run.details.inputs.transparency);
    setLeakage(run.details.inputs.leakage);
    setMoralAlignment(run.details.inputs.moral_alignment);
    setShockSeverity(run.details.inputs.shock_severity);
    setAutopilot(run.details.inputs.autopilot || false);
  };

  const currentSummary = simData.summary;
  const currentHistory = simData.history;
  const latestStep = currentHistory[currentHistory.length - 1];

  // Helper untuk menentukan status stabilitas
  const getStabilityStatus = (trust: number, inflation: number) => {
    if (trust > 0.6 && inflation < 5.0) return { label: 'High-Trust Stable', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' };
    if (trust > 0.3 && inflation < 12.0) return { label: 'Moderate Volatility', color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' };
    return { label: 'Systemic Trust Collapse', color: 'text-rose-400 border-rose-500/20 bg-rose-500/5' };
  };

  const stability = getStabilityStatus(latestStep.trust, latestStep.inflation);

  // SVG Chart Dimensions
  const chartW = 600;
  const chartH = 220;
  const padding = 35;

  // Helper membuat jalur SVG untuk line chart
  const getSvgPath = (data: number[], minVal: number, maxVal: number) => {
    const range = maxVal - minVal || 1;
    return data
      .map((val, idx) => {
        const x = padding + (idx / (data.length - 1)) * (chartW - 2 * padding);
        const y = chartH - padding - ((val - minVal) / range) * (chartH - 2 * padding);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  // SVG Helper untuk Area Chart berlapis (M1, M2, M3)
  const getSvgAreaPath = (data: number[], baseData: number[], minVal: number, maxVal: number) => {
    const range = maxVal - minVal || 1;
    const points = data.map((val, idx) => {
      const x = padding + (idx / (data.length - 1)) * (chartW - 2 * padding);
      const y = chartH - padding - ((val - minVal) / range) * (chartH - 2 * padding);
      return { x, y };
    });

    const basePoints = baseData.map((val, idx) => {
      const x = padding + ((data.length - 1 - idx) / (data.length - 1)) * (chartW - 2 * padding);
      const y = chartH - padding - ((baseData[data.length - 1 - idx] - minVal) / range) * (chartH - 2 * padding);
      return { x, y };
    });

    const pathPart1 = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const pathPart2 = basePoints.map(p => `L ${p.x} ${p.y}`).join(' ');

    return `${pathPart1} ${pathPart2} Z`;
  };

  // Ekstrak data untuk Chart 1 (Trust, Inflation, Interest Rate)
  const trustPoints = currentHistory.map(h => h.trust * 100);
  const inflationPoints = currentHistory.map(h => h.inflation);
  const interestPoints = currentHistory.map(h => h.interest_rate);

  // Ekstrak data untuk Chart 2 (M1, M2, M3)
  const m1Points = currentHistory.map(h => h.m1);
  const m2Points = currentHistory.map(h => h.m2);
  const m3Points = currentHistory.map(h => h.m3);
  const maxMonetaryVal = Math.max(...m3Points) * 1.1;

  return (
    <div className="flex-1 bg-[#08080d] text-slate-100 min-h-screen font-sans flex flex-col antialiased selection:bg-cyan-500/30 selection:text-cyan-300">
      
      {/* HEADER UTAMA */}
      <header className="border-b border-slate-800/80 bg-slate-950/45 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-slate-900 text-xl tracking-wider shadow-lg shadow-cyan-500/20">
            Ω
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider text-slate-100 flex items-center">
              GMA AUTHORITY
              <span className="ml-3 text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border border-cyan-500/30 text-cyan-400 bg-cyan-950/45">
                AI Governor Active
              </span>
            </h1>
            <p className="text-[11px] text-slate-400/80 tracking-wide">
              Global Algorithmic Monetary Authority — Protokol Pengendali Keseimbangan GMAE
            </p>
          </div>
        </div>
        
        {/* Kontrol Cepat Autopilot di Header */}
        <div className="hidden md:flex items-center space-x-4 bg-slate-950/70 border border-slate-800 rounded-lg px-4 py-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Protokol Stabilizer</span>
          <button 
            onClick={() => setAutopilot(!autopilot)}
            className={`text-xs font-semibold px-3 py-1 rounded transition-all ${autopilot ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-extrabold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            {autopilot ? 'AUTOPILOT: ON' : 'AUTOPILOT: OFF'}
          </button>
        </div>

        <div className="flex items-center space-x-6 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/40"></span>
            <span>Database: <strong className="text-slate-200">{dbStatus || 'Loading...'}</strong></span>
          </div>
          <div>
            System Time: <strong className="text-slate-200">2026-06-14 11:45 UTC+7</strong>
          </div>
        </div>
      </header>

      {/* DASHBOARD RINGKASAN METRIK GLOBAL */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-slate-950/20 border-b border-slate-900">
        
        {/* Card 1: Trust Level */}
        <div className="p-4 rounded-xl border border-slate-800/60 bg-slate-950/40 hover:border-slate-700/60 transition-all flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">GMAE Trust Index</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-cyan-950/60 text-cyan-400 border border-cyan-500/20">T_t</span>
          </div>
          <div className="my-2">
            <h3 className="text-3xl font-extrabold font-mono text-cyan-400">
              {(latestStep.trust * 100).toFixed(1)}%
            </h3>
            <div className={`mt-2 text-[10px] px-2 py-1 rounded-md border inline-block ${stability.color}`}>
              {stability.label}
            </div>
          </div>
          <p className="text-[10px] text-slate-400">Tingkat kepercayaan endogen publik terhadap kebijakan AI.</p>
        </div>

        {/* Card 2: Broad Money Supply (M3) */}
        <div className="p-4 rounded-xl border border-slate-800/60 bg-slate-950/40 hover:border-slate-700/60 transition-all flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Broad Money Supply (M3)</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-indigo-950/60 text-indigo-400 border border-indigo-500/20">Aggregates</span>
          </div>
          <div className="my-2">
            <h3 className="text-3xl font-extrabold font-mono text-indigo-400">
              {latestStep.m3.toLocaleString()} <span className="text-xs font-normal text-slate-400">GMA</span>
            </h3>
            <p className="text-[11px] text-slate-300 mt-2">
              M1: <strong className="font-mono text-slate-100">{latestStep.m1.toLocaleString()}</strong> | M2: <strong className="font-mono text-slate-100">{latestStep.m2.toLocaleString()}</strong>
            </p>
          </div>
          <p className="text-[10px] text-slate-400">Total suplai uang broad money yang bersirkulasi secara global.</p>
        </div>

        {/* Card 3: Inflation Rate */}
        <div className="p-4 rounded-xl border border-slate-800/60 bg-slate-950/40 hover:border-slate-700/60 transition-all flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Global Inflation Rate</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-rose-950/60 text-rose-400 border border-rose-500/20">π_t</span>
          </div>
          <div className="my-2">
            <h3 className={`text-3xl font-extrabold font-mono ${latestStep.inflation > 15 ? 'text-rose-500' : latestStep.inflation > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {latestStep.inflation.toFixed(2)}%
            </h3>
            <p className="text-[11px] text-slate-400 mt-2">
              Target Stabilitas Moneter: <strong className="text-slate-200">2.0%</strong>
            </p>
          </div>
          <p className="text-[10px] text-slate-400">Tekanan inflasi hasil dari devaluasi trust atau guncangan pasar.</p>
        </div>

        {/* Card 4: Base Policy Rate */}
        <div className="p-4 rounded-xl border border-slate-800/60 bg-slate-950/40 hover:border-slate-700/60 transition-all flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">AI Policy Interest Rate</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-amber-950/60 text-amber-400 border border-amber-500/20">r_t</span>
          </div>
          <div className="my-2">
            <h3 className="text-3xl font-extrabold font-mono text-amber-400">
              {latestStep.interest_rate.toFixed(2)}%
            </h3>
            <p className="text-[11px] text-slate-400 mt-2">
              Model Respons: <strong className="text-slate-200">Keseimbangan Dinamis</strong>
            </p>
          </div>
          <p className="text-[10px] text-slate-400">Suku bunga acuan yang dimodulasi secara otonom oleh AI Governor.</p>
        </div>
      </section>

      {/* BODY UTAMA: 3 PANEL GRID */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
        
        {/* PANEL KIRI: MONETARY & GMAE CONTROL PANEL */}
        <section className="lg:col-span-4 flex flex-col space-y-4">
          
          {/* Card Penjelasan Protokol Stabilitas Otonom */}
          {autopilot && (
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 text-xs text-cyan-200 leading-relaxed shadow-lg shadow-cyan-500/5">
              <h4 className="font-bold text-cyan-300 uppercase tracking-wider mb-1 flex items-center">
                <span className="mr-2 h-2.5 w-2.5 rounded-full bg-cyan-500 animate-pulse"></span>
                Protokol Stabilitas Otonom Aktif
              </h4>
              <p>
                Sistem CBDC saat ini mengabaikan input parameter manual. AI mengunci <strong>Transparansi pada 95%</strong> dan menerapkan pertahanan kriptografis enklaf moneter untuk meredam <strong>Kebocoran menjadi 2%</strong>.
              </p>
              <div className="mt-2 font-mono text-[10px] text-cyan-400">
                &gt;_ PID_Stabilizer: ACTIVE // Shock_Dampening: 85%
              </div>
            </div>
          )}

          <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-950/50 backdrop-blur-md flex flex-col space-y-5">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100 border-b border-slate-800 pb-2 flex justify-between items-center">
                <span>Instruksi Kebijakan</span>
                <span className="text-[10px] font-mono text-slate-400">Autopilot overrides sliders</span>
              </h2>
            </div>

            {/* Nama Simulasi */}
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-semibold text-slate-300">Nama Kebijakan Simulasi</label>
              <input 
                type="text"
                value={runName}
                onChange={(e) => setRunName(e.target.value)}
                className="w-full bg-[#12121e] border border-slate-800 rounded px-3 py-2 text-xs focus:outline-none focus:border-cyan-500/50 text-slate-200 transition-colors"
                placeholder="cth: Skenario Transparansi Radikal"
              />
            </div>

            {/* Switch Autopilot Mobile / Sampingan */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-850 bg-slate-950/70 md:hidden">
              <span className="text-xs font-bold text-slate-300">GMAE Autopilot Mode</span>
              <button 
                onClick={() => setAutopilot(!autopilot)}
                className={`text-xs font-bold px-3 py-1.5 rounded ${autopilot ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}
              >
                {autopilot ? 'AKTIF' : 'NONAKTIF'}
              </button>
            </div>

            {/* SLIDERS: MONETARY TARGETS */}
            <div className={`space-y-4 transition-all ${autopilot ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
              <h3 className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Target Agregat Moneter</h3>
              
              {/* Slider M1 */}
              <div className="flex flex-col space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Target M1 (Liquid Cash)</span>
                  <span className="font-mono text-cyan-400">{m1.toLocaleString()} GMA</span>
                </div>
                <input 
                  type="range" min="500" max="3000" step="100"
                  disabled={autopilot}
                  value={m1} onChange={(e) => setM1(Number(e.target.value))}
                  className="w-full accent-cyan-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Slider M2 */}
              <div className="flex flex-col space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Target M2 (Savings)</span>
                  <span className="font-mono text-indigo-400">{m2.toLocaleString()} GMA</span>
                </div>
                <input 
                  type="range" min="1500" max="8000" step="100"
                  disabled={autopilot}
                  value={m2} onChange={(e) => setM2(Number(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Slider M3 */}
              <div className="flex flex-col space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Target M3 (Broad Money)</span>
                  <span className="font-mono text-violet-400">{m3.toLocaleString()} GMA</span>
                </div>
                <input 
                  type="range" min="4000" max="20000" step="200"
                  disabled={autopilot}
                  value={m3} onChange={(e) => setM3(Number(e.target.value))}
                  className="w-full accent-violet-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* SLIDERS: GMAE MODEL FACTORS */}
            <div className={`space-y-4 pt-2 border-t border-slate-900 transition-all ${autopilot ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
              <h3 className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Variabel GMAE (Paper Model)</h3>

              {/* Algorithmic Transparency */}
              <div className="flex flex-col space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Algorithmic Transparency (tp)</span>
                  <span className="font-mono text-cyan-400">{Math.round(transparency * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05"
                  disabled={autopilot}
                  value={transparency} onChange={(e) => setTransparency(Number(e.target.value))}
                  className="w-full accent-cyan-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Institutional Leakage */}
              <div className="flex flex-col space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Institutional Leakage (lk)</span>
                  <span className="font-mono text-rose-500">{Math.round(leakage * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05"
                  disabled={autopilot}
                  value={leakage} onChange={(e) => setLeakage(Number(e.target.value))}
                  className="w-full accent-rose-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Moral Alignment */}
              <div className="flex flex-col space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Moral Alignment (α)</span>
                  <span className="font-mono text-emerald-400">{Math.round(moralAlignment * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05"
                  disabled={autopilot}
                  value={moralAlignment} onChange={(e) => setMoralAlignment(Number(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Slider Shock Tetap Aktif di Autopilot untuk Menguji Ketangguhan */}
            <div className="space-y-4 pt-2 border-t border-slate-900">
              <h3 className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Pengujian Stress Test</h3>
              <div className="flex flex-col space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-350">Economic Shock Severity (ε)</span>
                  <span className="font-mono text-amber-500">{Math.round(shockSeverity * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05"
                  value={shockSeverity} onChange={(e) => setShockSeverity(Number(e.target.value))}
                  className="w-full accent-amber-500 bg-slate-850 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* BUTTON SIMULASI */}
            <button
              onClick={handleSimulate}
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold py-2.5 px-4 rounded-lg text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Menghitung Equilibria...' : 'Simulasikan Kebijakan Moneter'}
            </button>
          </div>
        </section>

        {/* PANEL TENGAH: GRAFIK & ANALISIS WILAYAH */}
        <section className="lg:col-span-5 flex flex-col space-y-6">
          
          {/* VISUALISASI GRAFIK 1: GMAE TRUST & INFLASI */}
          <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-950/50 backdrop-blur-md flex flex-col">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-100 border-b border-slate-800 pb-2 flex justify-between">
              <span>GMAE Trust & Stabilitas Dinamis</span>
              <span className="text-slate-400 lowercase font-normal">30-Period Timeline</span>
            </h2>

            {/* SVG Chart 1 */}
            <div className="relative mt-4 flex justify-center bg-slate-950/50 border border-slate-900 rounded-lg p-2 overflow-hidden">
              <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto">
                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = padding + ratio * (chartH - 2 * padding);
                  return (
                    <line key={idx} x1={padding} y1={y} x2={chartW - padding} y2={y} stroke="#1f2937" strokeDasharray="3 3" />
                  );
                })}
                {/* Vertical Shock Zone Marker (Periode 10-15) */}
                <rect 
                  x={padding + (9 / 29) * (chartW - 2 * padding)} 
                  y={padding} 
                  width={(6 / 29) * (chartW - 2 * padding)} 
                  height={chartH - 2 * padding} 
                  fill="rgba(239, 68, 68, 0.04)" 
                  stroke="rgba(239, 68, 68, 0.15)"
                  strokeDasharray="2 2"
                />
                
                {/* Lines */}
                {/* 1. GMAE Trust (Cyan) */}
                <path
                  d={getSvgPath(trustPoints, 0, 100)}
                  fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                />
                {/* 2. Inflation Rate (Red) */}
                <path
                  d={getSvgPath(inflationPoints, -2, 50)}
                  fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2" strokeLinecap="round" strokeLinejoin="round"
                />
                {/* 3. Interest Rate (Amber) */}
                <path
                  d={getSvgPath(interestPoints, 0, 20)}
                  fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                />

                {/* Legend */}
                <text x={padding + 10} y={padding + 15} fill="#22d3ee" fontSize="9" fontFamily="monospace">—— Trust Level (%)</text>
                <text x={padding + 130} y={padding + 15} fill="#ef4444" fontSize="9" fontFamily="monospace">- - Inflation Rate (π)</text>
                <text x={padding + 260} y={padding + 15} fill="#f59e0b" fontSize="9" fontFamily="monospace">—— Policy Rate (r)</text>
                <text x={padding + (11 / 29) * (chartW - 2 * padding)} y={chartH - padding - 8} fill="#f87171" fontSize="8" fontFamily="sans-serif">Shock Zone</text>
              </svg>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              {autopilot 
                ? "Autopilot Aktif: Kurva Trust bertahan sangat kuat di atas 90%, menekan lonjakan inflasi mendekati garis lurus stabil."
                : "*Arsir merah mewakili guncangan eksternal (External Shock Zone) pada Periode 10–15."}
            </p>
          </div>

          {/* VISUALISASI GRAFIK 2: MONETARY AGGREGATES */}
          <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-950/50 backdrop-blur-md flex flex-col">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-100 border-b border-slate-800 pb-2 flex justify-between">
              <span>Aliran Suplai Uang Dinamis (M1, M2, M3)</span>
              <span className="text-slate-400 lowercase font-normal">Liquidity shifts</span>
            </h2>

            {/* SVG Chart 2 */}
            <div className="relative mt-4 flex justify-center bg-slate-950/50 border border-slate-900 rounded-lg p-2 overflow-hidden">
              <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto">
                {/* Area M3 (Broad Money) */}
                <path
                  d={getSvgAreaPath(m3Points, m2Points, 0, maxMonetaryVal)}
                  fill="rgba(124, 58, 237, 0.15)" stroke="none"
                />
                {/* Area M2 (Savings) */}
                <path
                  d={getSvgAreaPath(m2Points, m1Points, 0, maxMonetaryVal)}
                  fill="rgba(79, 70, 229, 0.25)" stroke="none"
                />
                {/* Area M1 (Liquidity) */}
                <path
                  d={getSvgAreaPath(m1Points, currentHistory.map(() => 0), 0, maxMonetaryVal)}
                  fill="rgba(6, 182, 212, 0.35)" stroke="none"
                />

                {/* Lines boundary */}
                <path d={getSvgPath(m3Points, 0, maxMonetaryVal)} fill="none" stroke="#a78bfa" strokeWidth="1.5" />
                <path d={getSvgPath(m2Points, 0, maxMonetaryVal)} fill="none" stroke="#6366f1" strokeWidth="1.5" />
                <path d={getSvgPath(m1Points, 0, maxMonetaryVal)} fill="none" stroke="#06b6d4" strokeWidth="2" />

                {/* Legend */}
                <text x={padding + 10} y={padding + 15} fill="#a78bfa" fontSize="9" fontFamily="monospace">■ M3 (Broad Money)</text>
                <text x={padding + 130} y={padding + 15} fill="#6366f1" fontSize="9" fontFamily="monospace">■ M2 (Savings)</text>
                <text x={padding + 250} y={padding + 15} fill="#06b6d4" fontSize="9" fontFamily="monospace">■ M1 (Cash/Liquidity)</text>
              </svg>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              {autopilot 
                ? "Autopilot Aktif: M3 dan M1 tidak mengalami anomali kepanikan likuiditas. Aliran dana tersalurkan konstan."
                : "Ketidakstabilan GMAE memicu likuidasi dana berjangka (M3) masuk ke wadah likuiditas tunai (M1)."}
            </p>
          </div>
        </section>

        {/* PANEL KANAN: WILAYAH FINANSIAL & RIWAYAT SIMULASI */}
        <section className="lg:col-span-3 flex flex-col space-y-6">
          
          {/* WILAYAH FINANSIAL DUNIA */}
          <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-950/50 backdrop-blur-md flex flex-col">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-100 border-b border-slate-800 pb-2">
              Status Finansial Wilayah
            </h2>
            
            <div className="mt-4 space-y-4">
              
              {/* FED (USD) */}
              <div className="bg-[#0f0f1c] border border-slate-850 p-3 rounded-lg flex flex-col space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-300">FED Zone (USD)</span>
                  <span className="font-mono text-cyan-400">{(latestStep.regions.fed.trust * 100).toFixed(1)}% T</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-450">
                  <span>M3 Supply:</span>
                  <span className="font-mono text-slate-200">{latestStep.regions.fed.m3.toLocaleString()} GMA</span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                  <div className="bg-cyan-500 h-full" style={{ width: `${latestStep.regions.fed.trust * 100}%` }}></div>
                </div>
              </div>

              {/* ECB (EUR) */}
              <div className="bg-[#0f0f1c] border border-slate-850 p-3 rounded-lg flex flex-col space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-300">EURO Zone (EUR)</span>
                  <span className="font-mono text-cyan-400">{(latestStep.regions.eur.trust * 100).toFixed(1)}% T</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-450">
                  <span>M3 Supply:</span>
                  <span className="font-mono text-slate-200">{latestStep.regions.eur.m3.toLocaleString()} GMA</span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                  <div className="bg-cyan-500 h-full" style={{ width: `${latestStep.regions.eur.trust * 100}%` }}></div>
                </div>
              </div>

              {/* ASIA-PACIFIC */}
              <div className="bg-[#0f0f1c] border border-slate-850 p-3 rounded-lg flex flex-col space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-300">Asia-Pacific Zone</span>
                  <span className="font-mono text-cyan-400">{(latestStep.regions.asia.trust * 100).toFixed(1)}% T</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-450">
                  <span>M3 Supply:</span>
                  <span className="font-mono text-slate-200">{latestStep.regions.asia.m3.toLocaleString()} GMA</span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                  <div className="bg-cyan-500 h-full" style={{ width: `${latestStep.regions.asia.trust * 100}%` }}></div>
                </div>
              </div>

              {/* ASEAN (IDR) */}
              <div className="bg-[#0f0f1c] border border-slate-850 p-3 rounded-lg flex flex-col space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-emerald-400">ASEAN Zone (IDR)</span>
                  <span className="font-mono text-cyan-400">{(latestStep.regions.asean.trust * 100).toFixed(1)}% T</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-450">
                  <span>M3 Supply:</span>
                  <span className="font-mono text-slate-200">Rp {latestStep.regions.asean.m3.toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                  <div className="bg-emerald-500 h-full" style={{ width: `${latestStep.regions.asean.trust * 100}%` }}></div>
                </div>
              </div>

            </div>
          </div>

          {/* RIWAYAT SIMULASI DI DATABASE */}
          <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-950/50 backdrop-blur-md flex flex-col flex-1 min-h-[200px]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-100 border-b border-slate-800 pb-2">
              Log Riwayat Kebijakan
            </h2>

            <div className="mt-3 flex-1 overflow-y-auto space-y-2 max-h-[300px]">
              {historyList.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Belum ada riwayat terekam.</p>
              ) : (
                historyList.map((run) => (
                  <button
                    key={run.id}
                    onClick={() => handleLoadHistory(run)}
                    className="w-full text-left p-2.5 rounded border border-slate-900 bg-slate-950/80 hover:bg-[#121222] hover:border-slate-855 transition-all flex flex-col space-y-1"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-300 truncate max-w-[130px]">{run.run_name}</span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Avg Trust: <strong className="text-cyan-400">{(run.trust_level * 100).toFixed(1)}%</strong></span>
                      <span>
                        {run.details?.inputs?.autopilot ? (
                          <strong className="text-cyan-400 uppercase text-[8px] border border-cyan-500/20 px-1 rounded bg-cyan-950/30">Autopilot</strong>
                        ) : (
                          `Transp: ${Math.round((run.transparency || 0) * 100)}%`
                        )}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950/60 p-4 text-center text-xs text-slate-500">
        <p>GMAE Protocol Controller Dashboard. Terinspirasi oleh model ekuilibrium dinamis "Algorithmic Trust and the Future of Money" oleh Arva Athallah Susanto.</p>
      </footer>

    </div>
  );
}
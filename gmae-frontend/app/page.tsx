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
    oil_price?: number;
    gold_price?: number;
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
      autopilot: false,
      oil_price: 75,
      gold_price: 2300
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
  const [runName, setRunName] = useState('Kebijakan Stabilisasi Dinamis');
  const [m1, setM1] = useState(1000);
  const [m2, setM2] = useState(3000);
  const [m3, setM3] = useState(8000);
  const [transparency, setTransparency] = useState(0.7);
  const [leakage, setLeakage] = useState(0.2);
  const [moralAlignment, setMoralAlignment] = useState(0.8);
  const [shockSeverity, setShockSeverity] = useState(0.1);
  const [autopilot, setAutopilot] = useState(false); // Mode Autopilot GMAE

  // Commodity Feeds (Oil and Gold prices)
  const [oilPrice, setOilPrice] = useState(75); // Range: 40 - 180 USD/barrel
  const [goldPrice, setGoldPrice] = useState(2300); // Range: 1500 - 3500 USD/oz

  // Navigation: governor, ledger, reserves
  const [activeTab, setActiveTab] = useState<'governor' | 'ledger' | 'reserves'>('governor');

  // Simulation Results State
  const [simData, setSimData] = useState<SimulationDetails>(generateDefaultMockData());
  const [loading, setLoading] = useState(false);
  const [historyList, setHistoryList] = useState<HistoryRun[]>([]);
  const [dbStatus, setDbStatus] = useState<string | null>(null);
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null);

  // Load history from DB
  const fetchHistory = async () => {
    try {
      const data = await getHistoryData();
      if (Array.isArray(data)) {
        setHistoryList(data);
        setDbStatus('Connected (Neon AWS Cloud)');
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
      setDbStatus('Local Sandbox Mode');
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
        autopilot,
        oil_price: oilPrice,
        gold_price: goldPrice
      };
      const response = await sendSimulationData(payload);
      if (response && response.success) {
        if (response.data.details) {
          setSimData(response.data.details);
        } else {
          setSimData(response.data);
        }
        await fetchHistory();
        setActiveTab('governor');
      }
    } catch (error) {
      alert('Gagal terhubung ke database cloud! Menggunakan simulasi lokal.');
      const localSim = generateDefaultMockData();
      setSimData(localSim);
      setActiveTab('governor');
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
    setOilPrice(run.details.inputs.oil_price || 75);
    setGoldPrice(run.details.inputs.gold_price || 2300);
    setActiveTab('governor');
  };

  const currentSummary = simData.summary;
  const currentHistory = simData.history;
  const latestStep = currentHistory[currentHistory.length - 1];

  // Helper untuk menentukan status stabilitas
  const getStabilityStatus = (trust: number, inflation: number) => {
    if (trust > 0.6 && inflation < 5.0) return { label: 'High-Trust Stable', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' };
    if (trust > 0.3 && inflation < 12.0) return { label: 'Moderate Volatility', color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' };
    return { label: 'Systemic Trust Collapse', color: 'text-rose-405 border-rose-500/20 bg-rose-500/5' };
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

  // Generate deterministic sealed hash representation for blockchain integration
  const getBlockSealedHash = (id: number, oil: number, gold: number, trust: number) => {
    const payload = `${id}-${oil}-${gold}-${trust}`;
    return `0x${Buffer.from(payload).toString('hex').slice(0, 16)}...${Buffer.from(payload).toString('hex').slice(-8)}`;
  };

  return (
    <div className="flex flex-col h-screen bg-[#020503] text-emerald-50 font-sans antialiased overflow-hidden">
      
      {/* ORACLE GLOW DECORATIONS */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-emerald-500/5 rounded-full filter blur-[150px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-teal-500/5 rounded-full filter blur-[120px] pointer-events-none -z-10"></div>

      {/* ULTRA-CLEAN GLASSMORPHIC TOP NAVIGATION */}
      <header className="h-20 border-b border-emerald-950/60 bg-[#040c06]/50 backdrop-blur-xl flex items-center justify-between px-6 md:px-12 z-30">
        <div className="flex items-center space-x-3.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-[#020503] text-xl tracking-wider shadow-lg shadow-emerald-500/35">
            Ω
          </div>
          <div>
            <h1 className="text-base font-black tracking-widest text-emerald-300 uppercase leading-none">GMAE Protocol</h1>
            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mt-1 block">Commodity-Backed Ledger</span>
          </div>
        </div>

        {/* HORIZONTAL MENU TABS (Top-level clean) */}
        <nav className="hidden md:flex bg-[#030904]/80 border border-emerald-950/80 rounded-2xl p-1.5 space-x-1">
          <button
            onClick={() => setActiveTab('governor')}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'governor' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.06)]' : 'text-emerald-600 hover:text-emerald-300'}`}
          >
            Monetary Governor
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'ledger' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.06)]' : 'text-emerald-600 hover:text-emerald-300'}`}
          >
            Blockchain Ledger Explorer
          </button>
          <button
            onClick={() => setActiveTab('reserves')}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'reserves' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.06)]' : 'text-emerald-600 hover:text-emerald-300'}`}
          >
            Sovereign Nodes
          </button>
        </nav>

        {/* DB HEALTH BADGE & PROFILE */}
        <div className="flex items-center space-x-6">
          <div className="hidden lg:flex items-center space-x-2 bg-emerald-950/20 border border-emerald-950 px-3.5 py-1.5 rounded-xl text-[10px] font-mono">
            <span className={`h-2 w-2 rounded-full ${dbStatus?.includes('Connected') ? 'bg-emerald-400 animate-pulse shadow-md shadow-emerald-400' : 'bg-amber-400 shadow-md shadow-amber-400'}`}></span>
            <span className="text-emerald-400 font-bold">{dbStatus || 'Checking...'}</span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-emerald-400 hidden sm:inline-block">Central Oracle</span>
            <div className="h-9 w-9 bg-emerald-900/40 border border-emerald-500/20 rounded-xl flex items-center justify-center font-black text-emerald-300 text-xs shadow-inner">
              CO
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE BAR MENU (Hanya muncul di HP / layar kecil) */}
      <div className="md:hidden flex border-b border-emerald-950 bg-[#040c06]/80 backdrop-blur-md sticky top-0 z-30">
        <button 
          onClick={() => setActiveTab('governor')}
          className={`flex-1 py-3.5 text-[10px] font-bold tracking-wider uppercase border-b-2 text-center transition-all ${activeTab === 'governor' ? 'border-emerald-500 text-emerald-300 bg-emerald-950/5' : 'border-transparent text-emerald-600'}`}
        >
          Governor
        </button>
        <button 
          onClick={() => setActiveTab('ledger')}
          className={`flex-1 py-3.5 text-[10px] font-bold tracking-wider uppercase border-b-2 text-center transition-all ${activeTab === 'ledger' ? 'border-emerald-500 text-emerald-300 bg-emerald-950/5' : 'border-transparent text-emerald-600'}`}
        >
          Ledger Explore
        </button>
        <button 
          onClick={() => setActiveTab('reserves')}
          className={`flex-1 py-3.5 text-[10px] font-bold tracking-wider uppercase border-b-2 text-center transition-all ${activeTab === 'reserves' ? 'border-emerald-500 text-emerald-300 bg-emerald-950/5' : 'border-transparent text-emerald-600'}`}
        >
          Nodes
        </button>
      </div>

      {/* LIVE ORACLE REAL-TIME COMMODITY FEED TICKER */}
      <section className="bg-emerald-950/15 border-b border-emerald-950/50 py-2.5 px-6 md:px-12 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center space-x-6 overflow-x-auto whitespace-nowrap scrollbar-none w-full justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase font-bold text-emerald-500">Oracle Status:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-900/30">ONLINE</span>
          </div>

          <div className="flex items-center space-x-2 border-r border-emerald-950/60 pr-6">
            <span className="text-emerald-500">🛢️ Oil (WTI/Brent):</span>
            <strong className="text-emerald-300">${oilPrice.toFixed(2)}</strong>
            <span className={`text-[9px] px-1 rounded ${oilPrice > 75 ? 'bg-rose-950/40 text-rose-400 border border-rose-900/30' : 'bg-emerald-950 text-emerald-400'}`}>
              {oilPrice > 75 ? 'SHOCK INFLATION' : 'OPTIMAL'}
            </span>
          </div>

          <div className="flex items-center space-x-2 border-r border-emerald-950/60 pr-6">
            <span className="text-emerald-500">🪙 Gold Reserve:</span>
            <strong className="text-emerald-300">${goldPrice.toFixed(2)}</strong>
            <span className="text-[9px] px-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-900/30">
              +{((goldPrice - 2300) * 0.04).toFixed(2)}% Reserve Power
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-emerald-500">🔒 Ledger Height:</span>
            <strong className="text-emerald-300">#{102400 + historyList.length}</strong>
          </div>
        </div>
      </section>

      {/* SCROLLABLE CONTENT FRAME */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">

        {/* TAB 1: MONETARY GOVERNOR (Simulator + Glowing charts) */}
        {activeTab === 'governor' && (
          <div className="space-y-6">
            
            {/* METRICS FLOATING CARDS GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: GMAE Trust */}
              <div className="p-5 rounded-2xl bg-[#060e08]/70 border border-emerald-950/70 shadow-[0_4px_20px_rgba(16,185,129,0.02)] flex flex-col justify-between hover:border-emerald-900/40 transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">GMAE Trust Index</span>
                  <span className="text-[9px] font-mono text-emerald-400 border border-emerald-950 px-1.5 py-0.5 rounded">T_t</span>
                </div>
                <div className="my-2.5">
                  <h3 className="text-3xl font-black font-mono text-emerald-400 leading-none">
                    {(latestStep.trust * 100).toFixed(1)}%
                  </h3>
                  <div className={`mt-2.5 text-[9px] px-2.5 py-0.5 rounded-full border inline-block font-extrabold tracking-wider uppercase ${stability.color}`}>
                    {stability.label}
                  </div>
                </div>
              </div>

              {/* Card 2: Broad money */}
              <div className="p-5 rounded-2xl bg-[#060e08]/70 border border-emerald-950/70 shadow-[0_4px_20px_rgba(16,185,129,0.02)] flex flex-col justify-between hover:border-emerald-900/40 transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Money Supply (M3)</span>
                  <span className="text-[9px] font-mono text-emerald-400 border border-emerald-950 px-1.5 py-0.5 rounded">M3</span>
                </div>
                <div className="my-2.5">
                  <h3 className="text-3xl font-black font-mono text-emerald-300 leading-none">
                    {latestStep.m3.toLocaleString()} <span className="text-xs font-medium text-emerald-650">GMA</span>
                  </h3>
                  <p className="text-[9px] text-emerald-600 font-mono tracking-wide mt-2">
                    M1: {latestStep.m1.toLocaleString()} | M2: {latestStep.m2.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Card 3: Inflation */}
              <div className="p-5 rounded-2xl bg-[#060e08]/70 border border-emerald-950/70 shadow-[0_4px_20px_rgba(16,185,129,0.02)] flex flex-col justify-between hover:border-emerald-900/40 transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Oracle Inflation</span>
                  <span className="text-[9px] font-mono text-emerald-400 border border-emerald-950 px-1.5 py-0.5 rounded">π_t</span>
                </div>
                <div className="my-2.5">
                  <h3 className={`text-3xl font-black font-mono leading-none ${latestStep.inflation > 15 ? 'text-rose-500' : latestStep.inflation > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {latestStep.inflation.toFixed(2)}%
                  </h3>
                  <p className="text-[9px] text-emerald-600 font-mono tracking-wide mt-2">
                    Policy Anchor: <strong className="text-emerald-400">2.0%</strong>
                  </p>
                </div>
              </div>

              {/* Card 4: Policy rate */}
              <div className="p-5 rounded-2xl bg-[#060e08]/70 border border-emerald-950/70 shadow-[0_4px_20px_rgba(16,185,129,0.02)] flex flex-col justify-between hover:border-emerald-900/40 transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">AI Policy Rate</span>
                  <span className="text-[9px] font-mono text-emerald-400 border border-emerald-950 px-1.5 py-0.5 rounded">r_t</span>
                </div>
                <div className="my-2.5">
                  <h3 className="text-3xl font-black font-mono text-amber-400 leading-none">
                    {latestStep.interest_rate.toFixed(2)}%
                  </h3>
                  <p className="text-[9px] text-emerald-600 font-mono tracking-wide mt-2">
                    Mechanism: <strong className="text-emerald-400">{autopilot ? 'Otonom PID' : 'Static Feedback'}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* TWO-COLUMN LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* CONTROL BOARD PANEL (lg: col-span-4) */}
              <div className="lg:col-span-4 flex flex-col space-y-4">
                
                {/* Autopilot Status */}
                {autopilot && (
                  <div className="p-4 rounded-2xl border border-emerald-950 bg-emerald-950/10 text-xs text-emerald-350 leading-relaxed shadow-inner">
                    <h4 className="font-extrabold text-emerald-300 uppercase tracking-wider mb-1 flex items-center">
                      <span className="mr-2 h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-md shadow-emerald-400"></span>
                      Stabilizer Protocol Active
                    </h4>
                    <p className="text-[10px] text-emerald-500">
                      Standard variables locked by GMAE algorithmic consensus node to maintain system stability.
                    </p>
                  </div>
                )}

                {/* Main Control Panel */}
                <div className="p-5 rounded-2xl bg-[#060e08]/80 border border-emerald-950/80 flex flex-col space-y-5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-300 border-b border-emerald-950 pb-2">
                    Monetary Governor Inputs
                  </h3>

                  {/* Policy Name */}
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Simulation Run Name</label>
                    <input 
                      type="text"
                      value={runName}
                      onChange={(e) => setRunName(e.target.value)}
                      className="w-full bg-[#030704] border border-emerald-950 rounded-xl px-4.5 py-3 text-xs focus:outline-none focus:border-emerald-500/50 text-emerald-200 transition-colors font-semibold"
                    />
                  </div>

                  {/* COMMODITY ORACLE INPUTS (Gold & Oil) */}
                  <div className="space-y-4 pt-1 border-t border-emerald-950/60">
                    <h4 className="text-[9px] uppercase font-black text-emerald-400 tracking-wider">Commodity Oracle Prices</h4>

                    {/* Oil Price Slider */}
                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-emerald-500/80 text-[10px]">Crude Oil Price (WTI)</span>
                        <strong className="text-emerald-300">${oilPrice} / bbl</strong>
                      </div>
                      <input 
                        type="range" min="40" max="180" step="5"
                        value={oilPrice} onChange={(e) => setOilPrice(Number(e.target.value))}
                        className="w-full accent-emerald-500 bg-emerald-950/60 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-[8px] text-emerald-600 font-mono">Higher oil prices increase production cost & push baseline inflation.</span>
                    </div>

                    {/* Gold Price Slider */}
                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-emerald-500/80 text-[10px]">Gold Price (Spot)</span>
                        <strong className="text-emerald-300">${goldPrice} / oz</strong>
                      </div>
                      <input 
                        type="range" min="1500" max="3500" step="50"
                        value={goldPrice} onChange={(e) => setGoldPrice(Number(e.target.value))}
                        className="w-full accent-emerald-500 bg-emerald-950/60 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-[8px] text-emerald-600 font-mono">Higher gold prices strengthen GMAE's physical reserves, boosting trust.</span>
                    </div>
                  </div>

                  {/* MONETARY TARGETS */}
                  <div className={`space-y-4 pt-3 border-t border-emerald-950/60 transition-all duration-300 ${autopilot ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                    <h4 className="text-[9px] uppercase font-black text-emerald-400 tracking-wider">Monetary Targets</h4>

                    {/* M1 */}
                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-emerald-500/80 text-[10px]">Target M1 (Cash)</span>
                        <span className="text-emerald-300">{m1.toLocaleString()} GMA</span>
                      </div>
                      <input 
                        type="range" min="500" max="3000" step="100"
                        disabled={autopilot}
                        value={m1} onChange={(e) => setM1(Number(e.target.value))}
                        className="w-full accent-emerald-500 bg-emerald-950/60 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* M2 */}
                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-emerald-500/80 text-[10px]">Target M2 (Savings)</span>
                        <span className="text-emerald-300">{m2.toLocaleString()} GMA</span>
                      </div>
                      <input 
                        type="range" min="1500" max="8000" step="100"
                        disabled={autopilot}
                        value={m2} onChange={(e) => setM2(Number(e.target.value))}
                        className="w-full accent-emerald-500 bg-emerald-950/60 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* M3 */}
                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-emerald-500/80 text-[10px]">Target M3 (Broad Supply)</span>
                        <span className="text-emerald-300">{m3.toLocaleString()} GMA</span>
                      </div>
                      <input 
                        type="range" min="4000" max="20000" step="200"
                        disabled={autopilot}
                        value={m3} onChange={(e) => setM3(Number(e.target.value))}
                        className="w-full accent-emerald-500 bg-emerald-950/60 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* ALGORITHMIC VARIABLES */}
                  <div className={`space-y-4 pt-3 border-t border-emerald-950/60 transition-all duration-300 ${autopilot ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                    <h4 className="text-[9px] uppercase font-black text-emerald-400 tracking-wider">Consensus Variables</h4>

                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-emerald-500/80 text-[10px]">Transparency (tp)</span>
                        <span className="text-emerald-400">{Math.round(transparency * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.05"
                        disabled={autopilot}
                        value={transparency} onChange={(e) => setTransparency(Number(e.target.value))}
                        className="w-full accent-emerald-500 bg-emerald-950/60 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-emerald-500/80 text-[10px]">Leakage (lk)</span>
                        <span className="text-rose-400">{Math.round(leakage * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.05"
                        disabled={autopilot}
                        value={leakage} onChange={(e) => setLeakage(Number(e.target.value))}
                        className="w-full accent-rose-500 bg-emerald-950/60 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* AUTOPILOT PROTOCOL & SIMULATE BUTTON */}
                  <div className="pt-3 border-t border-emerald-950/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-500 uppercase">Engagement Protocol</span>
                      <button
                        onClick={() => setAutopilot(!autopilot)}
                        className={`text-[9px] font-extrabold px-3 py-1 rounded-xl transition-all cursor-pointer ${autopilot ? 'bg-emerald-500 text-emerald-950 shadow-md shadow-emerald-500/20' : 'bg-emerald-950 text-emerald-400 border border-emerald-900/35'}`}
                      >
                        {autopilot ? 'AUTOPILOT: ENGAGED' : 'MANUAL CONTROL'}
                      </button>
                    </div>

                    <button
                      onClick={handleSimulate}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-emerald-950 font-black py-4 px-4 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {loading ? 'COMMITTING LEDGER CHECKPOINT...' : 'COMMIT STATE TO LEDGER'}
                    </button>
                  </div>

                </div>
              </div>

              {/* TELEMETRY CHARTS PANEL (lg: col-span-8) */}
              <div className="lg:col-span-8 flex flex-col space-y-6">
                
                {/* Chart 1: Trust & Inflation */}
                <div className="p-5 rounded-2xl bg-[#060e08]/80 border border-emerald-950/80 flex flex-col">
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-300 border-b border-emerald-950 pb-2 flex justify-between">
                    <span>Sovereign Trust & Price Stabilization curves</span>
                    <span className="text-emerald-600 font-mono text-[9px] lowercase">Dynamic general equilibrium</span>
                  </h3>

                  <div className="relative mt-4 flex justify-center bg-[#030604] border border-emerald-950/65 rounded-xl p-2 overflow-hidden shadow-inner">
                    <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto">
                      <defs>
                        <filter id="emerald-glow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="3.5" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>

                      {/* Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                        const y = padding + ratio * (chartH - 2 * padding);
                        return (
                          <line key={idx} x1={padding} y1={y} x2={chartW - padding} y2={y} stroke="#051207" strokeDasharray="3 3" />
                        );
                      })}

                      {/* Shock Zone */}
                      <rect 
                        x={padding + (9 / 29) * (chartW - 2 * padding)} 
                        y={padding} 
                        width={(6 / 29) * (chartW - 2 * padding)} 
                        height={chartH - 2 * padding} 
                        fill="rgba(239, 68, 68, 0.02)" 
                        stroke="rgba(239, 68, 68, 0.10)"
                        strokeDasharray="2 2"
                      />

                      {/* Curves */}
                      <path
                        d={getSvgPath(trustPoints, 0, 100)}
                        fill="none" stroke="#10b981" strokeWidth="3.5" filter="url(#emerald-glow)" strokeLinecap="round" strokeLinejoin="round"
                      />
                      <path
                        d={getSvgPath(inflationPoints, -2, 50)}
                        fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 1" strokeLinecap="round" strokeLinejoin="round"
                      />
                      <path
                        d={getSvgPath(interestPoints, 0, 20)}
                        fill="none" stroke="#f59e0b" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"
                      />

                      {/* Legend */}
                      <text x={padding + 10} y={padding + 15} fill="#10b981" fontSize="9" fontFamily="monospace" fontWeight="bold">—— GMAE Trust (%)</text>
                      <text x={padding + 140} y={padding + 15} fill="#ef4444" fontSize="9" fontFamily="monospace" fontWeight="bold">- - Inflation (π)</text>
                      <text x={padding + 260} y={padding + 15} fill="#f59e0b" fontSize="9" fontFamily="monospace" fontWeight="bold">—— Policy Rate (r)</text>
                    </svg>
                  </div>
                  <p className="text-[10px] text-emerald-500/80 mt-3 text-center leading-relaxed font-semibold">
                    The stabilization curves react endogenously to your Oracle Gold prices and Oil shocks.
                  </p>
                </div>

                {/* Chart 2: Money aggregates */}
                <div className="p-5 rounded-2xl bg-[#060e08]/80 border border-emerald-950/80 flex flex-col">
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-300 border-b border-emerald-950 pb-2 flex justify-between">
                    <span>Monetary Aggregate Supply allocation (M1, M2, M3)</span>
                    <span className="text-emerald-600 font-mono text-[9px] lowercase">M3 Broad liquidity distribution</span>
                  </h3>

                  <div className="relative mt-4 flex justify-center bg-[#030604] border border-emerald-950/65 rounded-xl p-2 overflow-hidden shadow-inner">
                    <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto">
                      <defs>
                        <linearGradient id="glowM3" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.12}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="glowM2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.20}/>
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="glowM1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.28}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>

                      {/* Areas */}
                      <path d={getSvgAreaPath(m3Points, m2Points, 0, maxMonetaryVal)} fill="url(#glowM3)" stroke="none" />
                      <path d={getSvgAreaPath(m2Points, m1Points, 0, maxMonetaryVal)} fill="url(#glowM2)" stroke="none" />
                      <path d={getSvgAreaPath(m1Points, currentHistory.map(() => 0), 0, maxMonetaryVal)} fill="url(#glowM1)" stroke="none" />

                      {/* Lines */}
                      <path d={getSvgPath(m3Points, 0, maxMonetaryVal)} fill="none" stroke="#10b981" strokeWidth="1.5" />
                      <path d={getSvgPath(m2Points, 0, maxMonetaryVal)} fill="none" stroke="#0d9488" strokeWidth="1.5" />
                      <path d={getSvgPath(m1Points, 0, maxMonetaryVal)} fill="none" stroke="#06b6d4" strokeWidth="2.5" />

                      {/* Legend */}
                      <text x={padding + 10} y={padding + 15} fill="#10b981" fontSize="9" fontFamily="monospace" fontWeight="bold">■ M3 (Broad Money)</text>
                      <text x={padding + 140} y={padding + 15} fill="#0d9488" fontSize="9" fontFamily="monospace" fontWeight="bold">■ M2 (Savings)</text>
                      <text x={padding + 260} y={padding + 15} fill="#06b6d4" fontSize="9" fontFamily="monospace" fontWeight="bold">■ M1 (Cash liquidity)</text>
                    </svg>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* TAB 2: BLOCKCHAIN LEDGER EXPLORER */}
        {activeTab === 'ledger' && (
          <div className="space-y-6">
            
            {/* LEDGER INTRO CARD */}
            <div className="p-6 rounded-2xl bg-[#060e08]/80 border border-emerald-950/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-base font-bold text-emerald-300">Commodity-Backed Blockchain Explorer</h3>
                <p className="text-xs text-emerald-600 font-semibold mt-1">
                  Sealed transactions cryptographically anchoring Crude Oil, Spot Gold, and macroeconomic indexes into the atomic postgres state ledger.
                </p>
              </div>

              <div className="flex space-x-6 font-mono text-xs bg-[#020503] border border-emerald-950 p-4 rounded-2xl">
                <div>
                  <span className="text-emerald-600 block text-[8px] uppercase">Sealed Blocks</span>
                  <strong className="text-emerald-400">#{102400 + historyList.length}</strong>
                </div>
                <div>
                  <span className="text-emerald-600 block text-[8px] uppercase">State Sync</span>
                  <strong className="text-emerald-400">ACTIVE</strong>
                </div>
              </div>
            </div>

            {/* BLOCK DATA LIST */}
            <div className="rounded-2xl bg-[#060e08]/80 border border-emerald-950/80 overflow-hidden">
              <div className="p-4 border-b border-emerald-950 bg-[#040c06]/40">
                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-300">Recent Sealed State Ledger Blocks</h4>
              </div>

              <div className="divide-y divide-emerald-950/80">
                {historyList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-emerald-600">
                    No blocks verified yet. Commit a simulator policy to mine the first block.
                  </div>
                ) : (
                  historyList.map((run, idx) => {
                    const isExpanded = expandedBlock === run.id;
                    const oilVal = run.details.inputs.oil_price || 75;
                    const goldVal = run.details.inputs.gold_price || 2300;
                    const blockHeight = 102400 + historyList.length - idx;
                    const sealedHash = getBlockSealedHash(run.id, oilVal, goldVal, run.trust_level);

                    return (
                      <div key={run.id} className="p-4.5 hover:bg-[#07130b]/20 transition-all">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          
                          {/* Block Icon, Height, and Hash */}
                          <div className="flex items-center space-x-4">
                            <div className="h-10 w-10 bg-[#020503] border border-emerald-500/20 rounded-xl flex flex-col items-center justify-center font-mono">
                              <span className="text-[7px] text-emerald-600 leading-none">BLOCK</span>
                              <span className="text-xs font-black text-emerald-400">#{blockHeight}</span>
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h5 className="text-xs font-bold text-emerald-200">{run.run_name}</h5>
                                {run.details.inputs.autopilot && (
                                  <span className="text-[8px] uppercase px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-900/30 font-bold rounded">AI GOV</span>
                                )}
                              </div>
                              <span className="text-[9px] text-emerald-600 font-mono tracking-wider break-all">{sealedHash}</span>
                            </div>
                          </div>

                          {/* Oracle Sealed Values */}
                          <div className="flex flex-wrap lg:flex-nowrap items-center justify-between lg:justify-end gap-6 text-xs font-mono">
                            <div className="bg-[#020503] border border-emerald-955/30 px-3 py-1.5 rounded-xl">
                              <span className="text-emerald-600 block text-[8px] uppercase">Sealed Oil</span>
                              <strong className="text-emerald-300">${oilVal}</strong>
                            </div>
                            
                            <div className="bg-[#020503] border border-emerald-955/30 px-3 py-1.5 rounded-xl">
                              <span className="text-emerald-600 block text-[8px] uppercase">Sealed Gold</span>
                              <strong className="text-emerald-300">${goldVal}</strong>
                            </div>

                            <div>
                              <span className="text-emerald-600 block text-[8px] uppercase text-right md:text-left">Settled Trust</span>
                              <strong className="text-emerald-450">{(run.trust_level * 100).toFixed(2)}%</strong>
                            </div>

                            <div className="text-right">
                              <span className="text-emerald-650 block text-[8px] uppercase">Timestamp</span>
                              <span className="text-emerald-500/80">{new Date(run.created_at).toLocaleTimeString('id-ID')}</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleLoadHistory(run)}
                                className="px-3 py-1.5 rounded bg-emerald-950 border border-emerald-500/20 hover:bg-emerald-900/40 text-emerald-400 font-bold uppercase text-[9px] transition-all cursor-pointer"
                              >
                                Load state
                              </button>
                              <button
                                onClick={() => setExpandedBlock(isExpanded ? null : run.id)}
                                className="p-1 rounded bg-[#020503] text-emerald-500 hover:text-emerald-400 cursor-pointer"
                              >
                                <svg className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                          </div>

                        </div>

                        {/* Expandable JSON detail */}
                        {isExpanded && (
                          <div className="mt-4 p-4 rounded-xl bg-[#020503] border border-emerald-950 font-mono text-[9px] text-emerald-400/90 space-y-2">
                            <div className="flex justify-between border-b border-emerald-950/60 pb-1 text-emerald-600">
                              <span>Consensus Status: SECURELY_COMMITTED</span>
                              <span>Block Weight: 21,492 Gas</span>
                            </div>
                            <div className="overflow-x-auto whitespace-pre max-h-64 scrollbar-none">
                              {JSON.stringify(run.details, null, 2)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: SOVEREIGN NODES STATUS */}
        {activeTab === 'reserves' && (
          <div className="space-y-6">
            
            <div className="p-5 rounded-2xl bg-[#060e08]/80 border border-emerald-950/80">
              <h3 className="text-sm font-black uppercase tracking-widest text-emerald-300 mb-2">Central Bank API Network Bridge Telemetry</h3>
              <p className="text-xs text-emerald-600 font-semibold leading-relaxed">
                Autonomous ledger nodes dynamically syncing liquidity targets, foreign reserves, and domestic interest rates into the GMAE algorithmic stabilization matrix.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* FED Node */}
              <div className="p-5 rounded-2xl bg-[#060e08]/80 border border-emerald-950/80 flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-200">FED Node Bridge (USD)</h4>
                    <p className="text-[9px] text-emerald-600 font-mono">fed.node.gmae.net</p>
                  </div>
                  <span className="flex items-center space-x-1.5 text-[9px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/25 font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>CONNECTED // 12ms</span>
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center bg-[#020503] border border-emerald-955/40 p-2.5 rounded-xl">
                  <div>
                    <span className="text-[8px] text-emerald-650 block">Interest Rate</span>
                    <strong className="text-emerald-300">5.25%</strong>
                  </div>
                  <div>
                    <span className="text-[8px] text-emerald-650 block">Peg Ratio</span>
                    <strong className="text-emerald-300">1.00 USD</strong>
                  </div>
                  <div>
                    <span className="text-[8px] text-emerald-650 block">M3 Supply</span>
                    <strong className="text-emerald-400">$21.0T</strong>
                  </div>
                </div>
              </div>

              {/* ECB Node */}
              <div className="p-5 rounded-2xl bg-[#060e08]/80 border border-emerald-950/80 flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-200">ECB Node Bridge (EUR)</h4>
                    <p className="text-[9px] text-emerald-600 font-mono">ecb.node.gmae.net</p>
                  </div>
                  <span className="flex items-center space-x-1.5 text-[9px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/25 font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>CONNECTED // 34ms</span>
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center bg-[#020503] border border-emerald-955/40 p-2.5 rounded-xl">
                  <div>
                    <span className="text-[8px] text-emerald-650 block">Interest Rate</span>
                    <strong className="text-emerald-300">4.00%</strong>
                  </div>
                  <div>
                    <span className="text-[8px] text-emerald-650 block">Peg Ratio</span>
                    <strong className="text-emerald-300">0.92 EUR</strong>
                  </div>
                  <div>
                    <span className="text-[8px] text-emerald-650 block">M3 Supply</span>
                    <strong className="text-emerald-400">€15.2T</strong>
                  </div>
                </div>
              </div>

              {/* Bank of Canada Node */}
              <div className="p-5 rounded-2xl bg-[#060e08]/80 border border-emerald-950/80 flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-200">Bank of Canada (CAD)</h4>
                    <p className="text-[9px] text-emerald-600 font-mono">boc.node.gmae.net</p>
                  </div>
                  <span className="flex items-center space-x-1.5 text-[9px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/25 font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>CONNECTED // 42ms</span>
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center bg-[#020503] border border-emerald-955/40 p-2.5 rounded-xl">
                  <div>
                    <span className="text-[8px] text-emerald-650 block">Interest Rate</span>
                    <strong className="text-emerald-300">4.75%</strong>
                  </div>
                  <div>
                    <span className="text-[8px] text-emerald-650 block">Peg Ratio</span>
                    <strong className="text-emerald-300">1.35 CAD</strong>
                  </div>
                  <div>
                    <span className="text-[8px] text-emerald-650 block">M3 Supply</span>
                    <strong className="text-emerald-400">$2.8T</strong>
                  </div>
                </div>
              </div>

              {/* Bank Indonesia Node */}
              <div className="p-5 rounded-2xl bg-[#060e08]/80 border border-emerald-950/80 flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-200">Bank Indonesia Node (IDR)</h4>
                    <p className="text-[9px] text-emerald-600 font-mono">bi.node.gmae.net</p>
                  </div>
                  <span className="flex items-center space-x-1.5 text-[9px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/25 font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>CONNECTED // 8ms</span>
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center bg-[#020503] border border-emerald-955/40 p-2.5 rounded-xl">
                  <div>
                    <span className="text-[8px] text-emerald-650 block">Interest Rate</span>
                    <strong className="text-emerald-300">6.25%</strong>
                  </div>
                  <div>
                    <span className="text-[8px] text-emerald-650 block">Peg Ratio</span>
                    <strong className="text-emerald-300">16,350 IDR</strong>
                  </div>
                  <div>
                    <span className="text-[8px] text-emerald-650 block">M3 Supply</span>
                    <strong className="text-emerald-400">Rp 8.900T</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* QUICK ACTIONS BOARD */}
            <div className="p-5 rounded-2xl bg-[#060e08]/80 border border-emerald-950/80">
              <h4 className="text-xs font-black uppercase tracking-widest text-emerald-300 mb-3">Reserve Bridge Controls</h4>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setOilPrice(150);
                    setActiveTab('governor');
                    alert('Oracle Oil Price set to $150 / bbl (Systemic Inflation Shock). Run a simulation state to commit this ledger block.');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-950/20 border border-rose-500/20 text-rose-400 font-bold uppercase text-[10px] hover:bg-[#1a0808]/40 transition-all cursor-pointer animate-pulse"
                >
                  Simulate Oil Price Shock ($150 / barrel)
                </button>
                <button
                  onClick={() => {
                    setGoldPrice(3200);
                    setActiveTab('governor');
                    alert('Oracle Gold Price set to $3,200 / oz (Reserve Safe-Haven Influx). Run a simulation state to commit this ledger block.');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/25 text-emerald-300 font-bold uppercase text-[10px] hover:bg-emerald-950/50 transition-all cursor-pointer"
                >
                  Boost Gold Reserve Backing ($3,200 / oz)
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ULTRA-CLEAN SLIM FOOTER */}
      <footer className="border-t border-emerald-950/60 bg-[#030804] py-3 text-center text-[9px] text-emerald-600 font-mono tracking-widest uppercase">
        GMAE Autonomous Sovereign Ledger Core // database peg integration active // neon cloud node sync
      </footer>

    </div>
  );
}
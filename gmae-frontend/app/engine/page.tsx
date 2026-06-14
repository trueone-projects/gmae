'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { sendSimulationData, getHistoryData } from '../../lib/api';

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

interface JacobianAnalysis {
  matrix: {
    j11: number;
    j12: number;
    j21: number;
    j22: number;
  };
  trace: number;
  determinant: number;
  eigenvalues: {
    real: number;
    imag: number;
    magnitude: number;
  }[];
  stable: boolean;
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
  jacobian?: JacobianAnalysis;
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
    },
    jacobian: {
      matrix: { j11: 0.8, j12: -0.05, j21: -10.5, j22: 0.15 },
      trace: 0.95,
      determinant: -0.405,
      eigenvalues: [
        { real: 0.475, imag: 0.457, magnitude: 0.659 },
        { real: 0.475, imag: -0.457, magnitude: 0.659 }
      ],
      stable: true
    }
  };
};

export default function CentralBankDashboard() {
  // Input States
  const [runName, setRunName] = useState('Kebijakan Moneter Seimbang');
  const [m1, setM1] = useState(1000);
  const [m2, setM2] = useState(3000);
  const [m3, setM3] = useState(8000);
  const [transparency, setTransparency] = useState(0.7);
  const [leakage, setLeakage] = useState(0.2);
  const [moralAlignment, setMoralAlignment] = useState(0.8);
  const [shockSeverity, setShockSeverity] = useState(0.1);
  const [autopilot, setAutopilot] = useState(false);

  // Commodity Feeds (Oil and Gold prices)
  const [oilPrice, setOilPrice] = useState(75);
  const [goldPrice, setGoldPrice] = useState(2300);

  // Navigation tabs: governor, ledger, reserves
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
        setDbStatus('CONNECTED');
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
      setDbStatus('SANDBOX');
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
      alert('Gagal terhubung ke cloud DB! Menggunakan database simulasi lokal.');
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

  // Preset Scenario Loader
  const loadScenarioPreset = (scenarioNum: number) => {
    if (scenarioNum === 1) {
      setRunName('Skenario 1: Transparansi Tinggi');
      setM1(1000); setM2(3000); setM3(8000);
      setTransparency(0.9); setLeakage(0.05); setMoralAlignment(0.9);
      setShockSeverity(0.05); setOilPrice(70); setGoldPrice(2400);
      setAutopilot(false);
    } else if (scenarioNum === 2) {
      setRunName('Skenario 2: Kebocoran & Opasitas');
      setM1(1500); setM2(3500); setM3(9000);
      setTransparency(0.3); setLeakage(0.7); setMoralAlignment(0.4);
      setShockSeverity(0.2); setOilPrice(95); setGoldPrice(2000);
      setAutopilot(false);
    } else if (scenarioNum === 3) {
      setRunName('Skenario 3: Instabilitas Teknokrasi');
      setM1(1200); setM2(3200); setM3(8500);
      setTransparency(0.6); setLeakage(0.4); setMoralAlignment(0.8);
      setShockSeverity(0.5); setOilPrice(120); setGoldPrice(2200);
      setAutopilot(false);
    } else if (scenarioNum === 4) {
      setRunName('Skenario 4: Kolaps Moral-Algoritmik');
      setM1(1800); setM2(4000); setM3(10000);
      setTransparency(0.1); setLeakage(0.8); setMoralAlignment(0.1);
      setShockSeverity(0.6); setOilPrice(140); setGoldPrice(1700);
      setAutopilot(false);
    } else if (scenarioNum === 5) {
      setRunName('Skenario 5: Stabilisasi Otonom');
      setM1(1000); setM2(3000); setM3(8000);
      setTransparency(0.95); setLeakage(0.02); setMoralAlignment(0.95);
      setShockSeverity(0.35); setOilPrice(110); setGoldPrice(2350);
      setAutopilot(true);
    }
  };

  const currentSummary = simData.summary;
  const currentHistory = simData.history;
  const latestStep = currentHistory[currentHistory.length - 1];

  // Helper stabilitas
  const getStabilityStatus = (trust: number, inflation: number) => {
    if (trust > 0.6 && inflation < 5.0) return { label: 'Optimal Stability', color: 'text-[#008082] bg-[#e1f3f3]/60 border-[#008082]/20' };
    if (trust > 0.3 && inflation < 12.0) return { label: 'Moderate Volatility', color: 'text-amber-700 bg-amber-55/60 border-amber-200/50' };
    return { label: 'Sovereign Strain', color: 'text-rose-700 bg-rose-55/60 border-rose-200/50' };
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

  // Area Chart Helper
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

  const trustPoints = currentHistory.map(h => h.trust * 100);
  const inflationPoints = currentHistory.map(h => h.inflation);
  const interestPoints = currentHistory.map(h => h.interest_rate);

  const m1Points = currentHistory.map(h => h.m1);
  const m2Points = currentHistory.map(h => h.m2);
  const m3Points = currentHistory.map(h => h.m3);
  const maxMonetaryVal = Math.max(...m3Points) * 1.1;

  const getBlockSealedHash = (id: number, oil: number, gold: number, trust: number) => {
    const payload = `${id}-${oil}-${gold}-${trust}`;
    return `0x${Buffer.from(payload).toString('hex').slice(0, 16).toUpperCase()}...${Buffer.from(payload).toString('hex').slice(-8).toUpperCase()}`;
  };

  return (
    <div className="flex flex-col h-screen bg-[#fbfbf9] text-[#023547] font-sans antialiased overflow-hidden">
      
      {/* HEADER UTAMA: ARVA AI MINIMALIST LOOK */}
      <header className="h-20 border-b border-[#e1e2da] bg-white flex items-center justify-between px-8 md:px-16 z-30">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3.5">
            <div className="h-9 w-9 rounded-lg bg-[#023547] flex items-center justify-center font-bold text-white text-base">
              Ω
            </div>
            <div>
              <h1 className="text-sm font-black tracking-widest text-[#023547] uppercase leading-none">GMAE</h1>
              <span className="text-[9px] text-[#536877] font-bold uppercase tracking-widest mt-1 block">Sovereign Ledger</span>
            </div>
          </div>
          <Link href="/" className="text-[10px] uppercase font-bold text-[#536877] hover:text-[#023547] border border-[#e1e2da] px-3.5 py-2 rounded-xl bg-[#f4f4f0]/40 transition-colors">
            ← Kembali ke Beranda
          </Link>
        </div>

        {/* HORIZONTAL TAB MENU */}
        <nav className="hidden md:flex bg-[#f4f4f0] border border-[#e1e2da] rounded-xl p-1 space-x-1">
          <button
            onClick={() => setActiveTab('governor')}
            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'governor' ? 'bg-[#023547] text-white' : 'text-[#536877] hover:text-[#023547]'}`}
          >
            Governor
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'ledger' ? 'bg-[#023547] text-white' : 'text-[#536877] hover:text-[#023547]'}`}
          >
            Ledger Explorer
          </button>
          <button
            onClick={() => setActiveTab('reserves')}
            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'reserves' ? 'bg-[#023547] text-white' : 'text-[#536877] hover:text-[#023547]'}`}
          >
            Nodes
          </button>
        </nav>

        {/* DB SYSTEM HEALTH */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 bg-[#f4f4f0] border border-[#e1e2da] px-3.5 py-1.5 rounded-xl text-[9px] font-mono font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-[#008082]"></span>
            <span className="text-[#023547]">{dbStatus || 'OFFLINE'}</span>
          </div>
        </div>
      </header>

      {/* MOBILE BAR MENU */}
      <div className="md:hidden flex border-b border-[#e1e2da] bg-white sticky top-0 z-30">
        <button 
          onClick={() => setActiveTab('governor')}
          className={`flex-1 py-3 text-[10px] font-bold tracking-widest uppercase text-center transition-all ${activeTab === 'governor' ? 'text-[#023547] border-b-2 border-[#023547] font-black' : 'text-[#536877]'}`}
        >
          Governor
        </button>
        <button 
          onClick={() => setActiveTab('ledger')}
          className={`flex-1 py-3 text-[10px] font-bold tracking-widest uppercase text-center transition-all ${activeTab === 'ledger' ? 'text-[#023547] border-b-2 border-[#023547] font-black' : 'text-[#536877]'}`}
        >
          Ledger
        </button>
        <button 
          onClick={() => setActiveTab('reserves')}
          className={`flex-1 py-3 text-[10px] font-bold tracking-widest uppercase text-center transition-all ${activeTab === 'reserves' ? 'text-[#023547] border-b-2 border-[#023547] font-black' : 'text-[#536877]'}`}
        >
          Nodes
        </button>
      </div>

      {/* ORACLE LIVE COMMODITY FEED BAR */}
      <section className="bg-[#f4f4f0]/60 border-b border-[#e1e2da] py-2 px-8 md:px-16 flex flex-wrap items-center justify-between gap-4 text-[11px] font-mono font-medium text-[#536877]">
        <div className="flex items-center space-x-8 overflow-x-auto whitespace-nowrap scrollbar-none w-full justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="text-[9px] uppercase font-bold text-[#023547]">Oracle Feed:</span>
            <span className="px-2 py-0.2 rounded bg-[#023547]/10 text-[#023547] text-[9px] font-extrabold">LIVE</span>
          </div>

          <div className="flex items-center space-x-2 border-r border-[#e1e2da] pr-8">
            <span>🛢️ Oil WTI:</span>
            <strong className="text-[#023547]">${oilPrice.toFixed(2)} / bbl</strong>
            {oilPrice > 75 && (
              <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-250/20">shock</span>
            )}
          </div>

          <div className="flex items-center space-x-2 border-r border-[#e1e2da] pr-8">
            <span>🪙 Gold Spot:</span>
            <strong className="text-[#023547]">${goldPrice.toFixed(2)} / oz</strong>
          </div>

          <div className="flex items-center space-x-2">
            <span>🔒 Ledger Sync:</span>
            <strong className="text-[#023547]">Block #{102400 + historyList.length}</strong>
          </div>
        </div>
      </section>

      {/* SCROLLABLE MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">

        {/* TAB 1: MONETARY GOVERNOR */}
        {activeTab === 'governor' && (
          <div className="space-y-6">

            {/* PRESET SCENARIO MANAGER */}
            <div className="p-6 rounded-2xl bg-white border border-[#e1e2da] space-y-3.5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#e1e2da]/60 pb-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#023547]">
                  Theoretical GMAE Scenario Presets (GMAE Paper Sec. V)
                </h4>
                <span className="text-[9px] text-[#536877] font-bold tracking-wider">Quick parameter config</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                <button
                  onClick={() => loadScenarioPreset(1)}
                  className="px-3.5 py-2.5 rounded-xl border border-[#e1e2da] bg-[#f4f4f0]/30 hover:bg-[#023547]/5 text-[10px] text-[#023547] font-bold tracking-wide transition-all text-left flex flex-col justify-between h-18 cursor-pointer"
                >
                  <span className="text-[8px] text-[#536877] uppercase block">Scenario 1</span>
                  <span>High-Transparency</span>
                </button>
                <button
                  onClick={() => loadScenarioPreset(2)}
                  className="px-3.5 py-2.5 rounded-xl border border-[#e1e2da] bg-[#f4f4f0]/30 hover:bg-[#023547]/5 text-[10px] text-[#023547] font-bold tracking-wide transition-all text-left flex flex-col justify-between h-18 cursor-pointer"
                >
                  <span className="text-[8px] text-[#536877] uppercase block">Scenario 2</span>
                  <span>Leakage & Opacity</span>
                </button>
                <button
                  onClick={() => loadScenarioPreset(3)}
                  className="px-3.5 py-2.5 rounded-xl border border-[#e1e2da] bg-[#f4f4f0]/30 hover:bg-[#023547]/5 text-[10px] text-[#023547] font-bold tracking-wide transition-all text-left flex flex-col justify-between h-18 cursor-pointer"
                >
                  <span className="text-[8px] text-[#536877] uppercase block">Scenario 3</span>
                  <span>Technocratic Stress</span>
                </button>
                <button
                  onClick={() => loadScenarioPreset(4)}
                  className="px-3.5 py-2.5 rounded-xl border border-[#e1e2da] bg-[#f4f4f0]/30 hover:bg-[#023547]/5 text-[10px] text-[#023547] font-bold tracking-wide transition-all text-left flex flex-col justify-between h-18 cursor-pointer"
                >
                  <span className="text-[8px] text-[#536877] uppercase block">Scenario 4</span>
                  <span>Sovereign Collapse</span>
                </button>
                <button
                  onClick={() => loadScenarioPreset(5)}
                  className="px-3.5 py-2.5 rounded-xl border border-[#e1e2da] bg-[#f4f4f0]/30 hover:bg-[#023547]/5 text-[10px] text-[#023547] font-bold tracking-wide transition-all text-left flex flex-col justify-between h-18 cursor-pointer"
                >
                  <span className="text-[8px] text-[#536877] uppercase block">Scenario 5</span>
                  <span>Autonomous AI Peg</span>
                </button>
              </div>
            </div>
            
            {/* CLEAN FLOATING METRIC CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: GMAE Trust */}
              <div className="p-6 rounded-2xl bg-white border border-[#e1e2da] flex flex-col justify-between hover:border-[#023547]/20 transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-[#536877] uppercase tracking-widest">GMAE Trust</span>
                  <span className="text-[9px] font-mono text-[#023547]">T_t</span>
                </div>
                <div className="my-2.5">
                  <h3 className="text-3xl font-black font-mono text-[#023547] leading-none">
                    {(latestStep.trust * 100).toFixed(1)}%
                  </h3>
                  <div className={`mt-3 text-[9px] px-2.5 py-0.5 rounded border inline-block font-bold tracking-wider uppercase ${stability.color}`}>
                    {stability.label}
                  </div>
                </div>
              </div>

              {/* Card 2: Money Supply M3 */}
              <div className="p-6 rounded-2xl bg-white border border-[#e1e2da] flex flex-col justify-between hover:border-[#023547]/20 transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-[#536877] uppercase tracking-widest">Money Supply (M3)</span>
                  <span className="text-[9px] font-mono text-[#023547]">M3</span>
                </div>
                <div className="my-2.5">
                  <h3 className="text-3xl font-black font-mono text-[#023547] leading-none">
                    {latestStep.m3.toLocaleString()} <span className="text-xs font-semibold text-[#536877]">GMA</span>
                  </h3>
                  <p className="text-[9px] text-[#536877] font-mono tracking-wide mt-2">
                    M1: {latestStep.m1.toLocaleString()} | M2: {latestStep.m2.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Card 3: Inflation */}
              <div className="p-6 rounded-2xl bg-white border border-[#e1e2da] flex flex-col justify-between hover:border-[#023547]/20 transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-[#536877] uppercase tracking-widest">Inflation Rate</span>
                  <span className="text-[9px] font-mono text-[#023547]">π_t</span>
                </div>
                <div className="my-2.5">
                  <h3 className={`text-3xl font-black font-mono leading-none ${latestStep.inflation > 15 ? 'text-rose-600' : latestStep.inflation > 5 ? 'text-amber-600' : 'text-[#008082]'}`}>
                    {latestStep.inflation.toFixed(2)}%
                  </h3>
                  <p className="text-[9px] text-[#536877] font-mono tracking-wide mt-2">
                    Anchor Target: <strong className="text-[#023547]">2.0%</strong>
                  </p>
                </div>
              </div>

              {/* Card 4: Policy rate */}
              <div className="p-6 rounded-2xl bg-white border border-[#e1e2da] flex flex-col justify-between hover:border-[#023547]/20 transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-[#536877] uppercase tracking-widest">Policy Rate</span>
                  <span className="text-[9px] font-mono text-[#023547]">r_t</span>
                </div>
                <div className="my-2.5">
                  <h3 className="text-3xl font-black font-mono text-[#023547] leading-none">
                    {latestStep.interest_rate.toFixed(2)}%
                  </h3>
                  <p className="text-[9px] text-[#536877] font-mono tracking-wide mt-2">
                    Mode: <strong className="text-[#023547]">{autopilot ? 'PID Otonom' : 'Static Feedback'}</strong>
                  </p>
                </div>
              </div>

            </div>

            {/* TWO-COLUMN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* GOVERNOR CONTROL PANEL */}
              <div className="lg:col-span-4 flex flex-col space-y-4">
                
                {/* Autopilot Status */}
                {autopilot && (
                  <div className="p-4 rounded-xl border border-[#e1e2da] bg-[#f4f4f0]/60 text-xs text-[#023547] font-semibold leading-relaxed">
                    <div className="flex items-center space-x-2 text-[#008082]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#008082]"></span>
                      <span className="uppercase tracking-wider text-[10px] font-black">Algorithmic Stabilizer Active</span>
                    </div>
                    <p className="text-[10px] text-[#536877] mt-1 font-medium">
                      Consensus protocol has locked simulation parameters for optimal macro equilibrium.
                    </p>
                  </div>
                )}

                {/* Controls Form Card */}
                <div className="p-6 rounded-2xl bg-white border border-[#e1e2da] flex flex-col space-y-5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#023547] border-b border-[#e1e2da] pb-2">
                    Policy Directives
                  </h3>

                  {/* Run Name */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-[#536877]">Simulation Identifier</label>
                    <input 
                      type="text"
                      value={runName}
                      onChange={(e) => setRunName(e.target.value)}
                      className="w-full bg-[#f4f4f0]/40 border border-[#e1e2da] rounded-xl px-4 py-2.5 text-xs text-[#023547] focus:outline-none focus:border-[#023547]/50 font-semibold"
                    />
                  </div>

                  {/* Oracle sliders */}
                  <div className="space-y-4 pt-1 border-t border-[#e1e2da]/60">
                    <h4 className="text-[9px] uppercase font-black text-[#023547] tracking-wider">Oracle Price Telemetry</h4>

                    {/* Oil */}
                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-[#536877] text-[10px]">World Crude Oil</span>
                        <strong className="text-[#023547]">${oilPrice} / bbl</strong>
                      </div>
                      <input 
                        type="range" min="40" max="180" step="5"
                        value={oilPrice} onChange={(e) => setOilPrice(Number(e.target.value))}
                        className="w-full accent-[#023547] bg-[#e1e2da] h-1 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Gold */}
                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-[#536877] text-[10px]">Gold Spot Reserve</span>
                        <strong className="text-[#023547]">${goldPrice} / oz</strong>
                      </div>
                      <input 
                        type="range" min="1500" max="3500" step="50"
                        value={goldPrice} onChange={(e) => setGoldPrice(Number(e.target.value))}
                        className="w-full accent-[#023547] bg-[#e1e2da] h-1 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Sliders targets */}
                  <div className={`space-y-4 pt-3 border-t border-[#e1e2da]/60 transition-all duration-300 ${autopilot ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                    <h4 className="text-[9px] uppercase font-black text-[#023547] tracking-wider">Monetary Aggregates</h4>

                    {/* M1 */}
                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-[#536877] text-[10px]">Liquid Cash (M1)</span>
                        <span className="text-[#023547]">{m1.toLocaleString()} GMA</span>
                      </div>
                      <input 
                        type="range" min="500" max="3000" step="100"
                        disabled={autopilot}
                        value={m1} onChange={(e) => setM1(Number(e.target.value))}
                        className="w-full accent-[#023547] bg-[#e1e2da] h-1 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* M2 */}
                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-[#536877] text-[10px]">Savings Supply (M2)</span>
                        <span className="text-[#023547]">{m2.toLocaleString()} GMA</span>
                      </div>
                      <input 
                        type="range" min="1500" max="8000" step="100"
                        disabled={autopilot}
                        value={m2} onChange={(e) => setM2(Number(e.target.value))}
                        className="w-full accent-[#023547] bg-[#e1e2da] h-1 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* M3 */}
                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-[#536877] text-[10px]">Broad Money (M3)</span>
                        <span className="text-[#023547]">{m3.toLocaleString()} GMA</span>
                      </div>
                      <input 
                        type="range" min="4000" max="20000" step="200"
                        disabled={autopilot}
                        value={m3} onChange={(e) => setM3(Number(e.target.value))}
                        className="w-full accent-[#023547] bg-[#e1e2da] h-1 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Variables */}
                  <div className={`space-y-4 pt-3 border-t border-[#e1e2da]/60 transition-all duration-300 ${autopilot ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                    <h4 className="text-[9px] uppercase font-black text-[#023547] tracking-wider">Consensus Ratios</h4>

                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-[#536877] text-[10px]">Transparency (tp)</span>
                        <span className="text-[#023547]">{Math.round(transparency * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.05"
                        disabled={autopilot}
                        value={transparency} onChange={(e) => setTransparency(Number(e.target.value))}
                        className="w-full accent-[#023547] bg-[#e1e2da] h-1 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-[#536877] text-[10px]">Leakage (lk)</span>
                        <span className="text-rose-600">{Math.round(leakage * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.05"
                        disabled={autopilot}
                        value={leakage} onChange={(e) => setLeakage(Number(e.target.value))}
                        className="w-full accent-rose-600 bg-[#e1e2da] h-1 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-[#536877] text-[10px]">Moral Alignment (α)</span>
                        <span className="text-[#023547]">{Math.round(moralAlignment * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.05"
                        disabled={autopilot}
                        value={moralAlignment} onChange={(e) => setMoralAlignment(Number(e.target.value))}
                        className="w-full accent-[#023547] bg-[#e1e2da] h-1 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="pt-3 border-t border-[#e1e2da]/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-[#536877] uppercase">AI governor status</span>
                      <button
                        onClick={() => setAutopilot(!autopilot)}
                        className={`text-[9px] font-black px-3.5 py-1 rounded-xl transition-all cursor-pointer ${autopilot ? 'bg-[#008082] text-white' : 'bg-[#f4f4f0] text-[#023547] border border-[#e1e2da]'}`}
                      >
                        {autopilot ? 'AUTOPILOT ENGAGED' : 'MANUAL'}
                      </button>
                    </div>

                    <button
                      onClick={handleSimulate}
                      disabled={loading}
                      className="w-full bg-[#023547] hover:bg-[#064e65] text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {loading ? 'RUNNING EQUILIBRIUM SIM...' : 'COMMIT STATE TO LEDGER'}
                    </button>
                  </div>

                </div>
              </div>

              {/* TELEMETRY CHARTS & JACOBIAN STABILITY */}
              <div className="lg:col-span-8 flex flex-col space-y-6">
                
                {/* Chart 1: Trust & Inflation */}
                <div className="p-6 rounded-2xl bg-white border border-[#e1e2da] flex flex-col">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#023547] border-b border-[#e1e2da] pb-2 flex justify-between">
                    <span>Sovereign Trust & Inflation telemetry</span>
                    <span className="text-[#536877] font-mono text-[9px] lowercase">Dynamic general equilibrium</span>
                  </h3>

                  <div className="relative mt-4 flex justify-center bg-white border border-[#e1e2da] rounded-xl p-2 shadow-inner">
                    <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto">
                      {/* Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                        const y = padding + ratio * (chartH - 2 * padding);
                        return (
                          <line key={idx} x1={padding} y1={y} x2={chartW - padding} y2={y} stroke="#f1f2ec" strokeWidth="1" />
                        );
                      })}

                      {/* Shock Zone */}
                      <rect 
                        x={padding + (9 / 29) * (chartW - 2 * padding)} 
                        y={padding} 
                        width={(6 / 29) * (chartW - 2 * padding)} 
                        height={chartH - 2 * padding} 
                        fill="rgba(200, 62, 59, 0.02)" 
                        stroke="rgba(200, 62, 59, 0.1)"
                        strokeDasharray="2 2"
                      />

                      {/* Curves */}
                      <path
                        d={getSvgPath(trustPoints, 0, 100)}
                        fill="none" stroke="#023547" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      />
                      <path
                        d={getSvgPath(inflationPoints, -2, 50)}
                        fill="none" stroke="#c83e3b" strokeWidth="1.5" strokeDasharray="4 2" strokeLinecap="round" strokeLinejoin="round"
                      />
                      <path
                        d={getSvgPath(interestPoints, 0, 20)}
                        fill="none" stroke="#b58b10" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                      />

                      {/* Legend */}
                      <text x={padding + 10} y={padding + 15} fill="#023547" fontSize="9" fontFamily="monospace" fontWeight="bold">—— GMAE Trust (%)</text>
                      <text x={padding + 140} y={padding + 15} fill="#c83e3b" fontSize="9" fontFamily="monospace" fontWeight="bold">- - Inflation (π)</text>
                      <text x={padding + 260} y={padding + 15} fill="#b58b10" fontSize="9" fontFamily="monospace" fontWeight="bold">—— Policy Rate (r)</text>
                    </svg>
                  </div>
                  <p className="text-[10px] text-[#536877] mt-3 text-center leading-relaxed font-semibold">
                    Dynamic variables are recalculated live using structural model parameters.
                  </p>
                </div>

                {/* JACOBIAN STABILITY ANALYSIS CARD */}
                {simData.jacobian && (
                  <div className="p-6 rounded-2xl bg-white border border-[#e1e2da] space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#023547] border-b border-[#e1e2da] pb-2">
                      Formal Stability Analysis: Jacobian Matrix
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Jacobian Matrix Representation */}
                      <div className="bg-[#f4f4f0]/50 border border-[#e1e2da] rounded-xl p-4 flex flex-col justify-between space-y-3 font-mono text-xs">
                        <span className="text-[8px] uppercase tracking-wider text-[#536877] font-black">Jacobian Matrix J</span>
                        <div className="flex items-center justify-center space-x-2 py-2 text-sm text-[#023547] font-bold">
                          <span>[</span>
                          <div className="flex flex-col text-center">
                            <span>{simData.jacobian.matrix.j11.toFixed(2)} &nbsp; {simData.jacobian.matrix.j12.toFixed(2)}</span>
                            <span>{simData.jacobian.matrix.j21.toFixed(2)} &nbsp; {simData.jacobian.matrix.j22.toFixed(2)}</span>
                          </div>
                          <span>]</span>
                        </div>
                        <span className="text-[8px] text-[#536877]">Derived from state variables Trust ($T_t$) & Inflation ($\pi_t$).</span>
                      </div>

                      {/* Determinant & Trace */}
                      <div className="bg-[#f4f4f0]/50 border border-[#e1e2da] rounded-xl p-4 flex flex-col justify-between space-y-2 font-mono text-xs">
                        <span className="text-[8px] uppercase tracking-wider text-[#536877] font-black">Eigenvalues & Traces</span>
                        <div className="space-y-1.5 py-1 text-[#023547]">
                          <div className="flex justify-between">
                            <span>Trace (Tr):</span>
                            <strong>{simData.jacobian.trace.toFixed(4)}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Determinant (Det):</span>
                            <strong>{simData.jacobian.determinant.toFixed(4)}</strong>
                          </div>
                          <div className="flex justify-between border-t border-[#e1e2da] pt-1 text-[11px]">
                            <span>Eigen Magnitude:</span>
                            <strong>|λ| = {simData.jacobian.eigenvalues[0].magnitude}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Stability Regime Indicators */}
                      <div className="border border-[#e1e2da] rounded-xl p-4 flex flex-col justify-between space-y-2">
                        <span className="text-[8px] uppercase tracking-wider text-[#536877] font-mono font-black">Mathematical Regime</span>
                        <div className="py-2 flex flex-col items-center">
                          {simData.jacobian.stable ? (
                            <span className="text-xs font-bold text-[#008082] bg-[#e1f3f3]/60 px-3 py-1.5 rounded-full border border-[#008082]/20 uppercase tracking-wide text-center">
                              Stable Algorithmic Regime
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-200 uppercase tracking-wide text-center">
                              Algorithmic Moral Collapse
                            </span>
                          )}
                          <p className="text-[8.5px] text-[#536877] mt-2 text-center font-medium leading-relaxed font-mono">
                            {simData.jacobian.stable 
                              ? "Satisfies Trace-Determinant stability: |λ| < 1. Divergence is mitigated." 
                              : "System diverges: |λ| ≥ 1. Trust collapses or hyperinflation occurs."
                            }
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* Chart 2: Money aggregates */}
                <div className="p-6 rounded-2xl bg-white border border-[#e1e2da] flex flex-col">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#023547] border-b border-[#e1e2da] pb-2 flex justify-between">
                    <span>Monetary Aggregate Supply curves</span>
                    <span className="text-[#536877] font-mono text-[9px] lowercase">M3 supply split</span>
                  </h3>

                  <div className="relative mt-4 flex justify-center bg-white border border-[#e1e2da] rounded-xl p-2 shadow-inner">
                    <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto">
                      {/* Areas */}
                      <path d={getSvgAreaPath(m3Points, m2Points, 0, maxMonetaryVal)} fill="rgba(2, 53, 71, 0.03)" stroke="none" />
                      <path d={getSvgAreaPath(m2Points, m1Points, 0, maxMonetaryVal)} fill="rgba(0, 128, 130, 0.05)" stroke="none" />
                      <path d={getSvgAreaPath(m1Points, currentHistory.map(() => 0), 0, maxMonetaryVal)} fill="rgba(6, 182, 212, 0.04)" stroke="none" />

                      {/* Lines */}
                      <path d={getSvgPath(m3Points, 0, maxMonetaryVal)} fill="none" stroke="#023547" strokeWidth="1.5" />
                      <path d={getSvgPath(m2Points, 0, maxMonetaryVal)} fill="none" stroke="#008082" strokeWidth="1.5" />
                      <path d={getSvgPath(m1Points, 0, maxMonetaryVal)} fill="none" stroke="#06b6d4" strokeWidth="2.5" />

                      {/* Legend */}
                      <text x={padding + 10} y={padding + 15} fill="#023547" fontSize="9" fontFamily="monospace" fontWeight="bold">■ M3 (Broad Money)</text>
                      <text x={padding + 140} y={padding + 15} fill="#008082" fontSize="9" fontFamily="monospace" fontWeight="bold">■ M2 (Savings)</text>
                      <text x={padding + 260} y={padding + 15} fill="#06b6d4" fontSize="9" fontFamily="monospace" fontWeight="bold">■ M1 (Liquid Cash)</text>
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
            
            {/* LEDGER BANNER */}
            <div className="p-6 rounded-2xl bg-white border border-[#e1e2da] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-base font-black text-[#023547]">Sovereign Blockchain Ledger Explorer</h3>
                <p className="text-xs text-[#536877] font-semibold mt-1">
                  Each committed simulation state is cryptographically signed and stored in the PostgreSQL database ledger.
                </p>
              </div>

              <div className="flex space-x-6 font-mono text-xs bg-[#f4f4f0] border border-[#e1e2da] p-4 rounded-xl">
                <div>
                  <span className="text-[#536877] block text-[8px] uppercase font-bold">Ledger Height</span>
                  <strong className="text-[#023547]">#{102400 + historyList.length}</strong>
                </div>
                <div>
                  <span className="text-[#536877] block text-[8px] uppercase font-bold">Consensus</span>
                  <strong className="text-[#023547]">POT (TRUST)</strong>
                </div>
              </div>
            </div>

            {/* BLOCK DATA LIST */}
            <div className="rounded-2xl bg-white border border-[#e1e2da] overflow-hidden">
              <div className="p-4 border-b border-[#e1e2da] bg-[#f4f4f0]/40">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#023547]">Committed Blocks</h4>
              </div>

              <div className="divide-y divide-[#e1e2da]">
                {historyList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#536877]">
                    No database blocks synchronized yet. Run simulation to commit.
                  </div>
                ) : (
                  historyList.map((run, idx) => {
                    const isExpanded = expandedBlock === run.id;
                    const oilVal = run.details.inputs.oil_price || 75;
                    const goldVal = run.details.inputs.gold_price || 2300;
                    const blockHeight = 102400 + historyList.length - idx;
                    const sealedHash = getBlockSealedHash(run.id, oilVal, goldVal, run.trust_level);

                    return (
                      <div key={run.id} className="p-5 hover:bg-[#f4f4f0]/20 transition-all">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          
                          {/* Block Identity */}
                          <div className="flex items-center space-x-4">
                            <div className="h-10 w-10 bg-[#f4f4f0] border border-[#e1e2da] rounded-xl flex flex-col items-center justify-center font-mono">
                              <span className="text-[7px] text-[#536877] leading-none">BLOCK</span>
                              <span className="text-xs font-black text-[#023547]">#{blockHeight}</span>
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h5 className="text-xs font-bold text-[#023547]">{run.run_name}</h5>
                                {run.details.inputs.autopilot && (
                                  <span className="text-[7px] uppercase px-1.5 py-0.2 bg-[#008082]/10 text-[#008082] border border-[#008082]/20 font-black rounded">AI GOV</span>
                                )}
                              </div>
                              <span className="text-[9px] text-[#536877] font-mono tracking-wider break-all">{sealedHash}</span>
                            </div>
                          </div>

                          {/* Oracle values sealed */}
                          <div className="flex flex-wrap lg:flex-nowrap items-center justify-between lg:justify-end gap-6 text-xs font-mono">
                            <div className="bg-[#f4f4f0] border border-[#e1e2da] px-3 py-1.5 rounded-lg">
                              <span className="text-[#536877] block text-[7px] uppercase font-bold">Oil WTI</span>
                              <strong className="text-[#023547]">${oilVal}</strong>
                            </div>
                            
                            <div className="bg-[#f4f4f0] border border-[#e1e2da] px-3 py-1.5 rounded-lg">
                              <span className="text-[#536877] block text-[7px] uppercase font-bold">Gold Spot</span>
                              <strong className="text-[#023547]">${goldVal}</strong>
                            </div>

                            <div>
                              <span className="text-[#536877] block text-[7px] uppercase font-bold">Avg Trust</span>
                              <strong className="text-[#023547]">{(run.trust_level * 100).toFixed(2)}%</strong>
                            </div>

                            <div className="text-right">
                              <span className="text-[#536877] block text-[7px] uppercase font-bold">Sync Time</span>
                              <span className="text-[#023547]/80">{new Date(run.created_at).toLocaleTimeString('id-ID')}</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleLoadHistory(run)}
                                className="px-3 py-1.5 rounded-lg bg-[#f4f4f0] border border-[#e1e2da] hover:bg-[#023547] hover:text-white text-[#023547] font-bold uppercase text-[9px] transition-all cursor-pointer"
                              >
                                Load
                              </button>
                              <button
                                onClick={() => setExpandedBlock(isExpanded ? null : run.id)}
                                className="p-1 rounded bg-[#f4f4f0] border border-[#e1e2da] text-[#023547] hover:bg-[#023547] hover:text-white transition-colors cursor-pointer"
                              >
                                <svg className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                          </div>

                        </div>

                        {/* JSON details */}
                        {isExpanded && (
                          <div className="mt-4 p-4 rounded-xl bg-[#f4f4f0]/60 border border-[#e1e2da] font-mono text-[10px] text-[#023547] space-y-2">
                            <div className="flex justify-between border-b border-[#e1e2da] pb-1 text-[#536877]">
                              <span>Sync State: COMMITTED_ATOMIC</span>
                              <span>Metadata Size: 2.1kb</span>
                            </div>
                            <div className="overflow-x-auto whitespace-pre max-h-64 scrollbar-none text-[9px]">
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

        {/* TAB 3: SOVEREIGN NODES */}
        {activeTab === 'reserves' && (
          <div className="space-y-6">
            
            <div className="p-6 rounded-2xl bg-white border border-[#e1e2da]">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#023547] mb-2">Central Bank API Node Telemetry</h3>
              <p className="text-xs text-[#536877] font-semibold leading-relaxed">
                Decentralized nodes syncing GMAE reserves, interest guidelines, and exchange peg ratios in real-time.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* FED */}
              <div className="p-6 rounded-2xl bg-white border border-[#e1e2da] flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-[#023547]">FED Node (USD)</h4>
                    <p className="text-[9px] text-[#536877] font-mono">fed.node.gmae.net</p>
                  </div>
                  <span className="flex items-center space-x-1.5 text-[9px] font-mono px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span>ONLINE // 12ms</span>
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center bg-[#f4f4f0]/60 border border-[#e1e2da] p-3 rounded-xl">
                  <div>
                    <span className="text-[8px] text-[#536877] block font-bold">Interest</span>
                    <strong className="text-[#023547]">5.25%</strong>
                  </div>
                  <div>
                    <span className="text-[8px] text-[#536877] block font-bold">Peg Ratio</span>
                    <strong className="text-[#023547]">1.00 USD</strong>
                  </div>
                  <div>
                    <span className="text-[8px] text-[#536877] block font-bold">M3 Supply</span>
                    <strong className="text-[#023547]">$21.0T</strong>
                  </div>
                </div>
              </div>

              {/* ECB */}
              <div className="p-6 rounded-2xl bg-white border border-[#e1e2da] flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-[#023547]">ECB Node (EUR)</h4>
                    <p className="text-[9px] text-[#536877] font-mono">ecb.node.gmae.net</p>
                  </div>
                  <span className="flex items-center space-x-1.5 text-[9px] font-mono px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span>ONLINE // 34ms</span>
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center bg-[#f4f4f0]/60 border border-[#e1e2da] p-3 rounded-xl">
                  <div>
                    <span className="text-[8px] text-[#536877] block font-bold">Interest</span>
                    <strong className="text-[#023547]">4.00%</strong>
                  </div>
                  <div>
                    <span className="text-[8px] text-[#536877] block font-bold">Peg Ratio</span>
                    <strong className="text-[#023547]">0.92 EUR</strong>
                  </div>
                  <div>
                    <span className="text-[8px] text-[#536877] block font-bold">M3 Supply</span>
                    <strong className="text-[#023547]">€15.2T</strong>
                  </div>
                </div>
              </div>

              {/* Bank of Canada */}
              <div className="p-6 rounded-2xl bg-white border border-[#e1e2da] flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-[#023547]">Bank of Canada (CAD)</h4>
                    <p className="text-[9px] text-[#536877] font-mono">boc.node.gmae.net</p>
                  </div>
                  <span className="flex items-center space-x-1.5 text-[9px] font-mono px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span>ONLINE // 42ms</span>
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center bg-[#f4f4f0]/60 border border-[#e1e2da] p-3 rounded-xl">
                  <div>
                    <span className="text-[8px] text-[#536877] block font-bold">Interest</span>
                    <strong className="text-[#023547]">4.75%</strong>
                  </div>
                  <div>
                    <span className="text-[8px] text-[#536877] block font-bold">Peg Ratio</span>
                    <strong className="text-[#023547]">1.35 CAD</strong>
                  </div>
                  <div>
                    <span className="text-[8px] text-[#536877] block font-bold">M3 Supply</span>
                    <strong className="text-[#023547]">$2.8T</strong>
                  </div>
                </div>
              </div>

              {/* Bank Indonesia */}
              <div className="p-6 rounded-2xl bg-white border border-[#e1e2da] flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-[#023547]">Bank Indonesia (IDR)</h4>
                    <p className="text-[9px] text-[#536877] font-mono">bi.node.gmae.net</p>
                  </div>
                  <span className="flex items-center space-x-1.5 text-[9px] font-mono px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span>ONLINE // 8ms</span>
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center bg-[#f4f4f0]/60 border border-[#e1e2da] p-3 rounded-xl">
                  <div>
                    <span className="text-[8px] text-[#536877] block font-bold">Interest</span>
                    <strong className="text-[#023547]">6.25%</strong>
                  </div>
                  <div>
                    <span className="text-[8px] text-[#536877] block font-bold">Peg Ratio</span>
                    <strong className="text-[#023547]">16,350 IDR</strong>
                  </div>
                  <div>
                    <span className="text-[8px] text-[#536877] block font-bold">M3 Supply</span>
                    <strong className="text-[#023547]">Rp 8.900T</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* QUICK ACTIONS BOARD */}
            <div className="p-6 rounded-2xl bg-white border border-[#e1e2da] space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#023547]">Reserve Action Bridge</h4>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setOilPrice(155);
                    setActiveTab('governor');
                    alert('Oracle Oil Price set to $155 / barrel (Supply Inflation Shock).');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold uppercase text-[10px] hover:bg-rose-100 transition-all cursor-pointer"
                >
                  Simulate Oil Price Shock ($155)
                </button>
                <button
                  onClick={() => {
                    setGoldPrice(3250);
                    setActiveTab('governor');
                    alert('Oracle Gold Price set to $3,250 / oz (Physical Gold-backed Reserve boost).');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#008082]/10 border border-[#008082]/20 text-[#008082] font-bold uppercase text-[10px] hover:bg-[#008082]/20 transition-all cursor-pointer"
                >
                  Simulate Gold Reserve Influx ($3,250)
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* FOOTER */}
      <footer className="border-t border-[#e1e2da] bg-white py-4 text-center text-[10px] text-[#536877] font-mono tracking-widest uppercase">
        GMAE Sovereign System Ledger © 2026 // Connected to Cloud Database
      </footer>

    </div>
  );
}

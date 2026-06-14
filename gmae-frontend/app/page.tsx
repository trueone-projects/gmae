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

  // Navigation: governor, ledger, reserves, academic
  const [activeTab, setActiveTab] = useState<'governor' | 'ledger' | 'reserves' | 'academic'>('governor');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Simulation Results State
  const [simData, setSimData] = useState<SimulationDetails>(generateDefaultMockData());
  const [loading, setLoading] = useState(false);
  const [historyList, setHistoryList] = useState<HistoryRun[]>([]);
  const [dbStatus, setDbStatus] = useState<string | null>(null);
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);

  // Load history from DB
  const fetchHistory = async () => {
    try {
      const data = await getHistoryData();
      if (Array.isArray(data)) {
        setHistoryList(data);
        setDbStatus('Connected (Neon AWS)');
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
      setDbStatus('Local Sandbox (Offline DB)');
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
        setActiveTab('governor');
      }
    } catch (error) {
      alert('Gagal terhubung ke backend Node.js! Menggunakan simulasi lokal.');
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
    setActiveTab('governor');
  };

  const copyEmailToClipboard = () => {
    const emailBody = `Subject: Visiting Researcher / Postdoctoral Inquiry: Algorithmic Trust in Digital Currencies (GMAE Framework)

Dear Professor Rudnyckyj,

I hope this email finds you well. 

Having followed your pioneering work on the anthropology of finance and new monetary commons (specifically "Beyond Debt"), I am writing to share a dynamic general equilibrium framework I have developed, titled "Algorithmic Trust and the Future of Money: A Dynamic General Equilibrium Framework for AI-Governed Digital Currencies."

My research introduces the General Moral-Algorithmic Equilibrium (GMAE), which treats trust as an endogenous variable shaped by algorithmic transparency (tp), leakage (lk), and societal moral preferences (alpha). 

To complement the theoretical paper, I have built an interactive, autonomous Central Bank Dashboard simulating these dynamics under economic stress tests (Standard Mode vs. Autonomous Stability Protocol) backed by a PostgreSQL cloud ledger database. I would be honored if you could interact with the live dashboard here: ${window.location.origin}

I am highly interested in pursuing postdoctoral research under your supervision at the University of Victoria, exploring how digital currencies reformulate institutional legitimacy in Southeast Asia. I am prepared to apply for co-funded fellowships like Mitacs Elevate or SSHRC.

I look forward to the possibility of discussing this further.

Sincerely,
Arva Athallah Susanto`;

    navigator.clipboard.writeText(emailBody);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
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

  // Generate unique mock hash for database items to emphasize "blockchain database"
  const getMockHash = (id: number, timeStr: string) => {
    return `0x${Buffer.from(id + '-' + timeStr).toString('hex').slice(0, 16)}...${Buffer.from(timeStr).toString('hex').slice(-8)}`;
  };

  return (
    <div className="flex h-screen bg-[#030704] text-emerald-50 font-sans antialiased overflow-hidden">
      
      {/* GLOW DECORATIONS */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full filter blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full filter blur-[100px] pointer-events-none -z-10"></div>

      {/* LEFT SIDEBAR (Desktop) */}
      <aside className={`w-64 bg-[#061009] border-r border-emerald-950/80 flex flex-col z-50 transition-all duration-300 fixed lg:relative h-full ${sidebarOpen ? 'left-0' : '-left-64 lg:left-0'}`}>
        {/* Brand Header */}
        <div className="p-6 border-b border-emerald-950/80 bg-[#040b06]/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-[#030704] text-lg tracking-wider shadow-lg shadow-emerald-500/20">
              Ω
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-widest text-emerald-400 uppercase">GMAE Authority</h1>
              <p className="text-[10px] text-emerald-600 font-semibold tracking-wider">Algorithmic CBDC</p>
            </div>
          </div>
          {/* Close button for mobile */}
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-emerald-500 hover:text-emerald-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {/* Monetary Governor */}
          <button
            onClick={() => { setActiveTab('governor'); setSidebarOpen(false); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-left text-xs font-bold uppercase tracking-wider ${activeTab === 'governor' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.08)]' : 'text-emerald-600 hover:text-emerald-300 hover:bg-emerald-950/10'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span>Monetary Governor</span>
          </button>

          {/* Blockchain Ledger Database */}
          <button
            onClick={() => { setActiveTab('ledger'); setSidebarOpen(false); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-left text-xs font-bold uppercase tracking-wider ${activeTab === 'ledger' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.08)]' : 'text-emerald-600 hover:text-emerald-300 hover:bg-emerald-950/10'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Blockchain Ledger</span>
          </button>

          {/* Sovereign Reserves Telemetry */}
          <button
            onClick={() => { setActiveTab('reserves'); setSidebarOpen(false); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-left text-xs font-bold uppercase tracking-wider ${activeTab === 'reserves' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.08)]' : 'text-emerald-600 hover:text-emerald-300 hover:bg-emerald-950/10'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9h18" />
            </svg>
            <span>Sovereign Reserves</span>
          </button>

          {/* Academic Proposal */}
          <button
            onClick={() => { setActiveTab('academic'); setSidebarOpen(false); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-left text-xs font-bold uppercase tracking-wider ${activeTab === 'academic' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.08)]' : 'text-emerald-600 hover:text-emerald-300 hover:bg-emerald-950/10'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>Academic Defense</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-emerald-950/80 bg-[#040b06]/40 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-[10px] text-emerald-500/80 font-mono">
            <span>DB State:</span>
            <span className="flex items-center space-x-1.5 font-bold text-emerald-400">
              <span className={`h-1.5 w-1.5 rounded-full ${dbStatus?.includes('Connected') ? 'bg-emerald-500 animate-pulse shadow-md shadow-emerald-500' : 'bg-amber-500'}`}></span>
              <span>{dbStatus?.includes('Connected') ? 'Neon Cloud' : 'Offline'}</span>
            </span>
          </div>
          <div className="text-[9px] text-emerald-600 font-mono text-center">
            Ledger Sync Block: #{102400 + historyList.length}
          </div>
        </div>
      </aside>

      {/* OVERLAY FOR MOBILE SIDEBAR */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"></div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOP HEADER */}
        <header className="h-16 border-b border-emerald-950/80 bg-[#061009]/70 backdrop-blur-md flex items-center justify-between px-6 z-30">
          <div className="flex items-center space-x-4">
            {/* Hamburger Button for mobile */}
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-emerald-400 hover:text-emerald-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-300">
              {activeTab === 'governor' && 'GMAE Autopilot & Policy Governor'}
              {activeTab === 'ledger' && 'Sovereign Blockchain Ledger'}
              {activeTab === 'reserves' && 'Sovereign Central Bank reserves'}
              {activeTab === 'academic' && 'Daromir Rudnycky Postdoc Proposal'}
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            {/* Autopilot quick info on header */}
            <div className="hidden sm:flex items-center space-x-2 bg-emerald-950/40 border border-emerald-850 px-3 py-1 rounded-lg">
              <span className="text-[10px] text-emerald-500 uppercase font-extrabold tracking-wider">PID Stable Protocol</span>
              <button 
                onClick={() => setAutopilot(!autopilot)}
                className={`text-[9px] font-extrabold px-2 py-0.5 rounded transition-all ${autopilot ? 'bg-emerald-500 text-emerald-950 shadow-md shadow-emerald-500/30' : 'bg-[#0b1b10] text-emerald-400 hover:bg-emerald-900/30'}`}
              >
                {autopilot ? 'AUTOPILOT ON' : 'MANUAL'}
              </button>
            </div>
            {/* User Profile */}
            <div className="flex items-center space-x-2.5">
              <span className="text-xs font-bold text-emerald-400 hidden sm:inline-block">Arva Athallah</span>
              <div className="h-8 w-8 bg-emerald-900/50 border border-emerald-500/30 rounded-xl flex items-center justify-center font-black text-emerald-300 text-xs shadow-inner">
                AA
              </div>
            </div>
          </div>
        </header>

        {/* DYNAMIC SCROLLABLE PAGE BODY */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

          {/* TAB 1: MONETARY GOVERNOR (Simulasi Utama & Grafis) */}
          {activeTab === 'governor' && (
            <div className="space-y-6">
              
              {/* METRICS HEADER ROW */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metrik 1: Trust */}
                <div className="p-4 rounded-2xl border border-emerald-900/40 bg-[#08150d]/50 backdrop-blur-md flex flex-col justify-between hover:border-emerald-800/40 transition-all">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">GMAE Trust</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-550/20">T_t</span>
                  </div>
                  <div className="my-2">
                    <h3 className="text-2xl md:text-3xl font-extrabold font-mono text-emerald-400 leading-none">
                      {(latestStep.trust * 100).toFixed(1)}%
                    </h3>
                    <div className={`mt-2 text-[9px] px-2 py-0.5 rounded-full border inline-block font-extrabold tracking-wider uppercase ${stability.color}`}>
                      {stability.label}
                    </div>
                  </div>
                </div>

                {/* Metrik 2: Money Supply */}
                <div className="p-4 rounded-2xl border border-emerald-900/40 bg-[#08150d]/50 backdrop-blur-md flex flex-col justify-between hover:border-emerald-800/40 transition-all">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Money Supply (M3)</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-550/20">M3</span>
                  </div>
                  <div className="my-2">
                    <h3 className="text-2xl md:text-3xl font-extrabold font-mono text-emerald-300 leading-none">
                      {latestStep.m3.toLocaleString()} <span className="text-xs font-semibold text-emerald-550">GMA</span>
                    </h3>
                    <p className="text-[9px] text-emerald-600 font-mono tracking-wide mt-2">
                      M1: {latestStep.m1.toLocaleString()} | M2: {latestStep.m2.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Metrik 3: Inflation */}
                <div className="p-4 rounded-2xl border border-emerald-900/40 bg-[#08150d]/50 backdrop-blur-md flex flex-col justify-between hover:border-emerald-800/40 transition-all">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Inflation Rate</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-550/20">π_t</span>
                  </div>
                  <div className="my-2">
                    <h3 className={`text-2xl md:text-3xl font-extrabold font-mono leading-none ${latestStep.inflation > 15 ? 'text-rose-500' : latestStep.inflation > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {latestStep.inflation.toFixed(2)}%
                    </h3>
                    <p className="text-[9px] text-emerald-600 font-mono tracking-wide mt-2">
                      Anchor Target: <strong className="text-emerald-400">2.0%</strong>
                    </p>
                  </div>
                </div>

                {/* Metrik 4: Policy Rate */}
                <div className="p-4 rounded-2xl border border-emerald-900/40 bg-[#08150d]/50 backdrop-blur-md flex flex-col justify-between hover:border-emerald-800/40 transition-all">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Autonomous Rate</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-550/20">r_t</span>
                  </div>
                  <div className="my-2">
                    <h3 className="text-2xl md:text-3xl font-extrabold font-mono text-amber-400 leading-none">
                      {latestStep.interest_rate.toFixed(2)}%
                    </h3>
                    <p className="text-[9px] text-emerald-600 font-mono tracking-wide mt-2">
                      Mode: <strong className="text-emerald-400">{autopilot ? 'PID Counter-Cyclic' : 'Static Feedback'}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* THREE-PANEL GOVERNOR LAYOUT */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* PANEL SLIDERS (lg: col-span-4) */}
                <div className="lg:col-span-4 flex flex-col space-y-4">
                  
                  {/* Autopilot Status Message */}
                  {autopilot && (
                    <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs text-emerald-250 leading-relaxed shadow-lg shadow-emerald-500/5">
                      <h4 className="font-extrabold text-emerald-300 uppercase tracking-wider mb-1.5 flex items-center">
                        <span className="mr-2 h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-md shadow-emerald-400"></span>
                        Autonomous Stabiliy Protocol Active
                      </h4>
                      <p className="text-[11px]">
                        The AI governor has locked standard variables: <strong>Transparency = 95%</strong>, <strong>Leakage = 2%</strong>, and <strong>Moral Alignment = 95%</strong>. External macroeconomic shocks are automatically absorbed using dynamic sovereign pegs.
                      </p>
                      <div className="mt-2 font-mono text-[9px] text-emerald-400/90 border-t border-emerald-900/30 pt-1.5">
                        &gt;_ GMAE_PID_Governor: ACTIVE // Dampening: 85% // db_sync: ON
                      </div>
                    </div>
                  )}

                  {/* Controller Board */}
                  <div className="p-5 rounded-2xl border border-emerald-900/40 bg-[#08150d]/50 backdrop-blur-md flex flex-col space-y-5">
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-widest text-emerald-300 border-b border-emerald-950 pb-2">
                        Monetary Policy Directives
                      </h3>
                    </div>

                    {/* Policy Run Name */}
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Run ID / Policy Name</label>
                      <input 
                        type="text"
                        value={runName}
                        onChange={(e) => setRunName(e.target.value)}
                        className="w-full bg-[#030a05] border border-emerald-950 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-emerald-500/50 text-emerald-200 transition-colors"
                        placeholder="e.g. Radically Transparent Anchor"
                      />
                    </div>

                    {/* SLIDERS: MONETARY TARGETS */}
                    <div className={`space-y-4 transition-all duration-300 ${autopilot ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                      <h4 className="text-[9px] uppercase font-black text-emerald-500 tracking-wider">Monetary Aggregates</h4>
                      
                      {/* M1 */}
                      <div className="flex flex-col space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-emerald-500/80 text-[10px]">Target M1 (Liquid Cash)</span>
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

                    {/* SLIDERS: GMAE MODEL FACTORS */}
                    <div className={`space-y-4 pt-3 border-t border-emerald-950/60 transition-all duration-300 ${autopilot ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                      <h4 className="text-[9px] uppercase font-black text-emerald-500 tracking-wider">Algorithmic Variables</h4>

                      {/* tp */}
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

                      {/* lk */}
                      <div className="flex flex-col space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-emerald-500/80 text-[10px]">Institutional Leakage (lk)</span>
                          <span className="text-rose-400">{Math.round(leakage * 100)}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="1" step="0.05"
                          disabled={autopilot}
                          value={leakage} onChange={(e) => setLeakage(Number(e.target.value))}
                          className="w-full accent-rose-500 bg-emerald-950/60 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {/* alpha */}
                      <div className="flex flex-col space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-emerald-500/80 text-[10px]">Moral Alignment (α)</span>
                          <span className="text-emerald-400">{Math.round(moralAlignment * 100)}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="1" step="0.05"
                          disabled={autopilot}
                          value={moralAlignment} onChange={(e) => setMoralAlignment(Number(e.target.value))}
                          className="w-full accent-emerald-500 bg-emerald-950/60 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Stress Testing */}
                    <div className="space-y-4 pt-3 border-t border-emerald-950/60">
                      <h4 className="text-[9px] uppercase font-black text-amber-500 tracking-wider">Stress Test Vector</h4>
                      <div className="flex flex-col space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-emerald-500/80 text-[10px]">Economic Shock (ε)</span>
                          <span className="text-amber-500 font-extrabold">{Math.round(shockSeverity * 100)}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="1" step="0.05"
                          value={shockSeverity} onChange={(e) => setShockSeverity(Number(e.target.value))}
                          className="w-full accent-amber-500 bg-emerald-950/60 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Action button */}
                    <button
                      onClick={handleSimulate}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-emerald-950 font-black py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {loading ? 'CALCULATING EQUILIBRIUM...' : 'COMMIT STATE TO LEDGER'}
                    </button>
                  </div>

                </div>

                {/* GRAPHIC CHARTS (lg: col-span-8) */}
                <div className="lg:col-span-8 flex flex-col space-y-6">
                  
                  {/* Chart 1: Trust & inflation */}
                  <div className="p-5 rounded-2xl border border-emerald-900/40 bg-[#08150d]/50 backdrop-blur-md flex flex-col">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-emerald-300 border-b border-emerald-950 pb-2 flex justify-between">
                      <span>Sovereign Trust & Price Stabilization dynamics</span>
                      <span className="text-emerald-600 font-mono text-[10px] lowercase">30-Period Telemetry</span>
                    </h3>

                    <div className="relative mt-4 flex justify-center bg-[#040c06] border border-emerald-950/60 rounded-xl p-2 overflow-hidden shadow-inner">
                      <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto">
                        <defs>
                          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
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
                            <line key={idx} x1={padding} y1={y} x2={chartW - padding} y2={y} stroke="#071b0b" strokeDasharray="3 3" />
                          );
                        })}

                        {/* Shock Zone */}
                        <rect 
                          x={padding + (9 / 29) * (chartW - 2 * padding)} 
                          y={padding} 
                          width={(6 / 29) * (chartW - 2 * padding)} 
                          height={chartH - 2 * padding} 
                          fill="rgba(239, 68, 68, 0.03)" 
                          stroke="rgba(239, 68, 68, 0.12)"
                          strokeDasharray="2 2"
                        />

                        {/* Curves */}
                        <path
                          d={getSvgPath(trustPoints, 0, 100)}
                          fill="none" stroke="#10b981" strokeWidth="3" filter="url(#glow)" strokeLinecap="round" strokeLinejoin="round"
                        />
                        <path
                          d={getSvgPath(inflationPoints, -2, 50)}
                          fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2" strokeLinecap="round" strokeLinejoin="round"
                        />
                        <path
                          d={getSvgPath(interestPoints, 0, 20)}
                          fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        />

                        {/* Legend */}
                        <text x={padding + 10} y={padding + 15} fill="#10b981" fontSize="9" fontFamily="monospace" fontWeight="bold">—— GMAE Trust (%)</text>
                        <text x={padding + 140} y={padding + 15} fill="#ef4444" fontSize="9" fontFamily="monospace" fontWeight="bold">- - Inflation (π)</text>
                        <text x={padding + 260} y={padding + 15} fill="#f59e0b" fontSize="9" fontFamily="monospace" fontWeight="bold">—— Policy Rate (r)</text>
                        <text x={padding + (11 / 29) * (chartW - 2 * padding)} y={chartH - padding - 8} fill="#f87171" fontSize="8" fontFamily="sans-serif" fontWeight="bold">Economic Shock Zone</text>
                      </svg>
                    </div>
                    <p className="text-[10px] text-emerald-500/80 mt-3 text-center leading-relaxed font-semibold">
                      {autopilot 
                        ? "Protocol Stabilizer Active: Algorithmic trust anchored at 95%, containing systemic shocks and stabilizing target inflation."
                        : "*Red overlay represents the stress test shock vector (Period 10–15) acting on trust reserves."}
                    </p>
                  </div>

                  {/* Chart 2: Money supply aggregates */}
                  <div className="p-5 rounded-2xl border border-emerald-900/40 bg-[#08150d]/50 backdrop-blur-md flex flex-col">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-emerald-300 border-b border-emerald-950 pb-2 flex justify-between">
                      <span>Sovereign Money Supply aggregate liquidity (M1, M2, M3)</span>
                      <span className="text-emerald-600 font-mono text-[10px] lowercase">Liquidity allocation</span>
                    </h3>

                    <div className="relative mt-4 flex justify-center bg-[#040c06] border border-emerald-950/60 rounded-xl p-2 overflow-hidden shadow-inner">
                      <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto">
                        <defs>
                          <linearGradient id="colorM3" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorM2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorM1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                          </linearGradient>
                        </defs>

                        {/* Areas */}
                        <path
                          d={getSvgAreaPath(m3Points, m2Points, 0, maxMonetaryVal)}
                          fill="url(#colorM3)" stroke="none"
                        />
                        <path
                          d={getSvgAreaPath(m2Points, m1Points, 0, maxMonetaryVal)}
                          fill="url(#colorM2)" stroke="none"
                        />
                        <path
                          d={getSvgAreaPath(m1Points, currentHistory.map(() => 0), 0, maxMonetaryVal)}
                          fill="url(#colorM1)" stroke="none"
                        />

                        {/* Lines */}
                        <path d={getSvgPath(m3Points, 0, maxMonetaryVal)} fill="none" stroke="#10b981" strokeWidth="1.5" />
                        <path d={getSvgPath(m2Points, 0, maxMonetaryVal)} fill="none" stroke="#0d9488" strokeWidth="1.5" />
                        <path d={getSvgPath(m1Points, 0, maxMonetaryVal)} fill="none" stroke="#06b6d4" strokeWidth="2.5" />

                        {/* Legend */}
                        <text x={padding + 10} y={padding + 15} fill="#10b981" fontSize="9" fontFamily="monospace" fontWeight="bold">■ M3 (Broad Money)</text>
                        <text x={padding + 140} y={padding + 15} fill="#0d9488" fontSize="9" fontFamily="monospace" fontWeight="bold">■ M2 (Savings)</text>
                        <text x={padding + 260} y={padding + 15} fill="#06b6d4" fontSize="9" fontFamily="monospace" fontWeight="bold">■ M1 (Cash Liquidity)</text>
                      </svg>
                    </div>
                    <p className="text-[10px] text-emerald-500/80 mt-3 text-center leading-relaxed font-semibold">
                      Shows the dynamics of savings and liquid money under dynamic interest feedback loops.
                    </p>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* TAB 2: BLOCKCHAIN LEDGER DATABASE (Explorer database cloud Neon) */}
          {activeTab === 'ledger' && (
            <div className="space-y-6">
              
              {/* LEDGER BANNER & STATS */}
              <div className="p-6 rounded-2xl border border-emerald-900/40 bg-[#08150d]/50 backdrop-blur-md">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-emerald-400">Algorithmic Ledger Block Explorer</h3>
                    <p className="text-xs text-emerald-600 font-semibold mt-1">
                      Each monetary simulation is cryptographically saved as a ledger state checkpoint in our cloud Postgres database.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 bg-[#030a05] border border-emerald-950 rounded-xl p-3 text-xs font-mono">
                    <div>
                      <span className="text-emerald-600 block text-[9px] uppercase">Ledger Nodes</span>
                      <strong className="text-emerald-300">1 (AWS Cloud API)</strong>
                    </div>
                    <div>
                      <span className="text-emerald-600 block text-[9px] uppercase">Mined Blocks</span>
                      <strong className="text-emerald-300">{historyList.length}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* BLOCKS TABLE / CARDS */}
              <div className="rounded-2xl border border-emerald-900/40 bg-[#08150d]/50 backdrop-blur-md overflow-hidden">
                <div className="p-4 border-b border-emerald-950/80 bg-[#040b06]/40">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-emerald-300">Verified Ledger States (Neon DB Commits)</h4>
                </div>

                <div className="divide-y divide-emerald-950/80">
                  {historyList.length === 0 ? (
                    <div className="p-8 text-center text-xs text-emerald-600">
                      No blocks found. Commit a simulation state to create the first block.
                    </div>
                  ) : (
                    historyList.map((run, idx) => {
                      const isExpanded = expandedBlock === run.id;
                      const mockHash = getMockHash(run.id, run.created_at);
                      
                      return (
                        <div key={run.id} className="p-4 hover:bg-[#07130b]/30 transition-all">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            {/* Block Height and Name */}
                            <div className="flex items-center space-x-4">
                              <div className="h-10 w-10 bg-[#030904] border border-emerald-500/20 rounded-xl flex flex-col items-center justify-center font-mono">
                                <span className="text-[8px] text-emerald-600 leading-none">BLOCK</span>
                                <span className="text-xs font-black text-emerald-400">#{102400 + historyList.length - idx}</span>
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-emerald-200">{run.run_name}</h5>
                                <span className="text-[9px] text-emerald-600 font-mono tracking-wider break-all">{mockHash}</span>
                              </div>
                            </div>

                            {/* Metrik Trust & Time */}
                            <div className="flex items-center justify-between md:justify-end gap-6 text-xs font-mono">
                              <div>
                                <span className="text-emerald-650 block text-[9px] uppercase text-right md:text-left">Avg Trust</span>
                                <span className="text-emerald-400 font-black">{(run.trust_level * 100).toFixed(2)}%</span>
                              </div>
                              <div>
                                <span className="text-emerald-650 block text-[9px] uppercase text-right md:text-left">Transparency</span>
                                <span className="text-emerald-300 font-black">{Math.round((run.transparency || 0) * 100)}%</span>
                              </div>
                              <div className="text-right">
                                <span className="text-emerald-655 block text-[9px] uppercase">Commit Time</span>
                                <span className="text-emerald-400/80">{new Date(run.created_at).toLocaleTimeString('id-ID')}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleLoadHistory(run)}
                                  className="px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-500/25 hover:bg-emerald-900/40 text-emerald-400 font-bold uppercase text-[9px] transition-all cursor-pointer"
                                >
                                  Load
                                </button>
                                <button
                                  onClick={() => setExpandedBlock(isExpanded ? null : run.id)}
                                  className="p-1 rounded bg-[#030a05] text-emerald-500 hover:text-emerald-400 cursor-pointer"
                                >
                                  <svg className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Expanded JSON Details */}
                          {isExpanded && (
                            <div className="mt-4 p-4 rounded-xl bg-[#030904] border border-emerald-950 font-mono text-[10px] text-emerald-400/90 space-y-3">
                              <div className="flex justify-between border-b border-emerald-950/60 pb-1.5 text-emerald-500">
                                <span>SQL Commit ID: {run.id}</span>
                                <span>Status: ATOMICALLY_COMMITTED</span>
                              </div>
                              <div className="overflow-x-auto whitespace-pre-wrap max-h-60">
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

          {/* TAB 3: SOVEREIGN RESERVES (Bank Sentral monitoring telemetry) */}
          {activeTab === 'reserves' && (
            <div className="space-y-6">
              
              <div className="p-5 rounded-2xl border border-emerald-900/40 bg-[#08150d]/50 backdrop-blur-md">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-emerald-400 mb-2">Sovereign Central Bank API Node Status</h3>
                <p className="text-xs text-emerald-600 font-semibold leading-relaxed">
                  Real-time telemetry and bridge connections to major monetary zones around the world. These nodes provide macroeconomic anchor statistics to align GMAE algorithmic pegs.
                </p>
              </div>

              {/* GRID OF CENTRAL BANKS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* FED Node */}
                <div className="p-5 rounded-2xl border border-emerald-900/30 bg-[#08150d]/40 flex flex-col justify-between space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-250">FED Zone Node (USD)</h4>
                      <p className="text-[9px] text-emerald-600 font-mono">Endpoint: fed.api.centralbank.org/v1</p>
                    </div>
                    <span className="flex items-center space-x-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>SECURE // 12ms</span>
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center bg-[#030905] border border-emerald-955/40 p-2.5 rounded-xl">
                    <div>
                      <span className="text-[8px] text-emerald-600 block">Interest Rate</span>
                      <strong className="text-emerald-300">5.25%</strong>
                    </div>
                    <div>
                      <span className="text-[8px] text-emerald-600 block">Peg Ratio</span>
                      <strong className="text-emerald-300">1.00 USD</strong>
                    </div>
                    <div>
                      <span className="text-[8px] text-emerald-600 block">Trust index</span>
                      <strong className="text-emerald-400">92.1%</strong>
                    </div>
                  </div>
                </div>

                {/* ECB Node */}
                <div className="p-5 rounded-2xl border border-emerald-900/30 bg-[#08150d]/40 flex flex-col justify-between space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-250">ECB Zone Node (EUR)</h4>
                      <p className="text-[9px] text-emerald-600 font-mono">Endpoint: ecb.api.centralbank.org/v1</p>
                    </div>
                    <span className="flex items-center space-x-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>SECURE // 34ms</span>
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center bg-[#030905] border border-emerald-955/40 p-2.5 rounded-xl">
                    <div>
                      <span className="text-[8px] text-emerald-600 block">Interest Rate</span>
                      <strong className="text-emerald-300">4.00%</strong>
                    </div>
                    <div>
                      <span className="text-[8px] text-emerald-600 block">Peg Ratio</span>
                      <strong className="text-emerald-300">0.92 EUR</strong>
                    </div>
                    <div>
                      <span className="text-[8px] text-emerald-600 block">Trust index</span>
                      <strong className="text-emerald-400">94.8%</strong>
                    </div>
                  </div>
                </div>

                {/* Bank of Canada Node */}
                <div className="p-5 rounded-2xl border border-emerald-900/30 bg-[#08150d]/40 flex flex-col justify-between space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-250">Bank of Canada Node (CAD)</h4>
                      <p className="text-[9px] text-emerald-600 font-mono">Endpoint: uvic.node.bankofcanada.ca/gmae</p>
                    </div>
                    <span className="flex items-center space-x-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>SECURE // 42ms</span>
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center bg-[#030905] border border-emerald-955/40 p-2.5 rounded-xl">
                    <div>
                      <span className="text-[8px] text-emerald-600 block">Interest Rate</span>
                      <strong className="text-emerald-300">4.75%</strong>
                    </div>
                    <div>
                      <span className="text-[8px] text-emerald-600 block">Peg Ratio</span>
                      <strong className="text-emerald-300">1.35 CAD</strong>
                    </div>
                    <div>
                      <span className="text-[8px] text-emerald-600 block">Trust index</span>
                      <strong className="text-emerald-400">95.0%</strong>
                    </div>
                  </div>
                </div>

                {/* BI / ASEAN Node */}
                <div className="p-5 rounded-2xl border border-emerald-900/30 bg-[#08150d]/40 flex flex-col justify-between space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-400">Bank Indonesia Node (IDR)</h4>
                      <p className="text-[9px] text-emerald-600 font-mono">Endpoint: bi.sandbox.id/gmae-bridge</p>
                    </div>
                    <span className="flex items-center space-x-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>ACTIVE // 8ms</span>
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center bg-[#030905] border border-emerald-955/40 p-2.5 rounded-xl">
                    <div>
                      <span className="text-[8px] text-emerald-600 block">Interest Rate</span>
                      <strong className="text-emerald-300">6.25%</strong>
                    </div>
                    <div>
                      <span className="text-[8px] text-emerald-600 block">Peg Ratio</span>
                      <strong className="text-emerald-300">16,350 IDR</strong>
                    </div>
                    <div>
                      <span className="text-[8px] text-emerald-600 block">Trust index</span>
                      <strong className="text-emerald-400">85.0%</strong>
                    </div>
                  </div>
                </div>

              </div>

              {/* ACTION MATRIX */}
              <div className="p-5 rounded-2xl border border-emerald-900/40 bg-[#08150d]/50 backdrop-blur-md">
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-emerald-300 mb-3">Bridge Simulation Actions</h4>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      setShockSeverity(0.8);
                      setActiveTab('governor');
                      alert('Macro Stress Test Triggered! Shock severity set to 80%. Run a new simulation state to calculate equilibria.');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-950/30 border border-amber-500/20 text-amber-400 font-bold uppercase text-[10px] hover:bg-amber-950/50 transition-all cursor-pointer"
                  >
                    Trigger Macro Stress Test (80% Shock)
                  </button>
                  <button
                    onClick={() => {
                      setAutopilot(true);
                      setActiveTab('governor');
                      alert('Autonomous Stabilizer engaged. Sliders overridden for optimal equilibrium.');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-bold uppercase text-[10px] hover:bg-emerald-950/70 transition-all cursor-pointer"
                  >
                    Force Autopilot Alignment
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: ACADEMIC PROPOSAL (Daromir Rudnycky proposal framing) */}
          {activeTab === 'academic' && (
            <div className="space-y-6">
              
              {/* ACADEMIC OVERVIEW */}
              <div className="p-6 rounded-2xl border border-emerald-900/40 bg-[#08150d]/50 backdrop-blur-md space-y-3">
                <h3 className="text-lg font-bold text-emerald-400">Postdoctoral Proposal Strategy</h3>
                <p className="text-xs text-emerald-600 font-semibold">
                  Prepared for submission to <strong>Prof. Daromir Rudnyckyj</strong> (University of Victoria, Canada).
                </p>
                <div className="h-px bg-emerald-950/60 my-2"></div>
                <p className="text-xs text-emerald-200/90 leading-relaxed">
                  Prof. Rudnyckyj is a leading economic anthropologist focusing on the anthropology of money, neoliberalism, and Islamic capitalism (notably his book <em>Beyond Debt</em>). This dashboard demonstrates the transition from <strong>Institutional Trust</strong> (trust in centralized bank authorities) to <strong>Algorithmic Trust</strong> ($tp$) endogenized in a dynamic macroeconomic CBDC framework.
                </p>
              </div>

              {/* CORE EQUATIONS CARD */}
              <div className="p-5 rounded-2xl border border-emerald-900/40 bg-[#08150d]/50 backdrop-blur-md space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-emerald-300 border-b border-emerald-950 pb-2">
                  Theoretical GMAE Model Equations
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Equation 1 */}
                  <div className="bg-[#030905] border border-emerald-955/40 p-4 rounded-xl space-y-2">
                    <span className="text-[10px] text-emerald-500 font-bold uppercase">1. Algorithmic Trust Endogenization</span>
                    <div className="text-center py-4 bg-emerald-950/10 rounded-lg font-mono text-xs text-emerald-300">
                      T_t = (0.6 * tp_t) - (0.4 * lk_t) + (0.2 * α_t) - ε_t
                    </div>
                    <p className="text-[10px] text-emerald-600 leading-relaxed">
                      Trust ($T_t$) is calculated as a function of Algorithmic Transparency ($tp$), Institutional Leakage ($lk$), and Moral Alignment ($\alpha$) minus external macroeconomic shocks ($\epsilon$).
                    </p>
                  </div>

                  {/* Equation 2 */}
                  <div className="bg-[#030905] border border-emerald-955/40 p-4 rounded-xl space-y-2">
                    <span className="text-[10px] text-emerald-500 font-bold uppercase">2. Price Inflation Deviation</span>
                    <div className="text-center py-4 bg-emerald-950/10 rounded-lg font-mono text-xs text-emerald-300">
                      π_t = 2.0 + 15 * (1 - T_t)^2 + 8 * ε_t - 0.5 * (r_t - 3.5)
                    </div>
                    <p className="text-[10px] text-emerald-600 leading-relaxed">
                      Inflation ($\pi_t$) responds non-linearly to the collapse of trust ($T_t$). Autonomous stabilizers counter-cyclically adjust the policy rate ($r_t$) to restore target equilibria.
                    </p>
                  </div>
                </div>
              </div>

              {/* EMAIL DRAFTING TOOL */}
              <div className="p-5 rounded-2xl border border-emerald-900/40 bg-[#08150d]/50 backdrop-blur-md space-y-4">
                <div className="flex justify-between items-center border-b border-emerald-950 pb-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-emerald-300">
                    Canada Postdoc Outreach Email Draft
                  </h4>
                  <button
                    onClick={copyEmailToClipboard}
                    className="px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/35 text-emerald-400 font-bold uppercase text-[9px] transition-all cursor-pointer"
                  >
                    {emailCopied ? 'COPIED TO CLIPBOARD!' : 'COPY EMAIL DRAFT'}
                  </button>
                </div>

                <div className="bg-[#030904] border border-emerald-950 rounded-xl p-4 font-mono text-[11px] text-emerald-400/90 leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-96">
{`Subject: Visiting Researcher / Postdoctoral Inquiry: Algorithmic Trust in Digital Currencies (GMAE Framework)

Dear Professor Rudnyckyj,

I hope this email finds you well. 

Having followed your pioneering work on the anthropology of finance and new monetary commons (specifically "Beyond Debt"), I am writing to share a dynamic general equilibrium framework I have developed, titled "Algorithmic Trust and the Future of Money: A Dynamic General Equilibrium Framework for AI-Governed Digital Currencies."

My research introduces the General Moral-Algorithmic Equilibrium (GMAE), which treats trust as an endogenous variable shaped by algorithmic transparency (tp), leakage (lk), and societal moral preferences (alpha). 

To complement the theoretical paper, I have built an interactive, autonomous Central Bank Dashboard simulating these dynamics under economic stress tests (Standard Mode vs. Autonomous Stability Protocol) backed by a PostgreSQL cloud ledger database. I would be honored if you could interact with the live dashboard here: ${typeof window !== 'undefined' ? window.location.origin : 'https://gmae-frontend.vercel.app'}

I am highly interested in pursuing postdoctoral research under your supervision at the University of Victoria, exploring how digital currencies reformulate institutional legitimacy in Southeast Asia. I am prepared to apply for co-funded fellowships like Mitacs Elevate or SSHRC.

I look forward to the possibility of discussing this further.

Sincerely,
Arva Athallah Susanto`}
                </div>
              </div>

              {/* ROADMAP TIMELINE */}
              <div className="p-5 rounded-2xl border border-emerald-900/40 bg-[#08150d]/50 backdrop-blur-md space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-emerald-300 border-b border-emerald-950 pb-2">
                  Canada Research Integration Roadmap
                </h4>

                <div className="space-y-4 text-xs">
                  <div className="flex items-start space-x-3">
                    <div className="h-5 w-5 bg-emerald-950 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center font-bold text-[10px]">1</div>
                    <div>
                      <h5 className="font-bold text-emerald-250">Academic Contact & Live Prototipe Demo</h5>
                      <p className="text-[11px] text-emerald-600 font-medium">Send email draft with this live Vercel link. Let the supervisor run macroeconomic scenarios.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="h-5 w-5 bg-emerald-950 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center font-bold text-[10px]">2</div>
                    <div>
                      <h5 className="font-bold text-emerald-250">Kanada Funding Proposal (Mitacs Elevate)</h5>
                      <p className="text-[11px] text-emerald-600 font-medium">Coordinate a postdoctoral proposal targeting SSHRC Fellowship or Mitacs Elevate for UVic research funding.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="h-5 w-5 bg-emerald-950 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center font-bold text-[10px]">3</div>
                    <div>
                      <h5 className="font-bold text-emerald-250">Real-Time Data Integration</h5>
                      <p className="text-[11px] text-emerald-600 font-medium">Connect parameters to real world APIs (BIS, IMF, and regional sandbox indicators) to run real-world comparisons.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* FOOTER */}
        <footer className="border-t border-emerald-950/80 bg-[#050e08] py-4 text-center text-[10px] text-emerald-600 font-semibold">
          GMAE Protocol Controller Dashboard. Powered by AWS Neon DB Cloud. Built for academic proposal submission to Prof. Daromir Rudnyckyj (University of Victoria).
        </footer>

      </main>

    </div>
  );
}
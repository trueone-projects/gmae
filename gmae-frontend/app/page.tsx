'use client';

import Link from 'next/link';

interface FeatureCardProps {
  title: string;
  badge: string;
  desc: string;
}

function FeatureCard({ title, badge, desc }: FeatureCardProps) {
  return (
    <div className="p-6 rounded-2xl bg-white border border-[#e1e2da] text-left hover:border-[#023547]/20 transition-all flex flex-col justify-between space-y-4">
      <div>
        <div className="flex justify-between items-center">
          <h3 className="text-base font-extrabold text-[#023547]">{title}</h3>
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#f4f4f0] text-[#536877] border border-[#e1e2da]/60">
            {badge}
          </span>
        </div>
        <p className="text-xs text-[#536877] font-medium leading-relaxed mt-3">{desc}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#fbfbf9] text-[#023547] font-sans antialiased">
      
      {/* HEADER NAVIGATION */}
      <header className="h-20 border-b border-[#e1e2da] bg-white flex items-center justify-between px-4 sm:px-8 md:px-16 z-30">
        <div className="flex items-center space-x-2 sm:space-x-3.5">
          <div className="h-9 w-9 rounded-lg bg-[#023547] flex items-center justify-center font-bold text-white text-base">
            Ω
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black tracking-widest text-[#023547] uppercase leading-none">GMAE</h1>
            <span className="hidden sm:block text-[9px] text-[#536877] font-bold uppercase tracking-widest mt-1">General Moral-Algorithmic Equilibrium</span>
          </div>
        </div>

        <div>
          <Link href="/engine" className="px-3 py-2 sm:px-5 sm:py-2.5 bg-[#023547] hover:bg-[#064e65] text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-sm whitespace-nowrap">
            <span className="inline sm:hidden">Buka Engine</span>
            <span className="hidden sm:inline">Buka Engine Dashboard</span>
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 md:py-24 max-w-4xl mx-auto space-y-8">
        <div className="space-y-4">
          <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-[#008082]/10 text-[#008082] border border-[#008082]/20">
            Theoretical Framework & Simulator
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-[#023547] leading-tight max-w-3xl">
            General Moral-Algorithmic Equilibrium (GMAE)
          </h2>
          <p className="text-base md:text-lg text-[#536877] font-medium max-w-2xl mx-auto leading-relaxed">
            Memahami masa depan uang dan mata uang digital bank sentral (CBDC) melalui pemodelan dinamis yang menyelaraskan arsitektur moral sosial dan kepatuhan algoritmik.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/engine" className="px-8 py-4 bg-[#023547] hover:bg-[#064e65] text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md">
            Buka Dashboard Engine →
          </Link>
          <a
            href="https://github.com/trueone-projects/gmae"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 bg-white border border-[#e1e2da] hover:bg-[#f4f4f0]/60 text-[#023547] text-xs font-black uppercase tracking-widest rounded-xl transition-all"
          >
            GitHub Repository
          </a>
        </div>
      </section>

      {/* FEATURE CARD GRID */}
      <section className="bg-white border-y border-[#e1e2da] py-16 px-6 md:px-16">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#008082]">Features Grid</h3>
            <h4 className="text-2xl font-bold text-[#023547]">Pilar Arsitektur GMAE</h4>
            <p className="text-xs text-[#536877] font-semibold max-w-md mx-auto">
              Fitur utama yang menerjemahkan model teoretis paper menjadi mesin komputasi interaktif.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard 
              title="Endogenous Trust Engine" 
              badge="Model Dinamis" 
              desc="Kepercayaan publik bukan lagi variabel statis berasumsi. GMAE memodelkan kepercayaan (T_t) sebagai variabel keadaan dinamis yang berevolusi secara real-time berdasarkan tingkat transparansi, performa, dan kebocoran institusional."
            />
            <FeatureCard 
              title="AI-Governed Policy Function" 
              badge="Otonom PID" 
              desc="Simulasi kebijakan moneter otonom yang digerakkan oleh kecerdasan buatan. Mengunci variabel moneter optimal dan menyesuaikan suku bunga kebijakan serta emisi suplai uang secara counter-cyclical terhadap guncangan makro."
            />
            <FeatureCard 
              title="Moral-Algorithmic Coherence" 
              badge="Utility Peg" 
              desc="Integrasi parameter moral preferensi sosial (α) ke dalam fungsi utilitas moneter digital. Menghubungkan konsensus moral masyarakat dengan parameter pemrograman ledger untuk menjamin stabilitas struktural."
            />
            <FeatureCard 
              title="Stability Regime Analysis" 
              badge="Matriks Jacobian" 
              desc="Menghitung matriks Jacobian, Trace, dan Determinant sistem dinamis 2D secara real-time. Memvisualisasikan ekuilibrium eigen untuk memprediksi transisi fase antara Stable Algorithmic Regime dan Moral Collapse."
            />
            <FeatureCard 
              title="Real-Time Sensitivity Tuning" 
              badge="Oracle Feed" 
              desc="Modulasi parameter sensitivitas makro secara instan. Menilai ketahanan moneter terhadap guncangan komoditas dunia seperti pergerakan harga minyak mentah (Oil shock) dan cadangan nilai emas spot global."
            />
          </div>
        </div>
      </section>

      {/* FOOTER & ACADEMIC DOCUMENT LINK */}
      <footer className="border-t border-[#e1e2da] bg-white py-10 px-8 text-center text-xs text-[#536877] space-y-4">
        <p className="font-medium">
          Kerangka Kerja GMAE — Prototipe Ekuilibrium Dinamis Uang Algoritmik.
        </p>
        <div className="flex justify-center space-x-6">
          <a 
            href="/docs/algorithmic_trust.pdf" 
            className="font-bold text-[#023547] hover:underline flex items-center space-x-1"
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Unduh Paper PDF (Algorithmic Trust and the Future of Money)</span>
          </a>
        </div>
        <p className="text-[10px] text-[#536877]/80 font-mono">
          Developed for Academic Proposal under Prof. Daromir Rudnyckyj (UVic, Canada) // Powered by Neon AWS PostgreSQL Cloud Ledger
        </p>
      </footer>

    </div>
  );
}
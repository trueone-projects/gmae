'use client';

import { useState } from 'react';
import Link from 'next/link';

interface AccordionProps {
  question: string;
  answer: string;
}

function FAQAccordion({ question, answer }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-[#e1e2da] py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left text-sm font-extrabold text-[#023547] hover:text-[#008082] transition-colors focus:outline-none"
      >
        <span>{question}</span>
        <span className="ml-4 text-xs font-mono text-[#536877]">
          {isOpen ? '[ - ]' : '[ + ]'}
        </span>
      </button>
      <div
        className={`mt-2 text-xs text-[#536877] font-medium leading-relaxed overflow-hidden transition-all duration-355 ${
          isOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="pt-1">{answer}</p>
      </div>
    </div>
  );
}

export default function PaperReviewPage() {
  const faqs = [
    {
      question: "How does algorithmic transparency influence monetary stability in AI-governed systems?",
      answer: "The study reveals that higher algorithmic transparency enhances compliance and reduces liquidity volatility, thus increasing financial stability. Specifically, perceived improvements in transparency can stimulate algorithmic trust elasticity, significantly benefiting overall monetary resilience during economic shocks."
    },
    {
      question: "What role do moral preferences play in digital currency's economic dynamics?",
      answer: "Moral preferences are identified as crucial structural components, impacting liquidity and compliance in digital economies. In societies with strong moral capital, ethical constraints enhance trust, whereas coercive perceptions lead to decreased legitimacy, ultimately affecting economic stability."
    },
    {
      question: "When did central banks begin exploring programmable digital currencies?",
      answer: "Over 130 central banks worldwide have started exploring CBDCs with programmability since 2023, indicating a significant shift in monetary governance. This movement towards programmable money integrates algorithmic rules that are responsive to macroeconomic signals."
    },
    {
      question: "What defines the General Moral-Algorithmic Equilibrium (GMAE) framework?",
      answer: "GMAE integrates algorithmic trust, institutional integrity, and societal moral preferences into a dynamic equilibrium model. This framework posits that stability in digital economies emerges from the co-evolution of these factors rather than traditional economic fundamentals alone."
    },
    {
      question: "How do macroeconomic shocks emerge in algorithmically governed monetary systems?",
      answer: "Crises can arise from factors such as algorithmic opacity and ethical misalignment, rather than solely from economic shocks. The framework illustrates that trust dynamics can lead to dual equilibria: a stable, high-trust environment or an unstable, low-trust regime."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#fbfbf9] text-[#023547] font-sans antialiased">
      
      {/* HEADER NAVIGATION */}
      <header className="h-20 border-b border-[#e1e2da] bg-white flex items-center justify-between px-4 sm:px-8 md:px-16 z-30">
        <div className="flex items-center space-x-2 sm:space-x-6">
          <div className="flex items-center space-x-2 sm:space-x-3.5">
            <div className="h-9 w-9 rounded-lg bg-[#023547] flex items-center justify-center font-bold text-white text-base">
              Ω
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-black tracking-widest text-[#023547] uppercase leading-none">GMAE</h1>
              <span className="text-[9px] text-[#536877] font-bold uppercase tracking-widest mt-1 hidden sm:block">Academic Review</span>
            </div>
          </div>
          <Link href="/" className="text-[9px] sm:text-[10px] uppercase font-bold text-[#536877] hover:text-[#023547] border border-[#e1e2da] px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[#f4f4f0]/40 transition-colors whitespace-nowrap">
            ← Kembali ke Beranda
          </Link>
        </div>

        <div>
          <Link href="/engine" className="px-3 py-2 sm:px-5 sm:py-2.5 bg-[#023547] hover:bg-[#064e65] text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-sm whitespace-nowrap">
            <span className="inline sm:hidden">Buka Engine</span>
            <span className="hidden sm:inline">Buka Engine Dashboard</span>
          </Link>
        </div>
      </header>

      {/* ARTICLE WRAPPER */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT MAIN ARTICLE COLUMN */}
        <article className="lg:col-span-8 space-y-8 bg-white border border-[#e1e2da] p-6 md:p-10 rounded-2xl shadow-sm">
          
          {/* HEADER INFO */}
          <div className="space-y-4 border-b border-[#e1e2da] pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-mono font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-[#008082]/10 text-[#008082] border border-[#008082]/20">
                Theoretical Paper Review
              </span>
              <span className="text-[9px] font-mono font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-[#f4f4f0] text-[#536877] border border-[#e1e2da]/60">
                Published: 2025
              </span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-black text-[#023547] leading-tight">
              Algorithmic Trust and the Future of Money: A Dynamic General Equilibrium Framework for AI-Governed Digital Currencies
            </h1>
            
            <div className="flex items-center space-x-3.5 pt-2">
              <div className="h-8 w-8 rounded-full bg-[#f4f4f0] border border-[#e1e2da] flex items-center justify-center font-bold text-xs text-[#023547]">
                AS
              </div>
              <div>
                <p className="text-xs font-black text-[#023547]">Arva Athallah Susanto</p>
                <p className="text-[10px] text-[#536877] font-semibold">Dalhousie University // Visiting Graduate Research Student</p>
              </div>
            </div>
          </div>

          {/* ABSTRACT */}
          <div className="p-5 rounded-xl bg-[#f4f4f0]/40 border border-[#e1e2da] space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#023547]">Abstract</h2>
            <p className="text-xs text-[#536877] font-medium leading-relaxed text-justify">
              This paper develops a new theoretical framework for understanding the future of money in an economy where artificial intelligence, institutional governance, and moral preferences jointly shape monetary stability. We introduce the General Moral-Algorithmic Equilibrium (GMAE), a dynamic general equilibrium model in which digital money operates as a programmable computational object governed by an AI-based policy function. Unlike traditional monetary frameworks where trust is implicit and money is passive, our model treats trust as an endogenous state variable, evolving through transparency, algorithmic performance, and institutional leakage. We show that macroeconomic stability in AI-mediated monetary systems depends not only on economic fundamentals but on the moral-algorithmic architecture underlying digital currency design. High transparency, ethical programmability, and low leakage generate a stable high-trust equilibrium with dampened volatility. Conversely, opacity, coercive programmability, or algorithmic overreaction produce instability, dual equilibria, or trust collapse—even absent economic shocks. Policy simulations demonstrate that AI-governed digital money can outperform conventional rules when aligned with societal values but becomes a source of systemic risk when moral alignment fails. Our findings imply that the future of money will be shaped as much by algorithmic legitimacy and moral capital as by traditional macroeconomic instruments. GMAE offers a unified foundation for designing safe, transparent, and ethically coherent digital monetary institutions.
            </p>
          </div>

          {/* MAIN SECTIONS */}
          <div className="space-y-6 text-xs text-[#536877] font-medium leading-relaxed">
            
            {/* SECTION 1 */}
            <section className="space-y-3">
              <h3 className="text-sm font-black text-[#023547] uppercase tracking-wide border-b border-[#e1e2da]/60 pb-1.5">
                I. Pengantar & Pergeseran Kepercayaan (Demystifying Monetary Commons)
              </h3>
              <p className="text-justify">
                Riset ini menjembatani dua kutub pemikiran yang seringkali terpisah: <strong>antropologi ekonomi tentang uang</strong> (seperti teori <em>monetary commons</em> dan legitimasi institusional oleh Prof. Daromir Rudnyckyj) dan <strong>makroekonomi kuantitatif modern</strong>. Penulis berpendapat bahwa uang digital, khususnya <em>Central Bank Digital Currency</em> (CBDC), bukan sekadar alat transaksi yang efisien, melainkan perubahan mendasar dalam struktur kepercayaan masyarakat. 
              </p>
              <p className="text-justify">
                Dalam sistem fiat tradisional, kepercayaan publik dialamatkan secara buta kepada institusi manusia (Bank Sentral). Pada sistem GMAE, kepercayaan dialihkan menjadi <strong>Algorithmic Trust</strong> yang diprogram secara eksplisit dan dipantau secara transparan oleh publik, mendemokratisasikan pembuatan kebijakan moneter dari ruang rapat tertutup menjadi ledger komputasi publik.
              </p>
            </section>

            {/* SECTION 2 */}
            <section className="space-y-3">
              <h3 className="text-sm font-black text-[#023547] uppercase tracking-wide border-b border-[#e1e2da]/60 pb-1.5">
                II. Kerangka Kerja Matematis GMAE (The Core Equations)
              </h3>
              <p className="text-justify">
                GMAE memformulasikan tingkat Kepercayaan Publik ($T_t$) sebagai variabel keadaan dinamis (<em>endogenous state variable</em>) yang berevolusi berdasarkan persamaan diferensial diskret berikut:
              </p>
              <div className="my-4 p-4 rounded-xl bg-[#f4f4f0]/40 border border-[#e1e2da] font-mono text-[10px] text-[#023547] overflow-x-auto">
                {"T_{t+1} = \\theta_1 T_t + \\theta_2 \\cdot tp - \\theta_3 \\cdot lk + \\theta_4 \\cdot \\alpha - \\sigma_t \\cdot \\text{Shock}"}
              </div>
              <p className="text-justify">
                Dimana parameter pembentuknya didefinisikan sebagai:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>Transparency ($tp$)</strong>: Tingkat keterbukaan kode pemrograman, audit algoritma emisi uang, dan keterbukaan operasional ledger.</li>
                <li><strong>Leakage ($lk$)</strong>: Kerentanan keamanan, penyalahgunaan wewenang kontrol ledger, korupsi kelembagaan, atau inflasi liar.</li>
                <li><strong>Moral Alignment ($\alpha$)</strong>: Keselarasan aturan terprogram (misalnya pembatasan penggunaan, kriteria kepatuhan hijau) dengan konsensus nilai etis & norma sosial masyarakat.</li>
              </ul>
            </section>

            {/* SECTION 3 */}
            <section className="space-y-3">
              <h3 className="text-sm font-black text-[#023547] uppercase tracking-wide border-b border-[#e1e2da]/60 pb-1.5">
                III. Analisis Regim Stabilitas & Kolaps Moral (Stability Regimes)
              </h3>
              <p className="text-justify">
                Melalui kalkulasi <strong>Matriks Jacobian 2D</strong>, model membuktikan keberadaan regim keseimbangan ganda (<em>dual equilibria</em>). Jika tingkat transparansi berada di bawah batas kritis ($tp &lt; tp^*$) atau tingkat kebocoran terlalu tinggi ($lk &gt; lk^*$), sistem akan bergeser dari <em>High-Trust Stability Regime</em> menuju <strong>Moral-Algorithmic Collapse Regime</strong>.
              </p>
              <p className="text-justify">
                Pada regim kolaps ini, kepatuhan masyarakat hancur, likuiditas moneter menyusut drastis, dan inflasi melonjak secara eksponensial. Menariknya, kolaps ini dapat terjadi murni akibat hilangnya legitimasi algoritma (etika pemrograman uang yang opresif atau buruk) bahkan tanpa adanya guncangan ekonomi eksternal sekalipun.
              </p>
            </section>

            {/* SECTION 4 */}
            <section className="space-y-3">
              <h3 className="text-sm font-black text-[#023547] uppercase tracking-wide border-b border-[#e1e2da]/60 pb-1.5">
                IV. Kebijakan Moneter Otonom (AI-Governed Autopilot)
              </h3>
              <p className="text-justify">
                Sebagai solusi penyeimbang, paper menyimulasikan <strong>AI-Governed Policy Function</strong> yang berfungsi sebagai pengendali umpan balik aktif (<em>Proportional-Integral-Derivative Controller</em>). Sistem otonom ini secara dinamis menyetel tingkat suku bunga kebijakan ($r_t$) dan suplai uang ($M_t$) secara instan berdasarkan sinyal sensor inflasi ($\pi_t$) dan kepercayaan publik ($T_t$). 
              </p>
              <p className="text-justify">
                Hasil simulasi menunjukkan bahwa kebijakan otonom berbasis AI mampu menstabilkan volatilitas siklus ekonomi lebih cepat dibanding aturan statis (seperti Taylor Rule konvensional), asalkan parameter moral alignment ($\alpha$) terkunci secara sinkron di tingkat tinggi.
              </p>
            </section>

          </div>

          {/* FAQS */}
          <div className="space-y-4 pt-6 border-t border-[#e1e2da]">
            <h3 className="text-base font-black text-[#023547] uppercase tracking-wider">
              Pertanyaan Umum & Jawaban Kunci (FAQs)
            </h3>
            <div className="divide-y divide-[#e1e2da]">
              {faqs.map((faq, idx) => (
                <FAQAccordion key={idx} question={faq.question} answer={faq.answer} />
              ))}
            </div>
          </div>

        </article>

        {/* RIGHT METADATA SIDEBAR COLUMN */}
        <aside className="lg:col-span-4 space-y-6">
          
          {/* CITATION CARD */}
          <div className="p-6 rounded-2xl bg-white border border-[#e1e2da] space-y-4 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#008082] border-b border-[#e1e2da] pb-2">
              Metadata Publikasi
            </h3>
            
            <dl className="space-y-3.5 text-xs">
              <div>
                <dt className="text-[9px] uppercase font-bold text-[#536877] tracking-wider">Judul Lengkap</dt>
                <dd className="text-xs font-extrabold text-[#023547] mt-1 leading-snug">
                  Algorithmic Trust and the Future of Money: A Dynamic General Equilibrium Framework for AI-Governed Digital Currencies
                </dd>
              </div>

              <div>
                <dt className="text-[9px] uppercase font-bold text-[#536877] tracking-wider">Penulis</dt>
                <dd className="text-xs font-bold text-[#023547] mt-1">Arva Athallah Susanto</dd>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-[9px] uppercase font-bold text-[#536877] tracking-wider">Tahun Terbit</dt>
                  <dd className="text-xs font-bold text-[#023547] mt-0.5">2025</dd>
                </div>
                <div>
                  <dt className="text-[9px] uppercase font-bold text-[#536877] tracking-wider">Jumlah Halaman</dt>
                  <dd className="text-xs font-bold text-[#023547] mt-0.5">22 Halaman</dd>
                </div>
              </div>

              <div>
                <dt className="text-[9px] uppercase font-bold text-[#536877] tracking-wider">Afiliasi Riset</dt>
                <dd className="text-xs font-semibold text-[#536877] mt-1">
                  Dalhousie University // Visiting Graduate Research Student (Canada)
                </dd>
              </div>

              <div>
                <dt className="text-[9px] uppercase font-bold text-[#536877] tracking-wider">Fokus Kajian</dt>
                <dd className="text-xs font-semibold text-[#536877] mt-1">
                  Macroeconomics, Monetary Economics, Machine Ethics, Central Bank Digital Currency (CBDC)
                </dd>
              </div>
            </dl>
          </div>

          {/* SOCIAL INTERACTION CARD */}
          <div className="p-6 rounded-2xl bg-white border border-[#e1e2da] space-y-4 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#023547] border-b border-[#e1e2da] pb-2">
              Unduh & Tinjauan Asli
            </h3>
            <p className="text-xs text-[#536877] font-medium leading-relaxed">
              Anda dapat membaca ulasan publikasi penuh atau mengunduh draf proposal akademik yang terdaftar di repositori eksternal Academia:
            </p>
            <a
              href="https://www.academia.edu/144812132/Algorithmic_Trust_and_the_Future_of_Money_A_Dynamic_General_Equilibrium_Framework_for_AI_Governed_Digital_Currencies"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center px-4 py-3 bg-[#023547] hover:bg-[#064e65] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm"
            >
              Unduh Paper Asli (Academia.edu)
            </a>
          </div>

        </aside>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#e1e2da] bg-white py-10 px-8 text-center text-xs text-[#536877] space-y-2">
        <p className="font-medium">
          Kerangka Kerja GMAE — Prototipe Ekuilibrium Dinamis Uang Algoritmik.
        </p>
        <p className="text-[10px] text-[#536877]/80 font-mono">
          Developed for Academic Proposal under Prof. Daromir Rudnyckyj (UVic, Canada) // Powered by Neon AWS PostgreSQL Cloud Ledger
        </p>
      </footer>

    </div>
  );
}

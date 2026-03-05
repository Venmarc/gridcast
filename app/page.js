import LiveDashboard from '@/components/LiveDashboard';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6 md:p-12 font-sans selection:bg-blue-500/30">

      <div className="max-w-7xl mx-auto space-y-8 pb-12 flex flex-col min-h-[90vh]">

        <header className="space-y-2">
          <h1 className="group cursor-pointer w-fit text-4xl md:text-5xl font-extrabold tracking-tight flex items-center gap-3">
            <Image
              src="/icon.svg"
              alt="GridCast Logo"
              width={48}
              height={48}
              className="rounded-xl drop-shadow-sm transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] group-hover:-translate-y-1"
            />
            <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent transition-all duration-300 group-hover:drop-shadow-[0_0_12px_rgba(52,211,153,0.2)]">
              GridCast
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
            Correlating real-time electrical grid demand with local weather conditions across the US.
          </p>
        </header>

        <section className="flex-1 w-full mb-12">
          <LiveDashboard />
        </section>

        <footer className="w-full flex flex-col md:flex-row items-center justify-between border-t border-slate-800 pt-6 text-slate-400 text-sm gap-4">
          <p>Copyright © GridCast 2026. All rights reserved.</p>
          <a
            href="mailto:venmarc@protonmail.com?subject=Inquiry from GridCast"
            className="flex items-center gap-2 hover:text-blue-400 transition-colors"
          >
            <svg xmlns="http://www.w3.org/-2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2"></rect>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
            </svg>
            Email Us
          </a>
        </footer>

      </div>

    </main>
  );
}

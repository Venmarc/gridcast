"use client";

import LiveDashboard from '@/components/LiveDashboard';
import DynamicHeader from '@/components/DynamicHeader';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function Home() {
  const [heroOpacity, setHeroOpacity] = useState(1);

  useEffect(() => {
    const heroSection = document.getElementById('hero');
    if (!heroSection) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      // Simple fade out calculation based on scroll depth
      const newOpacity = Math.max(0, 1 - (scrollY / 250));
      setHeroOpacity(newOpacity);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-6 md:px-12 pt-0 pb-6 md:pb-12 font-sans selection:bg-blue-500/30">

      <div className="max-w-7xl mx-auto pb-12 flex flex-col min-h-[90vh]">

        <DynamicHeader />

        <section id="hero" className="pb-10 pt-2 md:pt-4 w-full relative z-10 flex flex-col justify-center min-h-[50vh]">
          <div
            style={{ opacity: heroOpacity, transform: `scale(${Math.max(0.95, heroOpacity)})` }}
            className="group cursor-pointer w-fit font-extrabold tracking-tight flex items-center gap-3 mb-10 pt-0 transition-all duration-75 ease-out origin-left"
          >
            <Image
              src="/icon.svg"
              alt="GridCast Logo"
              width={48}
              height={48}
              priority
              className="rounded-xl drop-shadow-sm transition-all duration-500 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] group-hover:-translate-y-1"
            />
            <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent transition-all duration-500 group-hover:drop-shadow-[0_0_16px_rgba(52,211,153,0.3)] text-4xl md:text-5xl">
              GridCast
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-50 max-w-4xl leading-tight">
            Visualizing the Impact of Weather <br className="hidden md:block" /> on the <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Power Grid.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-3xl leading-relaxed mt-6 font-medium">
            A high-performance command center analyzing live telemetry across major US energy regions. Monitor environmental stressors and power consumption in real-time.
          </p>
        </section>

        <section className="flex-1 w-full mb-12">
          <LiveDashboard />
        </section>

        {/* Architecture Details Box */}
        <section id="about" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-12 pt-8 mt-4 scroll-mt-24">
          <div className="bg-slate-900/50 border border-slate-800/50 p-6 rounded-2xl flex flex-col gap-3 shadow-lg">
            <h3 className="text-slate-200 font-bold tracking-tight flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Dual-Pipeline APIs
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              GridCast continuously aggregates real-world data by orchestrating two distinct pipelines: fetching localized weather telemetry from the OpenWeatherMap API, while simultaneously pulling localized electrical load metrics directly from the US Energy Information Administration (EIA) databases.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/50 p-6 rounded-2xl flex flex-col gap-3 shadow-lg">
            <h3 className="text-slate-200 font-bold tracking-tight flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              SSE Streaming
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              To maintain a high-performance, real-time connection without the heavy overhead of long-polling or full WebSockets, the dashboard maintains a persistent, zero-latency Server-Sent Events (SSE) connection to the Node backend. This unidirectional stream pushes highly-optimized data packets directly to the client every 2 seconds.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/50 p-6 rounded-2xl flex flex-col gap-3 shadow-lg">
            <h3 className="text-slate-200 font-bold tracking-tight flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              Chart.js Engine
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Incoming data is instantly consumed and rendered using a strictly locked Chart.js environment. By overriding dynamic HTML canvas scaling, the charts provide a stable, zero-jitter visualization of environment temperature relative to MW grid demand, regardless of micro-fluctuations in the data stream.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/50 p-6 rounded-2xl flex flex-col gap-3 shadow-lg">
            <h3 className="text-slate-200 font-bold tracking-tight flex items-center gap-2">
              <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Anomaly Engine
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              GridCast isn't just a passive monitor—it actively tracks baseline grid states. If the client-side logic detects a sudden temperature deviation (±5°F) or abnormal power draw, the dashboard triggers an immediate cross-regional alert, pushing the logic directly into the Notification Bell feed and generating a transient UI Toast.
            </p>
          </div>
        </section>

        <footer id="contact" className="w-full flex flex-col md:flex-row items-center justify-between border-t border-slate-800 pt-6 text-slate-400 text-sm gap-4 scroll-mt-24">
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

import LiveDashboard from '@/components/LiveDashboard';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6 md:p-12 font-sans selection:bg-blue-500/30">

      <div className="max-w-7xl mx-auto space-y-8 pb-12">

        <header className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">GridCast</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
            Correlating real-time electrical grid demand with local weather conditions across the US.
          </p>
        </header>

        <section className="h-[75vh] w-full mb-12">
          <LiveDashboard />
        </section>

      </div>

    </main>
  );
}

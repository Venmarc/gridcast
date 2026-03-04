import React from 'react';

/**
 * AlertFeed Component
 * Displays a terminal-style scrolling list of real-time anomalies.
 * 
 * @param {Array} alerts - Array of alert objects: { id, timestamp, type ('GRID' | 'TEMP'), message, severity }
 */
export default function AlertFeed({ alerts }) {
    return (
        <div className="flex flex-col h-full bg-slate-900 rounded-xl shadow-2xl border border-slate-700/50 backdrop-blur-md overflow-hidden">
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/50">
                <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Live System Alerts
                </h3>
                <span className="text-xs font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded">
                    {alerts.length} EVENT{alerts.length !== 1 && 'S'}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent min-h-[min(500px, 50vh)] max-h-[500px]">
                {alerts.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 gap-2 opacity-70">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        System stable. Monitoring data stream...
                    </div>
                ) : (
                    alerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`p-3 rounded-lg border flex flex-col gap-1 transition-all ${alert.type === 'GRID'
                                    ? 'bg-amber-950/20 border-amber-500/30 text-amber-400'
                                    : 'bg-blue-950/20 border-blue-500/30 text-blue-400'
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <span className="font-bold tracking-wider text-xs opacity-90">
                                    [{alert.type} ANOMALY]
                                </span>
                                <span className="text-xs text-slate-500">
                                    {new Date(alert.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                            <p className="text-slate-300 mt-1 leading-relaxed">
                                {alert.message}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

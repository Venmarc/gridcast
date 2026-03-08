import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * AlertPopup Component
 * Displays a toast notification in the top right for 30 seconds.
 */
export default function AlertPopup({ alert, onClose, onAlertClick }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (alert) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(onClose, 500); // Allow fade out animation before fully removing
            }, 30000); // 30 seconds

            return () => clearTimeout(timer);
        }
    }, [alert, onClose]);

    if (!alert) return null;

    const isTemp = alert.type === 'TEMP';

    const content = (
        <div className="fixed inset-0 z-[9999] pointer-events-none flex justify-center">
            <div className="max-w-7xl w-full px-6 md:px-12 relative flex justify-end items-start pt-20 md:pt-28">
                <div
                    className={`pointer-events-auto transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] transform 
                        ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'}
                        max-w-sm md:max-w-md w-full`}
                >
                    <div
                        onClick={() => {
                            onAlertClick(alert.regionId);
                            setIsVisible(false);
                            setTimeout(onClose, 500);
                        }}
                        className={`group p-4 rounded-2xl border-2 flex flex-col gap-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl cursor-pointer hover:scale-[1.02] transition-all duration-300 ${isTemp
                            ? 'bg-amber-950/40 border-amber-500/50 hover:border-amber-400'
                            : 'bg-blue-950/40 border-blue-500/50 hover:border-blue-400'
                            }`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className={`relative flex items-center justify-center`}>
                                    <span className={`absolute h-3 w-3 rounded-full animate-ping opacity-75 ${isTemp ? 'bg-amber-400' : 'bg-blue-400'}`}></span>
                                    <span className={`relative h-2.5 w-2.5 rounded-full ${isTemp ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                                </div>
                                <span className={`font-black tracking-[0.1em] text-[10px] uppercase ${isTemp ? 'text-amber-400' : 'text-blue-400'}`}>
                                    {alert.type} System Alert
                                </span>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsVisible(false);
                                    setTimeout(onClose, 500);
                                }}
                                className={`p-1 -mr-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex flex-col">
                            <div className="text-base font-bold text-white group-hover:text-blue-50 transition-colors">
                                {alert.regionId} Data Irregularity
                            </div>
                            <p className="text-slate-300 text-xs leading-relaxed mt-1 line-clamp-2">
                                {alert.message}
                            </p>
                        </div>

                        <div className="flex items-center justify-between mt-1 pt-2 border-t border-white/5">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                Telemetry Pulse Detected
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-950/50 px-2 py-0.5 rounded">
                                {new Date(alert.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Render into body to ensure it's always on top of EVERYTHING
    return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}

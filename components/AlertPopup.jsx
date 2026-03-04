import React, { useEffect, useState } from 'react';

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

    const isGrid = alert.type === 'GRID';

    return (
        <div
            className={`fixed top-6 right-6 z-50 transition-all duration-500 transform ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'} max-w-sm w-full`}
        >
            <div
                onClick={() => {
                    onAlertClick(alert.regionId);
                    setIsVisible(false);
                    setTimeout(onClose, 500);
                }}
                className={`p-4 rounded-xl border flex flex-col gap-2 shadow-2xl backdrop-blur-md cursor-pointer hover:scale-105 transition-transform ${isGrid
                        ? 'bg-amber-950/90 border-amber-500 text-amber-400'
                        : 'bg-blue-950/90 border-blue-500 text-blue-400'
                    }`}
            >
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full animate-pulse ${isGrid ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                        <span className="font-bold tracking-wider text-sm">
                            {alert.type} ANOMALY DETECTED
                        </span>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsVisible(false);
                            setTimeout(onClose, 500);
                        }}
                        className={`text-slate-400 hover:text-white transition-colors`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                </div>

                <div className="text-sm font-semibold text-white/90">
                    Region: {alert.regionId}
                </div>
                <p className="text-slate-200 text-sm leading-relaxed font-mono mt-1">
                    {alert.message}
                </p>
                <div className="text-xs text-slate-400/80 text-right mt-1">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
}

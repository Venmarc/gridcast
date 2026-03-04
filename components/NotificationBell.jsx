import React, { useState, useEffect, useRef } from 'react';

/**
 * NotificationBell Component
 * Displays a bell with a badge for alerts from the last hour.
 */
export default function NotificationBell({ alerts, onAlertClick }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Filter alerts from the last hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentAlerts = alerts.filter(a => new Date(a.timestamp).getTime() > oneHourAgo);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700/50 text-slate-300 focus:outline-none"
                title="System Alerts History"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>

                {recentAlerts.length > 0 && (
                    <span className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3 flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-rose-500 text-[10px] font-bold text-white items-center justify-center border-2 border-slate-900 leading-none">
                            {recentAlerts.length > 99 ? '99+' : recentAlerts.length}
                        </span>
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 lg:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
                    <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                        <h4 className="font-semibold text-slate-200">Recent Alerts (Last Hour)</h4>
                        <span className="text-xs text-slate-500">{recentAlerts.length} total</span>
                    </div>

                    <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                        {recentAlerts.length === 0 ? (
                            <div className="p-6 text-center text-slate-500 text-sm">
                                <p>System stable.</p>
                                <p>No anomalies detected in the past hour.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {recentAlerts.map((alert) => (
                                    <div
                                        key={alert.id}
                                        onClick={() => {
                                            onAlertClick(alert.regionId);
                                            setIsOpen(false);
                                        }}
                                        className={`p-4 border-b border-slate-800/50 cursor-pointer transition-colors hover:bg-slate-800 flex flex-col gap-1 ${alert.type === 'GRID'
                                            ? 'border-l-4 border-l-amber-500'
                                            : 'border-l-4 border-l-blue-500'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                                            <span className={`font-bold ${alert.type === 'GRID' ? 'text-amber-400' : 'text-blue-400'}`}>
                                                [{alert.type}] {alert.regionId}
                                            </span>
                                            <span>{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-slate-300 text-sm mt-1">
                                            {alert.message}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

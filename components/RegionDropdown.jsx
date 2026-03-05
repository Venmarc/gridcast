import React, { useState, useRef, useEffect } from 'react';

export default function RegionDropdown({ regions, selectedRegionId, onRegionChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Find the currently selected region object for display
    const selectedRegion = regions.find(r => r.id === selectedRegionId) || {
        displayName: 'Loading regions...',
        weatherCity: ''
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelect = (id) => {
        onRegionChange({ target: { value: id } }); // Mock event object to match existing handler signature
        setIsOpen(false);
    };

    return (
        <div className="relative w-full md:w-80" ref={dropdownRef}>
            {/* Custom Select Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-200 text-sm rounded-xl px-4 py-2.5 flex items-center justify-between transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
                <div className="flex flex-col items-start truncate pr-2">
                    <span className="font-semibold truncate">
                        {selectedRegion.displayName}
                    </span>
                    {selectedRegion.weatherCity && (
                        <span className="text-xs text-slate-400 truncate">
                            [{selectedRegion.weatherCity.replace(',US', '')}]
                        </span>
                    )}
                </div>

                {/* Chevron Arrow */}
                <svg
                    className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Custom Options List */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl">
                    <ul className="max-h-80 overflow-y-auto custom-scrollbar py-1">
                        {regions.length === 0 ? (
                            <li className="px-4 py-3 text-sm text-slate-400 italic">
                                Loading regions...
                            </li>
                        ) : (
                            regions.map((r) => (
                                <li
                                    key={r.id}
                                    onClick={() => handleSelect(r.id)}
                                    className={`px-4 py-2.5 cursor-pointer flex flex-col items-start transition-colors duration-150 ${r.id === selectedRegionId
                                            ? 'bg-blue-500/10 border-l-2 border-blue-500' // Active state
                                            : 'hover:bg-slate-700 border-l-2 border-transparent' // Default/Hover state
                                        }`}
                                >
                                    <span className={`text-sm font-medium ${r.id === selectedRegionId ? 'text-blue-400' : 'text-slate-200'}`}>
                                        {r.displayName}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        [{r.weatherCity.replace(',US', '')}]
                                    </span>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}

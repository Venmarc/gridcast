'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    BarController,
    LineController
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import AlertPopup from './AlertPopup';
import NotificationBell from './NotificationBell';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    BarController,
    LineController
);

export default function LiveDashboard() {
    const [metricsHistory, setMetricsHistory] = useState([]);
    const [latestStatus, setLatestStatus] = useState('NORMAL');
    const [isConnected, setIsConnected] = useState(false);

    // Anomaly Detection State
    const [alerts, setAlerts] = useState([]);
    const [baseline, setBaseline] = useState({ tempF: null, demandMW: null });

    // UI Redesign State
    const [activeAlert, setActiveAlert] = useState(null);
    const [isUnstable, setIsUnstable] = useState(false);

    const [regions, setRegions] = useState([]);
    const [selectedRegionId, setSelectedRegionId] = useState('COAS');
    const socketRef = useRef(null);

    // Fetch Available Regions
    useEffect(() => {
        async function fetchRegions() {
            try {
                const res = await fetch(`/api/regions`);
                const data = await res.json();
                setRegions(data);
            } catch (err) {
                console.error("Failed to fetch regions:", err);
            }
        }
        fetchRegions();
    }, []);

    // Manage SSE (EventSource) Connection
    useEffect(() => {
        if (!selectedRegionId) return;

        let eventSource = null;
        setIsConnected(false);

        // First, fetch the history bulk cache so the graph loads instantly
        fetch(`/api/metrics?regionId=${selectedRegionId}`)
            .then(res => res.json())
            .then(historyData => {
                if (!Array.isArray(historyData)) return;
                setMetricsHistory(historyData);
                if (historyData.length > 0) {
                    const lastData = historyData[historyData.length - 1];
                    setLatestStatus(lastData.grid.status);

                    // Set initial baseline for anomaly detection
                    setBaseline({
                        tempF: (lastData.weather.temperature * 9 / 5) + 32,
                        demandMW: lastData.grid.demandMW
                    });
                } else {
                    setLatestStatus('NORMAL');
                }
            })
            .catch(console.error);

        // Next, open the SSE connection for live updates
        eventSource = new EventSource(`/api/stream?regionId=${selectedRegionId}`);

        eventSource.onopen = () => {
            setIsConnected(true);
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // --- ANOMALY DETECTION LOGIC ---
                setBaseline(prevBaseline => {
                    let newBaseline = { ...prevBaseline };
                    const currentTempF = (data.weather.temperature * 9 / 5) + 32;
                    const currentDemand = data.grid.demandMW;

                    // Only run detection if we have a baseline established
                    if (prevBaseline.tempF !== null && prevBaseline.demandMW !== null) {
                        const tempDiff = currentTempF - prevBaseline.tempF;
                        const demandDiff = currentDemand - prevBaseline.demandMW;

                        // Check Temperature Threshold (>= 5.0 F difference)
                        if (Math.abs(tempDiff) >= 5.0) {
                            const newAlert = {
                                id: Date.now() + Math.random(),
                                timestamp: new Date(),
                                type: 'TEMP',
                                regionId: selectedRegionId, // Attach current region
                                message: `Sudden temperature shift detected. Changed by ${tempDiff > 0 ? '+' : ''}${tempDiff.toFixed(1)}°F from baseline.`,
                                severity: 'info'
                            };
                            setAlerts(prev => [newAlert, ...prev]);
                            setActiveAlert(newAlert);
                            setIsUnstable(true);
                            // 10 second timeout for the red status pill
                            setTimeout(() => setIsUnstable(false), 10000);

                            newBaseline.tempF = currentTempF; // Update baseline to intercept infinite triggers
                        }

                        // Check Grid Demand Threshold (>= 200 MW difference)
                        if (Math.abs(demandDiff) >= 200) {
                            const newAlert = {
                                id: Date.now() + Math.random(),
                                timestamp: new Date(),
                                type: 'GRID',
                                regionId: selectedRegionId, // Attach current region
                                message: `Critical demand fluctuation detected. Load shifted by ${demandDiff > 0 ? '+' : ''}${Math.round(demandDiff)} MW.`,
                                severity: 'warning'
                            };
                            setAlerts(prev => [newAlert, ...prev]);
                            setActiveAlert(newAlert);
                            setIsUnstable(true);
                            // 10 second timeout for the red status pill
                            setTimeout(() => setIsUnstable(false), 10000);

                            newBaseline.demandMW = currentDemand; // Update baseline to intercept infinite triggers
                        }
                    } else {
                        // Initialize if it was null
                        newBaseline = { tempF: currentTempF, demandMW: currentDemand };
                    }
                    return newBaseline;
                });
                // -------------------------------

                setMetricsHistory((prev) => {
                    const updated = [...prev, data];
                    if (updated.length > 20) {
                        updated.shift();
                    }
                    return updated;
                });
                setLatestStatus(data.grid.status);
            } catch (err) {
                console.error("Failed to parse SSE data", err);
            }
        };

        eventSource.onerror = () => {
            setIsConnected(false);
            // We intentionally do NOT call eventSource.close() here. 
            // The browser's native EventSource will automatically attempt to reconnect.
        };

        return () => {
            if (eventSource) {
                eventSource.close();
                setIsConnected(false);
            }
        };
    }, [selectedRegionId]);

    const [tempUnit, setTempUnit] = useState('C'); // 'C' or 'F'

    // Format data for Chart.js
    const labels = metricsHistory.map((d) => {
        const date = new Date(d.timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });

    const getTemperatureData = () => {
        return metricsHistory.map((d) => {
            if (tempUnit === 'F') {
                return (d.weather.temperature * 9 / 5) + 32;
            }
            return d.weather.temperature;
        });
    };

    const tempLabel = tempUnit === 'C' ? 'Temperature (°C)' : 'Temperature (°F)';

    const chartData = {
        labels,
        datasets: [
            {
                type: 'line',
                label: tempLabel,
                data: getTemperatureData(),
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                yAxisID: 'y',
                tension: 0.3,
                borderWidth: 3,
                pointRadius: 4,
            },
            {
                type: 'bar',
                label: 'Grid Demand (MW)',
                data: metricsHistory.map((d) => d.grid.demandMW),
                backgroundColor: 'rgba(53, 162, 235, 0.7)',
                yAxisID: 'y1',
            },
        ],
    };

    const selectedRegionName = regions.find((r) => r.id === selectedRegionId)?.displayName || 'Loading...';

    const tempData = getTemperatureData();

    // Calculate dynamic temperature axis bounds to make it visually responsive but not erratic.
    // 7 rows / 1.5 rows per degree C = ~4.66 °C spread.
    const spreadC = 4.66;
    const spreadF = spreadC * 1.8;

    let tempMin = tempUnit === 'F' ? 0 : -20;
    let tempMax = tempUnit === 'F' ? 120 : 50;

    if (baseline.tempF !== null && tempData.length > 0) {
        const baseTemp = tempUnit === 'C' ? ((baseline.tempF - 32) * 5 / 9) : baseline.tempF;
        const spread = tempUnit === 'C' ? spreadC : spreadF;

        tempMin = baseTemp - (spread / 2);
        tempMax = baseTemp + (spread / 2);

        // Expand bounds naturally if there's a huge spike
        const dataMin = Math.min(...tempData);
        const dataMax = Math.max(...tempData);
        if (dataMin < tempMin) tempMin = dataMin - 1;
        if (dataMax > tempMax) tempMax = dataMax + 1;
    }

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: {
                bottom: 20
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
        stacked: false,
        plugins: {
            title: {
                display: true,
                text: `${selectedRegionName}: Weather vs. Grid Demand`,
                font: { size: 18, family: 'Inter, sans-serif' },
                color: '#e2e8f0',
            },
            legend: {
                labels: { color: '#cbd5e1' }
            }
        },
        scales: {
            x: {
                ticks: { color: '#94a3b8' },
                grid: { color: 'rgba(148, 163, 184, 0.1)' }
            },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                min: tempMin,
                max: tempMax,
                title: {
                    display: true,
                    text: tempLabel,
                    color: 'rgb(255, 99, 132)'
                },
                ticks: { color: 'rgb(255, 99, 132)' },
                grid: { color: 'rgba(255, 99, 132, 0.1)' }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Grid Demand (MW)',
                    color: 'rgb(53, 162, 235)'
                },
                ticks: { color: 'rgb(53, 162, 235)' },
                grid: { drawOnChartArea: false }, // only want the grid lines for one axis to show up
            },
        },
    };

    const [isSpiked, setIsSpiked] = useState(false);

    const simulateSpike = async () => {
        try {
            await fetch(`/api/simulate-spike`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ regionId: selectedRegionId })
            });
            setIsSpiked(true);
        } catch (err) {
            console.error('Failed to simulate spike:', err);
        }
    };

    const resetSpike = async () => {
        try {
            await fetch(`/api/reset-spike`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ regionId: selectedRegionId })
            });
            setIsSpiked(false);
        } catch (err) {
            console.error('Failed to reset spike:', err);
        }
    };

    // Update handleRegionChange to reset isSpiked state
    const handleRegionChange = (newRegionId) => {
        // If it's from the select synthetic event, extract value. Otherwise take direct id.
        const idToSet = newRegionId?.target?.value || newRegionId;

        if (idToSet === selectedRegionId) return; // Ignore if already there

        setSelectedRegionId(idToSet);
        setMetricsHistory([]);
        setLatestStatus('NORMAL');
        setAlerts([]); // Clear alerts on region change
        setBaseline({ tempF: null, demandMW: null });
        setIsSpiked(false); // Clear spike state when jumping to a new region
    };

    return (
        <div className="w-full h-full flex flex-col bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-700/50 backdrop-blur-md">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-slate-700/50 gap-4">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                        Multi-Region Visualized Data
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Real-time weather vs energy correlation across the US</p>
                </div>

                <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <span className={`h-3 w-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                            <span className="text-sm font-medium text-slate-300 hidden md:inline">
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>

                        <div className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors duration-300 flex items-center gap-2 ${isUnstable
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            }`}>
                            {isUnstable ? 'SYSTEM ALERT | Grid Fluctuation' : 'Stable | Monitoring data stream'}
                        </div>

                        {/* Notification Bell */}
                        <div className="pl-2 border-l border-slate-700">
                            <NotificationBell alerts={alerts} onAlertClick={handleRegionChange} />
                        </div>
                    </div>

                    <select
                        value={selectedRegionId}
                        onChange={handleRegionChange}
                        className="bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full md:w-auto p-2 outline-none appearance-none cursor-pointer hover:bg-slate-700 transition"
                    >
                        {regions.map((r) => (
                            <option key={r.id} value={r.id} title={`Mapped to ${r.weatherCity}`}>
                                {r.displayName} [{r.weatherCity.replace(',US', '')}]
                            </option>
                        ))}
                        {regions.length === 0 && <option value="COAS">Loading regions...</option>}
                    </select>
                </div>
            </div>

            {/* Chart Container */}
            <div className="flex flex-col flex-1 p-6 min-h-[500px]">
                {/* Main Graph */}
                <div className="flex-1 w-full relative">
                    {metricsHistory.length > 0 ? (
                        <div className="absolute inset-0">
                            <Line options={options} data={chartData} />
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 flex-col gap-3 min-h-[400px]">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <span>Fetching data for {selectedRegionName}...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="p-4 bg-slate-800/50 border-t border-slate-700/50 flex flex-col md:flex-row justify-between items-center gap-4">

                <div className="flex bg-slate-900 border border-slate-600 rounded-lg p-1">
                    <button
                        onClick={() => setTempUnit('C')}
                        className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${tempUnit === 'C' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        °C
                    </button>
                    <button
                        onClick={() => setTempUnit('F')}
                        className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${tempUnit === 'F' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        °F
                    </button>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={resetSpike}
                        disabled={!isSpiked}
                        className={`px-6 py-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${isSpiked
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 focus:ring-blue-500'
                            : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
                            }`}
                    >
                        Reset Data
                    </button>

                    <button
                        onClick={simulateSpike}
                        className="px-6 py-2 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-medium rounded-lg transition-colors shadow-lg shadow-rose-500/20 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                    >
                        Simulate Spike ({selectedRegionId})
                    </button>
                </div>
            </div>

            {/* Pop-up Alert Toast */}
            <AlertPopup
                alert={activeAlert}
                onClose={() => setActiveAlert(null)}
                onAlertClick={handleRegionChange}
            />
        </div>
    );
}

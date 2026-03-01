'use client';

import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
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
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export default function LiveDashboard() {
    const [metricsHistory, setMetricsHistory] = useState([]);
    const [latestStatus, setLatestStatus] = useState('NORMAL');
    const [isConnected, setIsConnected] = useState(false);

    const [regions, setRegions] = useState([]);
    const [selectedRegionId, setSelectedRegionId] = useState('COAS');
    const socketRef = useRef(null);

    // Fetch Available Regions
    useEffect(() => {
        async function fetchRegions() {
            try {
                const res = await fetch('http://localhost:4000/api/regions');
                const data = await res.json();
                setRegions(data);
            } catch (err) {
                console.error("Failed to fetch regions:", err);
            }
        }
        fetchRegions();
    }, []);

    // Manage Socket.io Connection & Subscriptions
    useEffect(() => {
        const socket = io('http://localhost:4000');
        socketRef.current = socket;

        socket.on('connect', () => {
            setIsConnected(true);
            // Automatically subscribe to the default selected region upon connecting
            socket.emit('subscribe_region', selectedRegionId);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        // Receive the bulk history cache when switching rooms
        socket.on('grid_history', (historyData) => {
            setMetricsHistory(historyData);
            if (historyData.length > 0) {
                setLatestStatus(historyData[historyData.length - 1].grid.status);
            } else {
                setLatestStatus('NORMAL'); // Reset if no history
            }
        });

        // Receive live individual point pulses
        socket.on('grid_update', (data) => {
            setMetricsHistory((prev) => {
                const updated = [...prev, data];
                if (updated.length > 20) {
                    updated.shift();
                }
                return updated;
            });
            setLatestStatus(data.grid.status);
        });

        return () => {
            socket.disconnect();
        };
    }, [selectedRegionId]); // Re-run effect and re-subscribe if the selectedRegionId changes

    const handleRegionChange = (e) => {
        const newRegionId = e.target.value;
        setSelectedRegionId(newRegionId);
        // Explicitly reset the history while we wait for the new room's history payload
        setMetricsHistory([]);
        setLatestStatus('NORMAL');
    };

    // Format data for Chart.js
    const labels = metricsHistory.map((d) => {
        const date = new Date(d.timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });

    const chartData = {
        labels,
        datasets: [
            {
                type: 'line',
                label: 'Temperature (°C)',
                data: metricsHistory.map((d) => d.weather.temperature),
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
                title: {
                    display: true,
                    text: 'Temperature (°C)',
                    color: 'rgb(255, 99, 132)'
                },
                ticks: { color: 'rgb(255, 99, 132)' },
                grid: { color: 'rgba(255, 99, 132, 0.1)' }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
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

    const simulateSpike = async () => {
        try {
            await fetch('http://localhost:4000/api/simulate-spike', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ regionId: selectedRegionId })
            });
        } catch (err) {
            console.error('Failed to simulate spike:', err);
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-700/50 backdrop-blur-md">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-slate-700/50 gap-4">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                        Multi-Region Visualized API
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Real-time weather vs energy correlation across the US</p>
                </div>

                <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <span className={`h-3 w-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                            <span className="text-sm font-medium text-slate-300 hidden md:inline">
                                {isConnected ? 'Live Socket Connected' : 'Disconnected'}
                            </span>
                        </div>

                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${latestStatus === 'WARNING' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                            }`}>
                            GRID: {latestStatus}
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
            <div className="flex-1 p-6 min-h-[400px]">
                {metricsHistory.length > 0 ? (
                    <Line options={options} data={chartData} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 flex-col gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span>Fetching data for {selectedRegionName}...</span>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="p-4 bg-slate-800/50 border-t border-slate-700/50 flex justify-end">
                <button
                    onClick={simulateSpike}
                    className="px-6 py-2 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-medium rounded-lg transition-colors shadow-lg shadow-rose-500/20 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                    Simulate Spike ({selectedRegionId})
                </button>
            </div>
        </div>
    );
}

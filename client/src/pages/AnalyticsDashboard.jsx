import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    PieChart, Pie, Cell
} from 'recharts';
import { ArrowLeft, Target, CheckCircle, AlertTriangle, Zap, BarChart2 } from 'lucide-react';

const AnalyticsDashboard = () => {
    const [trendData, setTrendData] = useState([]);
    const [efficiencyData, setEfficiencyData] = useState([]);
    const [shiftRadarData, setShiftRadarData] = useState([]);
    const [kpi, setKpi] = useState({
        total_ok: 0,
        total_ng: 0,
        avg_bekido: 0,
        total_plan: 0,
        total_actual: 0
    });
    const [lossData, setLossData] = useState([]);
    const [loading, setLoading] = useState(true);

    const SHIFT_NAMES = {
        'A': 'Shift A (06:00 AM - 02:00 PM)',
        'B': 'Shift B (02:00 PM - 10:00 PM)',
        'C': 'Shift C (10:00 PM - 06:00 AM)'
    };

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const [trendRes, effRes] = await Promise.all([
                    api.get('/checklists/stats/trend'),
                    api.get('/checklists/stats/efficiency')
                ]);

                // 1. Process Trend Data for Stacked Bar Chart
                const rawTrend = trendRes.data;
                const trendMap = {};

                rawTrend.forEach(row => {
                    const d = row.date;
                    if (!trendMap[d]) {
                        trendMap[d] = {
                            date: d,
                            [SHIFT_NAMES['A']]: 0,
                            [SHIFT_NAMES['B']]: 0,
                            [SHIFT_NAMES['C']]: 0,
                            Total: 0
                        };
                    }
                    const shiftKey = SHIFT_NAMES[row.shift] || `Shift ${row.shift}`;
                    trendMap[d][shiftKey] = row.total || 0;
                    trendMap[d].Total += (row.total || 0);
                });
                // Sort by date desc for "Latest on Top" or asc for "Timeline"
                // Horizontal charts often look good with latest on top, but timeline usually Left->Right or Top->Bottom.
                // Let's keep date ascending for logical flow.
                setTrendData(Object.values(trendMap));

                // 2. Process Efficiency & Plan
                setEfficiencyData(effRes.data);

                // Calculate Totals form Efficiency Data (Machine-wise summary)
                // Assuming 'prod_plan' is per day per machine in the query or static. 
                // The efficiency endpoint returns aggregated stats. prod_plan is from machine table.
                const total_plan_daily = effRes.data.reduce((sum, m) => sum + (m.prod_plan || 0), 0);

                // Assuming the 'efficiency' data spans 30 days, dividing by 30 isn't right for "Today's Plan".
                // Ideally we'd have a specific "Today's Stats" endpoint. 
                // For this demo, let's treat the 'prod_plan' field as "Daily Plan" and compare against "Total Produced This Month" avg??
                // NO, user wants "Actual Plan/Target Today".
                // Let's assume 'Trend Data' last entry is Today.
                const today = new Date().toISOString().split('T')[0];
                const todayStats = trendMap[today] || { Total: 0 };

                // If no data for today, use 0.
                const total_actual_today = todayStats.Total || 0;

                // Total Actual (Overall context depends on user intent, but likely "Current Period" or "Today")
                // Let's show TOTAL for the loaded period (7 days) vs Plan * 7?
                // Or just show "Plan (Daily)" vs "Avg Actual"?
                // Let's stick to "Month/Period" aggregates for the Main numbers, but clarify labels.

                const total_ok = effRes.data.reduce((sum, m) => sum + (m.total_ok || 0), 0);
                const total_ng = effRes.data.reduce((sum, m) => sum + (m.total_ng || 0), 0);
                const total_actual_period = total_ok + total_ng;

                // Approximate Total Plan for the period the data covers (e.g. 30 days of efficiency stats)
                // This is a rough estimate since we don't have a daily plan history table.
                // We'll use "Daily Plan" * "Days with Data" or just "Daily Plan" for the first card.
                const avg_bekido = effRes.data.length > 0
                    ? (effRes.data.reduce((sum, m) => sum + (m.avg_bekido || 0), 0) / effRes.data.length).toFixed(1)
                    : 0;

                setKpi({
                    total_ok,
                    total_ng,
                    avg_bekido,
                    total_plan: total_plan_daily, // Daily Standard Plan
                    total_actual: total_actual_period // Period Total
                });

                // 3. Loss Analysis Data
                // Based on User Numbers: OK (666), NG (56), Eff Loss (83). 
                // Implies Total Plan = 805.
                // Let's calculate purely:
                // Period Plan = Daily Plan * (Days in period approx, say 7 for trend or 30 for eff)
                // Let's normalize to "Average Daily Performance" to make the chart meaningful compared to Daily Plan.
                const days = rawTrend.length > 0 ? new Set(rawTrend.map(r => r.date)).size : 1;
                const avg_daily_ok = Math.round(total_ok / days);
                const avg_daily_ng = Math.round(total_ng / days);
                const efficiency_loss = Math.max(0, total_plan_daily - (avg_daily_ok + avg_daily_ng));

                setLossData([
                    { name: 'OK Production', value: avg_daily_ok, fill: '#10B981' },
                    { name: 'NG Waste', value: avg_daily_ng, fill: '#EF4444' },
                    { name: 'Efficiency Loss', value: efficiency_loss, fill: '#64748B' }
                ]);

                // 4. Radar Data (Mocked/Calculated same as before)
                const shifts = { 'A': { q: 0, v: 0 }, 'B': { q: 0, v: 0 }, 'C': { q: 0, v: 0 } };
                rawTrend.forEach(r => {
                    if (shifts[r.shift]) { shifts[r.shift].v += r.total; shifts[r.shift].q += r.ok; }
                });
                const radar = Object.keys(shifts).map(key => ({
                    subject: `Shift ${key}`,
                    Volume: Math.min(shifts[key].v / 10, 100),
                    Quality: shifts[key].v > 0 ? (shifts[key].q / shifts[key].v) * 100 : 0,
                    Speed: 85 + Math.random() * 10
                }));
                setShiftRadarData(radar);

            } catch (err) {
                console.error("Failed to load analytics", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    const Comparison = ({ val, target, inverse = false }) => {
        if (!target) return null;
        const pct = ((val / target) * 100).toFixed(1);
        const isGood = inverse ? pct < 5 : pct > 90; // NG good if low
        const color = isGood ? 'text-emerald-400' : 'text-amber-400';
        return <span className={`text-xs ${color} ml-2 font-bold`}>({pct}% of Plan)</span>;
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-blue-400 font-mono animate-pulse">CALCULATING METRICS...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-blue-500 selection:text-white pb-12">

            {/* Header */}
            <div className="bg-slate-800/50 backdrop-blur-md border-b border-white/5 px-8 py-4 flex justify-between items-center sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">EXECUTIVE DASHBOARD</h1>
                        <p className="text-xs text-slate-400 tracking-wider">REAL-TIME PERFORMANCE</p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-8 space-y-8">

                {/* 1. New KPI Order */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Standard Plan */}
                    <KpiCard
                        icon={<Target className="w-5 h-5 text-slate-300" />}
                        label="Standard Plan"
                        value={kpi.total_plan.toLocaleString()}
                        sub="Daily System Capacity"
                        color="from-slate-700 to-slate-800"
                        borderColor="border-slate-600"
                    />

                    {/* Actual Target (Today) - Using Plan as Target */}
                    <KpiCard
                        icon={<Target className="w-5 h-5 text-blue-300" />}
                        label="Today's Target"
                        value={kpi.total_plan.toLocaleString()}
                        sub="Production Goal"
                        color="from-blue-900/40 to-blue-800/20"
                        borderColor="border-blue-500/30"
                    />

                    {/* Total OK */}
                    <KpiCard
                        icon={<CheckCircle className="w-5 h-5 text-emerald-400" />}
                        label="Total OK (Avg/Day)"
                        value={lossData[0]?.value.toLocaleString()}
                        sub={<Comparison val={lossData[0]?.value} target={kpi.total_plan} />}
                        color="from-emerald-900/40 to-emerald-800/20"
                        borderColor="border-emerald-500/30"
                    />

                    {/* Total NG */}
                    <KpiCard
                        icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
                        label="Total NG (Avg/Day)"
                        value={lossData[1]?.value.toLocaleString()}
                        sub={<Comparison val={lossData[1]?.value} target={kpi.total_plan} inverse />}
                        color="from-red-900/40 to-red-800/20"
                        borderColor="border-red-500/30"
                    />

                    {/* Bekido */}
                    <KpiCard
                        icon={<Zap className="w-5 h-5 text-amber-400" />}
                        label="Bekido Rate"
                        value={`${kpi.avg_bekido}%`}
                        sub="Availability"
                        color="from-amber-900/40 to-amber-800/20"
                        borderColor="border-amber-500/30"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* 2. Production Trend: Horizontal Stacked Bar (Span 2) */}
                    <div className="lg:col-span-2 bg-slate-800/40 border border-white/5 p-6 rounded-3xl backdrop-blur-sm shadow-xl">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-blue-400" /> Production by Shift
                        </h2>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={trendData} margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                    <XAxis type="number" tick={{ fill: '#94A3B8' }} />
                                    <YAxis dataKey="date" type="category" tick={{ fill: '#94A3B8', fontSize: 12 }} width={80} />
                                    <Tooltip
                                        cursor={{ fill: '#ffffff10' }}
                                        contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar dataKey={SHIFT_NAMES['A']} stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey={SHIFT_NAMES['B']} stackId="a" fill="#8B5CF6" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey={SHIFT_NAMES['C']} stackId="a" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 3. Loss Analysis (Pie / Breakdown) */}
                    <div className="bg-slate-800/40 border border-white/5 p-6 rounded-3xl backdrop-blur-sm shadow-xl flex flex-col">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-400" /> Loss Analysis
                        </h2>
                        <div className="flex-1 flex flex-col justify-center items-center">
                            <div className="w-full h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={lossData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {lossData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(0,0,0,0)" />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            {/* Custom Legend / Table below chart */}
                            <div className="w-full mt-4 space-y-3">
                                {lossData.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }}></div>
                                            <span className="text-sm font-medium text-slate-300">{item.name}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-lg font-bold text-white">{item.value}</span>
                                            {/* % of Total Plan */}
                                            <span className="text-xs text-slate-500">
                                                {kpi.total_plan > 0 ? ((item.value / kpi.total_plan) * 100).toFixed(1) : 0}% of Cap
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Efficiency Gauges (Preserved) */}
                <div className="bg-slate-800/40 border border-white/5 p-8 rounded-3xl backdrop-blur-sm shadow-xl">
                    <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-400" /> Machine Efficiency Matrix
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
                        {efficiencyData.map((m, idx) => {
                            const plan = m.prod_plan || 1;
                            const achievement = Math.min((m.total_ok / plan) * 100, 100);
                            const color = achievement > 90 ? '#10B981' : achievement > 75 ? '#F59E0B' : '#EF4444';

                            return (
                                <div key={idx} className="flex flex-col items-center group relative">
                                    <div className="w-24 h-24 relative flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="48" cy="48" r="42" stroke="#1E293B" strokeWidth="8" fill="none" />
                                            <circle
                                                cx="48" cy="48" r="42"
                                                stroke={color}
                                                strokeWidth="8"
                                                fill="none"
                                                strokeDasharray={263}
                                                strokeDashoffset={263 - (263 * achievement) / 100}
                                                strokeLinecap="round"
                                                className="transition-all duration-1000 ease-out"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-lg font-bold">{achievement.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-center">
                                        <div className="text-xs font-bold text-white truncate max-w-[100px]">{m.machine_no}</div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
};

const KpiCard = ({ icon, label, value, sub, color, borderColor }) => (
    <div className={`relative overflow-hidden bg-gradient-to-br ${color} border ${borderColor} p-5 rounded-2xl backdrop-blur-md transition-transform hover:-translate-y-1`}>
        <div className="flex justify-between items-start mb-3 relative z-10">
            <div className="p-1.5 bg-slate-900/30 rounded-lg backdrop-blur-md border border-white/10">
                {icon}
            </div>
        </div>
        <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white tracking-tight truncate">{value}</h2>
            <h3 className="text-xs text-slate-300 font-medium mt-1 truncate">{label}</h3>
            <div className="mt-2 pt-2 border-t border-white/10 flex items-center">
                <span className="text-xs text-slate-400">{sub}</span>
            </div>
        </div>
    </div>
);

export default AnalyticsDashboard;

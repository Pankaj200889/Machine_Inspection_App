import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { App as CapacitorApp } from '@capacitor/app';
import {
    Activity, ClipboardList, Download, Settings, Building,
    LogOut, User, ChevronDown, X, Power, Camera, Info
} from 'lucide-react';
import api, { STATIC_BASE_URL } from '../api';

const socket = io(STATIC_BASE_URL);

// --- Optimized Components (Defined Outside) ---
const GlassCard = React.memo(({ children, className = "" }) => (
    <div className={`relative bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 transform-gpu transition-all duration-300 ${className}`}>
        {children}
    </div>
));

const NavItem = React.memo(({ name, onClick, active, hasGap }) => (
    <button
        onClick={onClick}
        className={`
            px-5 py-2 text-sm font-bold rounded-full transition-all duration-300 whitespace-nowrap active:scale-95
            ${active
                ? 'bg-blue-600/10 text-blue-700 shadow-inner'
                : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'}
            ${hasGap ? 'mr-12' : ''}
        `}
    >
        {name}
    </button>
));

const Home = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Home');

    // Data State
    const [recentChecks, setRecentChecks] = useState([]);
    const [trendData, setTrendData] = useState([]);
    const [efficiencyData, setEfficiencyData] = useState([]);
    const [shiftRadarData, setShiftRadarData] = useState([]);
    const [lossData, setLossData] = useState([]);
    const [kpi, setKpi] = useState({
        total_ok: 0,
        total_ng: 0,
        avg_bekido: 0,
        total_plan: 0,
        total_actual: 0
    });
    const [selectedImage, setSelectedImage] = useState(null);
    const [orgProfile, setOrgProfile] = useState(null);
    const [orgProfile, setOrgProfile] = useState(null);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [showFormulaInfo, setShowFormulaInfo] = useState(false);

    const refreshTimeoutRef = useRef(null);

    useEffect(() => {
        fetchOrgProfile();
        refreshAllData();

        socket.on('new_checklist', () => {
            // Debounce updates: Wait 2 seconds of silence before refreshing
            if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
            refreshTimeoutRef.current = setTimeout(() => {
                refreshAllData();
            }, 2000);
        });

        return () => {
            socket.off('new_checklist');
            if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
        };
    }, [user.role]);

    const refreshAllData = () => {
        if (user?.role === 'admin') fetchAnalytics();
        fetchRecentActivity();
    };

    const fetchOrgProfile = async () => {
        try {
            const res = await api.get('/organization');
            setOrgProfile(res.data);
        } catch (error) { console.error(error); }
    };

    const fetchRecentActivity = async () => {
        try {
            const res = await api.get('/checklists');
            setRecentChecks(res.data.slice(0, 50));
        } catch (error) { console.error(error); }
    };

    const fetchAnalytics = async () => {
        try {
            const [trendRes, effRes, allChecklistsRes] = await Promise.all([
                api.get('/checklists/stats/trend'),
                api.get('/checklists/stats/efficiency'),
                api.get('/checklists')
            ]);

            // 1. Production Trend (Area Chart Data)
            const rawTrend = trendRes.data;
            const trendMap = {};
            rawTrend.forEach(row => {
                // Ensure Date + Shift keys exist
                if (!trendMap[row.date]) trendMap[row.date] = { date: row.date, Total: 0, 'Shift A': 0, 'Shift B': 0, 'Shift C': 0 };
                trendMap[row.date].Total += Number(row.total || 0);

                const shiftKey = `Shift ${row.shift}`;
                if (trendMap[row.date][shiftKey] !== undefined) {
                    trendMap[row.date][shiftKey] += Number(row.total || 0);
                }
            });
            // Convert to array and take last 7 days
            const trendArr = Object.values(trendMap).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-10);
            setTrendData(trendArr);

            // 2. KPIs
            const total_ok = effRes.data.reduce((sum, m) => sum + Number(m.total_ok || 0), 0);
            const total_ng = effRes.data.reduce((sum, m) => sum + Number(m.total_ng || 0), 0);
            const daily_std_plan = effRes.data.reduce((sum, m) => sum + Number(m.prod_plan || 0), 0);
            const avg_bekido = effRes.data.length > 0 ? (effRes.data.reduce((sum, m) => sum + Number(m.avg_bekido || 0), 0) / effRes.data.length).toFixed(1) : 0;

            setKpi({
                total_ok, total_ng, avg_bekido,
                total_plan: daily_std_plan,
                total_actual: total_ok + total_ng
            });

            // 3. Loss Analysis (Donut)
            const days = trendArr.length || 1;
            const avg_daily_ok = Math.round(total_ok / days);
            const avg_daily_ng = Math.round(total_ng / days);
            const efficiency_loss = Math.max(0, daily_std_plan - (avg_daily_ok + avg_daily_ng));
            setLossData([
                { name: 'OK Production', value: avg_daily_ok, fill: '#10B981' }, // Emerald (Green)
                { name: 'NG Waste', value: avg_daily_ng, fill: '#EF4444' },   // Red
                { name: 'Efficiency Loss', value: efficiency_loss, fill: '#F59E0B' } // Amber
            ]);

            setEfficiencyData(effRes.data);

            // 4. Shift Radar logic...
            const shiftStats = { 'A': { q: 0, v: 0, count: 0 }, 'B': { q: 0, v: 0, count: 0 }, 'C': { q: 0, v: 0, count: 0 } };
            allChecklistsRes.data.forEach(item => {
                const s = item.shift || 'A';
                if (shiftStats[s]) {
                    shiftStats[s].v += (item.total_quantity || 0);
                    shiftStats[s].q += (item.ok_quantity || 0);
                    shiftStats[s].count += 1;
                }
            });
            const maxVol = Math.max(...Object.values(shiftStats).map(s => s.v), 1);
            const radar = Object.keys(shiftStats).map(key => ({
                subject: `Shift ${key}`,
                Volume: Math.round((shiftStats[key].v / maxVol) * 100),
                Quality: shiftStats[key].v > 0 ? Math.round((shiftStats[key].q / shiftStats[key].v) * 100) : 0,
            }));
            setShiftRadarData(radar);

        } catch (err) { console.error(err); }
    };


    // --- Click Outside Hook for Reports ---
    const reportsRef = useRef(null);
    useEffect(() => {
        function handleClickOutside(event) {
            if (reportsRef.current && !reportsRef.current.contains(event.target)) {
                setIsExportOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const downloadCSV = async (type) => {
        try {
            const response = await api.get(`/export/${type}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${type}_export.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            setIsExportOpen(false);
        } catch (error) { alert("Failed to download."); }
    };

    // --- Edit Logic ---
    const [editingChecklist, setEditingChecklist] = useState(null);

    const handleEditClick = (check) => {
        if ((check.edit_count || 0) >= 3) {
            alert("Maximum edit limit (3) reached for this entry.");
            return;
        }
        setEditingChecklist(check);
    };

    const submitEdit = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData(e.target);
            // formData automatically contains all inputs: ok, ng, total, remarks, image, proof

            await api.put(`/checklists/${editingChecklist.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setEditingChecklist(null);
            refreshAllData();
            alert("Record updated successfully. Actions logged.");
        } catch (err) {
            alert(err.response?.data?.error || "Update failed");
        }
    };

    const handleExit = () => {
        CapacitorApp.exitApp();
    };

    return (
        <div className="min-h-screen bg-[#F0F2F5] font-sans selection:bg-blue-100 overflow-x-hidden relative pb-24 safe-area-inset-bottom">

            {/* Background Gradients for Glass Effect */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/40 rounded-full blur-[120px] mix-blend-multiply opacity-70 animate-blob"></div>
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-[120px] mix-blend-multiply opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] bg-pink-200/40 rounded-full blur-[120px] mix-blend-multiply opacity-70 animate-blob animation-delay-4000"></div>
            </div>

            {/* Report Options Modal */}
            {isExportOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6 space-y-4 animate-in slide-in-from-bottom shadow-2xl">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xl font-black text-gray-800">Export Reports</h3>
                            <button onClick={() => setIsExportOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="w-5 h-5" /></button>
                        </div>
                        <p className="text-gray-500 text-sm mb-4">Select a dataset to download as CSV.</p>

                        <button onClick={() => downloadCSV('machines')} className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl transition-all font-bold">
                            <span>Machine List</span>
                            <Download className="w-5 h-5" />
                        </button>
                        <button onClick={() => downloadCSV('checklists')} className="w-full flex items-center justify-between p-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl transition-all font-bold">
                            <span>Checklist Data</span>
                            <Download className="w-5 h-5" />
                        </button>

                        <button onClick={() => setIsExportOpen(false)} className="mt-4 w-full py-3 bg-white border border-gray-200 text-gray-500 rounded-xl font-bold hover:bg-gray-50">Cancel</button>
                    </div>
                </div>
            )}

            {/* Formula Info Modal */}
            {showFormulaInfo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setShowFormulaInfo(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md relative animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowFormulaInfo(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <Info className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-gray-800">Efficiency Formula</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 font-mono text-sm text-center text-gray-700">
                                (OK Qty × MCT) ÷ (Working Hours × 3600) × 100
                            </div>

                            <div className="space-y-3 text-sm text-gray-600">
                                <p><strong className="text-gray-800">MCT (Machine Cycle Time):</strong> The standard time (in seconds) it takes to produce one part.</p>
                                <p><strong className="text-gray-800">Working Hours:</strong> The number of operational hours for the shift.</p>
                                <p><strong className="text-gray-800">Efficiency Cap:</strong> The result is capped at 100% even if the machine runs faster than standard.</p>
                            </div>
                        </div>

                        <button onClick={() => setShowFormulaInfo(false)} className="mt-6 w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition">Got it</button>
                    </div>
                </div>
            )}

            {/* Edit Modal (Admin) */}
            {editingChecklist && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-lg relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <button onClick={() => setEditingChecklist(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                        <h3 className="text-2xl font-black text-gray-800 mb-1">Edit Record</h3>
                        <p className="text-sm text-gray-500 mb-6">Modifying Machine {editingChecklist.machine_no} (Shift {editingChecklist.shift})</p>

                        <form onSubmit={submitEdit} className="space-y-4">
                            {/* Visual Evidence Section */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Machine Photo</label>
                                    <div className="h-32 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative group">
                                        {editingChecklist.image_path ? (
                                            <img src={`${STATIC_BASE_URL}/${editingChecklist.image_path}`} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs flex-col gap-1">
                                                <Activity className="w-8 h-8 opacity-50" />
                                                <span>No Photo</span>
                                            </div>
                                        )}
                                        <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200 cursor-pointer">
                                            <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded">Change</span>
                                            <input type="file" name="image" className="hidden" accept="image/*" />
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Approval Proof</label>
                                    <div className="h-32 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-100 transition cursor-pointer relative">
                                        {editingChecklist.approval_proof_path ? (
                                            <div className="text-center">
                                                <div className="text-xs font-bold text-green-600 mb-1">Proof Uploaded</div>
                                                <a href={`${STATIC_BASE_URL}/${editingChecklist.approval_proof_path}`} target="_blank" className="text-[10px] underline text-blue-500 relative z-10">View</a>
                                            </div>
                                        ) : (
                                            <div className="text-center pointer-events-none">
                                                <Download className="w-5 h-5 mx-auto mb-1 opacity-50" />
                                                <span className="text-[10px]">Upload Doc/Email</span>
                                            </div>
                                        )}
                                        <input type="file" name="proof" className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                </div>
                            </div>

                            {/* Quantities */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">OK</label>
                                    <input name="ok" type="number" defaultValue={editingChecklist.ok_quantity} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-800 focus:ring-2 focus:ring-blue-500" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">NG</label>
                                    <input name="ng" type="number" defaultValue={editingChecklist.ng_quantity} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-800 focus:ring-2 focus:ring-blue-500" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Total</label>
                                    <input name="total" type="number" defaultValue={editingChecklist.total_quantity} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-800 focus:ring-2 focus:ring-blue-500" required />
                                </div>
                            </div>

                            {/* Remarks */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Remarks / Justification</label>
                                <textarea name="remarks" defaultValue={editingChecklist.remarks || ''} rows="2" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500" placeholder="Reason for edit..." required></textarea>
                            </div>

                            {/* Edit History (Read Only) */}
                            {editingChecklist.edit_history && (
                                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">History</div>
                                    <div className="space-y-2 max-h-24 overflow-y-auto custom-scrollbar">
                                        {JSON.parse(editingChecklist.edit_history).map((h, i) => (
                                            <div key={i} className="text-xs text-gray-500 flex justify-between">
                                                <span>{new Date(h.edited_at).toLocaleDateString()}</span>
                                                <span>OK: {h.ok} / NG: {h.ng}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="pt-2">
                                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/30">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {selectedImage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in" onClick={() => setSelectedImage(null)}>
                    <div className="bg-white rounded-3xl overflow-hidden w-full max-w-lg relative shadow-2xl" onClick={e => e.stopPropagation()}>

                        {/* Header Image */}
                        <div className="relative h-64 bg-gray-100 group">
                            {selectedImage.image_path ? (
                                <img src={`${STATIC_BASE_URL}/${selectedImage.image_path}`} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300 flex-col gap-2">
                                    <Activity className="w-12 h-12 opacity-50" />
                                    <span className="text-xs font-bold uppercase tracking-widest opacity-50">No Photo</span>
                                </div>
                            )}
                            <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 backdrop-blur-sm transition"><X className="w-5 h-5" /></button>

                            {/* Admin Edit Action Overlay */}
                            {user?.role === 'admin' && (selectedImage.edit_count || 0) < 3 && (
                                <div className="absolute top-4 left-4">
                                    <button
                                        onClick={() => {
                                            setSelectedImage(null);
                                            handleEditClick(selectedImage);
                                        }}
                                        className="flex items-center gap-2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg text-blue-600 font-bold text-sm hover:scale-105 active:scale-95 transition-all"
                                    >
                                        <ClipboardList className="w-4 h-4" /> Edit Record
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <h3 className="text-3xl font-black text-gray-800 mb-2">{selectedImage.machine_no}</h3>
                            <div className="flex items-center gap-3 mb-6">
                                <span className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-lg uppercase tracking-wide">Shift {selectedImage.shift}</span>
                                <span className="text-xs font-bold text-gray-400">{new Date(selectedImage.submitted_at).toLocaleString()}</span>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-3 mb-6">
                                <div className="bg-emerald-50 p-4 rounded-2xl text-center">
                                    <div className="text-2xl font-black text-emerald-600">{selectedImage.ok_quantity}</div>
                                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">OK</div>
                                </div>
                                <div className="bg-red-50 p-4 rounded-2xl text-center">
                                    <div className="text-2xl font-black text-red-500">{selectedImage.ng_quantity}</div>
                                    <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider">NG</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-2xl text-center">
                                    <div className="text-2xl font-black text-gray-600">{selectedImage.total_quantity}</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</div>
                                </div>
                            </div>

                            {/* Remarks & Proof */}
                            <div className="space-y-4">
                                {selectedImage.remarks && (
                                    <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100">
                                        <div className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest mb-2">Remarks</div>
                                        <p className="text-sm font-medium text-gray-700 leading-relaxed">"{selectedImage.remarks}"</p>
                                    </div>
                                )}

                                {selectedImage.approval_proof_path && (
                                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                                        <div>
                                            <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Approval Proof</div>
                                            <span className="text-xs text-blue-800 font-medium">Document attached</span>
                                        </div>
                                        <a
                                            href={`${STATIC_BASE_URL}/${selectedImage.approval_proof_path}`}
                                            target="_blank"
                                            className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition flex items-center gap-2"
                                        >
                                            <Download className="w-4 h-4" /> Download
                                        </a>
                                    </div>
                                )}

                                {/* Edit History */}
                                {selectedImage.edit_history && (
                                    <div className="mt-6 pt-6 border-t border-gray-100">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Edit History</div>
                                        <div className="space-y-2">
                                            {JSON.parse(selectedImage.edit_history).map((h, i) => (
                                                <div key={i} className="text-xs bg-gray-50 p-2 rounded-lg flex justify-between items-center text-gray-500">
                                                    <span>{new Date(h.edited_at).toLocaleDateString()}</span>
                                                    <span className="font-mono">OK:{h.ok} NG:{h.ng}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Retake Photo Action (Operator Only) */}
                            {user && user.id === selectedImage.user_id && user.role !== 'admin' && (
                                <div className="mt-6 pt-6 border-t border-gray-100">
                                    <p className="text-xs text-center text-gray-400 mb-3">Need to update the verification photo?</p>
                                    <button className="flex items-center justify-center gap-2 w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition shadow-lg shadow-gray-900/20">
                                        <Camera className="w-4 h-4" />
                                        <span>Retake Photo</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Navbar */}
            <div className="sticky top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm transition-all saturate-150 pt-[env(safe-area-inset-top)]">
                <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-2 md:h-20 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">

                    {/* Top Row: Brand & Profile */}
                    <div className="flex items-center justify-between w-full md:w-auto">
                        {/* Brand */}
                        <Link to="/organization" className="flex items-center gap-3 group cursor-pointer">
                            {orgProfile?.logo_url ? (
                                <img src={orgProfile.logo_url.startsWith('http') ? orgProfile.logo_url : `${STATIC_BASE_URL}/${orgProfile.logo_url}`} alt="Siddhi Logo" className="h-10 md:h-12 w-auto object-contain drop-shadow-sm group-hover:scale-105 transition-transform" />
                            ) : (
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                                    <Building className="w-5 h-5" />
                                </div>
                            )}
                            <div className="ml-0.5">
                                <h1 className="text-lg md:text-xl font-extrabold text-gray-900 tracking-tight leading-none block">
                                    {orgProfile?.company_name || 'EquipGuard'}
                                </h1>
                            </div>
                        </Link>

                        {/* Mobile Profile (Visible on right) */}
                        <div className="flex md:hidden items-center gap-3">
                            <button onClick={handleExit} className="w-9 h-9 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500 mr-1" title="Exit App">
                                <Power className="w-4 h-4" />
                            </button>
                            <button onClick={logout} className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500">
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Navigation Pills (Scrollable Row) */}
                    <div className="w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                        <div className="flex items-center gap-2 bg-gray-100/50 p-1 rounded-xl md:rounded-full border border-gray-200/50 shadow-inner min-w-max">
                            <NavItem name="Summary" active={activeTab === 'Home'} onClick={() => setActiveTab('Home')} />
                            {user?.role === 'admin' && <NavItem name="Analytics" active={activeTab === 'Analytics'} onClick={() => setActiveTab('Analytics')} />}
                            {user?.role === 'admin' && <NavItem name="Machines" active={false} onClick={() => navigate('/machines')} />}
                            {user?.role === 'admin' && <NavItem name="Users" active={false} onClick={() => navigate('/users')} />}
                            {user?.role === 'admin' && <NavItem name="Reports" active={false} onClick={() => navigate('/reports')} />}
                            <NavItem name="Scan QR" active={false} onClick={() => navigate('/scanner')} />
                        </div>
                    </div>

                    {/* Desktop Profile */}
                    <div className="hidden md:flex items-center gap-4 pl-8 border-l border-gray-200/50">
                        <div className="text-right">
                            <div className="text-sm font-bold text-gray-800">{user?.username}</div>
                            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{user?.role || 'Operator'}</div>
                        </div>
                        <button onClick={handleExit} className="w-10 h-10 rounded-full bg-red-50 border border-red-100 shadow-sm flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-100 hover:shadow-md hover:scale-105 transition-all" title="Exit App">
                            <Power className="w-4 h-4" />
                        </button>
                        <button onClick={logout} className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-400 hover:text-red-500 hover:shadow-md hover:scale-105 transition-all">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 max-w-[1600px] mx-auto p-6 md:p-8 pt-6">

                {/* ---------------- HOME TAB ---------------- */}
                {activeTab === 'Home' && user?.role === 'admin' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
                        {/* Header */}
                        <div className="flex items-end justify-between">
                            <div>
                                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 mb-1">Production Summary</h2>
                                <p className="text-sm text-gray-500 font-medium">Real-time visual insights for the last 7 days.</p>
                            </div>
                            <div className="text-right">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-green-200/50 shadow-lg shadow-green-500/10 backdrop-blur-md">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 shadow-sm"></span>
                                    </span>
                                    <span className="text-[10px] font-black text-green-700 uppercase tracking-widest leading-none pt-0.5">Live</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">

                            {/* RIGHT COLUMN (KPIs): Mobile Priority (First) */}
                            <div className="lg:col-span-4 space-y-8 order-1 lg:order-2">
                                {/* Hero KPI */}
                                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] shadow-2xl shadow-blue-900/20 text-white relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
                                    <h3 className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">Total OK Production</h3>
                                    <div className="text-5xl font-black tracking-tight mb-4 relative z-10">{kpi.total_ok.toLocaleString()}</div>

                                    <div className="grid grid-cols-2 gap-4 relative z-10">
                                        <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                                            <div className="text-xs text-blue-200 mb-1">Target</div>
                                            <div className="font-bold tracking-tight">{kpi.total_plan.toLocaleString()}</div>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                                            <div className="text-xs text-blue-200 mb-1">Achieved</div>
                                            <div className="font-bold tracking-tight">{(kpi.total_plan > 0 ? (kpi.total_ok / kpi.total_plan * 100).toFixed(0) : 0)}%</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Secondary KPIs */}
                                <div className="grid grid-cols-2 gap-4">
                                    <GlassCard className="p-5 flex flex-col items-center justify-center text-center !rounded-2xl hover:scale-[1.02] transition-transform shadow-lg shadow-gray-200/50">
                                        <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-2">
                                            <Activity className="w-5 h-5" />
                                        </div>
                                        <div className="text-2xl font-black text-gray-800 tracking-tight">{kpi.total_ng}</div>
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total NG</div>
                                    </GlassCard>
                                    <GlassCard className="p-5 flex flex-col items-center justify-center text-center !rounded-2xl hover:scale-[1.02] transition-transform shadow-lg shadow-gray-200/50">
                                        <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-2">
                                            <Settings className="w-5 h-5" />
                                        </div>
                                        <div className="text-2xl font-black text-gray-800 tracking-tight">{kpi.avg_bekido}%</div>
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Avg Yield</div>
                                    </GlassCard>
                                </div>

                                {/* Live Feed */}
                                <GlassCard className="h-[460px] flex flex-col !p-0 overflow-hidden shadow-xl shadow-gray-200/60">
                                    <div className="p-6 border-b border-gray-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                                        <h3 className="font-bold text-gray-800 tracking-tight">Recent Activity</h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-2">
                                        {recentChecks.map((check) => (
                                            <div key={check.id} onClick={() => setSelectedImage(check)} className="p-3 mx-2 rounded-xl hover:bg-blue-50/50 transition flex items-center gap-3 group cursor-pointer">
                                                <div className="w-12 h-12 rounded-2xl bg-gray-100 overflow-hidden shadow-sm shrink-0 border border-gray-200 group-hover:border-blue-200 transition-colors">
                                                    {check.image_path ? (
                                                        <img src={`${STATIC_BASE_URL}/${check.image_path}`} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300"><Activity className="w-5 h-5" /></div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="font-bold text-sm text-gray-800 group-hover:text-blue-700 transition-colors">{check.machine_no}</span>
                                                        <div className="flex items-center gap-2">
                                                            {check.edit_count > 0 && <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-1.5 rounded border border-amber-100">Edited ({check.edit_count}/3)</span>}
                                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{new Date(check.submitted_at).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                                        <span className="font-medium bg-gray-100 px-1.5 rounded">Shift {check.shift}</span>
                                                        <span>•</span>
                                                        <span className="text-green-600 font-bold">OK: {check.ok_quantity}</span>
                                                        <span className="text-red-500 font-bold">NG: {check.ng_quantity}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </GlassCard>
                            </div>


                            {/* LEFT COLUMN (Charts): Moved for Desktop (Second Dom element -> order-1 on Desktop puts it left) */}
                            <div className="lg:col-span-8 space-y-8 order-2 lg:order-1"> {/* order-2 on mobile (after KPIs) */}

                                {/* Production Trend */}
                                <GlassCard className="h-[340px] shadow-xl shadow-blue-900/5">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800 tracking-tight">Total Output</h3>
                                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Daily Volume Trend</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-black text-gray-900 tracking-tight">{trendData.reduce((acc, c) => acc + c.Total, 0).toLocaleString()}</div>
                                            <div className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg inline-block mt-1">+12.5% vs Last Week</div>
                                        </div>
                                    </div>
                                    <div className="h-[220px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={trendData}>
                                                <defs>
                                                    <linearGradient id="colorTotalGlass" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', border: 'none', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                                                    itemStyle={{ color: '#1F2937', fontWeight: 'bold' }}
                                                />
                                                <Area type="monotone" dataKey="Total" stroke="#3B82F6" strokeWidth={4} fill="url(#colorTotalGlass)" animationDuration={1000} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </GlassCard>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Efficiency Donut */}
                                    <GlassCard className="flex flex-col items-center justify-center relative min-h-[300px] shadow-lg shadow-gray-200/50">
                                        <h3 className="absolute top-6 left-6 text-lg font-bold text-gray-800 tracking-tight">Efficiency Breakdown</h3>
                                        <div className="w-[200px] h-[200px] relative z-10">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    {/* Background Track Ring */}
                                                    <Pie data={[{ value: 100 }]} innerRadius={70} outerRadius={85} dataKey="value" fill="#F1F5F9" stroke="none" isAnimationActive={false} />
                                                    {/* Data Ring */}
                                                    <Pie data={lossData} innerRadius={70} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none" cornerRadius={10} startAngle={90} endAngle={-270}>
                                                        {lossData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-4xl font-black text-gray-800 tracking-tighter">{kpi.avg_bekido}%</span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">YIELD PASS</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 mt-6">
                                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-xs font-bold text-gray-500">OK</span></div>
                                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-xs font-bold text-gray-500">NG</span></div>
                                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div><span className="text-xs font-bold text-gray-500">LOSS</span></div>
                                        </div>
                                    </GlassCard>

                                    {/* Machine List */}
                                    <GlassCard className="flex flex-col max-h-[340px] overflow-hidden shadow-lg shadow-gray-200/50">
                                        <div className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 pb-4 border-b border-gray-50 flex justify-between items-center">
                                            <h3 className="text-lg font-bold text-gray-800 tracking-tight">Top Performers</h3>
                                            <button onClick={() => setShowFormulaInfo(true)} className="text-gray-400 hover:text-blue-500 transition">
                                                <Info className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar pt-4">
                                            {efficiencyData.slice(0, 5).map((m, idx) => {
                                                const pct = m.avg_bekido ? Math.round(m.avg_bekido) : 0;
                                                return (
                                                    <div key={idx} className="group flex items-center gap-4 p-3 hover:bg-gray-50/80 rounded-2xl transition-all cursor-default">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${pct >= 90 ? 'bg-emerald-500 shadow-emerald-200' : 'bg-blue-500 shadow-blue-200'}`}>
                                                            {idx + 1}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between mb-1">
                                                                <span className="font-bold text-gray-700">{m.machine_no}</span>
                                                                <span className="font-bold text-gray-900">{pct}%</span>
                                                            </div>
                                                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                                <div className={`h-full rounded-full transition-all duration-1000 ease-out ${pct >= 90 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </GlassCard>
                                </div>
                            </div>

                        </div>
                    </div>
                )
                }

                {/* ---------------- ANALYTICS TAB ---------------- */}
                {
                    activeTab === 'Analytics' && user?.role === 'admin' && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
                            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                                <div>
                                    <h2 className="text-4xl font-black text-gray-800 mb-1 tracking-tight">Deep Dive Analytics</h2>
                                    <p className="text-sm text-gray-500 font-medium">Advanced operational metrics and shift analysis.</p>
                                </div>
                                <button onClick={() => downloadCSV('checklists')} className="px-6 py-3 bg-gray-900 text-white rounded-2xl font-bold shadow-lg shadow-gray-900/20 active:scale-95 transition-transform flex items-center gap-2">
                                    <Download className="w-5 h-5" /> Generate Weekly Report
                                </button>
                            </div>

                            {/* Top Stats Row */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {[
                                    { label: 'Overall Yield', val: `${(Number(kpi.avg_bekido) || 0).toFixed(1)}%`, sub: '+2.4%', color: 'text-gray-800', bar: 'bg-blue-500' },
                                    { label: 'Quality Rate', val: `${(((kpi.total_ok || 0) / (kpi.total_actual || 1)) * 100).toFixed(1)}%`, sub: '-0.5%', color: 'text-gray-800', bar: 'bg-emerald-500' },
                                    { label: 'Rejection Rate', val: `${(((kpi.total_ng || 0) / (kpi.total_actual || 1)) * 100).toFixed(2)}%`, sub: 'Stable', color: 'text-gray-800', bar: 'bg-red-500' },
                                    { label: 'Utilisation', val: kpi.total_plan > 0 ? `${(((kpi.total_actual || 0) / kpi.total_plan) * 100).toFixed(1)}%` : '0%', sub: 'High', color: 'text-gray-800', bar: 'bg-purple-500' }
                                ].map((s, i) => (
                                    <GlassCard key={i} className="!p-5 flex flex-col justify-between h-32 group hover:-translate-y-1 transition-transform shadow-lg shadow-gray-200/50">
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{s.label}</span>
                                            <div className={`w-2 h-2 rounded-full ${s.bar}`}></div>
                                        </div>
                                        <div>
                                            <div className={`text-3xl font-black ${s.color} tracking-tight`}>{s.val}</div>
                                            <div className="text-xs font-bold text-gray-400 mt-1">{s.sub} vs Target</div>
                                        </div>
                                        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                            <div className={`h-full ${s.bar} w-[70%]`}></div>
                                        </div>
                                    </GlassCard>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Shift Radar */}
                                <GlassCard className="flex flex-col items-center min-h-[400px] shadow-lg shadow-gray-200/50">
                                    <h3 className="text-lg font-bold text-gray-800 self-start mb-4 tracking-tight">Shift Performance Matrix</h3>
                                    <div className="w-full flex-1">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={shiftRadarData}>
                                                <PolarGrid stroke="#E5E7EB" strokeDasharray="4 4" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 700 }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                                <Radar name="Quality" dataKey="Quality" stroke="#10B981" strokeWidth={3} fill="#10B981" fillOpacity={0.3} />
                                                <Radar name="Volume" dataKey="Volume" stroke="#3B82F6" strokeWidth={3} fill="#3B82F6" fillOpacity={0.3} />
                                                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '20px' }} />
                                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </GlassCard>

                                {/* Stacked Bar with Rounded Corners & Gradients */}
                                <GlassCard className="min-h-[400px]">
                                    <h3 className="text-lg font-bold text-gray-800 mb-6">Daily Shift Distribution</h3>
                                    <div className="w-full h-[320px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart layout="vertical" data={trendData} margin={{ top: 0, right: 30, left: 20, bottom: 0 }} barSize={32}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="date" type="category" tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 'bold' }} width={70} />
                                                <Tooltip cursor={{ fill: 'rgba(243, 244, 246, 0.5)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} />
                                                <Bar dataKey="Shift A" stackId="a" fill="#3B82F6" radius={[4, 0, 0, 4]} />
                                                <Bar dataKey="Shift B" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                                                <Bar dataKey="Shift C" stackId="a" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </GlassCard>
                            </div>

                            {/* Heatmap with Tighter Grid & Color Scale */}
                            <GlassCard>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-gray-800">Machine Efficiency Heatmap</h3>
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> &lt;70%</span>
                                        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-400 rounded-sm"></div> 70-85%</span>
                                        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> &gt;85%</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-1">
                                    {efficiencyData.map((m, idx) => {
                                        const pct = m.avg_bekido || 0;
                                        let colorClass = 'bg-red-500 text-white';
                                        if (pct >= 95) colorClass = 'bg-emerald-600 text-white';
                                        else if (pct >= 90) colorClass = 'bg-emerald-500 text-white';
                                        else if (pct >= 85) colorClass = 'bg-emerald-400 text-white';
                                        else if (pct >= 80) colorClass = 'bg-yellow-400 text-white';
                                        else if (pct >= 75) colorClass = 'bg-yellow-500 text-white';
                                        else if (pct >= 70) colorClass = 'bg-orange-500 text-white';

                                        return (
                                            <div key={idx}
                                                title={`Machine ${m.machine_no}: ${Math.round(pct)}%`}
                                                className={`aspect-square rounded-md flex items-center justify-center cursor-help transition-all hover:scale-110 hover:z-10 shadow-sm ${colorClass}`}>
                                                <span className="text-[10px] font-bold">{m.machine_no}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </GlassCard>
                        </div>
                    )
                }

                {/* OPERATOR HOME VIEW */}
                {
                    (!user?.role || user?.role !== 'admin') && (activeTab === 'Home') && (
                        <div className="max-w-2xl mx-auto mt-20">
                            <GlassCard className="text-center p-12">
                                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
                                    <User className="w-10 h-10" />
                                </div>
                                <h2 className="text-3xl font-black text-gray-800 mb-2">Welcome, {user?.username}</h2>
                                <p className="text-gray-500 mb-10">Select an action to get started.</p>

                                <div className="flex flex-col sm:flex-row justify-center gap-6">
                                    <button onClick={() => navigate('/scanner')} className="group relative px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-600/30 active:scale-95 transition-all overflow-hidden">
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                                        <div className="relative flex items-center justify-center gap-3">
                                            <ClipboardList className="w-6 h-6" /> Start New Scan
                                        </div>
                                    </button>
                                    <button onClick={() => navigate('/history')} className="px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-2xl font-bold hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all flex items-center justify-center gap-3">
                                        <Activity className="w-6 h-6" /> View History
                                    </button>
                                </div>
                            </GlassCard>
                        </div>
                    )
                }

            </div >
        </div >
    );
};

export default Home;

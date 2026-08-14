import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { Activity, CheckCircle, AlertTriangle, ArrowLeft, ShieldCheck, Box, Settings, ListTodo, Edit3, Save, X, Clock, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MachineDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [machine, setMachine] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditingProduction, setIsEditingProduction] = useState(false);
    
    // Production Edit fields
    const [actual, setActual] = useState(0);
    const [revised, setRevised] = useState(0);
    const [mct, setMct] = useState(0);
    const [workingHours, setWorkingHours] = useState(8);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const mRes = await api.get('/machines');
                const numericId = parseInt(id, 10);
                const found = mRes.data.find(m => m.id === numericId);

                if (found) {
                    setMachine(found);
                    setActual(found.prod_plan_actual || 0);
                    setRevised(found.prod_plan_revised || 0);
                    setMct(found.mct || 0);
                    setWorkingHours(found.working_hours || 8);
                } else {
                    setError(`Machine with ID "${id}" (numeric: ${numericId}) not found in the machines database.`);
                }
                setLoading(false);
            } catch (err) {
                console.error(err);
                setError(`API Fetch Error: ${err.message || err.toString()}`);
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    const handleSaveProduction = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put(`/machines/${id}/production`, {
                prod_plan_actual: parseInt(actual) || 0,
                prod_plan_revised: parseInt(revised) || 0,
                mct: parseFloat(mct) || 0,
                working_hours: parseFloat(workingHours) || 8
            });
            
            // Update local state
            setMachine(prev => ({
                ...prev,
                prod_plan_actual: parseInt(actual) || 0,
                prod_plan_revised: parseInt(revised) || 0,
                mct: parseFloat(mct) || 0,
                working_hours: parseFloat(workingHours) || 8
            }));
            
            alert("Production logs updated successfully!");
            setIsEditingProduction(false);
        } catch (err) {
            console.error(err);
            const errMsg = err.response?.data?.error || err.response?.data || err.message || err.toString();
            alert(`Failed to update production logs: ${errMsg}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );
    
    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md border border-red-100 space-y-4">
                <AlertTriangle className="w-16 h-16 text-red-500 mx-auto animate-bounce" />
                <h2 className="text-xl font-bold text-slate-800">Scan Lookup Failed</h2>
                <p className="text-slate-500 text-sm">{error}</p>
                <div className="pt-4">
                    <Link to={user ? "/dashboard" : "/"} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold transition">
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
    
    if (!machine) return (
        <div className="min-h-screen flex items-center justify-center font-bold text-gray-500 bg-slate-50">
            Machine Not Found
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-12">
            {/* Navbar */}
            <nav className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 sticky top-0 z-50">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-bold">Home</span>
                    </Link>
                    <span className="font-black text-slate-800 tracking-tight">Machine Hub</span>
                    <div className="w-5"></div>
                </div>
            </nav>

            <div className="max-w-2xl mx-auto p-6">
                {/* ID Header Card */}
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 mb-6">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-lg">
                                <Box className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-black mb-1">{machine.machine_no}</h1>
                            <p className="opacity-80 text-sm">{machine.model || 'Process Tool'} • Line {machine.line_no}</p>
                            <div className="text-center mt-6 text-slate-300 text-xs">EquipGuard Smart QR Hub</div>
                        </div>
                    </div>

                    {/* Machine Spec Summaries */}
                    <div className="p-6 bg-slate-50/50 grid grid-cols-2 gap-4 border-b border-slate-100">
                        <div className="p-3 bg-white rounded-xl border border-slate-100 text-center">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</span>
                            <span className="flex items-center justify-center gap-1.5 text-green-600 font-extrabold text-sm">
                                <CheckCircle className="w-4 h-4" /> Active
                            </span>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-100 text-center">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Plan</span>
                            <span className="block text-slate-800 font-extrabold text-sm">{machine.prod_plan} Units</span>
                        </div>
                    </div>
                </div>

                {/* Unified Options Selection Panel */}
                {!user ? (
                    /* Anonymous scan view -> Requires login */
                    <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center space-y-4">
                        <ShieldCheck className="w-12 h-12 text-blue-500 mx-auto" />
                        <h2 className="text-xl font-bold text-slate-800">Secure Audit Required</h2>
                        <p className="text-slate-500 text-sm max-w-md mx-auto">
                            To enter production quantities or submit process checks for this machine, please log in with your authorized operator or officer credentials.
                        </p>
                        <Link 
                            to={`/login?redirect=/machine/${id}`} 
                            className="block w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition shadow-lg shadow-blue-600/20"
                        >
                            Sign In to EquipGuard
                        </Link>
                    </div>
                ) : (
                    /* Authenticated Scan Selection View */
                    <div className="space-y-6">
                        {!isEditingProduction ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Option A: Log/Update Production Card */}
                                <button
                                    onClick={() => setIsEditingProduction(true)}
                                    className="bg-white hover:border-blue-500 rounded-3xl p-6 shadow-lg border border-slate-100 text-left transition flex flex-col justify-between group h-56"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition">
                                        <Settings className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-1">Update Production</h3>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Log actual/revised quantity, cycle times, and working hours for this shift.
                                        </p>
                                    </div>
                                </button>

                                {/* Option B: Checklist Audit Card */}
                                <button
                                    onClick={() => navigate(`/checklist/${id}`)}
                                    className="bg-white hover:border-indigo-500 rounded-3xl p-6 shadow-lg border border-slate-100 text-left transition flex flex-col justify-between group h-56"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition">
                                        <ListTodo className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-1">Process Check-List</h3>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Run through process parameter check sheets, Fire safety, and 4M startup checks.
                                        </p>
                                    </div>
                                </button>
                            </div>
                        ) : (
                            /* Inline Production Editor Panel */
                            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-6">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                    <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                                        <Settings className="w-5 h-5 text-blue-600 animate-spin" style={{ animationDuration: '6s' }} /> Log Production Specs
                                    </h2>
                                    <button 
                                        onClick={() => setIsEditingProduction(false)}
                                        className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleSaveProduction} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Actual Qty</label>
                                            <input 
                                                type="number"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={actual}
                                                onChange={(e) => setActual(e.target.value)}
                                                min="0"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Revised Plan</label>
                                            <input 
                                                type="number"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={revised}
                                                onChange={(e) => setRevised(e.target.value)}
                                                min="0"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cycle Time (MCT - s)</label>
                                            <input 
                                                type="number"
                                                step="0.01"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={mct}
                                                onChange={(e) => setMct(e.target.value)}
                                                min="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Working Hours</label>
                                            <input 
                                                type="number"
                                                step="0.5"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={workingHours}
                                                onChange={(e) => setWorkingHours(e.target.value)}
                                                min="0"
                                                max="24"
                                            />
                                        </div>
                                    </div>

                                    <button 
                                        type="submit"
                                        disabled={saving}
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 mt-4"
                                    >
                                        <Save className="w-5 h-5" />
                                        {saving ? "Saving Logs..." : "Save Production Data"}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MachineDetails;

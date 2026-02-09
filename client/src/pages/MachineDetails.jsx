
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { Activity, CheckCircle, AlertTriangle, ArrowLeft, ShieldCheck, Box } from 'lucide-react';

const MachineDetails = () => {
    const { id } = useParams();
    const [machine, setMachine] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                // Fetch Machine Info
                const mRes = await api.get('/machines');
                const found = mRes.data.find(m => m.id == id);

                if (found) {
                    setMachine(found);
                    // Fetch recent stats/status for this machine (public endpoint needed?)
                    // For now, re-use existing if allowed, or just show static info
                    try {
                        // Attempt to fetch public stats or similar 
                        // If endpoints are protected, we might only show static info for now
                        // Let's assume we can at least show the machine details
                    } catch (e) {
                        console.warn("Could not fetch stats", e);
                    }
                }
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    if (!machine) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Machine Not Found</div>;

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Navbar */}
            <nav className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 sticky top-0 z-50">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-bold">Back</span>
                    </Link>
                    <span className="font-black text-slate-800 tracking-tight">Machine Details</span>
                </div>
            </nav>

            <div className="max-w-2xl mx-auto p-6">
                {/* ID Card */}
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 mb-6">
                    <div className="bg-blue-600 p-8 text-white text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-lg">
                                <Box className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-black mb-1">{machine.machine_no}</h1>
                            <div className="text-center mt-12 text-slate-400 text-sm">EquipGuard System V2.3</div>
                            <div className="inline-block mt-4 px-4 py-1 bg-black/20 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-sm border border-white/10">
                                Line {machine.line_no}
                            </div>
                        </div>
                    </div>

                    <div className="p-8">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status</span>
                                <span className="flex items-center justify-center gap-2 text-green-600 font-black text-lg">
                                    <CheckCircle className="w-5 h-5" /> Active
                                </span>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Plan</span>
                                <span className="block text-slate-800 font-black text-lg">{machine.prod_plan} Units</span>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                            <p className="text-slate-500 mb-6 text-sm">Authorized personnel can perform inspections on this machine.</p>
                            <Link to={`/login?redirect=/checklist/${id}`} className="block w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-900/20">
                                Officer Login & Inspect
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MachineDetails;

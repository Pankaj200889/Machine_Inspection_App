import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Plus, Trash, QrCode, ArrowLeft, Printer, Edit2, Save, X } from 'lucide-react';

const MachineList = () => {
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
    const [formData, setFormData] = useState({
        id: null, machine_no: '', line_no: '', model: '',
        prod_plan: '', prod_plan_actual: '', mct: '', working_hours: '8'
    });

    const [qrData, setQrData] = useState(null);
    const { user } = useAuth();
    // api instance handles Auth header

    useEffect(() => {
        fetchMachines();
    }, []);

    const fetchMachines = async () => {
        setLoading(true);
        try {
            const res = await api.get('/machines');
            setMachines(res.data);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setModalMode('add');
        setFormData({
            id: null, machine_no: '', line_no: '', model: '',
            prod_plan: '', prod_plan_actual: '', mct: '', working_hours: '8'
        });
        setShowModal(true);
    };

    const openEditModal = (machine) => {
        setModalMode('edit');
        setFormData({
            id: machine.id,
            machine_no: machine.machine_no,
            line_no: machine.line_no,
            model: machine.model,
            prod_plan: machine.prod_plan,
            prod_plan_actual: machine.prod_plan_actual || 0,
            mct: machine.mct || 0,
            working_hours: machine.working_hours || 8
        });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (modalMode === 'add') {
                await api.post('/machines', formData);
            } else {
                await api.put(`/machines/${formData.id}`, formData);
            }
            setShowModal(false);
            fetchMachines();
        } catch (error) {
            alert(error.response?.data?.error || 'Error saving machine');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure? This will delete all checklists for this machine.')) return;
        try {
            await api.delete(`/machines/${id}`);
            fetchMachines();
        } catch (error) {
            alert('Error deleting machine');
        }
    };

    const handleGenerateQR = async (id) => {
        try {
            const res = await api.get(`/machines/${id}/qr`);
            setQrData({ machine: res.data.machine, img: res.data.qrCode });
        } catch (error) {
            alert('Error generating QR');
        }
    };

    const printQR = () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head><title>Print QR - ${qrData.machine.machine_no}</title></head>
                <body style="text-align: center; font-family: sans-serif;">
                    <h1>${qrData.machine.machine_no}</h1>
                    <img src="${qrData.img}" style="width: 300px; height: 300px;" />
                    <p>Model: ${qrData.machine.model}</p>
                    <script>window.print();</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6 md:mb-8 sticky top-0 bg-[#F3F4F6] z-30 py-2">
                <div className="flex items-center gap-3 md:gap-4">
                    <Link to="/" className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition shadow-sm">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <h1 className="text-xl md:text-3xl font-black text-gray-800 tracking-tight">Machines</h1>
                </div>
                <button
                    onClick={openAddModal}
                    className="hidden md:flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition font-bold"
                >
                    <Plus className="w-5 h-5" /> Add Machine
                </button>
            </div>

            {/* Mobile Floating Action Button (FAB) */}
            <button
                onClick={openAddModal}
                className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-[0_4px_20px_rgba(37,99,235,0.4)] flex items-center justify-center z-50 hover:scale-110 active:scale-95 transition-all"
            >
                <Plus className="w-7 h-7" />
            </button>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-xl shadow overflow-auto max-h-[calc(100vh-140px)] border border-gray-100 relative custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-gray-50 border-b z-40">
                        <tr>
                            <th className="p-4 font-semibold text-gray-700 shadow-sm sticky top-0 left-0 z-50 bg-gray-50 border-r border-gray-200 outline outline-1 outline-gray-200">Machine No</th>
                            <th className="p-4 font-semibold text-gray-600 shadow-sm sticky top-0 z-40 bg-gray-50 border-b border-gray-200">Line</th>
                            <th className="p-4 font-semibold text-gray-600 shadow-sm sticky top-0 z-40 bg-gray-50 border-b border-gray-200">Model</th>
                            <th className="p-4 font-semibold text-gray-600 text-center shadow-sm sticky top-0 z-40 bg-gray-50 border-b border-gray-200">Plan (Std/Act)</th>
                            <th className="p-4 font-semibold text-gray-600 text-center shadow-sm sticky top-0 z-40 bg-gray-50 border-b border-gray-200">MCT (s)</th>
                            <th className="p-4 font-semibold text-gray-600 text-center shadow-sm sticky top-0 z-40 bg-gray-50 border-b border-gray-200">Hrs</th>
                            <th className="p-4 font-semibold text-gray-600 text-right shadow-sm sticky top-0 z-40 bg-gray-50 border-b border-gray-200">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {machines.map((machine) => (
                            <tr key={machine.id} className="border-b hover:bg-gray-50 transition group">
                                <td className="p-4 font-medium sticky left-0 z-30 bg-white group-hover:bg-gray-50 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{machine.machine_no}</td>
                                <td className="p-4 text-gray-500">{machine.line_no}</td>
                                <td className="p-4 text-gray-500">{machine.model}</td>
                                <td className="p-4 text-center">
                                    <span className="font-bold text-gray-800">{machine.prod_plan}</span>
                                    <span className="text-gray-400 mx-1">/</span>
                                    <span className="text-blue-600">{machine.prod_plan_actual}</span>
                                </td>
                                <td className="p-4 text-center text-gray-500">{machine.mct}</td>
                                <td className="p-4 text-center text-gray-500">{machine.working_hours}</td>
                                <td className="p-4 flex justify-end gap-2">
                                    <button onClick={() => openEditModal(machine)} className="p-2 text-green-600 hover:bg-green-50 rounded transition" title="Edit Machine"><Edit2 className="w-5 h-5" /></button>
                                    <button onClick={() => handleGenerateQR(machine.id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition" title="Generate QR"><QrCode className="w-5 h-5" /></button>
                                    <button onClick={() => handleDelete(machine.id)} className="p-2 text-red-600 hover:bg-red-50 rounded transition" title="Delete"><Trash className="w-5 h-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden grid grid-cols-1 gap-4 pb-24">
                {machines.map((machine, idx) => (
                    <div key={machine.id} className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-100 flex flex-col gap-4 animate-in slide-in-from-bottom duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">line {machine.line_no}</div>
                                <h3 className="text-xl font-black text-gray-800">{machine.machine_no}</h3>
                                <p className="text-sm text-gray-500 font-medium">{machine.model}</p>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className={`px-2 py-1 rounded-lg text-xs font-bold ${machine.prod_plan_actual >= machine.prod_plan ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>
                                    {machine.prod_plan_actual >= machine.prod_plan ? 'Target Met' : 'In Progress'}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <div className="text-center border-r border-gray-200">
                                <div className="text-[10px] text-gray-400 font-bold uppercase">Target</div>
                                <div className="text-lg font-black text-gray-800">{machine.prod_plan}</div>
                            </div>
                            <div className="text-center border-r border-gray-200">
                                <div className="text-[10px] text-gray-400 font-bold uppercase">Actual</div>
                                <div className="text-lg font-black text-blue-600">{machine.prod_plan_actual}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[10px] text-gray-400 font-bold uppercase">MCT</div>
                                <div className="text-lg font-black text-gray-800">{machine.mct}s</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-auto pt-2">
                            <button onClick={() => openEditModal(machine)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 font-bold text-sm transition-colors flex items-center justify-center gap-2">
                                <Edit2 className="w-4 h-4" /> Edit
                            </button>
                            <button onClick={() => handleGenerateQR(machine.id)} className="flex-1 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
                                <QrCode className="w-4 h-4" /> QR
                            </button>
                            <button onClick={() => handleDelete(machine.id)} className="w-12 py-3 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl font-bold text-sm transition-colors flex items-center justify-center">
                                <Trash className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl transform transition-all scale-100">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <h2 className="text-2xl font-bold text-gray-800">
                                {modalMode === 'add' ? 'Add New Machine' : 'Edit Machine'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Machine No</label>
                                    <input
                                        type="text" required
                                        className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.machine_no}
                                        onChange={e => setFormData({ ...formData, machine_no: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Line No</label>
                                    <input
                                        type="text" required
                                        className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.line_no}
                                        onChange={e => setFormData({ ...formData, line_no: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Model Name</label>
                                    <input
                                        type="text" required
                                        className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.model}
                                        onChange={e => setFormData({ ...formData, model: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border">
                                <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Production Parameters</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Standard Plan (Target)</label>
                                        <input
                                            type="number" required
                                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.prod_plan}
                                            onChange={e => setFormData({ ...formData, prod_plan: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Actual Plan (Today)</label>
                                        <input
                                            type="number"
                                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.prod_plan_actual}
                                            onChange={e => setFormData({ ...formData, prod_plan_actual: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Cycle Time (MCT) <span className="text-xs font-normal text-gray-500">seconds</span></label>
                                        <input
                                            type="number" step="0.1" required
                                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.mct}
                                            onChange={e => setFormData({ ...formData, mct: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Working Hours</label>
                                        <input
                                            type="number" step="0.5" required
                                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.working_hours}
                                            onChange={e => setFormData({ ...formData, working_hours: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-2 border-t">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition">Cancel</button>
                                <button type="submit" className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md transition">
                                    <Save className="w-4 h-4" /> Save Machine
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* QR Code Modal (Unchanged) */}
            {qrData && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center transform transition-all scale-100">
                        <div className="mb-4">
                            <h2 className="text-2xl font-bold text-gray-800">{qrData.machine.machine_no}</h2>
                            <p className="text-gray-500">{qrData.machine.model}</p>
                        </div>
                        <div className="bg-white p-2 rounded-xl shadow-inner inline-block mb-6 border">
                            <img src={qrData.img} alt="QR Code" className="w-48 h-48" />
                        </div>

                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setQrData(null)} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition">Close</button>
                            <button onClick={printQR} className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-md transition transform hover:-translate-y-0.5">
                                <Printer className="w-4 h-4" /> Print QR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MachineList;

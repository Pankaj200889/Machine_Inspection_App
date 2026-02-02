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
            alert('Error saving machine');
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
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-800">Machine Management</h1>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md transition"
                >
                    <Plus className="w-5 h-5" /> Add Machine
                </button>
            </div>

            <div className="bg-white rounded-xl shadow overflow-auto max-h-[calc(100vh-140px)] border border-gray-100 relative">
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
                                    <button
                                        onClick={() => openEditModal(machine)}
                                        className="p-2 text-green-600 hover:bg-green-50 rounded transition"
                                        title="Edit Machine"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleGenerateQR(machine.id)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                                        title="Generate QR"
                                    >
                                        <QrCode className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(machine.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                                        title="Delete"
                                    >
                                        <Trash className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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
                                <div className="grid grid-cols-2 gap-4">
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

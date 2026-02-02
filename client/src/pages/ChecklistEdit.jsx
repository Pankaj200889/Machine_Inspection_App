import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import api from '../api';

const ChecklistEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [checklist, setChecklist] = useState(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({ ok_quantity: '', ng_quantity: '', total_quantity: '' });

    // Photo Replacement State
    const [replacePhoto, setReplacePhoto] = useState(false);
    const [newImage, setNewImage] = useState(null);
    const [proof, setProof] = useState(null);

    useEffect(() => {
        fetchChecklist();
    }, [id]);

    const fetchChecklist = async () => {
        try {
            // Using API instance which handles base URL
            const res = await api.get('/checklists');
            const found = res.data.find(c => c.id === parseInt(id));
            if (found) {
                setChecklist(found);
                setFormData({
                    ok_quantity: found.ok_quantity,
                    ng_quantity: found.ng_quantity,
                    total_quantity: found.total_quantity || (found.ok_quantity + found.ng_quantity)
                });
            } else {
                alert('Checklist not found in recent items.');
                navigate('/');
            }
            setLoading(false);
        } catch (error) {
            console.error(error);
            navigate('/');
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();

        // Validation: Proof required if replacing photo
        if (replacePhoto && !proof) {
            alert("Approval Proof (Email/Doc screenshot) is REQUIRED to update the photo.");
            return;
        }

        if (!window.confirm('Are you sure you want to revise this record? This action is logged.')) return;

        try {
            const data = new FormData();
            data.append('ok_quantity', formData.ok_quantity);
            data.append('ng_quantity', formData.ng_quantity);
            data.append('total_quantity', formData.total_quantity);
            data.append('device_info', navigator.userAgent);

            // Location (simplified)
            if (navigator.geolocation) {
                await new Promise(resolve => {
                    navigator.geolocation.getCurrentPosition(pos => {
                        data.append('location', `${pos.coords.latitude},${pos.coords.longitude}`);
                        resolve();
                    }, () => resolve());
                });
            }

            if (replacePhoto && newImage) {
                data.append('image', newImage);
                data.append('proof', proof);
            }

            await api.put(`/checklists/${id}`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            alert('Revised Successfully');
            navigate('/');
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.error || 'Error revising checklist');
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading details...</div>;
    if (!checklist) return null;

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex items-center justify-center font-sans">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
                <div className="flex items-center gap-4 mb-6 border-b pb-4">
                    <button onClick={() => navigate('/')} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Revise Checklist</h1>
                        <p className="text-gray-500 text-sm">ID: #{checklist.id} • {checklist.machine_no}</p>
                    </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex gap-3 text-yellow-800 text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <div>
                        <p className="font-bold">Audit Warning</p>
                        <p>Revising this record will update production metrics. If you change the photo, you MUST upload approval proof.</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">OK Quantity</label>
                            <input
                                type="number" required
                                className="w-full text-center text-3xl font-bold p-3 border-2 border-green-200 rounded-lg focus:border-green-500 outline-none text-green-700 bg-green-50"
                                value={formData.ok_quantity}
                                onChange={e => setFormData({ ...formData, ok_quantity: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">NG Quantity</label>
                            <input
                                type="number" required
                                className="w-full text-center text-3xl font-bold p-3 border-2 border-red-200 rounded-lg focus:border-red-500 outline-none text-red-700 bg-red-50"
                                value={formData.ng_quantity}
                                onChange={e => setFormData({ ...formData, ng_quantity: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Photo Replacement UI */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 transition-all">
                        <div className="flex items-center gap-2 mb-3">
                            <input
                                type="checkbox"
                                id="replacePhoto"
                                checked={replacePhoto}
                                onChange={e => setReplacePhoto(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                            />
                            <label htmlFor="replacePhoto" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                                Replace Condition Photo
                            </label>
                        </div>

                        {replacePhoto && (
                            <div className="space-y-4 pl-6 animate-pulse-once">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">New Condition Photo</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => setNewImage(e.target.files[0])}
                                        className="w-full text-sm text-gray-500 file:mr-2 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                </div>
                                <div className="bg-red-50 p-3 rounded border border-red-100">
                                    <label className="block text-xs font-bold text-red-700 mb-1">Approval Proof (REQUIRED)</label>
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={e => setProof(e.target.files[0])}
                                        className="w-full text-sm text-red-500 file:mr-2 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                                    />
                                    <p className="text-[10px] text-red-600 mt-1 italic">* Upload screenshot of approval email from Senior Leader.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                            <span>Original Submission:</span>
                            <span>{new Date(checklist.submitted_at).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Submitted By:</span>
                            <span>{checklist.username || 'User'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Machine Model:</span>
                            <span>{checklist.model}</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-bold shadow-md hover:bg-blue-700 transition flex items-center justify-center gap-2"
                    >
                        <Save className="w-5 h-5" /> Save Revision
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChecklistEdit;

import React, { useEffect, useState } from 'react';
import api from '../api';
import { Building, ShieldCheck, Power, Search, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SuperAdmin = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showNewModal, setShowNewModal] = useState(false);
    const [newOrg, setNewOrg] = useState({ company_name: '', admin_email: '', admin_password: '' });

    useEffect(() => {
        if (user && user.role !== 'super_admin') {
            navigate('/');
        } else {
            fetchOrganizations();
        }
    }, [user]);

    const fetchOrganizations = async () => {
        try {
            const res = await api.get('/superadmin/organizations');
            setOrganizations(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrg = async (e) => {
        e.preventDefault();
        try {
            await api.post('/superadmin/organizations', newOrg);
            setShowNewModal(false);
            setNewOrg({ company_name: '', admin_email: '', admin_password: '' });
            fetchOrganizations();
            alert("Organization created successfully");
        } catch (err) {
            alert(err.response?.data?.error || "Error creating organization");
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        if (!window.confirm(`Are you sure you want to ${newStatus === 'suspended' ? 'SUSPEND' : 'ACTIVATE'} this organization?`)) return;
        
        try {
            await api.put(`/superadmin/organizations/${id}/status`, { status: newStatus });
            fetchOrganizations();
        } catch (err) {
            alert("Error toggling status");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Organizations...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                            <ShieldCheck className="w-8 h-8 text-blue-600" />
                            Global SaaS Admin
                        </h1>
                        <p className="text-gray-500">Manage all tenant organizations and billing access.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => {
                                localStorage.removeItem('token');
                                localStorage.removeItem('user');
                                window.location.href = '/login';
                            }}
                            className="bg-gray-100 text-gray-600 px-4 py-2.5 rounded-xl font-bold hover:bg-gray-200 flex items-center gap-2"
                        >
                            <Power className="w-5 h-5" /> Logout
                        </button>
                        <button 
                            onClick={() => setShowNewModal(true)}
                            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-500/30"
                        >
                            <Plus className="w-5 h-5" /> New Client
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Company</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Plan</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Users</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Machines</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {organizations.map(org => (
                                <tr key={org.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4 text-sm font-bold text-gray-400">#{org.id}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                {org.company_name?.charAt(0)}
                                            </div>
                                            <span className="font-bold text-gray-800">{org.company_name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm">
                                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold uppercase">{org.subscription_plan}</span>
                                    </td>
                                    <td className="p-4 text-sm font-medium text-gray-600">{org.user_count}</td>
                                    <td className="p-4 text-sm font-medium text-gray-600">{org.machine_count}</td>
                                    <td className="p-4">
                                        {org.status === 'active' ? (
                                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1 w-max"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> Active</span>
                                        ) : (
                                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold flex items-center gap-1 w-max"><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> Suspended</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => toggleStatus(org.id, org.status)}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${org.status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                                        >
                                            {org.status === 'active' ? 'Suspend' : 'Activate'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {showNewModal && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold mb-6">Onboard New Client</h2>
                        <form onSubmit={handleCreateOrg} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Company Name</label>
                                <input type="text" required value={newOrg.company_name} onChange={e => setNewOrg({...newOrg, company_name: e.target.value})} className="w-full border border-gray-200 rounded-lg p-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none" placeholder="e.g. Tata Motors" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Admin Email</label>
                                <input type="email" required value={newOrg.admin_email} onChange={e => setNewOrg({...newOrg, admin_email: e.target.value})} className="w-full border border-gray-200 rounded-lg p-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none" placeholder="admin@client.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Admin Password</label>
                                <input type="password" required value={newOrg.admin_password} onChange={e => setNewOrg({...newOrg, admin_password: e.target.value})} className="w-full border border-gray-200 rounded-lg p-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none" />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowNewModal(false)} className="flex-1 px-4 py-2 text-gray-600 font-bold hover:bg-gray-50 rounded-lg">Cancel</button>
                                <button type="submit" className="flex-1 bg-blue-600 text-white font-bold rounded-lg px-4 py-2 hover:bg-blue-700">Create Client</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdmin;

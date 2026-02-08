import React, { useState, useEffect } from 'react';
import api from '../api';
import { Trash2, UserPlus, Users as UsersIcon, Shield, Mail, X } from 'lucide-react';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // New User State
    const [newUser, setNewUser] = useState({
        username: '',
        email: '',
        password: '',
        role: 'operator'
    });
    const [error, setError] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/auth/users');
            setUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch users", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await api.post('/auth/register', newUser);
            setShowAddModal(false);
            setNewUser({ username: '', email: '', password: '', role: 'operator' });
            fetchUsers(); // Refresh list
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create user');
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            await api.delete(`/auth/users/${id}`);
            setUsers(users.filter(u => u.id !== id));
        } catch (err) {
            console.error("Failed to delete user", err);
            alert("Failed to delete user");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">User Management</h1>
                        <p className="text-slate-500 font-medium">Manage system access and roles.</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition flex items-center gap-2"
                    >
                        <UserPlus className="w-5 h-5" /> Add User
                    </button>
                </div>

                {/* Users List */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-slate-400 uppercase text-xs">User</th>
                                    <th className="px-6 py-4 font-bold text-slate-400 uppercase text-xs">Role</th>
                                    <th className="px-6 py-4 font-bold text-slate-400 uppercase text-xs">Joined</th>
                                    <th className="px-6 py-4 font-bold text-slate-400 uppercase text-xs text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400">Loading users...</td></tr>
                                ) : users.length === 0 ? (
                                    <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400">No users found.</td></tr>
                                ) : (
                                    users.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50/50 transition">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                        <UsersIcon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800">{user.username}</div>
                                                        <div className="text-xs text-slate-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {user.role === 'admin' ? <Shield className="w-3 h-3" /> : <UsersIcon className="w-3 h-3" />}
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-500">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {user.username !== 'admin' && ( // Prevent deleting default admin if username check matches
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">Add New User</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddUser} className="p-6 space-y-4">
                            {error && <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-lg">{error}</div>}

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                                    value={newUser.username}
                                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                />
                                <p className="text-xs text-slate-400 mt-1">Must be at least 8 chars with number & symbol.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                                <select
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium appearance-none"
                                    value={newUser.role}
                                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                >
                                    <option value="operator">Operator</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition">Cancel</button>
                                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition">Create User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;

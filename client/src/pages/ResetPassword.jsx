import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '../api';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [msg, setMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setStatus('error');
            setMsg("Passwords do not match");
            return;
        }

        setStatus('loading');
        try {
            await api.post('/auth/reset-password', { token, newPassword: password });
            setStatus('success');
        } catch (err) {
            setStatus('error');
            setMsg(err.response?.data?.error || "Failed to reset password. Link may be expired.");
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Invalid Link</h2>
                    <p className="text-gray-500 mb-6">This password reset link is invalid or missing.</p>
                    <Link to="/" className="text-blue-600 font-bold hover:underline">Return to Login</Link>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full animate-in zoom-in-95">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Password Reset!</h2>
                    <p className="text-gray-500 mb-6">Your password has been updated successfully.</p>
                    <Link to="/" className="w-full block py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition">Return to Login</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
                <div className="mb-8">
                    <div className="flex items-center mb-2">
                        <Link to="/" className="p-2 -ml-2 text-gray-400 hover:text-gray-600 transition rounded-full hover:bg-gray-100 shrink-0">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h2 className="text-2xl font-bold text-gray-800 text-center flex-1 pr-8">Set New Password</h2>
                    </div>
                    <p className="text-center text-gray-500 text-sm">Create a strong password for your account.</p>
                </div>

                {status === 'error' && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-sm font-bold text-center border border-red-100">{msg}</div>}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Password</label>
                        <input
                            type="password"
                            required
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium transition"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirm Password</label>
                        <input
                            type="password"
                            required
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium transition"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {status === 'loading' ? 'Updating...' : 'Reset Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;

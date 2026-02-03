import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Mail, ChevronLeft, Send } from 'lucide-react';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        try {
            await api.post('/auth/forgot-password', { email });
            setStatus('success');
            setMessage('If an account exists for that email, we have sent a password reset link.');
        } catch (err) {
            setStatus('error');
            setMessage(err.response?.data?.error || 'Failed to send reset link.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="text-center mb-8">
                    <div className="bg-blue-100 p-3 rounded-full w-fit mx-auto mb-4">
                        <Mail className="h-8 w-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Forgot Password</h2>
                    <p className="text-gray-500 mt-2 text-sm">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                </div>

                {status === 'success' ? (
                    <div className="bg-green-50 border border-green-100 rounded-xl p-6 text-center">
                        <h3 className="text-green-800 font-semibold mb-2">Check your Email</h3>
                        <p className="text-green-600 text-sm">{message}</p>
                        <Link to="/login" className="mt-6 inline-flex items-center text-blue-600 font-medium hover:text-blue-700">
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Back to Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="admin@example.com"
                            />
                        </div>

                        {status === 'error' && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50"
                        >
                            {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
                            {!status === 'loading' && <Send className="ml-2 h-4 w-4" />}
                        </button>

                        <div className="text-center">
                            <Link to="/login" className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center justify-center">
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Back to Login
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;

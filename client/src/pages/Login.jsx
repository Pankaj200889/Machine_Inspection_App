import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowLeft, Building } from 'lucide-react';
import api, { STATIC_BASE_URL } from '../api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    // Subdomain logic
    const [subdomain, setSubdomain] = useState('');
    const [tenantInfo, setTenantInfo] = useState(null);

    useEffect(() => {
        const hostname = window.location.hostname;
        // Check if there is a subdomain (e.g. tata.siddhiss.com)
        // Ignoring 'www', 'machine', 'machine-api', or localhost (unless testing)
        const parts = hostname.split('.');
        if (parts.length >= 3) {
            const sub = parts[0];
            if (!['www', 'machine', 'machine-api'].includes(sub)) {
                setSubdomain(sub);
                fetchTenantInfo(sub);
            }
        }
    }, []);

    const fetchTenantInfo = async (sub) => {
        try {
            const res = await api.get(`/public/tenant/${sub}`);
            setTenantInfo(res.data);
        } catch (err) {
            console.error("Tenant not found");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await login(email, password, subdomain);
        if (res.success) {
            const params = new URLSearchParams(window.location.search);
            const redirect = params.get('redirect');
            if (res.user.role === 'super_admin') {
                navigate(redirect || '/superadmin');
            } else {
                navigate(redirect || '/dashboard');
            }
        } else {
            setError(res.error);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 transform transition-all hover:scale-105">
                <div className="text-center mb-8 relative px-6 md:px-0">
                    <Link to="/" className="absolute left-0 top-1 text-gray-400 hover:text-gray-600 transition p-1 -ml-2 md:ml-0">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>

                    {/* Dynamic Tenant Branding */}
                    {tenantInfo ? (
                        <div className="flex flex-col items-center mb-4">
                            {tenantInfo.logo_url ? (
                                <img src={tenantInfo.logo_url.startsWith('http') ? tenantInfo.logo_url : `${STATIC_BASE_URL}/${tenantInfo.logo_url}`} className="h-16 mb-2 object-contain" alt="Logo" />
                            ) : (
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-2">
                                    <Building className="w-8 h-8" />
                                </div>
                            )}
                            <h2 className="text-2xl font-black text-gray-900">{tenantInfo.company_name}</h2>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Welcome Back</h2>
                        </>
                    )}
                    <p className="text-gray-500 mt-2 text-sm md:text-base">Sign in to your account</p>
                </div>

                {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-gray-700 text-sm font-semibold mb-2">Email or Username</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="admin or admin@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-semibold mb-2">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                            <input
                                type="password"
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="text-right mt-2">
                            <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800 font-medium">Forgot Password?</Link>
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
                    >
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;

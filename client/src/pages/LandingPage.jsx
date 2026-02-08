import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-600 p-2 rounded-xl text-white">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">MachineSafety</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                        <a href="#features" className="hover:text-blue-600 transition">Features</a>
                        <a href="#how-it-works" className="hover:text-blue-600 transition">How it Works</a>
                        {user ? (
                            <div className="flex items-center gap-4">
                                <Link to="/dashboard" className="font-semibold text-blue-600 hover:text-blue-800">
                                    Dashboard
                                </Link>
                                <button onClick={logout} className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-full hover:bg-slate-300 transition">
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <Link to="/login" className="px-5 py-2.5 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition shadow-lg shadow-slate-900/20">
                                Officer Login
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-bold mb-8 border border-blue-100 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    Next-Gen Machine Inspection System
                </div>

                <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-6 max-w-4xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                    Ensure Safety with <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Precision & Speed</span>
                </h1>

                <p className="text-lg md:text-xl text-slate-500 max-w-2xl mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    A cloud-based solution for real-time machine inspection, checklist management, and safety compliance. Accessible anywhere, anytime.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
                    <Link to={user ? "/dashboard" : "/login"} className="group relative px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-600/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 overflow-hidden">
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                        <span>{user ? "Go to Dashboard" : "Officer Portal"}</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link to="/scanner" className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold text-lg hover:bg-slate-50 hover:border-slate-300 transition flex items-center justify-center gap-2">
                        <ScanLine className="w-5 h-5" />
                        <span>Scan Physical Tag</span>
                    </Link>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <Activity className="w-8 h-8 text-blue-600" />,
                                title: "Real-time Monitoring",
                                desc: "Track machine status and inspection compliance in real-time."
                            },
                            {
                                icon: <CheckCircle className="w-8 h-8 text-green-600" />,
                                title: "Digital Checklists",
                                desc: "Replace paper forms with smart, cloud-synced digital checklists."
                            },
                            {
                                icon: <BarChart3 className="w-8 h-8 text-purple-600" />,
                                title: "Instant Reports",
                                desc: "Generate detailed PDF reports with photos and analytics instantly."
                            }
                        ].map((feature, idx) => (
                            <div key={idx} className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group">
                                <div className="p-4 bg-white rounded-2xl w-fit shadow-sm border border-slate-100 mb-6 group-hover:scale-110 transition-transform duration-300">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                                <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-black text-slate-900 mb-4">How It Works</h2>
                        <p className="text-slate-500 max-w-2xl mx-auto">Three simple steps to maintain safety and compliance across your facility.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                        {/* Connector Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-slate-200 -z-0"></div>

                        {[
                            { step: "01", title: "Scan QR Code", desc: "Locate the QR tag on the machine and scan it with your device." },
                            { step: "02", title: "Perform Inspection", desc: "Complete the digital checklist and capture photos of any issues." },
                            { step: "03", title: "Submit Report", desc: "Data is instantly synced to the cloud and reports are generated." }
                        ].map((item, idx) => (
                            <div key={idx} className="relative z-10 flex flex-col items-center text-center">
                                <div className="w-24 h-24 rounded-full bg-white border-4 border-blue-50 text-blue-600 font-black text-2xl flex items-center justify-center shadow-lg mb-6">
                                    {item.step}
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                                <p className="text-slate-500 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto bg-slate-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -ml-16 -mb-16"></div>

                    <h2 className="text-3xl md:text-5xl font-black text-white mb-6 relative z-10">Ready to modernize your safety protocols?</h2>
                    <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto relative z-10">Join leading industrial solutions in maintaining high safety standards with our cloud-based inspection system.</p>

                    <Link to="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-500 transition shadow-xl shadow-blue-900/50 relative z-10">
                        Get Started Now
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </section>

            <footer className="py-12 border-t border-slate-200 bg-slate-50 text-center">
                <p className="text-slate-500 text-sm font-medium">© {new Date().getFullYear()} Siddhi Industrial Solutions. System V2.3</p>
            </footer>
        </div>
    );
};

export default LandingPage;

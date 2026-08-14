import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Camera, Check, X, RefreshCw, Aperture, ChevronDown, ChevronUp, AlertCircle, Info, Sparkles, CheckCircle } from 'lucide-react';

const ChecklistForm = () => {
    const { machineId } = useParams();
    const navigate = useNavigate();
    const [machine, setMachine] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [templateDetails, setTemplateDetails] = useState(null);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [openSections, setOpenSections] = useState({});
    
    // Form answers state: { [itemId]: { actual_value, remarks, is_ok } }
    const [answers, setAnswers] = useState({});
    
    const [formData, setFormData] = useState({
        image: null,
        remarks: '',
        shift: 'A',
        part_name: '',
        line_speed: ''
    });
    
    const [preview, setPreview] = useState(null);
    const [location, setLocation] = useState(null);

    // Camera state
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    // Geolocation
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation(`${position.coords.latitude},${position.coords.longitude}`);
                },
                (error) => {
                    console.warn("Geolocation failed", error);
                    setLocation("Location Disallowed");
                }
            );
        } else {
            setLocation("Geolocation Not Supported");
        }
    }, []);

    // Load Machine & Available Templates
    useEffect(() => {
        const initForm = async () => {
            try {
                // Fetch machine details
                const mRes = await api.get('/machines');
                const found = mRes.data.find(m => m.id == machineId);
                if (!found) {
                    alert('Machine not found');
                    navigate('/scanner');
                    return;
                }
                setMachine(found);

                // Fetch templates mapped to this machine
                const tRes = await api.get(`/checklists/templates?machine_id=${machineId}`);
                setTemplates(tRes.data);
                
                if (tRes.data.length === 1) {
                    setSelectedTemplateId(tRes.data[0].id);
                }
                setLoading(false);
            } catch (error) {
                console.error("Initialization error:", error);
                setError(`Initialization Error: ${error.message || error.toString()}`);
                setLoading(false);
            }
        };
        initForm();
    }, [machineId, navigate]);

    // Load Template Details when selected
    useEffect(() => {
        if (!selectedTemplateId) {
            setTemplateDetails(null);
            return;
        }

        const fetchTemplateDetails = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/checklists/templates/${selectedTemplateId}`);
                setTemplateDetails(res.data);
                
                // Initialize answers state and collapsible sections state
                const initialAnswers = {};
                const initialOpen = {};
                
                res.data.sections.forEach((sec, sIdx) => {
                    initialOpen[sec.id] = sIdx === 0; // Open the first section by default
                    sec.items.forEach(item => {
                        initialAnswers[item.id] = {
                            actual_value: '',
                            remarks: '',
                            is_ok: true
                        };
                    });
                });
                
                setAnswers(initialAnswers);
                setOpenSections(initialOpen);
                setFormData(prev => ({
                    ...prev,
                    part_name: res.data.part_name || '',
                    line_speed: res.data.line_speed || ''
                }));
                setLoading(false);
            } catch (error) {
                console.error("Error loading template details:", error);
                setError(`Template Load Error: ${error.message || error.toString()}`);
                setTemplateLoading(false);
            }
        };
        fetchTemplateDetails();
    }, [selectedTemplateId]);

    // Cleanup camera
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    const startCamera = async () => {
        setIsCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            streamRef.current = stream;
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 100);
        } catch (err) {
            console.error("Camera access error:", err);
            alert("Could not access camera.");
            setIsCameraOpen(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => {
                if (blob) {
                    const file = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
                    setFormData(prev => ({ ...prev, image: file }));
                    setPreview(URL.createObjectURL(file));
                    stopCamera();
                }
            }, 'image/jpeg', 0.8);
        }
    };

    const retakePhoto = () => {
        setPreview(null);
        setFormData(prev => ({ ...prev, image: null }));
        startCamera();
    };

    // Toggle Section Accordion
    const toggleSection = (sectionId) => {
        setOpenSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    // Handle single field input changes and validate value
    const handleValueChange = (itemId, val, itemSpec) => {
        let is_ok = true;
        
        if (itemSpec) {
            // Check numeric thresholds if specified
            if (itemSpec.expected_min !== null && val !== '') {
                if (parseFloat(val) < itemSpec.expected_min) is_ok = false;
            }
            if (itemSpec.expected_max !== null && val !== '') {
                if (parseFloat(val) > itemSpec.expected_max) is_ok = false;
            }
            if (itemSpec.input_type === 'boolean') {
                if (val === 'NG') is_ok = false;
            }
        }

        setAnswers(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                actual_value: val,
                is_ok
            }
        }));
    };

    const handleRemarkChange = (itemId, remark) => {
        setAnswers(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                remarks: remark
            }
        }));
    };

    // Autofill all parameters to their target nominal specifications
    const handleAutofillNominals = () => {
        if (!templateDetails) return;
        
        const autoAnswers = { ...answers };
        templateDetails.sections.forEach(sec => {
            sec.items.forEach(item => {
                let val = '';
                if (item.input_type === 'numeric') {
                    if (item.expected_min !== null && item.expected_max !== null) {
                        // Midpoint of target range
                        val = ((item.expected_min + item.expected_max) / 2).toFixed(1);
                    } else if (item.expected_min !== null) {
                        val = item.expected_min.toString();
                    } else if (item.expected_max !== null) {
                        val = item.expected_max.toString();
                    }
                } else if (item.input_type === 'boolean') {
                    val = 'OK';
                }
                
                autoAnswers[item.id] = {
                    actual_value: val,
                    remarks: '',
                    is_ok: true
                };
            });
        });
        setAnswers(autoAnswers);
    };

    // Submit form handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedTemplateId) {
            alert("Please select a checklist template.");
            return;
        }

        // Check if mandatory fields are filled
        let missing = false;
        templateDetails.sections.forEach(sec => {
            sec.items.forEach(item => {
                if (item.is_mandatory && (!answers[item.id] || answers[item.id].actual_value === '')) {
                    missing = true;
                }
            });
        });

        if (missing) {
            alert("Please fill in all mandatory check points.");
            return;
        }

        setSubmitting(true);
        const data = new FormData();
        data.append('machine_id', machineId);
        data.append('template_id', selectedTemplateId);
        data.append('shift', formData.shift);
        data.append('part_name', formData.part_name);
        data.append('line_speed', formData.line_speed);
        
        // Compile values array
        const valuesArray = Object.keys(answers).map(itemId => ({
            item_id: parseInt(itemId),
            actual_value: answers[itemId].actual_value,
            remarks: answers[itemId].remarks
        }));
        data.append('values', JSON.stringify(valuesArray));
        
        // Metadata
        const deviceInfo = `${navigator.platform} - ${navigator.userAgent}`;
        data.append('device_info', deviceInfo);
        data.append('location', location || 'N/A');
        
        if (formData.image) {
            data.append('image', formData.image);
        }

        try {
            await api.post('/checklists', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert("Dynamic Checklist Submitted Successfully!");
            navigate('/');
        } catch (error) {
            console.error(error);
            alert("Error submitting checklist.");
        } finally {
            setSubmitting(false);
        }
    };

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
                <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm border border-red-100 space-y-4">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                    <h2 className="text-xl font-bold text-gray-800">Checklist Load Failed</h2>
                    <p className="text-sm text-gray-500">{error}</p>
                    <button onClick={() => navigate(`/machine/${machineId}`)} className="mt-4 px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold">
                        Back to Machine Hub
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-blue-600 font-bold text-lg animate-pulse flex items-center gap-2">
                    <RefreshCw className="animate-spin w-5 h-5" /> Loading inspection template...
                </div>
            </div>
        );
    }

    if (!machine) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-6 rounded-2xl shadow-xl text-center max-w-sm">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <h2 className="text-xl font-bold text-gray-800">Machine Not Found</h2>
                    <button onClick={() => navigate('/scanner')} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl">Go Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100/50 pb-16 font-sans">
            <div className="max-w-xl mx-auto bg-white min-h-screen shadow-md border-x border-gray-200/50">
                
                {/* Header Profile Section */}
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl -mr-6 -mt-6"></div>
                    <h1 className="text-3xl font-black tracking-tight">{machine.machine_no}</h1>
                    <p className="opacity-80 text-sm mt-1">{machine.model} • Line: {machine.line_no}</p>
                    
                    {/* Select Checklist Template */}
                    <div className="mt-6 bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                        <label className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">Check Sheet Template</label>
                        {templates.length > 1 ? (
                            <select
                                className="w-full bg-white text-gray-800 rounded-xl px-3 py-2.5 font-semibold text-sm outline-none focus:ring-2 focus:ring-blue-400"
                                value={selectedTemplateId}
                                onChange={(e) => setSelectedTemplateId(e.target.value)}
                            >
                                <option value="">-- Choose Process Template --</option>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.template_name}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="font-bold text-white text-sm bg-white/5 px-3 py-2 rounded-lg border border-white/5 flex items-center justify-between">
                                <span>{templates[0]?.template_name || 'Loading template...'}</span>
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                            </div>
                        )}
                    </div>
                </div>

                {!selectedTemplateId ? (
                    <div className="p-12 text-center text-gray-400">
                        <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">Please select a check sheet template above to load checklist fields.</p>
                    </div>
                ) : templateDetails && (
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        
                        {/* Process Metadata Section */}
                        <div className="bg-gray-50 border border-gray-200/50 rounded-2xl p-4 grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Shift</label>
                                <select 
                                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.shift}
                                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                                >
                                    <option value="A">Shift A</option>
                                    <option value="B">Shift B</option>
                                    <option value="C">Shift C</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Line Speed</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. 18 mpm"
                                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.line_speed}
                                    onChange={(e) => setFormData({ ...formData, line_speed: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Part Name / Model Run</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. YL1 Opening Trim"
                                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.part_name}
                                    onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Autofill / Assist bar */}
                        <div className="flex justify-between items-center bg-blue-50/50 rounded-xl p-3 border border-blue-100">
                            <span className="text-xs text-blue-700 font-semibold flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-blue-500" /> Operator Assist Tools
                            </span>
                            <button
                                type="button"
                                onClick={handleAutofillNominals}
                                className="text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
                            >
                                Auto-fill Target Specs
                            </button>
                        </div>

                        {/* Accordion Process Sections */}
                        <div className="space-y-4">
                            {templateDetails.sections.map((section) => (
                                <div key={section.id} className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                                    <button
                                        type="button"
                                        onClick={() => toggleSection(section.id)}
                                        className="w-full flex justify-between items-center p-4 bg-gray-50/70 border-b border-gray-100 font-bold text-gray-800 text-left hover:bg-gray-100/50 transition-colors"
                                    >
                                        <span>{section.section_name}</span>
                                        {openSections[section.id] ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                    </button>

                                    {openSections[section.id] && (
                                        <div className="divide-y divide-gray-100 px-4">
                                            {section.items.map((item) => (
                                                <div key={item.id} className="py-4 space-y-2">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <span className="font-bold text-sm text-gray-800">
                                                                {item.check_point}
                                                                {item.is_mandatory ? <span className="text-red-500 ml-1">*</span> : null}
                                                            </span>
                                                            {item.specification && (
                                                                <span className="block text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 w-max">
                                                                    Spec: {item.specification}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">{item.checking_method}</span>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        {item.input_type === 'numeric' ? (
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                className={`w-32 border px-3 py-2 rounded-xl text-sm font-bold outline-none focus:ring-2 ${
                                                                    answers[item.id]?.actual_value === '' 
                                                                        ? 'border-gray-200' 
                                                                        : answers[item.id]?.is_ok 
                                                                            ? 'border-green-300 bg-green-50 text-green-700' 
                                                                            : 'border-red-300 bg-red-50 text-red-600 focus:ring-red-400'
                                                                }`}
                                                                value={answers[item.id]?.actual_value || ''}
                                                                onChange={(e) => handleValueChange(item.id, e.target.value, item)}
                                                                placeholder="Enter value"
                                                            />
                                                        ) : item.input_type === 'boolean' ? (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleValueChange(item.id, 'OK', item)}
                                                                    className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                                                                        answers[item.id]?.actual_value === 'OK'
                                                                            ? 'bg-green-600 text-white shadow-md'
                                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                                    }`}
                                                                >
                                                                    OK
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleValueChange(item.id, 'NG', item)}
                                                                    className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                                                                        answers[item.id]?.actual_value === 'NG'
                                                                            ? 'bg-red-600 text-white shadow-md'
                                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                                    }`}
                                                                >
                                                                    NG
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                className="flex-1 border border-gray-200 px-3 py-2 rounded-xl text-sm font-semibold"
                                                                value={answers[item.id]?.actual_value || ''}
                                                                onChange={(e) => handleValueChange(item.id, e.target.value, item)}
                                                                placeholder="Enter status/info"
                                                            />
                                                        )}

                                                        {/* Optional Remark input (Mandatory if NG) */}
                                                        {(!answers[item.id]?.is_ok || answers[item.id]?.actual_value === 'NG') && (
                                                            <input
                                                                type="text"
                                                                className="flex-1 border border-red-300 bg-red-50/50 px-3 py-2 rounded-xl text-xs text-red-700 placeholder-red-400 outline-none focus:ring-1 focus:ring-red-400"
                                                                value={answers[item.id]?.remarks || ''}
                                                                onChange={(e) => handleRemarkChange(item.id, e.target.value)}
                                                                placeholder="Reason for deviation (NG)..."
                                                                required
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* General Remarks */}
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-gray-700">General Notes / Remarks</label>
                            <textarea
                                className="w-full border border-gray-200 p-3 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                rows="3"
                                placeholder="Write any shift setup notes here..."
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            ></textarea>
                        </div>

                        {/* Image Verification Proof */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-700">Audit Image Verification</label>
                            <canvas ref={canvasRef} className="hidden"></canvas>

                            {!isCameraOpen && !preview && (
                                <div
                                    onClick={startCamera}
                                    className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:bg-blue-50/30 hover:border-blue-300 transition cursor-pointer"
                                >
                                    <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <span className="block font-bold text-sm text-gray-600">Capture Proof Photo</span>
                                    <span className="text-[10px] text-gray-400">(Required for machine setup validation)</span>
                                </div>
                            )}

                            {isCameraOpen && (
                                <div className="relative bg-black rounded-2xl overflow-hidden">
                                    <video ref={videoRef} autoPlay playsInline className="w-full h-48 object-cover" />
                                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-4">
                                        <button type="button" onClick={stopCamera} className="p-2 bg-white/20 text-white rounded-full"><X className="w-5 h-5" /></button>
                                        <button type="button" onClick={capturePhoto} className="p-3 bg-white text-blue-600 rounded-full shadow-lg"><Aperture className="w-6 h-6" /></button>
                                    </div>
                                </div>
                            )}

                            {preview && (
                                <div className="relative">
                                    <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-2xl shadow-sm" />
                                    <button
                                        type="button"
                                        onClick={retakePhoto}
                                        className="absolute bottom-2 right-2 bg-black/60 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-black/80 transition"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" /> Retake
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Submit Action */}
                        <div className="pt-4 space-y-3">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <RefreshCw className="animate-spin w-5 h-5" /> Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-5 h-5" /> Submit Audit Check
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate('/scanner')}
                                className="w-full py-2 text-center text-sm font-bold text-gray-400 hover:text-gray-600 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

// Simple Error Boundary for debugging
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ChecklistForm Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-red-600">
                    <h1 className="text-xl font-bold">Something went wrong.</h1>
                    <pre className="mt-4 bg-gray-100 p-4 rounded overflow-auto">
                        {this.state.error && this.state.error.toString()}
                    </pre>
                    <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
                        Reload Page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const ChecklistFormWithBoundary = () => (
    <ErrorBoundary>
        <ChecklistForm />
    </ErrorBoundary>
);

export default ChecklistFormWithBoundary;

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Camera, Check, X, RefreshCw, Aperture } from 'lucide-react';

const ChecklistForm = () => {
    const { machineId } = useParams();
    const navigate = useNavigate();
    const [machine, setMachine] = useState(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        ok_quantity: 0,
        ng_quantity: 0,
        total_quantity: 0,
        image: null,
        remarks: ''
    });
    const [preview, setPreview] = useState(null);
    const [location, setLocation] = useState(null);

    // Get Location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation(`${position.coords.latitude},${position.coords.longitude}`);
                },
                (error) => {
                    console.warn("Geolocation denied or failed", error);
                    setLocation("Location Disallowed");
                }
            );
        } else {
            setLocation("Geolocation Not Supported");
        }
    }, []);

    // Camera State
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    // api handles auth headers

    useEffect(() => {
        const fetchMachine = async () => {
            try {
                const res = await api.get('/machines');
                const found = res.data.find(m => m.id == machineId);
                if (found) {
                    setMachine(found);
                } else {
                    alert('Machine not found');
                    navigate('/scanner');
                }
                setLoading(false);
            } catch (error) {
                console.error(error);
                setLoading(false);
            }
        };
        fetchMachine();
    }, [machineId, navigate]);

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            total_quantity: parseInt(prev.ok_quantity || 0) + parseInt(prev.ng_quantity || 0)
        }));
    }, [formData.ok_quantity, formData.ng_quantity]);

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    const startCamera = async () => {
        setIsCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' } // Prefer back camera on mobile
            });
            streamRef.current = stream;
            // Short timeout to ensure ref is attached to DOM
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 100);
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access camera. Please allow permissions.");
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

            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Draw
            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert to Blob/File
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        const okQty = parseInt(formData.ok_quantity);
        const ngQty = parseInt(formData.ng_quantity);

        if (okQty < 0 || ngQty < 0) {
            alert("Quantities cannot be negative");
            return;
        }

        const totalQty = okQty + ngQty;

        // Prepare form data
        const data = new FormData();
        data.append('machine_id', machineId);
        data.append('ok_quantity', okQty);
        data.append('ng_quantity', ngQty);
        data.append('total_quantity', totalQty);
        data.append('remarks', formData.remarks || '');

        // Device Info
        const deviceInfo = `${navigator.platform} - ${navigator.userAgent}`;
        data.append('device_info', deviceInfo);

        // Location
        if (location) {
            data.append('location', location);
        } else {
            data.append('location', 'N/A');
        }

        if (formData.image) {
            data.append('image', formData.image);
        }

        try {
            await api.post('/checklists', data, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            alert("Checklist Submitted Successfully!");
            navigate('/');
        } catch (error) {
            console.error(error);
            alert("Error submitting checklist");
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!machine) return <div>Machine not found</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-lg mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-blue-600 p-6 text-white text-center">
                    <h1 className="text-2xl font-bold">{machine.machine_no}</h1>
                    <p className="opacity-90">{machine.model} | Line: {machine.line_no}</p>
                    <div className="mt-2 text-sm bg-blue-700 inline-block px-3 py-1 rounded-full">
                        Production Plan: {machine.prod_plan}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">OK Qty</label>
                            <input
                                type="number"
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none"
                                value={formData.ok_quantity}
                                onChange={(e) => setFormData({ ...formData, ok_quantity: e.target.value })}
                                min="0" required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">NG Qty</label>
                            <input
                                type="number"
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-red-500 outline-none"
                                value={formData.ng_quantity}
                                onChange={(e) => setFormData({ ...formData, ng_quantity: e.target.value })}
                                min="0" required
                            />
                        </div>
                    </div>

                    <div className="bg-gray-100 p-4 rounded-lg flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Total Quantity</span>
                        <span className="text-xl font-bold text-gray-900">{formData.total_quantity}</span>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Remarks</label>
                        <textarea
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            rows="3"
                            placeholder="Optional notes..."
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        ></textarea>
                    </div>

                    {/* Camera / Photo Section */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Photo Proof</label>

                        {/* Hidden Canvas for Capture */}
                        <canvas ref={canvasRef} className="hidden"></canvas>

                        {!isCameraOpen && !preview && (
                            <div
                                onClick={startCamera}
                                className="relative border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-blue-50 hover:border-blue-400 transition cursor-pointer group"
                            >
                                <div className="text-gray-500 group-hover:text-blue-600 transition">
                                    <Camera className="w-12 h-12 mx-auto mb-3" />
                                    <span className="block font-bold text-lg">Take Photo</span>
                                    <span className="text-xs opacity-75">(Tap to open camera)</span>
                                </div>
                            </div>
                        )}

                        {isCameraOpen && (
                            <div className="relative bg-black rounded-xl overflow-hidden shadow-lg">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-64 object-cover"
                                />
                                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-6">
                                    <button
                                        type="button"
                                        onClick={stopCamera}
                                        className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={capturePhoto}
                                        className="p-4 bg-white rounded-full text-blue-600 shadow-xl hover:scale-105 transition transform"
                                    >
                                        <Aperture className="w-8 h-8" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {preview && (
                            <div className="relative">
                                <img src={preview} alt="Preview" className="w-full h-64 object-cover rounded-xl shadow-md" />
                                <button
                                    type="button"
                                    onClick={retakePhoto}
                                    className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-black/80 transition"
                                >
                                    <RefreshCw className="w-4 h-4" /> Retake
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 shadow-lg transition flex items-center justify-center gap-2"
                    >
                        <Check className="w-6 h-6" /> Submit Checklist
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/scanner')}
                        className="w-full text-gray-500 py-2"
                    >
                        Cancel
                    </button>
                </form>
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

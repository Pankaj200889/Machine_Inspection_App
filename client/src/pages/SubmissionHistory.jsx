import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api, { STATIC_BASE_URL } from '../api';
import { ArrowLeft, Camera, Upload, CheckCircle, AlertCircle, X, Aperture, RefreshCw } from 'lucide-react';

const SubmissionHistory = () => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [preview, setPreview] = useState(null);
    const [capturedFile, setCapturedFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Camera Refs
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        fetchHistory();
        return () => stopCamera();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await api.get('/checklists/my-submissions');
            setSubmissions(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const startCamera = async () => {
        setIsCameraOpen(true);
        setPreview(null);
        setCapturedFile(null);
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
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => {
                if (blob) {
                    const file = new File([blob], `retake_${Date.now()}.jpg`, { type: "image/jpeg" });
                    setCapturedFile(file);
                    setPreview(URL.createObjectURL(file));
                    stopCamera();
                }
            }, 'image/jpeg', 0.8);
        }
    };

    const handleUpload = async (checklistId) => {
        if (!capturedFile) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('image', capturedFile);

        try {
            await api.put(`/checklists/${checklistId}/image`, formData);
            alert("Photo updated successfully!");
            setEditingId(null);
            setCapturedFile(null);
            setPreview(null);
            fetchHistory();
        } catch (err) {
            console.error("Upload failed", err);
            alert("Failed to upload photo.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 font-sans">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Link to="/" className="p-2 bg-white rounded-full shadow-sm text-gray-600 hover:text-blue-600">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-800">My Submissions</h1>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-400">Loading history...</div>
                ) : (
                    <div className="space-y-4">
                        {submissions.length === 0 ? (
                            <div className="bg-white p-8 rounded-xl text-center shadow-sm">
                                <p className="text-gray-500">No submissions found.</p>
                                <Link to="/scanner" className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">Scan QR</Link>
                            </div>
                        ) : (
                            submissions.map(item => (
                                <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
                                    <div className="shrink-0 relative group w-full sm:w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                                        {item.image_path ? (
                                            <img
                                                src={`${STATIC_BASE_URL}/${item.image_path}`}
                                                alt="Proof"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Camera className="w-8 h-8 text-gray-300" />
                                        )}
                                        <button
                                            onClick={() => { setEditingId(item.id); startCamera(); }}
                                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white"
                                        >
                                            <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded backdrop-blur-sm">Retake Photo</span>
                                        </button>
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900">{item.machine_no}</h3>
                                                <p className="text-sm text-gray-500">Shift {item.shift} • {new Date(item.submitted_at).toLocaleString()}</p>
                                            </div>
                                            <div className={`px-2 py-1 rounded text-xs font-bold ${item.bekido_percent >= 85 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {item.bekido_percent}% Eff
                                            </div>
                                        </div>

                                        <div className="mt-3 flex gap-4 text-sm">
                                            <div className="flex items-center gap-1">
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                                <span className="font-medium text-gray-700">OK: {item.ok_quantity}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <AlertCircle className="w-4 h-4 text-red-500" />
                                                <span className="font-medium text-gray-700">NG: {item.ng_quantity}</span>
                                            </div>
                                        </div>

                                        {/* Camera Logic Inline */}
                                        {editingId === item.id && (
                                            <div className="mt-4 p-4 bg-gray-900 rounded-lg border border-gray-800 animate-in slide-in-from-top-2 relative">
                                                <h4 className="text-white text-sm font-bold mb-3 flex justify-between">
                                                    <span>Update Verification Photo</span>
                                                    <button onClick={() => { setEditingId(null); stopCamera(); }}><X className="w-4 h-4 text-gray-400 hover:text-white" /></button>
                                                </h4>

                                                <canvas ref={canvasRef} className="hidden"></canvas>

                                                {isCameraOpen ? (
                                                    <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                                                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                                                        <div className="absolute bottom-4 inset-x-0 flex justify-center">
                                                            <button onClick={capturePhoto} className="p-4 bg-white rounded-full shadow-lg hover:scale-110 transition"><Aperture className="w-6 h-6 text-blue-600" /></button>
                                                        </div>
                                                    </div>
                                                ) : preview ? (
                                                    <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                                                        <img src={preview} alt="Retake" className="w-full h-full object-cover" />
                                                        <div className="absolute bottom-4 inset-x-0 flex justify-center gap-4">
                                                            <button onClick={() => setPreview(null) || startCamera()} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-bold flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Try Again</button>
                                                            <button onClick={() => handleUpload(item.id)} disabled={uploading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2">{uploading ? 'Uploading...' : 'Confirm Usage'}</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8 text-gray-500">Camera initialization failed.</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubmissionHistory;

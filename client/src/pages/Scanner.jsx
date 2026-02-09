import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { Camera, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Scanner = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isScanning, setIsScanning] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const scannerRef = useRef(null);

    // Initialize scanner instance once on mount
    useEffect(() => {
        // Ensure element exists before init
        const initScanner = () => {
            if (document.getElementById("reader") && !scannerRef.current) {
                try {
                    scannerRef.current = new Html5Qrcode("reader");
                } catch (e) {
                    console.error("Failed to init scanner instance", e);
                }
            }
        };

        // Small timeout to ensure DOM is ready
        const timer = setTimeout(initScanner, 100);

        return () => {
            clearTimeout(timer);
            if (scannerRef.current) {
                // If scanning, stop it before cleaning up
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch(err => console.error("Failed to stop scanner", err));
                }
                scannerRef.current.clear(); // Clear the element
            }
        };
    }, []);

    const startScanning = async () => {
        if (!scannerRef.current) return;

        setErrorMsg(null);
        setIsLoading(true);

        try {
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };

            // Try environment first, fallback to user (for desktops/laptops)
            try {
                await scannerRef.current.start(
                    { facingMode: "environment" },
                    config,
                    onScanSuccess,
                    onScanFailure
                );
            } catch (envError) {
                console.warn("Environment camera failed, trying user camera...", envError);
                await scannerRef.current.start(
                    { facingMode: "user" },
                    config,
                    onScanSuccess,
                    onScanFailure
                );
            }

            setIsScanning(true);
        } catch (err) {
            console.error("Error starting scanner:", err);
            setIsScanning(false);
            if (err.name === "NotAllowedError" || err.toString().includes("Permission")) {
                setErrorMsg("Camera permission denied. Please enable camera access in your browser settings.");
            } else if (err.name === "NotFoundError") {
                setErrorMsg("No camera found on this device.");
            } else {
                setErrorMsg("Failed to start camera: " + (err.message || "Unknown error"));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const stopScanning = async () => {
        if (scannerRef.current && isScanning) {
            try {
                await scannerRef.current.stop();
                setIsScanning(false);
            } catch (err) {
                console.error("Failed to stop", err);
            }
        }
    };

    const onScanSuccess = async (decodedText, decodedResult) => {
        try {
            await stopScanning(); // Attempt cleanup
        } catch (err) {
            console.warn("Cleanup error ignored:", err);
        }

        try {
            // 1. Try JSON Parse (Legacy support)
            try {
                const data = JSON.parse(decodedText);
                if (data.id) {
                    if (user) {
                        window.location.href = `/checklist/${data.id}`;
                    } else {
                        window.location.href = `/machine/${data.id}`;
                    }
                    return;
                } else if (data.no) {
                    alert("Scanned: " + data.no);
                    window.location.href = '/';
                    return;
                }
            } catch (e) {
                // Not JSON, continue to URL check
            }

            // 2. Try URL Parse (New Standard)
            // Expected format: https://.../machine/:id
            if (decodedText.includes('/machine/')) {
                const parts = decodedText.split('/machine/');
                const id = parts[1];
                if (id) {
                    if (user) {
                        window.location.href = `/checklist/${id}`;
                    } else {
                        window.location.href = `/machine/${id}`;
                    }
                    return;
                }
            }

            // 3. Fallback / Unknown
            console.log("Unknown QR Format:", decodedText);
            alert("This QR code is not recognized as a valid Machine ID.");

        } catch (e) {
            console.log("Scan Error:", e);
            alert("Invalid QR format");
        }
    };

    const onScanFailure = (error) => {
        // Standard scan failure
    };

    return (
        <div className="p-4 flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Scan Machine QR</h1>

            <div className="w-full max-w-sm bg-white p-4 rounded-xl shadow-lg">
                {/* Error Display */}
                {errorMsg && (
                    <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-start gap-3 rounded">
                        <AlertTriangle className="w-6 h-6 shrink-0" />
                        <div>
                            <p className="font-bold">Camera Error</p>
                            <p className="text-sm">{errorMsg}</p>
                        </div>
                    </div>
                )}

                {/* Camera Viewport */}
                <div className="relative rounded-lg overflow-hidden bg-gray-900 shadow-inner">
                    {/* Provide a fixed aspect ratio container or min-height */}
                    <div id="reader" className="w-full" style={{ minHeight: '300px' }}></div>

                    {!isScanning && !isLoading && !errorMsg && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-100">
                            <Camera className="w-16 h-16 mb-2" />
                            <p>Camera is off</p>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="mt-6 flex justify-center">
                    {!isScanning ? (
                        <button
                            onClick={startScanning}
                            disabled={isLoading}
                            className={`w-full py-3 rounded-lg font-bold text-lg shadow-lg transition flex items-center justify-center gap-2 ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                        >
                            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                            {isLoading ? 'Starting...' : 'Start Scanning'}
                        </button>
                    ) : (
                        <button
                            onClick={stopScanning}
                            className="w-full bg-red-500 text-white py-3 rounded-lg font-bold text-lg hover:bg-red-600 shadow-md transition"
                        >
                            Stop Scanning
                        </button>
                    )}
                </div>
            </div>

            <button
                onClick={() => navigate('/')}
                className="mt-8 text-blue-600 hover:text-blue-800 font-medium transition"
            >
                Back to Dashboard
            </button>
        </div>
    );
};

export default Scanner;

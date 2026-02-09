import React, { useState, useEffect } from 'react';
import api, { STATIC_BASE_URL } from '../api';
import { Link } from 'react-router-dom';
import { Download, Search, Filter, Calendar, FileText, CheckCircle, AlertCircle, X, ChevronDown, Activity, ArrowLeft, Image as ImageIcon, Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../context/AuthContext';

const Reports = () => {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [shiftFilter, setShiftFilter] = useState('All');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    useEffect(() => {
        fetchSubmissions();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [submissions, search, shiftFilter, dateRange]);

    const fetchSubmissions = async () => {
        try {
            const res = await api.get('/checklists');
            setSubmissions(res.data);
            setFilteredData(res.data);
        } catch (err) {
            console.error("Failed to fetch submissions", err);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let temp = [...submissions];

        if (search) {
            const lowerSearch = search.toLowerCase();
            temp = temp.filter(item =>
                item.machine_no?.toLowerCase().includes(lowerSearch) ||
                item.model?.toLowerCase().includes(lowerSearch) ||
                item.username?.toLowerCase().includes(lowerSearch)
            );
        }

        if (shiftFilter !== 'All') {
            temp = temp.filter(item => item.shift === shiftFilter);
        }

        if (dateRange.start) {
            temp = temp.filter(item => new Date(item.submitted_at) >= new Date(dateRange.start));
        }
        if (dateRange.end) {
            const endDate = new Date(dateRange.end);
            endDate.setHours(23, 59, 59);
            temp = temp.filter(item => new Date(item.submitted_at) <= endDate);
        }

        setFilteredData(temp);
    };

    const resetFilters = () => {
        setSearch('');
        setShiftFilter('All');
        setDateRange({ start: '', end: '' });
    };

    const deleteSubmission = async (id) => {
        if (!window.confirm("Are you sure you want to delete this inspection record? This action cannot be undone.")) {
            return;
        }

        try {
            await api.delete(`/checklists/${id}`);

            // Update local state
            const newSubmissions = submissions.filter(s => s.id !== id);
            setSubmissions(newSubmissions);

            // Re-apply filters will happen automatically via useEffect, or we can explicit setFilteredData for speed
            // But since useEffect depends on `submissions`, it will run.
            // However, we might want to close the modal first.
            setSelectedSubmission(null);
            alert("Record deleted successfully.");
        } catch (err) {
            console.error("Delete failed", err);
            alert("Failed to delete record: " + (err.response?.data?.error || err.message));
        }
    };

    const exportToCSV = () => {
        if (!filteredData.length) return alert("No data to export");

        const headers = ["Machine No", "Model", "Shift", "Inspector", "Date", "Time", "OK Qty", "NG Qty", "Total Qty", "Efficiency %", "Remarks", "Image URL"];

        // Convert data to CSV format
        const csvContent = [
            headers.join(","),
            ...filteredData.map(item => [
                item.machine_no,
                item.model || '-',
                item.shift,
                item.username || 'Unknown',
                new Date(item.submitted_at).toLocaleDateString(),
                new Date(item.submitted_at).toLocaleTimeString(),
                item.ok_quantity,
                item.ng_quantity,
                item.total_quantity,
                item.bekido_percent || 0,
                `"${(item.remarks || '').replace(/"/g, '""')}"`, // Escape quotes
                item.image_path ? `${STATIC_BASE_URL}/${item.image_path}` : ''
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Inspection_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const fetchImageAsBase64 = async (url) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error converting image to base64:', error);
            return null;
        }
    };

    const generateSinglePDF = async (submission) => {
        try {
            const doc = new jsPDF();

            // Header
            doc.setFontSize(22);
            doc.setTextColor(40, 40, 40);
            doc.text("Machine Inspection Report", 14, 20);

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
            doc.line(14, 32, 196, 32);

            // Details Table
            autoTable(doc, {
                startY: 40,
                head: [['Field', 'Value']],
                body: [
                    ['Machine No', submission.machine_no],
                    ['Model', submission.model || 'N/A'],
                    ['Shift', submission.shift],
                    ['Inspector', submission.username || 'Unknown'],
                    ['Date', new Date(submission.submitted_at).toLocaleString()],
                    ['OK Quantity', submission.ok_quantity],
                    ['NG Quantity', submission.ng_quantity],
                    ['Total Quantity', submission.total_quantity],
                    ['Efficiency (Bekido)', `${submission.bekido_percent}%`],
                    ['Remarks', submission.remarks || '-']
                ],
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246] },
                styles: { fontSize: 10, cellPadding: 3 }
            });

            // Photo Section
            let yPos = (doc.lastAutoTable?.finalY || 40) + 10;

            if (submission.image_path) {
                doc.setFontSize(14);
                doc.setTextColor(40, 40, 40);
                doc.text("Visual Evidence", 14, yPos);
                yPos += 5;

                try {
                    const imgUrl = `${STATIC_BASE_URL}/${submission.image_path}`;
                    const imgData = await fetchImageAsBase64(imgUrl);

                    if (imgData) {
                        const imgProps = doc.getImageProperties(imgData);
                        const pdfWidth = 180;
                        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                        // Check if image fits on page, else add new page
                        if (yPos + pdfHeight > 280) {
                            doc.addPage();
                            yPos = 20;
                        }

                        doc.addImage(imgData, 'JPEG', 14, yPos, pdfWidth, pdfHeight);
                    }
                } catch (err) {
                    console.error("Error adding image to PDF", err);
                    doc.setFontSize(10);
                    doc.setTextColor(255, 0, 0);
                    doc.text("Error loading image for report.", 14, yPos + 10);
                }
            }

            doc.save(`Report_${submission.machine_no}_${submission.id}.pdf`);
        } catch (error) {
            console.error("Single PDF Generation Error:", error);
            alert("Failed to generate report. See console for details.");
        }
    };

    const generateBulkPDF = async () => {
        if (!filteredData.length) return alert("No data to export");
        setIsGeneratingPdf(true);

        try {
            const doc = new jsPDF();

            // Header
            doc.setFontSize(18);
            doc.text("Full Inspection Report", 14, 15);
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
            doc.text(`Total Records: ${filteredData.length}`, 14, 27);

            // Limit to 50 for performance if we are downloading images.
            if (filteredData.length > 50 && !window.confirm(`You are about to export ${filteredData.length} records with images. This might take a while. Continue?`)) {
                setIsGeneratingPdf(false);
                return;
            }

            // Pre-fetch images
            const dataWithImages = await Promise.all(filteredData.map(async (item) => {
                let imgData = null;
                if (item.image_path) {
                    imgData = await fetchImageAsBase64(`${STATIC_BASE_URL}/${item.image_path}`);
                }
                return { ...item, imgData };
            }));

            autoTable(doc, {
                startY: 35,
                head: [['Machine', 'Shift', 'Date', 'OK', 'NG', 'Total', 'Eff%', 'Remarks', 'Photo']],
                body: dataWithImages.map(item => [
                    item.machine_no,
                    item.shift,
                    new Date(item.submitted_at).toLocaleDateString(),
                    item.ok_quantity,
                    item.ng_quantity,
                    item.total_quantity,
                    item.bekido_percent + '%',
                    item.remarks || '-',
                    '' // Empty cell for image
                ]),
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 1, valign: 'middle', minCellHeight: 15 },
                headStyles: { fillColor: [41, 128, 185] },
                columnStyles: {
                    8: { cellWidth: 20 }
                },
                didDrawCell: function (data) {
                    if (data.column.index === 8 && data.cell.section === 'body') {
                        const item = dataWithImages[data.row.index];
                        if (item.imgData) {
                            try {
                                doc.addImage(item.imgData, 'JPEG', data.cell.x + 1, data.cell.y + 1, 18, 13);
                            } catch (e) {
                                // ignore image error
                            }
                        }
                    }
                }
            });

            doc.save(`Full_Inspection_Report_${new Date().toISOString().slice(0, 10)}.pdf`);

        } catch (err) {
            console.error("PDF Gen Error", err);
            alert("Failed to generate PDF. See console for details.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <Link to="/dashboard" className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition shadow-sm">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Inspection Reports</h1>
                            <p className="text-slate-500 font-medium">View, filter, and export detailed inspection records.</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={resetFilters}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition flex items-center gap-2"
                        >
                            <Filter className="w-4 h-4" /> Reset Filters
                        </button>
                        <button
                            onClick={exportToCSV}
                            className="px-4 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition flex items-center gap-2 shadow-lg shadow-green-500/20"
                        >
                            <FileText className="w-4 h-4" /> Export CSV
                        </button>
                        <button
                            onClick={generateBulkPDF}
                            disabled={isGeneratingPdf}
                            className={`px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition flex items-center gap-2 shadow-lg shadow-red-500/20 ${isGeneratingPdf ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            {isGeneratingPdf ? (
                                <>Generating...</>
                            ) : (
                                <><Download className="w-4 h-4" /> Export PDF</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search Machine, Model, or Inspector..."
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="relative min-w-[140px]">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select
                                className="w-full pl-10 pr-8 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 appearance-none cursor-pointer"
                                value={shiftFilter}
                                onChange={(e) => setShiftFilter(e.target.value)}
                            >
                                <option value="All">All Shifts</option>
                                <option value="A">Shift A</option>
                                <option value="B">Shift B</option>
                                <option value="C">Shift C</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                            <input
                                type="date"
                                className="bg-transparent text-sm font-bold text-slate-600 focus:outline-none"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            />
                            <span className="text-slate-400">-</span>
                            <input
                                type="date"
                                className="bg-transparent text-sm font-bold text-slate-600 focus:outline-none"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Data Grid */}
                {loading ? (
                    <div className="text-center py-20 text-slate-400">Loading reports...</div>
                ) : filteredData.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
                        <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-bold text-slate-700">No records found</h3>
                        <p className="text-slate-500">Try adjusting your filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredData.map(item => (
                            <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all group flex flex-col h-full">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900">{item.machine_no}</h3>
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-1">
                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">Shift {item.shift}</span>
                                            <span>•</span>
                                            <span>{new Date(item.submitted_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${item.bekido_percent >= 85 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {Math.round(item.bekido_percent)}%
                                    </div>
                                </div>

                                {/* Photo Thumbnail */}
                                <div
                                    className="bg-slate-100 rounded-xl h-40 mb-4 overflow-hidden relative cursor-pointer group-hover:opacity-90 transition-opacity"
                                    onClick={() => setSelectedSubmission(item)}
                                >
                                    {item.image_path ? (
                                        <img src={`${STATIC_BASE_URL}/${item.image_path}`} alt="Evidence" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                            <Activity className="w-8 h-8 opacity-50" />
                                            <span className="text-xs font-bold uppercase tracking-widest opacity-75">No Photo</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-white text-xs font-bold bg-white/20 backdrop-blur px-3 py-1.5 rounded-full">View Details</span>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                                    <div className="bg-slate-50 rounded-lg p-2">
                                        <div className="text-xs font-bold text-slate-400 uppercase">OK</div>
                                        <div className="font-black text-slate-700">{item.ok_quantity}</div>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-2">
                                        <div className="text-xs font-bold text-slate-400 uppercase">NG</div>
                                        <div className="font-black text-red-500">{item.ng_quantity}</div>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-2">
                                        <div className="text-xs font-bold text-slate-400 uppercase">Total</div>
                                        <div className="font-black text-slate-700">{item.total_quantity}</div>
                                    </div>
                                </div>

                                {/* Action */}
                                <div className="mt-auto pt-4 border-t border-slate-100">
                                    <button
                                        onClick={() => generateSinglePDF(item)}
                                        className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-900/10 hover:bg-black transition flex items-center justify-center gap-2"
                                    >
                                        <Download className="w-4 h-4" /> Download Report
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal for Details */}
            {selectedSubmission && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setSelectedSubmission(null)}>
                    <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="relative h-64 sm:h-80 bg-black">
                            {selectedSubmission.image_path ? (
                                <img src={`${STATIC_BASE_URL}/${selectedSubmission.image_path}`} className="w-full h-full object-contain" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-500">No Image</div>
                            )}
                            <button className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70" onClick={() => setSelectedSubmission(null)}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 md:p-8 overflow-y-auto">
                            <h2 className="text-2xl font-black text-slate-900 mb-2">{selectedSubmission.machine_no}</h2>
                            <p className="text-slate-500 font-medium mb-6">Inspection Details</p>

                            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                                <div><span className="block text-xs font-bold text-slate-400 uppercase">Model</span> <span className="font-bold text-slate-800">{selectedSubmission.model || '-'}</span></div>
                                <div><span className="block text-xs font-bold text-slate-400 uppercase">Inspector</span> <span className="font-bold text-slate-800">{selectedSubmission.username || 'Unknown'}</span></div>
                                <div><span className="block text-xs font-bold text-slate-400 uppercase">Date</span> <span className="font-bold text-slate-800">{new Date(selectedSubmission.submitted_at).toLocaleString()}</span></div>
                                <div><span className="block text-xs font-bold text-slate-400 uppercase">Shift</span> <span className="font-bold text-slate-800">{selectedSubmission.shift}</span></div>
                            </div>

                            {selectedSubmission.remarks && (
                                <div className="mt-6 bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                                    <span className="block text-xs font-bold text-yellow-600 uppercase mb-1">Remarks</span>
                                    <p className="text-slate-700 font-medium">{selectedSubmission.remarks}</p>
                                </div>
                            )}

                            <div className="mt-8 flex gap-3">
                                {user?.role === 'admin' && (
                                    <button
                                        onClick={() => deleteSubmission(selectedSubmission.id)}
                                        className="px-4 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition flex items-center gap-2"
                                        title="Delete Record"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                                <button onClick={() => generateSinglePDF(selectedSubmission)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2">
                                    <Download className="w-5 h-5" /> Download PDF
                                </button>
                                <button onClick={() => setSelectedSubmission(null)} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;

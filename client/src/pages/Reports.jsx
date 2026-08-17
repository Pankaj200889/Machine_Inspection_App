import React, { useState, useEffect } from 'react';
import api, { STATIC_BASE_URL } from '../api';
import { Link } from 'react-router-dom';
import { Download, Search, Filter, Calendar, FileText, CheckCircle, AlertCircle, X, ChevronDown, Activity, ArrowLeft, Image as ImageIcon, Trash2, CheckCircle2, AlertTriangle, UserCheck } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../context/AuthContext';

const Reports = () => {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [dynamicDetails, setDynamicDetails] = useState(null);
    const [dynamicLoading, setDynamicLoading] = useState(false);
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

    // Load dynamic details when a submission is selected
    useEffect(() => {
        if (!selectedSubmission) {
            setDynamicDetails(null);
            return;
        }

        if (selectedSubmission.submission_id) {
            fetchDynamicDetails(selectedSubmission.submission_id);
        }
    }, [selectedSubmission]);

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

    const fetchDynamicDetails = async (submissionId) => {
        setDynamicLoading(true);
        try {
            const res = await api.get(`/checklists/submissions/${submissionId}`);
            setDynamicDetails(res.data);
        } catch (error) {
            console.error("Error fetching dynamic checklist details:", error);
        } finally {
            setDynamicLoading(false);
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
            const newSubmissions = submissions.filter(s => s.id !== id);
            setSubmissions(newSubmissions);
            setSelectedSubmission(null);
            alert("Record deleted successfully.");
        } catch (err) {
            console.error("Delete failed", err);
            alert("Failed to delete record: " + (err.response?.data?.error || err.message));
        }
    };

    const handleSignOff = async (type) => {
        if (!selectedSubmission?.submission_id) return;
        try {
            await api.post(`/checklists/submissions/${selectedSubmission.submission_id}/sign`, { type });
            alert("Signed off successfully!");
            // Refresh detailed view
            fetchDynamicDetails(selectedSubmission.submission_id);
            // Refresh list to update any UI states
            fetchSubmissions();
        } catch (error) {
            console.error("Sign-off error:", error);
            alert("Failed to sign off.");
        }
    };

    const exportToCSV = () => {
        if (!filteredData.length) return alert("No data to export");

        const headers = ["Machine No", "Model", "Shift", "Inspector", "Date", "Time", "OK Qty", "NG Qty", "Total Qty", "Efficiency %", "Remarks", "Image URL"];

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
                `"${(item.remarks || '').replace(/"/g, '""')}"`,
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
            
            // If it's a dynamic template checklist, fetch its details to draw a full compliance report
            let details = null;
            if (submission.submission_id) {
                const res = await api.get(`/checklists/submissions/${submission.submission_id}`);
                details = res.data;
            }

            // Document Header
            doc.setFillColor(28, 63, 170); // Deep Blue Primary
            doc.rect(0, 0, 210, 40, 'F');

            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.text("EQUIPGUARD COMPLIANCE REPORT", 14, 25);

            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(200, 220, 255);
            doc.text(`Doc No: ${details?.doc_no || 'EG/OPS/QA/00'} | Rev: ${details?.rev_no || '00'} | Date: ${details?.rev_date || '-'}`, 14, 32);

            // Machine / Metadata Table
            autoTable(doc, {
                startY: 45,
                head: [['Metadata Field', 'Value', 'Metadata Field', 'Value']],
                body: [
                    ['Machine No', submission.machine_no, 'Inspector Name', submission.username || 'Unknown'],
                    ['Machine Model', submission.model || 'N/A', 'Audit Date/Time', new Date(submission.submitted_at).toLocaleString()],
                    ['Shift / Run', `Shift ${submission.shift}`, 'Line Speed', details?.line_speed || '-'],
                    ['Part Name', details?.part_name || '-', 'Location (GPS)', submission.location || 'N/A']
                ],
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 2.5 },
                headStyles: { fillColor: [59, 130, 246] }
            });

            let yPos = doc.lastAutoTable.finalY + 10;

            if (details && details.sections) {
                // Generate detailed sections and items
                details.sections.forEach(section => {
                    // Check page boundary
                    if (yPos > 250) {
                        doc.addPage();
                        yPos = 20;
                    }

                    doc.setFontSize(11);
                    doc.setTextColor(30, 41, 59);
                    doc.setFont("helvetica", "bold");
                    doc.text(section.section_name.toUpperCase(), 14, yPos);
                    yPos += 4;

                    const tableBody = section.items.map(item => [
                        item.check_point,
                        item.specification || '-',
                        item.checking_method || '-',
                        item.actual_value || '-',
                        item.is_ok === 1 ? 'OK' : 'NG',
                        item.value_remarks || '-'
                    ]);

                    autoTable(doc, {
                        startY: yPos,
                        head: [['Checkpoint / Parameter', 'Specification', 'Method', 'Actual Value', 'Status', 'Deviation Remarks']],
                        body: tableBody,
                        theme: 'striped',
                        styles: { fontSize: 8.5, cellPadding: 2 },
                        headStyles: { fillColor: [71, 85, 105] },
                        didParseCell: (data) => {
                            if (data.column.index === 4 && data.cell.section === 'body') {
                                if (data.cell.text[0] === 'NG') {
                                    data.cell.styles.textColor = [220, 38, 38]; // Red
                                    data.cell.styles.fontStyle = 'bold';
                                } else {
                                    data.cell.styles.textColor = [22, 163, 74]; // Green
                                }
                            }
                        }
                    });

                    yPos = doc.lastAutoTable.finalY + 8;
                });

                // Supervisor Signatures Section
                if (yPos > 230) {
                    doc.addPage();
                    yPos = 20;
                }

                doc.setFontSize(11);
                doc.setTextColor(30, 41, 59);
                doc.setFont("helvetica", "bold");
                doc.text("VERIFICATION & SIGN-OFF STATUS", 14, yPos);
                yPos += 5;

                const signedByL = details.checked_by ? 'VERIFIED' : 'PENDING SIGN-OFF';
                const signedByS = details.approved_by ? 'APPROVED' : 'PENDING SIGN-OFF';

                autoTable(doc, {
                    startY: yPos,
                    head: [['Role', 'Signee Username', 'Signature Date / Time', 'Status']],
                    body: [
                        ['Line Incharge (Checked By)', details.inspector || '-', details.checked_at ? new Date(details.checked_at).toLocaleString() : '-', signedByL],
                        ['Shift Incharge (Approved By)', details.inspector || '-', details.approved_at ? new Date(details.approved_at).toLocaleString() : '-', signedByS]
                    ],
                    theme: 'grid',
                    styles: { fontSize: 9, cellPadding: 3 },
                    headStyles: { fillColor: [15, 23, 42] }
                });

                yPos = doc.lastAutoTable.finalY + 10;
            } else {
                // Legacy standard summary format
                autoTable(doc, {
                    startY: yPos,
                    head: [['Metric', 'Quantity / Value']],
                    body: [
                        ['OK Quantity', submission.ok_quantity],
                        ['NG Quantity', submission.ng_quantity],
                        ['Total Quantity', submission.total_quantity],
                        ['Efficiency (Bekido)', `${submission.bekido_percent}%`],
                        ['Remarks', submission.remarks || '-']
                    ],
                    theme: 'striped',
                    styles: { fontSize: 9 },
                    headStyles: { fillColor: [100, 116, 139] }
                });
                yPos = doc.lastAutoTable.finalY + 10;
            }

            // Photo visual evidence
            if (submission.image_path) {
                if (yPos + 80 > 280) {
                    doc.addPage();
                    yPos = 20;
                }

                doc.setFontSize(12);
                doc.setTextColor(30, 41, 59);
                doc.setFont("helvetica", "bold");
                doc.text("Visual Audit Evidence", 14, yPos);
                yPos += 5;

                try {
                    const imgUrl = `${STATIC_BASE_URL}/${submission.image_path}`;
                    const imgData = await fetchImageAsBase64(imgUrl);

                    if (imgData) {
                        const imgProps = doc.getImageProperties(imgData);
                        const pdfWidth = 120;
                        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                        doc.addImage(imgData, 'JPEG', 14, yPos, pdfWidth, pdfHeight);
                    }
                } catch (err) {
                    console.error("Error adding image to PDF", err);
                    doc.setFontSize(9);
                    doc.setTextColor(220, 38, 38);
                    doc.text("Unable to load visual audit photo.", 14, yPos + 5);
                }
            }

            doc.save(`Compliance_Report_${submission.machine_no}_${submission.id}.pdf`);
        } catch (error) {
            console.error("Single PDF Generation Error:", error);
            alert("Failed to generate compliance report. See console for details.");
        }
    };

    const generateBulkPDF = async () => {
        if (!filteredData.length) return alert("No data to export");
        setIsGeneratingPdf(true);

        try {
            const doc = new jsPDF();

            doc.setFontSize(18);
            doc.text("Full Compliance Inspections Log", 14, 15);
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
            doc.text(`Total Records: ${filteredData.length}`, 14, 27);

            if (filteredData.length > 50 && !window.confirm(`You are about to export ${filteredData.length} records. This might take a while. Continue?`)) {
                setIsGeneratingPdf(false);
                return;
            }

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
                    ''
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
                                // ignore
                            }
                        }
                    }
                }
            });

            doc.save(`Full_Inspections_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
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
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => setSelectedSubmission(null)}>
                    <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        
                        {/* Header Image banner */}
                        <div className="relative h-48 sm:h-56 bg-slate-900 shrink-0 flex">
                            {dynamicDetails?.image_url ? (
                                <img src={dynamicDetails.image_url.startsWith('http') ? dynamicDetails.image_url : `${STATIC_BASE_URL}/${dynamicDetails.image_url}`} className="w-1/2 h-full object-cover opacity-80 border-r border-slate-700" />
                            ) : selectedSubmission.image_path ? (
                                <img src={`${STATIC_BASE_URL}/${selectedSubmission.image_path}`} className="w-full h-full object-cover opacity-80" />
                            ) : (
                                <div className="w-1/2 h-full flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest text-sm border-r border-slate-700">No Image 1</div>
                            )}

                            {dynamicDetails?.image2_url ? (
                                <img src={dynamicDetails.image2_url.startsWith('http') ? dynamicDetails.image2_url : `${STATIC_BASE_URL}/${dynamicDetails.image2_url}`} className="w-1/2 h-full object-cover opacity-80" />
                            ) : (
                                <div className="w-1/2 h-full flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest text-sm">No Image 2</div>
                            )}
                            <button className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition" onClick={() => setSelectedSubmission(null)}>
                                <X className="w-5 h-5" />
                            </button>
                            <div className="absolute bottom-4 left-6 text-white">
                                <span className="bg-blue-600/95 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md">Shift {selectedSubmission.shift}</span>
                                <h2 className="text-2xl font-black mt-1.5">{selectedSubmission.machine_no}</h2>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
                            
                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div><span className="block text-[10px] font-bold text-slate-400 uppercase">Model</span> <span className="font-bold text-sm text-slate-800">{selectedSubmission.model || '-'}</span></div>
                                <div><span className="block text-[10px] font-bold text-slate-400 uppercase">Inspector</span> <span className="font-bold text-sm text-slate-800">{selectedSubmission.username || 'Unknown'}</span></div>
                                <div><span className="block text-[10px] font-bold text-slate-400 uppercase">Date</span> <span className="font-bold text-sm text-slate-800">{new Date(selectedSubmission.submitted_at).toLocaleDateString()}</span></div>
                                <div><span className="block text-[10px] font-bold text-slate-400 uppercase">Time</span> <span className="font-bold text-sm text-slate-800">{new Date(selectedSubmission.submitted_at).toLocaleTimeString()}</span></div>
                            </div>

                            {/* Dynamic Check points table */}
                            {selectedSubmission.submission_id ? (
                                <div className="space-y-4">
                                    <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-150 pb-2">DYNAMIC COMPLIANCE PARAMETERS</h3>
                                    
                                    {dynamicLoading ? (
                                        <div className="text-center py-6 text-slate-400 font-semibold animate-pulse">Loading compliance sheet...</div>
                                    ) : dynamicDetails && dynamicDetails.sections ? (
                                        <div className="space-y-6">
                                            {dynamicDetails.sections.map(sec => (
                                                <div key={sec.id} className="space-y-2">
                                                    <h4 className="text-xs font-bold text-blue-600 bg-blue-50/50 px-3 py-1 rounded-lg uppercase tracking-wider w-max">{sec.section_name}</h4>
                                                    <div className="overflow-x-auto border border-slate-150 rounded-xl">
                                                        <table className="w-full text-left border-collapse">
                                                            <thead>
                                                                <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-500 uppercase">
                                                                    <th className="p-3">Check Point</th>
                                                                    <th className="p-3">Spec</th>
                                                                    <th className="p-3">Method</th>
                                                                    <th className="p-3">Logged</th>
                                                                    <th className="p-3">Status</th>
                                                                    <th className="p-3">Remarks</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100 text-xs">
                                                                {sec.items.map(item => (
                                                                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                                                                        <td className="p-3 font-semibold text-slate-700">{item.check_point}</td>
                                                                        <td className="p-3 text-slate-500">{item.specification || '-'}</td>
                                                                        <td className="p-3 text-slate-400 font-bold uppercase">{item.checking_method}</td>
                                                                        <td className="p-3 font-bold text-slate-800">{item.actual_value || '-'}</td>
                                                                        <td className="p-3">
                                                                            {item.is_ok === 1 ? (
                                                                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">OK</span>
                                                                            ) : (
                                                                                <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">NG</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="p-3 text-red-600 italic font-medium">{item.value_remarks || '-'}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Signature Stamps / Verification boxes */}
                                            <div className="grid grid-cols-2 gap-4 border-t border-slate-150 pt-6">
                                                <div className="border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center justify-between min-h-[140px] bg-slate-50/50">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Checked By</span>
                                                        <span className="block text-xs font-semibold text-slate-500 mt-1">Line Incharge</span>
                                                    </div>
                                                    
                                                    {dynamicDetails.checked_by ? (
                                                        <div className="mt-2 text-emerald-600 flex flex-col items-center">
                                                            <UserCheck className="w-8 h-8 mb-1" />
                                                            <span className="text-xs font-extrabold uppercase">Verified Digital Signature</span>
                                                            <span className="text-[10px] opacity-75">{new Date(dynamicDetails.checked_at).toLocaleDateString()}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="mt-2 w-full">
                                                            {user?.role === 'admin' || user?.role === 'supervisor' ? (
                                                                <button
                                                                    onClick={() => handleSignOff('check')}
                                                                    className="w-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl transition shadow-sm"
                                                                >
                                                                    Sign Verification
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs font-bold text-slate-400 italic">Awaiting Signature</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center justify-between min-h-[140px] bg-slate-50/50">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Approved By</span>
                                                        <span className="block text-xs font-semibold text-slate-500 mt-1">Shift Incharge</span>
                                                    </div>

                                                    {dynamicDetails.approved_by ? (
                                                        <div className="mt-2 text-indigo-600 flex flex-col items-center">
                                                            <UserCheck className="w-8 h-8 mb-1" />
                                                            <span className="text-xs font-extrabold uppercase">Approved Digital Signature</span>
                                                            <span className="text-[10px] opacity-75">{new Date(dynamicDetails.approved_at).toLocaleDateString()}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="mt-2 w-full">
                                                            {user?.role === 'admin' || user?.role === 'supervisor' ? (
                                                                <button
                                                                    onClick={() => handleSignOff('approve')}
                                                                    className="w-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl transition shadow-sm"
                                                                >
                                                                    Sign Approval
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs font-bold text-slate-400 italic">Awaiting Approval</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 text-slate-400">Failed to load detailed specifications.</div>
                                    )}
                                </div>
                            ) : null}

                            {/* Operator Signature */}
                            {dynamicDetails?.signature_url && (
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                                    <span className="block text-xs font-bold text-slate-400 uppercase mb-2">Operator Signature</span>
                                    <img src={dynamicDetails.signature_url.startsWith('http') ? dynamicDetails.signature_url : `${STATIC_BASE_URL}/${dynamicDetails.signature_url}`} alt="Operator Signature" className="h-20 object-contain" />
                                </div>
                            )}

                            {/* Comments */}
                            {(dynamicDetails?.comments || selectedSubmission.remarks) && (
                                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                                    <span className="block text-xs font-bold text-yellow-600 uppercase mb-1">Remarks / Comments</span>
                                    <p className="text-slate-700 font-medium text-sm">{dynamicDetails?.comments || selectedSubmission.remarks}</p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="border-t border-slate-100 pt-6 flex gap-3">
                                {user?.role === 'admin' && (
                                    <button
                                        onClick={() => deleteSubmission(selectedSubmission.id)}
                                        className="px-4 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition flex items-center gap-2"
                                        title="Delete Record"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                                <button onClick={() => generateSinglePDF(selectedSubmission)} className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10">
                                    <Download className="w-5 h-5" /> Download PDF
                                </button>
                                <button onClick={() => setSelectedSubmission(null)} className="px-6 py-3.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition">
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

import React, { useState, useEffect } from 'react';
import api, { STATIC_BASE_URL } from '../api';
import { ArrowLeft, Save, Building, Upload, Link as LinkIcon, Image, Trash2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const OrganizationProfile = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState({
        company_name: '',
        logo_url: '',
        plant_no: '',
        address: ''
    });
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    // Removed uploadMode state as it is no longer needed

    const [loading, setLoading] = useState(true);
    // api handles auth headers

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/organization');
            if (res.data) {
                setProfile({
                    ...res.data,
                    logo_url: res.data.logo_url || ''
                });
            }
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleRemoveLogo = () => {
        if (window.confirm('Are you sure you want to remove the custom logo?')) {
            setProfile(prev => ({ ...prev, logo_url: '' }));
            setLogoFile(null);
            setLogoPreview(null);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('company_name', profile.company_name);
        formData.append('plant_no', profile.plant_no);
        formData.append('address', profile.address);

        if (logoFile) {
            formData.append('logo', logoFile);
        } else {
            // Send existing url (which might be empty string if removed)
            formData.append('logo_url', profile.logo_url);
        }

        try {
            await api.put('/organization', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            alert('Organization Profile Updated!');
            navigate('/');
        } catch (error) {
            alert('Error updating profile');
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;

    // determine what image to show
    const displayImage = logoPreview ||
        (profile.logo_url && profile.logo_url.startsWith('http') ? profile.logo_url :
            profile.logo_url ? `${STATIC_BASE_URL}/${profile.logo_url}` : null);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link to="/" className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-800">Organization Profile</h1>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-8">
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Profile Preview */}
                        <div className="w-full md:w-1/3 flex flex-col items-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300 h-fit">
                            <div className="w-40 h-40 bg-white rounded-full shadow-md flex items-center justify-center mb-4 overflow-hidden border-4 border-white ring-1 ring-gray-200 relative group">
                                {displayImage ? (
                                    <img src={displayImage} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <Building className="w-16 h-16 text-gray-300" />
                                )}
                            </div>

                            {(profile.logo_url || logoFile) && (
                                <button
                                    type="button"
                                    onClick={handleRemoveLogo}
                                    className="mb-4 text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 px-3 py-1 bg-red-50 rounded-full hover:bg-red-100 transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" /> Remove Custom Logo
                                </button>
                            )}

                            <h3 className="font-bold text-xl text-center text-gray-800">{profile.company_name || 'Your Company'}</h3>
                            <p className="text-sm text-gray-500 text-center font-medium mt-1">{profile.plant_no ? `Plant: ${profile.plant_no}` : 'Plant Info'}</p>
                            <p className="text-xs text-gray-400 text-center mt-3 px-4 leading-relaxed">{profile.address || 'Address not set'}</p>
                        </div>

                        {/* Form */}
                        <div className="flex-1">
                            <form onSubmit={handleSave} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Company Name</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                        value={profile.company_name}
                                        onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                                        placeholder="Enter company name"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Company Logo</label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={handleFileChange}
                                        />
                                        <div className="flex flex-col items-center justify-center text-gray-500">
                                            <Image className="w-8 h-8 mb-2 text-gray-400" />
                                            <span className="text-sm font-medium text-blue-600">Click to upload</span>
                                            <span className="text-xs">or drag and drop SVG, PNG, JPG</span>
                                            {logoFile && (
                                                <div className="mt-3 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                                                    Selected: {logoFile.name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Plant No / ID</label>
                                        <input
                                            type="text"
                                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                            value={profile.plant_no}
                                            onChange={(e) => setProfile({ ...profile, plant_no: e.target.value })}
                                            placeholder="e.g. Plant-01"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Address</label>
                                    <textarea
                                        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                        rows="3"
                                        value={profile.address}
                                        onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                        placeholder="Enter full address"
                                    ></textarea>
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-bold shadow-md hover:bg-blue-700 transition flex items-center justify-center gap-2 transform active:scale-[0.99]"
                                    >
                                        <Save className="w-5 h-5" /> Save Profile Settings
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganizationProfile;

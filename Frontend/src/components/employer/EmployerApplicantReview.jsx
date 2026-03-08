import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const EmployerApplicantReview = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedApp, setSelectedApp] = useState(null);
    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            const response = await axios.get('http://localhost:5029/api/application/employer', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setApplications(response.data);
        } catch (error) {
            console.error('Error fetching applications:', error);
            toast.error('Could not load applicant list.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (appId, newStatus) => {
        try {
            await axios.patch(`http://localhost:5029/api/application/${appId}/status`, 
                JSON.stringify(newStatus), 
                {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            toast.success(`Application marked as ${newStatus}`);
            fetchApplications();
            if (selectedApp?.applicationId === appId) {
                setSelectedApp(prev => ({ ...prev, status: newStatus }));
            }
        } catch (error) {
            console.error('Error updating application status:', error);
            toast.error('Failed to update status.');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
            case 'Under Review': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'Accepted': return 'bg-green-50 text-green-600 border-green-100';
            case 'Rejected': return 'bg-red-50 text-red-600 border-red-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p className="text-slate-500 mt-4 font-medium">Loading applications...</p>
            </div>
        );
    }

    return (
        <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden anim-fadeUp">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Applicant Review</h2>
                        <p className="text-slate-500 text-sm mt-1">Review profiles and evaluate candidates for your jobs.</p>
                    </div>
                </div>

                {applications.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-slate-300">group_off</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">No applicants yet</h3>
                        <p className="text-slate-500 mt-1">When students apply, they will appear here.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Student Info</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Job Title</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Status</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {applications.map((app) => (
                                    <tr 
                                        key={app.applicationId} 
                                        className={`hover:bg-slate-50/30 transition-colors cursor-pointer ${selectedApp?.applicationId === app.applicationId ? 'bg-primary/5' : ''}`}
                                        onClick={() => setSelectedApp(app)}
                                    >
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-slate-800">{app.applicantName}</div>
                                            <div className="text-xs text-slate-400 mt-1">{app.applicantMajor}</div>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-semibold text-slate-600 whitespace-nowrap">
                                            {app.jobTitle}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor(app.status)}`}>
                                                {app.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-primary hover:border-primary transition-all flex items-center justify-center ml-auto">
                                                <span className="material-symbols-outlined !text-[18px]">visibility</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Application Detail View */}
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-8 anim-fadeUp-d1 lg:sticky lg:top-24">
                {selectedApp ? (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-3xl font-black mx-auto mb-4 shadow-lg shadow-primary/20">
                                {selectedApp.applicantName.charAt(0)}
                            </div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">{selectedApp.applicantName}</h3>
                            <p className="text-slate-400 text-sm font-medium">{selectedApp.applicantEmail}</p>
                        </div>

                        <div className="h-px bg-slate-100"></div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Education</label>
                                <p className="text-sm font-bold text-slate-700">{selectedApp.applicantMajor}</p>
                                <p className="text-xs text-slate-400 font-medium">Class: {selectedApp.studyYear}</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Cover Message</label>
                                <div className="p-4 rounded-2xl bg-slate-50 text-sm text-slate-600 leading-relaxed italic border border-slate-100">
                                    "{selectedApp.coverMessage || "No cover message provided."}"
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4">
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleUpdateStatus(selectedApp.applicationId, 'Accepted')}
                                    className="flex-1 h-11 rounded-xl bg-green-500 text-white font-bold text-sm shadow-md shadow-green-200 hover:shadow-lg transition-all"
                                >
                                    Accept
                                </button>
                                <button 
                                    onClick={() => handleUpdateStatus(selectedApp.applicationId, 'Rejected')}
                                    className="flex-1 h-11 rounded-xl bg-red-50 text-red-500 font-bold text-sm border border-red-100 hover:bg-red-100 transition-all"
                                >
                                    Reject
                                </button>
                            </div>
                            <button 
                                onClick={() => handleUpdateStatus(selectedApp.applicationId, 'Under Review')}
                                className="w-full h-11 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all"
                            >
                                Mark as Under Review
                            </button>

                            {/* Message Button */}
                            {(selectedApp.status === 'Accepted' || selectedApp.status === 'Under Review') && (
                                <button 
                                    onClick={() => navigate('/messages', { 
                                        state: { 
                                            contactId: selectedApp.applicantId, 
                                            contactName: selectedApp.applicantName 
                                        } 
                                    })}
                                    className="w-full h-11 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined !text-[20px]">forum</span>
                                    Message Applicant
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-96 flex flex-col items-center justify-center text-center opacity-40">
                         <span className="material-symbols-outlined !text-6xl text-slate-300 mb-4 font-thin">contact_page</span>
                         <p className="font-bold text-slate-400">Select an applicant to<br/>view full profile details</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployerApplicantReview;

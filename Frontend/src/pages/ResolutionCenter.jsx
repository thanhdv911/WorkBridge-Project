import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ResolutionCenter = () => {
    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDispute, setSelectedDispute] = useState(null);
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchDisputes();
    }, []);

    const fetchDisputes = async () => {
        try {
            setLoading(true);
            const response = await api.get('/contracts/disputes/my', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDisputes(response.data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load disputes.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    const parseEvidence = (jsonString) => {
        if (!jsonString) return [];
        try {
            return JSON.parse(jsonString);
        } catch {
            return [];
        }
    };

    return (
        <div className="bg-[#FDFDFF] min-h-screen pb-20 font-display relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-500/[0.03] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>

            <div className="relative z-10 bg-white/60 backdrop-blur-xl border-b border-slate-200/50 pb-12 pt-10">
                <div className="max-w-[1320px] mx-auto px-6 lg:px-10">
                    <div className="anim-fadeUp inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-wider mb-4 border border-rose-100">
                        <span className="material-symbols-outlined !text-sm">gavel</span>
                        Support & Protection
                    </div>
                    <h1 className="anim-fadeUp-d1 text-4xl font-black text-slate-900 tracking-tight leading-none">
                        Resolution <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-red-600">Center</span>
                    </h1>
                    <p className="anim-fadeUp-d2 text-slate-500 mt-4 text-lg max-w-xl font-medium">
                        Track your open cases. WorkBridge automatically provides your time-tracking history as evidence to ensure fair resolution.
                    </p>
                </div>
            </div>

            <main className="relative z-10 max-w-[1320px] mx-auto px-6 lg:px-10 mt-12">
                {disputes.length === 0 ? (
                    <div className="bg-white/80 rounded-[3rem] border border-slate-100 shadow-2xl p-20 text-center anim-fadeUp">
                        <div className="w-24 h-24 rounded-[2rem] bg-emerald-50 flex items-center justify-center mx-auto mb-8 shadow-inner border border-emerald-100">
                            <span className="material-symbols-outlined text-emerald-400 !text-5xl">verified</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800">No active disputes</h2>
                        <p className="text-slate-500 mt-3 max-w-sm mx-auto font-medium">You don't have any open cases. That's great news!</p>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-[1fr_400px] gap-8">
                        <div className="space-y-4 anim-fadeUp">
                            {disputes.map((dispute) => (
                                <div 
                                    key={dispute.disputeId}
                                    onClick={() => setSelectedDispute(dispute)}
                                    className={`p-6 rounded-3xl border cursor-pointer transition-all ${
                                        selectedDispute?.disputeId === dispute.disputeId 
                                        ? 'border-rose-200 bg-rose-50/30 shadow-lg shadow-rose-100/50' 
                                        : 'border-slate-200/60 bg-white shadow-sm hover:shadow-md hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-black text-slate-800 text-lg">{dispute.jobTitle}</h3>
                                            <div className="text-sm font-medium text-slate-500 mt-1">
                                                Against: <span className="font-bold text-slate-700">{dispute.respondentName}</span>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                            dispute.status === 'Resolved' ? 'bg-green-50 text-green-600 border-green-200' : 
                                            dispute.status === 'Closed' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                            'bg-rose-50 text-rose-600 border-rose-200 animate-pulse'
                                        }`}>
                                            {dispute.status}
                                        </div>
                                    </div>
                                    <div className="text-sm font-medium text-slate-600 italic line-clamp-2">
                                        "{dispute.reason}"
                                    </div>
                                    <div className="mt-4 text-[10px] font-bold text-slate-400">
                                        Opened on {new Date(dispute.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="anim-fadeUp-d1">
                            {selectedDispute ? (
                                <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl p-8 sticky top-24">
                                    <h3 className="text-xl font-black text-slate-800 mb-6">Case Details</h3>
                                    
                                    <div className="space-y-6">
                                        <div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Complaint Reason</div>
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-medium text-slate-700">
                                                {selectedDispute.reason}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                                                <span>Auto-Collected Evidence</span>
                                                <span className="text-primary bg-primary/10 px-2 py-0.5 rounded text-[9px]">Time Tracking Logs</span>
                                            </div>
                                            <div className="bg-slate-900 rounded-2xl p-4 overflow-hidden shadow-inner max-h-[300px] overflow-y-auto custom-scrollbar">
                                                {parseEvidence(selectedDispute.evidenceData).length > 0 ? (
                                                    <div className="space-y-3">
                                                        {parseEvidence(selectedDispute.evidenceData).map((log, i) => (
                                                            <div key={i} className="flex justify-between items-center border-b border-slate-700/50 pb-2 last:border-0 last:pb-0">
                                                                <div className="text-slate-300 text-xs font-medium">
                                                                    {new Date(log.Date).toLocaleDateString()}
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-emerald-400 text-xs font-bold">In: {new Date(log.CheckIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                                    {log.CheckOut ? (
                                                                        <div className="text-rose-400 text-xs font-bold">Out: {new Date(log.CheckOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                                    ) : (
                                                                        <div className="text-amber-400 text-xs font-bold italic">No Checkout</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-slate-500 text-xs text-center py-4 italic">No time tracking logs found for this contract.</div>
                                                )}
                                            </div>
                                        </div>

                                        {selectedDispute.adminNotes && (
                                            <div>
                                                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                                                    <span className="material-symbols-outlined !text-[14px]">admin_panel_settings</span>
                                                    Admin Resolution Note
                                                </div>
                                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-sm font-bold text-emerald-800">
                                                    {selectedDispute.adminNotes}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full min-h-[400px] border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center p-8 opacity-60">
                                    <span className="material-symbols-outlined !text-5xl text-slate-300 mb-4">find_in_page</span>
                                    <p className="text-slate-500 font-bold">Select a case from the list<br/>to view detailed evidence and status</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ResolutionCenter;

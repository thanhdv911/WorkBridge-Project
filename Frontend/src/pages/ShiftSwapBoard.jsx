import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ShiftSwapBoard = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const response = await api.get('/shifts/swap-board', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(response.data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load swap board.');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptSwap = async (swapRequestId) => {
        try {
            await api.post(`/shifts/swap/${swapRequestId}/accept`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('You have successfully accepted the shift!');
            fetchRequests();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to accept swap.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="bg-[#FDFDFF] min-h-screen pb-20 font-display relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-amber-500/[0.03] rounded-full blur-[120px] -translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>

            <div className="relative z-10 bg-white/60 backdrop-blur-xl border-b border-slate-200/50 pb-12 pt-10">
                <div className="max-w-[1320px] mx-auto px-6 lg:px-10">
                    <div className="anim-fadeUp inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-black uppercase tracking-wider mb-4">
                        <span className="material-symbols-outlined !text-sm">sync_alt</span>
                        Shift Marketplace
                    </div>
                    <h1 className="anim-fadeUp-d1 text-4xl font-black text-slate-900 tracking-tight leading-none">
                        Shift <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Swap Board</span>
                    </h1>
                    <p className="anim-fadeUp-d2 text-slate-500 mt-4 text-lg max-w-xl font-medium">
                        Help out a coworker and earn extra hours by picking up open shifts at your workplace.
                    </p>
                </div>
            </div>

            <main className="relative z-10 max-w-[1320px] mx-auto px-6 lg:px-10 mt-12">
                {requests.length === 0 ? (
                    <div className="bg-white/80 rounded-[3rem] border border-slate-100 shadow-2xl p-20 text-center anim-fadeUp">
                        <div className="w-24 h-24 rounded-[2rem] bg-slate-50 flex items-center justify-center mx-auto mb-8 shadow-inner">
                            <span className="material-symbols-outlined text-slate-300 !text-5xl">task_alt</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800">No open shifts available</h2>
                        <p className="text-slate-500 mt-3 max-w-sm mx-auto font-medium">Everyone is covering their shifts right now. Check back later!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 anim-fadeUp">
                        {requests.map((req) => (
                            <div key={req.swapRequestId} className="bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/40 p-6 flex flex-col hover:-translate-y-1 transition-all">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold overflow-hidden shadow-inner border border-white">
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${req.requestorName}`} alt="avatar" />
                                    </div>
                                    <div className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-100">
                                        Needs Cover
                                    </div>
                                </div>
                                
                                <h3 className="font-black text-slate-800 text-lg mb-1">{req.requestorName}</h3>
                                <p className="text-sm font-bold text-slate-500 mb-6">is giving away a shift on <span className="text-slate-800">{new Date(req.shiftDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span></p>

                                <div className="flex items-center gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex-1">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Start</div>
                                        <div className="font-bold text-slate-700">{req.startTime.substring(0,5)}</div>
                                    </div>
                                    <div className="w-px h-8 bg-slate-200"></div>
                                    <div className="flex-1 text-right">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">End</div>
                                        <div className="font-bold text-slate-700">{req.endTime.substring(0,5)}</div>
                                    </div>
                                </div>

                                {req.reason && (
                                    <div className="mb-6">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reason</div>
                                        <div className="text-sm font-medium text-slate-600 italic bg-slate-50 p-3 rounded-xl border border-slate-100">"{req.reason}"</div>
                                    </div>
                                )}

                                <div className="mt-auto pt-4 border-t border-slate-100">
                                    <button 
                                        onClick={() => handleAcceptSwap(req.swapRequestId)}
                                        className="w-full h-12 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center gap-2 hover:bg-primary transition-all active:scale-95 shadow-lg shadow-black/10"
                                    >
                                        <span className="material-symbols-outlined !text-xl">handshake</span>
                                        Take This Shift
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ShiftSwapBoard;

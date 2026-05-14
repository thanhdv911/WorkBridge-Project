import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const MySchedules = () => {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [swapModal, setSwapModal] = useState({ isOpen: false, scheduleId: null, reason: '' });
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        try {
            setLoading(true);
            const response = await api.get('/shifts/my', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSchedules(response.data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load your schedules.');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async (scheduleId) => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser.");
        }
        
        // Simulating getting location just for the effect, we don't strictly send it in this version
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                await api.post(`/shifts/${scheduleId}/check-in`, 
                    JSON.stringify(`Checked in from lat: ${position.coords.latitude.toFixed(4)}, lng: ${position.coords.longitude.toFixed(4)}`), 
                    {
                        headers: { 
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                toast.success('Successfully checked in!');
                fetchSchedules();
            } catch (error) {
                toast.error(error.response?.data?.message || 'Check-in failed.');
            }
        }, (error) => {
            toast.error("Please allow location access to check-in.");
        });
    };

    const handleCheckOut = async (scheduleId) => {
        try {
            await api.post(`/shifts/${scheduleId}/check-out`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Successfully checked out!');
            fetchSchedules();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Check-out failed.');
        }
    };

    const submitSwapRequest = async () => {
        try {
            await api.post('/shifts/swap', 
                { scheduleId: swapModal.scheduleId, reason: swapModal.reason },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Swap request submitted. It is now pending on the Swap Board.');
            setSwapModal({ isOpen: false, scheduleId: null, reason: '' });
            fetchSchedules();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit swap request.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="bg-[#FDFDFF] min-h-screen pb-20 font-display relative overflow-hidden">
            <div className="relative z-10 bg-white/60 backdrop-blur-xl border-b border-slate-200/50 pb-12 pt-10">
                <div className="max-w-[1320px] mx-auto px-6 lg:px-10">
                    <div className="anim-fadeUp inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider mb-4">
                        <span className="material-symbols-outlined !text-sm">calendar_month</span>
                        Time Tracking
                    </div>
                    <h1 className="anim-fadeUp-d1 text-4xl font-black text-slate-900 tracking-tight leading-none">
                        My <span className="grad-text">Work Schedule</span>
                    </h1>
                </div>
            </div>

            <main className="relative z-10 max-w-[1320px] mx-auto px-6 lg:px-10 mt-12">
                {schedules.length === 0 ? (
                    <div className="bg-white/80 rounded-[3rem] border border-slate-100 shadow-2xl p-20 text-center anim-fadeUp">
                        <div className="w-24 h-24 rounded-[2rem] bg-slate-50 flex items-center justify-center mx-auto mb-8 shadow-inner">
                            <span className="material-symbols-outlined text-slate-300 !text-5xl">event_busy</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800">No shifts scheduled</h2>
                        <p className="text-slate-500 mt-3 max-w-sm mx-auto font-medium">You don't have any upcoming shifts. Enjoy your free time!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 anim-fadeUp">
                        {schedules.map((schedule) => {
                            const shiftDateStr = new Date(schedule.shiftDate).toISOString().split('T')[0];
                            const isToday = shiftDateStr === today;
                            
                            return (
                                <div key={schedule.scheduleId} className={`relative rounded-3xl border ${isToday ? 'border-primary/30 shadow-primary/10 bg-primary/[0.02]' : 'border-slate-200/60 shadow-slate-200/40 bg-white'} shadow-xl p-6 transition-all hover:-translate-y-1`}>
                                    {isToday && (
                                        <div className="absolute -top-3 left-6 px-3 py-1 bg-primary text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-md shadow-primary/20">
                                            Today
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between items-start mb-6 pt-2">
                                        <div>
                                            <h3 className="font-black text-slate-800 text-lg">{schedule.jobTitle}</h3>
                                            <p className="text-sm font-bold text-slate-500">{new Date(schedule.shiftDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                            schedule.status === 'Scheduled' ? 'bg-slate-50 text-slate-600 border-slate-200' :
                                            schedule.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse' :
                                            schedule.status === 'Completed' ? 'bg-green-50 text-green-600 border-green-200' :
                                            'bg-amber-50 text-amber-600 border-amber-200'
                                        }`}>
                                            {schedule.status}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 mb-8 bg-slate-50 p-4 rounded-2xl">
                                        <div className="flex-1">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Start</div>
                                            <div className="font-bold text-slate-700">{schedule.startTime.substring(0,5)}</div>
                                        </div>
                                        <div className="w-px h-8 bg-slate-200"></div>
                                        <div className="flex-1 text-right">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">End</div>
                                            <div className="font-bold text-slate-700">{schedule.endTime.substring(0,5)}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {schedule.status === 'Scheduled' && isToday && (
                                            <button 
                                                onClick={() => handleCheckIn(schedule.scheduleId)}
                                                className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 text-white font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:shadow-xl transition-all active:scale-95"
                                            >
                                                <span className="material-symbols-outlined !text-xl">location_on</span>
                                                Check In Now
                                            </button>
                                        )}
                                        
                                        {schedule.status === 'In Progress' && (
                                            <button 
                                                onClick={() => handleCheckOut(schedule.scheduleId)}
                                                className="w-full h-12 rounded-xl bg-gradient-to-r from-rose-400 to-rose-500 text-white font-black flex items-center justify-center gap-2 shadow-lg shadow-rose-200 hover:shadow-xl transition-all active:scale-95"
                                            >
                                                <span className="material-symbols-outlined !text-xl">logout</span>
                                                Check Out
                                            </button>
                                        )}

                                        {schedule.status === 'Scheduled' && (
                                            <button 
                                                onClick={() => setSwapModal({ isOpen: true, scheduleId: schedule.scheduleId, reason: '' })}
                                                className="w-full h-12 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95"
                                            >
                                                <span className="material-symbols-outlined !text-xl">swap_horiz</span>
                                                Request Shift Swap
                                            </button>
                                        )}
                                        
                                        {schedule.attendance && (
                                            <div className="text-center text-xs font-medium text-slate-400 mt-2">
                                                Checked in at: {new Date(schedule.attendance.checkInTime).toLocaleTimeString()}
                                                {schedule.attendance.checkOutTime && <><br/>Checked out at: {new Date(schedule.attendance.checkOutTime).toLocaleTimeString()}</>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Swap Request Modal */}
            {swapModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Request Shift Swap</h3>
                        <p className="text-slate-500 text-sm mb-4">Are you unable to work this shift? Describe the reason. Other employees at this job will be able to take it.</p>
                        
                        <textarea
                            value={swapModal.reason}
                            onChange={(e) => setSwapModal({ ...swapModal, reason: e.target.value })}
                            placeholder="E.g., I have a sudden mid-term exam..."
                            className="w-full p-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none resize-none h-32 mb-4 font-medium"
                        ></textarea>
                        
                        <div className="flex gap-3 justify-end">
                            <button 
                                onClick={() => setSwapModal({ isOpen: false, scheduleId: null, reason: '' })}
                                className="px-6 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={submitSwapRequest}
                                className="px-6 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary-dk shadow-md shadow-primary/20"
                            >
                                Submit Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MySchedules;

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const EmployerSchedule = () => {
    const [applications, setApplications] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    const [form, setForm] = useState({
        jobPostId: '',
        applicantId: '',
        shiftDate: '',
        startTime: '',
        endTime: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [appRes, schedRes] = await Promise.all([
                api.get('/application/employer', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/shifts/employer', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            // Only keep accepted applicants for scheduling
            setApplications(appRes.data.filter(a => a.status === 'Accepted'));
            setSchedules(schedRes.data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load scheduling data.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSchedule = async (e) => {
        e.preventDefault();
        try {
            // Find jobPostId from applicant
            const selectedApp = applications.find(a => a.applicantId.toString() === form.applicantId);
            if (!selectedApp) {
                toast.error("Please select an employee.");
                return;
            }

            const requestData = {
                jobPostId: selectedApp.jobPostId,
                applicantId: parseInt(form.applicantId),
                shiftDate: form.shiftDate,
                startTime: form.startTime + ":00",
                endTime: form.endTime + ":00"
            };

            await api.post('/shifts/schedule', requestData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Shift scheduled successfully!");
            setForm({ ...form, shiftDate: '', startTime: '', endTime: '' });
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to create schedule.');
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 anim-fadeUp">
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-8">
                <div className="mb-6 border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-bold text-slate-800">Shift Scheduler</h2>
                    <p className="text-slate-500 text-sm mt-1">Assign work shifts to your accepted employees.</p>
                </div>

                <form onSubmit={handleCreateSchedule} className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div className="lg:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Select Employee</label>
                        <select 
                            required
                            value={form.applicantId}
                            onChange={(e) => setForm({...form, applicantId: e.target.value})}
                            className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-semibold"
                        >
                            <option value="">-- Choose Employee --</option>
                            {applications.map(app => (
                                <option key={app.applicationId} value={app.applicantId}>
                                    {app.applicantName} ({app.jobTitle})
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Date</label>
                        <input 
                            type="date" 
                            required
                            value={form.shiftDate}
                            onChange={(e) => setForm({...form, shiftDate: e.target.value})}
                            className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary outline-none text-sm font-semibold"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Start</label>
                            <input 
                                type="time" 
                                required
                                value={form.startTime}
                                onChange={(e) => setForm({...form, startTime: e.target.value})}
                                className="w-full h-12 px-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary outline-none text-sm font-semibold"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">End</label>
                            <input 
                                type="time" 
                                required
                                value={form.endTime}
                                onChange={(e) => setForm({...form, endTime: e.target.value})}
                                className="w-full h-12 px-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary outline-none text-sm font-semibold"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit"
                        className="h-12 rounded-xl bg-primary text-white font-bold text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined !text-lg">add_circle</span>
                        Assign Shift
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden anim-fadeUp-d1">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Upcoming & Past Shifts</h2>
                        <p className="text-slate-500 text-sm mt-1">Track attendance and shift status.</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Date & Time</th>
                                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Employee</th>
                                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Attendance Log</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {schedules.map((schedule) => (
                                <tr key={schedule.scheduleId} className="hover:bg-slate-50/30 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="font-bold text-slate-800">{new Date(schedule.shiftDate).toLocaleDateString()}</div>
                                        <div className="text-xs text-slate-500 mt-1">{schedule.startTime.substring(0,5)} - {schedule.endTime.substring(0,5)}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="font-bold text-slate-700">{schedule.applicantName}</div>
                                        <div className="text-xs text-slate-400 mt-1">{schedule.jobTitle}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                            schedule.status === 'Completed' ? 'bg-green-50 text-green-600 border-green-100' :
                                            schedule.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                            schedule.status === 'Swap Requested' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                            'bg-slate-50 text-slate-600 border-slate-100'
                                        }`}>
                                            {schedule.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        {schedule.attendance ? (
                                            <div className="text-xs">
                                                <div className="text-emerald-600 font-bold">In: {new Date(schedule.attendance.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                {schedule.attendance.checkOutTime && (
                                                    <div className="text-rose-600 font-bold mt-1">Out: {new Date(schedule.attendance.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                )}
                                                {schedule.attendance.note && <div className="text-[10px] text-slate-400 italic mt-1">"{schedule.attendance.note}"</div>}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-300 font-medium italic">No logs yet</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {schedules.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-8 py-12 text-center text-slate-400 font-medium">
                                        No shifts scheduled yet. Assign one above.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EmployerSchedule;

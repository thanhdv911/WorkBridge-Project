import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const EmployerShifts = () => {
    const [branches, setBranches] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        branchId: '',
        title: 'Evening Shift',
        startTime: '',
        endTime: '',
        requiredRole: 'Staff',
        requiredPeople: 1
    });
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchAll();
    }, []);

    const authHeaders = { Authorization: `Bearer ${token}` };

    const fetchAll = async () => {
        try {
            const [branchRes, employeeRes, shiftRes] = await Promise.all([
                api.get('/branches', { headers: authHeaders }),
                api.get('/workforce/employees', { headers: authHeaders }),
                api.get('/workforce/shifts', { headers: authHeaders })
            ]);
            setBranches(branchRes.data);
            setEmployees(employeeRes.data);
            setShifts(shiftRes.data);
            if (!form.branchId && branchRes.data[0]) {
                setForm(prev => ({ ...prev, branchId: branchRes.data[0].branchId }));
            }
        } catch (error) {
            console.error('Error loading shifts:', error);
            toast.error('Could not load shift data.');
        } finally {
            setLoading(false);
        }
    };

    const createShift = async (e) => {
        e.preventDefault();
        if (!form.branchId || !form.startTime || !form.endTime) {
            toast.error('Branch, start time and end time are required.');
            return;
        }

        try {
            await api.post('/workforce/shifts', {
                ...form,
                branchId: Number(form.branchId),
                requiredPeople: Number(form.requiredPeople)
            }, { headers: authHeaders });
            toast.success('Shift created.');
            fetchAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not create shift.');
        }
    };

    const assignShift = async (shiftId, employmentId) => {
        if (!employmentId) return;
        try {
            await api.post(`/workforce/shifts/${shiftId}/assign`, {
                employmentId: Number(employmentId)
            }, { headers: authHeaders });
            toast.success('Employee assigned.');
            fetchAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not assign employee.');
        }
    };

    const approveAttendance = async (attendanceRecordId) => {
        if (!attendanceRecordId) return;
        try {
            await api.patch(`/workforce/attendance/${attendanceRecordId}/approve`, {}, { headers: authHeaders });
            toast.success('Attendance approved.');
            fetchAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not approve attendance.');
        }
    };

    const rejectAttendance = async (attendanceRecordId) => {
        const note = window.prompt('Reason for rejecting attendance:', 'Needs correction');
        if (note === null) return;
        try {
            await api.patch(`/workforce/attendance/${attendanceRecordId}/reject`, note, { headers: authHeaders });
            toast.success('Attendance rejected.');
            fetchAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not reject attendance.');
        }
    };

    const adjustAttendance = async (assignment) => {
        const currentIn = assignment.checkInAt ? new Date(assignment.checkInAt).toISOString().slice(0, 16) : '';
        const currentOut = assignment.checkOutAt ? new Date(assignment.checkOutAt).toISOString().slice(0, 16) : '';
        const checkInAt = window.prompt('Adjusted check-in time (YYYY-MM-DDTHH:mm):', currentIn);
        if (!checkInAt) return;
        const checkOutAt = window.prompt('Adjusted check-out time (YYYY-MM-DDTHH:mm):', currentOut);
        if (!checkOutAt) return;

        try {
            await api.patch(`/workforce/attendance/${assignment.attendanceRecordId}/adjust`, {
                checkInAt,
                checkOutAt,
                note: 'Adjusted by employer',
                markApproved: true
            }, { headers: authHeaders });
            toast.success('Attendance adjusted and approved.');
            fetchAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not adjust attendance.');
        }
    };

    const attendanceClass = (status) => {
        switch (status) {
            case 'CheckedIn': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'CheckedOut': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'Rejected': return 'bg-red-50 text-red-700 border-red-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    const formatDateTime = (value) => value ? new Date(value).toLocaleString() : '--';

    const formatMinutes = (minutes = 0) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours <= 0) return `${mins}m`;
        if (mins === 0) return `${hours}h`;
        return `${hours}h ${mins}m`;
    };

    const employeesForBranch = (branchId) => employees.filter(e => e.branchId === branchId);

    return (
        <div className="grid xl:grid-cols-[360px_minmax(0,1fr)] gap-6 min-w-0">
            <form onSubmit={createShift} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 sm:p-6 space-y-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Shifts</h2>
                    <p className="text-sm text-slate-500 mt-1">Create shifts and assign active employees.</p>
                </div>
                <select value={form.branchId} onChange={(e) => setForm(prev => ({ ...prev, branchId: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm">
                    <option value="">Select branch</option>
                    {branches.map(branch => <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>)}
                </select>
                <input value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" placeholder="Shift title" />
                <input type="datetime-local" value={form.startTime} onChange={(e) => setForm(prev => ({ ...prev, startTime: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" />
                <input type="datetime-local" value={form.endTime} onChange={(e) => setForm(prev => ({ ...prev, endTime: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" />
                <input value={form.requiredRole} onChange={(e) => setForm(prev => ({ ...prev, requiredRole: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" placeholder="Required role" />
                <input type="number" min="1" value={form.requiredPeople} onChange={(e) => setForm(prev => ({ ...prev, requiredPeople: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" />
                <button className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm">Create Shift</button>
            </form>

            <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden min-w-0">
                <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">Scheduled Shifts</h3>
                </div>
                {loading ? (
                    <div className="p-10 text-center text-slate-400">Loading shifts...</div>
                ) : shifts.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">No shifts yet.</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {shifts.map(shift => (
                            <div key={shift.workShiftId} className="px-5 sm:px-6 py-5 space-y-4">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-800 truncate">{shift.title}</p>
                                        <p className="text-sm text-slate-500 truncate">{shift.branchName}</p>
                                        <p className="text-xs text-slate-400">
                                            {new Date(shift.startTime).toLocaleString()} - {new Date(shift.endTime).toLocaleString()}
                                        </p>
                                    </div>
                                    <select
                                        onChange={(e) => assignShift(shift.workShiftId, e.target.value)}
                                        defaultValue=""
                                        className="h-10 px-3 rounded-xl border border-slate-200 text-sm"
                                    >
                                        <option value="">Assign employee</option>
                                        {employeesForBranch(shift.branchId).map(employee => (
                                            <option key={employee.employmentId} value={employee.employmentId}>{employee.employeeName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid md:grid-cols-2 gap-3">
                                    {shift.assignments?.length ? shift.assignments.map(assignment => {
                                        const attendanceStatus = assignment.attendanceStatus || 'NotStarted';

                                        return (
                                            <div key={assignment.shiftAssignmentId} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 min-w-0">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-800 truncate">{assignment.employeeName}</p>
                                                        <p className="text-xs text-slate-400 mt-1">Assignment: {assignment.status}</p>
                                                    </div>
                                                    <span className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${attendanceClass(attendanceStatus)}`}>
                                                        {attendanceStatus}
                                                    </span>
                                                </div>

                                                <div className="mt-3 grid gap-2 text-xs text-slate-500">
                                                    <span className="rounded-xl bg-white px-3 py-2 border border-slate-100">
                                                        In: <b className="text-slate-700">{formatDateTime(assignment.checkInAt)}</b>
                                                    </span>
                                                    <span className="rounded-xl bg-white px-3 py-2 border border-slate-100">
                                                        Out: <b className="text-slate-700">{formatDateTime(assignment.checkOutAt)}</b>
                                                    </span>
                                                    <span className="rounded-xl bg-white px-3 py-2 border border-slate-100">
                                                        Worked: <b className="text-slate-700">{formatMinutes(assignment.workedMinutes || 0)}</b>
                                                    </span>
                                                </div>

                                                {attendanceStatus === 'CheckedOut' && assignment.attendanceRecordId && (
                                                    <div className="mt-3 grid sm:grid-cols-3 gap-2">
                                                        <button
                                                            onClick={() => approveAttendance(assignment.attendanceRecordId)}
                                                            className="h-10 rounded-xl bg-emerald-500 text-white text-sm font-bold"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => adjustAttendance(assignment)}
                                                            className="h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 text-sm font-bold"
                                                        >
                                                            Adjust
                                                        </button>
                                                        <button
                                                            onClick={() => rejectAttendance(assignment.attendanceRecordId)}
                                                            className="h-10 rounded-xl bg-red-50 text-red-600 border border-red-100 text-sm font-bold"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }) : <span className="text-xs text-slate-400">No assignments yet.</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default EmployerShifts;

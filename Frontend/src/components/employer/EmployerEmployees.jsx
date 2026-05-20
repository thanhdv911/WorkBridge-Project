import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { signalRService } from '../../services/signalrService';

const EmployerEmployees = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchEmployees();

        const handleRefresh = () => fetchEmployees();
        signalRService.on('OfferStatusChanged', handleRefresh);
        signalRService.on('WorkforceChanged', handleRefresh);
        return () => {
            signalRService.off('OfferStatusChanged', handleRefresh);
            signalRService.off('WorkforceChanged', handleRefresh);
        };
    }, []);

    const fetchEmployees = async () => {
        try {
            const response = await api.get('/workforce/employees', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEmployees(response.data);
        } catch (error) {
            console.error('Error loading employees:', error);
            toast.error('Could not load employees.');
        } finally {
            setLoading(false);
        }
    };

    const openChat = (employee) => {
        navigate('/messages', {
            state: {
                contactId: employee.employeeUserId,
                contactName: employee.employeeName
            }
        });
    };

    const updateStatus = async (employee, status) => {
        try {
            await api.patch(`/workforce/employees/${employee.employmentId}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Employee marked ${status}.`);
            fetchEmployees();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not update employee status.');
        }
    };

    const updateRate = async (employee) => {
        const value = window.prompt('New hourly rate (VND/hour):', employee.currentHourlyRate);
        if (!value) return;
        const hourlyRate = Number(value);
        if (!hourlyRate || hourlyRate <= 0) {
            toast.error('Hourly rate must be greater than 0.');
            return;
        }

        try {
            await api.patch(`/workforce/employees/${employee.employmentId}/rate`, {
                hourlyRate,
                effectiveFrom: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Employee rate updated.');
            fetchEmployees();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not update employee rate.');
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p className="text-slate-500 mt-4 font-medium">Loading employees...</p>
            </div>
        );
    }

    return (
        <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden min-w-0">
            <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Employees</h2>
                <p className="text-slate-500 text-sm mt-1">
                    Employees are created only after an applicant accepts an official offer.
                </p>
            </div>

            {employees.length === 0 ? (
                <div className="p-10 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-slate-300">badge</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">No employees yet</h3>
                    <p className="text-slate-500 mt-1">Send an offer from Review Applicants. The applicant must accept it first.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {employees.map(employee => (
                        <div key={employee.employmentId} className="px-5 sm:px-6 py-5 grid lg:grid-cols-[minmax(0,1fr)_minmax(180px,240px)_auto] gap-4 lg:items-center">
                            <div className="min-w-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-primary flex items-center justify-center text-white font-black shrink-0">
                                        {employee.employeeName?.charAt(0) || 'E'}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-800 truncate">{employee.employeeName}</p>
                                        <p className="text-xs text-slate-400 truncate">{employee.employeeEmail}</p>
                                        <p className="text-xs text-slate-500 truncate mt-1">{employee.position}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-sm text-slate-600 min-w-0">
                                <p className="font-bold truncate">{employee.branchName}</p>
                                <p className="text-xs text-slate-400">
                                    {Number(employee.currentHourlyRate).toLocaleString()} VND/hour
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2 lg:justify-end">
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-100">
                                    {employee.status}
                                </span>
                                <button
                                    onClick={() => openChat(employee)}
                                    className="h-9 px-4 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                                >
                                    Chat
                                </button>
                                <button
                                    onClick={() => updateRate(employee)}
                                    className="h-9 px-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                                >
                                    Rate
                                </button>
                                {employee.status === 'Active' ? (
                                    <button
                                        onClick={() => updateStatus(employee, 'Inactive')}
                                        className="h-9 px-4 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors"
                                    >
                                        Deactivate
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => updateStatus(employee, 'Active')}
                                        className="h-9 px-4 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors"
                                    >
                                        Activate
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

export default EmployerEmployees;

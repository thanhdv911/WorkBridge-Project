import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { signalRService } from '../services/signalrService';

const Payslips = () => {
    const navigate = useNavigate();
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchPayslips();

        const handleWorkforceChanged = () => fetchPayslips();
        signalRService.on('WorkforceChanged', handleWorkforceChanged);
        return () => signalRService.off('WorkforceChanged', handleWorkforceChanged);
    }, [token, navigate]);

    const fetchPayslips = async () => {
        try {
            const response = await api.get('/workforce/my-payslips');
            setPeriods(response.data || []);
        } catch (error) {
            toast.error('Could not load payslips.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-bg-light">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="bg-bg-light min-h-screen pb-20 font-display overflow-x-hidden">
            <div className="bg-white border-b border-slate-200/60 pb-10 pt-8">
                <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Payslips</h1>
                    <p className="text-slate-500 mt-2">Locked and paid payroll periods from your employers.</p>
                </div>
            </div>

            <main className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10 mt-8">
                {periods.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-12 text-center text-slate-500">
                        No payslips yet. Payslips appear after employer locks payroll.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {periods.map(period => (
                            <div key={period.payrollPeriodId} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 sm:p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <p className="text-lg font-black text-slate-800">Payroll {period.month}/{period.year}</p>
                                        <p className="text-xs text-slate-400">Payday: {new Date(period.payday).toLocaleDateString()}</p>
                                    </div>
                                    <div className="sm:text-right">
                                        <p className="text-2xl font-black text-primary">{Number(period.totalSalary).toLocaleString()} VND</p>
                                        <p className="text-xs font-bold text-slate-400 uppercase">{period.status}</p>
                                    </div>
                                </div>

                                <div className="mt-4 grid gap-2">
                                    {period.items?.map(item => (
                                        <div key={item.payrollItemId} className="rounded-2xl bg-slate-50 border border-slate-100 p-4 grid sm:grid-cols-4 gap-3 text-sm">
                                            <span>
                                                <b className="block text-slate-800">Hours</b>
                                                <span className="text-slate-500">{(item.totalApprovedMinutes / 60).toFixed(2)}</span>
                                            </span>
                                            <span>
                                                <b className="block text-slate-800">Rate</b>
                                                <span className="text-slate-500">{Number(item.hourlyRateSnapshot).toLocaleString()} VND/h</span>
                                            </span>
                                            <span>
                                                <b className="block text-slate-800">Base</b>
                                                <span className="text-slate-500">{Number(item.baseSalary).toLocaleString()} VND</span>
                                            </span>
                                            <span>
                                                <b className="block text-slate-800">Final</b>
                                                <span className="text-slate-900 font-black">{Number(item.finalSalary).toLocaleString()} VND</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Payslips;

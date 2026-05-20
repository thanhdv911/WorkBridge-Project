import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { signalRService } from '../../services/signalrService';

const EmployerPayroll = () => {
    const now = new Date();
    const [periods, setPeriods] = useState([]);
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchPayroll();

        const handleWorkforceChanged = () => fetchPayroll();
        signalRService.on('WorkforceChanged', handleWorkforceChanged);
        return () => signalRService.off('WorkforceChanged', handleWorkforceChanged);
    }, []);

    const fetchPayroll = async () => {
        try {
            const response = await api.get('/workforce/payroll', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPeriods(response.data);
        } catch (error) {
            console.error('Error loading payroll:', error);
            toast.error('Could not load payroll.');
        } finally {
            setLoading(false);
        }
    };

    const generatePayroll = async () => {
        setGenerating(true);
        try {
            await api.post(`/workforce/payroll/generate?month=${month}&year=${year}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Payroll generated.');
            fetchPayroll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not generate payroll.');
        } finally {
            setGenerating(false);
        }
    };

    const lockPayroll = async (periodId) => {
        try {
            await api.patch(`/workforce/payroll/${periodId}/lock`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Payroll locked.');
            fetchPayroll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not lock payroll.');
        }
    };

    const markPaid = async (periodId) => {
        try {
            await api.patch(`/workforce/payroll/${periodId}/mark-paid`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Payroll marked paid.');
            fetchPayroll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not mark payroll paid.');
        }
    };

    const adjustItem = async (item) => {
        const bonus = Number(window.prompt('Bonus (VND):', item.bonus || 0));
        if (Number.isNaN(bonus) || bonus < 0) return toast.error('Invalid bonus.');
        const penalty = Number(window.prompt('Penalty (VND):', item.penalty || 0));
        if (Number.isNaN(penalty) || penalty < 0) return toast.error('Invalid penalty.');
        const deduction = Number(window.prompt('Deduction (VND):', item.deduction || 0));
        if (Number.isNaN(deduction) || deduction < 0) return toast.error('Invalid deduction.');

        try {
            await api.patch(`/workforce/payroll/items/${item.payrollItemId}/adjust`, { bonus, penalty, deduction }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Payroll item adjusted.');
            fetchPayroll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not adjust payroll item.');
        }
    };

    return (
        <div className="space-y-6 min-w-0">
            <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 sm:p-6">
                <h2 className="text-xl font-bold text-slate-800">Payroll</h2>
                <p className="text-sm text-slate-500 mt-1">Generate payroll from approved attendance. Payday defaults to day 5 of the next month.</p>
                <div className="mt-5 flex flex-col sm:flex-row gap-3">
                    <input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} className="h-11 px-4 rounded-xl border border-slate-200 text-sm" />
                    <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="h-11 px-4 rounded-xl border border-slate-200 text-sm" />
                    <button onClick={generatePayroll} disabled={generating} className="h-11 px-6 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-60">
                        {generating ? 'Generating...' : 'Generate Payroll'}
                    </button>
                </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">Payroll Periods</h3>
                </div>
                {loading ? (
                    <div className="p-10 text-center text-slate-400">Loading payroll...</div>
                ) : periods.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">No payroll periods yet.</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {periods.map(period => (
                            <div key={period.payrollPeriodId} className="px-5 sm:px-6 py-5">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div>
                                        <p className="font-bold text-slate-800">{period.month}/{period.year}</p>
                                        <p className="text-xs text-slate-400">Payday: {new Date(period.payday).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-primary">{Number(period.totalSalary).toLocaleString()} VND</p>
                                        <p className="text-xs text-slate-400">{period.status}</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {period.status === 'Draft' && (
                                        <button onClick={() => lockPayroll(period.payrollPeriodId)} className="h-9 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold">
                                            Lock Payroll
                                        </button>
                                    )}
                                    {period.status === 'Locked' && (
                                        <button onClick={() => markPaid(period.payrollPeriodId)} className="h-9 px-4 rounded-xl bg-emerald-500 text-white text-xs font-bold">
                                            Mark Paid
                                        </button>
                                    )}
                                </div>
                                {period.items?.length > 0 && (
                                    <div className="mt-4 grid gap-2">
                                        {period.items.map(item => (
                                            <div key={item.payrollItemId} className="rounded-xl bg-slate-50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                                                <span className="font-bold text-slate-700">{item.employeeName}</span>
                                                <span className="text-slate-500">{Math.round(item.totalApprovedMinutes / 60)}h</span>
                                                <span className="text-slate-500">+{Number(item.bonus).toLocaleString()} / -{(Number(item.penalty) + Number(item.deduction)).toLocaleString()}</span>
                                                <span className="font-bold text-slate-800">{Number(item.finalSalary).toLocaleString()} VND</span>
                                                {period.status === 'Draft' && (
                                                    <button onClick={() => adjustItem(item)} className="h-8 px-3 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600">
                                                        Adjust
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default EmployerPayroll;

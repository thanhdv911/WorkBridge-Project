import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { signalRService } from '../services/signalrService';
import Pagination from '../components/shared/Pagination';

const ITEMS_PER_PAGE = 5;

const translatePayrollStatus = (status) => {
    switch (status) {
        case 'Paid': return 'ĐÃ CHI TRẢ';
        case 'Locked': return 'ĐÃ CHỐT CÔNG';
        default: return status;
    }
};

const statusColor = (status) => {
    switch (status) {
        case 'Paid': return 'text-emerald-600';
        case 'Locked': return 'text-amber-600';
        default: return 'text-slate-400';
    }
};

const Payslips = () => {
    const navigate = useNavigate();
    const [periods, setPeriods] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
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

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(periods.length / ITEMS_PER_PAGE));
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [periods.length, currentPage]);

    const fetchPayslips = async () => {
        try {
            const response = await api.get('/workforce/my-payslips');
            setPeriods(response.data || []);
        } catch {
            toast.error('Không thể tải phiếu lương.');
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

    const paginatedPeriods = periods.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="bg-bg-light min-h-screen pb-20 font-display overflow-x-hidden">
            <div className="bg-white border-b border-slate-200/60 pb-10 pt-8">
                <div className="w-full mx-auto px-4 sm:px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Phiếu lương</h1>
                    <p className="text-slate-500 mt-2">Các kỳ lương đã khóa và thanh toán từ nhà tuyển dụng.</p>
                </div>
            </div>

            <main className="w-full mx-auto px-4 sm:px-4 sm:px-6 lg:px-8 mt-8">
                {periods.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-12 text-center text-slate-500">
                        Chưa có phiếu lương. Phiếu lương sẽ xuất hiện sau khi nhà tuyển dụng khóa bảng lương.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {paginatedPeriods.map(period => (
                            <div key={period.payrollPeriodId} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 sm:p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <p className="text-lg font-black text-slate-800">Kỳ lương {period.month}/{period.year}</p>
                                        <p className="text-xs text-slate-400">Ngày trả lương: {new Date(period.payday).toLocaleDateString('vi-VN')}</p>
                                    </div>
                                    <div className="sm:text-right">
                                        <p className="text-2xl font-black text-primary">{Number(period.totalSalary).toLocaleString()} VND</p>
                                        <p className={`text-xs font-bold uppercase ${statusColor(period.status)}`}>{translatePayrollStatus(period.status)}</p>
                                    </div>
                                </div>

                                <div className="mt-4 grid gap-2">
                                    {period.items?.map(item => (
                                        <div key={item.payrollItemId} className="rounded-2xl bg-slate-50 border border-slate-100 p-4 grid sm:grid-cols-4 gap-3 text-sm">
                                            <span>
                                                <b className="block text-slate-800">Số giờ</b>
                                                <span className="text-slate-500">{(item.totalApprovedMinutes / 60).toFixed(2)}</span>
                                            </span>
                                            <span>
                                                <b className="block text-slate-800">Mức lương</b>
                                                <span className="text-slate-500">{Number(item.hourlyRateSnapshot).toLocaleString()} VND/h</span>
                                            </span>
                                            <span>
                                                <b className="block text-slate-800">Lương cơ bản</b>
                                                <span className="text-slate-500">{Number(item.baseSalary).toLocaleString()} VND</span>
                                            </span>
                                            <span>
                                                <b className="block text-slate-800">Thực nhận</b>
                                                <span className="text-slate-900 font-black">{Number(item.finalSalary).toLocaleString()} VND</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <Pagination
                            currentPage={currentPage}
                            totalItems={periods.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={setCurrentPage}
                            label="phiếu lương"
                            className="rounded-2xl border border-slate-200/60 shadow-sm"
                        />
                    </div>
                )}
            </main>
        </div>
    );
};

export default Payslips;

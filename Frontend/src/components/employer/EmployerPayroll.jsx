import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { signalRService } from '../../services/signalrService';
import Pagination from '../shared/Pagination';

const PERIODS_PER_PAGE = 5;
const PAYROLL_ITEMS_PER_PAGE = 5;

const getPeriodStatusText = (status) => {
    switch (status) {
        case 'Draft': return 'Bản nháp';
        case 'Locked': return 'Đã chốt';
        case 'Paid': return 'Đã thanh toán';
        default: return status;
    }
};

const EmployerPayroll = () => {
    const now = new Date();
    const [periods, setPeriods] = useState([]);
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemPages, setItemPages] = useState({});
    const [isVip, setIsVip] = useState(false);
    const [checkingVip, setCheckingVip] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        const init = async () => {
            const vip = await checkVipStatus();
            if (vip) {
                await fetchPayroll();
            } else {
                setLoading(false);
            }
        };
        init();

        const handleWorkforceChanged = async () => {
            const vip = await checkVipStatus();
            if (vip) {
                fetchPayroll();
            }
        };
        signalRService.on('WorkforceChanged', handleWorkforceChanged);
        return () => signalRService.off('WorkforceChanged', handleWorkforceChanged);
    }, []);

    const checkVipStatus = async () => {
        try {
            const response = await api.get('/subscriptions/status');
            const vip = Boolean(response.data.isVip);
            setIsVip(vip);
            return vip;
        } catch (error) {
            console.error('Error checking VIP status:', error);
            setIsVip(false);
            return false;
        } finally {
            setCheckingVip(false);
        }
    };

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(periods.length / PERIODS_PER_PAGE));
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [periods.length, currentPage]);

    const fetchPayroll = async () => {
        try {
            const response = await api.get('/workforce/payroll', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPeriods(response.data);
        } catch (error) {
            console.error('Error loading payroll:', error);
            toast.error('Không thể tải bảng tính lương.');
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
            toast.success('Đã khởi tạo bảng lương thành công.');
            fetchPayroll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tạo bảng lương.');
        } finally {
            setGenerating(false);
        }
    };

    const lockPayroll = async (periodId) => {
        try {
            await api.patch(`/workforce/payroll/${periodId}/lock`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Đã chốt bảng lương.');
            fetchPayroll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể chốt bảng lương.');
        }
    };

    const markPaid = async (periodId) => {
        try {
            await api.patch(`/workforce/payroll/${periodId}/mark-paid`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Đã đánh dấu đã thanh toán lương.');
            fetchPayroll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể đánh dấu đã thanh toán.');
        }
    };

    const adjustItem = async (item) => {
        const bonus = Number(window.prompt('Tiền thưởng (VNĐ):', item.bonus || 0));
        if (Number.isNaN(bonus) || bonus < 0) return toast.error('Tiền thưởng không hợp lệ.');
        const penalty = Number(window.prompt('Tiền phạt (VNĐ):', item.penalty || 0));
        if (Number.isNaN(penalty) || penalty < 0) return toast.error('Tiền phạt/kỷ luật không hợp lệ.');
        const deduction = Number(window.prompt('Khoản khấu trừ khác (VNĐ):', item.deduction || 0));
        if (Number.isNaN(deduction) || deduction < 0) return toast.error('Khoản khấu trừ không hợp lệ.');

        try {
            await api.patch(`/workforce/payroll/items/${item.payrollItemId}/adjust`, { bonus, penalty, deduction }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Đã điều chỉnh mục lương thành công.');
            fetchPayroll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể điều chỉnh mục lương.');
        }
    };

    const paginatedPeriods = periods.slice(
        (currentPage - 1) * PERIODS_PER_PAGE,
        currentPage * PERIODS_PER_PAGE
    );

    if (checkingVip) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/60 p-12 text-center shadow-sm">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-slate-500 font-bold text-sm">Đang kiểm tra đặc quyền Doanh nghiệp...</p>
            </div>
        );
    }

    if (!isVip) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200/70 p-8 shadow-xl max-w-4xl mx-auto text-center relative overflow-hidden my-8">
                <div className="absolute w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(245,158,11,.08),transparent_70%)] -top-10 -right-10 rounded-full pointer-events-none blur-[50px]"></div>
                <div className="absolute w-[300px] h-[300px] bg-[radial-gradient(circle,rgba(19,146,236,.06),transparent_70%)] -bottom-10 -left-10 rounded-full pointer-events-none blur-[40px]"></div>

                <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined !text-4xl text-amber-500 animate-pulse">workspace_premium</span>
                </div>

                <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-3">Chức Năng Tính Lương VIP Doanh Nghiệp</h3>
                <p className="text-sm text-slate-500 max-w-xl mx-auto mb-8">
                    Khởi tạo bảng tính lương tự động, thống kê giờ công và thanh toán một chạm. Bạn cần đăng ký gói VIP Doanh nghiệp để mở khóa tính năng cao cấp này.
                </p>

                <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto text-left mb-8">
                    <div className="flex gap-2">
                        <span className="material-symbols-outlined text-amber-500 !text-lg">check_circle</span>
                        <span className="text-xs text-slate-600 font-bold">Tính lương & Quản lý bảng lương tự động</span>
                    </div>
                    <div className="flex gap-2">
                        <span className="material-symbols-outlined text-amber-500 !text-lg">check_circle</span>
                        <span className="text-xs text-slate-600 font-bold">Thuật toán AI tự động tính khấu trừ phạt đi muộn</span>
                    </div>
                    <div className="flex gap-2">
                        <span className="material-symbols-outlined text-amber-500 !text-lg">check_circle</span>
                        <span className="text-xs text-slate-600 font-bold">Tin tuyển dụng luôn ghim hàng đầu</span>
                    </div>
                    <div className="flex gap-2">
                        <span className="material-symbols-outlined text-amber-500 !text-lg">check_circle</span>
                        <span className="text-xs text-slate-600 font-bold">Huy hiệu VIP Doanh nghiệp sang trọng</span>
                    </div>
                </div>

                <button
                    onClick={() => {
                        const params = new URLSearchParams(window.location.search);
                        params.set('tab', 'vip');
                        window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }}
                    className="inline-flex items-center h-12 px-8 rounded-2xl text-sm font-black text-white bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 transition-all gap-2"
                >
                    <span className="material-symbols-outlined !text-lg">workspace_premium</span>
                    Mua VIP Doanh Nghiệp ngay
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 min-w-0">
            <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 sm:p-6">
                <h2 className="text-xl font-bold text-slate-800">Bảng tính lương</h2>
                <p className="text-sm text-slate-500 mt-1">Khởi tạo bảng lương từ danh sách giờ công đã duyệt. Ngày phát lương mặc định là ngày 5 của tháng tiếp theo.</p>
                <div className="mt-5 flex flex-col sm:flex-row gap-3">
                    <input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} className="h-11 px-4 rounded-xl border border-slate-200 text-sm" />
                    <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="h-11 px-4 rounded-xl border border-slate-200 text-sm" />
                    <button onClick={generatePayroll} disabled={generating} className="h-11 px-6 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-60">
                        {generating ? 'Đang tính lương...' : 'Khởi tạo bảng lương'}
                    </button>
                </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">Các kỳ tính lương</h3>
                </div>
                {loading ? (
                    <div className="p-10 text-center text-slate-400">Đang tải bảng tính lương...</div>
                ) : periods.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">Chưa có kỳ tính lương nào.</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {paginatedPeriods.map(period => {
                            const itemPage = itemPages[period.payrollPeriodId] || 1;
                            const paginatedItems = (period.items || []).slice(
                                (itemPage - 1) * PAYROLL_ITEMS_PER_PAGE,
                                itemPage * PAYROLL_ITEMS_PER_PAGE
                            );

                            return (
                            <div key={period.payrollPeriodId} className="px-5 sm:px-6 py-5">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div>
                                        <p className="font-bold text-slate-800">Tháng {period.month}/{period.year}</p>
                                        <p className="text-xs text-slate-400">Ngày phát lương: {new Date(period.payday).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-primary">{Number(period.totalSalary).toLocaleString()} VNĐ</p>
                                        <p className="text-xs text-slate-400">{getPeriodStatusText(period.status)}</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {period.status === 'Draft' && (
                                        <button onClick={() => lockPayroll(period.payrollPeriodId)} className="h-9 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold">
                                            Chốt bảng lương
                                        </button>
                                    )}
                                    {period.status === 'Locked' && (
                                        <button onClick={() => markPaid(period.payrollPeriodId)} className="h-9 px-4 rounded-xl bg-emerald-500 text-white text-xs font-bold">
                                            Đã trả lương
                                        </button>
                                    )}
                                </div>
                                {period.items?.length > 0 && (
                                    <div className="mt-4 grid gap-2">
                                        {paginatedItems.map(item => (
                                            <div key={item.payrollItemId} className="rounded-xl bg-slate-50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                                                <span className="font-bold text-slate-700">{item.employeeName}</span>
                                                <span className="text-slate-500">{Math.round(item.totalApprovedMinutes / 60)} giờ làm</span>
                                                <span className="text-slate-500">Thưởng: +{Number(item.bonus).toLocaleString()}đ / Phạt: -{(Number(item.penalty) + Number(item.deduction)).toLocaleString()}đ</span>
                                                <span className="font-bold text-slate-800">{Number(item.finalSalary).toLocaleString()} VNĐ</span>
                                                {period.status === 'Draft' && (
                                                    <button onClick={() => adjustItem(item)} className="h-8 px-3 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600">
                                                        Điều chỉnh
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <Pagination
                                            currentPage={itemPage}
                                            totalItems={period.items.length}
                                            itemsPerPage={PAYROLL_ITEMS_PER_PAGE}
                                            onPageChange={(page) => setItemPages(prev => ({
                                                ...prev,
                                                [period.payrollPeriodId]: page
                                            }))}
                                            label="nhân viên"
                                            className="rounded-xl border border-slate-200/70 bg-white px-3 py-3 sm:px-4"
                                        />
                                    </div>
                                )}
                            </div>
                            );
                        })}
                        <Pagination
                            currentPage={currentPage}
                            totalItems={periods.length}
                            itemsPerPage={PERIODS_PER_PAGE}
                            onPageChange={setCurrentPage}
                            label="kỳ tính lương"
                        />
                    </div>
                )}
            </section>
        </div>
    );
};

export default EmployerPayroll;

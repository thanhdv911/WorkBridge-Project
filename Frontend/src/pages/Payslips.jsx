import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { signalRService } from '../services/signalrService';
import Pagination from '../components/shared/Pagination';

const ITEMS_PER_PAGE = 5;

const translatePayrollStatus = (status) => {
  switch (status) {
    case 'Paid': return 'Đã chi trả';
    case 'Locked': return 'Đã chốt công';
    default: return status;
  }
};

const statusColor = (status) => {
  switch (status) {
    case 'Paid': return 'text-emerald-600';
    case 'Locked': return 'text-amber-600';
    default: return 'text-slate-800';
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
      <div className="applicant-shell flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  const paginatedPeriods = periods.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="applicant-shell min-h-screen overflow-x-hidden pb-20 font-display">
      <section className="applicant-page-hero">
        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <span className="applicant-eyebrow">
            <span className="material-symbols-outlined !text-[15px]">receipt_long</span>
            Thu nhập cá nhân
          </span>
          <h1 className="mt-4 text-3xl font-black text-white lg:text-4xl">Phiếu lương</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-sky-100">
            Xem các kỳ lương đã chốt, mức lương theo giờ và số tiền thực nhận từ nhà tuyển dụng.
          </p>
        </div>
      </section>

      <main className="applicant-page-content mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {periods.length === 0 ? (
          <div className="applicant-empty-card p-12 text-center sm:p-20">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-sky-50 text-primary">
              <span className="material-symbols-outlined !text-4xl">receipt_long</span>
            </div>
            <h2 className="text-xl font-black text-slate-800">Chưa có phiếu lương</h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-700">
              Phiếu lương sẽ xuất hiện sau khi nhà tuyển dụng khóa bảng lương cho kỳ làm việc của bạn.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {paginatedPeriods.map((period) => (
              <div key={period.payrollPeriodId} className="applicant-card p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-lg font-black text-slate-900">Kỳ lương {period.month}/{period.year}</p>
                    <p className="mt-1 text-xs font-bold text-slate-800">
                      Ngày trả lương: {new Date(period.payday).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-2xl font-black text-primary">{Number(period.totalSalary).toLocaleString('vi-VN')} đ</p>
                    <p className={`text-xs font-black uppercase ${statusColor(period.status)}`}>{translatePayrollStatus(period.status)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  {period.items?.map((item) => (
                    <div key={item.payrollItemId} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm sm:grid-cols-4">
                      <span>
                        <b className="block text-slate-800">Số giờ</b>
                        <span className="text-slate-700">{(item.totalApprovedMinutes / 60).toFixed(2)}</span>
                      </span>
                      <span>
                        <b className="block text-slate-800">Mức lương</b>
                        <span className="text-slate-700">{Number(item.hourlyRateSnapshot).toLocaleString('vi-VN')} đ/giờ</span>
                      </span>
                      <span>
                        <b className="block text-slate-800">Lương cơ bản</b>
                        <span className="text-slate-700">{Number(item.baseSalary).toLocaleString('vi-VN')} đ</span>
                      </span>
                      <span>
                        <b className="block text-slate-800">Thực nhận</b>
                        <span className="font-black text-slate-900">{Number(item.finalSalary).toLocaleString('vi-VN')} đ</span>
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

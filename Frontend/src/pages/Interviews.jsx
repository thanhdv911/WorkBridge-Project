import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { signalRService } from '../services/signalrService';
import Pagination from '../components/shared/Pagination';

const ITEMS_PER_PAGE = 5;

const statusClass = (status) => {
  switch (status) {
    case 'Confirmed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'ChangeRequested': return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'Declined': return 'bg-red-50 text-red-700 border-red-100';
    case 'Completed': return 'bg-slate-100 text-slate-700 border-slate-200';
    default: return 'bg-blue-50 text-blue-700 border-blue-100';
  }
};

const translateStatus = (status) => {
  switch (status) {
    case 'Scheduled': return 'Đang chờ';
    case 'Confirmed': return 'Đã xác nhận';
    case 'ChangeRequested': return 'Yêu cầu đổi lịch';
    case 'Declined': return 'Từ chối';
    case 'Completed': return 'Hoàn thành';
    default: return status;
  }
};

const translateResult = (result) => {
  switch (result) {
    case 'Passed': return 'Đạt';
    case 'Failed': return 'Không đạt';
    default: return result;
  }
};

const Interviews = () => {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    fetchInterviews();

    const onInterviewChanged = () => fetchInterviews();
    signalRService.on('InterviewStatusChanged', onInterviewChanged);
    return () => signalRService.off('InterviewStatusChanged', onInterviewChanged);
  }, [token, navigate]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(interviews.length / ITEMS_PER_PAGE));
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [interviews.length, currentPage]);

  const fetchInterviews = async () => {
    try {
      const response = await api.get('/interviews/my');
      setInterviews(response.data || []);
    } catch {
      toast.error('Không thể tải lịch phỏng vấn.');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (interviewId, status) => {
    try {
      await api.patch(`/interviews/${interviewId}/status`, { status });
      toast.success('Đã cập nhật trạng thái phỏng vấn.');
      fetchInterviews();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật phỏng vấn.');
    }
  };

  if (loading) {
    return (
      <div className="applicant-shell flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  const paginatedInterviews = interviews.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="applicant-shell min-h-screen overflow-x-hidden pb-20 font-display">
      <section className="applicant-page-hero">
        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <span className="applicant-eyebrow">
            <span className="material-symbols-outlined !text-[15px]">event_available</span>
            Lịch hẹn tuyển dụng
          </span>
          <h1 className="mt-4 text-3xl font-black text-white lg:text-4xl">Phỏng vấn</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-sky-100">
            Xác nhận lịch hẹn, xem địa điểm và theo dõi kết quả phỏng vấn từ nhà tuyển dụng.
          </p>
        </div>
      </section>

      <main className="applicant-page-content mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {interviews.length === 0 ? (
          <div className="applicant-empty-card p-12 text-center sm:p-20">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-sky-50 text-primary">
              <span className="material-symbols-outlined !text-4xl">event_available</span>
            </div>
            <h2 className="text-xl font-black text-slate-800">Chưa có lịch phỏng vấn</h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-700">
              Khi nhà tuyển dụng gửi lịch phỏng vấn, bạn có thể xác nhận hoặc từ chối ngay tại đây.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {paginatedInterviews.map((interview) => (
              <div key={interview.interviewId} className="applicant-card grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${statusClass(interview.status)}`}>
                      {translateStatus(interview.status)}
                    </span>
                    {interview.result && (
                      <span className="rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase text-slate-800">
                        {translateResult(interview.result)}
                      </span>
                    )}
                  </div>

                  <h2 className="truncate text-lg font-black text-slate-900">{interview.jobTitle}</h2>
                  <p className="truncate text-sm font-semibold text-slate-700">{interview.companyName}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-800">
                    <span className="material-symbols-outlined !text-[17px] text-primary">schedule</span>
                    {new Date(interview.scheduledAt).toLocaleString('vi-VN')}
                    <span className="text-slate-300">•</span>
                    <span>{interview.location}</span>
                  </p>
                  {interview.note && (
                    <p className="mt-2 break-words rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                      {interview.note}
                    </p>
                  )}
                </div>

                {interview.status === 'Scheduled' && (
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button
                      onClick={() => updateStatus(interview.interviewId, 'Confirmed')}
                      className="h-10 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-white transition hover:bg-emerald-600"
                    >
                      Chấp nhận
                    </button>
                    <button
                      onClick={() => updateStatus(interview.interviewId, 'Declined')}
                      className="h-10 rounded-xl border border-red-100 bg-red-50 px-4 text-sm font-bold text-red-600 transition hover:bg-red-100"
                    >
                      Từ chối
                    </button>
                  </div>
                )}
              </div>
            ))}

            <Pagination
              currentPage={currentPage}
              totalItems={interviews.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
              label="phỏng vấn"
              className="rounded-2xl border border-slate-200/60 shadow-sm"
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default Interviews;

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { signalRService } from '../services/signalrService';
import ReviewModal from '../components/shared/ReviewModal';
import Pagination from '../components/shared/Pagination';

const ITEMS_PER_PAGE = 5;

const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedForReview, setSelectedForReview] = useState(null);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setLoading(false);
      navigate('/login');
      return;
    }

    fetchApplications();

    const handleApplicationChanged = () => fetchApplications();
    signalRService.on('ApplicationChanged', handleApplicationChanged);
    signalRService.on('OfferStatusChanged', handleApplicationChanged);
    signalRService.on('InterviewStatusChanged', handleApplicationChanged);

    return () => {
      signalRService.off('ApplicationChanged', handleApplicationChanged);
      signalRService.off('OfferStatusChanged', handleApplicationChanged);
      signalRService.off('InterviewStatusChanged', handleApplicationChanged);
    };
  }, [token, navigate]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(applications.length / ITEMS_PER_PAGE));
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [applications.length, currentPage]);

  const fetchApplications = async () => {
    try {
      const response = await api.get('/application/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplications(response.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Không thể tải đơn ứng tuyển.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (app) => {
    setSelectedForReview({
      revieweeId: app.employerId,
      revieweeName: app.companyName,
      jobPostId: app.jobPostId,
      jobTitle: app.jobTitle
    });
    setShowReviewModal(true);
  };

  const translateStatus = (status) => {
    switch (status) {
      case 'Pending': return 'Đang chờ';
      case 'Applied': return 'Đã ứng tuyển';
      case 'Under Review': return 'Đang xét duyệt';
      case 'Interview Scheduled': return 'Đã hẹn phỏng vấn';
      case 'Accepted': return 'Đã chấp nhận';
      case 'Offered': return 'Nhận lời mời';
      case 'Hired': return 'Đã tuyển dụng';
      case 'Rejected': return 'Bị từ chối';
      case 'Ended': return 'Đã kết thúc';
      default: return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
      case 'Applied': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
      case 'Under Review': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Interview Scheduled': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'Accepted': return 'bg-green-50 text-green-600 border-green-100';
      case 'Offered': return 'bg-violet-50 text-violet-600 border-violet-100';
      case 'Hired': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Rejected': return 'bg-red-50 text-red-600 border-red-100';
      case 'Ended': return 'bg-slate-100 text-slate-500 border-slate-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  if (loading) {
    return (
      <div className="applicant-shell flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  const paginatedApplications = applications.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="applicant-shell min-h-screen pb-20 font-display">
      <section className="applicant-page-hero">
        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <span className="applicant-eyebrow">
            <span className="material-symbols-outlined !text-[15px]">description</span>
            Không gian ứng viên
          </span>
          <h1 className="mt-4 text-3xl font-black text-white lg:text-4xl">Đơn ứng tuyển</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-sky-100">
            Theo dõi tiến độ, nhắn tin với nhà tuyển dụng và xem các bước tiếp theo của từng đơn.
          </p>
        </div>
      </section>

      <main className="applicant-page-content mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {applications.length === 0 ? (
          <div className="applicant-empty-card animate-fadeInUp p-12 text-center sm:p-20">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-sky-50 text-primary">
              <span className="material-symbols-outlined !text-4xl">folder_open</span>
            </div>
            <h2 className="text-xl font-black text-slate-800">Chưa có đơn ứng tuyển</h2>
            <p className="mx-auto mb-8 mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-500">
              Bạn chưa ứng tuyển việc nào. Hãy bắt đầu tìm cơ hội phù hợp ngay hôm nay.
            </p>
            <Link
              to="/jobs"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-8 font-bold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-dk hover:shadow-primary/40"
            >
              <span className="material-symbols-outlined !text-lg">search</span>
              Tìm việc
            </Link>
          </div>
        ) : (
          <div className="grid animate-fadeInUp gap-4">
            <div className="applicant-table-head mb-2 hidden grid-cols-[1fr_200px_160px_120px_120px] rounded-2xl px-8 py-4 text-xs font-bold uppercase text-slate-500 md:grid">
              <div>Việc làm</div>
              <div>Công ty</div>
              <div>Ngày ứng tuyển</div>
              <div className="text-center">Trạng thái</div>
              <div className="text-right">Thao tác</div>
            </div>

            {paginatedApplications.map((app) => (
              <div
                key={app.applicationId}
                className="applicant-card flex flex-col gap-4 p-6 transition-all md:grid md:grid-cols-[1fr_200px_160px_120px_120px] md:items-center md:p-8"
              >
                <div className="min-w-0">
                  <Link to={`/jobs/${app.jobPostId}`} className="block truncate text-lg font-black leading-tight text-slate-900 transition-colors hover:text-primary">
                    {app.jobTitle}
                  </Link>
                  <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-400">
                    <span className="material-symbols-outlined !text-[16px]">location_on</span>
                    <span className="truncate">{app.location || 'Chưa cập nhật địa điểm'}</span>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-600">
                  <span className="text-xs font-black uppercase text-slate-400 md:hidden">Công ty:</span>
                  <span className="truncate">{app.companyName}</span>
                </div>

                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <span className="text-xs font-black uppercase text-slate-400 md:hidden">Ngày:</span>
                  {new Date(app.appliedAt).toLocaleDateString('vi-VN')}
                </div>

                <div className="flex md:justify-center">
                  <span className={`rounded-full border px-4 py-1.5 text-xs font-bold ${getStatusColor(app.status)}`}>
                    {translateStatus(app.status)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 md:justify-end">
                  {(app.status === 'Accepted' || app.status === 'Hired' || app.canMessage) ? (
                    <button
                      onClick={() => navigate('/messages', {
                        state: {
                          contactId: app.employerId,
                          contactName: app.companyName
                        }
                      })}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all hover:bg-primary hover:text-white"
                      title="Nhắn tin với nhà tuyển dụng"
                    >
                      <span className="material-symbols-outlined">forum</span>
                    </button>
                  ) : (
                    <button disabled className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-xl bg-slate-50 text-slate-200">
                      <span className="material-symbols-outlined">forum</span>
                    </button>
                  )}

                  {(app.status === 'Accepted' || app.status === 'Hired') && (
                    <button
                      onClick={() => handleOpenReview(app)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500 transition-all hover:bg-amber-100"
                      title="Đánh giá nhà tuyển dụng"
                    >
                      <span className="material-symbols-outlined filled">star</span>
                    </button>
                  )}

                  {app.status === 'Offered' && (
                    <button
                      onClick={() => navigate('/offers')}
                      className="flex h-10 items-center justify-center rounded-xl bg-violet-50 px-4 text-xs font-bold text-violet-600 transition-all hover:bg-violet-100"
                      title="Xem lời mời"
                    >
                      Lời mời
                    </button>
                  )}

                  {app.isActiveEmployee && (
                    <button
                      onClick={() => navigate('/my-work')}
                      className="flex h-10 items-center justify-center rounded-xl bg-emerald-50 px-4 text-xs font-bold text-emerald-600 transition-all hover:bg-emerald-100"
                      title="Xem công việc"
                    >
                      Làm việc
                    </button>
                  )}

                  {app.canReapply && (
                    <button
                      onClick={() => navigate(`/jobs/${app.jobPostId}`)}
                      className="flex h-10 items-center justify-center rounded-xl bg-primary/10 px-4 text-xs font-bold text-primary transition-all hover:bg-primary hover:text-white"
                      title="Ứng tuyển lại"
                    >
                      Ứng tuyển lại
                    </button>
                  )}
                </div>
              </div>
            ))}

            <Pagination
              currentPage={currentPage}
              totalItems={applications.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
              label="đơn ứng tuyển"
              className="rounded-2xl border border-slate-200/60 shadow-sm"
            />
          </div>
        )}
      </main>

      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        {...selectedForReview}
      />
    </div>
  );
};

export default MyApplications;

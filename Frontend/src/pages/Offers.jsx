import React, { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { signalRService } from '../services/signalrService';
import Pagination from '../components/shared/Pagination';

const ITEMS_PER_PAGE = 5;

const Offers = () => {
  const [offers, setOffers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [acceptedTerms, setAcceptedTerms] = useState({});
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setLoading(false);
      navigate('/login');
      return;
    }

    fetchOffers();

    const onOfferChanged = () => fetchOffers();
    signalRService.on('OfferStatusChanged', onOfferChanged);
    return () => signalRService.off('OfferStatusChanged', onOfferChanged);
  }, [token, navigate]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(offers.length / ITEMS_PER_PAGE));
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [offers.length, currentPage]);

  const fetchOffers = async () => {
    try {
      const response = await api.get('/offers/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOffers(response.data);
    } catch (error) {
      console.error('Error loading offers:', error);
      toast.error('Không thể tải lời mời.');
    } finally {
      setLoading(false);
    }
  };

  const acceptOffer = async (offerId) => {
    setProcessingId(offerId);
    try {
      await api.patch(`/offers/${offerId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Đã chấp nhận lời mời. Bạn đã là nhân viên.');
      navigate('/my-work');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể chấp nhận lời mời.');
    } finally {
      setProcessingId(null);
    }
  };

  const declineOffer = async (offerId) => {
    setProcessingId(offerId);
    try {
      await api.patch(`/offers/${offerId}/decline`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Đã từ chối lời mời.');
      fetchOffers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể từ chối lời mời.');
    } finally {
      setProcessingId(null);
    }
  };

  const translateStatus = (status) => {
    switch (status) {
      case 'Sent': return 'Đang chờ duyệt';
      case 'Accepted': return 'Đã chấp nhận';
      case 'Declined': return 'Đã từ chối';
      default: return status;
    }
  };

  const statusClass = (status) => {
    switch (status) {
      case 'Accepted': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Declined': return 'bg-red-50 text-red-700 border-red-100';
      case 'Sent': return 'bg-blue-50 text-blue-700 border-blue-100';
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

  const paginatedOffers = offers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="applicant-shell min-h-screen pb-20 font-display">
      <section className="applicant-page-hero">
        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <span className="applicant-eyebrow">
            <span className="material-symbols-outlined !text-[15px]">contract</span>
            Quyết định nhận việc
          </span>
          <h1 className="mt-4 text-3xl font-black text-white lg:text-4xl">Lời mời nhận việc</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-sky-100">
            Xem điều kiện nhận việc, xác nhận lời mời và chuyển sang không gian làm việc khi sẵn sàng.
          </p>
        </div>
      </section>

      <main className="applicant-page-content mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {offers.length === 0 ? (
          <div className="applicant-empty-card p-12 text-center sm:p-20">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-sky-50 text-primary">
              <span className="material-symbols-outlined !text-4xl">contract</span>
            </div>
            <h2 className="text-xl font-black text-slate-800">Chưa có lời mời</h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-500">
              Khi nhà tuyển dụng gửi lời mời nhận việc, thông tin sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {paginatedOffers.map((offer) => (
              <div key={offer.offerId} className="applicant-card grid gap-5 p-6 md:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${statusClass(offer.status)}`}>
                      {translateStatus(offer.status)}
                    </span>
                    <span className="text-xs font-bold text-slate-400">Ngày trả lương: ngày {offer.paydayOfMonth}</span>
                  </div>

                  <h2 className="truncate text-xl font-black text-slate-900">{offer.position}</h2>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-500">{offer.companyName} - {offer.branchName}</p>
                  <p className="truncate text-sm font-medium text-slate-500">{offer.jobTitle}</p>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <span className="rounded-xl bg-primary/10 px-3 py-2 font-black text-primary">
                      {Number(offer.hourlyRate).toLocaleString('vi-VN')} đ/giờ
                    </span>
                    <span className="rounded-xl bg-slate-100 px-3 py-2 font-bold text-slate-600">
                      Bắt đầu {new Date(offer.startDate).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  {offer.status === 'Sent' && (
                    <div className="mt-5 space-y-2 rounded-2xl border border-amber-100/70 bg-amber-50/70 p-4 text-xs leading-relaxed text-slate-600 shadow-sm">
                      <div className="mb-1 flex items-center gap-1.5 font-black text-amber-900">
                        <span className="material-symbols-outlined !text-[18px]">info</span>
                        Cam kết nhận việc
                      </div>
                      <p>
                        <strong>Bản chất lời mời:</strong> Đây là lời mời nhận việc trên hệ thống, không phải hợp đồng lao động chính thức. Nếu doanh nghiệp yêu cầu, hợp đồng giấy sẽ được ký trực tiếp bên ngoài.
                      </p>
                      <p>
                        <strong>Quy định nghỉ việc:</strong> Khi đã nhận việc, bạn cần thông báo trước cho quản lý hoặc nhà tuyển dụng ít nhất 15 ngày để họ kịp sắp xếp nhân sự và bàn giao ca.
                      </p>
                      <label className="mt-3 flex cursor-pointer select-none items-start gap-2.5 border-t border-amber-200/50 pt-3 text-[12px] font-bold text-slate-700 transition-colors hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={!!acceptedTerms[offer.offerId]}
                          onChange={(e) => setAcceptedTerms((prev) => ({ ...prev, [offer.offerId]: e.target.checked }))}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span>Tôi đã đọc, hiểu rõ và cam kết tuân thủ quy chế nhận việc, bao gồm nghĩa vụ báo trước ít nhất 15 ngày khi xin nghỉ việc.</span>
                      </label>
                    </div>
                  )}
                </div>

                {offer.status === 'Sent' && (
                  <div className="flex flex-wrap gap-2 lg:justify-end lg:self-end">
                    <button
                      disabled={!acceptedTerms[offer.offerId] || processingId === offer.offerId}
                      onClick={() => acceptOffer(offer.offerId)}
                      className="h-11 rounded-xl bg-emerald-500 px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Chấp nhận
                    </button>
                    <button
                      disabled={processingId === offer.offerId}
                      onClick={() => declineOffer(offer.offerId)}
                      className="h-11 rounded-xl border border-red-100 bg-red-50 px-6 text-sm font-bold text-red-500 transition-colors hover:bg-red-100 disabled:opacity-60"
                    >
                      Từ chối
                    </button>
                  </div>
                )}
              </div>
            ))}

            <Pagination
              currentPage={currentPage}
              totalItems={offers.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
              label="lời mời"
              className="rounded-2xl border border-slate-200/60 shadow-sm"
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default Offers;

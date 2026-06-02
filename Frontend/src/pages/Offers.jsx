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
        fetchOffers();

        // Real-time: offer status changed (new offer from employer, or accepted/declined)
        const onOfferChanged = () => fetchOffers();
        signalRService.on('OfferStatusChanged', onOfferChanged);
        return () => signalRService.off('OfferStatusChanged', onOfferChanged);
    }, []);

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
            <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-bg-light">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    const paginatedOffers = offers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="bg-bg-light min-h-screen pb-20 font-display">
            <div className="bg-white border-b border-slate-200/60 pb-10 pt-8">
                <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Lời mời nhận việc</h1>
                    <p className="text-slate-500 mt-2">Chấp nhận lời mời để trở thành nhân viên và truy cập ca làm việc/bảng lương.</p>
                </div>
            </div>

            <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 mt-10">
                {offers.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-14 text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-slate-300">contract</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-700">Chưa có lời mời</h2>
                        <p className="text-slate-500 mt-2">Khi nhà tuyển dụng gửi lời mời, nó sẽ xuất hiện ở đây.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {paginatedOffers.map(offer => (
                            <div key={offer.offerId} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 md:p-8 grid lg:grid-cols-[minmax(0,1fr)_auto] gap-5 lg:items-center">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusClass(offer.status)}`}>
                                            {translateStatus(offer.status)}
                                        </span>
                                        <span className="text-xs text-slate-400">Ngày trả lương: ngày {offer.paydayOfMonth}</span>
                                    </div>
                                    <h2 className="text-xl font-black text-slate-800 truncate">{offer.position}</h2>
                                    <p className="text-sm text-slate-500 mt-1 truncate">{offer.companyName} - {offer.branchName}</p>
                                    <p className="text-sm text-slate-500 truncate">{offer.jobTitle}</p>
                                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                                        <span className="px-3 py-2 rounded-xl bg-primary/10 text-primary font-bold">
                                            {Number(offer.hourlyRate).toLocaleString()} VND/giờ
                                        </span>
                                        <span className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold">
                                            Bắt đầu {new Date(offer.startDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {offer.status === 'Sent' && (
                                        <div className="mt-5 p-4 rounded-2xl bg-amber-50/60 border border-amber-100/70 text-xs text-amber-800 space-y-2 leading-relaxed shadow-sm">
                                            <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-0.5">
                                                <span className="material-symbols-outlined !text-[18px]">info</span>
                                                Bản Cam Kết & Quy Chế Nhận Việc
                                            </div>
                                            <p className="text-slate-600">• <strong>Bản chất lời mời:</strong> Đây là Lời mời nhận việc trên hệ thống, không phải hợp đồng lao động chính thức. Hợp đồng sẽ được ký kết trực tiếp bằng giấy bên ngoài nếu doanh nghiệp/quán yêu cầu (hầu hết các công việc bán thời gian - part-time sẽ không ký hợp đồng).</p>
                                            <p className="text-slate-600">• <strong>Quy định thôi việc:</strong> Theo quy chế của hệ thống, khi đã nhận việc, nếu bạn có nguyện vọng nghỉ việc thì <strong>bắt buộc phải thông báo trước cho Quản lý/Nhà tuyển dụng ít nhất 15 ngày (nửa tháng)</strong> để họ kịp thời sắp xếp nhân sự bàn giao ca.</p>
                                            <label className="flex items-start gap-2.5 mt-3 pt-3 border-t border-amber-200/50 cursor-pointer font-bold text-slate-700 select-none text-[12px] hover:text-slate-900 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={!!acceptedTerms[offer.offerId]}
                                                    onChange={(e) => setAcceptedTerms(prev => ({ ...prev, [offer.offerId]: e.target.checked }))}
                                                    className="mt-0.5 rounded text-primary focus:ring-primary w-4 h-4 border-slate-300"
                                                />
                                                <span>Tôi đã đọc, hiểu rõ và cam kết tuân thủ quy chế nhận việc, bao gồm nghĩa vụ báo trước ít nhất 15 ngày khi xin nghỉ việc.</span>
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {offer.status === 'Sent' && (
                                    <div className="flex gap-2 lg:justify-end lg:self-end">
                                        <button
                                            disabled={!acceptedTerms[offer.offerId] || processingId === offer.offerId}
                                            onClick={() => acceptOffer(offer.offerId)}
                                            className="h-11 px-6 rounded-xl bg-emerald-500 text-white font-bold text-sm disabled:opacity-50 hover:bg-emerald-600 transition-colors shadow-sm disabled:cursor-not-allowed"
                                        >
                                            Chấp nhận
                                        </button>
                                        <button
                                            disabled={processingId === offer.offerId}
                                            onClick={() => declineOffer(offer.offerId)}
                                            className="h-11 px-6 rounded-xl bg-red-50 text-red-500 font-bold text-sm border border-red-100 disabled:opacity-60 hover:bg-red-100 transition-colors"
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

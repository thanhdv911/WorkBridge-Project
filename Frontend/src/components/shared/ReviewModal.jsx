import React, { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ReviewModal = ({ isOpen, onClose, revieweeId, revieweeName, jobPostId, jobTitle, onSuccess }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/review', {
        revieweeId,
        jobPostId,
        rating,
        comment
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Đã gửi đánh giá thành công!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể gửi đánh giá. Vui lòng kiểm tra nội dung và thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-[28rem] overflow-hidden rounded-[24px] bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-500">
              <span className="material-symbols-outlined !text-[22px]">reviews</span>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Đánh giá</h3>
              <p className="text-[13px] font-semibold text-slate-500">Chia sẻ trải nghiệm của bạn</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="absolute right-4 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined !text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="space-y-6 p-6">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <p className="text-[13px] font-medium text-slate-600">Đánh giá cho:</p>
              <p className="font-bold text-slate-900 mb-1">{jobTitle}</p>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60">
                <span className="text-[13px] font-medium text-slate-600">Đối tượng:</span>
                <span className="inline-flex rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-black text-primary">
                  {revieweeName}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[13px] font-bold text-slate-700 text-center">Mức độ hài lòng của bạn?</label>
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${
                      rating >= star 
                        ? 'bg-amber-100 text-amber-500 shadow-inner shadow-amber-200/50' 
                        : 'bg-slate-50 text-slate-300 hover:bg-amber-50 hover:text-amber-300'
                    }`}
                  >
                    <span className={`material-symbols-outlined !text-[28px] transition-transform duration-300 ${
                      rating >= star ? 'filled scale-110' : 'group-hover:scale-110'
                    }`}>
                      star
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[13px] font-bold text-slate-700">Nhận xét chi tiết (Tùy chọn)</label>
              <textarea
                className="h-28 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-[14px] font-medium text-slate-700 outline-none transition-all focus:border-primary/50 focus:bg-white focus:ring-4 focus:ring-primary/10 placeholder:text-slate-400"
                placeholder="Trải nghiệm của bạn với công việc/ứng viên này thế nào?..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              ></textarea>
            </div>
          </div>

          <div className="border-t border-slate-100 p-6 bg-slate-50/30">
            <button
              disabled={isSubmitting}
              type="submit"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[14px] font-black text-white shadow-[0_8px_20px_-6px_rgba(19,146,236,0.5)] transition-all hover:-translate-y-0.5 hover:bg-primary-dk hover:shadow-[0_12px_24px_-8px_rgba(19,146,236,0.6)] disabled:pointer-events-none disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
              ) : (
                <>
                  <span className="material-symbols-outlined !text-[18px]">send</span>
                  Gửi đánh giá
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;

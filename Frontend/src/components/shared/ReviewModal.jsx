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
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/40 px-3 py-[clamp(0.75rem,4dvh,2rem)] backdrop-blur-sm animate-fadeIn sm:px-4">
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl animate-scaleIn sm:max-h-[calc(100dvh-4rem)]">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-5 sm:p-6">
          <h3 className="text-xl font-bold text-slate-800">Đánh giá</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Đánh giá cho: <span className="text-slate-800 font-bold">{jobTitle}</span></p>
              <p className="text-sm font-medium text-slate-700">Đối tượng: <span className="text-primary font-bold">{revieweeName}</span></p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Số sao</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      rating >= star ? 'bg-amber-100 text-amber-500' : 'bg-slate-50 text-slate-300'
                    }`}
                  >
                    <span className={`material-symbols-outlined !text-2xl ${rating >= star ? 'filled' : ''}`}>
                      star
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Nhận xét (Tùy chọn)</label>
              <textarea
                className="w-full h-24 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-sm"
                placeholder="Chia sẻ trải nghiệm của bạn..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              ></textarea>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-white p-5 sm:p-6">
            <button
              disabled={isSubmitting}
              type="submit"
              className="w-full h-12 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 hover:bg-primary-dk transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="material-symbols-outlined !text-xl">send</span>
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

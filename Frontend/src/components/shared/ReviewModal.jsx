import React, { useState } from 'react';
import axios from 'axios';
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
      await axios.post('http://localhost:5029/api/review', {
        revieweeId,
        jobPostId,
        rating,
        comment
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Review submitted successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-scaleIn">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800">Rate & Review</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Reviewing for: <span className="text-slate-800 font-bold">{jobTitle}</span></p>
            <p className="text-sm font-medium text-slate-500">Target: <span className="text-primary font-bold">{revieweeName}</span></p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Rating</label>
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
            <label className="text-sm font-bold text-slate-700">Comment (Optional)</label>
            <textarea
              className="w-full h-24 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-sm"
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            ></textarea>
          </div>

          <div className="pt-2">
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
                  Submit Review
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

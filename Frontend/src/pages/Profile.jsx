import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ProfileCover from '../components/profile/ProfileCover';
import ProfileSidebar from '../components/profile/ProfileSidebar';
import ProfileContent from '../components/profile/ProfileContent';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [ratingStats, setRatingStats] = useState({ averageRating: 0, totalReviews: 0 });
  const [reviews, setReviews] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchReviewsData = async (userId) => {
    try {
      const statsRes = await axios.get(`http://localhost:5029/api/review/user/${userId}/stats`);
      const reviewsRes = await axios.get(`http://localhost:5029/api/review/user/${userId}`);
      setRatingStats(statsRes.data);
      setReviews(reviewsRes.data);
    } catch (err) {
      console.error('Error fetching review data:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login first');
        navigate('/login');
        return;
      }

      const res = await axios.get('http://localhost:5029/api/profile/applicant', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      setEditForm(res.data);
      fetchReviewsData(res.data.applicantId || res.data.employerId || res.data.userId); // Support different profile types
      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load profile');
      if (err.response?.status === 401) {
        navigate('/login');
      }
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditForm({ ...user }); // Ensure fresh copy
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:5029/api/profile/applicant', editForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUser(editForm); // Update local state immediately
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <ProfileCover 
        user={user} 
        onEditClick={handleEditClick} 
        ratingStats={ratingStats}
      />
      
      <main className="max-w-[1320px] mx-auto px-6 lg:px-10 py-8 grid lg:grid-cols-[320px_1fr] gap-8">
        <ProfileSidebar user={user} />
        
        <div className="space-y-8">
          <ProfileContent 
            user={user} 
            isEditing={isEditing}
            editForm={editForm}
            setEditForm={setEditForm}
            onSave={handleSave}
            onCancel={handleCancel}
          />

          {/* Reviews Section */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-500 filled">star</span>
                Reviews & Ratings
              </h3>
              <span className="text-sm font-bold text-slate-400 capitalize bg-slate-50 px-3 py-1 rounded-full border border-slate-100 italic">
                {ratingStats.totalReviews} Reviews Total
              </span>
            </div>

            {reviews.length === 0 ? (
              <div className="py-10 text-center opacity-40">
                <span className="material-symbols-outlined !text-6xl text-slate-300 mb-4 font-thin">rate_review</span>
                <p className="font-bold text-slate-400">No reviews yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.reviewId} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 transition-all group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                          {review.reviewerName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{review.reviewerName}</div>
                          <div className="text-xs text-slate-400 font-medium">Re: {review.jobTitle}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm">
                        <span className="material-symbols-outlined !text-[14px] text-amber-500 filled">star</span>
                        <span className="text-xs font-black text-slate-700">{review.rating}.0</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed italic">
                      "{review.comment || (review.rating >= 4 ? "Great work!" : "No comment provided.")}"
                    </p>
                    <div className="mt-4 pt-4 border-t border-slate-200/50 flex justify-end">
                      <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

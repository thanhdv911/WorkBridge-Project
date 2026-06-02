import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ProfileCover from '../components/profile/ProfileCover';
import ProfileSidebar from '../components/profile/ProfileSidebar';
import ProfileContent from '../components/profile/ProfileContent';
import ApplicantVipTab from '../components/applicant/ApplicantVipTab';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [ratingStats, setRatingStats] = useState({ averageRating: 0, totalReviews: 0 });
  const [reviews, setReviews] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUserId = parseInt(localStorage.getItem('userId') || '0');
  const isOwnProfile = !id || parseInt(id) === currentUserId;

  useEffect(() => {
    fetchProfile();
  }, [id]);

  useEffect(() => {
    const nextTab = searchParams.get('tab');
    if (nextTab && nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (isOwnProfile) {
      setSearchParams(tab === 'overview' ? {} : { tab });
    }
  };

  const fetchReviewsData = async (userId) => {
    try {
      const statsRes = await api.get(`/review/user/${userId}/stats`);
      const reviewsRes = await api.get(`/review/user/${userId}`);
      setRatingStats(statsRes.data || { averageRating: 0, totalReviews: 0 });
      setReviews(reviewsRes.data || []);
    } catch (err) {
      console.error('Error fetching review data:', err);
      setRatingStats({ averageRating: 0, totalReviews: 0 });
      setReviews([]);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Vui lòng đăng nhập trước');
        setLoading(false);
        navigate('/login');
        return;
      }

      const url = id ? `/profile/applicant/${id}` : '/profile/applicant';
      const res = await api.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      setEditForm(res.data);
      fetchReviewsData(res.data.applicantId || res.data.employerId || res.data.userId); // Support different profile types
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải hồ sơ');
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
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
      await api.put('/profile/applicant', editForm, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUser(editForm); // Update local state immediately
      setIsEditing(false);
      toast.success('Cập nhật hồ sơ thành công!');
    } catch (err) {
      console.error(err);
      toast.error('Không thể cập nhật hồ sơ');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    const userRole = localStorage.getItem('role');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
        <span className="material-symbols-outlined !text-6xl text-slate-300 mb-4">person_off</span>
        <h2 className="text-2xl font-bold text-slate-700 mb-2">Không tìm thấy hồ sơ</h2>
        <p className="text-slate-500 mb-6 text-center max-w-md">Không tìm thấy hồ sơ bạn đang tìm, hoặc bạn không có quyền xem.</p>
        <button onClick={() => navigate(userRole === 'Employer' ? '/employer-dashboard' : '/')} className="px-6 py-2 bg-primary text-white rounded-xl font-bold">Về trang chủ</button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <ProfileCover
        user={user}
        onEditClick={handleEditClick}
        isOwnProfile={isOwnProfile}
        ratingStats={ratingStats}
      />

      <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 grid lg:grid-cols-[320px_1fr] gap-8">
        <ProfileSidebar user={user} isOwnProfile={isOwnProfile} />

        <div className="space-y-6">
          {/* Elegant Modern Tab Bar */}
          {!isEditing && (
            <div className="flex border-b border-slate-200/80 gap-6 mb-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => handleTabChange('overview')}
                className={`pb-3.5 text-sm font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                  activeTab === 'overview'
                    ? 'border-primary text-primary font-extrabold'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className="material-symbols-outlined !text-lg">person</span>
                Tổng quan
              </button>
              <button
                onClick={() => handleTabChange('experience')}
                className={`pb-3.5 text-sm font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                  activeTab === 'experience'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className="material-symbols-outlined !text-lg">work_history</span>
                Kinh nghiệm & Lịch rảnh
              </button>
              <button
                onClick={() => handleTabChange('reviews')}
                className={`pb-3.5 text-sm font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                  activeTab === 'reviews'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className="material-symbols-outlined !text-lg">star</span>
                Đánh giá
                {ratingStats?.totalReviews > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === 'reviews' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {ratingStats.totalReviews}
                  </span>
                )}
              </button>
              {isOwnProfile && (
                <button
                  onClick={() => handleTabChange('vip')}
                  className={`pb-3.5 text-sm font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                    activeTab === 'vip'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span className="material-symbols-outlined !text-lg">workspace_premium</span>
                  Cá nhân VIP
                </button>
              )}
            </div>
          )}

          {/* Conditional Rendering of active tab content */}
          {(isEditing || activeTab === 'overview') && (
            <ProfileContent
              user={user}
              setUser={setUser}
              isEditing={isEditing}
              editForm={editForm}
              setEditForm={setEditForm}
              onSave={handleSave}
              onCancel={handleCancel}
              isOwnProfile={isOwnProfile}
              activeTab="overview"
            />
          )}

          {!isEditing && activeTab === 'experience' && (
            <ProfileContent
              user={user}
              setUser={setUser}
              isEditing={isEditing}
              editForm={editForm}
              setEditForm={setEditForm}
              onSave={handleSave}
              onCancel={handleCancel}
              isOwnProfile={isOwnProfile}
              activeTab="experience"
            />
          )}

          {!isEditing && activeTab === 'reviews' && (
            <div className="anim-fadeUp bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 lg:p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 filled">star</span>
                  Đánh giá
                </h3>
                <span className="text-xs font-bold text-slate-400 capitalize bg-slate-50 px-3 py-1 rounded-full border border-slate-100 italic">
                  {ratingStats?.totalReviews || 0} đánh giá
                </span>
              </div>

              {!reviews || reviews.length === 0 ? (
                <div className="py-14 text-center opacity-40">
                  <span className="material-symbols-outlined !text-5xl text-slate-300 mb-3 font-thin">rate_review</span>
                  <p className="font-bold text-slate-400 text-sm">Chưa có đánh giá</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {reviews.map((review) => (
                    <div key={review.reviewId} className="p-5 rounded-xl bg-slate-50/50 border border-slate-100/70 hover:border-primary/20 hover:bg-white transition-all group shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                            {(review.reviewerName || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-700 text-sm">{review.reviewerName || 'Người dùng ẩn danh'}</div>
                            <div className="text-[11px] text-slate-400 font-semibold">Về: {review.jobTitle || 'Đơn ứng tuyển'}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-100 shadow-sm">
                          <span className="material-symbols-outlined !text-[12px] text-amber-500 filled">star</span>
                          <span className="text-[11px] font-black text-slate-700">{review.rating || 0}.0</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed italic">
                        "{review.comment || (review.rating >= 4 ? "Tuyệt vời!" : "Không có nhận xét.")}"
                      </p>
                      <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                        <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                          {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Unknown Date'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isEditing && activeTab === 'vip' && isOwnProfile && <ApplicantVipTab />}
        </div>
      </main>
    </div>
  );
}

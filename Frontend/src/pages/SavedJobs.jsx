import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import JobCard from '../components/jobs/JobCard';
import Pagination from '../components/shared/Pagination';

const ITEMS_PER_PAGE = 5;

export default function SavedJobs() {
  const [savedJobs, setSavedJobs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (token) {
      fetchSavedJobs();
    } else {
      setLoading(false);
      toast.error('Vui lòng đăng nhập để xem việc đã lưu.');
    }
  }, [token]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(savedJobs.length / ITEMS_PER_PAGE));
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [savedJobs.length, currentPage]);

  const fetchSavedJobs = async () => {
    try {
      const response = await api.get('/savedjobs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSavedJobs(response.data);
    } catch (error) {
      console.error('Error fetching saved jobs:', error);
      if (error.response?.status === 401) {
        toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
      } else {
        toast.error('Không thể tải danh sách việc yêu thích.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (jobId) => {
    try {
      await api.delete(`/savedjobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Đã bỏ lưu việc làm.');
      setSavedJobs(prev => prev.filter(j => j.jobPostId !== jobId));
    } catch (error) {
      console.error('Error unsaving job:', error);
      toast.error('Không thể bỏ lưu việc làm.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-bg-light">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const paginatedSavedJobs = savedJobs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="bg-bg-light min-h-[calc(100vh-64px)] font-display text-slate-900 pb-20">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-14">
        <div className="absolute w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(19,146,236,.18),transparent_70%)] -top-20 -right-10 rounded-full pointer-events-none blur-[60px]"></div>
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h1 className="anim-fadeUp text-3xl lg:text-4xl font-black tracking-tight mb-2">
            Việc Đã <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Lưu</span>
          </h1>
          <p className="anim-fadeUp-d1 text-sm text-slate-400">Theo dõi các cơ hội bạn quan tâm.</p>
        </div>
      </section>

      <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        {savedJobs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm p-20 text-center anim-fadeUp-d2">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-slate-300 !text-4xl">bookmark_border</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Chưa có việc đã lưu</h2>
            <p className="text-slate-500 mt-2 mb-8 max-w-md mx-auto">Khám phá các vị trí và nhấn biểu tượng trái tim để lưu lại.</p>
            <a href="/jobs" className="inline-flex items-center h-12 px-8 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all">
               Tìm việc
            </a>
          </div>
        ) : (
          <div className="anim-fadeUp-d2">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedSavedJobs.map(job => (
                <JobCard
                  key={job.jobPostId}
                  job={job}
                  isSaved={true}
                  onToggleSave={handleUnsave}
                />
              ))}
            </div>
            <Pagination
              currentPage={currentPage}
              totalItems={savedJobs.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
              label="việc đã lưu"
              className="mt-6 rounded-3xl border border-slate-200/70 shadow-sm"
            />
          </div>
        )}
      </main>
    </div>
  );
}

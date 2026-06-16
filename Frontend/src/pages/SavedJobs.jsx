import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
        toast.error('Không thể tải danh sách việc đã lưu.');
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
      setSavedJobs((prev) => prev.filter((job) => job.jobPostId !== jobId));
    } catch (error) {
      console.error('Error unsaving job:', error);
      toast.error('Không thể bỏ lưu việc làm.');
    }
  };

  if (loading) {
    return (
      <div className="applicant-shell flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  const paginatedSavedJobs = savedJobs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="applicant-shell min-h-screen pb-20 font-display text-slate-900">
      <section className="applicant-page-hero">
        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <span className="applicant-eyebrow">
            <span className="material-symbols-outlined !text-[15px]">bookmark</span>
            Bộ sưu tập công việc
          </span>
          <h1 className="mt-4 text-3xl font-black text-white lg:text-4xl">Việc đã lưu</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-sky-100">
            Giữ lại những cơ hội bạn quan tâm để so sánh, đọc lại và ứng tuyển khi sẵn sàng.
          </p>
        </div>
      </section>

      <main className="applicant-page-content mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {savedJobs.length === 0 ? (
          <div className="applicant-empty-card animate-fadeInUp p-12 text-center sm:p-20">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-sky-50 text-primary">
              <span className="material-symbols-outlined !text-4xl">bookmark_border</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800">Chưa có việc đã lưu</h2>
            <p className="mx-auto mb-8 mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-700">
              Khám phá các vị trí phù hợp và nhấn biểu tượng lưu để quay lại nhanh hơn.
            </p>
            <Link
              to="/jobs"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-8 font-bold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-dk"
            >
              <span className="material-symbols-outlined !text-lg">search</span>
              Tìm việc
            </Link>
          </div>
        ) : (
          <div className="animate-fadeInUp">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedSavedJobs.map((job) => (
                <JobCard
                  key={job.jobPostId}
                  job={job}
                  isSaved
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
              className="mt-6 rounded-2xl border border-slate-200/60 shadow-sm"
            />
          </div>
        )}
      </main>
    </div>
  );
}

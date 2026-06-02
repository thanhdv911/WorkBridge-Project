import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import HeroSearch from '../components/jobs/HeroSearch';
import JobFilterSidebar from '../components/jobs/JobFilterSidebar';
import JobCard from '../components/jobs/JobCard';
import Pagination from '../components/shared/Pagination';

export default function FindJobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [paginationData, setPaginationData] = useState({
    totalCount: 0,
    pageNumber: 1,
    pageSize: 10,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false
  });
  const [page, setPage] = useState(1);
  const readFiltersFromUrl = () => ({
    keyword: searchParams.get('keyword') || '',
    location: searchParams.get('location') || '',
    minSalary: searchParams.get('minSalary') || '',
    categoryId: searchParams.get('categoryId') || searchParams.get('category') || ''
  });
  const [filters, setFilters] = useState(readFiltersFromUrl);
  const [savedJobIds, setSavedJobIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const isApplicant = role && role.toLowerCase() === 'applicant';

  useEffect(() => {
    fetchJobs();
    if (isApplicant && token) {
      fetchSavedJobIds();
    }
  }, [token, isApplicant, page, filters]);

  useEffect(() => {
    const nextFilters = readFiltersFromUrl();
    setFilters(prev => {
      const isSame = Object.keys(nextFilters).every(key => prev[key] === nextFilters[key]);
      return isSame ? prev : nextFilters;
    });
    setPage(1);
  }, [searchParams]);

  const fetchSavedJobIds = async () => {
    try {
      const res = await api.get('/savedjobs/ids', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSavedJobIds(res.data);
    } catch (err) {
      console.error('Error fetching saved job IDs:', err);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const { keyword, location, minSalary, categoryId } = filters;
      let url = `/jobs?page=${page}&pageSize=9`;
      if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
      if (location) url += `&location=${encodeURIComponent(location)}`;
      if (minSalary) url += `&minSalary=${minSalary}`;
      if (categoryId) url += `&categoryId=${encodeURIComponent(categoryId)}`;

      const res = await api.get(url);
      setJobs(res.data.items);
      setPaginationData({
        totalCount: res.data.totalCount,
        pageNumber: res.data.pageNumber,
        pageSize: res.data.pageSize,
        totalPages: res.data.totalPages,
        hasPreviousPage: res.data.hasPreviousPage,
        hasNextPage: res.data.hasNextPage
      });
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách việc làm');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (newFilters) => {
    const nextFilters = { ...filters, ...newFilters };
    setFilters(nextFilters);
    setPage(1);

    const params = new URLSearchParams();
    if (nextFilters.keyword) params.set('keyword', nextFilters.keyword);
    if (nextFilters.location) params.set('location', nextFilters.location);
    if (nextFilters.minSalary) params.set('minSalary', nextFilters.minSalary);
    if (nextFilters.categoryId) params.set('categoryId', nextFilters.categoryId);
    setSearchParams(params);
  };

  const handleToggleSave = async (jobId) => {
    if (!token) {
      toast.error('Vui lòng đăng nhập để lưu việc');
      return;
    }

    const isAlreadySaved = savedJobIds.includes(jobId);
    try {
      if (isAlreadySaved) {
        await api.delete(`/savedjobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSavedJobIds(prev => prev.filter(id => id !== jobId));
        toast.success('Đã bỏ lưu việc làm');
      } else {
        await api.post(`/savedjobs/${jobId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSavedJobIds(prev => [...prev, jobId]);
        toast.success('Đã lưu việc làm');
      }
    } catch (err) {
      console.error('Error toggling save:', err);
      toast.error('Không thể cập nhật danh sách đã lưu');
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <HeroSearch
        initialKeyword={filters.keyword}
        initialLocation={filters.location}
        onSearch={(keyword, location) => handleSearch({ keyword, location })}
        totalJobs={paginationData.totalCount}
      />

      <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 grid lg:grid-cols-[280px_1fr] gap-8">
        <JobFilterSidebar onFilterChange={(minSalary) => handleSearch({ minSalary })} />

        <section>
          <div className="anim-fadeUp-d1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <p className="text-sm text-slate-500">
              Hiển thị <span className="font-semibold text-slate-800">{paginationData.totalCount}</span> việc làm
            </p>
            <div className="flex items-center gap-3">
              <select className="text-sm border border-slate-200 rounded-xl px-3 h-10 bg-white focus:ring-primary/30 focus:border-primary outline-none cursor-pointer">
                <option>Mới nhất</option>
                <option>Lương cao nhất</option>
                <option>Gần nhất</option>
                <option>Phổ biến nhất</option>
              </select>
              <div className="flex border border-slate-200 rounded-xl overflow-hidden">
                <button className="w-10 h-10 flex items-center justify-center bg-primary text-white">
                  <span className="material-symbols-outlined !text-xl">grid_view</span>
                </button>
                <button className="w-10 h-10 flex items-center justify-center bg-white text-slate-400 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined !text-xl">view_list</span>
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
              <span className="material-symbols-outlined !text-4xl text-slate-300 mb-2">work_off</span>
              <h3 className="text-lg font-bold text-slate-700">Không tìm thấy việc làm</h3>
              <p className="text-sm text-slate-500">Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {jobs.map((job) => (
                <JobCard
                  key={job.jobPostId}
                  job={job}
                  isSaved={savedJobIds.includes(job.jobPostId)}
                  onToggleSave={isApplicant ? handleToggleSave : null}
                />
              ))}
            </div>
          )}

          <Pagination
            currentPage={page}
            totalItems={paginationData.totalCount}
            itemsPerPage={paginationData.pageSize || 9}
            onPageChange={setPage}
            label="việc làm"
            className="mt-10 rounded-3xl border border-slate-200/70 shadow-sm anim-fadeUp"
          />
        </section>
      </main>
    </div>
  );
}

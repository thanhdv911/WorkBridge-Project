import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import HeroSearch from '../components/jobs/HeroSearch';
import JobFilterSidebar from '../components/jobs/JobFilterSidebar';
import JobCard from '../components/jobs/JobCard';
import Pagination from '../components/shared/Pagination';
import { getCategorySlug, getCategoryIdFromSlug } from '../utils/categorySlug';

const readFiltersFromSearchParams = (searchParams) => ({
  keyword: searchParams.get('keyword') || '',
  location: searchParams.get('location') || '',
  minSalary: searchParams.get('minSalary') || '',
  categoryId: searchParams.get('categoryId') || getCategoryIdFromSlug(searchParams.get('category')) || ''
});

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
  const [filters, setFilters] = useState(() => readFiltersFromSearchParams(searchParams));
  const [savedJobIds, setSavedJobIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('newest');
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const isApplicant = role && role.toLowerCase() === 'applicant';

  const sortedJobs = React.useMemo(() => {
    const jobsCopy = [...jobs];
    if (sortBy === 'salary') {
      return jobsCopy.sort((a, b) => (b.payRate || 0) - (a.payRate || 0));
    }
    if (sortBy === 'newest') {
      return jobsCopy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    if (sortBy === 'popular') {
      return jobsCopy.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
    }
    if (sortBy === 'closest') {
      const locFilter = (filters.location || '').toLowerCase();
      if (locFilter) {
        return jobsCopy.sort((a, b) => {
          const aMatch = (a.location || '').toLowerCase().includes(locFilter) ? 1 : 0;
          const bMatch = (b.location || '').toLowerCase().includes(locFilter) ? 1 : 0;
          return bMatch - aMatch;
        });
      }
    }
    return jobsCopy;
  }, [jobs, sortBy, filters.location]);

  useEffect(() => {
    const nextFilters = readFiltersFromSearchParams(searchParams);
    setFilters((prev) => {
      const isSame = Object.keys(nextFilters).every((key) => prev[key] === nextFilters[key]);
      return isSame ? prev : nextFilters;
    });
    setPage(1);
  }, [searchParams]);

  const fetchSavedJobIds = useCallback(async () => {
    try {
      const res = await api.get('/savedjobs/ids', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSavedJobIds(res.data);
    } catch (err) {
      console.error('Error fetching saved job IDs:', err);
    }
  }, [token]);

  const fetchJobs = useCallback(async () => {
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
  }, [filters, page]);

  useEffect(() => {
    fetchJobs();
    if (isApplicant && token) {
      fetchSavedJobIds();
    }
  }, [fetchJobs, fetchSavedJobIds, isApplicant, token]);

  const handleSearch = (newFilters) => {
    const nextFilters = { ...filters, ...newFilters };
    setFilters(nextFilters);
    setPage(1);

    const params = new URLSearchParams();
    if (nextFilters.keyword) params.set('keyword', nextFilters.keyword);
    if (nextFilters.location) params.set('location', nextFilters.location);
    if (nextFilters.minSalary) params.set('minSalary', nextFilters.minSalary);
    if (nextFilters.categoryId) params.set('category', getCategorySlug(nextFilters.categoryId));
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
        setSavedJobIds((prev) => prev.filter((id) => id !== jobId));
        toast.success('Đã bỏ lưu việc làm');
        window.dispatchEvent(new Event('savedJobsChanged'));
      } else {
        await api.post(`/savedjobs/${jobId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSavedJobIds((prev) => [...prev, jobId]);
        toast.success('Đã lưu việc làm');
        window.dispatchEvent(new Event('savedJobsChanged'));
      }
    } catch (err) {
      console.error('Error toggling save:', err);
      toast.error('Không thể cập nhật danh sách đã lưu');
    }
  };

  return (
    <div className="jobs-page">
      <HeroSearch
        initialKeyword={filters.keyword}
        initialLocation={filters.location}
        onSearch={(keyword, location) => handleSearch({ keyword, location })}
        totalJobs={paginationData.totalCount}
      />

      <main className="jobs-main">
        <JobFilterSidebar 
          selectedCategoryId={filters.categoryId}
          minSalary={filters.minSalary}
          onFilterApply={(next) => handleSearch(next)}
        />

        <section className="jobs-results">
          <div className="jobs-results-toolbar anim-fadeUp-d1">
            <p className="jobs-count-pill">
              Hiển thị <span>{paginationData.totalCount}</span> việc làm
            </p>

            <div className="jobs-results-controls">
              <select 
                className="jobs-sort-select" 
                aria-label="Sắp xếp việc làm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Mới nhất</option>
                <option value="salary">Lương cao nhất</option>
              </select>

              <div className="jobs-view-toggle" aria-label="Kiểu hiển thị">
                <button 
                  type="button" 
                  className={viewMode === 'grid' ? 'is-active' : ''} 
                  onClick={() => setViewMode('grid')}
                  aria-label="Hiển thị dạng lưới"
                >
                  <span className="material-symbols-outlined !text-xl">grid_view</span>
                </button>
                <button 
                  type="button" 
                  className={viewMode === 'list' ? 'is-active' : ''} 
                  onClick={() => setViewMode('list')}
                  aria-label="Hiển thị dạng danh sách"
                >
                  <span className="material-symbols-outlined !text-xl">view_list</span>
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="jobs-loading-panel">
              <div className="jobs-loader" />
              <p>Đang tải cơ hội phù hợp...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="jobs-empty-panel">
              <span className="material-symbols-outlined">work_off</span>
              <h3>Không tìm thấy việc làm</h3>
              <p>Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm.</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'jobs-grid' : 'jobs-list'}>
              {sortedJobs.map((job) => (
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
            className="jobs-pagination anim-fadeUp"
          />
        </section>
      </main>
    </div>
  );
}

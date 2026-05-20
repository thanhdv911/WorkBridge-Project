import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import HeroSearch from '../components/jobs/HeroSearch';
import JobFilterSidebar from '../components/jobs/JobFilterSidebar';
import JobCard from '../components/jobs/JobCard';

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
  }, [token, isApplicant, page, filters]); // Re-fetch on filter change too

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
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (newFilters) => {
    const nextFilters = { ...filters, ...newFilters };
    setFilters(nextFilters);
    setPage(1); // Reset to first page on search

    const params = new URLSearchParams();
    if (nextFilters.keyword) params.set('keyword', nextFilters.keyword);
    if (nextFilters.location) params.set('location', nextFilters.location);
    if (nextFilters.minSalary) params.set('minSalary', nextFilters.minSalary);
    if (nextFilters.categoryId) params.set('categoryId', nextFilters.categoryId);
    setSearchParams(params);
  };

  const handleToggleSave = async (jobId) => {
    if (!token) {
      toast.error('Please login to save jobs');
      return;
    }

    const isAlreadySaved = savedJobIds.includes(jobId);
    try {
      if (isAlreadySaved) {
        await api.delete(`/savedjobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSavedJobIds(prev => prev.filter(id => id !== jobId));
        toast.success('Job removed from saved list');
      } else {
        await api.post(`/savedjobs/${jobId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSavedJobIds(prev => [...prev, jobId]);
        toast.success('Job saved successfully');
      }
    } catch (err) {
      console.error('Error toggling save:', err);
      toast.error('Failed to update saved jobs');
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <HeroSearch 
        onSearch={(keyword, location) => handleSearch({ keyword, location })} 
        totalJobs={paginationData.totalCount}
      />
      
      <main className="max-w-[1320px] mx-auto px-6 lg:px-10 py-10 grid lg:grid-cols-[280px_1fr] gap-8">
        <JobFilterSidebar onFilterChange={(minSalary) => handleSearch({ minSalary })} />
        
        <section>
          {/* Sort bar */}
          <div className="anim-fadeUp-d1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <p className="text-sm text-slate-500">Showing <span className="font-semibold text-slate-800">{paginationData.totalCount}</span> jobs available</p>
            <div className="flex items-center gap-3">
              <select className="text-sm border border-slate-200 rounded-xl px-3 h-10 bg-white focus:ring-primary/30 focus:border-primary outline-none cursor-pointer">
                <option>Most Recent</option>
                <option>Highest Pay</option>
                <option>Closest</option>
                <option>Most Popular</option>
              </select>
              <div className="flex border border-slate-200 rounded-xl overflow-hidden">
                <button className="w-10 h-10 flex items-center justify-center bg-primary text-white"><span className="material-symbols-outlined !text-xl">grid_view</span></button>
                <button className="w-10 h-10 flex items-center justify-center bg-white text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined !text-xl">view_list</span></button>
              </div>
            </div>
          </div>

          {/* Job Grid */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
              <span className="material-symbols-outlined !text-4xl text-slate-300 mb-2">work_off</span>
              <h3 className="text-lg font-bold text-slate-700">No jobs found</h3>
              <p className="text-sm text-slate-500">Try adjusting your filters or search terms.</p>
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

          {/* Pagination */}
          {paginationData.totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2 anim-fadeUp">
              <button 
                disabled={!paginationData.hasPreviousPage}
                onClick={() => setPage(page - 1)}
                className={`w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center transition-all ${
                  !paginationData.hasPreviousPage ? 'opacity-30 cursor-not-allowed' : 'text-slate-600 hover:bg-white hover:border-primary hover:text-primary hover:shadow-lg shadow-sm bg-white'
                }`}
              >
                <span className="material-symbols-outlined !text-xl">chevron_left</span>
              </button>

              {Array.from({ length: paginationData.totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === paginationData.totalPages || (p >= page - 1 && p <= page + 1))
                .map((p, index, array) => (
                  <React.Fragment key={p}>
                    {index > 0 && array[index - 1] !== p - 1 && (
                      <span className="text-slate-400 text-sm px-1">…</span>
                    )}
                    <button 
                      onClick={() => setPage(p)}
                      className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                        page === p 
                          ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110 z-10' 
                          : 'bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-primary shadow-sm'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}

              <button 
                disabled={!paginationData.hasNextPage}
                onClick={() => setPage(page + 1)}
                className={`w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center transition-all ${
                  !paginationData.hasNextPage ? 'opacity-30 cursor-not-allowed' : 'text-slate-600 hover:bg-white hover:border-primary hover:text-primary hover:shadow-lg shadow-sm bg-white'
                }`}
              >
                <span className="material-symbols-outlined !text-xl">chevron_right</span>
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

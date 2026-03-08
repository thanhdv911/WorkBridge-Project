import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import HeroSearch from '../components/jobs/HeroSearch';
import JobFilterSidebar from '../components/jobs/JobFilterSidebar';
import JobCard from '../components/jobs/JobCard';

export default function FindJobs() {
  const [jobs, setJobs] = useState([]);
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
  }, [token, isApplicant]);

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
      const res = await api.get('/jobs');
      setJobs(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
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
      <HeroSearch />
      
      <main className="max-w-[1320px] mx-auto px-6 lg:px-10 py-10 grid lg:grid-cols-[280px_1fr] gap-8">
        <JobFilterSidebar />
        
        <section>
          {/* Sort bar */}
          <div className="anim-fadeUp-d1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <p className="text-sm text-slate-500">Showing <span className="font-semibold text-slate-800">{jobs.length}</span> jobs</p>
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
          <div className="mt-10 flex items-center justify-center gap-2">
            <button className="w-10 h-10 rounded-xl border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors"><span className="material-symbols-outlined !text-xl">chevron_left</span></button>
            <button className="w-10 h-10 rounded-xl bg-primary text-white text-sm font-bold shadow-md shadow-primary/20">1</button>
            <button className="w-10 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors">2</button>
            <button className="w-10 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors">3</button>
            <span className="text-slate-400 text-sm">…</span>
            <button className="w-10 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors">16</button>
            <button className="w-10 h-10 rounded-xl border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors"><span className="material-symbols-outlined !text-xl">chevron_right</span></button>
          </div>
        </section>
      </main>
    </div>
  );
}

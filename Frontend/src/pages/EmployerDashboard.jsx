import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmployerProfileTab from '../components/employer/EmployerProfileTab';
import EmployerJobForm from '../components/employer/EmployerJobForm';

export default function EmployerDashboard() {
  const [activeTab, setActiveTab] = useState('profile');
  const navigate = useNavigate();
  
  // Basic role check (In a real app, verify from decoded JWT)
  const isEmployer = localStorage.getItem('role') === 'Employer';
  
  if (!isEmployer && localStorage.getItem('token')) {
    // If user is applicant, rederect to standard profile
    navigate('/profile');
    return null;
  }

  // Calculate some fake numbers for the dashboard stats
  const stats = [
    { label: 'Active Job Posts', value: '0', icon: 'work', color: 'primary', bg: 'primary/10' },
    { label: 'Total Applications', value: '0', icon: 'description', color: 'blue-500', bg: 'blue-50' },
    { label: 'Qualified Candidates', value: '0%', icon: 'how_to_reg', color: 'green-500', bg: 'green-50' },
    { label: 'Employer Rating', value: '---', icon: 'star', color: 'amber-500', bg: 'amber-50' }
  ];

  return (
    <div className="bg-bg-light min-h-[calc(100vh-64px)] font-display text-slate-900 pb-12">
      {/* Welcome Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-10">
        <div className="absolute w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(19,146,236,.18),transparent_70%)] -top-20 -right-10 rounded-full pointer-events-none blur-[60px]"></div>
        <div className="max-w-[1320px] mx-auto px-6 lg:px-10 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="anim-fadeUp text-2xl lg:text-3xl font-black tracking-tight">
              Employer <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Dashboard</span>
            </h1>
            <p className="anim-fadeUp-d1 mt-1 text-sm text-slate-400">Manage your company profile and job postings.</p>
          </div>
          <button 
            onClick={() => setActiveTab('post-job')}
            className="anim-fadeUp-d2 inline-flex items-center h-11 px-6 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dk shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all gap-2 flex-shrink-0"
          >
            <span className="material-symbols-outlined !text-xl">add</span>Post New Job
          </button>
        </div>
      </section>

      {/* Stats */}
      <div className="max-w-[1320px] mx-auto px-6 lg:px-10 -mt-6 relative z-10 mb-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className={`anim-fadeUp card-lift bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5`} style={{animationDelay: `${idx * 0.12}s`}}>
               <div className="flex items-center justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl bg-${stat.bg} flex items-center justify-center`}>
                    <span className={`material-symbols-outlined text-${stat.color} !text-2xl`}>{stat.icon}</span>
                  </div>
               </div>
               <p className="text-3xl font-black text-slate-800">{stat.value}</p>
               <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-[1320px] mx-auto px-6 lg:px-10 grid lg:grid-cols-[240px_1fr] gap-8">
        {/* Sidebar Nav */}
        <aside className="space-y-2">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'profile' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">domain</span>Company Profile
          </button>
          
          <button 
            onClick={() => setActiveTab('post-job')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'post-job' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">post_add</span>Post a Job
          </button>

          <button 
            disabled
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 opacity-60 cursor-not-allowed transition-colors"
          >
            <span className="material-symbols-outlined !text-lg text-inherit">list_alt</span>Manage Posts <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-500 ml-auto leading-none">Soon</span>
          </button>
          
          <button 
             disabled
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 opacity-60 cursor-not-allowed transition-colors"
          >
            <span className="material-symbols-outlined !text-lg text-inherit">group</span>Review Applicants <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-500 ml-auto leading-none">Soon</span>
          </button>
        </aside>

        {/* Content Area */}
        <main>
          {activeTab === 'profile' && <EmployerProfileTab />}
          {activeTab === 'post-job' && <EmployerJobForm onSuccess={() => setActiveTab('profile')} />}
        </main>
      </div>
    </div>
  );
}

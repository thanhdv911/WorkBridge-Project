import React, { useState } from 'react';
import AdminUsers from '../components/admin/AdminUsers';
import AdminJobs from '../components/admin/AdminJobs';
import AdminCategories from '../components/admin/AdminCategories';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('users');

    const tabs = [
        { id: 'users', label: 'User Management', icon: 'groups' },
        { id: 'jobs', label: 'Job Moderation', icon: 'fact_check' },
        { id: 'categories', label: 'Categories', icon: 'category' }
    ];

    return (
        <div className="bg-bg-light min-h-[calc(100vh-64px)] font-display flex flex-col md:flex-row">
            {/* Sidebar */}
            <aside className="w-full md:w-72 bg-white border-r border-slate-200/60 p-6 flex flex-col gap-2">
                <div className="mb-8 px-2">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Admin <span className="text-primary">Panel</span></h1>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Management Console</p>
                </div>

                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                            activeTab === tab.id 
                            ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                        }`}
                    >
                        <span className="material-symbols-outlined !text-[20px]">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar">
                <div className="max-w-6xl mx-auto">
                    {activeTab === 'users' && <AdminUsers />}
                    {activeTab === 'jobs' && <AdminJobs />}
                    {activeTab === 'categories' && <AdminCategories />}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;

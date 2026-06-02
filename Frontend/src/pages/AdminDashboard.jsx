import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminUsers from '../components/admin/AdminUsers';
import AdminJobs from '../components/admin/AdminJobs';
import AdminCategories from '../components/admin/AdminCategories';
import AdminOverview from '../components/admin/AdminOverview';
import AdminReports from '../components/admin/AdminReports';
import AdminVipPlans from '../components/admin/AdminVipPlans';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('role') === 'Admin';

    useEffect(() => {
        if (!token) {
            navigate('/login');
        } else if (!isAdmin) {
            navigate('/');
        }
    }, [token, isAdmin, navigate]);

    if (!token || !isAdmin) {
        return null;
    }

    const tabs = [
        { id: 'overview', label: 'Tổng quan', icon: 'dashboard' },
        { id: 'users', label: 'Quản lý người dùng', icon: 'groups' },
        { id: 'jobs', label: 'Kiểm duyệt việc làm', icon: 'fact_check' },
        { id: 'categories', label: 'Danh mục', icon: 'category' },
        { id: 'vip-plans', label: 'Gói VIP', icon: 'workspace_premium' },
        { id: 'reports', label: 'Báo cáo hệ thống', icon: 'report_problem' }
    ];

    return (
        <div className="bg-bg-light min-h-[calc(100vh-64px)] font-display flex flex-col md:flex-row">
            {/* Sidebar */}
            <aside className="w-full md:w-72 bg-white border-r border-slate-200/60 p-6 flex flex-col gap-2">
                <div className="mb-8 px-2">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Quản trị <span className="text-primary">Hệ thống</span></h1>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Bảng điều khiển quản trị</p>
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
                    {activeTab === 'overview' && <AdminOverview />}
                    {activeTab === 'users' && <AdminUsers />}
                    {activeTab === 'jobs' && <AdminJobs />}
                    {activeTab === 'categories' && <AdminCategories />}
                    {activeTab === 'vip-plans' && <AdminVipPlans />}
                    {activeTab === 'reports' && <AdminReports />}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;

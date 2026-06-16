import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminUsers from '../components/admin/AdminUsers';
import AdminJobs from '../components/admin/AdminJobs';
import AdminCategories from '../components/admin/AdminCategories';
import AdminOverview from '../components/admin/AdminOverview';
import AdminReports from '../components/admin/AdminReports';
import AdminVipPlans from '../components/admin/AdminVipPlans';
import AdminOperations from '../components/admin/AdminOperations';
import AdminEmployerVerifications from '../components/admin/AdminEmployerVerifications';

const tabs = [
    {
        id: 'overview',
        label: 'Tổng quan',
        shortLabel: 'Tổng quan',
        icon: 'dashboard',
        description: 'Theo dõi sức khỏe hệ thống, tăng trưởng việc làm và người dùng.',
        metric: 'Live'
    },
    {
        id: 'users',
        label: 'Quản lý người dùng',
        shortLabel: 'Người dùng',
        icon: 'groups',
        description: 'Khóa tài khoản, chỉnh điểm uy tín và nâng VIP thủ công.',
        metric: 'Tài khoản'
    },
    {
        id: 'jobs',
        label: 'Kiểm duyệt việc làm',
        shortLabel: 'Duyệt tin',
        icon: 'fact_check',
        description: 'Duyệt các tin tuyển dụng đang chờ xuất bản.',
        metric: 'Pending'
    },
    {
        id: 'categories',
        label: 'Danh mục',
        shortLabel: 'Danh mục',
        icon: 'category',
        description: 'Sắp xếp nhóm ngành và mô tả danh mục việc làm.',
        metric: 'Nhóm việc'
    },
    {
        id: 'vip-plans',
        label: 'Gói VIP',
        shortLabel: 'VIP',
        icon: 'workspace_premium',
        description: 'Thiết lập gói nâng cấp, giao dịch và quyền VIP.',
        metric: 'Doanh thu'
    },
    {
        id: 'operations',
        label: 'Vận hành hệ thống',
        shortLabel: 'Vận hành',
        icon: 'settings_heart',
        description: 'Bật bảo trì, gửi email nâng cấp và thông báo vận hành đến người dùng.',
        metric: 'Bảo trì'
    },
    {
        id: 'reports',
        label: 'Báo cáo hệ thống',
        shortLabel: 'Báo cáo',
        icon: 'report_problem',
        description: 'Xử lý khiếu nại và nội dung cần kiểm tra.',
        metric: 'Review'
    },
    {
        id: 'verifications',
        label: 'Duyệt KYB',
        shortLabel: 'KYB',
        icon: 'verified_user',
        description: 'Phê duyệt giấy phép kinh doanh của nhà tuyển dụng.',
        metric: 'KYB'
    }
];

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('role') === 'Admin';

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!token) {
            navigate('/login');
        } else if (!isAdmin) {
            navigate('/');
        }
    }, [token, isAdmin, navigate]);

    const activeTabConfig = useMemo(
        () => tabs.find((tab) => tab.id === activeTab) || tabs[0],
        [activeTab]
    );

    if (!token || !isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Overlay for mobile menu */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Fixed Sidebar */}
            <aside className={`w-64 fixed inset-y-0 left-0 bg-white border-r border-slate-200 shadow-sm z-50 flex flex-col transform transition-transform duration-300 lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
                    <span className="text-xl font-black text-primary tracking-tight">WorkBridge <span className="text-slate-800">Admin</span></span>
                    <button 
                        className="lg:hidden p-1 text-slate-500 hover:text-slate-800"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-1.5 scrollbar-none">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setIsMobileMenuOpen(false);
                                }}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                    isActive 
                                    ? 'bg-primary/10 text-primary' 
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                <span className={`material-symbols-outlined !text-[18px] ${isActive ? 'text-primary' : 'text-slate-400'}`}>
                                    {tab.icon}
                                </span>
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 lg:ml-64 flex flex-col min-h-screen relative w-full">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button 
                            className="lg:hidden p-1 text-slate-500 hover:text-slate-800 flex items-center justify-center"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <span className="material-symbols-outlined !text-2xl">menu</span>
                        </button>
                        <div className="flex flex-col">
                            <h2 className="text-lg font-bold text-slate-800 leading-tight">{activeTabConfig.label}</h2>
                            <p className="text-xs font-medium text-slate-500 hidden sm:block">{activeTabConfig.description}</p>
                        </div>
                    </div>
                    <div id="admin-header-actions" className="flex items-center gap-2 sm:gap-3">
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-6 flex-1 max-w-[1400px] w-full mx-auto">
                    {activeTab === 'overview' && <AdminOverview />}
                    {activeTab === 'users' && <AdminUsers />}
                    {activeTab === 'jobs' && <AdminJobs />}
                    {activeTab === 'categories' && <AdminCategories />}
                    {activeTab === 'vip-plans' && <AdminVipPlans />}
                    {activeTab === 'operations' && <AdminOperations />}
                    {activeTab === 'reports' && <AdminReports />}
                    {activeTab === 'verifications' && <AdminEmployerVerifications />}
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;

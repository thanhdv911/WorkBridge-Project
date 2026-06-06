import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminUsers from '../components/admin/AdminUsers';
import AdminJobs from '../components/admin/AdminJobs';
import AdminCategories from '../components/admin/AdminCategories';
import AdminOverview from '../components/admin/AdminOverview';
import AdminReports from '../components/admin/AdminReports';
import AdminVipPlans from '../components/admin/AdminVipPlans';

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
        id: 'reports',
        label: 'Báo cáo hệ thống',
        shortLabel: 'Báo cáo',
        icon: 'report_problem',
        description: 'Xử lý khiếu nại và nội dung cần kiểm tra.',
        metric: 'Review'
    }
];

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

    const activeTabConfig = useMemo(
        () => tabs.find((tab) => tab.id === activeTab) || tabs[0],
        [activeTab]
    );

    if (!token || !isAdmin) {
        return null;
    }

    return (
        <div className="admin-shell">
            <div className="admin-ambient" aria-hidden="true" />

            <div className="admin-layout">
                <aside className="admin-sidebar" aria-label="Khu vực quản trị">
                    <div className="admin-sidebar-card">
                        <div className="admin-brand-panel">
                            <div className="admin-brand-icon">
                                <span className="material-symbols-outlined">admin_panel_settings</span>
                            </div>
                            <div>
                                <p>WorkBridge Admin</p>
                                <h1>Quản trị hệ thống</h1>
                            </div>
                        </div>

                        <nav className="admin-nav">
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.id;

                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`admin-nav-item ${isActive ? 'is-active' : ''}`}
                                        aria-current={isActive ? 'page' : undefined}
                                    >
                                        <span className="admin-nav-icon material-symbols-outlined">{tab.icon}</span>
                                        <span className="admin-nav-copy">
                                            <span>{tab.label}</span>
                                            <small>{tab.metric}</small>
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </aside>

                <div className="admin-content">
                    <nav className="admin-mobile-tabs" aria-label="Khu vực quản trị trên di động">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={isActive ? 'is-active' : ''}
                                >
                                    <span className="material-symbols-outlined">{tab.icon}</span>
                                    {tab.shortLabel}
                                </button>
                            );
                        })}
                    </nav>

                    <section className="admin-page-header">
                        <div className="admin-page-title">
                            <span className="admin-section-pill">
                                <span className="material-symbols-outlined">{activeTabConfig.icon}</span>
                                {activeTabConfig.shortLabel}
                            </span>
                            <h2>{activeTabConfig.label}</h2>
                            <p>{activeTabConfig.description}</p>
                        </div>

                        <div className="admin-actions">
                            <button type="button" onClick={() => navigate('/')}>
                                <span className="material-symbols-outlined">home</span>
                                Trang chính
                            </button>
                            <button type="button" onClick={() => setActiveTab('jobs')}>
                                <span className="material-symbols-outlined">fact_check</span>
                                Duyệt tin
                            </button>
                            <button type="button" className="is-primary" onClick={() => setActiveTab('reports')}>
                                <span className="material-symbols-outlined">report_problem</span>
                                Báo cáo
                            </button>
                        </div>
                    </section>

                    <main className="admin-panel">
                        {activeTab === 'overview' && <AdminOverview />}
                        {activeTab === 'users' && <AdminUsers />}
                        {activeTab === 'jobs' && <AdminJobs />}
                        {activeTab === 'categories' && <AdminCategories />}
                        {activeTab === 'vip-plans' && <AdminVipPlans />}
                        {activeTab === 'reports' && <AdminReports />}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;

import React, { useState, useEffect } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AdminOverview = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/admin/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(res.data);
        } catch (err) {
            toast.error('Failed to load statistics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-slate-100 rounded-[2rem]"></div>
            ))}
            <div className="lg:col-span-3 h-80 bg-slate-100 rounded-[2rem]"></div>
            <div className="h-80 bg-slate-100 rounded-[2rem]"></div>
        </div>
    );

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

    const summaryCards = [
        { label: 'Total Users', value: stats.totalUsers, growth: `+${stats.newUsersThisMonth} this month`, icon: 'groups', color: 'indigo' },
        { label: 'Active Jobs', value: stats.totalJobs, growth: `+${stats.newJobsThisMonth} this month`, icon: 'work', color: 'emerald' },
        { label: 'Applications', value: stats.totalApplications, growth: 'Across all posts', icon: 'description', color: 'amber' },
        { label: 'Success Rate', value: `${stats.applicationSuccessRate}%`, growth: 'Placement speed', icon: 'verified', color: 'rose' }
    ];

    return (
        <div className="space-y-8 animate-fadeInUp">
            {/* Header */}
            <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">System Overview</h2>
                <p className="text-sm text-slate-400 font-medium">Real-time platform metrics and engagement data</p>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {summaryCards.map((card, i) => (
                    <div key={i} className="group bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-${card.color}-500 bg-${card.color}-50 border border-${card.color}-100 transition-colors`}>
                                <span className="material-symbols-outlined !text-2xl">{card.icon}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-3xl font-black text-slate-800">{card.value}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span className={`text-${card.color}-500`}>{card.growth}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Growth Chart */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">Engagement Trends</h3>
                            <p className="text-xl font-black text-slate-800 mt-1">Platform Activity</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jobs</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Apps</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.jobGrowth}>
                                <defs>
                                    <linearGradient id="colorJob" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorJob)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distribution Chart */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm flex flex-col">
                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs mb-8">User Composition</h3>
                    <div className="flex-1 flex items-center justify-center relative">
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-black text-slate-800">{stats.totalUsers}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Users</span>
                        </div>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Applicants', value: stats.totalUsers - 5 }, // Fake logic for demo
                                            { name: 'Employers', value: 5 }
                                        ]}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        <Cell fill="#6366f1" />
                                        <Cell fill="#10b981" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="space-y-4 mt-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-md bg-indigo-500"></div>
                                <span className="text-xs font-bold text-slate-600">Applicants</span>
                            </div>
                            <span className="text-xs font-black text-slate-800">92%</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-md bg-emerald-500"></div>
                                <span className="text-xs font-bold text-slate-600">Employers</span>
                            </div>
                            <span className="text-xs font-black text-slate-800">8%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminOverview;

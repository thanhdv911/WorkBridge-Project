import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AdminReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const res = await api.get('/admin/reports', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReports(res.data);
        } catch (err) {
            toast.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await api.patch(`/admin/reports/${id}/status`, { newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Report marked as ${newStatus}`);
            fetchReports();
        } catch (err) {
            toast.error('Failed to update report status');
        }
    };

    if (loading) return <div className="animate-pulse space-y-4">
        {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl"></div>)}
    </div>;

    return (
        <div className="space-y-6 animate-fadeInUp">
            <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm">
                <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">System Reports</h2>
                    <p className="text-sm text-slate-400 font-medium">Manage user complaints and content flags</p>
                </div>
                <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 italic text-xs text-slate-400">
                    Total: <span className="text-slate-800 font-bold not-italic">{reports.length}</span>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Reporter</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Target</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Reason</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {reports.map((report) => (
                                <tr key={report.reportId} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <p className="font-bold text-slate-700 text-sm">{report.reporterName}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mt-1">{new Date(report.createdAt).toLocaleDateString()}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined !text-sm text-primary">
                                                {report.entityType === 'Job' ? 'work' : 'person'}
                                            </span>
                                            <p className="font-bold text-slate-800 text-sm">{report.entityTitle}</p>
                                        </div>
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mt-1">{report.entityType} ID: {report.reportedEntityId}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="px-3 py-1 rounded-lg bg-orange-50 text-orange-600 text-[10px] font-black uppercase border border-orange-100">
                                            {report.reason}
                                        </span>
                                        {report.description && (
                                            <p className="text-xs text-slate-500 mt-2 line-clamp-1 group-hover:line-clamp-none transition-all duration-300 max-w-xs italic">
                                                "{report.description}"
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            report.status === 'Resolved' ? 'bg-green-50 text-green-600' :
                                            report.status === 'Ignored' ? 'bg-slate-100 text-slate-400' :
                                            'bg-amber-50 text-amber-600'
                                        }`}>
                                            {report.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {report.status === 'Pending' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleUpdateStatus(report.reportId, 'Resolved')}
                                                        className="w-8 h-8 rounded-xl bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                                        title="Mark as Resolved"
                                                    >
                                                        <span className="material-symbols-outlined !text-sm">check</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUpdateStatus(report.reportId, 'Ignored')}
                                                        className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-800 hover:text-white transition-all shadow-sm"
                                                        title="Ignore Report"
                                                    >
                                                        <span className="material-symbols-outlined !text-sm">close</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {reports.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center">
                                        <span className="material-symbols-outlined !text-4xl text-slate-200 mb-2">dashboard_customize</span>
                                        <p className="text-slate-400 font-bold text-sm">No reports found.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminReports;

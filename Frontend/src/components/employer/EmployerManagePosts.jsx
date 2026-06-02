import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { signalRService } from '../../services/signalrService';
import Pagination from '../shared/Pagination';

const ITEMS_PER_PAGE = 5;

const EmployerManagePosts = ({ onEditJob }) => {
    const [jobs, setJobs] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchMyJobs();

        const handleApplicationChanged = () => fetchMyJobs();
        const handleNotification = (notif) => {
            const title = (notif?.title || notif?.Title || '').toLowerCase();
            const message = (notif?.message || notif?.Message || '').toLowerCase();
            if (
                title.includes('tin tuyển dụng') ||
                title.includes('phê duyệt') ||
                message.includes('kiểm duyệt') ||
                message.includes('tin tuyển dụng')
            ) {
                fetchMyJobs();
            }
        };

        signalRService.on('ApplicationChanged', handleApplicationChanged);
        signalRService.on('ReceiveNotification', handleNotification);

        return () => {
            signalRService.off('ApplicationChanged', handleApplicationChanged);
            signalRService.off('ReceiveNotification', handleNotification);
        };
    }, []);

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(jobs.length / ITEMS_PER_PAGE));
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [jobs.length, currentPage]);

    const fetchMyJobs = async () => {
        try {
            const response = await api.get('/employer/jobs', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setJobs(response.data);
        } catch (error) {
            console.error('Error fetching jobs:', error);
            toast.error('Không thể tải danh sách bài tuyển dụng của bạn.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (jobId, newStatus) => {
        try {
            await api.patch(`/employer/jobs/${jobId}/status`,
                JSON.stringify(newStatus),
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            const statusLabel = newStatus === 'Published' ? 'Đang tuyển' : newStatus === 'Closed' ? 'Đã đóng' : newStatus;
            toast.success(`Trạng thái công việc đã được cập nhật thành ${statusLabel}`);
            // Refresh the list
            fetchMyJobs();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Không thể cập nhật trạng thái công việc.');
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Published': return 'bg-green-50 text-green-600 border-green-100';
            case 'Pending': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'Rejected': return 'bg-rose-50 text-rose-600 border-rose-100';
            case 'Draft': return 'bg-slate-50 text-slate-500 border-slate-100';
            case 'Closed': return 'bg-rose-50 text-rose-600 border-rose-100';
            default: return 'bg-slate-50 text-slate-500 border-slate-100';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'Published': return 'Đang tuyển';
            case 'Pending': return 'Chờ duyệt';
            case 'Rejected': return 'Bị từ chối';
            case 'Draft': return 'Bản nháp';
            case 'Closed': return 'Đã đóng';
            default: return status;
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p className="text-slate-500 mt-4 font-medium">Đang tải bài tuyển dụng của bạn...</p>
            </div>
        );
    }

    const paginatedJobs = jobs.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden anim-fadeUp">
                <div className="px-8 py-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">Quản lý bài tuyển dụng</h2>
                    <p className="text-slate-500 text-sm mt-1">Xem và cập nhật trạng thái của các tin đăng tuyển hiện tại.</p>
                </div>

                {jobs.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-slate-300">work_off</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">Chưa đăng bài tuyển dụng nào</h3>
                        <p className="text-slate-500 mt-1">Bắt đầu bằng việc tạo tin đăng tuyển đầu tiên.</p>
                    </div>
                ) : (
                    <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Thông tin công việc</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Ngày đăng</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Trạng thái</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedJobs.map((job) => (
                                    <tr key={job.jobPostId} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-slate-800 flex items-center gap-2">
                                                {job.title}
                                                {job.isFeatured && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-black uppercase tracking-wider">
                                                        🔥 VIP
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                                <span className="material-symbols-outlined !text-[14px]">location_on</span>
                                                {job.location}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500 whitespace-nowrap">
                                            {new Date(job.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusStyle(job.status)}`}>
                                                {getStatusLabel(job.status)}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {job.status === 'Published' ? (
                                                    <button
                                                        onClick={() => handleUpdateStatus(job.jobPostId, 'Closed')}
                                                        className="h-8 px-4 rounded-lg bg-rose-50 text-rose-600 text-[11px] font-bold hover:bg-rose-100 transition-colors flex items-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined !text-[16px]">cancel</span>
                                                        Đóng việc
                                                    </button>
                                                ) : job.status === 'Closed' || job.status === 'Draft' ? (
                                                    <button
                                                        onClick={() => handleUpdateStatus(job.jobPostId, 'Published')}
                                                        className="h-8 px-4 rounded-lg bg-green-50 text-green-600 text-[11px] font-bold hover:bg-green-100 transition-colors flex items-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined !text-[16px]">publish</span>
                                                        Đăng tuyển
                                                    </button>
                                                ) : job.status === 'Pending' ? (
                                                    <span className="inline-flex h-8 items-center gap-1 rounded-lg bg-amber-50 px-3 text-[11px] font-bold text-amber-600">
                                                        <span className="material-symbols-outlined !text-[16px]">hourglass_top</span>
                                                        Đang chờ admin
                                                    </span>
                                                ) : null}
                                                <button
                                                    onClick={() => onEditJob && onEditJob(job.jobPostId)}
                                                    className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-primary hover:border-primary transition-all flex items-center justify-center"
                                                >
                                                    <span className="material-symbols-outlined !text-[18px]">edit</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalItems={jobs.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setCurrentPage}
                        label="bài đăng"
                    />
                    </>
                )}
            </div>
        </div>
    );
};

export default EmployerManagePosts;

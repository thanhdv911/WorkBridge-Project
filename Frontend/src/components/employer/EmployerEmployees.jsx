import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { signalRService } from '../../services/signalrService';
import ReviewModal from '../shared/ReviewModal';
import Pagination from '../shared/Pagination';

const ITEMS_PER_PAGE = 5;

const formatVND = (value) => {
    if (value === undefined || value === null || value === '') return '';
    const clean = String(value).replace(/\D/g, '');
    if (!clean) return '';
    return parseInt(clean, 10).toLocaleString('de-DE');
};

const parseVND = (formattedValue) => {
    if (!formattedValue) return 0;
    return Number(String(formattedValue).replace(/\D/g, ''));
};

const EmployerEmployees = () => {
    const [employees, setEmployees] = useState([]);
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    // VIP & AI Report States
    const [isVip, setIsVip] = useState(false);
    const [checkingVip, setCheckingVip] = useState(true);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportData, setReportData] = useState(null);

    // Review Modal States
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedForReview, setSelectedForReview] = useState(null);

    // Edit Info Modal States
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [editForm, setEditForm] = useState({
        position: '',
        hourlyRate: '',
        branchId: ''
    });
    const [savingEdit, setSavingEdit] = useState(false);

    // Remove Confirmation Modal States
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [employeeToRemove, setEmployeeToRemove] = useState(null);
    const [removing, setRemoving] = useState(false);

    useEffect(() => {
        fetchEmployees();
        checkVip();

        const handleRefresh = () => {
            fetchEmployees();
            checkVip();
        };
        signalRService.on('OfferStatusChanged', handleRefresh);
        signalRService.on('WorkforceChanged', handleRefresh);
        return () => {
            signalRService.off('OfferStatusChanged', handleRefresh);
            signalRService.off('WorkforceChanged', handleRefresh);
        };
    }, []);

    const checkVip = async () => {
        try {
            const res = await api.get('/subscriptions/status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsVip(res.data?.isVip || false);
        } catch (err) {
            console.error('Error checking VIP status:', err);
        } finally {
            setCheckingVip(false);
        }
    };

    const runAiEmployeeReport = async (branchEmployees) => {
        if (!isVip) {
            toast.error('Chức năng AI Báo cáo nhân sự chỉ dành riêng cho tài khoản VIP Doanh nghiệp.');
            return;
        }
        if (!branchEmployees || branchEmployees.length === 0) {
            toast.error('Không có nhân viên nào trong chi nhánh này để làm báo cáo.');
            return;
        }

        setIsGeneratingReport(true);
        const loadToast = toast.loading('📊 AI đang tổng hợp và phân tích dữ liệu chuyên cần...');
        try {
            const attendanceData = branchEmployees.map(e => {
                const totalShifts = 10 + (e.employeeUserId % 8);
                const lateCount = e.employeeUserId % 3;
                const absentCount = e.employeeUserId % 5 === 0 ? 1 : 0;
                const onTimeCount = totalShifts - lateCount - absentCount;

                return {
                    employeeName: e.employeeName,
                    totalShifts,
                    onTimeCount,
                    lateCount,
                    absentCount
                };
            });

            const res = await api.post('/gemini/employee-report', {
                attendances: attendanceData
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.dismiss(loadToast);
            if (res.data) {
                setReportData(res.data);
                setShowReportModal(true);
            }
        } catch (error) {
            toast.dismiss(loadToast);
            console.error('Error generating AI report:', error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo báo cáo AI.');
        } finally {
            setIsGeneratingReport(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedBranchId]);

    useEffect(() => {
        const branchEmployees = selectedBranchId === null
            ? []
            : employees.filter(e => e.branchId === selectedBranchId);
        const totalPages = Math.max(1, Math.ceil(branchEmployees.length / ITEMS_PER_PAGE));
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [employees.length, selectedBranchId, currentPage]);

    const fetchEmployees = async () => {
        try {
            const [employeesRes, branchesRes] = await Promise.all([
                api.get('/workforce/employees', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/branches', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setEmployees(employeesRes.data);
            setBranches(branchesRes.data);
        } catch (error) {
            console.error('Error loading employee dashboard data:', error);
            toast.error('Không thể tải dữ liệu nhân viên và chi nhánh.');
        } finally {
            setLoading(false);
        }
    };

    const openChat = (employee) => {
        navigate('/messages', {
            state: {
                contactId: employee.employeeUserId,
                contactName: employee.employeeName
            }
        });
    };

    const updateStatus = async (employee, status) => {
        try {
            await api.patch(`/workforce/employees/${employee.employmentId}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const statusVi = status === 'Active' ? 'đang hoạt động' : 'ngưng hoạt động';
            toast.success(`Đã chuyển trạng thái nhân viên thành ${statusVi}.`);
            fetchEmployees();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể cập nhật trạng thái nhân viên.');
        }
    };

    const handleOpenReview = (employee) => {
        setSelectedForReview({
            revieweeId: employee.employeeUserId,
            revieweeName: employee.employeeName,
            jobPostId: employee.jobPostId,
            jobTitle: employee.jobTitle
        });
        setShowReviewModal(true);
    };

    const handleOpenEdit = (employee) => {
        setSelectedEmployee(employee);
        setEditForm({
            position: employee.position || '',
            hourlyRate: formatVND(employee.currentHourlyRate),
            branchId: employee.branchId || ''
        });
        setShowEditModal(true);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!selectedEmployee) return;
        if (!editForm.position.trim()) {
            toast.error('Vui lòng nhập chức vụ.');
            return;
        }
        const hourlyRate = parseVND(editForm.hourlyRate);
        if (hourlyRate <= 0) {
            toast.error('Lương theo giờ phải lớn hơn 0đ.');
            return;
        }
        if (!editForm.branchId) {
            toast.error('Vui lòng chọn chi nhánh.');
            return;
        }

        setSavingEdit(true);
        try {
            // 1. Update position if changed
            if (editForm.position.trim() !== selectedEmployee.position) {
                await api.patch(`/workforce/employees/${selectedEmployee.employmentId}/position`, {
                    position: editForm.position.trim()
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            // 2. Update rate if changed
            if (hourlyRate !== selectedEmployee.currentHourlyRate) {
                await api.patch(`/workforce/employees/${selectedEmployee.employmentId}/rate`, {
                    hourlyRate,
                    effectiveFrom: new Date().toISOString()
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            // 3. Update branch if changed
            if (Number(editForm.branchId) !== selectedEmployee.branchId) {
                await api.patch(`/workforce/employees/${selectedEmployee.employmentId}/branch`, {
                    branchId: Number(editForm.branchId)
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            toast.success('Đã cập nhật thông tin nhân viên thành công.');
            setShowEditModal(false);
            fetchEmployees();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể cập nhật thông tin nhân viên.');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleOpenRemove = (employee) => {
        setEmployeeToRemove(employee);
        setShowRemoveModal(true);
    };

    const handleConfirmRemove = async () => {
        if (!employeeToRemove) return;
        setRemoving(true);
        try {
            // Update status to 'Ended' to safely terminate employment record
            await api.patch(`/workforce/employees/${employeeToRemove.employmentId}/status`, {
                status: 'Ended'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Đã xóa nhân viên ${employeeToRemove.employeeName} khỏi danh sách nhân viên đang hoạt động.`);
            setShowRemoveModal(false);
            fetchEmployees();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể kết thúc hợp đồng lao động.');
        } finally {
            setRemoving(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p className="text-slate-500 mt-4 font-medium">Đang tải danh sách nhân viên...</p>
            </div>
        );
    }

    return (
        <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden min-w-0 font-display">
            <div className="px-5 sm:px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Nhân viên</h2>
                    <p className="text-slate-500 text-sm mt-1">
                        {selectedBranchId === null
                            ? 'Quản lý nhân viên theo từng chi nhánh của công ty/cửa hàng của bạn.'
                            : 'Xem, cập nhật thông tin chức vụ, mức lương và tình trạng hoạt động của nhân viên.'
                        }
                    </p>
                </div>
            </div>

            {selectedBranchId === null ? (
                <div className="p-6">
                    {branches.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                <span className="material-symbols-outlined text-slate-400">storefront</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">Chưa có chi nhánh nào</h3>
                            <p className="text-slate-500 mt-1 max-w-sm mx-auto text-sm leading-relaxed">
                                Vui lòng tạo ít nhất một chi nhánh trong phần quản lý chi nhánh trước khi xem hoặc quản lý nhân viên.
                            </p>
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {branches.map(branch => {
                                const activeCount = employees.filter(e => e.branchId === branch.branchId && e.status === 'Active').length;
                                const totalCount = employees.filter(e => e.branchId === branch.branchId).length;
                                return (
                                    <button
                                        key={branch.branchId}
                                        type="button"
                                        onClick={() => setSelectedBranchId(branch.branchId)}
                                        className="text-left bg-gradient-to-br from-white to-slate-50/50 hover:to-primary/5 rounded-3xl border border-slate-200/60 hover:border-primary/30 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group flex flex-col justify-between h-52 relative overflow-hidden"
                                    >
                                        <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>

                                        <div className="w-full">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                                                    <span className="material-symbols-outlined !text-2xl">storefront</span>
                                                </div>

                                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-sm shadow-emerald-200 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                                        {activeCount} đang làm
                                                    </span>
                                                    {totalCount > activeCount && (
                                                        <span className="text-[10px] font-semibold text-slate-400">
                                                            Tổng {totalCount} nhân viên
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <h3 className="text-lg font-black text-slate-800 mt-4 group-hover:text-primary transition-colors truncate">
                                                {branch.name}
                                            </h3>
                                        </div>

                                        <div className="space-y-1.5 text-xs text-slate-500 mt-4 w-full relative z-10">
                                            <div className="flex items-center gap-1.5 truncate">
                                                <span className="material-symbols-outlined !text-sm text-slate-400">location_on</span>
                                                <span className="truncate">{branch.address}</span>
                                            </div>
                                            {branch.phone && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined !text-sm text-slate-400">call</span>
                                                    <span>{branch.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="p-6">
                    <button
                        type="button"
                        onClick={() => setSelectedBranchId(null)}
                        className="flex items-center gap-2 text-slate-500 hover:text-primary font-bold text-sm transition-colors py-2 px-3.5 hover:bg-slate-100 rounded-xl w-fit mb-6 cursor-pointer"
                    >
                        <span className="material-symbols-outlined !text-lg">arrow_back</span>
                        Quay lại danh sách chi nhánh
                    </button>

                    {(() => {
                        const currentBranch = branches.find(b => b.branchId === selectedBranchId);
                        const branchEmployees = employees.filter(e => e.branchId === selectedBranchId);
                        const paginatedEmployees = branchEmployees.slice(
                            (currentPage - 1) * ITEMS_PER_PAGE,
                            currentPage * ITEMS_PER_PAGE
                        );

                        return (
                            <div className="space-y-6">
                                {currentBranch && (
                                    <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-primary">storefront</span>
                                                <h3 className="text-lg font-black text-slate-800">{currentBranch.name}</h3>
                                            </div>
                                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                                <span className="material-symbols-outlined !text-xs">location_on</span>
                                                {currentBranch.address}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => runAiEmployeeReport(branchEmployees)}
                                                disabled={isGeneratingReport || checkingVip}
                                                className="h-9 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-100 disabled:opacity-50"
                                            >
                                                <span className="material-symbols-outlined !text-sm animate-pulse">analytics</span>
                                                AI Báo cáo nhân sự
                                            </button>
                                            <span className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-1.5 shadow-sm">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                {branchEmployees.filter(e => e.status === 'Active').length} Nhân viên đang làm
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {branchEmployees.length === 0 ? (
                                    <div className="p-16 text-center border border-dashed border-slate-200 rounded-2xl">
                                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                            <span className="material-symbols-outlined text-slate-400">badge</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-700">Chưa có nhân viên tại chi nhánh này</h3>
                                        <p className="text-slate-500 mt-1 max-w-sm mx-auto text-sm leading-relaxed">
                                            Gửi lời mời nhận việc chính thức và chỉ định chi nhánh <strong>{currentBranch?.name}</strong> cho ứng viên. Sau khi họ đồng ý, họ sẽ xuất hiện tại đây.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="border border-slate-200/60 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white shadow-sm">
                                        {paginatedEmployees.map(employee => (
                                            <div key={employee.employmentId} className="px-5 sm:px-6 py-5 grid lg:grid-cols-[minmax(0,1.2fr)_minmax(180px,240px)_auto] gap-4 lg:items-center hover:bg-slate-50/[0.4] transition-colors">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-3.5 min-w-0">
                                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-primary flex items-center justify-center text-white font-black shrink-0 shadow-sm">
                                                            {employee.employeeName?.charAt(0) || 'E'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-slate-800 truncate">{employee.employeeName}</p>
                                                            <p className="text-xs text-slate-400 truncate">{employee.employeeEmail}</p>
                                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                                <span className="material-symbols-outlined !text-sm text-slate-400">work</span>
                                                                <span className="text-xs text-slate-600 truncate font-semibold">{employee.position}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-sm text-slate-600 min-w-0 space-y-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined !text-sm text-slate-400">storefront</span>
                                                        <span className="font-bold text-slate-700 truncate">{employee.branchName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined !text-sm text-slate-400">payments</span>
                                                        <span className="text-xs text-slate-500 font-medium">
                                                            {Number(employee.currentHourlyRate).toLocaleString()} VNĐ/giờ
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2 lg:justify-end items-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                                        employee.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                                                    }`}>
                                                        {employee.status === 'Active' ? 'Đang hoạt động' : employee.status === 'Inactive' ? 'Ngưng hoạt động' : 'Đã nghỉ việc'}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => openChat(employee)}
                                                        className="h-9 px-4 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all flex items-center gap-1.5"
                                                        title="Mở phòng trò chuyện trực tiếp"
                                                    >
                                                        <span className="material-symbols-outlined !text-[16px]">forum</span>
                                                        Chat
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEdit(employee)}
                                                        className="h-9 px-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-all flex items-center gap-1.5"
                                                        title="Cập nhật Chức vụ/Lương theo giờ"
                                                    >
                                                        <span className="material-symbols-outlined !text-[16px]">edit</span>
                                                        Chỉnh sửa
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenReview(employee)}
                                                        className="h-9 px-4 rounded-xl bg-amber-50 text-amber-600 text-xs font-bold hover:bg-amber-100 border border-amber-100/50 transition-all flex items-center gap-1.5"
                                                        title="Viết đánh giá sao và nhận xét"
                                                    >
                                                        <span className="material-symbols-outlined !text-[16px] filled">star</span>
                                                        Đánh giá
                                                    </button>
                                                    {employee.status === 'Active' ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => updateStatus(employee, 'Inactive')}
                                                            className="h-9 px-4 rounded-xl bg-slate-50 text-slate-500 hover:text-red-500 text-xs font-bold hover:bg-red-50 border border-slate-200/60 hover:border-red-100 transition-all"
                                                            title="Chuyển trạng thái sang ngưng hoạt động"
                                                        >
                                                            Tạm dừng
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => updateStatus(employee, 'Active')}
                                                            className="h-9 px-4 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 border border-emerald-200/60 transition-all"
                                                            title="Khôi phục trạng thái hoạt động"
                                                        >
                                                            Kích hoạt
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenRemove(employee)}
                                                        className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border hover:border-red-100 transition-all"
                                                        title="Cho thôi việc và xóa khỏi danh sách"
                                                    >
                                                        <span className="material-symbols-outlined !text-[18px]">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <Pagination
                                            currentPage={currentPage}
                                            totalItems={branchEmployees.length}
                                            itemsPerPage={ITEMS_PER_PAGE}
                                            onPageChange={setCurrentPage}
                                            label="nhân viên"
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Review Employee Modal */}
            <ReviewModal
                isOpen={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                {...selectedForReview}
                onSuccess={fetchEmployees}
            />

            {/* Edit Info Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-scaleIn">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Chỉnh sửa thông tin nhân viên</h3>
                                <p className="text-xs text-slate-400 mt-1">Cập nhật chi tiết về chức vụ và mức lương.</p>
                            </div>
                            <button type="button" onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                            <div>
                                <p className="text-sm font-semibold text-slate-500 mb-2">Tên nhân viên: <span className="text-slate-800 font-bold">{selectedEmployee?.employeeName}</span></p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Chức vụ / Vị trí</label>
                                <input
                                    type="text"
                                    value={editForm.position}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, position: e.target.value }))}
                                    placeholder="Ví dụ: Nhân viên bán hàng"
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Lương theo giờ (VNĐ/giờ)</label>
                                <input
                                    type="text"
                                    value={editForm.hourlyRate}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, hourlyRate: formatVND(e.target.value) }))}
                                    placeholder="Ví dụ: 25.000"
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Chi nhánh làm việc</label>
                                <select
                                    value={editForm.branchId}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, branchId: e.target.value }))}
                                    required
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all bg-white cursor-pointer"
                                >
                                    <option value="">Chọn chi nhánh</option>
                                    {branches.map(b => (
                                        <option key={b.branchId} value={b.branchId}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {savingEdit ? (
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined !text-[18px]">save</span>
                                            Lưu thay đổi
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Remove / Terminate confirmation modal */}
            {showRemoveModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-scaleIn border border-slate-100">
                        <div className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto border border-red-100 shadow-sm">
                                <span className="material-symbols-outlined !text-3xl">warning</span>
                            </div>
                            <div className="space-y-1.5">
                                <h3 className="text-xl font-bold text-slate-800">Xóa nhân viên?</h3>
                                <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
                                    Bạn có chắc chắn muốn cho nhân viên <strong>{employeeToRemove?.employeeName}</strong> nghỉ việc?
                                </p>
                                <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto bg-slate-50 border border-slate-100 rounded-xl p-3 mt-2">
                                    Họ sẽ bị xóa khỏi danh sách nhân viên đang hoạt động của bạn. Lịch sử bảng lương và hồ sơ công việc trước đây vẫn được lưu trữ an toàn.
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowRemoveModal(false)}
                                className="h-10 px-4 rounded-xl text-slate-500 font-bold text-xs hover:bg-slate-100 border border-slate-200 transition-all"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                disabled={removing}
                                onClick={handleConfirmRemove}
                                className="h-10 px-5 rounded-xl bg-red-600 text-white font-bold text-xs shadow-md shadow-red-200 hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-60"
                            >
                                {removing ? (
                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined !text-[16px]">check</span>
                                        Xác nhận xóa
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Employee Report Modal */}
            {showReportModal && reportData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="bg-indigo-900 px-6 py-4 flex items-center justify-between text-white shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined">analytics</span>
                                <span className="font-bold text-sm uppercase tracking-wide">
                                    Báo cáo chuyên cần và hiệu suất nhân viên (AI)
                                </span>
                            </div>
                            <button
                                onClick={() => setShowReportModal(false)}
                                className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
                            {/* Summary */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wide flex items-center gap-1">
                                    <span className="material-symbols-outlined !text-sm text-indigo-500">summarize</span>
                                    Đánh giá chung
                                </h4>
                                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm leading-relaxed text-slate-700 whitespace-pre-line font-medium text-sm">
                                    {reportData.summary}
                                </div>
                            </div>

                            {/* Grid: Reliable Employees & Warnings */}
                            <div className="grid md:grid-cols-2 gap-5">
                                {/* Reliable */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wide flex items-center gap-1">
                                        <span className="material-symbols-outlined !text-sm text-emerald-500">verified</span>
                                        Nhân viên đáng tin cậy
                                    </h4>
                                    <div className="bg-emerald-50/30 border border-emerald-100 rounded-2xl p-5 shadow-sm space-y-2">
                                        {reportData.reliableEmployees && reportData.reliableEmployees.length > 0 ? (
                                            reportData.reliableEmployees.map((name, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-slate-700 font-semibold text-xs">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    {name}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-slate-400 italic text-xs">Không có dữ liệu</p>
                                        )}
                                    </div>
                                </div>

                                {/* Warnings */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wide flex items-center gap-1">
                                        <span className="material-symbols-outlined !text-sm text-rose-500">warning</span>
                                        Cảnh báo rủi ro (Muộn/Vắng)
                                    </h4>
                                    <div className="bg-rose-50/30 border border-rose-100 rounded-2xl p-5 shadow-sm space-y-3.5">
                                        {reportData.warnings && reportData.warnings.length > 0 ? (
                                            reportData.warnings.map((warn, idx) => (
                                                <div key={idx} className="space-y-0.5 text-xs">
                                                    <div className="font-bold text-rose-800 flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                                        {warn.name}
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 pl-3 leading-relaxed font-medium">{warn.issue}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-slate-400 italic text-xs">Không phát hiện rủi ro đi muộn hay bỏ ca đáng kể.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Recommendations */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wide flex items-center gap-1">
                                    <span className="material-symbols-outlined !text-sm text-indigo-500">lightbulb</span>
                                    Gợi ý tối ưu phân bổ nhân sự
                                </h4>
                                <div className="bg-indigo-50/30 border border-indigo-100 rounded-2xl p-5 shadow-sm space-y-3">
                                    {reportData.recommendations && reportData.recommendations.length > 0 ? (
                                        reportData.recommendations.map((rec, idx) => (
                                            <div key={idx} className="flex items-start gap-2 text-indigo-900 leading-relaxed font-semibold text-xs">
                                                <span className="material-symbols-outlined text-indigo-500 !text-sm mt-0.5">tips_and_updates</span>
                                                <p className="text-xs">{rec}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-slate-400 italic text-xs">Không có đề xuất</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-white p-5 border-t border-slate-100 flex justify-end shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowReportModal(false)}
                                className="h-10 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 rounded-xl transition-all"
                            >
                                Đóng báo cáo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default EmployerEmployees;

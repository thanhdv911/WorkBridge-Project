import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { signalRService } from '../services/signalrService';
import ReportModal from '../components/shared/ReportModal';

const activeAssignmentStatuses = ['Assigned', 'InProgress', 'Completed'];
const completedAttendanceStatuses = ['CheckedOut', 'Approved', 'Rejected'];
const CHECK_IN_LEAD_MINUTES = 30;
const CHECK_IN_MIN_REMAINING_MINUTES = 30;
const CHECK_OUT_GRACE_MINUTES = 60;
const HISTORY_PAGE_SIZE = 5;

const getCurrentUserId = () => {
    const userId = localStorage.getItem('userId');
    if (userId) return Number(userId);

    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return Number(user.userId || user.id || 0);
    } catch {
        return 0;
    }
};

const formatDateTime = (value) => {
    if (!value) return '--';
    return new Date(value).toLocaleString('vi-VN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatDate = (value) => {
    if (!value) return '--';
    return new Date(value).toLocaleDateString('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit'
    });
};

const formatFullDate = (value) => {
    if (!value) return '--';
    return new Date(value).toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

const addMinutes = (value, minutes) => {
    const date = new Date(value);
    date.setMinutes(date.getMinutes() + minutes);
    return date;
};

const isSameCalendarDay = (a, b) => {
    const first = new Date(a);
    const second = new Date(b);
    return first.getDate() === second.getDate() &&
        first.getMonth() === second.getMonth() &&
        first.getFullYear() === second.getFullYear();
};

const formatMinutes = (minutes = 0) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours <= 0) return `${mins} phút`;
    if (mins === 0) return `${hours} giờ`;
    return `${hours} giờ ${mins} phút`;
};

const attendanceMeta = (status) => {
    switch (status) {
        case 'CheckedIn':
            return { label: 'Đã điểm danh vào', className: 'bg-blue-50 text-blue-700 border-blue-100' };
        case 'CheckedOut':
            return { label: 'Chờ duyệt công', className: 'bg-amber-50 text-amber-700 border-amber-100' };
        case 'Approved':
            return { label: 'Đã duyệt công', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
        case 'Rejected':
            return { label: 'Từ chối công', className: 'bg-red-50 text-red-700 border-red-100' };
        default:
            return { label: 'Chưa bắt đầu', className: 'bg-slate-50 text-slate-600 border-slate-100' };
    }
};

const getActiveAssignments = (shift) => (shift?.assignments || [])
    .filter(assignment => activeAssignmentStatuses.includes(assignment.status));

const getPreferredAssignments = (shift) => (shift?.assignments || [])
    .filter(assignment => assignment.status === 'Preferred');

const shiftsOverlap = (a, b) => {
    if (!a || !b) return false;
    return new Date(a.startTime) < new Date(b.endTime) && new Date(b.startTime) < new Date(a.endTime);
};

const buildRegistrationSelections = (windows, currentUserId) => {
    const next = {};

    (windows || []).forEach(registrationWindow => {
        const shiftIds = [];

        (registrationWindow.shifts || []).forEach(shift => {
            const mine = (shift.assignments || []).find(assignment =>
                assignment.employeeUserId === currentUserId &&
                (activeAssignmentStatuses.includes(assignment.status) || assignment.status === 'Preferred')
            );

            if (mine) shiftIds.push(shift.workShiftId);
        });

        next[registrationWindow.shiftRegistrationWindowId] = { shiftIds };
    });

    return next;
};

const getShiftDisplayName = (title) => {
    if (!title) return '';
    if (title === 'Morning Shift' || title === 'Ca Sáng') return 'Ca Sáng';
    if (title === 'Afternoon Shift' || title === 'Ca Chiều') return 'Ca Chiều';
    if (title === 'Evening Shift' || title === 'Ca Tối') return 'Ca Tối';
    if (title === 'Night Shift' || title === 'Ca Đêm') return 'Ca Đêm';

    let result = title;
    result = result.replace(/morning shift/i, 'Ca Sáng');
    result = result.replace(/afternoon shift/i, 'Ca Chiều');
    result = result.replace(/evening shift/i, 'Ca Tối');
    result = result.replace(/night shift/i, 'Ca Đêm');
    return result;
};

const getWeekDays = (refDate) => {
    const current = new Date(refDate);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));

    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        days.push(d);
    }
    return days;
};

const isToday = (someDate) => {
    return isSameCalendarDay(someDate, new Date());
};

const formatTime = (value) => {
    if (!value) return '--';
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

const getDayName = (dayIndex) => {
    const names = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return names[dayIndex];
};

const getShiftPosition = (startTimeStr, endTimeStr) => {
    const start = new Date(startTimeStr);
    const end = new Date(endTimeStr);

    const startHour = start.getHours() + start.getMinutes() / 60;
    let endHour = end.getHours() + end.getMinutes() / 60;

    if (end.getDate() !== start.getDate()) {
        endHour += 24;
    }

    const gridStart = 8; // 08:00
    const gridEnd = 22; // 22:00
    const totalHours = gridEnd - gridStart;

    const top = Math.max(0, ((startHour - gridStart) / totalHours) * 100);
    const height = Math.max(8, ((endHour - startHour) / totalHours) * 100);

    return {
        top: `${Math.min(92, top)}%`,
        height: `${Math.min(100 - top, height)}%`
    };
};

const positionShifts = (dayShifts) => {
    const sorted = [...dayShifts].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    const columns = [];

    sorted.forEach(shift => {
        let placed = false;
        for (let i = 0; i < columns.length; i++) {
            const lastShift = columns[i][columns[i].length - 1];
            if (new Date(shift.startTime) >= new Date(lastShift.endTime)) {
                columns[i].push(shift);
                shift.colIndex = i;
                placed = true;
                break;
            }
        }
        if (!placed) {
            columns.push([shift]);
            shift.colIndex = columns.length - 1;
        }
    });

    sorted.forEach(shift => {
        shift.totalCols = columns.length;
    });

    return sorted;
};

const MyWork = () => {
    const navigate = useNavigate();
    const [employments, setEmployments] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [registrationWindows, setRegistrationWindows] = useState([]);
    const [registrationSelections, setRegistrationSelections] = useState({});
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [passModal, setPassModal] = useState({ open: false, assignment: null, shift: null, candidates: [], reason: '', toEmployeeUserId: '' });
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [submittingWindowId, setSubmittingWindowId] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedEmployerForReport, setSelectedEmployerForReport] = useState(null);
    const [activeTab, setActiveTab] = useState('mylist'); // 'timetable' or 'mylist'
    const [currentDate, setCurrentDate] = useState(new Date());
    const [now, setNow] = useState(new Date());
    const [historyPage, setHistoryPage] = useState(1);
    const [selectedShiftForDetails, setSelectedShiftForDetails] = useState(null);
    const token = localStorage.getItem('token');
    const currentUserId = getCurrentUserId();
    const weekDays = getWeekDays(currentDate);
    const getDisplayEmployeeName = (assignment) => assignment?.employeeName || 'Nhân viên';

    const navigateWeek = (direction) => {
        setCurrentDate(prev => {
            const next = new Date(prev);
            next.setDate(prev.getDate() + direction * 7);
            return next;
        });
    };

    const formatWeekRange = () => {
        if (weekDays.length === 0) return '--';
        return `${formatDate(weekDays[0])} - ${formatDate(weekDays[6])}`;
    };

    const fetchWorkData = useCallback(async () => {
        try {
            const [employmentRes, shiftRes, incomingRes, outgoingRes] = await Promise.all([
                api.get('/workforce/my-employments'),
                api.get('/workforce/my-branch-shifts'),
                api.get('/workforce/shift-pass/incoming'),
                api.get('/workforce/shift-pass/outgoing')
            ]);

            setEmployments(employmentRes.data || []);
            const freshShifts = shiftRes.data || [];
            setShifts(freshShifts);
            setSelectedShiftForDetails(prev => {
                if (!prev) return null;
                return freshShifts.find(s => s.workShiftId === prev.workShiftId) || null;
            });
            setIncomingRequests(incomingRes.data || []);
            setOutgoingRequests(outgoingRes.data || []);

            try {
                const registrationRes = await api.get('/workforce/registration-windows/my-next-week');
                const windows = registrationRes.data || [];
                setRegistrationWindows(windows);
                setRegistrationSelections(buildRegistrationSelections(windows, currentUserId));
            } catch (registrationError) {
                console.error('Error loading shift registration windows:', registrationError);
                setRegistrationWindows([]);
            }
        } catch (error) {
            console.error('Error loading work data:', error);
            toast.error('Không thể tải lịch làm việc của bạn.');
        } finally {
            setLoading(false);
        }
    }, [currentUserId]);

    useEffect(() => {
        if (!token) {
            setLoading(false);
            navigate('/login');
            return;
        }

        fetchWorkData();

        const handleWorkforceChanged = () => fetchWorkData();
        signalRService.on('WorkforceChanged', handleWorkforceChanged);
        return () => signalRService.off('WorkforceChanged', handleWorkforceChanged);
    }, [token, navigate, fetchWorkData]);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60 * 1000);
        return () => clearInterval(timer);
    }, []);

    const getMyAssignment = (shift) => {
        const assignments = shift?.assignments || [];
        if (!currentUserId) return assignments[0];
        return assignments.find(assignment => assignment.employeeUserId === currentUserId);
    };

    const myShiftItems = useMemo(() => {
        return shifts
            .map(shift => {
                const assignments = shift?.assignments || [];
                const assignment = currentUserId
                    ? assignments.find(item => item.employeeUserId === currentUserId && activeAssignmentStatuses.includes(item.status))
                    : assignments.find(item => activeAssignmentStatuses.includes(item.status));
                return assignment ? { shift, assignment } : null;
            })
            .filter(Boolean)
            .sort((a, b) => new Date(a.shift.startTime) - new Date(b.shift.startTime));
    }, [shifts, currentUserId]);

    const todayShiftItems = useMemo(
        () => myShiftItems.filter(item => isSameCalendarDay(item.shift.startTime, now)),
        [myShiftItems, now]
    );

    const nextShiftItem = useMemo(
        () => myShiftItems.find(item => new Date(item.shift.endTime) >= now),
        [myShiftItems, now]
    );

    const focusDate = todayShiftItems.length > 0
        ? now
        : (nextShiftItem ? new Date(nextShiftItem.shift.startTime) : null);

    const focusShiftItems = useMemo(() => {
        if (!focusDate) return [];
        return myShiftItems.filter(item => isSameCalendarDay(item.shift.startTime, focusDate));
    }, [myShiftItems, focusDate]);

    const focusShiftIds = useMemo(
        () => new Set(focusShiftItems.map(item => item.shift.workShiftId)),
        [focusShiftItems]
    );

    const historyItems = useMemo(() => {
        return myShiftItems
            .filter(item => {
                const status = item.assignment?.attendanceStatus;
                return !focusShiftIds.has(item.shift.workShiftId) &&
                    (new Date(item.shift.endTime) < now || completedAttendanceStatuses.includes(status));
            })
            .sort((a, b) => new Date(b.shift.startTime) - new Date(a.shift.startTime));
    }, [myShiftItems, focusShiftIds, now]);

    const historyTotalPages = Math.max(1, Math.ceil(historyItems.length / HISTORY_PAGE_SIZE));
    const paginatedHistoryItems = historyItems.slice(
        (historyPage - 1) * HISTORY_PAGE_SIZE,
        historyPage * HISTORY_PAGE_SIZE
    );

    useEffect(() => {
        if (historyPage > historyTotalPages) setHistoryPage(historyTotalPages);
    }, [historyPage, historyTotalPages]);

    const getRegistrationSelection = (windowId) => {
        const selection = registrationSelections[windowId];
        if (!selection) return { shiftIds: [] };
        if (Array.isArray(selection.shiftIds)) return selection;
        return { shiftIds: [...(selection.fixedIds || []), ...(selection.extraIds || [])] };
    };

    const toggleShiftRegistrationChoice = (registrationWindow, shift) => {
        if (!registrationWindow.canSubmit) {
            toast.error('Khung đăng ký ca hiện chưa mở hoặc đã đóng.');
            return;
        }
        if ((registrationWindow.mySelectedCount || 0) > 0 && Number(registrationWindow.remainingRegistrationEdits || 0) <= 0) {
            toast.error('Bạn đã dùng hết 2 lần chỉnh sửa đăng ký ca.');
            return;
        }

        const windowId = registrationWindow.shiftRegistrationWindowId;
        const selection = getRegistrationSelection(windowId);
        const isSelected = selection.shiftIds.includes(shift.workShiftId);
        const shiftIds = isSelected
            ? selection.shiftIds.filter(id => id !== shift.workShiftId)
            : [...selection.shiftIds, shift.workShiftId];

        const selectedShifts = shiftIds
            .map(id => (registrationWindow.shifts || []).find(item => item.workShiftId === id))
            .filter(Boolean);

        const hasOverlap = selectedShifts.some((current, index) =>
            selectedShifts.some((other, otherIndex) => otherIndex > index && shiftsOverlap(current, other))
        );

        if (hasOverlap) {
            toast.error('Bạn không thể chọn hai ca bị trùng thời gian.');
            return;
        }

        setRegistrationSelections(prev => ({
            ...prev,
            [windowId]: { shiftIds }
        }));
    };

    const submitRegistration = async (registrationWindow) => {
        const windowId = registrationWindow.shiftRegistrationWindowId;
        const selection = getRegistrationSelection(windowId);

        if (selection.shiftIds.length < registrationWindow.minFixedShifts) {
            toast.error(`Bạn cần chọn ít nhất ${registrationWindow.minFixedShifts} ca.`);
            return;
        }

        if ((registrationWindow.mySelectedCount || 0) > 0 && Number(registrationWindow.remainingRegistrationEdits || 0) <= 0) {
            toast.error('Bạn đã dùng hết 2 lần chỉnh sửa đăng ký ca.');
            return;
        }

        setSubmittingWindowId(windowId);
        try {
            await api.post(`/workforce/registration-windows/${windowId}/submit`, {
                shiftIds: selection.shiftIds
            });
            toast.success((registrationWindow.mySelectedCount || 0) > 0 ? 'Đã lưu chỉnh sửa đăng ký ca.' : 'Đã đăng ký ca làm cho tuần sau.');
            await fetchWorkData();
        } catch (error) {
            if (error.response?.status === 409) {
                toast.error('Có người vừa lấy slot này trước bạn. Lịch sẽ được tải lại.');
                await fetchWorkData();
            } else {
                toast.error(error.response?.data?.message || 'Không thể đăng ký ca làm.');
            }
        } finally {
            setSubmittingWindowId(null);
        }
    };

    const checkIn = async (assignmentId) => {
        setProcessingId(assignmentId);
        try {
            await api.post(`/workforce/attendance/${assignmentId}/check-in`);
            toast.success('Đã điểm danh vào.');
            await fetchWorkData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể điểm danh vào.');
        } finally {
            setProcessingId(null);
        }
    };

    const checkOut = async (assignmentId) => {
        setProcessingId(assignmentId);
        try {
            await api.post(`/workforce/attendance/${assignmentId}/check-out`);
            toast.success('Đã điểm danh ra. Đang chờ nhà tuyển dụng duyệt công.');
            await fetchWorkData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể điểm danh ra.');
        } finally {
            setProcessingId(null);
        }
    };

    const canPassShift = (shift, assignment) => {
        if (!assignment || assignment.status !== 'Assigned') return false;
        if (assignment.attendanceStatus) return false;
        return new Date(shift.startTime).getTime() - Date.now() > 2 * 60 * 60 * 1000;
    };

    const openPassModal = async (shift, assignment) => {
        try {
            const response = await api.get(`/workforce/shift-pass/${assignment.shiftAssignmentId}/candidates`);
            const candidates = response.data || [];
            if (candidates.length === 0) {
                toast.error('Không có đồng nghiệp phù hợp trong chi nhánh này để nhường ca.');
                return;
            }
            setPassModal({
                open: true,
                assignment,
                shift,
                candidates,
                reason: '',
                toEmployeeUserId: String(candidates[0].employeeUserId)
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tải danh sách đồng nghiệp để nhường ca.');
        }
    };

    const submitPassRequest = async (e) => {
        e.preventDefault();
        try {
            await api.post('/workforce/shift-pass', {
                shiftAssignmentId: passModal.assignment.shiftAssignmentId,
                toEmployeeUserId: Number(passModal.toEmployeeUserId),
                reason: passModal.reason
            });
            toast.success('Đã gửi yêu cầu nhường ca.');
            setPassModal({ open: false, assignment: null, shift: null, candidates: [], reason: '', toEmployeeUserId: '' });
            fetchWorkData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể gửi yêu cầu nhường ca.');
        }
    };

    const respondPassRequest = async (requestId, action) => {
        try {
            await api.patch(`/workforce/shift-pass/${requestId}/${action}`);
            toast.success(action === 'accept' ? 'Đã nhận ca thành công.' : 'Đã từ chối nhận ca.');
            fetchWorkData();
        } catch (error) {
            toast.error(error.response?.data?.message || (action === 'accept' ? 'Không thể đồng ý nhận ca.' : 'Không thể từ chối nhận ca.'));
        }
    };

    const getAttendanceActionState = (shift, assignment) => {
        const status = assignment?.attendanceStatus || 'NotStarted';
        const start = new Date(shift.startTime);
        const end = new Date(shift.endTime);
        const checkInOpenAt = addMinutes(start, -CHECK_IN_LEAD_MINUTES);
        const checkInCloseAt = addMinutes(end, -CHECK_IN_MIN_REMAINING_MINUTES);
        const checkOutCloseAt = addMinutes(end, CHECK_OUT_GRACE_MINUTES);

        if (!assignment) return { kind: 'none' };

        if (status === 'CheckedIn') {
            if (now < end) {
                return {
                    kind: 'checkout',
                    enabled: false,
                    label: 'Chưa đến giờ check-out',
                    hint: `Mở lúc ${formatTime(end)}`
                };
            }
            if (now > checkOutCloseAt) {
                return {
                    kind: 'checkout',
                    enabled: false,
                    label: 'Quá giờ check-out',
                    hint: 'Liên hệ quản lý để chỉnh công'
                };
            }
            return {
                kind: 'checkout',
                enabled: true,
                label: 'Check-out',
                hint: `Còn hiệu lực đến ${formatTime(checkOutCloseAt)}`
            };
        }

        if (status === 'CheckedOut') {
            return { kind: 'status', label: 'Chờ duyệt công', className: 'bg-amber-50 text-amber-700 border-amber-100' };
        }

        if (status === 'Approved') {
            return { kind: 'status', label: 'Đã duyệt công', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
        }

        if (status === 'Rejected') {
            return { kind: 'status', label: 'Từ chối công', className: 'bg-red-50 text-red-700 border-red-100' };
        }

        if (now < checkInOpenAt) {
            return {
                kind: 'checkin',
                enabled: false,
                label: 'Chưa đến giờ check-in',
                hint: `Mở từ ${formatTime(checkInOpenAt)}`
            };
        }

        if (now >= end) {
            return {
                kind: 'checkin',
                enabled: false,
                label: 'Quá giờ check-in',
                hint: 'Liên hệ quản lý để xử lý công'
            };
        }

        if (now >= checkInCloseAt) {
            return {
                kind: 'checkin',
                enabled: false,
                label: 'Quá khung check-in',
                hint: `Ca còn ${CHECK_IN_MIN_REMAINING_MINUTES} phút hoặc ít hơn`
            };
        }

        return {
            kind: 'checkin',
            enabled: true,
            label: 'Check-in',
            hint: `Đóng lúc ${formatTime(checkInCloseAt)}`
        };
    };

    const renderAction = (shift, assignment) => {
        if (!shift || !assignment) return null;

        const action = getAttendanceActionState(shift, assignment);
        const disabled = processingId === assignment.shiftAssignmentId || !action.enabled;

        if (action.kind === 'status') {
            return (
                <span className={`h-10 px-4 rounded-xl border text-sm font-bold inline-flex items-center ${action.className}`}>
                    {action.label}
                </span>
            );
        }

        if (!['checkin', 'checkout'].includes(action.kind)) return null;

        const isCheckout = action.kind === 'checkout';
        return (
            <div className="flex flex-col gap-1 items-start lg:items-end">
                <button
                    disabled={disabled}
                    onClick={() => isCheckout ? checkOut(assignment.shiftAssignmentId) : checkIn(assignment.shiftAssignmentId)}
                    className={`h-10 px-4 rounded-xl text-sm font-bold inline-flex items-center gap-1.5 transition-all disabled:cursor-not-allowed ${
                        action.enabled
                            ? isCheckout
                                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20'
                                : 'bg-primary text-white hover:bg-primary-dk shadow-sm shadow-primary/20'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                >
                    <span className="material-symbols-outlined !text-[18px]">
                        {action.enabled ? (isCheckout ? 'logout' : 'login') : 'lock_clock'}
                    </span>
                    {processingId === assignment.shiftAssignmentId ? 'Đang xử lý...' : action.label}
                </button>
                {action.hint && (
                    <span className="text-[11px] font-semibold text-slate-400 max-w-[190px] lg:text-right">
                        {action.hint}
                    </span>
                )}
            </div>
        );
    };

    const renderAttendanceCard = ({ shift, assignment }, showActions = true) => {
        const meta = attendanceMeta(assignment?.attendanceStatus);
        const action = getAttendanceActionState(shift, assignment);
        const isReadyForWork = action.enabled && action.kind === 'checkin';
        const isReadyForCheckout = action.enabled && action.kind === 'checkout';

        return (
            <article
                key={shift.workShiftId}
                className={`rounded-2xl border bg-white p-4 sm:p-5 shadow-sm transition-all ${
                    isReadyForWork || isReadyForCheckout
                        ? 'border-blue-200 shadow-blue-500/10'
                        : 'border-slate-200/70'
                }`}
            >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${meta.className}`}>
                                {meta.label}
                            </span>
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-100">
                                {assignment?.assignmentSource === 'EmployeeRegistration' ? 'Từ đăng ký' : 'Đã xếp ca'}
                            </span>
                            {(isReadyForWork || isReadyForCheckout) && (
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                                    Cần thao tác
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="min-w-0">
                                <h3 className="font-black text-slate-800 truncate">{getShiftDisplayName(shift.title)}</h3>
                                <p className="text-sm text-slate-500 truncate mt-0.5">{shift.branchName}</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {formatFullDate(shift.startTime)}
                                </p>
                            </div>
                            <div className="shrink-0 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-right">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Giờ ca</p>
                                <p className="text-sm font-black text-slate-800">{formatTime(shift.startTime)} - {formatTime(shift.endTime)}</p>
                            </div>
                        </div>

                        <div className="mt-4 grid sm:grid-cols-3 gap-2 text-xs text-slate-500">
                            <span className="rounded-xl bg-slate-50 px-3 py-2">
                                Giờ vào: <b className="text-slate-700">{formatDateTime(assignment?.checkInAt)}</b>
                            </span>
                            <span className="rounded-xl bg-slate-50 px-3 py-2">
                                Giờ ra: <b className="text-slate-700">{formatDateTime(assignment?.checkOutAt)}</b>
                            </span>
                            <span className="rounded-xl bg-slate-50 px-3 py-2">
                                Đã làm: <b className="text-slate-700">{formatMinutes(assignment?.workedMinutes || 0)}</b>
                            </span>
                        </div>
                    </div>

                    {showActions && (
                        <div className="flex lg:justify-end">
                            <div className="flex flex-wrap gap-2 lg:justify-end lg:max-w-[260px]">
                                {canPassShift(shift, assignment) && (
                                    <button
                                        type="button"
                                        onClick={() => openPassModal(shift, assignment)}
                                        className="h-10 px-4 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold"
                                    >
                                        Nhường ca
                                    </button>
                                )}
                                {renderAction(shift, assignment)}
                            </div>
                        </div>
                    )}
                </div>
            </article>
        );
    };

    const renderRegistrationWindow = (registrationWindow) => {
        const windowId = registrationWindow.shiftRegistrationWindowId;
        const selection = getRegistrationSelection(windowId);
        const selectedSet = new Set(selection.shiftIds);
        const hasSubmitted = Number(registrationWindow.mySelectedCount || 0) > 0;
        const remainingEdits = Number(registrationWindow.remainingRegistrationEdits ?? registrationWindow.maxRegistrationEdits ?? 2);
        const registrationLocked = !registrationWindow.canSubmit || (hasSubmitted && remainingEdits <= 0);
        const submitDisabled = !registrationWindow.canSubmit ||
            submittingWindowId === windowId ||
            (hasSubmitted && remainingEdits <= 0) ||
            selection.shiftIds.length < registrationWindow.minFixedShifts;
        const registrationWeekDays = getWeekDays(registrationWindow.weekStartDate);
        const shiftsInWindow = registrationWindow.shifts || [];
        const selectedTotal = selection.shiftIds.length;
        const remainingRequiredCount = Math.max(0, registrationWindow.minFixedShifts - selectedTotal);
        const getDateKey = (value) => {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return '';
            return date.toISOString().slice(0, 10);
        };

        return (
            <div key={windowId} className="rounded-2xl border border-slate-100 bg-slate-50/50 overflow-hidden">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 p-4 sm:p-5 bg-white border-b border-slate-100">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">
                                {registrationWindow.branchName}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                registrationWindow.canSubmit
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                                {registrationWindow.canSubmit ? 'Đang mở đăng ký' : registrationWindow.status}
                            </span>
                        </div>
                        <h3 className="text-base font-black text-slate-800">
                            Tuần bắt đầu {new Date(registrationWindow.weekStartDate).toLocaleDateString('vi-VN')}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Mở từ {formatDateTime(registrationWindow.openAt)} đến {formatDateTime(registrationWindow.closeAt)}.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
                        <div className="rounded-xl bg-primary/10 border border-primary/10 px-3 py-2">
                            <p className="text-[10px] font-black text-primary uppercase tracking-wider">Đã chọn</p>
                            <p className="text-base font-black text-primary">{selectedTotal}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cần thêm</p>
                            <p className="text-base font-black text-slate-800">{remainingRequiredCount}</p>
                        </div>
                        <div className={`rounded-xl border px-3 py-2 ${registrationLocked ? 'bg-slate-50 border-slate-100' : 'bg-emerald-50 border-emerald-100'}`}>
                            <p className={`text-[10px] font-black uppercase tracking-wider ${registrationLocked ? 'text-slate-400' : 'text-emerald-700'}`}>Lượt sửa</p>
                            <p className={`text-base font-black ${registrationLocked ? 'text-slate-700' : 'text-emerald-700'}`}>
                                {hasSubmitted ? `${remainingEdits}/2` : '2/2'}
                            </p>
                        </div>
                    </div>
                </div>

                {registrationWindow.understaffedShifts?.length > 0 && (
                    <div className="mx-4 sm:mx-5 mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                        <p className="text-sm font-black text-red-700">
                            Lịch đã chốt nhưng còn {registrationWindow.understaffedShifts.length} ca thiếu người
                        </p>
                        <p className="text-xs text-red-600 mt-0.5">
                            Doanh nghiệp sẽ mở tuyển thêm, kêu gọi đăng ký thêm hoặc phân công thủ công cho các ca thiếu.
                        </p>
                    </div>
                )}

                <div className="p-4 sm:p-5 space-y-4">
                    <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Quy tắc chốt ca</p>
                            <p className="text-sm font-bold text-slate-800 mt-1">
                                Bấm vào ca để chọn đăng ký, bấm lại để hủy. Hệ thống ưu tiên người gửi sớm hơn, kiểm tra không trùng lịch và cân bằng số ca khi AI tự động xếp lịch.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-3">
                                <p className="text-[10px] font-black uppercase tracking-wider text-primary">Cần chọn thêm</p>
                                <p className="text-lg font-black text-primary">{remainingRequiredCount}</p>
                            </div>
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Ca đã chọn</p>
                                <p className="text-lg font-black text-emerald-700">{selectedTotal}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7 gap-3">
                            {registrationWeekDays.map(day => {
                                const dayKey = getDateKey(day);
                                const dayShifts = shiftsInWindow
                                    .filter(shift => getDateKey(shift.startTime) === dayKey)
                                    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

                                return (
                                    <div key={dayKey} className="rounded-xl border border-slate-100 bg-white min-h-[190px] overflow-hidden">
                                        <div className={`px-3 py-2 border-b border-slate-100 ${isToday(day) ? 'bg-primary/10' : 'bg-slate-50'}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-wider ${isToday(day) ? 'text-primary' : 'text-slate-400'}`}>
                                                {getDayName(day.getDay())}
                                            </p>
                                            <p className="text-sm font-black text-slate-800">{day.getDate()}/{day.getMonth() + 1}</p>
                                        </div>

                                        <div className="p-2 space-y-2">
                                            {dayShifts.length === 0 ? (
                                                <div className="h-24 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-300">
                                                    Trống
                                                </div>
                                            ) : dayShifts.map(shift => {
                                                const activeCount = getActiveAssignments(shift).length;
                                                const mine = getMyAssignment(shift);
                                                const myPreferred = mine?.status === 'Preferred' ? mine : null;
                                                const preferredCount = getPreferredAssignments(shift).length;
                                                const isSelected = selectedSet.has(shift.workShiftId);
                                                const isFull = !registrationWindow.canSubmit && activeCount >= shift.requiredPeople && !mine && !isSelected;
                                                const isUnderstaffed = shift.fillStatus === 'Understaffed' && Number(shift.missingCount || 0) > 0;
                                                const choiceLabel = isSelected ? 'Đã chọn đăng ký' : preferredCount > 0 ? `${preferredCount} lượt đăng ký` : 'Chưa chọn';
                                                const cardDisabled = registrationLocked || isFull;

                                                return (
                                                    <button
                                                        key={shift.workShiftId}
                                                        type="button"
                                                        disabled={cardDisabled}
                                                        onClick={() => toggleShiftRegistrationChoice(registrationWindow, shift)}
                                                        className={`rounded-lg border p-2 ${
                                                            isSelected
                                                                ? 'bg-primary/10 border-primary/40 shadow-sm ring-1 ring-primary/20'
                                                                : isUnderstaffed || isFull
                                                                    ? 'bg-red-50/60 border-red-100 opacity-70'
                                                                    : 'bg-white border-slate-100 hover:border-primary/30 hover:bg-primary/5'
                                                        } text-left transition disabled:cursor-not-allowed`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <p className="text-[10px] font-black text-slate-400">
                                                                    {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                                                                </p>
                                                                <h4 className="text-xs font-black text-slate-800 truncate mt-0.5">
                                                                    {getShiftDisplayName(shift.title)}
                                                                </h4>
                                                            </div>
                                                            <span className={`shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                                                                isUnderstaffed || isFull ? 'bg-red-100 text-red-600' : 'bg-emerald-50 text-emerald-700'
                                                            }`}>
                                                                {isUnderstaffed ? `Thiếu ${shift.missingCount}` : `${activeCount}/${shift.requiredPeople}`}
                                                            </span>
                                                        </div>

                                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                            <span className={`px-2 py-1 rounded-md text-[9px] font-black ${
                                                                isSelected
                                                                    ? 'bg-primary text-white'
                                                                    : 'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                {choiceLabel}
                                                            </span>
                                                            {myPreferred?.assignedAt && (
                                                                <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[9px] font-black">
                                                                    Gửi {formatDateTime(myPreferred.assignedAt)}
                                                                </span>
                                                            )}
                                                        </div>

                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                </div>

                <div className="px-4 sm:px-5 py-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                        <strong>Lưu ý:</strong> Vui lòng gửi đăng ký trước hạn đóng. Sau lần gửi đầu, bạn chỉ được lưu chỉnh sửa tối đa 2 lần; khi doanh nghiệp chốt ca hoặc AI tự động xếp lịch thì đăng ký sẽ bị khóa.
                    </p>
                    <button
                        type="button"
                        disabled={submitDisabled}
                        onClick={() => submitRegistration(registrationWindow)}
                        className="h-11 px-5 rounded-xl bg-primary text-white text-sm font-black disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submittingWindowId === windowId ? 'Đang gửi...' : hasSubmitted ? 'Lưu chỉnh sửa' : 'Gửi đăng ký ca'}
                    </button>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-bg-light">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="bg-bg-light min-h-screen pb-20 font-display overflow-x-hidden">
            <div className="bg-white border-b border-slate-200/60 pb-10 pt-8">
                <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Công việc của tôi</h1>
                    <p className="text-slate-500 mt-2">Quản lý công việc chính thức, ca làm, chấm công và lương của bạn.</p>
                </div>
            </div>

            <main className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10 mt-8 grid xl:grid-cols-[340px_minmax(0,1fr)] gap-6 min-w-0">
                <aside className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 sm:p-6 h-fit min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-5">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Công việc đang làm</h2>
                            <p className="text-sm text-slate-500 mt-1">Thông tin nhân viên chính thức.</p>
                        </div>
                        <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined">badge</span>
                        </span>
                    </div>

                    {employments.filter(e => e.status === 'Active').length === 0 ? (
                        <div className="rounded-2xl bg-slate-50 p-5 text-center">
                            <p className="text-sm font-bold text-slate-700">Chưa có công việc nào</p>
                            <p className="text-xs text-slate-500 mt-1">Vui lòng chấp nhận lời mời nhận việc chính thức trước.</p>
                            <Link to="/offers" className="mt-4 inline-flex h-10 px-4 rounded-xl bg-primary text-white text-sm font-bold items-center">
                                Xem lời mời
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {employments.filter(e => e.status === 'Active').map(employment => (
                                <div key={employment.employmentId} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                    <p className="font-bold text-slate-800">{employment.position}</p>
                                    <p className="text-sm text-slate-500 mt-1">{employment.branchName}</p>
                                    {employment.expectedShifts && (
                                        <p className="text-xs text-slate-500 mt-1 font-semibold flex items-center gap-1">
                                            <span className="material-symbols-outlined !text-sm">schedule</span>
                                            Ca: {employment.expectedShifts}
                                        </p>
                                    )}
                                    <div className="mt-3 flex items-center justify-between gap-2">
                                        <div className="flex flex-wrap gap-2 text-xs font-bold">
                                            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                {employment.status === 'Active' ? 'Đang làm việc' : employment.status}
                                            </span>
                                            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary">
                                                {Number(employment.currentHourlyRate).toLocaleString('vi-VN')} VND/h
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedEmployerForReport({
                                                    id: employment.employerId,
                                                    name: employment.branchName
                                                });
                                                setShowReportModal(true);
                                            }}
                                            className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-0.5"
                                            title="Báo cáo doanh nghiệp này"
                                        >
                                            <span className="material-symbols-outlined !text-xs">flag</span>
                                            Báo cáo
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </aside>

                <section className="xl:col-start-2 bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden min-w-0">
                    <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800">Đăng ký ca tuần sau</h2>
                        <p className="text-sm text-slate-500 mt-1">Bấm vào ca để chọn đăng ký, bấm lại để hủy. Sau khi gửi, bạn chỉ được chỉnh sửa tối đa 2 lần trước khi hệ thống tự động xếp ca.</p>
                    </div>
                    <div className="p-5 sm:p-6 space-y-4">
                        {registrationWindows.length === 0 ? (
                            <div className="rounded-2xl bg-slate-50 p-6 text-center">
                                <p className="text-sm font-bold text-slate-700">Chưa có form đăng ký ca tuần sau</p>
                                <p className="text-xs text-slate-500 mt-1">Khi doanh nghiệp publish lịch, form đăng ký sẽ xuất hiện tại đây.</p>
                            </div>
                        ) : (
                            registrationWindows.map(renderRegistrationWindow)
                        )}
                    </div>
                </section>

                <section className="xl:col-start-2 bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden min-w-0">
                    <div className="px-5 sm:px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Lịch Làm Việc & Chấm Công</h2>
                            <p className="text-sm text-slate-500 mt-1">Xem lưới lịch làm tuần của chi nhánh và điểm danh thực tế.</p>
                        </div>
                        <div className="flex bg-slate-100 p-1.5 rounded-xl self-start md:self-auto">
                            <button
                                type="button"
                                onClick={() => setActiveTab('timetable')}
                                className={`h-8 px-4 rounded-lg text-xs font-bold transition-all ${activeTab === 'timetable' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                Lưới lịch tuần
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('mylist')}
                                className={`h-8 px-4 rounded-lg text-xs font-bold transition-all ${activeTab === 'mylist' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                Chấm công của tôi
                            </button>
                        </div>
                    </div>

                    {activeTab === 'timetable' ? (
                        <div className="flex-1 flex flex-col min-w-0">
                            {/* Week Navigator */}
                            <div className="px-5 sm:px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => navigateWeek(-1)}
                                        className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-all border border-transparent hover:border-slate-100"
                                    >
                                        <span className="material-symbols-outlined text-lg">chevron_left</span>
                                    </button>
                                    <span className="text-xs font-black text-slate-700 px-3 min-w-[150px] text-center">
                                        {formatWeekRange()}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => navigateWeek(1)}
                                        className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-all border border-transparent hover:border-slate-100"
                                    >
                                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                                    </button>
                                </div>
                                <span className="text-xs font-bold text-slate-400">{shifts.length} ca làm việc hoạt động</span>
                            </div>

                            <div className="overflow-x-auto min-w-0">
                                <div className="w-full min-w-[800px] bg-white">
                                    {/* Mon-Sun Day Headers */}
                                    <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-slate-100 bg-slate-50/30 text-center py-4">
                                        <div className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center justify-center">Giờ</div>
                                        {weekDays.map((day, idx) => (
                                            <div key={idx} className={`text-xs ${isToday(day) ? 'text-primary font-black' : 'text-slate-500 font-bold'}`}>
                                                <div className="uppercase tracking-wide text-[10px] opacity-75">{getDayName(day.getDay())}</div>
                                                <div className="text-base font-black mt-0.5">{day.getDate()}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Calendar Hour Row Columns */}
                                    <div className="relative grid grid-cols-[80px_repeat(7,1fr)]" style={{ height: '620px' }}>
                                        {/* Horizontal Hour Dividers */}
                                        <div className="absolute inset-0 grid grid-rows-14 pointer-events-none">
                                            {Array.from({ length: 14 }).map((_, h) => (
                                                <div key={h} className="border-b border-slate-100/50 w-full h-full"></div>
                                            ))}
                                        </div>

                                        {/* Hour Labels Column */}
                                        <div className="flex flex-col justify-between text-[10px] font-black text-slate-400 py-1 bg-slate-50/20 border-r border-slate-100 h-full select-none">
                                            {Array.from({ length: 15 }).map((_, h) => (
                                                <div key={h} className="text-center h-5 flex items-center justify-center">
                                                    {String(8 + h).padStart(2, '0')}:00
                                                </div>
                                            ))}
                                        </div>

                                        {/* Day Columns */}
                                        {weekDays.map((day, dIdx) => {
                                            const dayShifts = shifts.filter(s => {
                                                const sDate = new Date(s.startTime);
                                                return sDate.getFullYear() === day.getFullYear() &&
                                                    sDate.getMonth() === day.getMonth() &&
                                                    sDate.getDate() === day.getDate();
                                            });

                                            const positioned = positionShifts(dayShifts);

                                            return (
                                                <div
                                                    key={dIdx}
                                                    className={`relative border-r border-slate-100 h-full ${
                                                        isToday(day) ? 'bg-primary/5' : 'bg-slate-50/5'
                                                    }`}
                                                >
                                                    {positioned.map(shift => {
                                                        const { top, height } = getShiftPosition(shift.startTime, shift.endTime);
                                                        const widthPercent = 100 / shift.totalCols;
                                                        const leftPercent = (shift.colIndex * 100) / shift.totalCols;

                                                        const activeAssig = getActiveAssignments(shift);
                                                        const mine = getMyAssignment(shift);
                                                        const isMine = mine !== undefined;

                                                        return (
                                                            <div
                                                                key={shift.workShiftId}
                                                                onClick={() => setSelectedShiftForDetails(shift)}
                                                                style={{
                                                                    position: 'absolute',
                                                                    top,
                                                                    height,
                                                                    left: `${leftPercent}%`,
                                                                    width: `${widthPercent}%`,
                                                                    padding: '2px'
                                                                }}
                                                                className="cursor-pointer group shift-card"
                                                            >
                                                                <div className={`h-full rounded-xl border p-2 flex flex-col justify-between overflow-hidden shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                                                                    isMine
                                                                        ? 'bg-primary/5 border-primary/30 hover:bg-primary/10 text-primary-dark'
                                                                        : 'bg-indigo-50/80 border-indigo-200/80 hover:bg-indigo-100/80 text-indigo-900'
                                                                }`}>
                                                                    <div className="min-w-0">
                                                                        <div className="flex items-start justify-between gap-1">
                                                                            <h5 className="text-[10px] font-extrabold truncate">
                                                                                {getShiftDisplayName(shift.title)}
                                                                            </h5>
                                                                            {isMine && (
                                                                                <span className="shrink-0 bg-primary text-white text-[7px] font-black px-1.5 py-0.5 rounded leading-none uppercase">
                                                                                    Tôi
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-[9px] opacity-75 font-semibold mt-0.5">
                                                                            {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                                                                        </p>
                                                                        <div className="mt-1.5 flex flex-wrap gap-1 max-h-[60px] overflow-y-auto">
                                                                            {activeAssig.length > 0 ? (
                                                                                activeAssig.map((a, idx) => {
                                                                                    const isMe = a.employeeUserId === currentUserId;
                                                                                    return (
                                                                                        <div
                                                                                            key={idx}
                                                                                            className={`inline-flex items-center gap-1 border rounded-md px-1 py-0.5 max-w-full shadow-sm ${
                                                                                                isMe ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-white border-slate-100 text-slate-700'
                                                                                            }`}
                                                                                            title={getDisplayEmployeeName(a)}
                                                                                        >
                                                                                            <span className="text-[8px] font-black truncate max-w-[50px]">
                                                                                                {getDisplayEmployeeName(a)}
                                                                                            </span>
                                                                                        </div>
                                                                                    );
                                                                                })
                                                                            ) : (
                                                                                <div className="inline-flex items-center gap-1 bg-slate-100/50 border border-dashed border-slate-200 rounded-md px-1.5 py-0.5 text-slate-400 font-bold text-[8px]">
                                                                                    <span>Chưa xếp</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-[8px] font-black opacity-60 mt-auto">
                                                                        {activeAssig.length}/{shift.requiredPeople} nhân viên
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50/50 p-5 sm:p-6 space-y-5">
                            {myShiftItems.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 sm:p-14 text-center">
                                    <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                                        <span className="material-symbols-outlined text-slate-300">event_busy</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-700">Không có ca làm việc nào</h3>
                                    <p className="text-sm text-slate-500 mt-1">Khi bạn được phân công ca làm việc, thông tin chấm công sẽ xuất hiện tại đây.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid sm:grid-cols-3 gap-3">
                                        <div className="rounded-2xl bg-white border border-slate-200/70 px-4 py-3">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ca hôm nay</p>
                                            <p className="text-xl font-black text-slate-800 mt-1">{todayShiftItems.length}</p>
                                        </div>
                                        <div className="rounded-2xl bg-white border border-slate-200/70 px-4 py-3">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Đã ghi nhận</p>
                                            <p className="text-xl font-black text-emerald-600 mt-1">
                                                {myShiftItems.filter(item => completedAttendanceStatuses.includes(item.assignment?.attendanceStatus)).length}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl bg-white border border-slate-200/70 px-4 py-3">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Lịch sử</p>
                                            <p className="text-xl font-black text-slate-800 mt-1">{historyItems.length}</p>
                                        </div>
                                    </div>

                                    <section className="rounded-2xl border border-slate-200/70 bg-white overflow-hidden">
                                        <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                            <div>
                                                <h3 className="text-base font-black text-slate-800">
                                                    {focusDate && isSameCalendarDay(focusDate, now) ? 'Ca cần xử lý hôm nay' : 'Ngày làm việc tiếp theo'}
                                                </h3>
                                                <p className="text-sm text-slate-500 mt-0.5">
                                                    {focusDate ? formatFullDate(focusDate) : 'Chưa có ca sắp tới'}
                                                </p>
                                            </div>
                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 w-fit">
                                                <span className="material-symbols-outlined !text-[16px]">rule</span>
                                                Check-in mở trước ca 30 phút, đóng khi ca còn 30 phút
                                            </span>
                                        </div>

                                        <div className="p-4 sm:p-5 space-y-3">
                                            {focusShiftItems.length === 0 ? (
                                                <div className="rounded-2xl bg-slate-50 border border-dashed border-slate-200 p-8 text-center">
                                                    <p className="text-sm font-bold text-slate-600">Chưa có ca cần chấm công.</p>
                                                    <p className="text-xs text-slate-400 mt-1">Khi có ca hôm nay hoặc ca sắp tới, hệ thống sẽ đưa lên đây.</p>
                                                </div>
                                            ) : (
                                                focusShiftItems.map(item => renderAttendanceCard(item, true))
                                            )}
                                        </div>
                                    </section>

                                    <section className="rounded-2xl border border-slate-200/70 bg-white overflow-hidden">
                                        <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                            <div>
                                                <h3 className="text-base font-black text-slate-800">Lịch sử đã làm</h3>
                                                <p className="text-sm text-slate-500 mt-0.5">Hiển thị {HISTORY_PAGE_SIZE} ca mỗi trang để dễ kiểm tra công.</p>
                                            </div>
                                            {historyItems.length > 0 && (
                                                <span className="text-xs font-bold text-slate-400">
                                                    Trang {historyPage}/{historyTotalPages}
                                                </span>
                                            )}
                                        </div>

                                        <div className="p-4 sm:p-5 space-y-3">
                                            {historyItems.length === 0 ? (
                                                <div className="rounded-2xl bg-slate-50 border border-dashed border-slate-200 p-8 text-center">
                                                    <p className="text-sm font-bold text-slate-600">Chưa có lịch sử chấm công.</p>
                                                    <p className="text-xs text-slate-400 mt-1">Các ca đã kết thúc hoặc đã duyệt công sẽ nằm ở đây.</p>
                                                </div>
                                            ) : (
                                                paginatedHistoryItems.map(item => renderAttendanceCard(item, false))
                                            )}
                                        </div>

                                        {historyItems.length > HISTORY_PAGE_SIZE && (
                                            <div className="px-4 sm:px-5 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                                                <button
                                                    type="button"
                                                    disabled={historyPage === 1}
                                                    onClick={() => setHistoryPage(page => Math.max(1, page - 1))}
                                                    className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary hover:text-primary"
                                                >
                                                    Trước
                                                </button>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {Array.from({ length: historyTotalPages }).map((_, index) => {
                                                        const page = index + 1;
                                                        return (
                                                            <button
                                                                key={page}
                                                                type="button"
                                                                onClick={() => setHistoryPage(page)}
                                                                className={`w-9 h-9 rounded-xl text-xs font-black border ${
                                                                    historyPage === page
                                                                        ? 'bg-primary text-white border-primary'
                                                                        : 'bg-white text-slate-500 border-slate-200 hover:border-primary hover:text-primary'
                                                                }`}
                                                            >
                                                                {page}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={historyPage === historyTotalPages}
                                                    onClick={() => setHistoryPage(page => Math.min(historyTotalPages, page + 1))}
                                                    className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary hover:text-primary"
                                                >
                                                    Sau
                                                </button>
                                            </div>
                                        )}
                                    </section>
                                </>
                            )}
                        </div>
                    )}
                </section>

                <section className="xl:col-start-2 bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden min-w-0">
                    <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800">Yêu cầu nhường ca làm</h2>
                        <p className="text-sm text-slate-500 mt-1">Yêu cầu tự động hết hạn 2 giờ trước khi ca bắt đầu.</p>
                    </div>
                    <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                        <div className="p-5 sm:p-6">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-3">Yêu cầu nhận từ đồng nghiệp</h3>
                            {incomingRequests.length === 0 ? (
                                <p className="text-sm text-slate-400">Không có yêu cầu nào gửi đến.</p>
                            ) : incomingRequests.map(request => (
                                <div key={request.shiftPassRequestId} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 mb-3">
                                    <p className="font-bold text-slate-800">{request.shiftTitle}</p>
                                    <p className="text-xs text-slate-500">{request.fromEmployeeName} muốn nhường ca này cho bạn.</p>
                                    <p className="text-xs text-slate-400 mt-1">{formatDateTime(request.shiftStartTime)} - hết hạn lúc {formatDateTime(request.expiresAt)}</p>
                                    <span className="inline-flex mt-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white border border-slate-100 text-slate-600">
                                        {request.status === 'Pending' ? 'Đang chờ' : request.status === 'Accepted' ? 'Đã nhận' : request.status === 'Rejected' ? 'Đã từ chối' : request.status}
                                    </span>
                                    {request.status === 'Pending' && (
                                        <div className="mt-3 flex gap-2">
                                            <button onClick={() => respondPassRequest(request.shiftPassRequestId, 'accept')} className="h-9 px-4 rounded-xl bg-emerald-500 text-white text-xs font-bold">Đồng ý</button>
                                            <button onClick={() => respondPassRequest(request.shiftPassRequestId, 'reject')} className="h-9 px-4 rounded-xl bg-red-50 text-red-600 border border-red-100 text-xs font-bold">Từ chối</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="p-5 sm:p-6">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-3">Yêu cầu bạn đã gửi</h3>
                            {outgoingRequests.length === 0 ? (
                                <p className="text-sm text-slate-400">Bạn chưa gửi yêu cầu nhường ca nào.</p>
                            ) : outgoingRequests.map(request => (
                                <div key={request.shiftPassRequestId} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 mb-3">
                                    <p className="font-bold text-slate-800">{request.shiftTitle}</p>
                                    <p className="text-xs text-slate-500">Gửi đến {request.toEmployeeName}</p>
                                    <p className="text-xs text-slate-400 mt-1">{formatDateTime(request.shiftStartTime)} - hết hạn lúc {formatDateTime(request.expiresAt)}</p>
                                    <span className="inline-flex mt-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white border border-slate-100 text-slate-600">
                                        {request.status === 'Pending' ? 'Đang chờ' : request.status === 'Accepted' ? 'Đã đồng ý' : request.status === 'Rejected' ? 'Đã từ chối' : request.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            {selectedShiftForDetails && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div>
                                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">
                                    {selectedShiftForDetails.branchName}
                                </span>
                                <h3 className="text-xl font-black text-slate-800 mt-1.5">{getShiftDisplayName(selectedShiftForDetails.title)}</h3>
                                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                                    Thời gian: {formatDateTime(selectedShiftForDetails.startTime)} - {formatDateTime(selectedShiftForDetails.endTime)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedShiftForDetails(null)}
                                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
                            >
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto flex-1">
                            <div className="bg-slate-50 rounded-2xl border border-slate-200/50 p-4">
                                <span className="text-[10px] font-black uppercase text-slate-400">Yêu cầu chức vụ</span>
                                <p className="text-sm font-extrabold text-slate-700 mt-1">{selectedShiftForDetails.requiredRole || 'Nhân viên'}</p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Thành viên trong ca làm</h4>
                                {getActiveAssignments(selectedShiftForDetails).length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">Chưa có nhân viên nào được phân công.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {getActiveAssignments(selectedShiftForDetails).map((assignment, idx) => {
                                            const isMe = assignment.employeeUserId === currentUserId;
                                            const meta = attendanceMeta(assignment.attendanceStatus);
                                            const employeeName = getDisplayEmployeeName(assignment);
                                            return (
                                                <div key={idx} className={`rounded-xl border p-4 flex flex-col gap-2 ${isMe ? 'bg-primary/5 border-primary/20' : 'border-slate-100 bg-slate-50/50'}`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-7 h-7 rounded-full text-[11px] font-black flex items-center justify-center ${isMe ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                                {employeeName.substring(0, 1).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <span className="text-sm font-extrabold text-slate-800">{employeeName}</span>
                                                                {isMe && <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-primary text-white text-[8px] font-black uppercase tracking-wider">Tôi</span>}
                                                            </div>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${meta.className}`}>
                                                            {meta.label}
                                                        </span>
                                                    </div>
                                                    {isMe && (
                                                        <div className="mt-1 space-y-3">
                                                            {assignment.schedulingReason && (
                                                                <div className="rounded-xl border border-primary/10 bg-primary/5 px-3 py-2 text-[11px] font-bold text-primary">
                                                                    {assignment.schedulingReason}
                                                                </div>
                                                            )}
                                                            <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 bg-white p-2.5 rounded-xl border border-slate-150">
                                                                <div>
                                                                    <span className="block font-bold text-slate-400">Check-in</span>
                                                                    <span className="font-extrabold text-slate-750 mt-0.5">{formatTime(assignment.checkInAt)}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="block font-bold text-slate-400">Check-out</span>
                                                                    <span className="font-extrabold text-slate-750 mt-0.5">{formatTime(assignment.checkOutAt)}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="block font-bold text-slate-400">Làm việc</span>
                                                                    <span className="font-extrabold text-slate-750 mt-0.5">{formatMinutes(assignment.workedMinutes || 0)}</span>
                                                                </div>
                                                            </div>

                                                            <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                                                                {canPassShift(selectedShiftForDetails, assignment) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedShiftForDetails(null);
                                                                            openPassModal(selectedShiftForDetails, assignment);
                                                                        }}
                                                                        className="h-9 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-sm"
                                                                    >
                                                                        Nhường ca
                                                                    </button>
                                                                )}
                                                                {renderAction(selectedShiftForDetails, assignment)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {passModal.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <form onSubmit={submitPassRequest} className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Nhường ca làm việc</h3>
                                <p className="text-sm text-slate-500 font-medium mt-1">Nếu đồng nghiệp từ chối hoặc yêu cầu hết hạn, ca làm việc vẫn thuộc về bạn.</p>
                            </div>
                            <button type="button" onClick={() => setPassModal({ open: false, assignment: null, shift: null, candidates: [], reason: '', toEmployeeUserId: '' })} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <select value={passModal.toEmployeeUserId} onChange={(e) => setPassModal(prev => ({ ...prev, toEmployeeUserId: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm">
                                {passModal.candidates.map(candidate => (
                                    <option key={candidate.employeeUserId} value={candidate.employeeUserId}>{candidate.employeeName} - {candidate.position}</option>
                                ))}
                            </select>
                            <textarea value={passModal.reason} onChange={(e) => setPassModal(prev => ({ ...prev, reason: e.target.value }))} placeholder="Lý do nhường ca" className="w-full min-h-24 px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none" />
                            <button className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm">
                                Gửi yêu cầu
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {showReportModal && selectedEmployerForReport && (
                <ReportModal
                    isOpen={showReportModal}
                    onClose={() => {
                        setShowReportModal(false);
                        setSelectedEmployerForReport(null);
                    }}
                    entityId={selectedEmployerForReport.id}
                    entityType="Employer"
                    entityTitle={selectedEmployerForReport.name}
                />
            )}
        </div>
    );
};

export default MyWork;

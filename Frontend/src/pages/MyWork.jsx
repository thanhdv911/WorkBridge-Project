import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { signalRService } from '../services/signalrService';
import ReportModal from '../components/shared/ReportModal';
import Pagination from '../components/shared/Pagination';

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

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ/giờ`;

const attendanceMeta = (status) => {
    switch (status) {
        case 'CheckedIn':
            return { label: 'Đã vào ca', className: 'bg-sky-50 text-sky-700 border-sky-100' };
        case 'CheckedOut':
            return { label: 'Chờ duyệt công', className: 'bg-amber-50 text-amber-700 border-amber-100' };
        case 'Approved':
            return { label: 'Đã duyệt công', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
        case 'Rejected':
            return { label: 'Từ chối công', className: 'bg-rose-50 text-rose-700 border-rose-100' };
        default:
            return { label: 'Chưa bắt đầu', className: 'bg-slate-50 text-slate-800 border-slate-100' };
    }
};

const passRequestMeta = (status) => {
    switch (status) {
        case 'Accepted':
            return { label: 'Đã đồng ý', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
        case 'Rejected':
            return { label: 'Đã từ chối', className: 'bg-rose-50 text-rose-700 border-rose-100' };
        case 'Expired':
            return { label: 'Đã hết hạn', className: 'bg-slate-100 text-slate-700 border-slate-200' };
        default:
            return { label: 'Đang chờ', className: 'bg-amber-50 text-amber-700 border-amber-100' };
    }
};

const assignmentSourceLabel = (source) => (
    source === 'EmployeeRegistration' ? 'Từ đăng ký' : 'Đã xếp ca'
);

const getActiveAssignments = (shift) => (shift?.assignments || [])
    .filter((assignment) => activeAssignmentStatuses.includes(assignment.status));

const getPreferredAssignments = (shift) => (shift?.assignments || [])
    .filter((assignment) => assignment.status === 'Preferred');

const shiftsOverlap = (a, b) => {
    if (!a || !b) return false;
    return new Date(a.startTime) < new Date(b.endTime) && new Date(b.startTime) < new Date(a.endTime);
};

const buildRegistrationSelections = (windows, currentUserId) => {
    const next = {};

    (windows || []).forEach((registrationWindow) => {
        const shiftIds = [];

        (registrationWindow.shifts || []).forEach((shift) => {
            const mine = (shift.assignments || []).find((assignment) =>
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
    if (title === 'Morning Shift' || title === 'Ca Sáng') return 'Ca sáng';
    if (title === 'Afternoon Shift' || title === 'Ca Chiều') return 'Ca chiều';
    if (title === 'Evening Shift' || title === 'Ca Tối') return 'Ca tối';
    if (title === 'Night Shift' || title === 'Ca Đêm') return 'Ca đêm';

    return title
        .replace(/morning shift/i, 'Ca sáng')
        .replace(/afternoon shift/i, 'Ca chiều')
        .replace(/evening shift/i, 'Ca tối')
        .replace(/night shift/i, 'Ca đêm');
};

const getWeekDays = (refDate) => {
    const current = new Date(refDate);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));

    const days = [];
    for (let i = 0; i < 7; i += 1) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        days.push(d);
    }
    return days;
};

const isToday = (someDate) => isSameCalendarDay(someDate, new Date());

const formatTime = (value) => {
    if (!value) return '--';
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

const getDayName = (dayIndex) => {
    const names = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    return names[dayIndex];
};

const getDateKey = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
};

const getShiftPosition = (startTimeStr, endTimeStr) => {
    const start = new Date(startTimeStr);
    const end = new Date(endTimeStr);
    const startHour = start.getHours() + start.getMinutes() / 60;
    let endHour = end.getHours() + end.getMinutes() / 60;

    if (end.getDate() !== start.getDate()) {
        endHour += 24;
    }

    const gridStart = 8;
    const gridEnd = 22;
    const totalHours = gridEnd - gridStart;
    const top = Math.max(0, ((startHour - gridStart) / totalHours) * 100);
    const height = Math.max(8, ((endHour - startHour) / totalHours) * 100);

    return {
        top: `${Math.min(92, top)}%`,
        height: `${Math.min(100 - top, height)}%`
    };
};

const positionShifts = (dayShifts) => {
    const sorted = dayShifts
        .map((shift) => ({ ...shift }))
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    const columns = [];

    sorted.forEach((shift) => {
        let placed = false;
        for (let i = 0; i < columns.length; i += 1) {
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

    sorted.forEach((shift) => {
        shift.totalCols = columns.length || 1;
    });

    return sorted;
};

const WorkStat = ({ label, value, icon, tone = 'slate' }) => {
    const tones = {
        slate: 'bg-slate-900 text-white',
        sky: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
        emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
        amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
    };

    return (
        <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-bold text-slate-600">{label}</p>
                    <p className="mt-1 text-2xl font-black tabular-nums text-slate-900">{value}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone] || tones.slate}`}>
                    <span className="material-symbols-outlined !text-[22px]">{icon}</span>
                </div>
            </div>
        </div>
    );
};

const EmptyState = ({ icon, title, description, action }) => (
    <div className="rounded-[24px] border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
            <span className="material-symbols-outlined !text-[30px]">{icon}</span>
        </div>
        <h3 className="mt-4 text-base font-black text-slate-800">{title}</h3>
        <p className="mx-auto mt-1 max-w-md text-sm font-medium leading-relaxed text-slate-700">{description}</p>
        {action}
    </div>
);

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
    const [activeTab, setActiveTab] = useState('mylist');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [now, setNow] = useState(new Date());
    const [historyPage, setHistoryPage] = useState(1);
    const [selectedShiftForDetails, setSelectedShiftForDetails] = useState(null);
    const token = localStorage.getItem('token');
    const currentUserId = getCurrentUserId();
    const weekDays = getWeekDays(currentDate);

    const getDisplayEmployeeName = (assignment) => assignment?.employeeName || 'Nhân viên';

    const navigateWeek = (direction) => {
        setCurrentDate((prev) => {
            const next = new Date(prev);
            next.setDate(prev.getDate() + direction * 7);
            return next;
        });
    };

    const formatWeekRange = () => {
        if (weekDays.length === 0) return '--';
        return `${formatDate(weekDays[0])} đến ${formatDate(weekDays[6])}`;
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
            setSelectedShiftForDetails((prev) => {
                if (!prev) return null;
                return freshShifts.find((shift) => shift.workShiftId === prev.workShiftId) || null;
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
            toast.error('Không thể tải lịch làm việc của bạn');
        } finally {
            setLoading(false);
        }
    }, [currentUserId]);

    useEffect(() => {
        if (!token) {
            setLoading(false);
            navigate('/login');
            return undefined;
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
        return assignments.find((assignment) => assignment.employeeUserId === currentUserId);
    };

    const getRegistrationSelection = (windowId) => {
        const selection = registrationSelections[windowId];
        if (!selection) return { shiftIds: [] };
        if (Array.isArray(selection.shiftIds)) return selection;
        return { shiftIds: [...(selection.fixedIds || []), ...(selection.extraIds || [])] };
    };

    const getAttendanceActionState = useCallback((shift, assignment) => {
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
                    label: 'Chưa đến giờ ra ca',
                    hint: `Mở lúc ${formatTime(end)}`
                };
            }
            if (now > checkOutCloseAt) {
                return {
                    kind: 'checkout',
                    enabled: false,
                    label: 'Quá giờ ra ca',
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
            return { kind: 'status', label: 'Từ chối công', className: 'bg-rose-50 text-rose-700 border-rose-100' };
        }

        if (now < checkInOpenAt) {
            return {
                kind: 'checkin',
                enabled: false,
                label: 'Chưa đến giờ vào ca',
                hint: `Mở từ ${formatTime(checkInOpenAt)}`
            };
        }

        if (now >= end) {
            return {
                kind: 'checkin',
                enabled: false,
                label: 'Quá giờ vào ca',
                hint: 'Liên hệ quản lý để xử lý công'
            };
        }

        if (now >= checkInCloseAt) {
            return {
                kind: 'checkin',
                enabled: false,
                label: 'Quá khung vào ca',
                hint: `Ca còn ${CHECK_IN_MIN_REMAINING_MINUTES} phút hoặc ít hơn`
            };
        }

        return {
            kind: 'checkin',
            enabled: true,
            label: 'Check-in',
            hint: `Đóng lúc ${formatTime(checkInCloseAt)}`
        };
    }, [now]);

    const myShiftItems = useMemo(() => {
        return shifts
            .map((shift) => {
                const assignments = shift?.assignments || [];
                const assignment = currentUserId
                    ? assignments.find((item) => item.employeeUserId === currentUserId && activeAssignmentStatuses.includes(item.status))
                    : assignments.find((item) => activeAssignmentStatuses.includes(item.status));
                return assignment ? { shift, assignment } : null;
            })
            .filter(Boolean)
            .sort((a, b) => new Date(a.shift.startTime) - new Date(b.shift.startTime));
    }, [shifts, currentUserId]);

    const activeEmployments = useMemo(
        () => employments.filter((employment) => employment.status === 'Active'),
        [employments]
    );

    const todayShiftItems = useMemo(
        () => myShiftItems.filter((item) => isSameCalendarDay(item.shift.startTime, now)),
        [myShiftItems, now]
    );

    const nextShiftItem = useMemo(
        () => myShiftItems.find((item) => new Date(item.shift.endTime) >= now),
        [myShiftItems, now]
    );

    const focusDate = useMemo(() => {
        if (todayShiftItems.length > 0) return now;
        return nextShiftItem ? new Date(nextShiftItem.shift.startTime) : null;
    }, [todayShiftItems.length, nextShiftItem, now]);

    const focusShiftItems = useMemo(() => {
        if (!focusDate) return [];
        return myShiftItems.filter((item) => isSameCalendarDay(item.shift.startTime, focusDate));
    }, [myShiftItems, focusDate]);

    const focusShiftIds = useMemo(
        () => new Set(focusShiftItems.map((item) => item.shift.workShiftId)),
        [focusShiftItems]
    );

    const historyItems = useMemo(() => {
        return myShiftItems
            .filter((item) => {
                const status = item.assignment?.attendanceStatus;
                return !focusShiftIds.has(item.shift.workShiftId) &&
                    (new Date(item.shift.endTime) < now || completedAttendanceStatuses.includes(status));
            })
            .sort((a, b) => new Date(b.shift.startTime) - new Date(a.shift.startTime));
    }, [myShiftItems, focusShiftIds, now]);

    const paginatedHistoryItems = useMemo(() => {
        const startIndex = (historyPage - 1) * HISTORY_PAGE_SIZE;
        return historyItems.slice(startIndex, startIndex + HISTORY_PAGE_SIZE);
    }, [historyItems, historyPage]);

    const completedCount = useMemo(
        () => myShiftItems.filter((item) => completedAttendanceStatuses.includes(item.assignment?.attendanceStatus)).length,
        [myShiftItems]
    );

    const pendingIncomingCount = useMemo(
        () => incomingRequests.filter((request) => request.status === 'Pending').length,
        [incomingRequests]
    );

    const needsActionCount = useMemo(
        () => myShiftItems.filter((item) => getAttendanceActionState(item.shift, item.assignment).enabled).length + pendingIncomingCount,
        [myShiftItems, pendingIncomingCount, getAttendanceActionState]
    );

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(historyItems.length / HISTORY_PAGE_SIZE));
        if (historyPage > totalPages) setHistoryPage(totalPages);
    }, [historyPage, historyItems.length]);

    const toggleShiftRegistrationChoice = (registrationWindow, shift) => {
        if (!registrationWindow.canSubmit) {
            toast.error('Khung đăng ký ca hiện chưa mở hoặc đã đóng');
            return;
        }
        if ((registrationWindow.mySelectedCount || 0) > 0 && Number(registrationWindow.remainingRegistrationEdits || 0) <= 0) {
            toast.error('Bạn đã dùng hết 2 lần chỉnh sửa đăng ký ca');
            return;
        }

        const windowId = registrationWindow.shiftRegistrationWindowId;
        const selection = getRegistrationSelection(windowId);
        const isSelected = selection.shiftIds.includes(shift.workShiftId);
        const shiftIds = isSelected
            ? selection.shiftIds.filter((id) => id !== shift.workShiftId)
            : [...selection.shiftIds, shift.workShiftId];

        const selectedShifts = shiftIds
            .map((id) => (registrationWindow.shifts || []).find((item) => item.workShiftId === id))
            .filter(Boolean);

        const hasOverlap = selectedShifts.some((current, index) =>
            selectedShifts.some((other, otherIndex) => otherIndex > index && shiftsOverlap(current, other))
        );

        if (hasOverlap) {
            toast.error('Bạn không thể chọn hai ca bị trùng thời gian');
            return;
        }

        setRegistrationSelections((prev) => ({
            ...prev,
            [windowId]: { shiftIds }
        }));
    };

    const submitRegistration = async (registrationWindow) => {
        const windowId = registrationWindow.shiftRegistrationWindowId;
        const selection = getRegistrationSelection(windowId);
        const minFixedShifts = Number(registrationWindow.minFixedShifts || 0);

        if (selection.shiftIds.length < minFixedShifts) {
            toast.error(`Bạn cần chọn ít nhất ${minFixedShifts} ca`);
            return;
        }

        if ((registrationWindow.mySelectedCount || 0) > 0 && Number(registrationWindow.remainingRegistrationEdits || 0) <= 0) {
            toast.error('Bạn đã dùng hết 2 lần chỉnh sửa đăng ký ca');
            return;
        }

        setSubmittingWindowId(windowId);
        try {
            await api.post(`/workforce/registration-windows/${windowId}/submit`, {
                shiftIds: selection.shiftIds
            });
            toast.success((registrationWindow.mySelectedCount || 0) > 0 ? 'Đã lưu chỉnh sửa đăng ký ca' : 'Đã đăng ký ca làm cho tuần sau');
            await fetchWorkData();
        } catch (error) {
            if (error.response?.status === 409) {
                toast.error('Có người vừa lấy slot này trước bạn. Lịch sẽ được tải lại');
                await fetchWorkData();
            } else {
                toast.error(error.response?.data?.message || 'Không thể đăng ký ca làm');
            }
        } finally {
            setSubmittingWindowId(null);
        }
    };

    const checkIn = async (assignmentId) => {
        setProcessingId(assignmentId);
        try {
            await api.post(`/workforce/attendance/${assignmentId}/check-in`);
            toast.success('Đã vào ca.');
            await fetchWorkData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể vào ca.');
        } finally {
            setProcessingId(null);
        }
    };

    const checkOut = async (assignmentId) => {
        setProcessingId(assignmentId);
        try {
            await api.post(`/workforce/attendance/${assignmentId}/check-out`);
            toast.success('Đã ra ca. Đang chờ nhà tuyển dụng duyệt công.');
            await fetchWorkData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể ra ca.');
        } finally {
            setProcessingId(null);
        }
    };

    const canPassShift = (shift, assignment) => {
        if (!assignment || assignment.status !== 'Assigned') return false;
        if (assignment.attendanceStatus) return false;
        return new Date(shift.startTime).getTime() - Date.now() > 2 * 60 * 60 * 1000;
    };

    const closePassModal = () => {
        setPassModal({ open: false, assignment: null, shift: null, candidates: [], reason: '', toEmployeeUserId: '' });
    };

    const openPassModal = async (shift, assignment) => {
        try {
            const response = await api.get(`/workforce/shift-pass/${assignment.shiftAssignmentId}/candidates`);
            const candidates = response.data || [];
            if (candidates.length === 0) {
                toast.error('Không có đồng nghiệp phù hợp trong chi nhánh này để nhường ca');
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
            toast.error(error.response?.data?.message || 'Không thể tải danh sách đồng nghiệp để nhường ca');
        }
    };

    const submitPassRequest = async (event) => {
        event.preventDefault();
        try {
            await api.post('/workforce/shift-pass', {
                shiftAssignmentId: passModal.assignment.shiftAssignmentId,
                toEmployeeUserId: Number(passModal.toEmployeeUserId),
                reason: passModal.reason
            });
            toast.success('Đã gửi yêu cầu nhường ca');
            closePassModal();
            fetchWorkData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể gửi yêu cầu nhường ca');
        }
    };

    const respondPassRequest = async (requestId, action) => {
        try {
            await api.patch(`/workforce/shift-pass/${requestId}/${action}`);
            toast.success(action === 'accept' ? 'Đã nhận ca thành công' : 'Đã từ chối nhận ca');
            fetchWorkData();
        } catch (error) {
            toast.error(error.response?.data?.message || (action === 'accept' ? 'Không thể đồng ý nhận ca' : 'Không thể từ chối nhận ca'));
        }
    };

    const renderAction = (shift, assignment) => {
        if (!shift || !assignment) return null;

        const action = getAttendanceActionState(shift, assignment);
        const disabled = processingId === assignment.shiftAssignmentId || !action.enabled;

        if (action.kind === 'status') {
            return (
                <span className={`inline-flex h-10 items-center rounded-xl border px-4 text-sm font-black ${action.className}`}>
                    {action.label}
                </span>
            );
        }

        if (!['checkin', 'checkout'].includes(action.kind)) return null;

        const isCheckout = action.kind === 'checkout';
        return (
            <div className="flex flex-col items-start gap-1 lg:items-end">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => isCheckout ? checkOut(assignment.shiftAssignmentId) : checkIn(assignment.shiftAssignmentId)}
                    className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-black transition-all disabled:cursor-not-allowed ${
                        action.enabled
                            ? isCheckout
                                ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/20 hover:bg-sky-700'
                                : 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-dk'
                            : 'border border-slate-200 bg-slate-100 text-slate-800'
                    }`}
                >
                    <span className="material-symbols-outlined !text-[18px]">
                        {action.enabled ? (isCheckout ? 'logout' : 'login') : 'lock_clock'}
                    </span>
                    {processingId === assignment.shiftAssignmentId ? 'Đang xử lý...' : action.label}
                </button>
                {action.hint && (
                    <span className="max-w-[210px] text-[11px] font-semibold text-slate-800 lg:text-right">
                        {action.hint}
                    </span>
                )}
            </div>
        );
    };

    const renderAttendanceCard = ({ shift, assignment }, showActions = true, compact = false) => {
        const meta = attendanceMeta(assignment?.attendanceStatus);
        const action = getAttendanceActionState(shift, assignment);
        const needsAction = action.enabled;

        return (
            <article
                key={shift.workShiftId}
                className={`rounded-[22px] border bg-white p-4 shadow-sm transition-all duration-200 sm:p-5 ${
                    needsAction
                        ? 'border-primary/30 shadow-primary/10 ring-1 ring-primary/10'
                        : 'border-slate-200/70'
                }`}
            >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                    <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${meta.className}`}>
                                {meta.label}
                            </span>
                            <span className="rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-[10px] font-black text-slate-700">
                                {assignmentSourceLabel(assignment?.assignmentSource)}
                            </span>
                            {needsAction && (
                                <span className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[10px] font-black text-primary">
                                    Cần thao tác
                                </span>
                            )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                            <div className="min-w-0">
                                <h3 className="truncate text-base font-black tracking-tight text-slate-950">{getShiftDisplayName(shift.title)}</h3>
                                <p className="mt-1 truncate text-sm font-semibold text-slate-700">{shift.branchName}</p>
                                <p className="mt-1 text-xs font-bold text-slate-800">{formatFullDate(shift.startTime)}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 sm:text-right">
                                <p className="text-[10px] font-black text-slate-800">Giờ ca</p>
                                <p className="mt-0.5 text-sm font-black tabular-nums text-slate-900">{formatTime(shift.startTime)} đến {formatTime(shift.endTime)}</p>
                            </div>
                        </div>

                        {!compact && (
                            <div className="mt-4 grid gap-2 text-xs text-slate-700 sm:grid-cols-3">
                                <span className="rounded-xl bg-slate-50 px-3 py-2">
                                    Check-in: <b className="text-slate-700">{formatDateTime(assignment?.checkInAt)}</b>
                                </span>
                                <span className="rounded-xl bg-slate-50 px-3 py-2">
                                    Check-out: <b className="text-slate-700">{formatDateTime(assignment?.checkOutAt)}</b>
                                </span>
                                <span className="rounded-xl bg-slate-50 px-3 py-2">
                                    Đã làm: <b className="text-slate-700">{formatMinutes(assignment?.workedMinutes || 0)}</b>
                                </span>
                            </div>
                        )}
                    </div>

                    {showActions && (
                        <div className="flex flex-wrap gap-2 lg:max-w-[280px] lg:justify-end">
                            {canPassShift(shift, assignment) && (
                                <button
                                    type="button"
                                    onClick={() => openPassModal(shift, assignment)}
                                    className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                                >
                                    <span className="material-symbols-outlined !text-[18px]">swap_horiz</span>
                                    Nhường ca
                                </button>
                            )}
                            {renderAction(shift, assignment)}
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
        const minFixedShifts = Number(registrationWindow.minFixedShifts || 0);
        const registrationLocked = !registrationWindow.canSubmit || (hasSubmitted && remainingEdits <= 0);
        const selectedTotal = selection.shiftIds.length;
        const remainingRequiredCount = Math.max(0, minFixedShifts - selectedTotal);
        const submitDisabled = !registrationWindow.canSubmit ||
            submittingWindowId === windowId ||
            (hasSubmitted && remainingEdits <= 0) ||
            selectedTotal < minFixedShifts;
        const registrationWeekDays = getWeekDays(registrationWindow.weekStartDate);
        const shiftsInWindow = registrationWindow.shifts || [];

        return (
            <article key={windowId} className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-sm">
                <div className="grid gap-4 border-b border-slate-100 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div>
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="rounded-xl bg-primary/10 px-3 py-1 text-xs font-black text-primary ring-1 ring-primary/15">
                                {registrationWindow.branchName}
                            </span>
                            <span className={`rounded-xl border px-3 py-1 text-xs font-black ${
                                registrationWindow.canSubmit
                                    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-200 bg-slate-100 text-slate-800'
                            }`}>
                                {registrationWindow.canSubmit ? 'Đang mở đăng ký' : registrationWindow.status}
                            </span>
                        </div>
                        <h3 className="text-lg font-black tracking-tight text-slate-950">
                            Tuần bắt đầu {new Date(registrationWindow.weekStartDate).toLocaleDateString('vi-VN')}
                        </h3>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                            Mở từ {formatDateTime(registrationWindow.openAt)} đến {formatDateTime(registrationWindow.closeAt)}
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:min-w-[390px]">
                        <MiniMetric label="Đã chọn" value={selectedTotal} tone="primary" />
                        <MiniMetric label="Cần thêm" value={remainingRequiredCount} tone="slate" />
                        <MiniMetric label="Lượt sửa" value={hasSubmitted ? `${remainingEdits}/2` : '2/2'} tone={registrationLocked ? 'slate' : 'emerald'} />
                    </div>
                </div>

                {registrationWindow.understaffedShifts?.length > 0 && (
                    <div className="mx-5 mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
                        <p className="text-sm font-black text-rose-700">
                            Lịch đã chốt nhưng còn {registrationWindow.understaffedShifts.length} ca thiếu người
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-rose-600">
                            Doanh nghiệp có thể mở tuyển thêm, kêu gọi đăng ký thêm hoặc phân công thủ công cho các ca thiếu.
                        </p>
                    </div>
                )}

                <div className="space-y-5 p-5">
                    <div className="grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="text-xs font-black text-slate-800">Cách chọn ca</p>
                            <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700">
                                Chọn các ca bạn có thể làm trong tuần sau. Hệ thống kiểm tra trùng lịch và ưu tiên người gửi sớm hơn khi doanh nghiệp chốt ca.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                            <p className="text-xs font-black text-emerald-700">Điều kiện gửi</p>
                            <p className="mt-1 text-sm font-black text-emerald-800">
                                Cần tối thiểu {minFixedShifts} ca, hiện còn thiếu {remainingRequiredCount}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-1.5">
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-7">
                            {registrationWeekDays.map((day) => {
                                const dayKey = getDateKey(day);
                                const dayShifts = shiftsInWindow
                                    .filter((shift) => getDateKey(shift.startTime) === dayKey)
                                    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

                                return (
                                    <div key={dayKey} className="min-w-0 overflow-hidden rounded-xl border border-slate-100 bg-white">
                                        <div className={`flex h-12 items-center justify-between gap-1.5 border-b border-slate-100 px-2.5 ${
                                            isToday(day) ? 'bg-primary/10' : 'bg-white'
                                        }`}>
                                            <div className="min-w-0">
                                                <p className={`truncate text-[11px] font-black ${
                                                    isToday(day) ? 'text-primary' : 'text-slate-800'
                                                }`}>
                                                    {getDayName(day.getDay())}
                                                </p>
                                                <p className="mt-0.5 text-sm font-black tabular-nums text-slate-950">
                                                    {day.getDate()}/{day.getMonth() + 1}
                                                </p>
                                            </div>
                                            <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black tabular-nums text-slate-700">
                                                {dayShifts.length}
                                            </span>
                                        </div>

                                        <div className="grid min-h-[232px] auto-rows-[68px] gap-1.5 p-1.5">
                                            {dayShifts.length === 0 ? (
                                                <div className="flex h-[68px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs font-black text-slate-300">
                                                    Trống
                                                </div>
                                            ) : dayShifts.map((shift) => {
                                                const activeCount = getActiveAssignments(shift).length;
                                                const mine = getMyAssignment(shift);
                                                const myPreferred = mine?.status === 'Preferred' ? mine : null;
                                                const preferredCount = getPreferredAssignments(shift).length;
                                                const isSelected = selectedSet.has(shift.workShiftId);
                                                const isFull = !registrationWindow.canSubmit && activeCount >= shift.requiredPeople && !mine && !isSelected;
                                                const isUnderstaffed = shift.fillStatus === 'Understaffed' && Number(shift.missingCount || 0) > 0;
                                                const cardDisabled = registrationLocked || isFull;
                                                const chosenMeta = myPreferred?.assignedAt ? `Đã gửi lúc ${formatDateTime(myPreferred.assignedAt)}` : 'Đã chọn ca này';
                                                const title = `${getShiftDisplayName(shift.title)} · ${formatTime(shift.startTime)}-${formatTime(shift.endTime)}${isSelected ? ` · ${chosenMeta}` : ''}`;

                                                return (
                                                    <button
                                                        key={shift.workShiftId}
                                                        type="button"
                                                        title={title}
                                                        disabled={cardDisabled}
                                                        onClick={() => toggleShiftRegistrationChoice(registrationWindow, shift)}
                                                        className={`group relative flex h-[68px] w-full flex-col justify-between overflow-hidden rounded-xl border px-2 py-1.5 text-left transition duration-200 active:scale-[0.99] disabled:cursor-not-allowed ${
                                                            isSelected
                                                                ? 'border-primary/45 bg-primary/10 shadow-sm ring-1 ring-primary/20'
                                                                : isUnderstaffed || isFull
                                                                    ? 'border-rose-100 bg-rose-50/70 opacity-80'
                                                                    : 'border-slate-100 bg-white hover:border-primary/35 hover:bg-primary/5'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-1.5">
                                                            <div className="min-w-0">
                                                                <p className="truncate text-[9px] font-black tabular-nums text-slate-800">
                                                                    {formatTime(shift.startTime)}-{formatTime(shift.endTime)}
                                                                </p>
                                                                <h4 className="mt-0.5 truncate text-[11px] font-black leading-4 text-slate-950">
                                                                    {getShiftDisplayName(shift.title)}
                                                                </h4>
                                                            </div>
                                                            <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-black tabular-nums ${
                                                                isUnderstaffed || isFull ? 'bg-rose-100 text-rose-600' : 'bg-emerald-50 text-emerald-700'
                                                            }`}>
                                                                {isUnderstaffed ? `-${shift.missingCount}` : `${activeCount}/${shift.requiredPeople}`}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center justify-between gap-1.5">
                                                            <span className={`min-w-0 truncate rounded-md px-1.5 py-1 text-[9px] font-black ${
                                                                isSelected
                                                                    ? 'bg-primary text-white'
                                                                    : preferredCount > 0
                                                                        ? 'bg-amber-50 text-amber-700'
                                                                        : 'bg-slate-100 text-slate-700'
                                                            }`}>
                                                                {isSelected ? 'Đã chọn' : preferredCount > 0 ? `${preferredCount} đăng ký` : 'Chọn ca'}
                                                            </span>
                                                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition ${
                                                                isSelected
                                                                    ? 'bg-white text-primary shadow-sm'
                                                                    : 'bg-slate-50 text-slate-300 group-hover:bg-white group-hover:text-primary'
                                                            }`}>
                                                                <span className="material-symbols-outlined !text-[15px]">
                                                                    {isSelected ? 'check' : 'add'}
                                                                </span>
                                                            </span>
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
                </div>

                <div className="grid gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <p className="text-xs font-semibold leading-relaxed text-slate-700">
                        Sau lần gửi đầu, bạn chỉ được lưu chỉnh sửa tối đa 2 lần trước khi doanh nghiệp chốt ca hoặc AI tự động xếp lịch.
                    </p>
                    <button
                        type="button"
                        disabled={submitDisabled}
                        onClick={() => submitRegistration(registrationWindow)}
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-black text-white shadow-lg shadow-primary/20 transition hover:bg-primary-dk disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submittingWindowId === windowId ? 'Đang gửi...' : hasSubmitted ? 'Lưu chỉnh sửa' : 'Gửi đăng ký ca'}
                    </button>
                </div>
            </article>
        );
    };

    const renderPassRequestCard = (request, type) => {
        const meta = passRequestMeta(request.status);
        const isIncoming = type === 'incoming';

        return (
            <article key={request.shiftPassRequestId} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h4 className="truncate text-sm font-black text-slate-900">{request.shiftTitle}</h4>
                        <p className="mt-1 text-xs font-semibold text-slate-700">
                            {isIncoming ? `${request.fromEmployeeName} muốn nhường ca này cho bạn` : `Gửi đến ${request.toEmployeeName}`}
                        </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${meta.className}`}>
                        {meta.label}
                    </span>
                </div>
                <p className="mt-3 text-xs font-semibold text-slate-800">
                    {formatDateTime(request.shiftStartTime)} · hết hạn {formatDateTime(request.expiresAt)}
                </p>

                {isIncoming && request.status === 'Pending' && (
                    <div className="mt-4 flex gap-2">
                        <button
                            type="button"
                            onClick={() => respondPassRequest(request.shiftPassRequestId, 'accept')}
                            className="inline-flex h-9 items-center rounded-xl bg-emerald-600 px-4 text-xs font-black text-white transition hover:bg-emerald-700"
                        >
                            Đồng ý nhận
                        </button>
                        <button
                            type="button"
                            onClick={() => respondPassRequest(request.shiftPassRequestId, 'reject')}
                            className="inline-flex h-9 items-center rounded-xl bg-rose-50 px-4 text-xs font-black text-rose-600 ring-1 ring-rose-100 transition hover:bg-rose-600 hover:text-white"
                        >
                            Từ chối
                        </button>
                    </div>
                )}
            </article>
        );
    };

    if (loading) {
        return (
            <div className="applicant-shell min-h-[calc(100vh-80px)] px-4 py-8 font-display">
                <div className="mx-auto max-w-[1440px] space-y-5">
                    <div className="h-40 animate-pulse rounded-[28px] bg-white/80" />
                    <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
                        <div className="h-80 animate-pulse rounded-[28px] bg-white/80" />
                        <div className="h-80 animate-pulse rounded-[28px] bg-white/80" />
                    </div>
                </div>
            </div>
        );
    }

    const primaryShift = focusShiftItems[0] || nextShiftItem;
    const primaryAction = primaryShift ? getAttendanceActionState(primaryShift.shift, primaryShift.assignment) : null;
    const scrollToWorkSection = (sectionId) => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const openWorkShortcut = (sectionId, tab) => {
        if (tab) setActiveTab(tab);
        window.setTimeout(() => scrollToWorkSection(sectionId), 0);
    };

    return (
        <div className="applicant-shell min-h-screen pb-16 font-display text-slate-900">
            <header className="border-b border-slate-200 bg-white shadow-sm">
                <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                                    <span className="material-symbols-outlined !text-[16px]">work_history</span>
                                    Không gian làm việc
                                </span>
                                {needsActionCount > 0 ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
                                        <span className="material-symbols-outlined !text-[16px]">warning</span>
                                        {needsActionCount} việc cần xử lý
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                                        <span className="material-symbols-outlined !text-[16px]">check_circle</span>
                                        Không có việc gấp
                                    </span>
                                )}
                            </div>
                            <h1 className="mt-4 text-2xl font-black text-primary-dk sm:text-3xl">
                                Công việc của tôi
                            </h1>
                            <p className="mt-1 text-sm font-medium text-slate-600">
                                Theo dõi công việc chính thức, đăng ký ca tuần sau, chấm công và xử lý nhường ca.
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <WorkStat label="Công việc" value={activeEmployments.length} icon="badge" tone="slate" />
                        <WorkStat label="Ca hôm nay" value={todayShiftItems.length} icon="today" tone="sky" />
                        <WorkStat label="Đã ghi nhận" value={completedCount} icon="task_alt" tone="emerald" />
                        <WorkStat label="Yêu cầu chờ" value={pendingIncomingCount} icon="swap_horiz" tone="amber" />
                    </div>
                </div>
            </header>

            <main className="mx-auto grid max-w-[1440px] items-start gap-6 px-4 py-8 sm:px-6 xl:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
                <div className="min-w-0 space-y-6">
                    {primaryShift && (
                        <section className="rounded-[24px] border border-primary/20 bg-primary/5 p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined !text-[20px] text-primary">bolt</span>
                                        <h2 className="text-lg font-black tracking-tight text-primary">Ca ưu tiên: {getShiftDisplayName(primaryShift.shift.title)}</h2>
                                    </div>
                                    <p className="mt-1 text-sm font-semibold text-slate-700">
                                        {formatFullDate(primaryShift.shift.startTime)}, {formatTime(primaryShift.shift.startTime)} đến {formatTime(primaryShift.shift.endTime)} tại {primaryShift.shift.branchName}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedShiftForDetails(primaryShift.shift)}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-primary/30 hover:text-primary"
                                >
                                    <span className="material-symbols-outlined !text-[16px]">visibility</span>
                                    Xem ca
                                </button>
                            </div>
                            
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[16px] bg-white p-4 ring-1 ring-slate-200/60 shadow-sm">
                                <div className="grid grid-cols-3 gap-6 text-sm">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500">Check-in</p>
                                        <p className="mt-0.5 font-black text-slate-900">{formatTime(primaryShift.assignment.checkInAt)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500">Check-out</p>
                                        <p className="mt-0.5 font-black text-slate-900">{formatTime(primaryShift.assignment.checkOutAt)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500">Đã làm</p>
                                        <p className="mt-0.5 font-black text-slate-900">{formatMinutes(primaryShift.assignment.workedMinutes || 0)}</p>
                                    </div>
                                </div>
                                <div className="shrink-0">
                                    {renderAction(primaryShift.shift, primaryShift.assignment)}
                                </div>
                            </div>
                        </section>
                    )}

                    <section id="registration" className="scroll-mt-24">
                        <div className="mb-4">
                            <h2 className="text-xl font-black tracking-tight text-primary-dk">Đăng ký ca tuần sau</h2>
                            <p className="mt-1 text-sm font-medium text-slate-600">Chọn ca theo từng ngày, hệ thống tự kiểm tra trùng lịch trước khi gửi.</p>
                        </div>
                        {registrationWindows.length === 0 ? (
                            <EmptyState
                                icon="event_available"
                                title="Chưa có form đăng ký ca"
                                description="Khi doanh nghiệp mở đăng ký lịch tuần sau, form sẽ xuất hiện tại đây."
                            />
                        ) : (
                            <div className="space-y-4">
                                {registrationWindows.map(renderRegistrationWindow)}
                            </div>
                        )}
                    </section>

                    <section id="attendance" className="scroll-mt-24 overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-sm">
                        <div className="grid gap-4 border-b border-slate-100 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                            <div>
                                <h2 className="text-xl font-black tracking-tight text-primary-dk">Lịch làm việc và chấm công</h2>
                                <p className="mt-1 text-sm font-medium text-slate-700">Xem lịch tuần, vào ca/ra ca và kiểm tra lịch sử công.</p>
                            </div>
                            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('mylist')}
                                    className={`h-10 rounded-lg px-4 text-xs font-black transition ${
                                        activeTab === 'mylist' ? 'bg-white text-primary shadow-sm' : 'text-slate-700 hover:text-slate-900'
                                    }`}
                                >
                                    Chấm công
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('history')}
                                    className={`h-10 rounded-lg px-4 text-xs font-black transition ${
                                        activeTab === 'history' ? 'bg-white text-primary shadow-sm' : 'text-slate-700 hover:text-slate-900'
                                    }`}
                                >
                                    Lịch sử
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('timetable')}
                                    className={`h-10 rounded-lg px-4 text-xs font-black transition ${
                                        activeTab === 'timetable' ? 'bg-white text-primary shadow-sm' : 'text-slate-700 hover:text-slate-900'
                                    }`}
                                >
                                    Lưới tuần
                                </button>
                            </div>
                        </div>

                        {activeTab === 'timetable' ? (
                            <div>
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
                                    <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => navigateWeek(-1)}
                                            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-800 transition hover:bg-slate-50"
                                        >
                                            <span className="material-symbols-outlined !text-[20px]">chevron_left</span>
                                        </button>
                                        <span className="min-w-0 px-2 text-center text-xs font-black text-slate-700 sm:min-w-[190px] sm:px-3">
                                            {formatWeekRange()}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => navigateWeek(1)}
                                            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-800 transition hover:bg-slate-50"
                                        >
                                            <span className="material-symbols-outlined !text-[20px]">chevron_right</span>
                                        </button>
                                    </div>
                                    <span className="text-xs font-black text-slate-800">{shifts.length} ca đang hoạt động</span>
                                </div>
                                <div className="overflow-hidden">
                                    <div className="w-full bg-white">
                                        <div className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] border-b border-slate-100 bg-slate-50/60 py-3 text-center sm:grid-cols-[64px_repeat(7,minmax(0,1fr))] sm:py-4">
                                            <div className="flex items-center justify-center text-xs font-black text-slate-800">Giờ</div>
                                            {weekDays.map((day) => (
                                                <div key={getDateKey(day)} className={`min-w-0 text-[10px] sm:text-xs ${isToday(day) ? 'font-black text-primary' : 'font-bold text-slate-700'}`}>
                                                    <div className="truncate px-0.5">{getDayName(day.getDay())}</div>
                                                    <div className="mt-0.5 text-sm font-black sm:text-base">{day.getDate()}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="relative grid grid-cols-[44px_repeat(7,minmax(0,1fr))] sm:grid-cols-[64px_repeat(7,minmax(0,1fr))]" style={{ height: 'clamp(440px, 62dvh, 620px)' }}>
                                            <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateRows: 'repeat(14, minmax(0, 1fr))' }}>
                                                {Array.from({ length: 14 }).map((_, index) => (
                                                    <div key={index} className="h-full w-full border-b border-slate-100/70" />
                                                ))}
                                            </div>

                                            <div className="flex h-full select-none flex-col justify-between border-r border-slate-100 bg-slate-50/50 py-1 text-[9px] font-black text-slate-800 sm:text-[10px]">
                                                {Array.from({ length: 15 }).map((_, hour) => (
                                                    <div key={hour} className="flex h-5 items-center justify-center text-center">
                                                        {String(8 + hour).padStart(2, '0')}:00
                                                    </div>
                                                ))}
                                            </div>

                                            {weekDays.map((day) => {
                                                const dayShifts = shifts.filter((shift) => isSameCalendarDay(shift.startTime, day));
                                                const positioned = positionShifts(dayShifts);

                                                return (
                                                    <div key={getDateKey(day)} className={`relative h-full border-r border-slate-100 ${isToday(day) ? 'bg-primary/5' : 'bg-white'}`}>
                                                        {positioned.map((shift) => {
                                                            const { top, height } = getShiftPosition(shift.startTime, shift.endTime);
                                                            const widthPercent = 100 / shift.totalCols;
                                                            const leftPercent = (shift.colIndex * 100) / shift.totalCols;
                                                            const activeAssignments = getActiveAssignments(shift);
                                                            const mine = getMyAssignment(shift);
                                                            const isMine = Boolean(mine);

                                                            return (
                                                                <button
                                                                    key={shift.workShiftId}
                                                                    type="button"
                                                                    onClick={() => setSelectedShiftForDetails(shift)}
                                                                    style={{
                                                                        position: 'absolute',
                                                                        top,
                                                                        height,
                                                                        left: `${leftPercent}%`,
                                                                        width: `${widthPercent}%`,
                                                                        padding: '2px'
                                                                    }}
                                                                    className="group text-left"
                                                                >
                                                                    <div className={`flex h-full flex-col justify-between overflow-hidden rounded-xl border p-2 shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md ${
                                                                        isMine
                                                                            ? 'border-primary/30 bg-primary/10 text-primary'
                                                                            : 'border-slate-200 bg-slate-50 text-slate-900'
                                                                    }`}>
                                                                        <div className="min-w-0">
                                                                            <div className="flex items-start justify-between gap-1">
                                                                                <h5 className="truncate text-[9px] font-black sm:text-[10px]">
                                                                                    {getShiftDisplayName(shift.title)}
                                                                                </h5>
                                                                                {isMine && (
                                                                                    <span className="hidden shrink-0 rounded bg-primary px-1.5 py-0.5 text-[8px] font-black uppercase leading-none text-white sm:inline-flex">
                                                                                        Tôi
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <p className="mt-1 truncate text-[8px] font-semibold opacity-75 sm:text-[9px]">
                                                                                {formatTime(shift.startTime)} đến {formatTime(shift.endTime)}
                                                                            </p>
                                                                            <div className="mt-1.5 flex max-h-[48px] flex-wrap gap-1 overflow-hidden sm:max-h-[62px]">
                                                                                {activeAssignments.length > 0 ? (
                                                                                    activeAssignments.map((assignment) => {
                                                                                        const isMe = assignment.employeeUserId === currentUserId;
                                                                                        return (
                                                                                            <span
                                                                                                key={assignment.shiftAssignmentId}
                                                                                                className={`max-w-full truncate rounded-md border px-1 py-0.5 text-[8px] font-black ${
                                                                                                    isMe ? 'border-primary/20 bg-primary/10 text-primary' : 'border-slate-100 bg-white text-slate-700'
                                                                                                }`}
                                                                                                title={getDisplayEmployeeName(assignment)}
                                                                                            >
                                                                                                {getDisplayEmployeeName(assignment)}
                                                                                            </span>
                                                                                        );
                                                                                    })
                                                                                ) : (
                                                                                    <span className="rounded-md border border-dashed border-slate-200 bg-white/70 px-1.5 py-0.5 text-[8px] font-bold text-slate-800">
                                                                                        Chưa xếp
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <span className="mt-auto text-[8px] font-black opacity-60">
                                                                            {activeAssignments.length}/{shift.requiredPeople} nhân viên
                                                                        </span>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : activeTab === 'history' ? (
                            <div id="work-history" className="space-y-5 bg-slate-50/70 p-5">
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <MiniMetric label="Tổng lịch sử" value={historyItems.length} tone="slate" />
                                    <MiniMetric label="Đã ghi nhận" value={completedCount} tone="emerald" />
                                    <MiniMetric label="Mỗi trang" value={HISTORY_PAGE_SIZE} tone="primary" />
                                </div>

                                <section className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white">
                                    <div className="grid gap-3 border-b border-slate-100 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                                        <div>
                                            <h3 className="text-base font-black text-slate-950">Lịch sử đã làm</h3>
                                            <p className="mt-0.5 text-sm font-medium text-slate-700">
                                                Danh sách được phân trang để kiểm tra công gọn hơn.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('mylist')}
                                            className="inline-flex h-10 w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-800 transition hover:border-primary/30 hover:text-primary"
                                        >
                                            <span className="material-symbols-outlined !text-[17px]">fact_check</span>
                                            Về chấm công
                                        </button>
                                    </div>

                                    <div className="space-y-3 p-4 sm:p-5">
                                        {historyItems.length === 0 ? (
                                            <EmptyState
                                                icon="history"
                                                title="Chưa có lịch sử chấm công"
                                                description="Các ca đã kết thúc hoặc đã duyệt công sẽ nằm ở đây."
                                            />
                                        ) : (
                                            paginatedHistoryItems.map((item) => renderAttendanceCard(item, false, true))
                                        )}
                                    </div>

                                    {historyItems.length > 0 && (
                                        <Pagination
                                            currentPage={historyPage}
                                            totalItems={historyItems.length}
                                            itemsPerPage={HISTORY_PAGE_SIZE}
                                            onPageChange={setHistoryPage}
                                            label="ca"
                                        />
                                    )}
                                </section>
                            </div>
                        ) : (
                            <div className="space-y-5 bg-slate-50/70 p-5">
                                {myShiftItems.length === 0 ? (
                                    <EmptyState
                                        icon="event_busy"
                                        title="Không có ca làm việc nào"
                                        description="Khi bạn được phân công ca làm việc, thông tin chấm công sẽ xuất hiện tại đây."
                                    />
                                ) : (
                                    <>
                                        <div className="grid gap-3 sm:grid-cols-3">
                                            <MiniMetric label="Ca hôm nay" value={todayShiftItems.length} tone="primary" />
                                            <MiniMetric label="Đã ghi nhận" value={completedCount} tone="emerald" />
                                            <MiniMetric label="Lịch sử" value={historyItems.length} tone="slate" />
                                        </div>

                                        <section className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white">
                                            <div className="grid gap-3 border-b border-slate-100 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                                                <div>
                                                    <h3 className="text-base font-black text-slate-950">
                                                        {focusDate && isSameCalendarDay(focusDate, now) ? 'Ca cần xử lý hôm nay' : 'Ngày làm việc tiếp theo'}
                                                    </h3>
                                                    <p className="mt-0.5 text-sm font-medium text-slate-700">
                                                        {focusDate ? formatFullDate(focusDate) : 'Chưa có ca sắp tới'}
                                                    </p>
                                                </div>
                                                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                                                    <span className="material-symbols-outlined !text-[16px]">rule</span>
                                                    Check-in mở trước ca 30 phút
                                                </span>
                                            </div>

                                            <div className="space-y-3 p-4 sm:p-5">
                                                {focusShiftItems.length === 0 ? (
                                                    <EmptyState
                                                        icon="event_busy"
                                                        title="Chưa có ca cần chấm công"
                                                        description="Khi có ca hôm nay hoặc ca sắp tới, hệ thống sẽ đưa lên khu vực này."
                                                    />
                                                ) : (
                                                    focusShiftItems.map((item) => renderAttendanceCard(item, true))
                                                )}
                                            </div>
                                        </section>

                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('history')}
                                            className="flex w-full items-center justify-between gap-4 rounded-[24px] border border-slate-200/70 bg-white px-5 py-4 text-left transition hover:border-primary/25 hover:shadow-sm"
                                        >
                                            <span className="flex min-w-0 items-center gap-3">
                                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                                                    <span className="material-symbols-outlined !text-[22px]">history</span>
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block text-sm font-black text-slate-950">Xem lịch sử đã làm</span>
                                                    <span className="mt-0.5 block text-xs font-semibold text-slate-700">
                                                        {historyItems.length} ca, phân trang {HISTORY_PAGE_SIZE} ca mỗi lần xem.
                                                    </span>
                                                </span>
                                            </span>
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                <span className="material-symbols-outlined !text-[19px]">arrow_forward</span>
                                            </span>
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </section>

                    <section id="pass-requests" className="scroll-mt-24 overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-sm">
                        <div className="border-b border-slate-100 p-5">
                            <h2 className="text-xl font-black tracking-tight text-primary-dk">Yêu cầu nhường ca</h2>
                            <p className="mt-1 text-sm font-medium text-slate-700">Yêu cầu tự động hết hạn 2 giờ trước khi ca bắt đầu.</p>
                        </div>
                        <div className="grid divide-y divide-slate-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                            <div className="p-5">
                                <h3 className="mb-3 text-sm font-black text-slate-700">Yêu cầu nhận từ đồng nghiệp</h3>
                                {incomingRequests.length === 0 ? (
                                    <EmptyState icon="inbox" title="Không có yêu cầu gửi đến" description="Khi đồng nghiệp muốn nhường ca cho bạn, yêu cầu sẽ xuất hiện ở đây." />
                                ) : (
                                    <div className="space-y-3">
                                        {incomingRequests.map((request) => renderPassRequestCard(request, 'incoming'))}
                                    </div>
                                )}
                            </div>
                            <div className="p-5">
                                <h3 className="mb-3 text-sm font-black text-slate-700">Yêu cầu bạn đã gửi</h3>
                                {outgoingRequests.length === 0 ? (
                                    <EmptyState icon="outbox" title="Bạn chưa gửi yêu cầu nào" description="Khi cần đổi ca, dùng nút nhường ca trong thẻ chấm công." />
                                ) : (
                                    <div className="space-y-3">
                                        {outgoingRequests.map((request) => renderPassRequestCard(request, 'outgoing'))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
                <aside className="relative min-w-0">
                    <div className="space-y-5 xl:sticky xl:top-24">
                        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-5 flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-black tracking-tight text-primary-dk">Công việc đang làm</h2>
                                    <p className="mt-1 text-sm font-medium text-slate-600">Thông tin nhân viên chính thức.</p>
                                </div>
                                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                    <span className="material-symbols-outlined">badge</span>
                                </span>
                            </div>

                            {activeEmployments.length === 0 ? (
                                <div className="rounded-2xl bg-slate-50 p-5 text-center">
                                    <p className="text-sm font-black text-slate-700">Chưa có công việc nào</p>
                                    <p className="mt-1 text-xs font-medium text-slate-500">Bạn cần chấp nhận lời mời nhận việc chính thức trước.</p>
                                    <Link to="/offers" className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-black text-white">
                                        Xem lời mời
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {activeEmployments.map((employment) => (
                                        <article key={employment.employmentId} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-base font-black text-slate-900">{employment.position}</p>
                                                    <p className="mt-1 truncate text-sm font-semibold text-slate-700">{employment.branchName}</p>
                                                </div>
                                                <span className="shrink-0 whitespace-nowrap rounded-xl bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-200">
                                                    Đang làm
                                                </span>
                                            </div>

                                            {employment.expectedShifts && (
                                                <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                                    <span className="material-symbols-outlined !text-[15px]">schedule</span>
                                                    Ca: {employment.expectedShifts}
                                                </p>
                                            )}

                                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                                <span className="rounded-xl bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                                                    {formatCurrency(employment.currentHourlyRate)}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedEmployerForReport({
                                                            id: employment.employerId,
                                                            name: employment.branchName
                                                        });
                                                        setShowReportModal(true);
                                                    }}
                                                    className="inline-flex items-center gap-1 text-xs font-black text-slate-600 transition hover:text-rose-600"
                                                    title="Báo cáo doanh nghiệp này"
                                                >
                                                    <span className="material-symbols-outlined !text-[14px]">flag</span>
                                                    Báo cáo
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="text-lg font-black tracking-tight text-primary-dk">Lối tắt</h2>
                            <div className="mt-4 grid gap-2">
                                {[
                                    { sectionId: 'registration', label: 'Đăng ký ca', icon: 'event_available' },
                                    { sectionId: 'attendance', tab: 'mylist', label: 'Chấm công', icon: 'fact_check' },
                                    { sectionId: 'attendance', tab: 'history', label: 'Lịch sử', icon: 'history' },
                                    { sectionId: 'pass-requests', label: 'Nhường ca', icon: 'swap_horiz' },
                                    { to: '/payslips', label: 'Phiếu lương', icon: 'receipt_long' }
                                ].map(({ to, sectionId, tab, label, icon }) => (
                                    to ? (
                                        <Link key={label} to={to} className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 hover:text-primary">
                                            <span className="material-symbols-outlined !text-[20px]">{icon}</span>
                                            {label}
                                        </Link>
                                    ) : (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={() => openWorkShortcut(sectionId, tab)}
                                            className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-black transition ${
                                                tab && activeTab === tab
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'text-slate-700 hover:bg-slate-50 hover:text-primary'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined !text-[20px]">{icon}</span>
                                            {label}
                                        </button>
                                    )
                                ))}
                            </div>
                        </section>
                    </div>
                </aside>
            </main>

            {selectedShiftForDetails && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm anim-fadeIn">
                    <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-2xl anim-scaleUp">
                        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-slate-50 px-5 py-5 sm:px-6">
                            <div className="min-w-0">
                                <span className="inline-flex rounded-xl bg-primary/10 px-3 py-1 text-xs font-black text-primary ring-1 ring-primary/15">
                                    {selectedShiftForDetails.branchName}
                                </span>
                                <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">{getShiftDisplayName(selectedShiftForDetails.title)}</h3>
                                <p className="mt-1 text-xs font-bold text-slate-700">
                                    {formatDateTime(selectedShiftForDetails.startTime)} đến {formatDateTime(selectedShiftForDetails.endTime)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedShiftForDetails(null)}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-800"
                                aria-label="Đóng chi tiết ca"
                            >
                                <span className="material-symbols-outlined !text-[21px]">close</span>
                            </button>
                        </div>

                        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                <span className="text-xs font-black text-slate-800">Yêu cầu chức vụ</span>
                                <p className="mt-1 text-sm font-black text-slate-800">{selectedShiftForDetails.requiredRole || 'Nhân viên'}</p>
                            </div>

                            <section className="space-y-3">
                                <h4 className="text-sm font-black text-slate-700">Thành viên trong ca làm</h4>
                                {getActiveAssignments(selectedShiftForDetails).length === 0 ? (
                                    <p className="rounded-2xl bg-slate-50 p-4 text-xs font-semibold text-slate-800">Chưa có nhân viên nào được phân công.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {getActiveAssignments(selectedShiftForDetails).map((assignment) => {
                                            const isMe = assignment.employeeUserId === currentUserId;
                                            const meta = attendanceMeta(assignment.attendanceStatus);
                                            const employeeName = getDisplayEmployeeName(assignment);

                                            return (
                                                <article key={assignment.shiftAssignmentId} className={`rounded-2xl border p-4 ${isMe ? 'border-primary/20 bg-primary/5' : 'border-slate-100 bg-slate-50/60'}`}>
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-black ${isMe ? 'bg-primary text-white' : 'bg-slate-200 text-slate-800'}`}>
                                                                {employeeName.substring(0, 1).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-black text-slate-900">
                                                                    {employeeName}
                                                                    {isMe && <span className="ml-2 rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-black text-white">Tôi</span>}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${meta.className}`}>
                                                            {meta.label}
                                                        </span>
                                                    </div>

                                                    {isMe && (
                                                        <div className="mt-4 space-y-3">
                                                            {assignment.schedulingReason && (
                                                                <div className="rounded-xl border border-primary/10 bg-primary/5 px-3 py-2 text-xs font-bold text-primary">
                                                                    {assignment.schedulingReason}
                                                                </div>
                                                            )}
                                                            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-100 bg-white p-3 text-xs">
                                                                <div>
                                                                    <span className="block font-black text-slate-800">Check-in</span>
                                                                    <span className="mt-1 block font-black text-slate-800">{formatTime(assignment.checkInAt)}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="block font-black text-slate-800">Check-out</span>
                                                                    <span className="mt-1 block font-black text-slate-800">{formatTime(assignment.checkOutAt)}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="block font-black text-slate-800">Đã làm</span>
                                                                    <span className="mt-1 block font-black text-slate-800">{formatMinutes(assignment.workedMinutes || 0)}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                                                                {canPassShift(selectedShiftForDetails, assignment) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedShiftForDetails(null);
                                                                            openPassModal(selectedShiftForDetails, assignment);
                                                                        }}
                                                                        className="inline-flex h-10 items-center rounded-xl bg-slate-100 px-4 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                                                                    >
                                                                        Nhường ca
                                                                    </button>
                                                                )}
                                                                {renderAction(selectedShiftForDetails, assignment)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>
                </div>
            )}

            {passModal.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm anim-fadeIn">
                    <form onSubmit={submitPassRequest} className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-2xl anim-scaleUp">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50 p-6">
                            <div>
                                <h3 className="text-xl font-black tracking-tight text-slate-950">Nhường ca làm việc</h3>
                                <p className="mt-1 text-sm font-medium leading-relaxed text-slate-700">
                                    Nếu đồng nghiệp từ chối hoặc yêu cầu hết hạn, ca làm việc vẫn thuộc về bạn.
                                </p>
                            </div>
                            <button type="button" onClick={closePassModal} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="space-y-4 p-6">
                            <label className="block">
                                <span className="text-xs font-black text-slate-700">Chọn đồng nghiệp</span>
                                <select
                                    value={passModal.toEmployeeUserId}
                                    onChange={(event) => setPassModal((prev) => ({ ...prev, toEmployeeUserId: event.target.value }))}
                                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                                >
                                    {passModal.candidates.map((candidate) => (
                                        <option key={candidate.employeeUserId} value={candidate.employeeUserId}>
                                            {candidate.employeeName} - {candidate.position}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-xs font-black text-slate-700">Lý do</span>
                                <textarea
                                    value={passModal.reason}
                                    onChange={(event) => setPassModal((prev) => ({ ...prev, reason: event.target.value }))}
                                    placeholder="Lý do nhường ca"
                                    className="mt-1.5 min-h-28 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                                />
                            </label>
                            <button className="flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-black text-white shadow-lg shadow-primary/20 transition hover:bg-primary-dk">
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

function MiniMetric({ label, value, tone = 'slate' }) {
    const styles = {
        primary: 'border-primary/10 bg-primary/5 text-primary',
        emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
        slate: 'border-slate-100 bg-slate-50 text-slate-800'
    };

    return (
        <div className={`rounded-2xl border px-4 py-3 ${styles[tone] || styles.slate}`}>
            <p className="text-[10px] font-black text-current opacity-70">{label}</p>
            <p className="mt-1 text-lg font-black tabular-nums">{value}</p>
        </div>
    );
}

export default MyWork;

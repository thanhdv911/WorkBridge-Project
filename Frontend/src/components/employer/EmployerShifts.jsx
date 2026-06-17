import React, { useEffect, useState } from 'react';
import api, { getApiErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import { signalRService } from '../../services/signalrService';
import { composeStreetAddress, parseStoredGoongAddress } from '../../services/goongAddressService';

const getShiftDisplayName = (title) => {
    if (title === 'Morning Shift' || title === 'Ca Sáng') return 'Ca Sáng';
    if (title === 'Afternoon Shift' || title === 'Ca Chiều') return 'Ca Chiều';
    if (title === 'Evening Shift' || title === 'Ca Tối') return 'Ca Tối';
    return title;
};

const getAttendanceStatusText = (status) => {
    switch (status) {
        case 'CheckedIn': return 'Đã vào ca';
        case 'CheckedOut': return 'Đã ra ca';
        case 'Approved': return 'Đã Duyệt';
        case 'Rejected': return 'Bị Từ Chối';
        case 'NotStarted': return 'Chưa Bắt Đầu';
        case 'Preferred': return 'Đăng ký rảnh';
        default: return status || 'Chưa Bắt Đầu';
    }
};

const getShiftStatusText = (status) => {
    switch (status) {
        case 'Draft': return 'Bản thảo';
        case 'Published': return 'Đã công bố';
        case 'Active': return 'Đang hoạt động';
        case 'Completed': return 'Đã hoàn thành';
        default: return status;
    }
};

const parseAddressComponents = (addressStr) => {
    const parsed = parseStoredGoongAddress(addressStr || '');
    return {
        city: parsed.city || parsed.province || '',
        district: parsed.district || '',
        ward: parsed.ward || '',
        address: parsed.address || parsed.detailAddress || addressStr || ''
    };
};

const EmployerShifts = () => {
    const [branches, setBranches] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isVip, setIsVip] = useState(false);
    const [checkingVip, setCheckingVip] = useState(true);

    const checkVipStatus = async () => {
        try {
            const response = await api.get('/subscriptions/status', { headers: authHeaders });
            setIsVip(response.data.isVip);
        } catch (error) {
            console.error('Error checking VIP status in shifts:', error);
        } finally {
            setCheckingVip(false);
        }
    };

    // Week navigation date (defaults to today)
    const [currentDate, setCurrentDate] = useState(new Date());
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBranchId, setSelectedBranchId] = useState('');
    const [isAiPanelOpen, setIsAiPanelOpen] = useState(true);
    const [isAiPosting, setIsAiPosting] = useState(false);
    const [isAiScheduling, setIsAiScheduling] = useState(false);
    const [isPublishingNextWeek, setIsPublishingNextWeek] = useState(false);
    const [isDeletingWeek, setIsDeletingWeek] = useState(false);
    const [aiSchedulingLogs, setAiSchedulingLogs] = useState([]);
    const [showAiSchedulerModal, setShowAiSchedulerModal] = useState(false);

    // Modals state
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedShiftForDetails, setSelectedShiftForDetails] = useState(null);
    const [assigneeId, setAssigneeId] = useState('');
    const [editingAssignmentId, setEditingAssignmentId] = useState(null);
    const [replacementEmploymentId, setReplacementEmploymentId] = useState('');
    const [assignmentActionId, setAssignmentActionId] = useState(null);

    // Templates editing state
    const [editTemplates, setEditTemplates] = useState([
        { shiftName: 'Ca Sáng', startTime: '08:00', endTime: '12:00', requiredPeople: 1 },
        { shiftName: 'Ca Chiều', startTime: '13:00', endTime: '18:00', requiredPeople: 1 },
        { shiftName: 'Ca Tối', startTime: '18:00', endTime: '22:00', requiredPeople: 1 }
    ]);

    // Create Shift Form state
    const [form, setForm] = useState({
        branchId: '',
        title: 'Ca Sáng',
        date: new Date().toISOString().split('T')[0],
        templateType: 'Ca Sáng', // Ca Sáng, Ca Chiều, Ca Tối, Custom
        startTime: '08:00',
        endTime: '12:00',
        requiredRole: 'Nhân viên',
        requiredPeople: 1
    });

    const token = localStorage.getItem('token');
    const authHeaders = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        checkVipStatus();
        fetchAll();
        fetchTemplates();

        const handleWorkforceChanged = () => {
            checkVipStatus();
            fetchAll();
            fetchTemplates();
        };
        signalRService.on('WorkforceChanged', handleWorkforceChanged);
        return () => signalRService.off('WorkforceChanged', handleWorkforceChanged);
    }, []);

    // Re-sync form times when template selection changes
    useEffect(() => {
        if (form.templateType && form.templateType !== 'Custom') {
            const tmpl = templates.find(t => t.shiftName === form.templateType);
            if (tmpl) {
                setForm(prev => ({
                    ...prev,
                    title: getShiftDisplayName(tmpl.shiftName),
                    startTime: tmpl.startTime,
                    endTime: tmpl.endTime,
                    requiredPeople: tmpl.requiredPeople || 1
                }));
            }
        }
    }, [form.templateType, templates]);

    const fetchAll = async () => {
        try {
            const [branchRes, employeeRes, shiftRes] = await Promise.all([
                api.get('/branches', { headers: authHeaders }),
                api.get('/workforce/employees', { headers: authHeaders }),
                api.get('/workforce/shifts', { headers: authHeaders })
            ]);
            setBranches(branchRes.data);
            setEmployees(employeeRes.data);
            setShifts(shiftRes.data);
            if (!form.branchId && branchRes.data[0]) {
                setForm(prev => ({ ...prev, branchId: branchRes.data[0].branchId }));
            }
        } catch (error) {
            console.error('Error loading shifts:', error);
            toast.error('Không thể tải dữ liệu ca làm việc.');
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/workforce/shift-timings', { headers: authHeaders });
            setTemplates(res.data);
            if (res.data.length > 0) {
                setEditTemplates(res.data.map(t => ({
                    shiftName: t.shiftName,
                    startTime: t.startTime,
                    endTime: t.endTime,
                    requiredPeople: t.requiredPeople
                })));
            }
        } catch (error) {
            console.error('Error fetching shift templates:', error);
        }
    };

    const saveTemplates = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/workforce/shift-timings', editTemplates, { headers: authHeaders });
            setTemplates(res.data);
            toast.success('Đã lưu cấu hình ca làm việc mẫu thành công.');
            setIsTemplateModalOpen(false);
            fetchAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể lưu cấu hình ca làm việc mẫu.');
        }
    };

    const createShift = async (e) => {
        if (e) e.preventDefault();
        if (!form.branchId || !form.date) {
            toast.error('Vui lòng chọn chi nhánh và ngày.');
            return;
        }

        let startStr = form.startTime;
        let endStr = form.endTime;

        if (form.templateType !== 'Custom') {
            const tmpl = templates.find(t => t.shiftName === form.templateType);
            if (tmpl) {
                startStr = tmpl.startTime;
                endStr = tmpl.endTime;
            }
        }

        const startTime = new Date(`${form.date}T${startStr}:00`);
        const endTime = new Date(`${form.date}T${endStr}:00`);

        if (endTime <= startTime) {
            endTime.setDate(endTime.getDate() + 1); // Ends next day
        }

        try {
            await api.post('/workforce/shifts', {
                branchId: Number(form.branchId),
                title: form.title,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                requiredRole: form.requiredRole,
                requiredPeople: Number(form.requiredPeople)
            }, { headers: authHeaders });
            toast.success('Đã tạo ca làm việc mới thành công.');
            fetchAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tạo ca làm việc.');
        }
    };

    const assignShift = async (e) => {
        e.preventDefault();
        if (!selectedShiftForDetails || !assigneeId) return;
        try {
            await api.post(`/workforce/shifts/${selectedShiftForDetails.workShiftId}/assign`, {
                employmentId: Number(assigneeId)
            }, { headers: authHeaders });
            toast.success('Đã xếp nhân viên vào ca thành công.');
            setAssigneeId('');

            // Reload context details
            const updatedShifts = await api.get('/workforce/shifts', { headers: authHeaders });
            setShifts(updatedShifts.data);
            const freshShift = updatedShifts.data.find(s => s.workShiftId === selectedShiftForDetails.workShiftId);
            setSelectedShiftForDetails(freshShift);

            fetchAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể xếp nhân viên vào ca.');
        }
    };

    const reloadSelectedShiftDetails = async (shiftId = selectedShiftForDetails?.workShiftId) => {
        const updatedShifts = await api.get('/workforce/shifts', { headers: authHeaders });
        setShifts(updatedShifts.data);
        const freshShift = updatedShifts.data.find(s => s.workShiftId === shiftId);
        if (freshShift) {
            setSelectedShiftForDetails(freshShift);
        }
        return freshShift;
    };

    const canEditShiftAssignment = (assignment) => {
        return ['Assigned', 'Preferred'].includes(assignment.status) && !assignment.attendanceRecordId;
    };

    const startReplaceAssignment = (assignment) => {
        setEditingAssignmentId(assignment.shiftAssignmentId);
        setReplacementEmploymentId('');
    };

    const cancelReplaceAssignment = () => {
        setEditingAssignmentId(null);
        setReplacementEmploymentId('');
    };

    const hasEmployeeOverlapWithShift = (employeeUserId, targetShift) => {
        if (!targetShift) return false;
        const targetStart = new Date(targetShift.startTime);
        const targetEnd = new Date(targetShift.endTime);

        return shifts.some(shift => {
            if (shift.workShiftId === targetShift.workShiftId || shift.status === 'Cancelled') return false;

            const shiftStart = new Date(shift.startTime);
            const shiftEnd = new Date(shift.endTime);
            if (!(shiftStart < targetEnd && targetStart < shiftEnd)) return false;

            return activeAssignments(shift).some(a => a.employeeUserId === employeeUserId);
        });
    };

    const replacementCandidatesForAssignment = (assignment) => {
        if (!selectedShiftForDetails) return [];

        const assignedEmploymentIds = new Set(
            activeAssignments(selectedShiftForDetails)
                .filter(a => a.shiftAssignmentId !== assignment.shiftAssignmentId)
                .map(a => a.employmentId)
        );
        const assignedEmployeeUserIds = new Set(
            activeAssignments(selectedShiftForDetails)
                .filter(a => a.shiftAssignmentId !== assignment.shiftAssignmentId)
                .map(a => a.employeeUserId)
        );

        return employeesForBranch(selectedShiftForDetails.branchId)
            .filter(emp => emp.employmentId !== assignment.employmentId)
            .filter(emp => !assignedEmploymentIds.has(emp.employmentId))
            .filter(emp => !assignedEmployeeUserIds.has(emp.employeeUserId))
            .filter(emp => !hasEmployeeOverlapWithShift(emp.employeeUserId, selectedShiftForDetails));
    };

    const replaceShiftAssignment = async (assignment) => {
        if (!replacementEmploymentId) {
            toast.error('Vui lòng chọn nhân viên thay thế.');
            return;
        }

        try {
            setAssignmentActionId(assignment.shiftAssignmentId);
            await api.patch(`/workforce/assignments/${assignment.shiftAssignmentId}/replace`, {
                employmentId: Number(replacementEmploymentId)
            }, { headers: authHeaders });
            toast.success('Đã đổi nhân viên phụ trách ca.');
            cancelReplaceAssignment();
            await reloadSelectedShiftDetails(selectedShiftForDetails.workShiftId);
            fetchAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể đổi nhân viên cho ca này.');
        } finally {
            setAssignmentActionId(null);
        }
    };

    const removeShiftAssignment = async (assignment) => {
        if (!window.confirm(`Gỡ ${assignment.employeeName} khỏi ca này?`)) {
            return;
        }

        try {
            setAssignmentActionId(assignment.shiftAssignmentId);
            await api.delete(`/workforce/assignments/${assignment.shiftAssignmentId}`, { headers: authHeaders });
            toast.success('Đã gỡ nhân viên khỏi ca.');
            if (editingAssignmentId === assignment.shiftAssignmentId) {
                cancelReplaceAssignment();
            }
            await reloadSelectedShiftDetails(selectedShiftForDetails.workShiftId);
            fetchAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể gỡ nhân viên khỏi ca này.');
        } finally {
            setAssignmentActionId(null);
        }
    };

    const approveAttendance = async (attendanceRecordId) => {
        if (!attendanceRecordId) return;
        try {
            await api.patch(`/workforce/attendance/${attendanceRecordId}/approve`, {}, { headers: authHeaders });
            toast.success('Đã phê duyệt giờ công thành công.');

            // Reload modal context
            const updatedShifts = await api.get('/workforce/shifts', { headers: authHeaders });
            setShifts(updatedShifts.data);
            const freshShift = updatedShifts.data.find(s => s.workShiftId === selectedShiftForDetails.workShiftId);
            setSelectedShiftForDetails(freshShift);

            fetchAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể phê duyệt giờ công.');
        }
    };

    const rejectAttendance = async (attendanceRecordId) => {
        const note = window.prompt('Lý do từ chối chuyên cần:', 'Cần điều chỉnh');
        if (note === null) return;
        try {
            await api.patch(`/workforce/attendance/${attendanceRecordId}/reject`, note, { headers: authHeaders });
            toast.success('Đã từ chối giờ công.');

            // Reload modal context
            const updatedShifts = await api.get('/workforce/shifts', { headers: authHeaders });
            setShifts(updatedShifts.data);
            const freshShift = updatedShifts.data.find(s => s.workShiftId === selectedShiftForDetails.workShiftId);
            setSelectedShiftForDetails(freshShift);

            fetchAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể từ chối giờ công.');
        }
    };

    const adjustAttendance = async (assignment) => {
        const currentIn = assignment.checkInAt ? new Date(assignment.checkInAt).toISOString().slice(0, 16) : '';
        const currentOut = assignment.checkOutAt ? new Date(assignment.checkOutAt).toISOString().slice(0, 16) : '';
        const checkInAt = window.prompt('Điều chỉnh giờ vào ca (YYYY-MM-DDTHH:mm):', currentIn);
        if (!checkInAt) return;
        const checkOutAt = window.prompt('Điều chỉnh giờ ra ca (YYYY-MM-DDTHH:mm):', currentOut);
        if (!checkOutAt) return;

        try {
            await api.patch(`/workforce/attendance/${assignment.attendanceRecordId}/adjust`, {
                checkInAt,
                checkOutAt,
                note: 'Quản lý điều chỉnh',
                markApproved: true
            }, { headers: authHeaders });
            toast.success('Đã điều chỉnh và phê duyệt giờ công thành công.');

            // Reload modal context
            const updatedShifts = await api.get('/workforce/shifts', { headers: authHeaders });
            setShifts(updatedShifts.data);
            const freshShift = updatedShifts.data.find(s => s.workShiftId === selectedShiftForDetails.workShiftId);
            setSelectedShiftForDetails(freshShift);

            fetchAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể điều chỉnh giờ công.');
        }
    };

    const handleDeleteShift = async () => {
        if (!selectedShiftForDetails) return;
        if (!window.confirm('Bạn có chắc chắn muốn xóa ca làm việc này không? Tất cả các phân công và lượt chuyển ca liên quan sẽ bị xóa.')) {
            return;
        }
        try {
            await api.delete(`/workforce/shifts/${selectedShiftForDetails.workShiftId}`, { headers: authHeaders });
            toast.success('Đã xóa ca làm việc thành công.');
            cancelReplaceAssignment();
            setSelectedShiftForDetails(null);
            fetchAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể xóa ca làm việc.');
        }
    };

    const handleAutoAssign = async () => {
        const windowIds = [...new Set(
            visibleWeekShifts
                .map(shift => shift.registrationWindowId)
                .filter(Boolean)
        )];

        if (windowIds.length === 0) {
            toast.error('Không tìm thấy khung đăng ký ca cho tuần được chọn.');
            return;
        }

        if (!window.confirm('Bạn có chắc chắn muốn chốt khung đăng ký này và tự động xếp lịch cho các nhân viên chưa chọn đủ ca cố định không?')) {
            return;
        }
        try {
            await Promise.all(windowIds.map(id => api.post(`/workforce/registration-windows/${id}/finalize`, {}, { headers: authHeaders })));
            toast.success('Đã chốt đăng ký ca và tự động xếp lịch cho các ca cố định còn thiếu.');
            fetchAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể chốt đăng ký ca.');
        }
    };

    const publishNextWeek = async () => {
        if (isPublishingNextWeek) return;
        if (!selectedBranchId) {
            toast.error('Vui lòng chọn chi nhánh trước khi công bố lịch tuần tới.');
            return;
        }

        setIsPublishingNextWeek(true);
        try {
            await api.post('/workforce/registration-windows/publish-next-week', {
                branchId: Number(selectedBranchId)
            }, { headers: authHeaders });
            toast.success('Đã công bố lịch làm việc tuần tới. Nhân viên có thể đăng ký ca ngay bây giờ.');
            fetchAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể công bố lịch làm việc tuần tới.');
        } finally {
            setIsPublishingNextWeek(false);
        }
    };

    const deleteAllWeekShifts = async () => {
        if (isDeletingWeek) return;
        if (visibleWeekShifts.length === 0) {
            toast.error('Tuần đang chọn chưa có ca để xóa.');
            return;
        }

        const branchName = selectedBranchId
            ? branches.find(branch => String(branch.branchId) === String(selectedBranchId))?.name || 'chi nhánh đang chọn'
            : 'tất cả chi nhánh';

        if (!window.confirm(`Xóa toàn bộ ${visibleWeekShifts.length} ca của tuần ${formatWeekRange()} tại ${branchName}? Các phân công, đăng ký rảnh, chuyển ca và chấm công liên quan cũng sẽ bị xóa.`)) {
            return;
        }

        setIsDeletingWeek(true);
        try {
            const response = await api.post('/workforce/shifts/delete-week', {
                weekStartDate: weekStart.toISOString(),
                branchId: selectedBranchId ? Number(selectedBranchId) : null
            }, { headers: authHeaders });
            const deletedCount = response.data?.deletedCount ?? visibleWeekShifts.length;
            toast.success(`Đã xóa ${deletedCount} ca trong tuần đang chọn.`);
            setSelectedShiftForDetails(null);
            cancelReplaceAssignment();
            await fetchAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể xóa tất cả ca trong tuần.');
        } finally {
            setIsDeletingWeek(false);
        }
    };

    // Calculate dates of the selected week (Mon - Sun)
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

    const weekDays = getWeekDays(currentDate);

    const navigateWeek = (weeksOffset) => {
        const nextDate = new Date(currentDate);
        nextDate.setDate(currentDate.getDate() + weeksOffset * 7);
        setCurrentDate(nextDate);
    };

    const formatWeekRange = () => {
        const start = weekDays[0];
        const end = weekDays[6];
        return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}, ${start.getFullYear()}`;
    };

    const isToday = (someDate) => {
        const today = new Date();
        return someDate.getDate() === today.getDate() &&
            someDate.getMonth() === today.getMonth() &&
            someDate.getFullYear() === today.getFullYear();
    };

    const parseDate = (value) => {
        if (!value) return null;
        let str = typeof value === 'string' ? value : value.toString();
        if (str.endsWith('Z')) str = str.slice(0, -1);
        return new Date(str);
    };

    const formatTime = (value) => {
        if (!value) return '--';
        const d = parseDate(value);
        if (!d) return '--';
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const formatDateTime = (value) => {
        if (!value) return '--';
        const d = parseDate(value);
        if (!d) return '--';
        return d.toLocaleString();
    };

    const formatMinutes = (minutes = 0) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours <= 0) return `${mins} phút`;
        if (mins === 0) return `${hours} giờ`;
        return `${hours} giờ ${mins} phút`;
    };

    const getShiftPosition = (startTimeStr, endTimeStr) => {
        const start = parseDate(startTimeStr);
        const end = parseDate(endTimeStr);

        // Convert to fractional hours
        const startHour = start.getHours() + start.getMinutes() / 60;
        let endHour = end.getHours() + end.getMinutes() / 60;

        // Handle next-day wrap
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
        const sorted = [...dayShifts].sort((a, b) => parseDate(a.startTime) - parseDate(b.startTime));
        const columns = [];

        sorted.forEach(shift => {
            let placed = false;
            for (let i = 0; i < columns.length; i++) {
                const lastShift = columns[i][columns[i].length - 1];
                if (parseDate(shift.startTime) >= parseDate(lastShift.endTime)) {
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

    const getDayName = (dayIndex) => {
        const names = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        return names[dayIndex];
    };

    const handleColumnClick = (day, event) => {
        if (event.target.closest('.shift-card')) {
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const clickY = event.clientY - rect.top;
        const percentage = clickY / rect.height;

        const gridStart = 8;
        const gridEnd = 22;
        const totalHours = gridEnd - gridStart;

        const clickedHourFraction = gridStart + percentage * totalHours;
        const clickedHour = Math.max(gridStart, Math.min(gridEnd - 1, Math.floor(clickedHourFraction)));

        const formattedDate = day.toISOString().split('T')[0];
        const startTimeStr = `${String(clickedHour).padStart(2, '0')}:00`;
        const endTimeStr = `${String(clickedHour + 1).padStart(2, '0')}:00`;

        setForm({
            branchId: selectedBranchId || (branches[0]?.branchId || ''),
            title: 'Ca Tùy Chỉnh',
            date: formattedDate,
            templateType: 'Custom',
            startTime: startTimeStr,
            endTime: endTimeStr,
            requiredRole: 'Nhân viên',
            requiredPeople: 1
        });
        setIsCreateModalOpen(true);
    };

    // Filter shifts for selected week & search/branch filters
    const filteredShifts = shifts.filter(s => {
        // Must fall inside search text
        if (searchTerm) {
            const hasEmployee = s.assignments?.some(a =>
                a.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
            );
            const titleMatch = s.title.toLowerCase().includes(searchTerm.toLowerCase());
            if (!hasEmployee && !titleMatch) return false;
        }

        // Branch filter
        if (selectedBranchId && s.branchId !== Number(selectedBranchId)) {
            return false;
        }

        return true;
    });

    const weekStart = new Date(weekDays[0]);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const visibleWeekShifts = filteredShifts.filter(s => {
        const start = new Date(s.startTime);
        return start >= weekStart && start < weekEnd;
    });

    const activeAssignments = (shift) => (shift?.assignments || [])
        .filter(a => ['Assigned', 'InProgress', 'Completed'].includes(a.status));

    const preferredAssignments = (shift) => (shift?.assignments || [])
        .filter(a => a.status === 'Preferred');

    const assignedCount = (shift) => Number.isFinite(Number(shift?.assignedCount))
        ? Number(shift.assignedCount)
        : activeAssignments(shift).length;

    const missingCount = (shift) => Number.isFinite(Number(shift?.missingCount))
        ? Number(shift.missingCount)
        : Math.max(0, Number(shift?.requiredPeople || 0) - activeAssignments(shift).length);

    const understaffedShifts = visibleWeekShifts.filter(shift =>
        missingCount(shift) > 0
    );

    const employeesForBranch = (branchId) => {
        if (!branchId) return [];
        return employees.filter(e => e.branchId === Number(branchId));
    };

    const calculateScheduledStats = () => {
        let totalHours = 0;
        let estimatedCost = 0;
        visibleWeekShifts.forEach(shift => {
            const start = new Date(shift.startTime);
            const end = new Date(shift.endTime);
            const diffMs = end - start;
            const hours = Math.max(0, diffMs / (1000 * 60 * 60));

            const assigned = activeAssignments(shift);
            totalHours += hours * assigned.length;

            assigned.forEach(a => {
                const emp = employees.find(e => e.employmentId === a.employmentId);
                const rate = emp?.currentHourlyRate || 25000;
                estimatedCost += hours * rate;
            });
        });
        return { totalHours: Math.round(totalHours), estimatedCost: Math.round(estimatedCost) };
    };

    const { totalHours, estimatedCost } = calculateScheduledStats();

    const totalShiftsCount = visibleWeekShifts.length;
    const understaffedCount = understaffedShifts.length;
    const staffedCount = totalShiftsCount - understaffedCount;
    const coverageScore = totalShiftsCount > 0 ? Math.round((staffedCount / totalShiftsCount) * 100) : 100;

    const handlePrintSchedule = () => {
        const printWindow = window.open('', '_blank');
        const start = weekDays[0];
        const end = weekDays[6];
        const rangeStr = `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}, ${start.getFullYear()}`;

        let rows = '';
        visibleWeekShifts.forEach((shift) => {
            const sTime = formatTime(shift.startTime);
            const eTime = formatTime(shift.endTime);
            const dayName = getDayName(new Date(shift.startTime).getDay());
            const dateStr = new Date(shift.startTime).toLocaleDateString('vi-VN');
            const staffNames = activeAssignments(shift).map(a => a.employeeName).join(', ') || 'Chưa phân công';
            const status = missingCount(shift) > 0 ? `Thiếu ${missingCount(shift)} người` : 'Đủ nhân sự';

            rows += `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 12px; font-size: 13px; color: #334155;">${dayName} (${dateStr})</td>
                    <td style="padding: 12px; font-size: 13px; font-weight: bold; color: #1e293b;">${getShiftDisplayName(shift.title)}</td>
                    <td style="padding: 12px; font-size: 13px; color: #334155;">${sTime} - ${eTime}</td>
                    <td style="padding: 12px; font-size: 13px; color: #334155;">${shift.requiredPeople}</td>
                    <td style="padding: 12px; font-size: 13px; color: #475569; font-weight: 500;">${staffNames}</td>
                    <td style="padding: 12px; font-size: 13px; font-weight: bold; color: ${missingCount(shift) > 0 ? '#ef4444' : '#10b981'};">${status}</td>
                </tr>
            `;
        });

        printWindow.document.write(`
            <html>
            <head>
                <title>Lịch làm việc tuần ${rangeStr}</title>
                <style>
                    body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background-color: #f8fafc; text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
                    h2 { margin-bottom: 5px; color: #0f172a; }
                    p { margin-top: 0; color: #64748b; font-size: 14px; }
                </style>
            </head>
            <body onload="window.print()">
                <h2>BÁO CÁO LỊCH LÀM VIỆC HÀNG TUẦN</h2>
                <p>Tuần: ${rangeStr} | Chi nhánh: ${selectedBranchId ? branches.find(b => String(b.branchId) === selectedBranchId)?.name || 'Tất cả' : 'Tất cả chi nhánh'}</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
                <table>
                    <thead>
                        <tr>
                            <th>Ngày</th>
                            <th>Ca làm việc</th>
                            <th>Khung giờ</th>
                            <th>Yêu cầu (người)</th>
                            <th>Nhân viên được phân công</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #94a3b8; font-style: italic;">Không có ca làm việc nào được lên lịch cho tuần này.</td></tr>'}
                    </tbody>
                </table>
                <div style="margin-top: 40px; font-size: 11px; text-align: center; color: #94a3b8;">
                    Báo cáo được xuất tự động từ hệ thống WorkBridge vào lúc ${new Date().toLocaleString('vi-VN')}
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const getGroupedAiRecommendations = () => {
        const groups = {};
        understaffedShifts.forEach(shift => {
            const role = shift.requiredRole || 'Nhân viên';
            const branchId = shift.branchId;
            const key = `${branchId}_${role}`;

            if (!groups[key]) {
                groups[key] = {
                    branchId,
                    branchName: shift.branchName,
                    role,
                    shiftsCount: 0,
                    missingSlots: 0,
                    shiftsDetails: []
                };
            }
            const missing = missingCount(shift);
            groups[key].shiftsCount += 1;
            groups[key].missingSlots += missing;
            groups[key].shiftsDetails.push(shift);
        });

        return Object.values(groups).map(g => {
            const optimalHires = Math.max(1, Math.ceil(g.missingSlots / 4));
            return {
                ...g,
                optimalHires
            };
        });
    };

    const getAiPrefillLink = (groupedRec) => {
        if (!groupedRec) return '#';

        const vacancies = groupedRec.optimalHires;
        const roleName = groupedRec.role || 'Nhân viên';
        const title = `Tuyển nhân viên ${roleName} bán thời gian xoay ca - Chi nhánh ${groupedRec.branchName}`;

        const branch = branches.find(b => b.branchId === groupedRec.branchId);
        const branchAddress = branch?.address || '';
        const parsed = parseAddressComponents(branchAddress);

        const shiftInfo = groupedRec.shiftsDetails.map(s => `${getShiftDisplayName(s.title)} (${formatTime(s.startTime)} - ${formatTime(s.endTime)})`).join(', ');

        const description = `Chúng tôi đang cần tuyển gấp ${vacancies} nhân sự vị trí ${roleName} làm việc xoay ca linh hoạt tại chi nhánh ${groupedRec.branchName}.\n\nCông việc chính bao gồm hỗ trợ vận hành và lấp đầy các ca trực trống trong tuần của cửa hàng:\n- ${shiftInfo}\n- Và các ca trực khác theo sự sắp xếp của quản lý.`;
        const requirements = `- Từ 18 tuổi trở lên, hoạt bát, trung thực\n- Có thể làm việc linh hoạt tối thiểu 3-4 ca/tuần\n- Có tinh thần trách nhiệm cao, có thể đi làm ngay`;

        return `/employer-dashboard?tab=post-job&prefill=true&title=${encodeURIComponent(title)}&position=${encodeURIComponent(roleName)}&vacancies=${vacancies}&branchId=${groupedRec.branchId}&city=${encodeURIComponent(parsed.city)}&district=${encodeURIComponent(parsed.district)}&ward=${encodeURIComponent(parsed.ward || '')}&address=${encodeURIComponent(parsed.address)}&description=${encodeURIComponent(description)}&requirements=${encodeURIComponent(requirements)}&categoryId=1`;
    };

    const handleAiAutoPost = async (specificGroup = null) => {
        if (!isVip) {
            toast.error('Tính năng AI tự động đăng tuyển chỉ dành cho Doanh nghiệp VIP.');
            return;
        }

        const groupedRecs = getGroupedAiRecommendations();
        const targets = specificGroup ? [specificGroup] : groupedRecs;
        if (targets.length === 0) {
            toast.error('Không có ca thiếu nhân sự nào để tự động tuyển!');
            return;
        }

        setIsAiPosting(true);
        const loadingToast = toast.loading(
            specificGroup
                ? `🤖 AI đang tự động tối ưu & đăng tuyển vị trí ${specificGroup.role} tại ${specificGroup.branchName}...`
                : `🤖 AI đang tự động đăng tuyển hàng loạt cho cả ${targets.length} nhóm vị trí...`
        );

        try {
            let successCount = 0;
            for (const group of targets) {
                const vacancies = group.optimalHires;
                const roleName = group.role || 'Nhân viên';
                const branch = branches.find(b => b.branchId === group.branchId);
                const branchAddress = branch?.address || 'Chi nhánh ' + group.branchName;
                const parsed = parseAddressComponents(branchAddress);

                const title = `Tuyển nhân viên ${roleName} bán thời gian xoay ca - Chi nhánh ${group.branchName}`;
                const shiftInfo = group.shiftsDetails.map(s => `${getShiftDisplayName(s.title)} (${formatTime(s.startTime)} - ${formatTime(s.endTime)})`).join(', ');

                const description = `Chúng tôi đang cần tuyển gấp ${vacancies} nhân sự vị trí ${roleName} làm việc xoay ca linh hoạt tại chi nhánh ${group.branchName}.\n\nCông việc chính bao gồm hỗ trợ vận hành và lấp đầy các ca trực trống trong tuần của cửa hàng:\n- ${shiftInfo}\n- Và các ca trực khác theo sự sắp xếp của quản lý.`;
                const requirements = `- Từ 18 tuổi trở lên, hoạt bát, trung thực\n- Có thể làm việc linh hoạt tối thiểu 3-4 ca/tuần\n- Có tinh thần trách nhiệm cao, có thể đi làm ngay`;
                const benefits = `- Mức lương hấp dẫn (25.000đ/giờ)\n- Môi trường làm việc năng động\n- Hỗ trợ ăn ca/gửi xe miễn phí`;

                const deadline = new Date();
                deadline.setDate(deadline.getDate() + 5);

                const payload = {
                    title,
                    categoryId: 1,
                    branchId: group.branchId,
                    payRate: 25000,
                    payUnit: 'Hourly',
                    city: parsed.city,
                    district: parsed.district,
                    address: composeStreetAddress(parsed.address, parsed.ward),
                    applicationDeadline: deadline.toISOString(),
                    shiftIds: [],
                    position: roleName,
                    vacancies,
                    description,
                    requirements,
                    benefits,
                    jobType: 'Part-time'
                };

                await api.post('/employer/jobs', payload, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                successCount++;
            }

            toast.dismiss(loadingToast);
            if (specificGroup) {
                toast.success(`🤖 AI đã tự động xuất bản tin tuyển dụng thành công cho nhóm vị trí ${specificGroup.role} tại ${specificGroup.branchName}! Số lượng cần tuyển tối ưu: ${specificGroup.optimalHires} người.`);
            } else {
                toast.success(`🤖 AI đã tự động xuất bản thành công ${successCount} tin tuyển dụng tối ưu hóa cho tất cả các ca thiếu!`);
            }
        } catch (error) {
            console.error('Error auto-posting:', error);
            toast.dismiss(loadingToast);
            toast.error(error.response?.data?.message || 'Không thể đăng tuyển tự động.');
        } finally {
            setIsAiPosting(false);
        }
    };

    const runAiScheduleAdviceOnly = async () => {
        if (!isVip) {
            toast.error('Tính năng AI tư vấn xếp ca chỉ dành cho Doanh nghiệp VIP.');
            return;
        }

        setIsAiScheduling(true);
        setShowAiSchedulerModal(true);
        const logs = [];
        const addLog = (text) => {
            logs.push(text);
            setAiSchedulingLogs([...logs]);
        };

        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        addLog("🤖 Khởi động Trình phân tích & tư vấn lịch trực WorkBridge AI...");
        await sleep(500);
        addLog("🔍 Thu thập thông tin ca trực trống và danh sách nhân lực khả dụng...");
        addLog("📌 Luật ưu tiên: ca cố định trước, người đăng ký rảnh sớm hơn trước, sau đó kiểm tra trùng lịch và cân bằng số ca.");
        await sleep(500);

        const shiftsData = understaffedShifts.map(s => ({
            shiftId: s.workShiftId,
            date: new Date(s.startTime).toLocaleDateString('vi-VN'),
            startTime: new Date(s.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            endTime: new Date(s.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            roleRequired: s.requiredRole || 'Nhân viên'
        }));

        const weekStart = new Date(weekDays[0]);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const branchEmployees = employeesForBranch(selectedBranchId).map(e => {
            const employeePrefs = shifts
                .filter(s => {
                    const start = new Date(s.startTime);
                    return start >= weekStart && start < weekEnd &&
                        s.assignments?.some(a => a.employeeUserId === e.employeeUserId && a.status === 'Preferred');
                })
                .map(s => {
                    const pref = s.assignments?.find(a => a.employeeUserId === e.employeeUserId && a.status === 'Preferred');
                    return `${getShiftDisplayName(s.title)} (${formatTime(s.startTime)} - ${formatTime(s.endTime)}), đăng ký lúc ${formatDateTime(pref?.assignedAt)}`;
                });

            return {
                employeeId: e.employeeUserId,
                name: e.employeeName,
                skills: e.position ? [e.position] : [],
                availability: employeePrefs.length > 0 ? employeePrefs : ['Bất kỳ ca trực nào']
            };
        });

        if (shiftsData.length === 0) {
            addLog("🎉 Không có ca trực nào bị trống nhân sự. Lịch tuần hoàn hảo!");
            setIsAiScheduling(false);
            return;
        }

        addLog(`🚨 Tìm thấy ${shiftsData.length} ca trực cần tối ưu nhân sự.`);
        addLog("⚡ Đang gửi dữ liệu phân tích ca trống & nhân sự khả dụng lên WorkBridge AI...");
        await sleep(500);

        try {
            const res = await api.post('/gemini/schedule-advice', {
                branchId: selectedBranchId ? Number(selectedBranchId) : null,
                weekStartDate: weekDays[0].toISOString(),
                shifts: shiftsData,
                employees: branchEmployees
            }, { headers: authHeaders });

            const data = res.data;
            addLog("✨ Đã nhận được đề xuất phân bổ tối ưu từ WorkBridge AI:");
            if (data.advice) {
                addLog(`\n📝 Lời khuyên của AI:\n${data.advice}\n`);
            }
            if (data.assignments && data.assignments.length > 0) {
                addLog("📋 Đề xuất phân công chi tiết:");
                data.assignments.forEach(asg => {
                    const empName = employees.find(emp => emp.employeeUserId === asg.employeeId)?.employeeName || `ID ${asg.employeeId}`;
                    addLog(`  • Ca ${asg.shiftId} ➔ Nhân viên: ${empName} (Lý do: ${asg.reason})`);
                });
            }
            addLog(`----------------------------------------`);
            addLog("🏆 Hoàn tất quá trình tư vấn. Bạn có thể nhấn 'AI tự động xếp lịch' để áp dụng tự động các ca trực này.");
        } catch (error) {
            console.error('Error during AI Advice:', error);
            addLog(`❌ Đã xảy ra lỗi khi lấy tư vấn: ${getApiErrorMessage(error, 'Không thể lấy tư vấn xếp ca.')}`);
        } finally {
            setIsAiScheduling(false);
        }
    };

    const runAiSmartAutoSchedule = async () => {
        if (!isVip) {
            toast.error('Tính năng AI tự động xếp lịch chỉ dành cho Doanh nghiệp VIP.');
            return;
        }

        setIsAiScheduling(true);
        setShowAiSchedulerModal(true);
        const logs = [];
        const addLog = (text) => {
            logs.push(text);
            setAiSchedulingLogs([...logs]);
        };

        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        addLog("🤖 Đang khởi động Trình tối ưu hóa lịch trực WorkBridge AI...");
        await sleep(600);
        addLog("🔍 Đang tải cơ sở dữ liệu nhân sự & thông tin ca trực của tuần...");
        addLog("📌 AI sẽ ưu tiên nhân viên đã đăng ký rảnh sớm nhất cho từng ca, rồi mới cân bằng số ca.");
        await sleep(500);

        if (understaffedShifts.length === 0) {
            addLog("🎉 Tuyệt vời! Lịch làm việc tuần này không có ca trực nào bị trống nhân sự.");
            addLog("🏆 Hệ thống đạt điểm bao phủ 100%! Dừng tiến trình tối ưu hóa.");
            setIsAiScheduling(false);
            return;
        }

        const shiftsData = understaffedShifts.map(s => ({
            shiftId: s.workShiftId,
            date: new Date(s.startTime).toLocaleDateString('vi-VN'),
            startTime: new Date(s.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            endTime: new Date(s.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            roleRequired: s.requiredRole || 'Nhân viên'
        }));

        const weekStart = new Date(weekDays[0]);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const branchEmployees = employeesForBranch(selectedBranchId).map(e => {
            const employeePrefs = shifts
                .filter(s => {
                    const start = new Date(s.startTime);
                    return start >= weekStart && start < weekEnd &&
                        s.assignments?.some(a => a.employeeUserId === e.employeeUserId && a.status === 'Preferred');
                })
                .map(s => {
                    const pref = s.assignments?.find(a => a.employeeUserId === e.employeeUserId && a.status === 'Preferred');
                    return `${getShiftDisplayName(s.title)} (${formatTime(s.startTime)} - ${formatTime(s.endTime)}), đăng ký lúc ${formatDateTime(pref?.assignedAt)}`;
                });

            return {
                employeeId: e.employeeUserId,
                name: e.employeeName,
                skills: e.position ? [e.position] : [],
                availability: employeePrefs.length > 0 ? employeePrefs : ['Bất kỳ ca trực nào']
            };
        });

        addLog(`🚨 Phát hiện ${understaffedShifts.length} ca trực bị thiếu nhân lực cần xếp lịch.`);
        await sleep(500);
        addLog("⚡ Đang gửi yêu cầu tối ưu lịch trực hàng loạt lên máy chủ AI...");
        await sleep(600);

        try {
            const res = await api.post('/gemini/schedule-advice', {
                branchId: selectedBranchId ? Number(selectedBranchId) : null,
                weekStartDate: weekDays[0].toISOString(),
                shifts: shiftsData,
                employees: branchEmployees
            }, { headers: authHeaders });

            const data = res.data;
            addLog("✨ Đã nhận được đề xuất phân bổ tối ưu từ WorkBridge AI:");
            if (data.advice) {
                addLog(`\n📝 Lời khuyên của AI:\n${data.advice}\n`);
            }
            if (data.assignments && data.assignments.length > 0) {
                addLog("📋 Đề xuất phân công chi tiết:");
                data.assignments.forEach(asg => {
                    const empName = employees.find(emp => emp.employeeUserId === asg.employeeId)?.employeeName || `ID ${asg.employeeId}`;
                    addLog(`  • Ca ${asg.shiftId} ➔ Nhân viên: ${empName} (Lý do: ${asg.reason})`);
                });
            }

            addLog("⚙️ Hệ thống tiến hành cập nhật lịch làm việc tự động vào cơ sở dữ liệu...");
            await sleep(600);

            const scheduleRes = await api.post('/workforce/shifts/auto-schedule-batch', {
                branchId: selectedBranchId ? Number(selectedBranchId) : null,
                weekStartDate: weekDays[0].toISOString()
            }, { headers: authHeaders });

            if (scheduleRes.data?.message) {
                addLog(`✅ ${scheduleRes.data.message}`);
            } else {
                addLog("✅ Máy chủ AI đã xếp lịch thành công cho toàn bộ các ca trực hợp lệ!");
            }
            if (scheduleRes.data?.branches?.length > 0) {
                scheduleRes.data.branches.forEach(branch => {
                    addLog(`  • ${branch.branchName}: ${branch.newAssignments} phân công mới, còn thiếu ${branch.remainingOpenSlots}/${branch.requiredSlots} vị trí.`);
                });
            }
            addLog(`----------------------------------------`);
            addLog(`🏆 Báo cáo: Đã hoàn tất tối ưu hóa lịch trực tuần!`);
            addLog(`⚡ Đang cập nhật dữ liệu hiển thị thời gian thực...`);
            await sleep(500);

            await fetchAll();
            addLog(`🎉 Cập nhật thành công! Điểm phủ ca trực của bạn đã tăng lên.`);
        } catch (error) {
            console.error('Error in Heuristic AI Scheduler:', error);
            addLog(`❌ Đã xảy ra lỗi trong quá trình tự động xếp lịch: ${getApiErrorMessage(error, 'Không thể tự động xếp lịch.')}`);
        } finally {
            setIsAiScheduling(false);
        }
    };

    const getAiEmployeePerformance = () => {
        const list = employees.map(emp => {
            const empAssignments = shifts.reduce((acc, shift) => {
                const assigned = shift.assignments?.filter(a => a.employeeUserId === emp.employeeUserId) || [];
                return [...acc, ...assigned];
            }, []);

            const total = empAssignments.length;
            const completed = empAssignments.filter(a => a.attendanceStatus === 'Approved').length;
            const rejected = empAssignments.filter(a => a.attendanceStatus === 'Rejected').length;

            let score = 95;
            if (total > 0) {
                const rejectPenalty = rejected * 20;
                const approveBonus = completed * 2;
                score = Math.max(50, Math.min(100, 95 - rejectPenalty + approveBonus));
            } else {
                score = 90 + (emp.employeeUserId % 10);
            }

            return {
                ...emp,
                totalShifts: total,
                completedShifts: completed,
                trustScore: score
            };
        }).sort((a, b) => b.trustScore - a.trustScore);

        return list;
    };

    const employeePerformance = getAiEmployeePerformance();

    const attendanceClass = (status) => {
        switch (status) {
            case 'CheckedIn': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'CheckedOut': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'Rejected': return 'bg-red-50 text-red-700 border-red-100';
            case 'Preferred': return 'bg-emerald-50 text-emerald-600 border-emerald-200 animate-pulse';
            default: return 'bg-slate-50 text-slate-800 border-slate-100';
        }
    };

    if (checkingVip) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/60 p-12 text-center shadow-sm">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-slate-700 font-bold text-sm">Đang kiểm tra đặc quyền Doanh nghiệp...</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6 font-display">
            {/* Weekly Shift Grid and Controls */}
            <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col min-w-0">
                {/* Header controls */}
                <div className="px-5 sm:px-6 py-5 border-b border-slate-100 space-y-4">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Lịch Làm Việc Hàng Tuần</h3>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                            <button
                                onClick={() => setIsTemplateModalOpen(true)}
                                className="h-10 px-4 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold bg-slate-50 hover:bg-slate-100 transition-all inline-flex items-center gap-1.5 whitespace-nowrap"
                            >
                                <span className="material-symbols-outlined text-lg">settings</span>
                                Cấu hình Ca mẫu
                            </button>
                            <button
                                onClick={publishNextWeek}
                                disabled={isPublishingNextWeek}
                                className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-all inline-flex items-center gap-1.5 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                <span className="material-symbols-outlined text-lg">publish</span>
                                {isPublishingNextWeek ? 'Đang công bố...' : 'Công bố Lịch Tuần tới'}
                            </button>
                            <button
                                onClick={deleteAllWeekShifts}
                                disabled={isDeletingWeek || visibleWeekShifts.length === 0}
                                className="h-10 px-4 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-sm font-bold transition-all inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                <span className="material-symbols-outlined text-lg">delete_sweep</span>
                                {isDeletingWeek ? 'Đang xóa...' : 'Xóa tất cả ca'}
                            </button>
                            <button
                                onClick={handleAutoAssign}
                                className="h-10 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-bold transition-all inline-flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                            >
                                <span className="material-symbols-outlined text-lg">done_all</span>
                                Chốt ca tuần
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                        {/* Week Navigator */}
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0">
                            <button
                                onClick={() => navigateWeek(-1)}
                                className="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center text-slate-800 transition-all border border-transparent hover:border-slate-100"
                            >
                                <span className="material-symbols-outlined text-lg">chevron_left</span>
                            </button>
                            <span className="text-xs font-black text-slate-700 px-3 min-w-[150px] text-center">
                                {formatWeekRange()}
                            </span>
                            <button
                                onClick={() => navigateWeek(1)}
                                className="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center text-slate-800 transition-all border border-transparent hover:border-slate-100"
                            >
                                <span className="material-symbols-outlined text-lg">chevron_right</span>
                            </button>
                        </div>

                        {/* Search & Filters */}
                        <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-md">
                            <select
                                value={selectedBranchId}
                                onChange={(e) => setSelectedBranchId(e.target.value)}
                                className="h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                            >
                                <option value="">Tất cả Chi nhánh</option>
                                {branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
                            </select>
                            <div className="relative flex-1 min-w-0">
                                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-800 text-lg">search</span>
                                <input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Tìm ca làm hoặc nhân viên..."
                                    className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mx-5 sm:mx-6 mt-4 bg-[#fffdf7] rounded-2xl border border-amber-200/70 shadow-lg shadow-amber-900/5 overflow-hidden transition-all duration-300">
                    {/* Header */}
                    <div
                        onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                        className="px-5 py-4 flex items-center justify-between cursor-pointer select-none border-b border-amber-200/50 bg-gradient-to-r from-[#211d17] via-[#2d261c] to-[#4a3820] text-white hover:brightness-105 transition-all"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-300/30 flex items-center justify-center shadow-inner shrink-0">
                                <span className="material-symbols-outlined text-amber-300 !text-2xl">{isVip ? 'workspace_premium' : 'lock'}</span>
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-base font-black tracking-tight flex flex-wrap items-center gap-2">
                                    {isVip ? 'Trung tâm vận hành VIP AI' : 'AI vận hành chỉ dành cho VIP'}
                                    {!isVip ? (
                                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-white/10 text-amber-100 border border-white/15">
                                            Ca thường vẫn dùng được
                                        </span>
                                    ) : (
                                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                                            coverageScore === 100
                                                ? 'bg-emerald-400/15 text-emerald-100 border-emerald-300/30'
                                                : coverageScore >= 80
                                                ? 'bg-amber-400/15 text-amber-100 border-amber-300/30'
                                                : 'bg-rose-400/15 text-rose-100 border-rose-300/30'
                                        }`}>
                                            {coverageScore}% phủ ca
                                        </span>
                                    )}
                                </h4>
                                <p className="text-xs text-amber-100/80 mt-1 truncate">
                                    Theo dõi độ phủ, chi phí, uy tín nhân viên, tuyển bù và tự động xếp ca theo chi nhánh.
                                </p>
                            </div>
                        </div>
                        <span className="material-symbols-outlined !text-xl text-amber-100/80">
                            {isAiPanelOpen ? 'expand_less' : 'expand_more'}
                        </span>
                    </div>

                    {/* Body Details */}
                    {isAiPanelOpen && (
                        !isVip ? (
                            <div className="px-5 py-5 bg-[#fffdf7] border-t border-amber-100/70">
                                <div className="rounded-2xl border border-amber-200 bg-white px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
                                    <div>
                                        <p className="text-base font-black text-slate-900">Tài khoản thường: quản lý ca thủ công</p>
                                        <p className="text-xs text-slate-700 mt-1">
                                            Bạn vẫn có thể tạo ca, công bố lịch tuần tới, để nhân viên tự đăng ký lịch rảnh và chốt đăng ký. Các tính năng AI như tư vấn xếp ca, tự động xếp ca và đề xuất tuyển dụng đang bị khóa.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const params = new URLSearchParams(window.location.search);
                                            params.set('tab', 'vip');
                                            window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
                                            window.dispatchEvent(new PopStateEvent('popstate'));
                                        }}
                                        className="h-11 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-black inline-flex items-center justify-center gap-1.5 shadow-sm shadow-amber-500/20"
                                    >
                                        <span className="material-symbols-outlined !text-sm">workspace_premium</span>
                                        Mở khóa AI
                                    </button>
                                </div>
                            </div>
                        ) : visibleWeekShifts.length === 0 ? (
                            <div className="px-5 py-5 text-center space-y-3 bg-[#fffdf7]">
                                <p className="text-[11px] font-semibold text-slate-700">
                                    Chưa có ca làm việc nào tuần này
                                </p>
                                <div className="flex flex-wrap gap-1.5 justify-center">
                                    <button
                                        onClick={publishNextWeek}
                                        disabled={isPublishingNextWeek}
                                        className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        <span className="material-symbols-outlined !text-xs">publish</span>
                                        {isPublishingNextWeek ? 'Đang khởi tạo...' : 'Khởi tạo ca mẫu'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            const today = new Date().toISOString().split('T')[0];
                                            setForm(prev => ({
                                                ...prev,
                                                branchId: selectedBranchId,
                                                date: today,
                                                templateType: 'Ca Sáng',
                                                title: 'Ca Sáng'
                                            }));
                                            setIsCreateModalOpen(true);
                                        }}
                                        className="h-9 px-4 rounded-xl border border-amber-200 bg-white hover:bg-amber-50 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined !text-xs">add</span>
                                        Tạo ca thủ công
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="px-4 py-4 bg-[#fffdf7] border-t border-amber-100/70">
                                {/* VIP stats row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
                                    {/* Score */}
                                    <div className="bg-white border border-amber-100 rounded-2xl p-4 text-center shadow-sm">
                                        <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider block">Độ phủ nhân sự</span>
                                        <span className={`text-3xl font-black block mt-1 ${
                                            coverageScore === 100 ? 'text-emerald-500' : coverageScore >= 80 ? 'text-amber-500' : 'text-red-500'
                                        }`}>{coverageScore}%</span>
                                        <div className="w-full bg-slate-200/80 rounded-full h-2 mt-3 overflow-hidden">
                                            <div
                                                className={`h-2 rounded-full transition-all ${
                                                    coverageScore === 100 ? 'bg-emerald-400' : coverageScore >= 80 ? 'bg-amber-400' : 'bg-rose-400'
                                                }`}
                                                style={{ width: `${coverageScore}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    {/* Shifts count */}
                                    <div className="bg-white border border-amber-100 rounded-2xl p-4 text-center shadow-sm">
                                        <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider block">Tổng ca</span>
                                        <span className="text-3xl font-black text-slate-800 block mt-1">{totalShiftsCount}</span>
                                        <span className="text-[11px] text-slate-800 font-medium">ca/tuần</span>
                                    </div>
                                    {/* Hours */}
                                    <div className="bg-white border border-amber-100 rounded-2xl p-4 text-center shadow-sm">
                                        <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider block">Giờ làm</span>
                                        <span className="text-3xl font-black text-slate-800 block mt-1">{totalHours}</span>
                                        <span className="text-[11px] text-slate-800 font-medium">giờ</span>
                                    </div>
                                    {/* Cost */}
                                    <div className="bg-white border border-amber-100 rounded-2xl p-4 text-center shadow-sm">
                                        <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider block">Chi phí dự tính</span>
                                        <span className="text-2xl font-black text-emerald-600 block mt-2">{(estimatedCost).toLocaleString('vi-VN')}₫</span>
                                        <span className="text-[11px] text-slate-800 font-medium">theo lương giờ</span>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 gap-2 mb-3">
                                    {[
                                        { icon: 'account_tree', title: 'Nhận diện chi nhánh', text: 'AI đọc branchId để không xếp nhầm nhân viên.' },
                                        { icon: 'event_busy', title: 'Chặn trùng ca', text: 'Kiểm tra lịch bận trước khi đề xuất phân công.' },
                                        { icon: 'person_add', title: 'Tuyển bù thông minh', text: 'Gợi ý đăng tin khi lịch thiếu nhân sự.' },
                                    ].map(item => (
                                        <div key={item.title} className="rounded-xl border border-amber-100 bg-white px-3 py-2.5 flex items-start gap-2 shadow-sm">
                                            <span className="material-symbols-outlined !text-[18px] text-amber-600 mt-0.5">{item.icon}</span>
                                            <div>
                                                <p className="text-xs font-black text-slate-800">{item.title}</p>
                                                <p className="text-[11px] text-slate-700 mt-0.5 leading-relaxed">{item.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Compact recruitment suggestions */}
                                <div className="bg-white border border-amber-100 rounded-2xl p-3.5 mb-3 shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                                            <span className="material-symbols-outlined !text-sm text-amber-600">workspace_premium</span>
                                            Đề xuất tuyển dụng VIP AI
                                        </span>
                                        {understaffedShifts.length > 0 && (
                                            <button
                                                onClick={() => handleAiAutoPost(null)}
                                                disabled={isAiPosting}
                                                className="h-8 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black transition-all flex items-center gap-1 disabled:opacity-50 shadow-sm shadow-amber-500/20"
                                            >
                                                {isAiPosting ? (
                                                    <span className="material-symbols-outlined !text-xs animate-spin">progress_activity</span>
                                                ) : (
                                                    <span className="material-symbols-outlined !text-xs">rocket_launch</span>
                                                )}
                                                Đăng {getGroupedAiRecommendations().length} tin
                                            </button>
                                        )}
                                    </div>
                                    {understaffedShifts.length > 0 ? (
                                        <div className="space-y-1.5 max-h-[90px] overflow-y-auto pr-0.5">
                                            {(() => {
                                                const groupedRecs = getGroupedAiRecommendations();
                                                return groupedRecs.map((group, gIdx) => (
                                                    <div key={gIdx} className="bg-[#fffdf7] border border-amber-100 rounded-xl px-3 py-2 flex items-center justify-between gap-2 hover:border-amber-300 transition-all">
                                                        <div className="min-w-0 flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined !text-sm text-amber-600">group</span>
                                                            <span className="text-[10px] font-semibold text-slate-700 truncate">{group.role}</span>
                                                            <span className="text-[8px] text-slate-800 font-medium shrink-0">({group.shiftsCount} ca thiếu)</span>
                                                            <span className="shrink-0 bg-amber-100 text-amber-800 text-[8px] font-black px-1.5 py-px rounded">
                                                                +{group.optimalHires} người
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-1 shrink-0">
                                                            <button
                                                                onClick={() => window.location.href = getAiPrefillLink(group)}
                                                                className="h-5.5 px-2 rounded text-[8px] font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-all flex items-center gap-0.5"
                                                            >
                                                                Soạn
                                                            </button>
                                                            <button
                                                                onClick={() => handleAiAutoPost(group)}
                                                                disabled={isAiPosting}
                                                                className="h-5.5 px-2 rounded text-[8px] font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all flex items-center gap-0.5 disabled:opacity-50"
                                                            >
                                                                Đăng
                                                            </button>
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    ) : (
                                        <p className="text-slate-800 text-[10px] italic py-1">
                                            ✓ Lịch tuần đầy đủ nhân sự, không cần tuyển thêm.
                                        </p>
                                    )}
                                </div>

                                {/* Compact bottom bar: Trust + Actions + Print */}
                                <div className="flex flex-col sm:flex-row gap-2">
                                    {/* Trust scores compact */}
                                    <div className="flex-1 bg-white border border-amber-100 rounded-2xl p-3 shadow-sm">
                                        <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5 mb-2">
                                            <span className="material-symbols-outlined !text-sm text-amber-600">analytics</span>
                                            Uy tín nhân viên
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {employeePerformance.slice(0, 4).map((cand) => (
                                                <div key={cand.employmentId} className="bg-[#fffdf7] border border-amber-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 hover:border-amber-300 transition-all">
                                                    <span className="text-[10px] font-semibold text-slate-700">{cand.employeeName}</span>
                                                    <span className={`text-[8px] font-bold px-1 py-px rounded ${
                                                        cand.trustScore >= 95
                                                            ? 'bg-emerald-50 text-emerald-600'
                                                        : cand.trustScore >= 85
                                                            ? 'bg-amber-50 text-amber-700'
                                                            : 'bg-amber-50 text-amber-600'
                                                    }`}>
                                                        {cand.trustScore}%
                                                    </span>
                                                </div>
                                            ))}
                                            {employeePerformance.length === 0 && (
                                                <span className="text-[9px] text-slate-800 italic">Chưa có dữ liệu</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions column */}
                                    <div className="flex flex-col gap-1.5 shrink-0">
                                        <button
                                            onClick={runAiScheduleAdviceOnly}
                                            disabled={isAiScheduling}
                                            className="h-10 px-5 rounded-xl bg-[#2d261c] hover:bg-[#211d17] text-amber-50 text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className="material-symbols-outlined !text-sm">psychology</span>
                                            AI Tư vấn xếp ca
                                        </button>
                                        <button
                                            onClick={runAiSmartAutoSchedule}
                                            disabled={isAiScheduling}
                                            className="h-10 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className="material-symbols-outlined !text-sm">auto_schedule</span>
                                            AI tự động xếp lịch
                                        </button>
                                        <button
                                            onClick={handlePrintSchedule}
                                            className="h-9 px-4 rounded-xl border border-amber-200 bg-white hover:bg-amber-50 text-slate-800 text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                                        >
                                            <span className="material-symbols-outlined !text-xs">print</span>
                                            Xuất báo cáo
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>

                {loading ? (
                    <div className="p-14 text-center text-slate-800">Đang tải lịch làm việc...</div>
                ) : (
                    <div className="flex-1 overflow-x-auto min-w-0">
                        <div className="w-full min-w-[800px] lg:min-w-0 bg-white">
                            {/* Mon-Sun Day Headers */}
                            <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-slate-100 bg-slate-50/50 text-center py-4">
                                <div className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center justify-center">Giờ</div>
                                {weekDays.map((day, idx) => (
                                    <div key={idx} className={`text-xs ${isToday(day) ? 'text-primary font-black' : 'text-slate-700 font-bold'}`}>
                                        <div className="uppercase tracking-wide text-[10px] opacity-75">{getDayName(day.getDay())}</div>
                                        <div className="text-base font-black mt-0.5">{day.getDate()}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Hour Row Columns */}
                            <div className="relative grid grid-cols-[80px_repeat(7,1fr)]" style={{ height: '450px' }}>
                                {/* Horizontal Hour Dividers */}
                                <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateRows: 'repeat(14, minmax(0, 1fr))' }}>
                                    {Array.from({ length: 14 }).map((_, h) => (
                                        <div key={h} className="border-b border-slate-100/70 w-full h-full"></div>
                                    ))}
                                </div>

                                {/* Hour Labels Column */}
                                <div className="flex flex-col justify-between text-[10px] font-black text-slate-800 py-1 bg-slate-50/30 border-r border-slate-100 h-full select-none">
                                    {Array.from({ length: 15 }).map((_, h) => (
                                        <div key={h} className="text-center h-5 flex items-center justify-center">
                                            {String(8 + h).padStart(2, '0')}:00
                                        </div>
                                    ))}
                                </div>

                                {/* Day Columns */}
                                {weekDays.map((day, dIdx) => {
                                    const dayShifts = visibleWeekShifts.filter(s => {
                                        const sDate = parseDate(s.startTime);
                                        return sDate.getFullYear() === day.getFullYear() &&
                                            sDate.getMonth() === day.getMonth() &&
                                            sDate.getDate() === day.getDate();
                                    });

                                    const positioned = positionShifts(dayShifts);

                                    return (
                                        <div
                                            key={dIdx}
                                            onClick={(e) => handleColumnClick(day, e)}
                                            className={`relative border-r border-slate-100 h-full ${
                                                isToday(day) ? 'bg-primary/5' : 'bg-slate-50/5'
                                            } cursor-crosshair hover:bg-slate-100/30 transition-colors`}
                                        >
                                            {positioned.map(shift => {
                                                const { top, height } = getShiftPosition(shift.startTime, shift.endTime);
                                                const widthPercent = 100 / shift.totalCols;
                                                const leftPercent = (shift.colIndex * 100) / shift.totalCols;

                                                const hasCheckIn = shift.assignments?.some(a =>
                                                    ['CheckedIn', 'CheckedOut', 'Approved'].includes(a.attendanceStatus)
                                                );
                                                const isUnderstaffed = missingCount(shift) > 0;

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
                                                            isUnderstaffed
                                                                ? 'bg-red-50/90 border-red-200 hover:bg-red-100/90 text-red-900'
                                                                : hasCheckIn
                                                                ? 'bg-amber-50/90 border-amber-200/90 hover:bg-amber-100/90 text-amber-900'
                                                                : 'bg-indigo-50/80 border-indigo-200/80 hover:bg-indigo-100/80 text-indigo-900'
                                                        }`}>
                                                            <div className="min-w-0">
                                                                <div className="flex items-start justify-between gap-1">
                                                                    <h5 className="text-xs font-extrabold truncate">
                                                                        {getShiftDisplayName(shift.title)}
                                                                    </h5>
                                                                    {hasCheckIn && (
                                                                        <span className="shrink-0 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded leading-none">
                                                                            Đã vào ca
                                                                        </span>
                                                                    )}
                                                                    {isUnderstaffed && (
                                                                        <span className="shrink-0 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded leading-none">
                                                                            Thiếu {missingCount(shift)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] opacity-75 font-semibold mt-0.5">
                                                                    {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                                                                </p>
                                                                <div className="mt-2 flex flex-wrap gap-1 max-h-[80px] overflow-y-auto">
                                                                    {activeAssignments(shift).length > 0 ? (
                                                                        activeAssignments(shift).map((a, idx) => (
                                                                            <div
                                                                                key={idx}
                                                                                className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-slate-100 rounded-md px-1.5 py-0.5 max-w-full shadow-sm text-slate-700"
                                                                                title={a.employeeName}
                                                                            >
                                                                                <div className="w-3 h-3 rounded-full bg-primary/10 text-primary text-[8px] font-black flex items-center justify-center shrink-0">
                                                                                    {(a.employeeName || 'Staff').substring(0, 1).toUpperCase()}
                                                                                </div>
                                                                                <span className="text-[9px] font-extrabold truncate max-w-[65px]">
                                                                                    {a.employeeName}
                                                                                </span>
                                                                            </div>
                                                                        ))
                                                                    ) : preferredAssignments(shift).length > 0 ? (
                                                                        <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-md px-1.5 py-0.5 text-emerald-600 font-extrabold text-[9px] animate-pulse">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-ping"></span>
                                                                            <span>{preferredAssignments(shift).length} người đăng ký rảnh</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="inline-flex items-center gap-1 bg-slate-100/50 border border-dashed border-slate-200 rounded-md px-1.5 py-0.5 text-slate-800 font-bold text-[9px]">
                                                                            <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
                                                                            <span>Chưa Phân Công</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between gap-1 mt-auto">
                                                                <span className="text-[9px] font-black opacity-60">
                                                                    {assignedCount(shift)}/{shift.requiredPeople} nhân viên
                                                                </span>
                                                                <div className="flex -space-x-1 overflow-hidden">
                                                                    {activeAssignments(shift).slice(0, 3).map((a, i) => (
                                                                        <div
                                                                            key={i}
                                                                            className="w-4.5 h-4.5 rounded-full bg-primary text-white text-[8px] font-black flex items-center justify-center border border-white ring-1 ring-slate-200"
                                                                            title={a.employeeName}
                                                                        >
                                                                            {a.employeeName.substring(0, 1).toUpperCase()}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
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
                )}
            </section>

            {/* Create Shift Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-800">Tạo ca làm việc</h3>
                                <p className="text-sm text-slate-700 mt-0.5">Lên lịch ca làm việc mới cho nhân viên.</p>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-800 shrink-0"
                            >
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>
                        <form
                            onSubmit={async (e) => {
                                await createShift(e);
                                setIsCreateModalOpen(false);
                            }}
                            className="p-5 sm:p-6 space-y-4 overflow-y-auto min-h-0 flex-1"
                        >
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 uppercase">Chi nhánh</label>
                                <select
                                    value={form.branchId}
                                    onChange={(e) => setForm(prev => ({ ...prev, branchId: e.target.value }))}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20"
                                    required
                                >
                                    <option value="">Chọn chi nhánh</option>
                                    {branches.map(branch => <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 uppercase">Loại ca mẫu</label>
                                <select
                                    value={form.templateType}
                                    onChange={(e) => setForm(prev => ({ ...prev, templateType: e.target.value }))}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20"
                                >
                                    {templates.map(t => (
                                        <option key={t.shiftName} value={t.shiftName}>
                                            {getShiftDisplayName(t.shiftName)} (Mẫu)
                                        </option>
                                    ))}
                                    <option value="Custom">Giờ tùy chỉnh</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 uppercase">Tên ca làm</label>
                                <input
                                    value={form.title}
                                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20"
                                    placeholder="Ví dụ: Ca Sáng, Ca Chiều, Ca Tùy chỉnh..."
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 uppercase">Ngày</label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase">Giờ bắt đầu</label>
                                    <input
                                        type="time"
                                        value={form.startTime}
                                        disabled={form.templateType !== 'Custom'}
                                        onChange={(e) => setForm(prev => ({ ...prev, startTime: e.target.value }))}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-800"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase">Giờ kết thúc</label>
                                    <input
                                        type="time"
                                        value={form.endTime}
                                        disabled={form.templateType !== 'Custom'}
                                        onChange={(e) => setForm(prev => ({ ...prev, endTime: e.target.value }))}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase">Chức vụ yêu cầu</label>
                                    <input
                                        value={form.requiredRole}
                                        onChange={(e) => setForm(prev => ({ ...prev, requiredRole: e.target.value }))}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20"
                                        placeholder="Ví dụ: Nhân viên, Phục vụ"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase">Số lượng nhân viên</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={form.requiredPeople}
                                        onChange={(e) => setForm(prev => ({ ...prev, requiredPeople: e.target.value }))}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm bg-white hover:bg-slate-50 transition-all"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 h-11 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-dark transition-all shadow-sm"
                                >
                                    Tạo ca làm việc
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Template Configuration Modal */}
            {isTemplateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
                        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-800">Cấu hình Ca làm việc mẫu</h3>
                                <p className="text-sm text-slate-700 mt-0.5">Định nghĩa 3 khung giờ làm việc mặc định cho doanh nghiệp của bạn.</p>
                            </div>
                            <button
                                onClick={() => setIsTemplateModalOpen(false)}
                                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-800 shrink-0"
                            >
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>
                        <form onSubmit={saveTemplates} className="p-5 sm:p-6 space-y-4 overflow-y-auto min-h-0 flex-1">
                            {editTemplates.map((t, idx) => (
                                <div key={idx} className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/50">
                                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider">{getShiftDisplayName(t.shiftName)}</span>
                                    <div className="grid grid-cols-[1fr_1fr_1.2fr] gap-3">
                                        <div className="flex flex-col justify-end space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-700 uppercase">Bắt đầu</label>
                                            <input
                                                type="time"
                                                value={t.startTime}
                                                onChange={(e) => {
                                                    const updated = [...editTemplates];
                                                    updated[idx].startTime = e.target.value;
                                                    setEditTemplates(updated);
                                                }}
                                                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                                            />
                                        </div>
                                        <div className="flex flex-col justify-end space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-700 uppercase">Kết thúc</label>
                                            <input
                                                type="time"
                                                value={t.endTime}
                                                onChange={(e) => {
                                                    const updated = [...editTemplates];
                                                    updated[idx].endTime = e.target.value;
                                                    setEditTemplates(updated);
                                                }}
                                                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                                            />
                                        </div>
                                        <div className="flex flex-col justify-end space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-700 uppercase">SL mặc định</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={t.requiredPeople || 1}
                                                onChange={(e) => {
                                                    const updated = [...editTemplates];
                                                    updated[idx].requiredPeople = Math.max(1, Number(e.target.value));
                                                    setEditTemplates(updated);
                                                }}
                                                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div className="flex gap-3 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsTemplateModalOpen(false)}
                                    className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm bg-white"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 h-11 rounded-xl bg-primary text-white font-bold text-sm"
                                >
                                    Lưu cấu hình
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Shift Details and Attendance Management Modal */}
            {selectedShiftForDetails && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div>
                                <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-black uppercase tracking-wider">
                                    {selectedShiftForDetails.branchName}
                                </span>
                                <h3 className="text-xl font-black text-slate-800 mt-1.5">{getShiftDisplayName(selectedShiftForDetails.title)}</h3>
                                <p className="text-xs text-slate-700 mt-0.5">
                                    Thời gian: {formatDateTime(selectedShiftForDetails.startTime)} - {formatDateTime(selectedShiftForDetails.endTime)}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleDeleteShift}
                                    className="h-9 px-3.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-base">delete</span>
                                    Xóa ca làm việc
                                </button>
                                <button
                                    onClick={() => {
                                        cancelReplaceAssignment();
                                        setSelectedShiftForDetails(null);
                                    }}
                                    className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-800"
                                >
                                    <span className="material-symbols-outlined text-xl">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6 overflow-y-auto flex-1">
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-slate-50 rounded-2xl border border-slate-200/50 p-4 text-center">
                                    <span className="text-[10px] font-black uppercase text-slate-800">Chức vụ yêu cầu</span>
                                    <p className="text-sm font-extrabold text-slate-700 mt-1">{selectedShiftForDetails.requiredRole || 'Không có'}</p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl border border-slate-200/50 p-4 text-center">
                                    <span className="text-[10px] font-black uppercase text-slate-800">Đã đăng ký</span>
                                    <p className="text-sm font-extrabold text-slate-700 mt-1">
                                        {assignedCount(selectedShiftForDetails)} / {selectedShiftForDetails.requiredPeople} nhân viên
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl border border-slate-200/50 p-4 text-center">
                                    <span className="text-[10px] font-black uppercase text-slate-800">Trạng thái ca</span>
                                    <p className={`text-sm font-extrabold mt-1 ${
                                        missingCount(selectedShiftForDetails) > 0 ? 'text-red-600' : 'text-slate-700'
                                    }`}>
                                        {missingCount(selectedShiftForDetails) > 0
                                            ? `Thiếu ${missingCount(selectedShiftForDetails)} người`
                                            : getShiftStatusText(selectedShiftForDetails.status)}
                                    </p>
                                </div>
                            </div>

                            {selectedShiftForDetails.schedulingNote && (
                                <div className={`rounded-2xl border px-4 py-3 ${
                                    missingCount(selectedShiftForDetails) > 0
                                        ? 'bg-red-50 border-red-100 text-red-700'
                                        : 'bg-blue-50 border-blue-100 text-blue-700'
                                }`}>
                                    <p className="text-xs font-bold leading-relaxed">{selectedShiftForDetails.schedulingNote}</p>
                                </div>
                            )}

                            {/* Manual candidate suggestions */}
                            {assignedCount(selectedShiftForDetails) < selectedShiftForDetails.requiredPeople && (
                                <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 space-y-3">
                                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                        <span className="material-symbols-outlined !text-base text-slate-700">group</span>
                                        Nhân viên phù hợp để xếp thủ công
                                    </h5>
                                    {(() => {
                                        const branchEmployees = employeesForBranch(selectedShiftForDetails.branchId);
                                        const overlapChecked = branchEmployees.filter(emp => {
                                            const isAlreadyAssigned = activeAssignments(selectedShiftForDetails).some(a => a.employeeUserId === emp.employeeUserId);
                                            if (isAlreadyAssigned) return false;

                                            const hasOverlap = shifts.some(s => {
                                                if (s.workShiftId === selectedShiftForDetails.workShiftId) return false;
                                                if (s.status === 'Cancelled') return false;
                                                const sStart = new Date(s.startTime);
                                                const sEnd = new Date(s.endTime);
                                                const targetStart = new Date(selectedShiftForDetails.startTime);
                                                const targetEnd = new Date(selectedShiftForDetails.endTime);

                                                const overlaps = sStart < targetEnd && targetStart < sEnd;
                                                if (!overlaps) return false;

                                                return activeAssignments(s).some(a => a.employeeUserId === emp.employeeUserId);
                                            });
                                            return !hasOverlap;
                                        });

                                        const sortedCandidates = [...overlapChecked].map(emp => {
                                            const isPreferred = preferredAssignments(selectedShiftForDetails).some(a => a.employeeUserId === emp.employeeUserId);

                                            const weekShiftCount = visibleWeekShifts.filter(s =>
                                                activeAssignments(s).some(a => a.employeeUserId === emp.employeeUserId)
                                            ).length;

                                            return { ...emp, isPreferred, weekShiftCount };
                                        }).sort((a, b) => {
                                            if (a.isPreferred && !b.isPreferred) return -1;
                                            if (!a.isPreferred && b.isPreferred) return 1;
                                            return a.weekShiftCount - b.weekShiftCount;
                                        });

                                        if (sortedCandidates.length === 0) {
                                            return <p className="text-[11px] text-slate-700 italic">Không tìm thấy nhân viên nào đang rảnh và phù hợp cho khung giờ này.</p>;
                                        }

                                        return (
                                            <div className="grid gap-2 max-h-[160px] overflow-y-auto pr-1">
                                                {sortedCandidates.slice(0, 4).map(cand => (
                                                    <div key={cand.employmentId} className="bg-white border border-slate-100 rounded-xl p-2.5 flex items-center justify-between gap-3 hover:border-primary/30 transition-all shadow-sm">
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                                                {cand.employeeName}
                                                                {cand.isPreferred && (
                                                                    <span className="bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded font-black flex items-center gap-0.5 animate-pulse">
                                                                        ⭐ Rảnh
                                                                    </span>
                                                                )}
                                                                <span className="text-[9px] font-bold text-slate-800">
                                                                    ({cand.weekShiftCount} ca/tuần)
                                                                </span>
                                                            </p>
                                                            <p className="text-[10px] text-slate-700 mt-0.5">{cand.position || 'Nhân viên'}</p>
                                                        </div>
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await api.post(`/workforce/shifts/${selectedShiftForDetails.workShiftId}/assign`, {
                                                                        employmentId: cand.employmentId
                                                                    }, { headers: authHeaders });
                                                                    toast.success(`Đã xếp ca thành công cho ${cand.employeeName}!`);

                                                                    // Reload context details
                                                                    const updatedShifts = await api.get('/workforce/shifts', { headers: authHeaders });
                                                                    setShifts(updatedShifts.data);
                                                                    const freshShift = updatedShifts.data.find(s => s.workShiftId === selectedShiftForDetails.workShiftId);
                                                                    setSelectedShiftForDetails(freshShift);

                                                                    fetchAll();
                                                                } catch {
                                                                    toast.error('Không thể xếp ca làm.');
                                                                }
                                                            }}
                                                            className="h-8 px-3 rounded-lg bg-primary hover:bg-primary-dark text-white text-[10px] font-black transition-all flex items-center gap-1 shrink-0"
                                                        >
                                                            <span className="material-symbols-outlined !text-sm">done</span>
                                                            Xếp ca nhanh
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Assign Employee dropdown */}
                            {assignedCount(selectedShiftForDetails) < selectedShiftForDetails.requiredPeople && (
                                <form onSubmit={assignShift} className="bg-slate-50 rounded-2xl border border-slate-200/50 p-4 space-y-3">
                                    <h4 className="text-sm font-bold text-slate-800">Phân công nhân viên vào ca</h4>
                                    <div className="flex gap-3">
                                        <select
                                            value={assigneeId}
                                            onChange={(e) => setAssigneeId(e.target.value)}
                                            className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
                                        >
                                            <option value="">Chọn nhân viên</option>
                                            {employeesForBranch(selectedShiftForDetails.branchId)
                                                .filter(emp => !activeAssignments(selectedShiftForDetails).some(a => a.employmentId === emp.employmentId))
                                                .map(emp => (
                                                    <option key={emp.employmentId} value={emp.employmentId}>{emp.employeeName} ({emp.position})</option>
                                                ))}
                                        </select>
                                        <button
                                            type="submit"
                                            disabled={!assigneeId}
                                            className="h-10 px-4 rounded-xl bg-primary text-white text-xs font-black hover:bg-primary-dark disabled:opacity-50"
                                        >
                                            Xếp ca
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Assigned Employees List & Attendance details */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Danh sách nhân viên phân công</h4>
                                {selectedShiftForDetails.assignments?.length === 0 ? (
                                    <p className="text-xs text-slate-800 italic">Chưa có nhân viên nào được phân công cho ca này.</p>
                                ) : (
                                    <div className="grid gap-3">
                                        {selectedShiftForDetails.assignments?.map(assignment => {
                                            const attStatus = assignment.status === 'Preferred' ? 'Preferred' : (assignment.attendanceStatus || 'NotStarted');
                                            const canEditCurrentAssignment = canEditShiftAssignment(assignment);
                                            const isEditingAssignment = editingAssignmentId === assignment.shiftAssignmentId;
                                            const replacementCandidates = isEditingAssignment ? replacementCandidatesForAssignment(assignment) : [];
                                            return (
                                                <div
                                                    key={assignment.shiftAssignmentId}
                                                    className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-3"
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
                                                            <p className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                                                                {assignment.employeeName}
                                                                {assignment.isFixed && (
                                                                    <span className="bg-primary/10 text-primary text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                                                                        Cố định
                                                                    </span>
                                                                )}
                                                                {assignment.status === 'Preferred' && (
                                                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                                                                        Đăng ký rảnh
                                                                    </span>
                                                                )}
                                                            </p>
                                                            <p className="text-xs text-slate-800 mt-0.5">
                                                                {assignment.status === 'Preferred' || assignment.assignmentSource === 'EmployeeRegistration' ? 'Đăng ký lúc' : 'Phân công lúc'}: {formatDateTime(assignment.assignedAt)}
                                                            </p>
                                                            {assignment.schedulingReason && (
                                                                <p className="text-[11px] text-slate-700 mt-1 font-medium">
                                                                    {assignment.schedulingReason}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center justify-end gap-2 flex-wrap shrink-0">
                                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${attendanceClass(attStatus)}`}>
                                                                {getAttendanceStatusText(attStatus)}
                                                            </span>
                                                            {canEditCurrentAssignment && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => startReplaceAssignment(assignment)}
                                                                        disabled={assignmentActionId === assignment.shiftAssignmentId}
                                                                        className="h-8 px-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 disabled:opacity-50 transition-all text-[10px] font-black inline-flex items-center gap-1"
                                                                    >
                                                                        <span className="material-symbols-outlined !text-sm">swap_horiz</span>
                                                                        Đổi
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeShiftAssignment(assignment)}
                                                                        disabled={assignmentActionId === assignment.shiftAssignmentId}
                                                                        className="h-8 px-2.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 disabled:opacity-50 transition-all text-[10px] font-black inline-flex items-center gap-1"
                                                                    >
                                                                        <span className="material-symbols-outlined !text-sm">person_remove</span>
                                                                        Gỡ
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {isEditingAssignment && (
                                                        <div className="rounded-xl border border-blue-100 bg-white p-3 space-y-2">
                                                            <label className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                                                                Chọn nhân viên thay thế
                                                            </label>
                                                            <div className="flex flex-col sm:flex-row gap-2">
                                                                <select
                                                                    value={replacementEmploymentId}
                                                                    onChange={(e) => setReplacementEmploymentId(e.target.value)}
                                                                    className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-blue-300"
                                                                >
                                                                    <option value="">Chọn nhân viên</option>
                                                                    {replacementCandidates.map(emp => {
                                                                        const isPreferred = preferredAssignments(selectedShiftForDetails).some(a => a.employeeUserId === emp.employeeUserId);
                                                                        return (
                                                                            <option key={emp.employmentId} value={emp.employmentId}>
                                                                                {emp.employeeName} ({emp.position || 'Nhân viên'}){isPreferred ? ' - đã đăng ký rảnh' : ''}
                                                                            </option>
                                                                        );
                                                                    })}
                                                                </select>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => replaceShiftAssignment(assignment)}
                                                                        disabled={!replacementEmploymentId || assignmentActionId === assignment.shiftAssignmentId}
                                                                        className="h-10 px-3 rounded-xl bg-primary text-white text-xs font-black hover:bg-primary-dark disabled:opacity-50"
                                                                    >
                                                                        Lưu
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={cancelReplaceAssignment}
                                                                        disabled={assignmentActionId === assignment.shiftAssignmentId}
                                                                        className="h-10 px-3 rounded-xl border border-slate-200 text-slate-800 text-xs font-black hover:bg-slate-50 disabled:opacity-50"
                                                                    >
                                                                        Hủy
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {replacementCandidates.length === 0 && (
                                                                <p className="text-[11px] text-slate-700">
                                                                    Không còn nhân viên cùng chi nhánh và rảnh trong khung giờ này.
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-800">
                                                        <div className="bg-white p-2 rounded-xl border border-slate-100 text-center">
                                                            <div className="text-[9px] font-bold text-slate-800 uppercase">Giờ vào</div>
                                                            <div className="font-bold text-slate-700 mt-0.5">{formatTime(assignment.checkInAt)}</div>
                                                        </div>
                                                        <div className="bg-white p-2 rounded-xl border border-slate-100 text-center">
                                                            <div className="text-[9px] font-bold text-slate-800 uppercase">Giờ ra</div>
                                                            <div className="font-bold text-slate-700 mt-0.5">{formatTime(assignment.checkOutAt)}</div>
                                                        </div>
                                                        <div className="bg-white p-2 rounded-xl border border-slate-100 text-center">
                                                            <div className="text-[9px] font-bold text-slate-800 uppercase">Giờ công</div>
                                                            <div className="font-bold text-slate-700 mt-0.5">{formatMinutes(assignment.workedMinutes)}</div>
                                                        </div>
                                                    </div>

                                                    {attStatus === 'CheckedOut' && assignment.attendanceRecordId && (
                                                        <div className="flex justify-end gap-2 shrink-0">
                                                            <button
                                                                onClick={() => approveAttendance(assignment.attendanceRecordId)}
                                                                className="h-9 px-4 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all"
                                                            >
                                                                Duyệt công
                             </button>
                                                            <button
                                                                onClick={() => adjustAttendance(assignment)}
                                                                className="h-9 px-4 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold hover:bg-blue-100 transition-all"
                                                            >
                                                                Điều chỉnh
                                                            </button>
                                                            <button
                                                                onClick={() => rejectAttendance(assignment.attendanceRecordId)}
                                                                className="h-9 px-4 rounded-xl bg-red-50 text-red-600 border border-red-100 text-xs font-bold hover:bg-red-100 transition-all"
                                                            >
                                                                Từ chối
                                                            </button>
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

            {/* AI Heuristic Smart Auto-Scheduler Modal */}
            {showAiSchedulerModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-slate-950 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-800/80 animate-in zoom-in-95 duration-200">
                        {/* Terminal Header */}
                        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="flex space-x-1.5 shrink-0">
                                    <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></div>
                                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                </div>
                                <span className="text-xs font-black text-slate-800 font-mono tracking-wider ml-2">
                                    WORKBRIDGE AI CORE v2.5 - SCHEDULE OPTIMIZER
                                </span>
                            </div>
                            {!isAiScheduling && (
                                <button
                                    onClick={() => setShowAiSchedulerModal(false)}
                                    className="text-slate-800 hover:text-white transition-all text-xs font-bold font-mono border border-slate-800 hover:border-slate-700 bg-slate-950 px-2.5 py-1 rounded-lg"
                                >
                                    Esc_
                                </button>
                            )}
                        </div>

                        {/* Terminal Logs Body */}
                        <div className="p-6 bg-slate-950 text-emerald-400 font-mono text-xs space-y-2.5 max-h-[400px] overflow-y-auto min-h-[300px] select-text scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                            {aiSchedulingLogs.map((log, lIdx) => {
                                let textColor = "text-emerald-400";
                                if (log.startsWith("✅")) textColor = "text-emerald-300 font-bold";
                                else if (log.startsWith("❌") || log.startsWith("🚨")) textColor = "text-rose-400 font-bold";
                                else if (log.startsWith("⚠️")) textColor = "text-amber-400";
                                else if (log.startsWith("⚙️")) textColor = "text-indigo-300 font-extrabold";
                                else if (log.startsWith("✨")) textColor = "text-cyan-300";
                                else if (log.startsWith("🏆") || log.startsWith("🎉")) textColor = "text-emerald-400 font-black tracking-wide";

                                return (
                                    <div key={lIdx} className={`leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-150 ${textColor}`}>
                                        {log}
                                    </div>
                                );
                            })}

                            {isAiScheduling && (
                                <div className="flex items-center gap-2 pt-2 text-slate-700 animate-pulse">
                                    <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                                    <span>AI đang tính toán mô hình tối ưu...</span>
                                </div>
                            )}
                        </div>

                        {/* Footer controls */}
                        <div className="bg-slate-900/60 p-5 border-t border-slate-800/80 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${isAiScheduling ? 'bg-indigo-500 animate-ping' : 'bg-emerald-500'}`}></span>
                                <span className="text-[10px] text-slate-800 font-bold font-mono">
                                    {isAiScheduling ? "AI SOLVER STATUS: COMPUTING..." : "AI SOLVER STATUS: READY"}
                                </span>
                            </div>

                            <button
                                onClick={() => setShowAiSchedulerModal(false)}
                                disabled={isAiScheduling}
                                className="h-10 px-5 rounded-xl text-xs font-black font-mono transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25"
                            >
                                <span className="material-symbols-outlined !text-sm">terminal</span>
                                {isAiScheduling ? "Đang xử lý..." : "Đóng Console"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployerShifts;

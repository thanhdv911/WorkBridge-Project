using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Globalization;
using System.Text;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Interfaces;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public class WorkforceService : IWorkforceService
    {
        private readonly IWorkBridgeContext _context;
        private readonly INotificationService _notificationService;
        private readonly IHubNotifier _hubNotifier;
        private static readonly string[] ActiveAssignmentStatuses = { "Assigned", "InProgress", "Completed" };
        private static readonly string[] ActiveOrPreferredAssignmentStatuses = { "Assigned", "InProgress", "Completed", "Preferred" };
        private static readonly string[] EditableAssignmentStatuses = { "Assigned", "Preferred" };
        private const int AttendanceCheckInLeadMinutes = 30;
        private const int AttendanceCheckInMinimumRemainingMinutes = 30;
        private const int AttendanceCheckOutGraceMinutes = 60;
        private const int MaxRegistrationEdits = 2;
        private const string FillStatusOpen = "Open";
        private const string FillStatusFull = "Full";
        private const string FillStatusUnderstaffed = "Understaffed";

        public WorkforceService(IWorkBridgeContext context, INotificationService notificationService, IHubNotifier hubNotifier)
        {
            _context = context;
            _notificationService = notificationService;
            _hubNotifier = hubNotifier;
        }

        public async Task<IEnumerable<EmploymentResponse>> GetEmployerEmployeesAsync(int employerId)
        {
            return await BuildEmploymentQuery()
                .Where(e => e.EmployerId == employerId && e.Status != "Ended")
                .OrderBy(e => e.EmployeeName)
                .ToListAsync();
        }

        public async Task<IEnumerable<EmploymentResponse>> GetMyEmploymentsAsync(int employeeUserId)
        {
            return await BuildEmploymentQuery()
                .Where(e => e.EmployeeUserId == employeeUserId)
                .OrderBy(e => e.BranchName)
                .ToListAsync();
        }

        public async Task<(EmploymentResponse? Employment, string? Error)> UpdateEmploymentStatusAsync(int employerId, int employmentId, UpdateEmploymentStatusRequest request)
        {
            var allowedStatuses = new[] { "Active", "Inactive", "Ended" };
            var status = request.Status?.Trim();
            if (!allowedStatuses.Contains(status)) return (null, "Trạng thái nhân viên phải là Active, Inactive hoặc Ended.");

            var employment = await _context.Employments
                .FirstOrDefaultAsync(e => e.EmploymentId == employmentId && e.EmployerId == employerId);
            if (employment == null) return (null, "Không tìm thấy hồ sơ nhân viên.");

            employment.Status = status!;
            employment.EndDate = status == "Active" ? null : DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                employment.EmployeeUserId,
                "Trạng thái nhân viên đã cập nhật",
                $"Trạng thái làm việc của bạn đã chuyển sang: {ToVietnameseEmploymentStatus(status)}."
            );

            _ = Task.Run(async () => { try { await _hubNotifier.NotifyWorkforceChangedAsync(employerId, employment.EmployeeUserId); } catch { } });

            return (await GetEmploymentResponseAsync(employment.EmploymentId), null);
        }

        public async Task<(EmploymentResponse? Employment, string? Error)> UpdateEmployeeRateAsync(int employerId, int employmentId, UpdateEmployeeRateRequest request)
        {
            if (request.HourlyRate <= 0) return (null, "Mức lương theo giờ phải lớn hơn 0.");

            var employment = await _context.Employments
                .FirstOrDefaultAsync(e => e.EmploymentId == employmentId && e.EmployerId == employerId);
            if (employment == null) return (null, "Không tìm thấy hồ sơ nhân viên.");
            if (employment.Status != "Active") return (null, "Chỉ nhân viên đang hoạt động mới được cập nhật lương.");

            var effectiveFrom = request.EffectiveFrom == default ? DateTime.Today : request.EffectiveFrom.Date;
            var currentRate = await _context.EmployeeRates
                .Where(r => r.EmploymentId == employmentId && r.EffectiveTo == null)
                .OrderByDescending(r => r.EffectiveFrom)
                .FirstOrDefaultAsync();

            if (currentRate != null)
            {
                if (effectiveFrom <= currentRate.EffectiveFrom)
                {
                    return (null, "Ngày áp dụng lương mới phải sau ngày bắt đầu mức lương hiện tại.");
                }

                currentRate.EffectiveTo = effectiveFrom.AddSeconds(-1);
            }

            await _context.EmployeeRates.AddAsync(new EmployeeRate
            {
                EmploymentId = employmentId,
                HourlyRate = request.HourlyRate,
                EffectiveFrom = effectiveFrom,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            await _notificationService.CreateNotificationAsync(
                employment.EmployeeUserId,
                "Lương theo giờ đã cập nhật",
                $"Lương theo giờ của bạn đã được cập nhật thành {request.HourlyRate:N0}đ/giờ."
            );

            _ = Task.Run(async () => { try { await _hubNotifier.NotifyWorkforceChangedAsync(employerId, employment.EmployeeUserId); } catch { } });

            return (await GetEmploymentResponseAsync(employment.EmploymentId), null);
        }

        public async Task<(EmploymentResponse? Employment, string? Error)> UpdateEmployeePositionAsync(int employerId, int employmentId, UpdateEmployeePositionRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Position)) return (null, "Vui lòng nhập vị trí làm việc.");

            var employment = await _context.Employments
                .FirstOrDefaultAsync(e => e.EmploymentId == employmentId && e.EmployerId == employerId);
            if (employment == null) return (null, "Không tìm thấy hồ sơ nhân viên.");

            employment.Position = request.Position.Trim();
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                employment.EmployeeUserId,
                "Vị trí làm việc đã cập nhật",
                $"Vị trí làm việc của bạn đã được cập nhật thành: {employment.Position}."
            );

            _ = Task.Run(async () => { try { await _hubNotifier.NotifyWorkforceChangedAsync(employerId, employment.EmployeeUserId); } catch { } });

            return (await GetEmploymentResponseAsync(employment.EmploymentId), null);
        }

        public async Task<(EmploymentResponse? Employment, string? Error)> UpdateEmployeeBranchAsync(int employerId, int employmentId, UpdateEmployeeBranchRequest request)
        {
            var employment = await _context.Employments
                .FirstOrDefaultAsync(e => e.EmploymentId == employmentId && e.EmployerId == employerId);
            if (employment == null) return (null, "Không tìm thấy hợp đồng lao động của nhân viên.");

            var branch = await _context.Branches
                .FirstOrDefaultAsync(b => b.BranchId == request.BranchId && b.EmployerId == employerId && b.IsActive);
            if (branch == null) return (null, "Chi nhánh mới không tìm thấy hoặc đã ngưng hoạt động.");

            employment.BranchId = request.BranchId;
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                employment.EmployeeUserId,
                "Điều chuyển chi nhánh",
                $"Bạn đã được điều chuyển sang làm việc tại chi nhánh mới: {branch.Name}."
            );

            _ = Task.Run(async () => { try { await _hubNotifier.NotifyWorkforceChangedAsync(employerId, employment.EmployeeUserId); } catch { } });

            return (await GetEmploymentResponseAsync(employment.EmploymentId), null);
        }

        public async Task<(WorkShiftResponse? Shift, string? Error)> CreateShiftAsync(int employerId, CreateWorkShiftRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title)) return (null, "Vui lòng nhập tên ca làm.");
            if (request.EndTime <= request.StartTime) return (null, "Giờ kết thúc ca phải sau giờ bắt đầu.");
            if (request.RequiredPeople < 1) return (null, "Số người cần cho ca phải từ 1 trở lên.");

            var branch = await _context.Branches
                .FirstOrDefaultAsync(b => b.BranchId == request.BranchId && b.EmployerId == employerId && b.IsActive);
            if (branch == null) return (null, "Không tìm thấy chi nhánh hoặc chi nhánh đã ngừng hoạt động.");

            var shift = new WorkShift
            {
                EmployerId = employerId,
                BranchId = request.BranchId,
                Title = request.Title.Trim(),
                StartTime = request.StartTime,
                EndTime = request.EndTime,
                RequiredRole = request.RequiredRole?.Trim(),
                RequiredPeople = request.RequiredPeople,
                Status = "Published",
                CreatedAt = DateTime.UtcNow
            };

            await _context.WorkShifts.AddAsync(shift);
            await _context.SaveChangesAsync();

            return (await GetShiftResponseAsync(shift.WorkShiftId), null);
        }

        public async Task<IEnumerable<WorkShiftResponse>> GetEmployerShiftsAsync(int employerId)
        {
            var shifts = await BuildShiftBaseQuery()
                .Where(s => s.EmployerId == employerId)
                .OrderByDescending(s => s.StartTime)
                .ToListAsync();

            await AttachAssignmentsAsync(shifts);
            return shifts;
        }

        public async Task<IEnumerable<WorkShiftResponse>> GetAvailableShiftsAsync(int employeeUserId)
        {
            var employments = await _context.Employments
                .Where(e => e.EmployeeUserId == employeeUserId && e.Status == "Active")
                .Select(e => new { e.EmployerId, e.BranchId })
                .ToListAsync();

            if (employments.Count == 0) return Enumerable.Empty<WorkShiftResponse>();

            var employerIds = employments.Select(e => e.EmployerId).Distinct().ToList();
            var branchIds = employments.Select(e => e.BranchId).Distinct().ToList();

            var shifts = await BuildShiftBaseQuery()
                .Where(s => employerIds.Contains(s.EmployerId) &&
                            branchIds.Contains(s.BranchId) &&
                            s.Status == "Published" &&
                            s.StartTime > DateTime.Now)
                .OrderBy(s => s.StartTime)
                .ToListAsync();

            shifts = shifts
                .Where(s => employments.Any(e => e.EmployerId == s.EmployerId && e.BranchId == s.BranchId))
                .ToList();

            await AttachAssignmentsAsync(shifts);

            return shifts
                .Where(s => s.Assignments.Count(a => ActiveAssignmentStatuses.Contains(a.Status)) < s.RequiredPeople)
                .Where(s => !s.Assignments.Any(a => a.EmployeeUserId == employeeUserId && ActiveAssignmentStatuses.Contains(a.Status)))
                .Where(s => !HasEmployeeOverlapInMemory(shifts, employeeUserId, s.StartTime, s.EndTime, s.WorkShiftId))
                .ToList();
        }

        public async Task<IEnumerable<WorkShiftResponse>> GetMyShiftsAsync(int employeeUserId)
        {
            var shiftIds = await _context.ShiftAssignments
                .Where(a => a.EmployeeUserId == employeeUserId && ActiveAssignmentStatuses.Contains(a.Status))
                .Select(a => a.WorkShiftId)
                .Distinct()
                .ToListAsync();

            var shifts = await BuildShiftBaseQuery()
                .Where(s => shiftIds.Contains(s.WorkShiftId))
                .OrderBy(s => s.StartTime)
                .ToListAsync();

            await AttachAssignmentsAsync(shifts);
            return shifts;
        }

        public async Task<IEnumerable<WorkShiftResponse>> GetMyBranchShiftsAsync(int employeeUserId)
        {
            var activeEmployments = await _context.Employments
                .Where(e => e.EmployeeUserId == employeeUserId && e.Status == "Active")
                .Select(e => new { e.EmployerId, e.BranchId })
                .ToListAsync();

            if (activeEmployments.Count == 0) return Enumerable.Empty<WorkShiftResponse>();

            var employerIds = activeEmployments.Select(e => e.EmployerId).Distinct().ToList();
            var branchIds = activeEmployments.Select(e => e.BranchId).Distinct().ToList();

            var shifts = await BuildShiftBaseQuery()
                .Where(s => employerIds.Contains(s.EmployerId) &&
                            branchIds.Contains(s.BranchId) &&
                            (s.Status == "Published" || s.Status == "Active" || s.Status == "Completed"))
                .OrderBy(s => s.StartTime)
                .ToListAsync();

            shifts = shifts
                .Where(s => activeEmployments.Any(e => e.EmployerId == s.EmployerId && e.BranchId == s.BranchId))
                .ToList();

            await AttachAssignmentsAsync(shifts);
            return shifts;
        }

        public async Task<(ShiftAssignmentResponse? Assignment, string? Error)> AssignShiftAsync(int employerId, int workShiftId, AssignShiftRequest request)
        {
            var shift = await _context.WorkShifts.FirstOrDefaultAsync(s => s.WorkShiftId == workShiftId && s.EmployerId == employerId);
            if (shift == null) return (null, "Không tìm thấy ca làm.");
            if (shift.Status == "Cancelled") return (null, "Không thể xếp nhân viên vào ca đã hủy.");

            var employment = await _context.Employments
                .FirstOrDefaultAsync(e => e.EmploymentId == request.EmploymentId && e.EmployerId == employerId && e.Status == "Active");
            if (employment == null) return (null, "Không tìm thấy nhân viên đang hoạt động.");
            if (employment.BranchId != shift.BranchId) return (null, "Nhân viên phải thuộc cùng chi nhánh với ca làm.");

            var alreadyAssigned = await _context.ShiftAssignments.AnyAsync(a =>
                a.WorkShiftId == workShiftId &&
                a.EmploymentId == employment.EmploymentId &&
                ActiveAssignmentStatuses.Contains(a.Status));
            if (alreadyAssigned) return (null, "Nhân viên đã được xếp vào ca này.");

            var hasOverlap = await (from assignment in _context.ShiftAssignments
                                    join otherShift in _context.WorkShifts on assignment.WorkShiftId equals otherShift.WorkShiftId
                                    where assignment.EmployeeUserId == employment.EmployeeUserId
                                          && ActiveAssignmentStatuses.Contains(assignment.Status)
                                          && otherShift.Status != "Cancelled"
                                          && otherShift.WorkShiftId != shift.WorkShiftId
                                          && otherShift.StartTime < shift.EndTime
                                          && shift.StartTime < otherShift.EndTime
                                    select assignment)
                .AnyAsync();
            if (hasOverlap) return (null, "Nhân viên đã có ca khác trong khung giờ này.");

            var currentCount = await _context.ShiftAssignments
                .CountAsync(a => a.WorkShiftId == workShiftId && ActiveAssignmentStatuses.Contains(a.Status));
            if (currentCount >= shift.RequiredPeople) return (null, "Ca này đã đủ nhân viên.");

            var newAssignment = new ShiftAssignment
            {
                WorkShiftId = shift.WorkShiftId,
                EmploymentId = employment.EmploymentId,
                EmployeeUserId = employment.EmployeeUserId,
                Status = "Assigned",
                IsFixed = false,
                AssignmentSource = "EmployerAssign",
                AssignedAt = DateTime.UtcNow
            };

            await _context.ShiftAssignments.AddAsync(newAssignment);
            await _context.SaveChangesAsync();

            _ = Task.Run(async () => { try { await _hubNotifier.NotifyWorkforceChangedAsync(employerId, employment.EmployeeUserId); } catch { } });

            return (await GetAssignmentResponseAsync(newAssignment.ShiftAssignmentId), null);
        }

        public async Task<(ShiftAssignmentResponse? Assignment, string? Error)> ReplaceShiftAssignmentAsync(int employerId, int assignmentId, ReplaceShiftAssignmentRequest request)
        {
            if (request.EmploymentId <= 0) return (null, "Vui lòng chọn nhân viên thay thế.");

            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            var assignmentContext = await (from assignmentRow in _context.ShiftAssignments
                                           join shiftRow in _context.WorkShifts on assignmentRow.WorkShiftId equals shiftRow.WorkShiftId
                                           where assignmentRow.ShiftAssignmentId == assignmentId && shiftRow.EmployerId == employerId
                                           select new { Assignment = assignmentRow, Shift = shiftRow })
                .FirstOrDefaultAsync();
            if (assignmentContext == null) return (null, "Không tìm thấy phân công ca làm.");

            var assignment = assignmentContext.Assignment;
            var shift = assignmentContext.Shift;
            if (shift.Status == "Cancelled") return (null, "Không thể sửa ca đã hủy.");
            if (!EditableAssignmentStatuses.Contains(assignment.Status))
            {
                return (null, "Chỉ phân công chưa bắt đầu mới có thể sửa.");
            }

            var hasAttendance = await _context.AttendanceRecords.AnyAsync(r => r.ShiftAssignmentId == assignmentId);
            if (hasAttendance) return (null, "Không thể sửa phân công đã có chấm công.");

            var employment = await _context.Employments
                .FirstOrDefaultAsync(e => e.EmploymentId == request.EmploymentId && e.EmployerId == employerId && e.Status == "Active");
            if (employment == null) return (null, "Không tìm thấy nhân viên thay thế đang hoạt động.");
            if (employment.BranchId != shift.BranchId) return (null, "Nhân viên thay thế phải thuộc cùng chi nhánh với ca làm.");
            if (!IsRoleCompatible(shift.RequiredRole, employment.Position)) return (null, "Vị trí của nhân viên thay thế không phù hợp với yêu cầu ca.");

            if (employment.EmploymentId == assignment.EmploymentId && employment.EmployeeUserId == assignment.EmployeeUserId)
            {
                return (await GetAssignmentResponseAsync(assignment.ShiftAssignmentId), null);
            }

            var duplicateAssignments = await _context.ShiftAssignments
                .Where(a =>
                    a.ShiftAssignmentId != assignment.ShiftAssignmentId &&
                    a.WorkShiftId == shift.WorkShiftId &&
                    (a.EmploymentId == employment.EmploymentId || a.EmployeeUserId == employment.EmployeeUserId) &&
                    ActiveOrPreferredAssignmentStatuses.Contains(a.Status))
                .ToListAsync();

            if (duplicateAssignments.Any(a => ActiveAssignmentStatuses.Contains(a.Status)))
            {
                return (null, "Nhân viên thay thế đã được xếp vào ca này.");
            }

            var currentActiveCount = await _context.ShiftAssignments
                .CountAsync(a => a.WorkShiftId == shift.WorkShiftId &&
                                 a.ShiftAssignmentId != assignment.ShiftAssignmentId &&
                                 ActiveAssignmentStatuses.Contains(a.Status));
            if (!ActiveAssignmentStatuses.Contains(assignment.Status) && currentActiveCount >= shift.RequiredPeople)
            {
                return (null, "Ca này đã đủ nhân viên.");
            }

            var hasOverlap = await HasEmployeeOverlapAsync(employment.EmployeeUserId, shift.StartTime, shift.EndTime, shift.WorkShiftId);
            if (hasOverlap) return (null, "Nhân viên thay thế đã có ca khác trong khung giờ này.");

            if (duplicateAssignments.Any())
            {
                var duplicateAssignmentIds = duplicateAssignments.Select(a => a.ShiftAssignmentId).ToList();
                var duplicatePassRequests = await _context.ShiftPassRequests
                    .Where(r => duplicateAssignmentIds.Contains(r.ShiftAssignmentId))
                    .ToListAsync();
                if (duplicatePassRequests.Any())
                {
                    _context.ShiftPassRequests.RemoveRange(duplicatePassRequests);
                }

                _context.ShiftAssignments.RemoveRange(duplicateAssignments);
            }

            var passRequests = await _context.ShiftPassRequests
                .Where(r => r.ShiftAssignmentId == assignment.ShiftAssignmentId)
                .ToListAsync();
            if (passRequests.Any())
            {
                _context.ShiftPassRequests.RemoveRange(passRequests);
            }

            var previousEmployeeUserId = assignment.EmployeeUserId;
            assignment.EmploymentId = employment.EmploymentId;
            assignment.EmployeeUserId = employment.EmployeeUserId;
            assignment.Status = "Assigned";
            assignment.IsFixed = false;
            assignment.AssignmentSource = "EmployerAssign";
            assignment.AssignedAt = DateTime.UtcNow;
            assignment.TransferredFromAssignmentId = null;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            await _notificationService.CreateNotificationAsync(previousEmployeeUserId, "Ca làm đã cập nhật", $"Bạn đã được gỡ khỏi ca '{shift.Title}'.");
            await _notificationService.CreateNotificationAsync(employment.EmployeeUserId, "Ca làm đã cập nhật", $"Bạn đã được xếp vào ca '{shift.Title}'.");

            _ = Task.Run(async () =>
            {
                try
                {
                    await _hubNotifier.NotifyWorkforceChangedAsync(employerId, previousEmployeeUserId);
                    await _hubNotifier.NotifyWorkforceChangedAsync(employerId, employment.EmployeeUserId);
                }
                catch { }
            });

            return (await GetAssignmentResponseAsync(assignment.ShiftAssignmentId), null);
        }

        public async Task<(bool Success, string? Error)> RemoveShiftAssignmentAsync(int employerId, int assignmentId)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            var assignmentContext = await (from assignmentRow in _context.ShiftAssignments
                                           join shiftRow in _context.WorkShifts on assignmentRow.WorkShiftId equals shiftRow.WorkShiftId
                                           where assignmentRow.ShiftAssignmentId == assignmentId && shiftRow.EmployerId == employerId
                                           select new { Assignment = assignmentRow, Shift = shiftRow })
                .FirstOrDefaultAsync();
            if (assignmentContext == null) return (false, "Không tìm thấy phân công ca làm.");

            var assignment = assignmentContext.Assignment;
            var shift = assignmentContext.Shift;
            if (shift.Status == "Cancelled") return (false, "Không thể sửa ca đã hủy.");
            if (!EditableAssignmentStatuses.Contains(assignment.Status))
            {
                return (false, "Chỉ phân công chưa bắt đầu mới có thể gỡ.");
            }

            var hasAttendance = await _context.AttendanceRecords.AnyAsync(r => r.ShiftAssignmentId == assignmentId);
            if (hasAttendance) return (false, "Không thể gỡ phân công đã có chấm công.");

            var passRequests = await _context.ShiftPassRequests
                .Where(r => r.ShiftAssignmentId == assignment.ShiftAssignmentId)
                .ToListAsync();
            if (passRequests.Any())
            {
                _context.ShiftPassRequests.RemoveRange(passRequests);
            }

            var employeeUserId = assignment.EmployeeUserId;
            _context.ShiftAssignments.Remove(assignment);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            await _notificationService.CreateNotificationAsync(employeeUserId, "Ca làm đã cập nhật", $"Bạn đã được gỡ khỏi ca '{shift.Title}'.");

            _ = Task.Run(async () =>
            {
                try
                {
                    await _hubNotifier.NotifyWorkforceChangedAsync(employerId, employeeUserId);
                    await _hubNotifier.NotifyWorkforceChangedAsync(employerId, 0);
                }
                catch { }
            });

            return (true, null);
        }

        public async Task<(ShiftAssignmentResponse? Assignment, string? Error)> RegisterForShiftAsync(int employeeUserId, int workShiftId)
        {
            var shift = await _context.WorkShifts.FirstOrDefaultAsync(s => s.WorkShiftId == workShiftId);
            if (shift == null) return (null, "Không tìm thấy ca làm.");
            if (shift.Status != "Published") return (null, "Ca này chưa mở đăng ký.");
            if (shift.StartTime <= DateTime.Now) return (null, "Không thể đăng ký ca đã bắt đầu.");

            var employment = await _context.Employments
                .FirstOrDefaultAsync(e =>
                    e.EmployeeUserId == employeeUserId &&
                    e.EmployerId == shift.EmployerId &&
                    e.BranchId == shift.BranchId &&
                    e.Status == "Active");
            if (employment == null) return (null, "Bạn không phải nhân viên đang hoạt động tại chi nhánh này.");

            var alreadyAssigned = await _context.ShiftAssignments.AnyAsync(a =>
                a.WorkShiftId == workShiftId &&
                a.EmployeeUserId == employeeUserId &&
                ActiveAssignmentStatuses.Contains(a.Status));
            if (alreadyAssigned) return (null, "Bạn đã đăng ký ca này.");

            var hasOverlap = await HasEmployeeOverlapAsync(employeeUserId, shift.StartTime, shift.EndTime, shift.WorkShiftId);
            if (hasOverlap) return (null, "Bạn đã có ca khác trong khung giờ này.");

            var currentCount = await _context.ShiftAssignments
                .CountAsync(a => a.WorkShiftId == workShiftId && ActiveAssignmentStatuses.Contains(a.Status));
            if (currentCount >= shift.RequiredPeople) return (null, "Ca này đã đủ người.");

            var assignment = new ShiftAssignment
            {
                WorkShiftId = shift.WorkShiftId,
                EmploymentId = employment.EmploymentId,
                EmployeeUserId = employeeUserId,
                Status = "Assigned",
                IsFixed = false,
                AssignmentSource = "EmployeeRegistration",
                AssignedAt = DateTime.UtcNow
            };

            await _context.ShiftAssignments.AddAsync(assignment);
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                shift.EmployerId,
                "Có nhân viên đăng ký ca",
                $"Một nhân viên đã đăng ký ca '{shift.Title}'."
            );

            _ = Task.Run(async () => { try { await _hubNotifier.NotifyWorkforceChangedAsync(shift.EmployerId, employeeUserId); } catch { } });

            return (await GetAssignmentResponseAsync(assignment.ShiftAssignmentId), null);
        }

        public async Task<(ShiftRegistrationWindowResponse? Window, string? Error)> PublishNextWeekRegistrationWindowAsync(int employerId, PublishRegistrationWindowRequest request)
        {
            var branch = await _context.Branches
                .FirstOrDefaultAsync(b => b.BranchId == request.BranchId && b.EmployerId == employerId && b.IsActive);
            if (branch == null) return (null, "Không tìm thấy chi nhánh hoặc chi nhánh đã ngừng hoạt động.");

            var now = DateTime.Now;
            var currentWeekStart = GetWeekStart(now);
            var targetWeekStart = currentWeekStart.AddDays(7);
            var targetWeekStartStored = ToStoredLocalDateTime(targetWeekStart);
            var openAt = currentWeekStart;
            var closeAt = currentWeekStart.AddDays(5);
            var openAtStored = ToStoredLocalDateTime(openAt);
            var closeAtStored = ToStoredLocalDateTime(closeAt);

            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            var existing = await _context.ShiftRegistrationWindows
                .FirstOrDefaultAsync(w => w.EmployerId == employerId &&
                                          w.BranchId == request.BranchId &&
                                          (w.WeekStartDate == targetWeekStartStored || w.WeekStartDate == targetWeekStart));
            if (existing != null)
            {
                var createdCount = await EnsureTemplateShiftsForWindowAsync(employerId, request.BranchId, existing.ShiftRegistrationWindowId, targetWeekStart);
                if (existing.Status != "Finalized" || createdCount > 0)
                {
                    existing.Status = "Open";
                    existing.FinalizedAt = null;
                    existing.OpenAt = openAtStored;
                    existing.CloseAt = closeAtStored;
                    existing.PublishedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                await NotifyRegistrationWindowPublishedAsync(employerId, request.BranchId, targetWeekStart, closeAt);
                _ = Task.Run(async () => { try { await _hubNotifier.NotifyWorkforceChangedAsync(employerId, 0); } catch { } });

                return (await BuildRegistrationWindowResponseAsync(existing.ShiftRegistrationWindowId, null, true), null);
            }

            var window = new ShiftRegistrationWindow
            {
                EmployerId = employerId,
                BranchId = request.BranchId,
                WeekStartDate = targetWeekStartStored,
                OpenAt = openAtStored,
                CloseAt = closeAtStored,
                Status = "Open",
                MinFixedShifts = 3,
                PublishedAt = DateTime.UtcNow
            };

            await _context.ShiftRegistrationWindows.AddAsync(window);
            await _context.SaveChangesAsync();

            await EnsureTemplateShiftsForWindowAsync(employerId, request.BranchId, window.ShiftRegistrationWindowId, targetWeekStart);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            await NotifyRegistrationWindowPublishedAsync(employerId, request.BranchId, targetWeekStart, closeAt);

            _ = Task.Run(async () => { try { await _hubNotifier.NotifyWorkforceChangedAsync(employerId, 0); } catch { } });

            return (await BuildRegistrationWindowResponseAsync(window.ShiftRegistrationWindowId, null, true), null);
        }

        public async Task<IEnumerable<ShiftRegistrationWindowResponse>> GetMyNextWeekRegistrationWindowsAsync(int employeeUserId)
        {
            var now = DateTime.Now;
            var targetWeekStart = GetWeekStart(now).AddDays(7);
            var targetWeekStartStored = ToStoredLocalDateTime(targetWeekStart);

            var employments = await _context.Employments
                .Where(e => e.EmployeeUserId == employeeUserId && e.Status == "Active")
                .Select(e => new { e.EmployerId, e.BranchId })
                .ToListAsync();

            if (employments.Count == 0) return Enumerable.Empty<ShiftRegistrationWindowResponse>();

            var employerIds = employments.Select(e => e.EmployerId).Distinct().ToList();
            var branchIds = employments.Select(e => e.BranchId).Distinct().ToList();

            var windowIds = await _context.ShiftRegistrationWindows
                .Where(w => employerIds.Contains(w.EmployerId) &&
                            branchIds.Contains(w.BranchId) &&
                            (w.WeekStartDate == targetWeekStartStored || w.WeekStartDate == targetWeekStart))
                .OrderBy(w => w.WeekStartDate)
                .Select(w => w.ShiftRegistrationWindowId)
                .ToListAsync();

            var responses = new List<ShiftRegistrationWindowResponse>();
            foreach (var windowId in windowIds)
            {
                var response = await BuildRegistrationWindowResponseAsync(windowId, employeeUserId, false);
                if (response != null) responses.Add(response);
            }

            return responses;
        }

        public async Task<(ShiftRegistrationWindowResponse? Window, string? Error, bool IsConflict)> SubmitShiftRegistrationAsync(int employeeUserId, int windowId, SubmitShiftRegistrationRequest request)
        {
            var selectedIds = request.ShiftIds?.Any() == true
                ? request.ShiftIds.Distinct().ToList()
                : (request.FixedShiftIds ?? new List<int>()).Concat(request.ExtraShiftIds ?? new List<int>()).Distinct().ToList();

            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            var window = await _context.ShiftRegistrationWindows.FirstOrDefaultAsync(w => w.ShiftRegistrationWindowId == windowId);
            if (window == null) return (null, "Không tìm thấy khung đăng ký ca.", false);

            var now = DateTime.Now;
            if (window.Status != "Open") return (null, "Registration is not open.", false);
            if (now < window.OpenAt || now > window.CloseAt) return (null, "Registration form is closed.", false);
            if (selectedIds.Count < window.MinFixedShifts) return (null, $"Please choose at least {window.MinFixedShifts} shifts.", false);

            var employment = await _context.Employments
                .FirstOrDefaultAsync(e => e.EmployeeUserId == employeeUserId &&
                                          e.EmployerId == window.EmployerId &&
                                          e.BranchId == window.BranchId &&
                                          e.Status == "Active");
            if (employment == null) return (null, "Bạn không phải nhân viên đang hoạt động tại chi nhánh này.", false);

            var selectedShifts = await _context.WorkShifts
                .Where(s => selectedIds.Contains(s.WorkShiftId) &&
                            s.RegistrationWindowId == windowId &&
                            s.Status == "Published")
                .OrderBy(s => s.StartTime)
                .ToListAsync();
            if (selectedShifts.Count != selectedIds.Count) return (null, "Some selected shifts are invalid or unavailable.", false);
            if (HasOverlap(selectedShifts)) return (null, "Các ca được chọn không được trùng giờ.", false);

            var existingWindowAssignments = await (from assignment in _context.ShiftAssignments
                                                   join shift in _context.WorkShifts on assignment.WorkShiftId equals shift.WorkShiftId
                                                   where shift.RegistrationWindowId == windowId &&
                                                         assignment.EmployeeUserId == employeeUserId &&
                                                         (assignment.Status == "Assigned" || assignment.Status == "Preferred" || assignment.Status == "InProgress" || assignment.Status == "Completed")
                                                   select assignment)
                .ToListAsync();

            var existingRegistrationAssignments = existingWindowAssignments
                .Where(a => a.AssignmentSource == "EmployeeRegistration" || a.Status == "Preferred")
                .ToList();
            var existingSelectedIds = existingRegistrationAssignments
                .Select(a => a.WorkShiftId)
                .OrderBy(id => id)
                .ToList();
            if (existingSelectedIds.SequenceEqual(selectedIds.OrderBy(id => id)))
            {
                await transaction.CommitAsync();
                return (await BuildRegistrationWindowResponseAsync(windowId, employeeUserId, false), null, false);
            }

            var currentEditCount = existingRegistrationAssignments
                .Select(a => a.TransferredFromAssignmentId ?? 0)
                .DefaultIfEmpty(0)
                .Max();
            var hasSubmittedBefore = existingRegistrationAssignments.Count > 0;
            if (hasSubmittedBefore && currentEditCount >= MaxRegistrationEdits)
            {
                return (null, $"You can only edit shift registration {MaxRegistrationEdits} times before scheduling is finalized.", false);
            }
            var nextEditCount = hasSubmittedBefore ? currentEditCount + 1 : 0;

            var existingAssignmentIds = existingWindowAssignments.Select(a => a.ShiftAssignmentId).ToList();
            var attendanceExists = await _context.AttendanceRecords
                .AnyAsync(a => existingAssignmentIds.Contains(a.ShiftAssignmentId));
            if (attendanceExists) return (null, "Không thể đổi đăng ký sau khi đã bắt đầu chấm công.", false);

            var assignmentsToRemove = existingWindowAssignments
                .Where(a => a.AssignmentSource == "EmployeeRegistration" || a.Status == "Preferred")
                .ToList();
            if (assignmentsToRemove.Count > 0)
            {
                _context.ShiftAssignments.RemoveRange(assignmentsToRemove);
                await _context.SaveChangesAsync();
            }

            var activeAssignments = await (from assignment in _context.ShiftAssignments
                                           join shift in _context.WorkShifts on assignment.WorkShiftId equals shift.WorkShiftId
                                           where assignment.EmployeeUserId == employeeUserId &&
                                                 ActiveAssignmentStatuses.Contains(assignment.Status) &&
                                                 shift.Status != "Cancelled"
                                           select new { assignment, shift })
                .ToListAsync();

            foreach (var shift in selectedShifts)
            {
                var overlapsExisting = activeAssignments.Any(x =>
                    x.shift.WorkShiftId != shift.WorkShiftId &&
                    x.shift.StartTime < shift.EndTime &&
                    shift.StartTime < x.shift.EndTime);
                if (overlapsExisting) return (null, "Bạn đã có ca khác trong khung giờ này.", false);
            }

            foreach (var shift in selectedShifts)
            {
                var existingForEmployee = activeAssignments.FirstOrDefault(x => x.shift.WorkShiftId == shift.WorkShiftId)?.assignment;
                if (existingForEmployee != null)
                {
                    existingForEmployee.IsFixed = false;
                    existingForEmployee.Status = "Preferred";
                    existingForEmployee.AssignmentSource = "EmployeeRegistration";
                    existingForEmployee.AssignedAt = DateTime.UtcNow;
                    existingForEmployee.TransferredFromAssignmentId = nextEditCount;
                    continue;
                }

                await _context.ShiftAssignments.AddAsync(new ShiftAssignment
                {
                    WorkShiftId = shift.WorkShiftId,
                    EmploymentId = employment.EmploymentId,
                    EmployeeUserId = employeeUserId,
                    Status = "Preferred",
                    IsFixed = false,
                    AssignmentSource = "EmployeeRegistration",
                    AssignedAt = DateTime.UtcNow,
                    TransferredFromAssignmentId = nextEditCount
                });
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            _ = Task.Run(async () => { try { await _hubNotifier.NotifyWorkforceChangedAsync(window.EmployerId, employeeUserId); } catch { } });

            return (await BuildRegistrationWindowResponseAsync(windowId, employeeUserId, false), null, false);
        }

        public async Task<(ShiftRegistrationWindowResponse? Window, string? Error)> FinalizeRegistrationWindowAsync(int employerId, int windowId)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            var window = await _context.ShiftRegistrationWindows
                .FirstOrDefaultAsync(w => w.ShiftRegistrationWindowId == windowId && w.EmployerId == employerId);
            if (window == null) return (null, "Không tìm thấy khung đăng ký ca.");
            if (window.Status == "Finalized")
            {
                await transaction.CommitAsync();
                return (await BuildRegistrationWindowResponseAsync(windowId, null, true), null);
            }
            if (window.Status == "Finalizing") return (null, "Khung đăng ký ca đang được chốt.");
            if (window.Status != "Open") return (null, "Chỉ khung đăng ký đang mở mới có thể chốt.");

            window.Status = "Finalizing";
            await _context.SaveChangesAsync();

            var shifts = await _context.WorkShifts
                .Where(s => s.RegistrationWindowId == windowId && s.Status == "Published")
                .OrderBy(s => s.StartTime)
                .ToListAsync();
            var shiftIds = shifts.Select(s => s.WorkShiftId).ToList();

            var activeEmployments = await _context.Employments
                .Where(e => e.EmployerId == employerId && e.BranchId == window.BranchId && e.Status == "Active")
                .OrderBy(e => e.EmploymentId)
                .ToListAsync();

            var employeeUserIds = activeEmployments.Select(e => e.EmployeeUserId).ToList();

            // Retrieve all registration selections for this week (status is "Preferred")
            var allPreferredAssignments = await _context.ShiftAssignments
                .Where(a => employeeUserIds.Contains(a.EmployeeUserId) &&
                            shiftIds.Contains(a.WorkShiftId) &&
                            a.Status == "Preferred")
                .ToListAsync();

            // Also load any already assigned/finalized shifts in this window or other windows (just in case they overlap)
            var activeAssignments = await (from assignment in _context.ShiftAssignments
                                           join s in _context.WorkShifts on assignment.WorkShiftId equals s.WorkShiftId
                                           where employeeUserIds.Contains(assignment.EmployeeUserId) &&
                                                 ActiveAssignmentStatuses.Contains(assignment.Status) &&
                                                 s.Status != "Cancelled"
                                           select new { assignment, s })
                .ToListAsync();

            // DICTIONARY to track how many active/assigned shifts each employee has in this target week
            var assignedCountMap = activeEmployments.ToDictionary(
                emp => emp.EmployeeUserId,
                emp => activeAssignments.Count(x => x.assignment.EmployeeUserId == emp.EmployeeUserId && x.s.StartTime >= window.WeekStartDate && x.s.StartTime < window.WeekStartDate.AddDays(7))
            );

            // PHA 1: PHÂN BỔ THEO LỊCH RẢNH (PREFERRED)
            // Sắp xếp các ca theo thứ tự: ca nào có ÍT người rảnh nhất xếp trước (giải quyết ràng buộc khó trước)
            var shiftPreferredGroups = allPreferredAssignments
                .GroupBy(a => a.WorkShiftId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var shiftsSortedByScarcity = shifts
                .OrderBy(s => shiftPreferredGroups.ContainsKey(s.WorkShiftId) ? shiftPreferredGroups[s.WorkShiftId].Count : 0)
                .ThenBy(s => s.StartTime)
                .ToList();

            foreach (var shift in shiftsSortedByScarcity)
            {
                if (!shiftPreferredGroups.ContainsKey(shift.WorkShiftId))
                    continue;

                var preferredList = shiftPreferredGroups[shift.WorkShiftId];
                var remainingSlotsForShift = shift.RequiredPeople - activeAssignments.Count(x => x.s.WorkShiftId == shift.WorkShiftId);
                if (remainingSlotsForShift <= 0)
                {
                    continue;
                }

                // Lọc bỏ những ứng viên bị trùng giờ hoặc KHÔNG đúng vị trí chuyên môn
                var candidates = new List<ShiftAssignment>();
                foreach (var pref in preferredList)
                {
                    var empUserId = pref.EmployeeUserId;
                    var emp = activeEmployments.FirstOrDefault(e => e.EmployeeUserId == empUserId);
                    if (emp == null) continue;

                    // KIỂM TRA KHỚP CHỨC DANH/VỊ TRÍ CHUYÊN MÔN
                    if (!IsRoleCompatible(shift.RequiredRole, emp.Position))
                    {
                        continue;
                    }

                    // Check overlap in global activeAssignments for that week
                    var employeeActiveAssignments = activeAssignments
                         .Where(x => x.assignment.EmployeeUserId == empUserId)
                         .Select(x => x.s)
                         .ToList();

                    bool hasOverlap = employeeActiveAssignments.Any(s =>
                        s.StartTime < shift.EndTime && shift.StartTime < s.EndTime);

                    if (!hasOverlap)
                    {
                        candidates.Add(pref);
                    }
                }

                // Ưu tiên: ca cố định, người gửi đăng ký rảnh sớm nhất, rồi cân bằng tổng số ca.
                var selectedCandidates = candidates
                    .OrderBy(c => c.IsFixed ? 0 : 1)
                    .ThenBy(c => c.AssignedAt)
                    .ThenBy(c => assignedCountMap.ContainsKey(c.EmployeeUserId) ? assignedCountMap[c.EmployeeUserId] : 0)
                    .ThenBy(c => c.EmployeeUserId)
                    .Take(remainingSlotsForShift)
                    .ToList();

                foreach (var assignment in selectedCandidates)
                {
                    // Chuyển ca rảnh thành ca chính thức. Giữ AssignedAt là thời điểm nhân viên đăng ký
                    // để hệ thống và UI vẫn thấy thứ tự ưu tiên đăng ký sớm.
                    assignment.Status = "Assigned";

                    // Cập nhật bản đồ đếm số ca của nhân viên
                    if (assignedCountMap.ContainsKey(assignment.EmployeeUserId))
                    {
                        assignedCountMap[assignment.EmployeeUserId]++;
                    }

                    // Thêm vào danh sách activeAssignments để kiểm tra overlap cho các ca sau
                    activeAssignments.Add(new { assignment, s = shift });
                }
            }

            // Xóa toàn bộ các bản ghi "Preferred" còn lại chưa được chọn (tránh rác dữ liệu)
            var remainingPreferred = allPreferredAssignments
                .Where(a => a.Status == "Preferred")
                .ToList();
            if (remainingPreferred.Any())
            {
                _context.ShiftAssignments.RemoveRange(remainingPreferred);
                await _context.SaveChangesAsync();
            }

            var autoAssignedByEmployee = activeEmployments.ToDictionary(emp => emp.EmployeeUserId, _ => 0);

            foreach (var shift in shifts.OrderBy(s => activeAssignments.Count(x => x.s.WorkShiftId == s.WorkShiftId))
                                        .ThenBy(s => s.StartTime))
            {
                var remainingSlots = shift.RequiredPeople - activeAssignments.Count(x => x.s.WorkShiftId == shift.WorkShiftId);
                while (remainingSlots > 0)
                {
                    var candidate = activeEmployments
                        .Where(emp => !activeAssignments.Any(x => x.s.WorkShiftId == shift.WorkShiftId &&
                                                                  x.assignment.EmployeeUserId == emp.EmployeeUserId))
                        .Where(emp => !activeAssignments.Any(x => x.assignment.EmployeeUserId == emp.EmployeeUserId &&
                                                                  x.s.StartTime < shift.EndTime &&
                                                                  shift.StartTime < x.s.EndTime))
                        // KIỂM TRA KHỚP CHỨC DANH/VỊ TRÍ CHUYÊN MÔN KHI TỰ ĐỘNG GÁN CA
                        .Where(emp => IsRoleCompatible(shift.RequiredRole, emp.Position))
                        .OrderBy(emp => assignedCountMap.ContainsKey(emp.EmployeeUserId) && assignedCountMap[emp.EmployeeUserId] < window.MinFixedShifts ? 0 : 1)
                        .ThenBy(emp => assignedCountMap.ContainsKey(emp.EmployeeUserId) ? assignedCountMap[emp.EmployeeUserId] : 0)
                        .ThenBy(emp => emp.EmploymentId)
                        .FirstOrDefault();

                    if (candidate == null) break;

                    var autoAssignment = new ShiftAssignment
                    {
                        WorkShiftId = shift.WorkShiftId,
                        EmploymentId = candidate.EmploymentId,
                        EmployeeUserId = candidate.EmployeeUserId,
                        Status = "Assigned",
                        IsFixed = !assignedCountMap.ContainsKey(candidate.EmployeeUserId) ||
                                  assignedCountMap[candidate.EmployeeUserId] < window.MinFixedShifts,
                        AssignmentSource = "AutoAssign",
                        AssignedAt = DateTime.UtcNow
                    };

                    await _context.ShiftAssignments.AddAsync(autoAssignment);
                    activeAssignments.Add(new { assignment = autoAssignment, s = shift });
                    remainingSlots--;

                    if (assignedCountMap.ContainsKey(candidate.EmployeeUserId))
                    {
                        assignedCountMap[candidate.EmployeeUserId]++;
                    }
                    autoAssignedByEmployee[candidate.EmployeeUserId]++;
                }
            }

            foreach (var emp in activeEmployments)
            {
                var autoAssignedCount = autoAssignedByEmployee.TryGetValue(emp.EmployeeUserId, out var count) ? count : 0;
                if (autoAssignedCount <= 0) continue;

                await _notificationService.CreateNotificationAsync(
                    emp.EmployeeUserId,
                    "Tự động phân bổ ca làm",
                    $"Bạn đã được tự động xếp vào {autoAssignedCount} ca làm tuần tới bắt đầu từ {window.WeekStartDate:yyyy-MM-dd} do doanh nghiệp cần đủ nhân sự cho ca và hệ thống đã kiểm tra không trùng lịch của bạn."
                );
            }

            window.Status = "Finalized";
            window.FinalizedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            foreach (var employment in activeEmployments)
            {
                await _notificationService.CreateNotificationAsync(
                    employment.EmployeeUserId,
                    "Lịch làm việc đã chốt",
                    $"Lịch làm việc tuần tới bắt đầu từ {window.WeekStartDate:yyyy-MM-dd} đã được ban hành chính thức. Hãy truy cập Công việc của tôi để xem lịch chi tiết."
                );
            }

            _ = Task.Run(async () => { try { await _hubNotifier.NotifyWorkforceChangedAsync(employerId, 0); } catch { } });

            return (await BuildRegistrationWindowResponseAsync(windowId, null, true), null);
        }

        public async Task<(AttendanceResponse? Attendance, string? Error)> CheckInAsync(int employeeUserId, int shiftAssignmentId)
        {
            var shiftContext = await (from assignment in _context.ShiftAssignments
                                      join shift in _context.WorkShifts on assignment.WorkShiftId equals shift.WorkShiftId
                                      where assignment.ShiftAssignmentId == shiftAssignmentId
                                            && assignment.EmployeeUserId == employeeUserId
                                            && ActiveAssignmentStatuses.Contains(assignment.Status)
                                      select new { Assignment = assignment, Shift = shift })
                .FirstOrDefaultAsync();
            if (shiftContext == null) return (null, "Không tìm thấy phân công ca làm.");

            var now = DateTime.UtcNow;
            var checkInOpenAt = shiftContext.Shift.StartTime.AddMinutes(-AttendanceCheckInLeadMinutes);
            var checkInCloseAt = shiftContext.Shift.EndTime.AddMinutes(-AttendanceCheckInMinimumRemainingMinutes);
            if (now < checkInOpenAt)
            {
                return (null, $"Bạn chỉ có thể vào ca sớm tối đa {AttendanceCheckInLeadMinutes} phút trước giờ bắt đầu.");
            }

            if (now >= shiftContext.Shift.EndTime)
            {
                return (null, "Ca làm đã kết thúc, không thể vào ca. Vui lòng liên hệ quản lý để xử lý công.");
            }

            if (now >= checkInCloseAt)
            {
                return (null, $"Ca chỉ còn {AttendanceCheckInMinimumRemainingMinutes} phút hoặc ít hơn, không thể vào ca. Vui lòng liên hệ quản lý để xử lý công.");
            }

            var existing = await _context.AttendanceRecords
                .FirstOrDefaultAsync(a => a.ShiftAssignmentId == shiftAssignmentId);
            if (existing?.CheckInAt != null) return (null, "Bạn đã vào ca này rồi.");

            var attendance = existing ?? new AttendanceRecord
            {
                ShiftAssignmentId = shiftAssignmentId,
                EmployeeUserId = employeeUserId,
                Status = "NotStarted"
            };

            attendance.CheckInAt = DateTime.UtcNow;
            attendance.Status = "CheckedIn";

            if (existing == null) await _context.AttendanceRecords.AddAsync(attendance);
            shiftContext.Assignment.Status = "InProgress";
            await _context.SaveChangesAsync();

            _ = Task.Run(async () => { try { await _hubNotifier.NotifyWorkforceChangedAsync(shiftContext.Shift.EmployerId, employeeUserId); } catch { } });

            return (await GetAttendanceResponseAsync(attendance.AttendanceRecordId), null);
        }

        public async Task<(AttendanceResponse? Attendance, string? Error)> CheckOutAsync(int employeeUserId, int shiftAssignmentId)
        {
            var shiftContext = await (from assignment in _context.ShiftAssignments
                                      join shift in _context.WorkShifts on assignment.WorkShiftId equals shift.WorkShiftId
                                      where assignment.ShiftAssignmentId == shiftAssignmentId
                                            && assignment.EmployeeUserId == employeeUserId
                                            && ActiveAssignmentStatuses.Contains(assignment.Status)
                                      select new { Assignment = assignment, Shift = shift })
                .FirstOrDefaultAsync();
            if (shiftContext == null) return (null, "Không tìm thấy phân công ca làm.");

            var attendance = await _context.AttendanceRecords
                .FirstOrDefaultAsync(a => a.ShiftAssignmentId == shiftAssignmentId && a.EmployeeUserId == employeeUserId);
            if (attendance == null || attendance.CheckInAt == null) return (null, "Bạn cần vào ca trước khi ra ca.");
            if (attendance.CheckOutAt != null) return (null, "Bạn đã ra ca này rồi.");

            var now = DateTime.UtcNow;
            if (now < shiftContext.Shift.EndTime)
            {
                return (null, "Chỉ có thể ra ca khi đã đến giờ kết thúc ca.");
            }

            if (now > shiftContext.Shift.EndTime.AddMinutes(AttendanceCheckOutGraceMinutes))
            {
                return (null, $"Đã quá {AttendanceCheckOutGraceMinutes} phút sau giờ kết thúc ca. Vui lòng liên hệ quản lý để chỉnh công.");
            }

            attendance.CheckOutAt = now;
            attendance.WorkedMinutes = Math.Max(0, (int)Math.Round((attendance.CheckOutAt.Value - attendance.CheckInAt.Value).TotalMinutes));
            attendance.Status = "CheckedOut";

            shiftContext.Assignment.Status = "Completed";

            await _context.SaveChangesAsync();

            _ = Task.Run(async () => { try { await _hubNotifier.NotifyWorkforceChangedAsync(shiftContext.Shift.EmployerId, employeeUserId); } catch { } });

            return (await GetAttendanceResponseAsync(attendance.AttendanceRecordId), null);
        }

        public async Task<(AttendanceResponse? Attendance, string? Error)> ApproveAttendanceAsync(int employerId, int attendanceRecordId)
        {
            var attendance = await (from record in _context.AttendanceRecords
                                    join assignment in _context.ShiftAssignments on record.ShiftAssignmentId equals assignment.ShiftAssignmentId
                                    join shift in _context.WorkShifts on assignment.WorkShiftId equals shift.WorkShiftId
                                    where record.AttendanceRecordId == attendanceRecordId && shift.EmployerId == employerId
                                    select record)
                .FirstOrDefaultAsync();

            if (attendance == null) return (null, "Không tìm thấy bản ghi chấm công.");
            if (attendance.CheckOutAt == null) return (null, "Chưa thể duyệt vì nhân viên chưa ra ca.");

            attendance.Status = "Approved";
            attendance.ApprovedByEmployerId = employerId;
            attendance.ApprovedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _ = Task.Run(async () => { try { await _hubNotifier.NotifyWorkforceChangedAsync(employerId, attendance.EmployeeUserId); } catch { } });

            return (await GetAttendanceResponseAsync(attendance.AttendanceRecordId), null);
        }

        public async Task<(AttendanceResponse? Attendance, string? Error)> RejectAttendanceAsync(int employerId, int attendanceRecordId, string? note)
        {
            var attendance = await GetEmployerAttendanceRecordAsync(employerId, attendanceRecordId);
            if (attendance == null) return (null, "Không tìm thấy bản ghi chấm công.");
            if (attendance.CheckOutAt == null) return (null, "Chưa thể từ chối vì nhân viên chưa ra ca.");

            attendance.Status = "Rejected";
            attendance.ApprovedByEmployerId = employerId;
            attendance.ApprovedAt = DateTime.UtcNow;
            attendance.Note = note?.Trim();
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                attendance.EmployeeUserId,
                "Chấm công bị từ chối",
                "Bản ghi chấm công của bạn đã bị nhà tuyển dụng từ chối."
            );

            _ = Task.Run(async () => { try { await _hubNotifier.NotifyWorkforceChangedAsync(employerId, attendance.EmployeeUserId); } catch { } });

            return (await GetAttendanceResponseAsync(attendance.AttendanceRecordId), null);
        }

        public async Task<(AttendanceResponse? Attendance, string? Error)> AdjustAttendanceAsync(int employerId, int attendanceRecordId, AdjustAttendanceRequest request)
        {
            var attendance = await GetEmployerAttendanceRecordAsync(employerId, attendanceRecordId);
            if (attendance == null) return (null, "Không tìm thấy bản ghi chấm công.");
            if (request.CheckOutAt <= request.CheckInAt) return (null, "Giờ ra ca phải sau giờ vào ca.");

            attendance.CheckInAt = request.CheckInAt;
            attendance.CheckOutAt = request.CheckOutAt;
            attendance.WorkedMinutes = Math.Max(0, (int)Math.Round((request.CheckOutAt - request.CheckInAt).TotalMinutes));
            attendance.Note = request.Note?.Trim();
            attendance.Status = request.MarkApproved ? "Approved" : "CheckedOut";
            attendance.ApprovedByEmployerId = request.MarkApproved ? employerId : null;
            attendance.ApprovedAt = request.MarkApproved ? DateTime.UtcNow : null;

            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                attendance.EmployeeUserId,
                "Chấm công đã điều chỉnh",
                "Bản ghi chấm công của bạn đã được nhà tuyển dụng điều chỉnh."
            );

            _ = Task.Run(async () => { try { await _hubNotifier.NotifyWorkforceChangedAsync(employerId, attendance.EmployeeUserId); } catch { } });

            return (await GetAttendanceResponseAsync(attendance.AttendanceRecordId), null);
        }

        public async Task<(PayrollPeriodResponse? Payroll, string? Error)> GeneratePayrollAsync(int employerId, int month, int year)
        {
            if (!await IsVipEmployerAsync(employerId))
            {
                return (null, "Bạn cần đăng ký gói VIP Doanh nghiệp để sử dụng chức năng AI và Tính lương này.");
            }

            if (month < 1 || month > 12) return (null, "Tháng phải nằm trong khoảng 1 - 12.");

            var existing = await _context.PayrollPeriods
                .FirstOrDefaultAsync(p => p.EmployerId == employerId && p.Month == month && p.Year == year);
            if (existing?.Status == "Locked" || existing?.Status == "Paid")
            {
                return (null, "Bảng lương đã chốt hoặc đã thanh toán nên không thể tạo lại.");
            }

            if (existing != null)
            {
                var oldItems = await _context.PayrollItems
                    .Where(i => i.PayrollPeriodId == existing.PayrollPeriodId)
                    .ToListAsync();
                _context.PayrollItems.RemoveRange(oldItems);
            }

            var paydayMonth = month == 12 ? 1 : month + 1;
            var paydayYear = month == 12 ? year + 1 : year;
            var period = existing ?? new PayrollPeriod
            {
                EmployerId = employerId,
                Month = month,
                Year = year,
                CreatedAt = DateTime.UtcNow
            };
            period.Status = "Draft";
            period.Payday = new DateTime(paydayYear, paydayMonth, 5);

            if (existing == null) await _context.PayrollPeriods.AddAsync(period);
            await _context.SaveChangesAsync();

            var start = new DateTime(year, month, 1);
            var end = start.AddMonths(1);
            var employments = await _context.Employments
                .Where(e => e.EmployerId == employerId && e.Status == "Active")
                .ToListAsync();

            foreach (var employment in employments)
            {
                var approvedRecords = await (from record in _context.AttendanceRecords
                                             join assignment in _context.ShiftAssignments on record.ShiftAssignmentId equals assignment.ShiftAssignmentId
                                             join shift in _context.WorkShifts on assignment.WorkShiftId equals shift.WorkShiftId
                                             where assignment.EmploymentId == employment.EmploymentId
                                                   && record.Status == "Approved"
                                                   && shift.StartTime >= start
                                                   && shift.StartTime < end
                                             select new { record, shift })
                    .ToListAsync();

                var totalMinutes = 0;
                decimal baseSalary = 0;
                decimal snapshotRate = 0;
                decimal penalty = 0;

                foreach (var item in approvedRecords)
                {
                    var rate = await _context.EmployeeRates
                        .Where(r => r.EmploymentId == employment.EmploymentId
                                    && r.EffectiveFrom <= item.shift.StartTime
                                    && (r.EffectiveTo == null || r.EffectiveTo >= item.shift.StartTime))
                        .OrderByDescending(r => r.EffectiveFrom)
                        .FirstOrDefaultAsync();

                    if (rate == null) continue;
                    snapshotRate = rate.HourlyRate;

                    // Check if forgot to check out (over 1 hour late after shift end)
                    bool forgotCheckout = false;
                    if (item.record.CheckOutAt.HasValue)
                    {
                        var checkoutDelayMinutes = (item.record.CheckOutAt.Value - item.shift.EndTime).TotalMinutes;
                        if (checkoutDelayMinutes > 60)
                        {
                            forgotCheckout = true;
                        }
                    }

                    if (forgotCheckout)
                    {
                        // Forgot check-out results in zero salary and zero credited minutes for this shift
                        continue;
                    }

                    totalMinutes += item.record.WorkedMinutes;
                    decimal shiftSalary = Math.Round((item.record.WorkedMinutes / 60m) * rate.HourlyRate, 2);

                    // Check if checked in late by 10 minutes or more
                    if (item.record.CheckInAt.HasValue)
                    {
                        var checkInDelayMinutes = (item.record.CheckInAt.Value - item.shift.StartTime).TotalMinutes;
                        if (checkInDelayMinutes >= 10)
                        {
                            penalty += 20000m; // Deduct 20,000 VND
                        }
                    }

                    baseSalary += shiftSalary;
                }

                decimal finalSalary = baseSalary - penalty;
                if (finalSalary < 0) finalSalary = 0;

                var payrollItem = new PayrollItem
                {
                    PayrollPeriodId = period.PayrollPeriodId,
                    EmploymentId = employment.EmploymentId,
                    EmployeeUserId = employment.EmployeeUserId,
                    TotalApprovedMinutes = totalMinutes,
                    HourlyRateSnapshot = snapshotRate,
                    BaseSalary = baseSalary,
                    Bonus = 0,
                    Penalty = penalty,
                    Deduction = 0,
                    FinalSalary = finalSalary,
                    Status = "Draft"
                };

                await _context.PayrollItems.AddAsync(payrollItem);
            }

            await _context.SaveChangesAsync();
            return (await GetPayrollPeriodResponseAsync(period.PayrollPeriodId), null);
        }

        public async Task<IEnumerable<PayrollPeriodResponse>> GetPayrollPeriodsAsync(int employerId)
        {
            if (!await IsVipEmployerAsync(employerId))
            {
                return Enumerable.Empty<PayrollPeriodResponse>();
            }

            var periods = await _context.PayrollPeriods
                .Where(p => p.EmployerId == employerId)
                .OrderByDescending(p => p.Year)
                .ThenByDescending(p => p.Month)
                .ToListAsync();

            var responses = new List<PayrollPeriodResponse>();
            foreach (var period in periods)
            {
                var response = await GetPayrollPeriodResponseAsync(period.PayrollPeriodId);
                if (response != null) responses.Add(response);
            }

            return responses;
        }

        public async Task<IEnumerable<PayrollPeriodResponse>> GetMyPayslipsAsync(int employeeUserId)
        {
            var periodIds = await (from item in _context.PayrollItems
                                   join period in _context.PayrollPeriods on item.PayrollPeriodId equals period.PayrollPeriodId
                                   where item.EmployeeUserId == employeeUserId && (period.Status == "Locked" || period.Status == "Paid")
                                   orderby period.Year descending, period.Month descending
                                   select period.PayrollPeriodId)
                .Distinct()
                .ToListAsync();

            var responses = new List<PayrollPeriodResponse>();
            foreach (var periodId in periodIds)
            {
                var response = await GetPayrollPeriodResponseAsync(periodId, employeeUserId);
                if (response != null) responses.Add(response);
            }

            return responses;
        }

        public async Task<(PayrollPeriodResponse? Payroll, string? Error)> LockPayrollAsync(int employerId, int payrollPeriodId)
        {
            if (!await IsVipEmployerAsync(employerId))
            {
                return (null, "Bạn cần đăng ký gói VIP Doanh nghiệp để sử dụng chức năng AI và Tính lương này.");
            }

            var period = await _context.PayrollPeriods
                .FirstOrDefaultAsync(p => p.PayrollPeriodId == payrollPeriodId && p.EmployerId == employerId);
            if (period == null) return (null, "Không tìm thấy kỳ lương.");
            if (period.Status == "Paid") return (null, "Bảng lương đã thanh toán nên không thể chỉnh sửa.");
            if (period.Status == "Locked") return (await GetPayrollPeriodResponseAsync(period.PayrollPeriodId), null);

            period.Status = "Locked";
            period.LockedAt = DateTime.UtcNow;

            var items = await _context.PayrollItems.Where(i => i.PayrollPeriodId == period.PayrollPeriodId).ToListAsync();
            foreach (var item in items) item.Status = "Locked";

            await _context.SaveChangesAsync();
            return (await GetPayrollPeriodResponseAsync(period.PayrollPeriodId), null);
        }

        public async Task<(PayrollPeriodResponse? Payroll, string? Error)> MarkPayrollPaidAsync(int employerId, int payrollPeriodId)
        {
            if (!await IsVipEmployerAsync(employerId))
            {
                return (null, "Bạn cần đăng ký gói VIP Doanh nghiệp để sử dụng chức năng AI và Tính lương này.");
            }

            var period = await _context.PayrollPeriods
                .FirstOrDefaultAsync(p => p.PayrollPeriodId == payrollPeriodId && p.EmployerId == employerId);
            if (period == null) return (null, "Không tìm thấy kỳ lương.");
            if (period.Status != "Locked" && period.Status != "Paid") return (null, "Cần chốt bảng lương trước khi đánh dấu đã thanh toán.");
            if (period.Status == "Paid") return (await GetPayrollPeriodResponseAsync(period.PayrollPeriodId), null);

            period.Status = "Paid";
            period.PaidAt = DateTime.UtcNow;

            var items = await _context.PayrollItems.Where(i => i.PayrollPeriodId == period.PayrollPeriodId).ToListAsync();
            foreach (var item in items) item.Status = "Paid";

            await _context.SaveChangesAsync();
            return (await GetPayrollPeriodResponseAsync(period.PayrollPeriodId), null);
        }

        public async Task<(PayrollPeriodResponse? Payroll, string? Error)> UpdatePayrollItemAdjustmentAsync(int employerId, int payrollItemId, UpdatePayrollItemAdjustmentRequest request)
        {
            if (!await IsVipEmployerAsync(employerId))
            {
                return (null, "Bạn cần đăng ký gói VIP Doanh nghiệp để sử dụng chức năng AI và Tính lương này.");
            }

            if (request.Bonus < 0 || request.Penalty < 0 || request.Deduction < 0)
            {
                return (null, "Tiền thưởng, tiền phạt và khấu trừ không được âm.");
            }

            var payrollItem = await (from item in _context.PayrollItems
                                     join period in _context.PayrollPeriods on item.PayrollPeriodId equals period.PayrollPeriodId
                                     where item.PayrollItemId == payrollItemId && period.EmployerId == employerId
                                     select new { item, period })
                .FirstOrDefaultAsync();

            if (payrollItem == null) return (null, "Không tìm thấy mục lương.");
            if (payrollItem.period.Status != "Draft") return (null, "Chỉ bảng lương nháp mới có thể điều chỉnh.");

            payrollItem.item.Bonus = request.Bonus;
            payrollItem.item.Penalty = request.Penalty;
            payrollItem.item.Deduction = request.Deduction;
            payrollItem.item.FinalSalary = payrollItem.item.BaseSalary + request.Bonus - request.Penalty - request.Deduction;
            if (payrollItem.item.FinalSalary < 0) payrollItem.item.FinalSalary = 0;

            await _context.SaveChangesAsync();
            return (await GetPayrollPeriodResponseAsync(payrollItem.period.PayrollPeriodId), null);
        }

        public async Task<IEnumerable<ShiftPassCandidateResponse>> GetPassCandidatesAsync(int employeeUserId, int shiftAssignmentId)
        {
            await ExpireStaleShiftPassRequestsAsync();

            var data = await GetPassContextAsync(employeeUserId, shiftAssignmentId);
            if (data == null || DateTime.UtcNow >= data.Shift.StartTime.AddHours(-2)) return Enumerable.Empty<ShiftPassCandidateResponse>();

            var candidates = await BuildPassCandidatesQuery(data.Employment.EmployerId, data.Shift.BranchId, employeeUserId, data.Shift.StartTime, data.Shift.EndTime)
                .ToListAsync();

            return candidates;
        }

        public async Task<(ShiftPassRequestResponse? Request, string? Error)> CreateShiftPassRequestAsync(int employeeUserId, CreateShiftPassRequest request)
        {
            await ExpireStaleShiftPassRequestsAsync();
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            var data = await GetPassContextAsync(employeeUserId, request.ShiftAssignmentId);
            if (data == null) return (null, "Không tìm thấy phân công ca làm.");
            if (data.Assignment.Status != "Assigned") return (null, "Chỉ ca đã được phân công mới có thể nhường.");
            if (DateTime.UtcNow >= data.Shift.StartTime.AddHours(-2)) return (null, "Yêu cầu nhường ca phải tạo trước giờ bắt đầu ít nhất 2 giờ.");
            if (request.ToEmployeeUserId == employeeUserId) return (null, "Bạn không thể nhường ca cho chính mình.");

            var hasPending = await _context.ShiftPassRequests.AnyAsync(r =>
                r.ShiftAssignmentId == request.ShiftAssignmentId &&
                r.Status == "Pending");
            if (hasPending) return (null, "Ca này đã có yêu cầu nhường ca đang chờ xử lý.");

            var candidateExists = await BuildPassCandidatesQuery(data.Employment.EmployerId, data.Shift.BranchId, employeeUserId, data.Shift.StartTime, data.Shift.EndTime)
                .AnyAsync(c => c.EmployeeUserId == request.ToEmployeeUserId);
            if (!candidateExists) return (null, "Nhân viên được chọn không phù hợp với ca này.");

            var passRequest = new ShiftPassRequest
            {
                ShiftAssignmentId = request.ShiftAssignmentId,
                WorkShiftId = data.Shift.WorkShiftId,
                FromEmployeeUserId = employeeUserId,
                ToEmployeeUserId = request.ToEmployeeUserId,
                BranchId = data.Shift.BranchId,
                Status = "Pending",
                RequestedAt = DateTime.UtcNow,
                ExpiresAt = data.Shift.StartTime.AddHours(-2),
                Reason = request.Reason?.Trim()
            };

            await _context.ShiftPassRequests.AddAsync(passRequest);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            await _notificationService.CreateNotificationAsync(
                request.ToEmployeeUserId,
                "Yêu cầu nhường ca",
                $"Một đồng nghiệp muốn nhường ca '{data.Shift.Title}' cho bạn."
            );

            _ = Task.Run(async () => { try { await _hubNotifier.NotifyWorkforceChangedAsync(data.Employment.EmployerId, request.ToEmployeeUserId); } catch { } });

            return (await GetShiftPassRequestResponseAsync(passRequest.ShiftPassRequestId), null);
        }

        public async Task<IEnumerable<ShiftPassRequestResponse>> GetIncomingPassRequestsAsync(int employeeUserId)
        {
            await ExpireStaleShiftPassRequestsAsync();
            var ids = await _context.ShiftPassRequests
                .Where(r => r.ToEmployeeUserId == employeeUserId)
                .OrderByDescending(r => r.RequestedAt)
                .Select(r => r.ShiftPassRequestId)
                .ToListAsync();

            return await BuildShiftPassResponsesAsync(ids);
        }

        public async Task<IEnumerable<ShiftPassRequestResponse>> GetOutgoingPassRequestsAsync(int employeeUserId)
        {
            await ExpireStaleShiftPassRequestsAsync();
            var ids = await _context.ShiftPassRequests
                .Where(r => r.FromEmployeeUserId == employeeUserId)
                .OrderByDescending(r => r.RequestedAt)
                .Select(r => r.ShiftPassRequestId)
                .ToListAsync();

            return await BuildShiftPassResponsesAsync(ids);
        }

        public async Task<(ShiftPassRequestResponse? Request, string? Error)> AcceptShiftPassRequestAsync(int employeeUserId, int requestId)
        {
            await ExpireStaleShiftPassRequestsAsync();
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            var request = await _context.ShiftPassRequests.FirstOrDefaultAsync(r => r.ShiftPassRequestId == requestId && r.ToEmployeeUserId == employeeUserId);
            if (request == null) return (null, "Không tìm thấy yêu cầu nhường ca.");
            if (request.Status != "Pending") return (null, "Chỉ yêu cầu đang chờ mới có thể chấp nhận.");

            var assignment = await _context.ShiftAssignments.FirstOrDefaultAsync(a => a.ShiftAssignmentId == request.ShiftAssignmentId);
            var shift = await _context.WorkShifts.FirstOrDefaultAsync(s => s.WorkShiftId == request.WorkShiftId);
            if (assignment == null || shift == null) return (null, "Không tìm thấy phân công ca làm.");
            if (DateTime.UtcNow >= shift.StartTime.AddHours(-2)) return (null, "Yêu cầu đã hết hạn vì ca sắp bắt đầu trong dưới 2 giờ.");
            if (assignment.EmployeeUserId != request.FromEmployeeUserId || assignment.Status != "Assigned")
            {
                return (null, "Người phụ trách ca đã thay đổi nên không thể nhận yêu cầu này.");
            }

            var toEmployment = await _context.Employments.FirstOrDefaultAsync(e =>
                e.EmployerId == shift.EmployerId &&
                e.BranchId == shift.BranchId &&
                e.EmployeeUserId == employeeUserId &&
                e.Status == "Active");
            if (toEmployment == null) return (null, "Bạn không phải nhân viên đang hoạt động tại chi nhánh này.");

            var hasOverlap = await HasEmployeeOverlapAsync(employeeUserId, shift.StartTime, shift.EndTime, shift.WorkShiftId);
            if (hasOverlap) return (null, "Bạn đã có ca khác trong khung giờ này.");

            assignment.Status = "Transferred";
            var newAssignment = new ShiftAssignment
            {
                WorkShiftId = shift.WorkShiftId,
                EmploymentId = toEmployment.EmploymentId,
                EmployeeUserId = employeeUserId,
                Status = "Assigned",
                IsFixed = assignment.IsFixed,
                AssignmentSource = "ShiftPass",
                AssignedAt = DateTime.UtcNow,
                TransferredFromAssignmentId = assignment.ShiftAssignmentId
            };

            await _context.ShiftAssignments.AddAsync(newAssignment);
            request.Status = "Accepted";
            request.RespondedAt = DateTime.UtcNow;

            var otherPending = await _context.ShiftPassRequests
                .Where(r => r.ShiftAssignmentId == assignment.ShiftAssignmentId && r.ShiftPassRequestId != request.ShiftPassRequestId && r.Status == "Pending")
                .ToListAsync();
            foreach (var pending in otherPending)
            {
                pending.Status = "Expired";
                pending.RespondedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            await _notificationService.CreateNotificationAsync(request.FromEmployeeUserId, "Ca đã được nhường", $"Ca '{shift.Title}' của bạn đã được đồng nghiệp nhận.");
            await _notificationService.CreateNotificationAsync(shift.EmployerId, "Ca đã được chuyển", $"Ca '{shift.Title}' đã được chuyển giữa hai nhân viên.");

            _ = Task.Run(async () =>
            {
                try
                {
                    await _hubNotifier.NotifyWorkforceChangedAsync(shift.EmployerId, request.FromEmployeeUserId);
                    await _hubNotifier.NotifyWorkforceChangedAsync(shift.EmployerId, employeeUserId);
                }
                catch { }
            });

            return (await GetShiftPassRequestResponseAsync(request.ShiftPassRequestId), null);
        }

        public async Task<(ShiftPassRequestResponse? Request, string? Error)> RejectShiftPassRequestAsync(int employeeUserId, int requestId)
        {
            await ExpireStaleShiftPassRequestsAsync();

            var request = await _context.ShiftPassRequests.FirstOrDefaultAsync(r => r.ShiftPassRequestId == requestId && r.ToEmployeeUserId == employeeUserId);
            if (request == null) return (null, "Không tìm thấy yêu cầu nhường ca.");
            if (request.Status != "Pending") return (null, "Chỉ yêu cầu đang chờ mới có thể từ chối.");

            request.Status = "Rejected";
            request.RespondedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(request.FromEmployeeUserId, "Yêu cầu nhường ca bị từ chối", "Đồng nghiệp đã từ chối yêu cầu nhường ca của bạn.");

            var rejShift = await _context.WorkShifts.FirstOrDefaultAsync(s => s.WorkShiftId == request.WorkShiftId);
            if (rejShift != null) _ = Task.Run(async () => { try { await _hubNotifier.NotifyWorkforceChangedAsync(rejShift.EmployerId, request.FromEmployeeUserId); } catch { } });

            return (await GetShiftPassRequestResponseAsync(request.ShiftPassRequestId), null);
        }

        private async Task<bool> IsVipEmployerAsync(int employerId)
        {
            var now = DateTime.UtcNow;
            return await _context.Subscriptions
                .AnyAsync(s => s.EmployerId == employerId && s.Status == "Active" && s.EndDate >= now);
        }

        private IQueryable<EmploymentResponse> BuildEmploymentQuery()
        {
            return from employment in _context.Employments
                   join user in _context.Users on employment.EmployeeUserId equals user.UserId
                   join branch in _context.Branches on employment.BranchId equals branch.BranchId
                   join rate in _context.EmployeeRates on employment.EmploymentId equals rate.EmploymentId
                   join offer in _context.Offers on employment.OfferId equals offer.OfferId
                   join app in _context.Applications on offer.ApplicationId equals app.ApplicationId
                   join job in _context.JobPosts on app.JobPostId equals job.JobPostId
                   where rate.EffectiveTo == null
                   select new EmploymentResponse
                   {
                       EmploymentId = employment.EmploymentId,
                       EmployerId = employment.EmployerId,
                       EmployeeUserId = employment.EmployeeUserId,
                       BranchId = employment.BranchId,
                       BranchName = branch.Name,
                       OfferId = employment.OfferId,
                       EmployeeName = user.FullName,
                       EmployeeEmail = user.Email,
                       Position = employment.Position,
                       Status = employment.Status,
                       StartDate = employment.StartDate,
                       EndDate = employment.EndDate,
                       CurrentHourlyRate = rate.HourlyRate,
                       JobPostId = job.JobPostId,
                       JobTitle = job.Title,
                       ExpectedShifts = employment.ExpectedShifts,
                       AvatarUrl = user.AvatarUrl
                   };
        }

        private async Task<EmploymentResponse?> GetEmploymentResponseAsync(int employmentId)
        {
            return await BuildEmploymentQuery().FirstOrDefaultAsync(e => e.EmploymentId == employmentId);
        }

        private IQueryable<WorkShiftResponse> BuildShiftBaseQuery()
        {
            return from shift in _context.WorkShifts
                   join branch in _context.Branches on shift.BranchId equals branch.BranchId
                   join registrationWindow in _context.ShiftRegistrationWindows on shift.RegistrationWindowId equals registrationWindow.ShiftRegistrationWindowId into registrationWindows
                   from registrationWindow in registrationWindows.DefaultIfEmpty()
                   select new WorkShiftResponse
                   {
                       WorkShiftId = shift.WorkShiftId,
                       EmployerId = shift.EmployerId,
                       BranchId = shift.BranchId,
                       RegistrationWindowId = shift.RegistrationWindowId,
                       RegistrationWindowStatus = registrationWindow == null ? null : registrationWindow.Status,
                       BranchName = branch.Name,
                       Title = shift.Title,
                       StartTime = shift.StartTime,
                       EndTime = shift.EndTime,
                       RequiredRole = shift.RequiredRole,
                       RequiredPeople = shift.RequiredPeople,
                       Status = shift.Status
                   };
        }

        private static void ApplyAssignmentSchedulingReasons(IEnumerable<ShiftAssignmentResponse> assignments)
        {
            foreach (var assignment in assignments)
            {
                assignment.SchedulingReason = assignment.AssignmentSource switch
                {
                    "EmployeeRegistration" when assignment.Status == "Preferred" =>
                        "Bạn đã đăng ký ca này; hệ thống sẽ ưu tiên người gửi sớm, kiểm tra không trùng lịch và cân bằng số ca.",
                    "EmployeeRegistration" =>
                        "Hệ thống đã chốt ca này từ lượt đăng ký hợp lệ của bạn.",
                    "AutoAssign" =>
                        "Được xếp bù vì ca còn thiếu người; hệ thống đã kiểm tra không trùng lịch và cân bằng số ca.",
                    "EmployerAssign" =>
                        "Được quản lý phân công thủ công.",
                    "ShiftPass" =>
                        "Được xếp vì bạn đã nhận ca từ đồng nghiệp.",
                    _ when assignment.Status == "Transferred" =>
                        "Ca này đã được chuyển cho nhân viên khác.",
                    _ => "Phân công hợp lệ theo ràng buộc lịch làm việc."
                };
            }
        }

        private static void ApplyShiftFillMetadata(IEnumerable<WorkShiftResponse> shifts)
        {
            foreach (var shift in shifts)
            {
                var activeCount = shift.Assignments.Count(a => ActiveAssignmentStatuses.Contains(a.Status));
                var preferredCount = shift.Assignments.Count(a => a.Status == "Preferred");
                shift.AssignedCount = activeCount;
                shift.MissingCount = Math.Max(0, shift.RequiredPeople - activeCount);

                if (shift.MissingCount == 0)
                {
                    shift.FillStatus = FillStatusFull;
                    shift.SchedulingNote = "Ca đã đủ nhân sự.";
                    continue;
                }

                if (preferredCount > 0 ||
                    (shift.RegistrationWindowId.HasValue && shift.RegistrationWindowStatus != "Finalized"))
                {
                    shift.FillStatus = FillStatusOpen;
                    shift.SchedulingNote = preferredCount > 0
                        ? $"Đang có {preferredCount} lượt đăng ký rảnh; hệ thống sẽ ưu tiên người đăng ký sớm, ca cố định và không trùng lịch khi chốt."
                        : "Ca đang trong giai đoạn mở đăng ký/chờ chốt lịch.";
                    continue;
                }

                shift.FillStatus = FillStatusUnderstaffed;
                shift.SchedulingNote = $"Ca còn thiếu {shift.MissingCount} nhân viên. Gợi ý: mở tuyển thêm, kêu gọi đăng ký thêm hoặc phân công thủ công.";
            }
        }

        private async Task AttachAssignmentsAsync(List<WorkShiftResponse> shifts, int? employeeUserId = null)
        {
            var shiftIds = shifts.Select(s => s.WorkShiftId).ToList();
            var assignments = await (from assignment in _context.ShiftAssignments
                                     join user in _context.Users on assignment.EmployeeUserId equals user.UserId
                                     join attendanceRecord in _context.AttendanceRecords on assignment.ShiftAssignmentId equals attendanceRecord.ShiftAssignmentId into attendanceRecords
                                     from attendance in attendanceRecords.DefaultIfEmpty()
                                     where shiftIds.Contains(assignment.WorkShiftId)
                                           && (!employeeUserId.HasValue || assignment.EmployeeUserId == employeeUserId.Value)
                                     select new ShiftAssignmentResponse
                                     {
                                         ShiftAssignmentId = assignment.ShiftAssignmentId,
                                         WorkShiftId = assignment.WorkShiftId,
                                         EmploymentId = assignment.EmploymentId,
                                         EmployeeUserId = assignment.EmployeeUserId,
                                         EmployeeName = user.FullName,
                                         Status = assignment.Status,
                                         IsFixed = assignment.IsFixed,
                                         AssignmentSource = assignment.AssignmentSource,
                                         AssignedAt = assignment.AssignedAt,
                                         EditCount = assignment.TransferredFromAssignmentId ?? 0,
                                         AttendanceRecordId = attendance == null ? null : (int?)attendance.AttendanceRecordId,
                                         AttendanceStatus = attendance == null ? null : attendance.Status,
                                         CheckInAt = attendance == null ? null : attendance.CheckInAt,
                                         CheckOutAt = attendance == null ? null : attendance.CheckOutAt,
                                         WorkedMinutes = attendance == null ? 0 : attendance.WorkedMinutes
                                     })
                .ToListAsync();

            foreach (var shift in shifts)
            {
                shift.Assignments = assignments.Where(a => a.WorkShiftId == shift.WorkShiftId).ToList();
            }
            ApplyAssignmentSchedulingReasons(assignments);
            ApplyShiftFillMetadata(shifts);
        }

        private async Task<WorkShiftResponse?> GetShiftResponseAsync(int workShiftId)
        {
            var shift = await BuildShiftBaseQuery().FirstOrDefaultAsync(s => s.WorkShiftId == workShiftId);
            if (shift == null) return null;
            await AttachAssignmentsAsync(new List<WorkShiftResponse> { shift });
            return shift;
        }

        private async Task<ShiftAssignmentResponse?> GetAssignmentResponseAsync(int assignmentId)
        {
            var response = await (from assignment in _context.ShiftAssignments
                                  join user in _context.Users on assignment.EmployeeUserId equals user.UserId
                                  join attendanceRecord in _context.AttendanceRecords on assignment.ShiftAssignmentId equals attendanceRecord.ShiftAssignmentId into attendanceRecords
                                  from attendance in attendanceRecords.DefaultIfEmpty()
                                  where assignment.ShiftAssignmentId == assignmentId
                                  select new ShiftAssignmentResponse
                                  {
                                      ShiftAssignmentId = assignment.ShiftAssignmentId,
                                      WorkShiftId = assignment.WorkShiftId,
                                      EmploymentId = assignment.EmploymentId,
                                      EmployeeUserId = assignment.EmployeeUserId,
                                      EmployeeName = user.FullName,
                                      Status = assignment.Status,
                                      IsFixed = assignment.IsFixed,
                                      AssignmentSource = assignment.AssignmentSource,
                                      AssignedAt = assignment.AssignedAt,
                                      EditCount = assignment.TransferredFromAssignmentId ?? 0,
                                      AttendanceRecordId = attendance == null ? null : (int?)attendance.AttendanceRecordId,
                                      AttendanceStatus = attendance == null ? null : attendance.Status,
                                      CheckInAt = attendance == null ? null : attendance.CheckInAt,
                                      CheckOutAt = attendance == null ? null : attendance.CheckOutAt,
                                      WorkedMinutes = attendance == null ? 0 : attendance.WorkedMinutes
                                  })
                .FirstOrDefaultAsync();

            if (response != null) ApplyAssignmentSchedulingReasons(new[] { response });
            return response;
        }

        private async Task<AttendanceResponse?> GetAttendanceResponseAsync(int attendanceRecordId)
        {
            return await (from record in _context.AttendanceRecords
                          join user in _context.Users on record.EmployeeUserId equals user.UserId
                          where record.AttendanceRecordId == attendanceRecordId
                          select new AttendanceResponse
                          {
                              AttendanceRecordId = record.AttendanceRecordId,
                              ShiftAssignmentId = record.ShiftAssignmentId,
                              EmployeeUserId = record.EmployeeUserId,
                              EmployeeName = user.FullName,
                              CheckInAt = record.CheckInAt,
                              CheckOutAt = record.CheckOutAt,
                              WorkedMinutes = record.WorkedMinutes,
                              Status = record.Status,
                              Note = record.Note
                          })
                .FirstOrDefaultAsync();
        }

        private async Task<PayrollPeriodResponse?> GetPayrollPeriodResponseAsync(int periodId, int? employeeUserId = null)
        {
            var period = await _context.PayrollPeriods.FirstOrDefaultAsync(p => p.PayrollPeriodId == periodId);
            if (period == null) return null;

            var items = await (from item in _context.PayrollItems
                               join user in _context.Users on item.EmployeeUserId equals user.UserId
                               where item.PayrollPeriodId == period.PayrollPeriodId
                                     && (!employeeUserId.HasValue || item.EmployeeUserId == employeeUserId.Value)
                               select new PayrollItemResponse
                               {
                                   PayrollItemId = item.PayrollItemId,
                                   EmploymentId = item.EmploymentId,
                                   EmployeeUserId = item.EmployeeUserId,
                                   EmployeeName = user.FullName,
                                   TotalApprovedMinutes = item.TotalApprovedMinutes,
                                   HourlyRateSnapshot = item.HourlyRateSnapshot,
                                   BaseSalary = item.BaseSalary,
                                   Bonus = item.Bonus,
                                   Penalty = item.Penalty,
                                   Deduction = item.Deduction,
                                   FinalSalary = item.FinalSalary,
                                   Status = item.Status
                               })
                .ToListAsync();

            return new PayrollPeriodResponse
            {
                PayrollPeriodId = period.PayrollPeriodId,
                Month = period.Month,
                Year = period.Year,
                Status = period.Status,
                Payday = period.Payday,
                TotalSalary = items.Sum(i => i.FinalSalary),
                Items = items
            };
        }

        private async Task<AttendanceRecord?> GetEmployerAttendanceRecordAsync(int employerId, int attendanceRecordId)
        {
            return await (from record in _context.AttendanceRecords
                          join assignment in _context.ShiftAssignments on record.ShiftAssignmentId equals assignment.ShiftAssignmentId
                          join shift in _context.WorkShifts on assignment.WorkShiftId equals shift.WorkShiftId
                          where record.AttendanceRecordId == attendanceRecordId && shift.EmployerId == employerId
                          select record)
                .FirstOrDefaultAsync();
        }

        private async Task<bool> HasEmployeeOverlapAsync(int employeeUserId, DateTime startTime, DateTime endTime, int excludeWorkShiftId = 0)
        {
            return await (from assignment in _context.ShiftAssignments
                          join shift in _context.WorkShifts on assignment.WorkShiftId equals shift.WorkShiftId
                          where assignment.EmployeeUserId == employeeUserId
                                && ActiveAssignmentStatuses.Contains(assignment.Status)
                                && shift.Status != "Cancelled"
                                && shift.WorkShiftId != excludeWorkShiftId
                                && shift.StartTime < endTime
                                && startTime < shift.EndTime
                          select assignment)
                .AnyAsync();
        }

        private async Task<ShiftRegistrationWindowResponse?> BuildRegistrationWindowResponseAsync(int windowId, int? employeeUserId, bool includeMissingEmployees)
        {
            var window = await (from registrationWindow in _context.ShiftRegistrationWindows
                                join branch in _context.Branches on registrationWindow.BranchId equals branch.BranchId
                                where registrationWindow.ShiftRegistrationWindowId == windowId
                                select new
                                {
                                    Window = registrationWindow,
                                    BranchName = branch.Name
                                })
                .FirstOrDefaultAsync();
            if (window == null) return null;

            var shifts = await BuildShiftBaseQuery()
                .Where(s => s.RegistrationWindowId == windowId)
                .OrderBy(s => s.StartTime)
                .ToListAsync();
            await AttachAssignmentsAsync(shifts);
            ApplyShiftFillMetadata(shifts);

            var userAssignments = employeeUserId.HasValue
                ? shifts.SelectMany(s => s.Assignments)
                    .Where(a => a.EmployeeUserId == employeeUserId.Value && (ActiveAssignmentStatuses.Contains(a.Status) || a.Status == "Preferred"))
                    .ToList()
                : new List<ShiftAssignmentResponse>();
            var registrationEditCount = userAssignments
                .Where(a => a.AssignmentSource == "EmployeeRegistration" || a.Status == "Preferred")
                .Select(a => a.EditCount)
                .DefaultIfEmpty(0)
                .Max();
            var hasRegistrationSelection = userAssignments.Any(a => a.AssignmentSource == "EmployeeRegistration" || a.Status == "Preferred");

            var now = DateTime.Now;
            var status = window.Window.Status == "Open" && now > window.Window.CloseAt ? "Closed" : window.Window.Status;
            var totalAssigned = shifts.Sum(s => s.AssignedCount);
            var totalMissing = shifts.Sum(s => s.MissingCount);
            var response = new ShiftRegistrationWindowResponse
            {
                ShiftRegistrationWindowId = window.Window.ShiftRegistrationWindowId,
                EmployerId = window.Window.EmployerId,
                BranchId = window.Window.BranchId,
                BranchName = window.BranchName,
                WeekStartDate = window.Window.WeekStartDate,
                OpenAt = window.Window.OpenAt,
                CloseAt = window.Window.CloseAt,
                Status = status,
                MinFixedShifts = window.Window.MinFixedShifts,
                PublishedAt = window.Window.PublishedAt,
                FinalizedAt = window.Window.FinalizedAt,
                CanSubmit = window.Window.Status == "Open" && now >= window.Window.OpenAt && now <= window.Window.CloseAt,
                MyFixedCount = userAssignments.Count(a => a.IsFixed),
                MyExtraCount = userAssignments.Count(a => !a.IsFixed),
                MySelectedCount = userAssignments.Count,
                RegistrationEditCount = registrationEditCount,
                RemainingRegistrationEdits = hasRegistrationSelection
                    ? Math.Max(0, MaxRegistrationEdits - registrationEditCount)
                    : MaxRegistrationEdits,
                MaxRegistrationEdits = MaxRegistrationEdits,
                AssignedCount = totalAssigned,
                MissingCount = totalMissing,
                FillStatus = status == "Open" || status == "Closed"
                    ? FillStatusOpen
                    : totalMissing == 0 ? FillStatusFull : FillStatusUnderstaffed,
                SchedulingNote = status == "Open"
                    ? "Đang nhận đăng ký lịch rảnh từ nhân viên."
                    : totalMissing == 0
                        ? "Lịch đã chốt và tất cả ca đều đủ nhân sự."
                        : $"Lịch đã chốt nhưng vẫn còn thiếu {totalMissing} vị trí. Gợi ý: mở tuyển thêm, kêu gọi đăng ký thêm hoặc phân công thủ công.",
                Shifts = shifts
            };

            response.UnderstaffedShifts = shifts
                .Where(s => s.MissingCount > 0 && status == "Finalized")
                .Select(s => new UnderstaffedShiftResponse
                {
                    WorkShiftId = s.WorkShiftId,
                    ShiftTitle = s.Title,
                    BranchName = s.BranchName,
                    StartTime = s.StartTime,
                    EndTime = s.EndTime,
                    RequiredPeople = s.RequiredPeople,
                    AssignedCount = s.AssignedCount,
                    MissingCount = s.MissingCount,
                    SchedulingNote = s.SchedulingNote
                })
                .ToList();

            if (includeMissingEmployees)
            {
                var activeEmployees = await (from employment in _context.Employments
                                             join user in _context.Users on employment.EmployeeUserId equals user.UserId
                                             where employment.EmployerId == window.Window.EmployerId &&
                                                   employment.BranchId == window.Window.BranchId &&
                                                   employment.Status == "Active"
                                             orderby user.FullName
                                             select new
                                             {
                                                 employment.EmploymentId,
                                                 employment.EmployeeUserId,
                                                 user.FullName
                                             })
                    .ToListAsync();

                foreach (var employee in activeEmployees)
                {
                    var fixedCount = shifts.SelectMany(s => s.Assignments)
                        .Count(a => a.EmployeeUserId == employee.EmployeeUserId &&
                                    a.IsFixed &&
                                    (ActiveAssignmentStatuses.Contains(a.Status) || a.Status == "Preferred"));
                    if (fixedCount < window.Window.MinFixedShifts)
                    {
                        response.MissingEmployees.Add(new ShiftRegistrationMissingEmployeeResponse
                        {
                            EmploymentId = employee.EmploymentId,
                            EmployeeUserId = employee.EmployeeUserId,
                            EmployeeName = employee.FullName,
                            FixedCount = fixedCount,
                            MissingCount = window.Window.MinFixedShifts - fixedCount
                        });
                    }
                }
            }

            return response;
        }

        private async Task AutoAssignMissingFixedShiftsAsync(Employment employment, ShiftRegistrationWindow window, List<WorkShift> windowShifts)
        {
            var existingAssignments = await (from assignment in _context.ShiftAssignments
                                             join shift in _context.WorkShifts on assignment.WorkShiftId equals shift.WorkShiftId
                                             where assignment.EmployeeUserId == employment.EmployeeUserId &&
                                                   shift.RegistrationWindowId == window.ShiftRegistrationWindowId &&
                                                   ActiveAssignmentStatuses.Contains(assignment.Status)
                                             select new { assignment, shift })
                .ToListAsync();

            var fixedCount = existingAssignments.Count(x => x.assignment.IsFixed);
            var needed = window.MinFixedShifts - fixedCount;
            if (needed <= 0) return;

            foreach (var shift in windowShifts.OrderBy(s => s.StartTime))
            {
                if (needed <= 0) break;
                if (existingAssignments.Any(x => x.shift.WorkShiftId == shift.WorkShiftId)) continue;
                if (existingAssignments.Any(x => x.shift.StartTime < shift.EndTime && shift.StartTime < x.shift.EndTime)) continue;

                var currentCount = await _context.ShiftAssignments
                    .CountAsync(a => a.WorkShiftId == shift.WorkShiftId && ActiveAssignmentStatuses.Contains(a.Status));
                if (currentCount >= shift.RequiredPeople) continue;

                var assignment = new ShiftAssignment
                {
                    WorkShiftId = shift.WorkShiftId,
                    EmploymentId = employment.EmploymentId,
                    EmployeeUserId = employment.EmployeeUserId,
                    Status = "Assigned",
                    IsFixed = true,
                    AssignmentSource = "AutoAssign",
                    AssignedAt = DateTime.UtcNow
                };

                await _context.ShiftAssignments.AddAsync(assignment);
                existingAssignments.Add(new { assignment, shift });
                needed--;
            }
        }

        private static DateTime GetWeekStart(DateTime value)
        {
            var date = value.Date;
            var diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
            return date.AddDays(-diff);
        }

        private static DateTime NormalizeToLocalDateTime(DateTime value)
        {
            if (value.Kind == DateTimeKind.Utc) return value.ToLocalTime();
            if (value.Kind == DateTimeKind.Local) return value;
            return DateTime.SpecifyKind(value, DateTimeKind.Local);
        }

        private static DateTime ToStoredLocalDateTime(DateTime value)
        {
            var localValue = NormalizeToLocalDateTime(value);
            return DateTime.SpecifyKind(localValue, DateTimeKind.Local).ToUniversalTime();
        }

        private async Task<int> EnsureTemplateShiftsForWindowAsync(int employerId, int branchId, int windowId, DateTime targetWeekStart)
        {
            var timings = (await GetShiftTimingsAsync(employerId)).ToList();
            if (timings.Count == 0) return 0;

            var targetWeekEnd = targetWeekStart.AddDays(7);
            var weekStartStored = ToStoredLocalDateTime(targetWeekStart);
            var weekEndStored = ToStoredLocalDateTime(targetWeekEnd);
            var createdCount = 0;
            var existingShifts = await _context.WorkShifts
                .Where(s => s.EmployerId == employerId &&
                            s.BranchId == branchId &&
                            s.StartTime >= weekStartStored &&
                            s.StartTime < weekEndStored)
                .ToListAsync();

            for (var dayOffset = 0; dayOffset < 7; dayOffset++)
            {
                var shiftDate = targetWeekStart.AddDays(dayOffset);
                foreach (var timing in timings)
                {
                    if (!TimeSpan.TryParse(timing.StartTime, out var startTime) ||
                        !TimeSpan.TryParse(timing.EndTime, out var endTime))
                    {
                        continue;
                    }

                    var title = GetShiftDisplayName(timing.ShiftName);
                    var startAt = ToStoredLocalDateTime(shiftDate.Add(startTime));
                    var endAt = shiftDate.Add(endTime);
                    if (endAt <= shiftDate.Add(startTime)) endAt = endAt.AddDays(1);
                    var endAtStored = ToStoredLocalDateTime(endAt);

                    var existing = existingShifts.FirstOrDefault(s =>
                        s.Title == title &&
                        s.StartTime == startAt &&
                        s.EndTime == endAtStored);

                    if (existing != null)
                    {
                        existing.RegistrationWindowId ??= windowId;
                        existing.Status = string.IsNullOrWhiteSpace(existing.Status) ? "Published" : existing.Status;
                        continue;
                    }

                    var shift = new WorkShift
                    {
                        EmployerId = employerId,
                        BranchId = branchId,
                        RegistrationWindowId = windowId,
                        Title = title,
                        StartTime = startAt,
                        EndTime = endAtStored,
                RequiredRole = "Nhân viên",
                        RequiredPeople = Math.Max(1, timing.RequiredPeople),
                        Status = "Published",
                        CreatedAt = DateTime.UtcNow
                    };

                    await _context.WorkShifts.AddAsync(shift);
                    existingShifts.Add(shift);
                    createdCount++;
                }
            }

            return createdCount;
        }

        private async Task NotifyRegistrationWindowPublishedAsync(int employerId, int branchId, DateTime targetWeekStart, DateTime closeAt)
        {
            var employees = await (from employment in _context.Employments
                                   join user in _context.Users on employment.EmployeeUserId equals user.UserId
                                   where employment.EmployerId == employerId &&
                                         employment.BranchId == branchId &&
                                         employment.Status == "Active" &&
                                         !user.IsDeleted &&
                                         user.Status == "Active"
                                   select new { employment.EmployeeUserId })
                .Distinct()
                .ToListAsync();

            foreach (var employee in employees)
            {
                await _notificationService.CreateNotificationAsync(
                    employee.EmployeeUserId,
                    "Mở đăng ký ca tuần tới",
                    $"Lịch đăng ký ca tuần bắt đầu {targetWeekStart:dd/MM/yyyy} đã được công bố. Bạn có thể chọn ca rảnh đến {closeAt:HH:mm dd/MM/yyyy}; sau khi gửi chỉ được chỉnh sửa tối đa {MaxRegistrationEdits} lần trước khi hệ thống tự động xếp ca."
                );
            }
        }

        private async Task RemoveShiftGraphAsync(IReadOnlyCollection<WorkShift> shifts)
        {
            if (shifts.Count == 0) return;

            var shiftIds = shifts.Select(s => s.WorkShiftId).ToList();

            var passRequests = await _context.ShiftPassRequests
                .Where(r => shiftIds.Contains(r.WorkShiftId))
                .ToListAsync();
            if (passRequests.Any())
            {
                _context.ShiftPassRequests.RemoveRange(passRequests);
            }

            var assignments = await _context.ShiftAssignments
                .Where(a => shiftIds.Contains(a.WorkShiftId))
                .ToListAsync();
            if (assignments.Any())
            {
                var assignmentIds = assignments.Select(a => a.ShiftAssignmentId).ToList();
                var attendanceRecords = await _context.AttendanceRecords
                    .Where(r => assignmentIds.Contains(r.ShiftAssignmentId))
                    .ToListAsync();
                if (attendanceRecords.Any())
                {
                    _context.AttendanceRecords.RemoveRange(attendanceRecords);
                }

                _context.ShiftAssignments.RemoveRange(assignments);
            }

            _context.WorkShifts.RemoveRange(shifts);
        }

        private static bool HasOverlap(List<WorkShift> shifts)
        {
            for (var i = 0; i < shifts.Count; i++)
            {
                for (var j = i + 1; j < shifts.Count; j++)
                {
                    if (shifts[i].StartTime < shifts[j].EndTime && shifts[j].StartTime < shifts[i].EndTime)
                    {
                        return true;
                    }
                }
            }

            return false;
        }

        private static bool IsRoleCompatible(string? requiredRole, string? employeePosition)
        {
            if (string.IsNullOrWhiteSpace(requiredRole)) return true;

            var role = requiredRole.Trim().ToLowerInvariant();
            role = NormalizeScheduleText(role);
            if (role is "staff" or "nhan vien" or "employee" or "any") return true;
            if (string.IsNullOrWhiteSpace(employeePosition)) return true;

            var position = NormalizeScheduleText(employeePosition);
            if (position == role || position.Contains(role) || role.Contains(position)) return true;

            var roleTokens = role.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            return roleTokens.Length > 0 && roleTokens.All(position.Contains);
        }

        private static string NormalizeScheduleText(string value)
        {
            var normalized = value.Trim().ToLowerInvariant()
                .Replace('đ', 'd')
                .Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder(normalized.Length);

            foreach (var ch in normalized)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                {
                    builder.Append(char.IsWhiteSpace(ch) ? ' ' : ch);
                }
            }

            return string.Join(' ', builder.ToString()
                .Normalize(NormalizationForm.FormC)
                .Split(' ', StringSplitOptions.RemoveEmptyEntries));
        }

        private static string GetShiftDisplayName(string shiftName)
        {
            return shiftName switch
            {
                "Morning" or "Ca Sang" or "Ca Sáng" => "Ca sáng",
                "Afternoon" or "Ca Chieu" or "Ca Chiều" => "Ca chiều",
                "Evening" or "Ca Toi" or "Ca Tối" => "Ca tối",
                _ => shiftName
            };
        }

        private static bool HasEmployeeOverlapInMemory(IEnumerable<WorkShiftResponse> shifts, int employeeUserId, DateTime startTime, DateTime endTime, int excludeWorkShiftId)
        {
            return shifts.Any(shift =>
                shift.WorkShiftId != excludeWorkShiftId &&
                shift.Status != "Cancelled" &&
                shift.StartTime < endTime &&
                startTime < shift.EndTime &&
                shift.Assignments.Any(assignment =>
                    assignment.EmployeeUserId == employeeUserId &&
                    ActiveAssignmentStatuses.Contains(assignment.Status)));
        }

        private async Task<PassContext?> GetPassContextAsync(int employeeUserId, int shiftAssignmentId)
        {
            return await (from assignment in _context.ShiftAssignments
                          join shift in _context.WorkShifts on assignment.WorkShiftId equals shift.WorkShiftId
                          join employment in _context.Employments on assignment.EmploymentId equals employment.EmploymentId
                          where assignment.ShiftAssignmentId == shiftAssignmentId
                                && assignment.EmployeeUserId == employeeUserId
                                && ActiveAssignmentStatuses.Contains(assignment.Status)
                          select new PassContext
                          {
                              Assignment = assignment,
                              Shift = shift,
                              Employment = employment
                          })
                .FirstOrDefaultAsync();
        }

        private IQueryable<ShiftPassCandidateResponse> BuildPassCandidatesQuery(int employerId, int branchId, int fromEmployeeUserId, DateTime startTime, DateTime endTime)
        {
            var busyEmployeeIds = from assignment in _context.ShiftAssignments
                                  join shift in _context.WorkShifts on assignment.WorkShiftId equals shift.WorkShiftId
                                  where ActiveAssignmentStatuses.Contains(assignment.Status)
                                        && shift.Status != "Cancelled"
                                        && shift.StartTime < endTime
                                        && startTime < shift.EndTime
                                  select assignment.EmployeeUserId;

            return from employment in _context.Employments
                   join user in _context.Users on employment.EmployeeUserId equals user.UserId
                   join branch in _context.Branches on employment.BranchId equals branch.BranchId
                   join rate in _context.EmployeeRates on employment.EmploymentId equals rate.EmploymentId
                   where employment.EmployerId == employerId
                         && employment.BranchId == branchId
                         && employment.EmployeeUserId != fromEmployeeUserId
                         && employment.Status == "Active"
                         && rate.EffectiveTo == null
                         && !busyEmployeeIds.Contains(employment.EmployeeUserId)
                   orderby user.FullName
                   select new ShiftPassCandidateResponse
                   {
                       EmploymentId = employment.EmploymentId,
                       EmployeeUserId = employment.EmployeeUserId,
                       EmployeeName = user.FullName,
                       Position = employment.Position,
                       BranchName = branch.Name,
                       HourlyRate = rate.HourlyRate
                   };
        }

        private async Task ExpireStaleShiftPassRequestsAsync()
        {
            var now = DateTime.UtcNow;
            var staleRequests = await _context.ShiftPassRequests
                .Where(r => r.Status == "Pending" && r.ExpiresAt <= now)
                .ToListAsync();

            if (staleRequests.Count == 0) return;

            foreach (var request in staleRequests)
            {
                request.Status = "Expired";
                request.RespondedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
        }

        private async Task<List<ShiftPassRequestResponse>> BuildShiftPassResponsesAsync(List<int> requestIds)
        {
            var responses = new List<ShiftPassRequestResponse>();
            foreach (var requestId in requestIds)
            {
                var response = await GetShiftPassRequestResponseAsync(requestId);
                if (response != null) responses.Add(response);
            }

            return responses;
        }

        private async Task<ShiftPassRequestResponse?> GetShiftPassRequestResponseAsync(int requestId)
        {
            return await (from request in _context.ShiftPassRequests
                          join shift in _context.WorkShifts on request.WorkShiftId equals shift.WorkShiftId
                          join branch in _context.Branches on request.BranchId equals branch.BranchId
                          join fromUser in _context.Users on request.FromEmployeeUserId equals fromUser.UserId
                          join toUser in _context.Users on request.ToEmployeeUserId equals toUser.UserId
                          where request.ShiftPassRequestId == requestId
                          select new ShiftPassRequestResponse
                          {
                              ShiftPassRequestId = request.ShiftPassRequestId,
                              ShiftAssignmentId = request.ShiftAssignmentId,
                              WorkShiftId = request.WorkShiftId,
                              ShiftTitle = shift.Title,
                              BranchName = branch.Name,
                              ShiftStartTime = shift.StartTime,
                              ShiftEndTime = shift.EndTime,
                              FromEmployeeUserId = request.FromEmployeeUserId,
                              FromEmployeeName = fromUser.FullName,
                              ToEmployeeUserId = request.ToEmployeeUserId,
                              ToEmployeeName = toUser.FullName,
                              Status = request.Status,
                              RequestedAt = request.RequestedAt,
                              RespondedAt = request.RespondedAt,
                              ExpiresAt = request.ExpiresAt,
                              Reason = request.Reason
                          })
                .FirstOrDefaultAsync();
        }

        public async Task<IEnumerable<EmployerShiftTimingResponse>> GetShiftTimingsAsync(int employerId)
        {
            var timings = await _context.EmployerShiftTimings
                .Where(t => t.EmployerId == employerId && t.IsActive)
                .ToListAsync();

            if (timings.Count == 0)
            {
                return new List<EmployerShiftTimingResponse>
                {
                    new EmployerShiftTimingResponse { EmployerId = employerId, ShiftName = "Ca sáng", StartTime = "08:00", EndTime = "12:00", IsActive = true, RequiredPeople = 1 },
                    new EmployerShiftTimingResponse { EmployerId = employerId, ShiftName = "Ca chiều", StartTime = "13:00", EndTime = "18:00", IsActive = true, RequiredPeople = 1 },
                    new EmployerShiftTimingResponse { EmployerId = employerId, ShiftName = "Ca tối", StartTime = "18:00", EndTime = "22:00", IsActive = true, RequiredPeople = 1 }
                };
            }

            return timings.Select(t => new EmployerShiftTimingResponse
            {
                EmployerShiftTimingId = t.EmployerShiftTimingId,
                EmployerId = t.EmployerId,
                ShiftName = t.ShiftName,
                StartTime = t.StartTime,
                EndTime = t.EndTime,
                RequiredPeople = t.RequiredPeople,
                IsActive = t.IsActive
            });
        }

        public async Task<IEnumerable<EmployerShiftTimingResponse>> SaveShiftTimingsAsync(int employerId, List<SaveEmployerShiftTimingRequest> request)
        {
            var oldTimings = await _context.EmployerShiftTimings
                .Where(t => t.EmployerId == employerId)
                .ToListAsync();
            _context.EmployerShiftTimings.RemoveRange(oldTimings);

            foreach (var r in request)
            {
                if (string.IsNullOrWhiteSpace(r.ShiftName) || string.IsNullOrWhiteSpace(r.StartTime) || string.IsNullOrWhiteSpace(r.EndTime))
                {
                    continue;
                }
                var timing = new EmployerShiftTiming
                {
                    EmployerId = employerId,
                    ShiftName = r.ShiftName.Trim(),
                    StartTime = r.StartTime.Trim(),
                    EndTime = r.EndTime.Trim(),
                    RequiredPeople = r.RequiredPeople > 0 ? r.RequiredPeople : 1,
                    IsActive = true
                };
                await _context.EmployerShiftTimings.AddAsync(timing);
            }

            await _context.SaveChangesAsync();
            return await GetShiftTimingsAsync(employerId);
        }

        public async Task<(ShiftAssignmentResponse? Assignment, string? Error)> ToggleAssignmentFixedStatusAsync(int userId, int assignmentId)
        {
            var assignment = await _context.ShiftAssignments
                .FirstOrDefaultAsync(a => a.ShiftAssignmentId == assignmentId && a.EmployeeUserId == userId);

            if (assignment == null)
            {
                return (null, "Không tìm thấy ca làm của bạn.");
            }

            assignment.IsFixed = !assignment.IsFixed;
            await _context.SaveChangesAsync();

            var response = await GetAssignmentResponseAsync(assignmentId);

            var shift = await _context.WorkShifts.FindAsync(assignment.WorkShiftId);
            if (shift != null)
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _hubNotifier.NotifyWorkforceChangedAsync(shift.EmployerId, userId);
                    }
                    catch { }
                });
            }

            return (response, null);
        }

        public async Task<(bool Success, string Message)> AutoAssignUnregisteredWorkersAsync(int employerId, DateTime runTime)
        {
            if (!await IsVipEmployerAsync(employerId))
            {
                return (false, "Bạn cần đăng ký gói VIP Doanh nghiệp để sử dụng chức năng AI và Tính lương này.");
            }

            int diff = (7 + (runTime.DayOfWeek - DayOfWeek.Monday)) % 7;
            DateTime baseMonday = runTime.AddDays(-diff).Date;

            DateTime targetWeekStart = (runTime.DayOfWeek == DayOfWeek.Saturday || runTime.DayOfWeek == DayOfWeek.Sunday)
                ? baseMonday.AddDays(7)
                : baseMonday;

            DateTime targetWeekEnd = targetWeekStart.AddDays(7);

            var activeEmployments = await _context.Employments
                .Where(e => e.EmployerId == employerId && e.Status == "Active")
                .ToListAsync();

            if (!activeEmployments.Any())
            {
                return (false, "Doanh nghiệp chưa có nhân viên đang hoạt động.");
            }

            int totalAssigned = 0;
            int workersProcessed = 0;

            foreach (var emp in activeEmployments)
            {
                var existingAssignments = await (from assignment in _context.ShiftAssignments
                                                 join shift in _context.WorkShifts on assignment.WorkShiftId equals shift.WorkShiftId
                                                 where assignment.EmployeeUserId == emp.EmployeeUserId
                                                       && ActiveAssignmentStatuses.Contains(assignment.Status)
                                                       && shift.Status != "Cancelled"
                                                       && shift.StartTime >= targetWeekStart
                                                       && shift.StartTime < targetWeekEnd
                                                 select new { assignment, shift })
                                                 .ToListAsync();

                int fixedCount = existingAssignments.Count(x => x.assignment.IsFixed);

                if (fixedCount < 3)
                {
                    workersProcessed++;
                    int currentTotalAssignments = existingAssignments.Count;
                    int needed = 3 - currentTotalAssignments;
                    if (needed <= 0)
                    {
                        continue;
                    }

                    var candidateShifts = await _context.WorkShifts
                        .Where(s => s.EmployerId == employerId
                                    && s.BranchId == emp.BranchId
                                    && s.Status == "Published"
                                    && s.StartTime >= targetWeekStart
                                    && s.StartTime < targetWeekEnd)
                        .OrderBy(s => s.StartTime)
                        .ToListAsync();

                    int assignedThisWorker = 0;
                    foreach (var shift in candidateShifts)
                    {
                        if (needed <= 0) break;

                        int assignedCount = await _context.ShiftAssignments
                            .CountAsync(a => a.WorkShiftId == shift.WorkShiftId && ActiveAssignmentStatuses.Contains(a.Status));

                        if (assignedCount >= shift.RequiredPeople)
                        {
                            continue;
                        }

                        bool alreadyAssigned = existingAssignments.Any(x => x.shift.WorkShiftId == shift.WorkShiftId);
                        if (alreadyAssigned)
                        {
                            continue;
                        }

                        bool hasOverlap = existingAssignments.Any(x =>
                            x.shift.StartTime < shift.EndTime && shift.StartTime < x.shift.EndTime);

                        if (hasOverlap)
                        {
                            continue;
                        }

                        var assignment = new ShiftAssignment
                        {
                            WorkShiftId = shift.WorkShiftId,
                            EmploymentId = emp.EmploymentId,
                            EmployeeUserId = emp.EmployeeUserId,
                            Status = "Assigned",
                            IsFixed = true,
                            AssignmentSource = "AutoAssign",
                            AssignedAt = DateTime.UtcNow
                        };

                        await _context.ShiftAssignments.AddAsync(assignment);

                        existingAssignments.Add(new { assignment, shift });

                        needed--;
                        assignedThisWorker++;
                        totalAssigned++;
                    }

                    if (assignedThisWorker > 0)
                    {
                        await _notificationService.CreateNotificationAsync(
                            emp.EmployeeUserId,
                            "Tự động xếp ca",
                            $"Bạn đã được tự động xếp {assignedThisWorker} ca cho tuần bắt đầu {targetWeekStart:dd/MM/yyyy} vì chưa đăng ký đủ số ca cố định tối thiểu."
                        );

                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                await _hubNotifier.NotifyWorkforceChangedAsync(employerId, emp.EmployeeUserId);
                            }
                            catch { }
                        });
                    }
                }
            }

            if (totalAssigned > 0)
            {
                await _context.SaveChangesAsync();

                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _hubNotifier.NotifyWorkforceChangedAsync(employerId, 0);
                    }
                    catch { }
                });
            }

            return (true, $"Đã xử lý {workersProcessed} nhân viên chưa đăng ký và tự xếp {totalAssigned} ca cho tuần bắt đầu {targetWeekStart:dd/MM/yyyy}.");
        }

        public async Task<(bool Success, string? Error)> DeleteShiftAsync(int employerId, int workShiftId)
        {
            var shift = await _context.WorkShifts
                .FirstOrDefaultAsync(s => s.WorkShiftId == workShiftId && s.EmployerId == employerId);
            if (shift == null)
            {
                return (false, "Không tìm thấy ca làm hoặc bạn không có quyền thao tác.");
            }

            var passRequests = await _context.ShiftPassRequests
                .Where(r => r.WorkShiftId == workShiftId)
                .ToListAsync();
            if (passRequests.Any())
            {
                _context.ShiftPassRequests.RemoveRange(passRequests);
            }

            var assignments = await _context.ShiftAssignments
                .Where(a => a.WorkShiftId == workShiftId)
                .ToListAsync();
            if (assignments.Any())
            {
                var assignmentIds = assignments.Select(a => a.ShiftAssignmentId).ToList();
                var attendanceRecords = await _context.AttendanceRecords
                    .Where(r => assignmentIds.Contains(r.ShiftAssignmentId))
                    .ToListAsync();
                if (attendanceRecords.Any())
                {
                    _context.AttendanceRecords.RemoveRange(attendanceRecords);
                }

                _context.ShiftAssignments.RemoveRange(assignments);
            }

            _context.WorkShifts.Remove(shift);
            await _context.SaveChangesAsync();

            _ = Task.Run(async () =>
            {
                try
                {
                    await _hubNotifier.NotifyWorkforceChangedAsync(employerId, 0);
                }
                catch { }
            });

            return (true, null);
        }

        public async Task<(int DeletedCount, string? Error)> DeleteShiftsByWeekAsync(int employerId, DeleteWorkShiftsByWeekRequest request)
        {
            var weekStartLocal = GetWeekStart(NormalizeToLocalDateTime(request.WeekStartDate == default ? DateTime.Now : request.WeekStartDate));
            var weekEndLocal = weekStartLocal.AddDays(7);
            var weekStart = ToStoredLocalDateTime(weekStartLocal);
            var weekEnd = ToStoredLocalDateTime(weekEndLocal);

            var requestedBranchId = request.BranchId.GetValueOrDefault();
            if (requestedBranchId > 0)
            {
                var branchExists = await _context.Branches
                    .AnyAsync(b => b.BranchId == requestedBranchId && b.EmployerId == employerId && b.IsActive);
                if (!branchExists)
                {
                    return (0, "Không tìm thấy chi nhánh hoặc chi nhánh đã ngừng hoạt động.");
                }
            }

            var query = _context.WorkShifts
                .Where(s => s.EmployerId == employerId &&
                            s.StartTime >= weekStart &&
                            s.StartTime < weekEnd);

            if (requestedBranchId > 0)
            {
                query = query.Where(s => s.BranchId == requestedBranchId);
            }

            var shifts = await query.ToListAsync();
            if (shifts.Count == 0)
            {
                return (0, null);
            }

            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            await RemoveShiftGraphAsync(shifts);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            _ = Task.Run(async () =>
            {
                try
                {
                    await _hubNotifier.NotifyWorkforceChangedAsync(employerId, 0);
                }
                catch { }
            });

            return (shifts.Count, null);
        }

        public async Task<(AutoScheduleBatchResponse? Result, string? Error)> AutoScheduleBatchAsync(int employerId, AutoScheduleBatchRequest request)
        {
            if (!await IsVipEmployerAsync(employerId))
            {
                return (null, "Bạn cần đăng ký gói VIP Doanh nghiệp để sử dụng chức năng AI và Tính lương này.");
            }

            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                var targetWeekStart = GetWeekStart(request.WeekStartDate == default ? DateTime.Now : request.WeekStartDate);
                var targetWeekEnd = targetWeekStart.AddDays(7);

                var requestedBranchId = request.BranchId.GetValueOrDefault();
                var branchQuery = _context.Branches
                    .Where(b => b.EmployerId == employerId && b.IsActive);

                if (requestedBranchId > 0)
                {
                    branchQuery = branchQuery.Where(b => b.BranchId == requestedBranchId);
                }

                var targetBranches = await branchQuery
                    .OrderBy(b => b.Name)
                    .ToListAsync();

                if (requestedBranchId > 0 && targetBranches.Count == 0)
                {
                    return (null, "Chi nhánh không tồn tại hoặc đã ngừng hoạt động.");
                }

                if (targetBranches.Count == 0)
                {
                    return (null, "Doanh nghiệp chưa có chi nhánh hoạt động để AI xếp ca.");
                }

                var targetBranchIds = targetBranches.Select(b => b.BranchId).ToList();

                var shifts = await _context.WorkShifts
                    .Where(s => s.EmployerId == employerId &&
                                targetBranchIds.Contains(s.BranchId) &&
                                s.StartTime >= targetWeekStart &&
                                s.StartTime < targetWeekEnd &&
                                s.Status == "Published")
                    .OrderBy(s => s.BranchId)
                    .ThenBy(s => s.StartTime)
                    .ToListAsync();
                var shiftIds = shifts.Select(s => s.WorkShiftId).ToList();
                if (shiftIds.Count == 0)
                {
                    await transaction.CommitAsync();
                    return (new AutoScheduleBatchResponse
                    {
                        Message = requestedBranchId > 0
                            ? "Chi nhánh này không có ca đã công bố trong tuần cần xếp."
                            : "Không có ca đã công bố trong tuần cần xếp ở các chi nhánh.",
                        BranchesProcessed = 0,
                        ShiftsProcessed = 0,
                        NewAssignments = 0,
                        RemainingOpenSlots = 0
                    }, null);
                }

                targetBranchIds = shifts.Select(s => s.BranchId).Distinct().ToList();
                var branchNameMap = targetBranches.ToDictionary(b => b.BranchId, b => b.Name);

                var activeEmployments = await _context.Employments
                    .Where(e => targetBranchIds.Contains(e.BranchId) && e.EmployerId == employerId && e.Status == "Active")
                    .OrderBy(e => e.BranchId)
                    .ThenBy(e => e.EmploymentId)
                    .ToListAsync();

                if (!activeEmployments.Any())
                {
                    return (null, requestedBranchId > 0
                        ? "Chi nhánh này không có nhân viên hoạt động nào để phân bổ."
                        : "Các chi nhánh có ca trong tuần này chưa có nhân viên hoạt động để phân bổ.");
                }

                var employeeUserIds = activeEmployments.Select(e => e.EmployeeUserId).Distinct().ToList();

                // Load all already assigned / finalized assignments in this week, across branches,
                // so an employee is never double-booked when a business has multiple stores.
                var activeAssignments = await (from assignment in _context.ShiftAssignments
                                               join s in _context.WorkShifts on assignment.WorkShiftId equals s.WorkShiftId
                                               where employeeUserIds.Contains(assignment.EmployeeUserId) &&
                                                     s.EmployerId == employerId &&
                                                      s.StartTime >= targetWeekStart && s.StartTime < targetWeekEnd &&
                                                      ActiveAssignmentStatuses.Contains(assignment.Status)
                                               select new { assignment, s })
                    .ToListAsync();

                // Load all Preferred registrations for these shifts
                var preferredAssignments = await _context.ShiftAssignments
                    .Where(a => shiftIds.Contains(a.WorkShiftId) && a.Status == "Preferred")
                    .ToListAsync();

                int newlyAssignedCount = 0;
                var branchSummaries = targetBranchIds
                    .Select(branchId => new AutoScheduleBranchSummary
                    {
                        BranchId = branchId,
                        BranchName = branchNameMap.TryGetValue(branchId, out var branchName) ? branchName : $"Branch {branchId}"
                    })
                    .ToDictionary(summary => summary.BranchId);

                var shiftsByRegistrationPriority = shifts
                    .OrderBy(s => activeEmployments.Count(emp =>
                        emp.BranchId == s.BranchId &&
                        IsRoleCompatible(s.RequiredRole, emp.Position) &&
                        !activeAssignments.Any(x =>
                            x.assignment.EmployeeUserId == emp.EmployeeUserId &&
                            x.s.StartTime < s.EndTime &&
                            s.StartTime < x.s.EndTime)))
                    .ThenBy(s => preferredAssignments.Any(a => a.WorkShiftId == s.WorkShiftId) ? 0 : 1)
                    .ThenBy(s => preferredAssignments.Count(a => a.WorkShiftId == s.WorkShiftId))
                    .ThenByDescending(s => s.RequiredPeople - activeAssignments.Count(x => x.s.WorkShiftId == s.WorkShiftId))
                    .ThenBy(s => s.BranchId)
                    .ThenBy(s => s.StartTime)
                    .ToList();

                foreach (var shift in shiftsByRegistrationPriority)
                {
                    var currentlyAssigned = activeAssignments.Count(x => x.s.WorkShiftId == shift.WorkShiftId);
                    var remainingSlots = shift.RequiredPeople - currentlyAssigned;

                    while (remainingSlots > 0)
                    {
                        var eligibleCandidates = new List<(Employment Employee, ShiftAssignment? PreferredAssignment, int AssignedCount)>();

                        foreach (var emp in activeEmployments)
                        {
                            if (emp.BranchId != shift.BranchId) continue;

                            // 1. Check if already assigned to this shift
                            bool isAlreadyAssigned = activeAssignments.Any(x => x.s.WorkShiftId == shift.WorkShiftId && x.assignment.EmployeeUserId == emp.EmployeeUserId);
                            if (isAlreadyAssigned) continue;

                            // 2. Check overlap
                            bool hasOverlap = activeAssignments.Any(x => x.assignment.EmployeeUserId == emp.EmployeeUserId && x.s.StartTime < shift.EndTime && shift.StartTime < x.s.EndTime);
                            if (hasOverlap) continue;

                            // 3. Position verification
                            if (!IsRoleCompatible(shift.RequiredRole, emp.Position)) continue;

                            var preferredAssignment = preferredAssignments
                                .Where(a => a.WorkShiftId == shift.WorkShiftId && a.EmployeeUserId == emp.EmployeeUserId)
                                .OrderByDescending(a => a.IsFixed)
                                .ThenBy(a => a.AssignedAt)
                                .FirstOrDefault();

                            int assignedCount = activeAssignments.Count(x => x.assignment.EmployeeUserId == emp.EmployeeUserId);
                            eligibleCandidates.Add((emp, preferredAssignment, assignedCount));
                        }

                        if (!eligibleCandidates.Any()) break;

                        // Take the best candidate: registered availability first, earlier registrations first,
                        // then fewer assigned shifts to keep the schedule fair.
                        var best = eligibleCandidates
                            .OrderBy(c => c.PreferredAssignment == null ? 1 : 0)
                            .ThenBy(c => c.PreferredAssignment?.IsFixed == true ? 0 : 1)
                            .ThenBy(c => c.PreferredAssignment?.AssignedAt ?? DateTime.MaxValue)
                            .ThenBy(c => c.AssignedCount)
                            .ThenBy(c => c.Employee.EmploymentId)
                            .First();
                        var selectedEmp = best.Employee;

                        ShiftAssignment selectedAssignment;
                        if (best.PreferredAssignment != null)
                        {
                            selectedAssignment = best.PreferredAssignment;
                            selectedAssignment.Status = "Assigned";
                        }
                        else
                        {
                            selectedAssignment = new ShiftAssignment
                            {
                                WorkShiftId = shift.WorkShiftId,
                                EmploymentId = selectedEmp.EmploymentId,
                                EmployeeUserId = selectedEmp.EmployeeUserId,
                                Status = "Assigned",
                                IsFixed = false,
                                AssignmentSource = "AutoAssign",
                                AssignedAt = DateTime.UtcNow
                            };
                            await _context.ShiftAssignments.AddAsync(selectedAssignment);
                        }

                        activeAssignments.Add(new { assignment = selectedAssignment, s = shift });
                        if (branchSummaries.TryGetValue(shift.BranchId, out var summary))
                        {
                            summary.NewAssignments++;
                        }
                        remainingSlots--;
                        newlyAssignedCount++;
                    }
                }

                // If any registrations were preferred but not finalized, let's clean them up to avoid cluttering DB
                var preferredToRemove = preferredAssignments
                    .Where(a => a.Status == "Preferred")
                    .ToList();
                if (preferredToRemove.Any())
                {
                    _context.ShiftAssignments.RemoveRange(preferredToRemove);
                }

                foreach (var shift in shifts)
                {
                    if (!branchSummaries.TryGetValue(shift.BranchId, out var summary)) continue;

                    var assignedSlots = activeAssignments.Count(x => x.s.WorkShiftId == shift.WorkShiftId);
                    summary.ShiftsProcessed++;
                    summary.RequiredSlots += shift.RequiredPeople;
                    summary.AssignedSlots += assignedSlots;
                    summary.RemainingOpenSlots += Math.Max(0, shift.RequiredPeople - assignedSlots);
                }

                var response = new AutoScheduleBatchResponse
                {
                    BranchesProcessed = branchSummaries.Values.Count(s => s.ShiftsProcessed > 0),
                    ShiftsProcessed = shifts.Count,
                    NewAssignments = newlyAssignedCount,
                    RemainingOpenSlots = branchSummaries.Values.Sum(s => s.RemainingOpenSlots),
                    Branches = branchSummaries.Values
                        .Where(s => s.ShiftsProcessed > 0)
                        .OrderBy(s => s.BranchName)
                        .ToList()
                };
                response.Message = requestedBranchId > 0
                    ? $"AI đã xếp lịch cho chi nhánh {response.Branches.FirstOrDefault()?.BranchName ?? requestedBranchId.ToString()}: thêm {response.NewAssignments} phân công, còn thiếu {response.RemainingOpenSlots} vị trí."
                    : $"AI đã tự phát hiện {response.BranchesProcessed} chi nhánh có ca trong tuần và xếp thêm {response.NewAssignments} phân công, còn thiếu {response.RemainingOpenSlots} vị trí.";

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _hubNotifier.NotifyWorkforceChangedAsync(employerId, 0);
                    }
                    catch { }
                });

                return (response, null);
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                return (null, "Không thể tự động xếp ca. Vui lòng kiểm tra ca làm, chi nhánh và nhân viên rồi thử lại.");
            }
        }

        private static string ToVietnameseEmploymentStatus(string? status)
        {
            return status?.Trim().ToLowerInvariant() switch
            {
                "active" => "Đang hoạt động",
                "inactive" => "Tạm ngưng",
                "ended" => "Đã kết thúc",
                _ => string.IsNullOrWhiteSpace(status) ? "Không rõ" : status
            };
        }

        private sealed class PassContext
        {
            public ShiftAssignment Assignment { get; set; } = null!;
            public WorkShift Shift { get; set; } = null!;
            public Employment Employment { get; set; } = null!;
        }
    }
}

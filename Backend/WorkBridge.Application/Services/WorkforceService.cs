using Microsoft.EntityFrameworkCore;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Interfaces;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public class WorkforceService : IWorkforceService
    {
        private readonly IWorkBridgeContext _context;
        private readonly INotificationService _notificationService;
        private static readonly string[] ActiveAssignmentStatuses = { "Assigned", "InProgress", "Completed" };

        public WorkforceService(IWorkBridgeContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<IEnumerable<EmploymentResponse>> GetEmployerEmployeesAsync(int employerId)
        {
            return await BuildEmploymentQuery()
                .Where(e => e.EmployerId == employerId)
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
            if (!allowedStatuses.Contains(status)) return (null, "Status must be Active, Inactive or Ended.");

            var employment = await _context.Employments
                .FirstOrDefaultAsync(e => e.EmploymentId == employmentId && e.EmployerId == employerId);
            if (employment == null) return (null, "Employment not found.");

            employment.Status = status!;
            employment.EndDate = status == "Active" ? null : DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                employment.EmployeeUserId,
                "Employment Updated",
                $"Your employment status was changed to {status}."
            );

            return (await GetEmploymentResponseAsync(employment.EmploymentId), null);
        }

        public async Task<(EmploymentResponse? Employment, string? Error)> UpdateEmployeeRateAsync(int employerId, int employmentId, UpdateEmployeeRateRequest request)
        {
            if (request.HourlyRate <= 0) return (null, "Hourly rate must be greater than 0.");

            var employment = await _context.Employments
                .FirstOrDefaultAsync(e => e.EmploymentId == employmentId && e.EmployerId == employerId);
            if (employment == null) return (null, "Employment not found.");
            if (employment.Status != "Active") return (null, "Only active employees can receive a new rate.");

            var effectiveFrom = request.EffectiveFrom == default ? DateTime.Today : request.EffectiveFrom.Date;
            var currentRate = await _context.EmployeeRates
                .Where(r => r.EmploymentId == employmentId && r.EffectiveTo == null)
                .OrderByDescending(r => r.EffectiveFrom)
                .FirstOrDefaultAsync();

            if (currentRate != null)
            {
                if (effectiveFrom <= currentRate.EffectiveFrom)
                {
                    return (null, "New rate effective date must be after the current rate start date.");
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
                "Pay Rate Updated",
                $"Your hourly rate was updated to {request.HourlyRate:N0} VND/hour."
            );

            return (await GetEmploymentResponseAsync(employment.EmploymentId), null);
        }

        public async Task<(WorkShiftResponse? Shift, string? Error)> CreateShiftAsync(int employerId, CreateWorkShiftRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title)) return (null, "Shift title is required.");
            if (request.EndTime <= request.StartTime) return (null, "Shift end time must be after start time.");
            if (request.RequiredPeople < 1) return (null, "Required people must be at least 1.");

            var branch = await _context.Branches
                .FirstOrDefaultAsync(b => b.BranchId == request.BranchId && b.EmployerId == employerId && b.IsActive);
            if (branch == null) return (null, "Branch not found or inactive.");

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

            await AttachAssignmentsAsync(shifts, employeeUserId);
            return shifts;
        }

        public async Task<(ShiftAssignmentResponse? Assignment, string? Error)> AssignShiftAsync(int employerId, int workShiftId, AssignShiftRequest request)
        {
            var shift = await _context.WorkShifts.FirstOrDefaultAsync(s => s.WorkShiftId == workShiftId && s.EmployerId == employerId);
            if (shift == null) return (null, "Shift not found.");
            if (shift.Status == "Cancelled") return (null, "Cannot assign a cancelled shift.");

            var employment = await _context.Employments
                .FirstOrDefaultAsync(e => e.EmploymentId == request.EmploymentId && e.EmployerId == employerId && e.Status == "Active");
            if (employment == null) return (null, "Employment not found or inactive.");
            if (employment.BranchId != shift.BranchId) return (null, "Employee must belong to the same branch as the shift.");

            var alreadyAssigned = await _context.ShiftAssignments.AnyAsync(a =>
                a.WorkShiftId == workShiftId &&
                a.EmploymentId == employment.EmploymentId &&
                ActiveAssignmentStatuses.Contains(a.Status));
            if (alreadyAssigned) return (null, "Employee is already assigned to this shift.");

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
            if (hasOverlap) return (null, "Employee already has another shift in this time range.");

            var currentCount = await _context.ShiftAssignments
                .CountAsync(a => a.WorkShiftId == workShiftId && ActiveAssignmentStatuses.Contains(a.Status));
            if (currentCount >= shift.RequiredPeople) return (null, "Shift already has enough assigned employees.");

            var newAssignment = new ShiftAssignment
            {
                WorkShiftId = shift.WorkShiftId,
                EmploymentId = employment.EmploymentId,
                EmployeeUserId = employment.EmployeeUserId,
                Status = "Assigned",
                AssignedAt = DateTime.UtcNow
            };

            await _context.ShiftAssignments.AddAsync(newAssignment);
            await _context.SaveChangesAsync();

            return (await GetAssignmentResponseAsync(newAssignment.ShiftAssignmentId), null);
        }

        public async Task<(AttendanceResponse? Attendance, string? Error)> CheckInAsync(int employeeUserId, int shiftAssignmentId)
        {
            var assignment = await _context.ShiftAssignments
                .FirstOrDefaultAsync(a => a.ShiftAssignmentId == shiftAssignmentId && a.EmployeeUserId == employeeUserId && ActiveAssignmentStatuses.Contains(a.Status));
            if (assignment == null) return (null, "Shift assignment not found.");

            var existing = await _context.AttendanceRecords
                .FirstOrDefaultAsync(a => a.ShiftAssignmentId == shiftAssignmentId);
            if (existing?.CheckInAt != null) return (null, "Already checked in.");

            var attendance = existing ?? new AttendanceRecord
            {
                ShiftAssignmentId = shiftAssignmentId,
                EmployeeUserId = employeeUserId,
                Status = "NotStarted"
            };

            attendance.CheckInAt = DateTime.UtcNow;
            attendance.Status = "CheckedIn";

            if (existing == null) await _context.AttendanceRecords.AddAsync(attendance);
            assignment.Status = "InProgress";
            await _context.SaveChangesAsync();

            return (await GetAttendanceResponseAsync(attendance.AttendanceRecordId), null);
        }

        public async Task<(AttendanceResponse? Attendance, string? Error)> CheckOutAsync(int employeeUserId, int shiftAssignmentId)
        {
            var attendance = await _context.AttendanceRecords
                .FirstOrDefaultAsync(a => a.ShiftAssignmentId == shiftAssignmentId && a.EmployeeUserId == employeeUserId);
            if (attendance == null || attendance.CheckInAt == null) return (null, "You must check in first.");
            if (attendance.CheckOutAt != null) return (null, "Already checked out.");

            attendance.CheckOutAt = DateTime.UtcNow;
            attendance.WorkedMinutes = Math.Max(0, (int)Math.Round((attendance.CheckOutAt.Value - attendance.CheckInAt.Value).TotalMinutes));
            attendance.Status = "CheckedOut";

            var assignment = await _context.ShiftAssignments.FindAsync(shiftAssignmentId);
            if (assignment != null) assignment.Status = "Completed";

            await _context.SaveChangesAsync();
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

            if (attendance == null) return (null, "Attendance record not found.");
            if (attendance.CheckOutAt == null) return (null, "Cannot approve before check-out.");

            attendance.Status = "Approved";
            attendance.ApprovedByEmployerId = employerId;
            attendance.ApprovedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return (await GetAttendanceResponseAsync(attendance.AttendanceRecordId), null);
        }

        public async Task<(AttendanceResponse? Attendance, string? Error)> RejectAttendanceAsync(int employerId, int attendanceRecordId, string? note)
        {
            var attendance = await GetEmployerAttendanceRecordAsync(employerId, attendanceRecordId);
            if (attendance == null) return (null, "Attendance record not found.");
            if (attendance.CheckOutAt == null) return (null, "Cannot reject before check-out.");

            attendance.Status = "Rejected";
            attendance.ApprovedByEmployerId = employerId;
            attendance.ApprovedAt = DateTime.UtcNow;
            attendance.Note = note?.Trim();
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                attendance.EmployeeUserId,
                "Attendance Rejected",
                "Your attendance record was rejected by the employer."
            );

            return (await GetAttendanceResponseAsync(attendance.AttendanceRecordId), null);
        }

        public async Task<(AttendanceResponse? Attendance, string? Error)> AdjustAttendanceAsync(int employerId, int attendanceRecordId, AdjustAttendanceRequest request)
        {
            var attendance = await GetEmployerAttendanceRecordAsync(employerId, attendanceRecordId);
            if (attendance == null) return (null, "Attendance record not found.");
            if (request.CheckOutAt <= request.CheckInAt) return (null, "Check-out must be after check-in.");

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
                "Attendance Adjusted",
                "Your attendance record was adjusted by the employer."
            );

            return (await GetAttendanceResponseAsync(attendance.AttendanceRecordId), null);
        }

        public async Task<(PayrollPeriodResponse? Payroll, string? Error)> GeneratePayrollAsync(int employerId, int month, int year)
        {
            if (month < 1 || month > 12) return (null, "Month must be between 1 and 12.");

            var existing = await _context.PayrollPeriods
                .FirstOrDefaultAsync(p => p.EmployerId == employerId && p.Month == month && p.Year == year);
            if (existing?.Status == "Locked" || existing?.Status == "Paid")
            {
                return (null, "Payroll is locked or paid and cannot be regenerated.");
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

                var totalMinutes = approvedRecords.Sum(r => r.record.WorkedMinutes);
                decimal baseSalary = 0;
                decimal snapshotRate = 0;

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
                    baseSalary += Math.Round((item.record.WorkedMinutes / 60m) * rate.HourlyRate, 2);
                }

                var payrollItem = new PayrollItem
                {
                    PayrollPeriodId = period.PayrollPeriodId,
                    EmploymentId = employment.EmploymentId,
                    EmployeeUserId = employment.EmployeeUserId,
                    TotalApprovedMinutes = totalMinutes,
                    HourlyRateSnapshot = snapshotRate,
                    BaseSalary = baseSalary,
                    Bonus = 0,
                    Penalty = 0,
                    Deduction = 0,
                    FinalSalary = baseSalary,
                    Status = "Draft"
                };

                await _context.PayrollItems.AddAsync(payrollItem);
            }

            await _context.SaveChangesAsync();
            return (await GetPayrollPeriodResponseAsync(period.PayrollPeriodId), null);
        }

        public async Task<IEnumerable<PayrollPeriodResponse>> GetPayrollPeriodsAsync(int employerId)
        {
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
            var period = await _context.PayrollPeriods
                .FirstOrDefaultAsync(p => p.PayrollPeriodId == payrollPeriodId && p.EmployerId == employerId);
            if (period == null) return (null, "Payroll period not found.");
            if (period.Status == "Paid") return (null, "Paid payroll cannot be changed.");
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
            var period = await _context.PayrollPeriods
                .FirstOrDefaultAsync(p => p.PayrollPeriodId == payrollPeriodId && p.EmployerId == employerId);
            if (period == null) return (null, "Payroll period not found.");
            if (period.Status != "Locked" && period.Status != "Paid") return (null, "Payroll must be locked before marking it paid.");
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
            if (request.Bonus < 0 || request.Penalty < 0 || request.Deduction < 0)
            {
                return (null, "Bonus, penalty and deduction cannot be negative.");
            }

            var payrollItem = await (from item in _context.PayrollItems
                                     join period in _context.PayrollPeriods on item.PayrollPeriodId equals period.PayrollPeriodId
                                     where item.PayrollItemId == payrollItemId && period.EmployerId == employerId
                                     select new { item, period })
                .FirstOrDefaultAsync();

            if (payrollItem == null) return (null, "Payroll item not found.");
            if (payrollItem.period.Status != "Draft") return (null, "Only draft payroll can be adjusted.");

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
            if (data == null || DateTime.Now >= data.Shift.StartTime.AddHours(-2)) return Enumerable.Empty<ShiftPassCandidateResponse>();

            var candidates = await BuildPassCandidatesQuery(data.Employment.EmployerId, data.Shift.BranchId, employeeUserId, data.Shift.StartTime, data.Shift.EndTime)
                .ToListAsync();

            return candidates;
        }

        public async Task<(ShiftPassRequestResponse? Request, string? Error)> CreateShiftPassRequestAsync(int employeeUserId, CreateShiftPassRequest request)
        {
            await ExpireStaleShiftPassRequestsAsync();

            var data = await GetPassContextAsync(employeeUserId, request.ShiftAssignmentId);
            if (data == null) return (null, "Shift assignment not found.");
            if (data.Assignment.Status != "Assigned") return (null, "Only assigned shifts can be passed.");
            if (DateTime.Now >= data.Shift.StartTime.AddHours(-2)) return (null, "Shift pass requests must be created at least 2 hours before the shift starts.");
            if (request.ToEmployeeUserId == employeeUserId) return (null, "You cannot pass a shift to yourself.");

            var hasPending = await _context.ShiftPassRequests.AnyAsync(r =>
                r.ShiftAssignmentId == request.ShiftAssignmentId &&
                r.Status == "Pending");
            if (hasPending) return (null, "This shift already has a pending pass request.");

            var candidateExists = await BuildPassCandidatesQuery(data.Employment.EmployerId, data.Shift.BranchId, employeeUserId, data.Shift.StartTime, data.Shift.EndTime)
                .AnyAsync(c => c.EmployeeUserId == request.ToEmployeeUserId);
            if (!candidateExists) return (null, "Selected employee is not eligible for this shift.");

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

            await _notificationService.CreateNotificationAsync(
                request.ToEmployeeUserId,
                "Shift Pass Request",
                $"A coworker wants to pass shift '{data.Shift.Title}' to you."
            );

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

            var request = await _context.ShiftPassRequests.FirstOrDefaultAsync(r => r.ShiftPassRequestId == requestId && r.ToEmployeeUserId == employeeUserId);
            if (request == null) return (null, "Shift pass request not found.");
            if (request.Status != "Pending") return (null, "Only pending requests can be accepted.");

            var assignment = await _context.ShiftAssignments.FirstOrDefaultAsync(a => a.ShiftAssignmentId == request.ShiftAssignmentId);
            var shift = await _context.WorkShifts.FirstOrDefaultAsync(s => s.WorkShiftId == request.WorkShiftId);
            if (assignment == null || shift == null) return (null, "Shift assignment not found.");
            if (DateTime.Now >= shift.StartTime.AddHours(-2)) return (null, "This request expired because the shift starts in less than 2 hours.");
            if (assignment.EmployeeUserId != request.FromEmployeeUserId || assignment.Status != "Assigned")
            {
                return (null, "The original shift owner changed, so this request cannot be accepted.");
            }

            var toEmployment = await _context.Employments.FirstOrDefaultAsync(e =>
                e.EmployerId == shift.EmployerId &&
                e.BranchId == shift.BranchId &&
                e.EmployeeUserId == employeeUserId &&
                e.Status == "Active");
            if (toEmployment == null) return (null, "You are not an active employee in this branch.");

            var hasOverlap = await HasEmployeeOverlapAsync(employeeUserId, shift.StartTime, shift.EndTime, shift.WorkShiftId);
            if (hasOverlap) return (null, "You already have another shift in this time range.");

            assignment.Status = "Transferred";
            var newAssignment = new ShiftAssignment
            {
                WorkShiftId = shift.WorkShiftId,
                EmploymentId = toEmployment.EmploymentId,
                EmployeeUserId = employeeUserId,
                Status = "Assigned",
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

            await _notificationService.CreateNotificationAsync(request.FromEmployeeUserId, "Shift Passed", $"Your shift '{shift.Title}' was accepted by a coworker.");
            await _notificationService.CreateNotificationAsync(shift.EmployerId, "Shift Passed", $"Shift '{shift.Title}' was transferred between employees.");

            return (await GetShiftPassRequestResponseAsync(request.ShiftPassRequestId), null);
        }

        public async Task<(ShiftPassRequestResponse? Request, string? Error)> RejectShiftPassRequestAsync(int employeeUserId, int requestId)
        {
            await ExpireStaleShiftPassRequestsAsync();

            var request = await _context.ShiftPassRequests.FirstOrDefaultAsync(r => r.ShiftPassRequestId == requestId && r.ToEmployeeUserId == employeeUserId);
            if (request == null) return (null, "Shift pass request not found.");
            if (request.Status != "Pending") return (null, "Only pending requests can be rejected.");

            request.Status = "Rejected";
            request.RespondedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(request.FromEmployeeUserId, "Shift Pass Rejected", "Your coworker rejected the shift pass request.");
            return (await GetShiftPassRequestResponseAsync(request.ShiftPassRequestId), null);
        }

        private IQueryable<EmploymentResponse> BuildEmploymentQuery()
        {
            return from employment in _context.Employments
                   join user in _context.Users on employment.EmployeeUserId equals user.UserId
                   join branch in _context.Branches on employment.BranchId equals branch.BranchId
                   join rate in _context.EmployeeRates on employment.EmploymentId equals rate.EmploymentId
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
                       CurrentHourlyRate = rate.HourlyRate
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
                   select new WorkShiftResponse
                   {
                       WorkShiftId = shift.WorkShiftId,
                       EmployerId = shift.EmployerId,
                       BranchId = shift.BranchId,
                       BranchName = branch.Name,
                       Title = shift.Title,
                       StartTime = shift.StartTime,
                       EndTime = shift.EndTime,
                       RequiredRole = shift.RequiredRole,
                       RequiredPeople = shift.RequiredPeople,
                       Status = shift.Status
                   };
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
                                         AssignedAt = assignment.AssignedAt,
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
            return await (from assignment in _context.ShiftAssignments
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
                              AssignedAt = assignment.AssignedAt,
                              AttendanceRecordId = attendance == null ? null : (int?)attendance.AttendanceRecordId,
                              AttendanceStatus = attendance == null ? null : attendance.Status,
                              CheckInAt = attendance == null ? null : attendance.CheckInAt,
                              CheckOutAt = attendance == null ? null : attendance.CheckOutAt,
                              WorkedMinutes = attendance == null ? 0 : attendance.WorkedMinutes
                          })
                .FirstOrDefaultAsync();
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
            var now = DateTime.Now;
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

        private sealed class PassContext
        {
            public ShiftAssignment Assignment { get; set; } = null!;
            public WorkShift Shift { get; set; } = null!;
            public Employment Employment { get; set; } = null!;
        }
    }
}

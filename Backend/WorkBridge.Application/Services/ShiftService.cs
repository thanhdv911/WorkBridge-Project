using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Interfaces;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public class ShiftService : IShiftService
    {
        private readonly IWorkBridgeContext _context;
        private readonly INotificationService _notificationService;

        public ShiftService(IWorkBridgeContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<ScheduleResponse> CreateScheduleAsync(int employerId, CreateScheduleRequest request)
        {
            var job = await _context.JobPosts.FirstOrDefaultAsync(j => j.JobPostId == request.JobPostId && j.EmployerId == employerId);
            if (job == null) throw new UnauthorizedAccessException("Job post not found or you don't own it.");

            var schedule = new WorkSchedule
            {
                JobPostId = request.JobPostId,
                ApplicantId = request.ApplicantId,
                ShiftDate = request.ShiftDate.Date,
                StartTime = request.StartTime,
                EndTime = request.EndTime,
                Status = "Scheduled",
                CreatedAt = DateTime.UtcNow
            };

            _context.WorkSchedules.Add(schedule);
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                request.ApplicantId,
                "New Shift Scheduled",
                $"You have been scheduled for a shift on {schedule.ShiftDate:MM/dd/yyyy} from {schedule.StartTime} to {schedule.EndTime} for {job.Title}."
            );

            return await GetScheduleResponseAsync(schedule.ScheduleId);
        }

        public async Task<IEnumerable<ScheduleResponse>> GetEmployerSchedulesAsync(int employerId, int? jobPostId, DateTime? startDate, DateTime? endDate)
        {
            var query = _context.WorkSchedules
                .Include(s => s.JobPost)
                .Include(s => s.Applicant).ThenInclude(a => a.Applicant)
                .Include(s => s.Attendances)
                .Where(s => s.JobPost.EmployerId == employerId);

            if (jobPostId.HasValue) query = query.Where(s => s.JobPostId == jobPostId.Value);
            if (startDate.HasValue) query = query.Where(s => s.ShiftDate >= startDate.Value.Date);
            if (endDate.HasValue) query = query.Where(s => s.ShiftDate <= endDate.Value.Date);

            return await query.OrderBy(s => s.ShiftDate).ThenBy(s => s.StartTime)
                .Select(s => MapToResponse(s)).ToListAsync();
        }

        public async Task<IEnumerable<ScheduleResponse>> GetMySchedulesAsync(int applicantId, DateTime? startDate, DateTime? endDate)
        {
            var query = _context.WorkSchedules
                .Include(s => s.JobPost)
                .Include(s => s.Applicant).ThenInclude(a => a.Applicant)
                .Include(s => s.Attendances)
                .Where(s => s.ApplicantId == applicantId);

            if (startDate.HasValue) query = query.Where(s => s.ShiftDate >= startDate.Value.Date);
            if (endDate.HasValue) query = query.Where(s => s.ShiftDate <= endDate.Value.Date);

            return await query.OrderBy(s => s.ShiftDate).ThenBy(s => s.StartTime)
                .Select(s => MapToResponse(s)).ToListAsync();
        }

        public async Task<string?> CheckInAsync(int applicantId, int scheduleId, string? note)
        {
            var schedule = await _context.WorkSchedules.Include(s => s.Attendances).FirstOrDefaultAsync(s => s.ScheduleId == scheduleId && s.ApplicantId == applicantId);
            if (schedule == null) return "Schedule not found.";
            
            // Allow check-in today or nearby timezone
            var today = DateTime.UtcNow.Date;
            if (schedule.ShiftDate.Date != today && schedule.ShiftDate.Date != DateTime.Now.Date) return "You can only check-in on the day of your shift.";
            if (schedule.Attendances.Any(a => a.CheckInTime.Date == today || a.CheckInTime.Date == DateTime.Now.Date)) return "Already checked in.";

            var attendance = new Attendance
            {
                ScheduleId = scheduleId,
                CheckInTime = DateTime.UtcNow,
                Note = note
            };
            
            schedule.Status = "In Progress";
            _context.Attendances.Add(attendance);
            await _context.SaveChangesAsync();
            return null;
        }

        public async Task<string?> CheckOutAsync(int applicantId, int scheduleId)
        {
            var schedule = await _context.WorkSchedules.Include(s => s.Attendances).FirstOrDefaultAsync(s => s.ScheduleId == scheduleId && s.ApplicantId == applicantId);
            if (schedule == null) return "Schedule not found.";

            var attendance = schedule.Attendances.OrderByDescending(a => a.CheckInTime).FirstOrDefault();
            if (attendance == null || attendance.CheckOutTime != null) return "No active check-in found.";

            attendance.CheckOutTime = DateTime.UtcNow;
            schedule.Status = "Completed";
            await _context.SaveChangesAsync();
            return null;
        }

        public async Task<string?> RequestShiftSwapAsync(int applicantId, CreateSwapRequest request)
        {
            var schedule = await _context.WorkSchedules.FirstOrDefaultAsync(s => s.ScheduleId == request.ScheduleId && s.ApplicantId == applicantId);
            if (schedule == null) return "Schedule not found.";
            if (schedule.Status != "Scheduled") return "Can only swap scheduled shifts.";

            var swapRequest = new ShiftSwapRequest
            {
                ScheduleId = request.ScheduleId,
                RequestorId = applicantId,
                TargetApplicantId = request.TargetApplicantId,
                Reason = request.Reason,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            schedule.Status = "Swap Requested";
            _context.ShiftSwapRequests.Add(swapRequest);
            await _context.SaveChangesAsync();
            return null;
        }

        public async Task<IEnumerable<SwapRequestResponse>> GetAvailableSwapRequestsAsync(int applicantId)
        {
            var myJobs = await _context.Applications
                .Where(a => a.ApplicantId == applicantId && a.Status == "Accepted")
                .Select(a => a.JobPostId)
                .ToListAsync();

            var requests = await _context.ShiftSwapRequests
                .Include(r => r.Schedule).ThenInclude(s => s.JobPost)
                .Include(r => r.Requestor).ThenInclude(p => p.Applicant)
                .Where(r => r.Status == "Pending" && r.RequestorId != applicantId && myJobs.Contains(r.Schedule.JobPostId))
                .ToListAsync();

            return requests.Where(r => r.TargetApplicantId == null || r.TargetApplicantId == applicantId).Select(r => new SwapRequestResponse
            {
                SwapRequestId = r.SwapRequestId,
                ScheduleId = r.ScheduleId,
                ShiftDate = r.Schedule.ShiftDate,
                StartTime = r.Schedule.StartTime,
                EndTime = r.Schedule.EndTime,
                RequestorName = r.Requestor.Applicant.FullName,
                Status = r.Status,
                Reason = r.Reason,
                CreatedAt = r.CreatedAt.GetValueOrDefault()
            });
        }

        public async Task<string?> AcceptSwapRequestAsync(int applicantId, int swapRequestId)
        {
            var swapReq = await _context.ShiftSwapRequests.Include(r => r.Schedule).FirstOrDefaultAsync(r => r.SwapRequestId == swapRequestId && r.Status == "Pending");
            if (swapReq == null) return "Swap request not found or not pending.";
            
            if (swapReq.TargetApplicantId != null && swapReq.TargetApplicantId != applicantId) return "This swap request is targeted to someone else.";

            swapReq.Status = "Accepted";
            swapReq.Schedule.ApplicantId = applicantId; 
            swapReq.Schedule.Status = "Scheduled";
            
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                swapReq.RequestorId,
                "Shift Swap Accepted",
                $"Your shift swap request for {swapReq.Schedule.ShiftDate:MM/dd/yyyy} was accepted."
            );
            return null;
        }

        private async Task<ScheduleResponse> GetScheduleResponseAsync(int scheduleId)
        {
            var schedule = await _context.WorkSchedules
                .Include(s => s.JobPost)
                .Include(s => s.Applicant).ThenInclude(a => a.Applicant)
                .Include(s => s.Attendances)
                .FirstOrDefaultAsync(s => s.ScheduleId == scheduleId);
            return MapToResponse(schedule!);
        }

        private ScheduleResponse MapToResponse(WorkSchedule schedule)
        {
            var lastAttendance = schedule.Attendances.OrderByDescending(a => a.CheckInTime).FirstOrDefault();
            return new ScheduleResponse
            {
                ScheduleId = schedule.ScheduleId,
                JobPostId = schedule.JobPostId,
                JobTitle = schedule.JobPost.Title,
                ApplicantId = schedule.ApplicantId,
                ApplicantName = schedule.Applicant.Applicant.FullName,
                ShiftDate = schedule.ShiftDate,
                StartTime = schedule.StartTime,
                EndTime = schedule.EndTime,
                Status = schedule.Status,
                Attendance = lastAttendance == null ? null : new AttendanceDto
                {
                    AttendanceId = lastAttendance.AttendanceId,
                    CheckInTime = lastAttendance.CheckInTime,
                    CheckOutTime = lastAttendance.CheckOutTime,
                    Note = lastAttendance.Note
                }
            };
        }
    }
}

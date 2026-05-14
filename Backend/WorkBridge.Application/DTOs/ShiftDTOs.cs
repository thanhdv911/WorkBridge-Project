using System;
using System.Collections.Generic;

namespace WorkBridge.Application.DTOs
{
    public class CreateScheduleRequest
    {
        public int JobPostId { get; set; }
        public int ApplicantId { get; set; }
        public DateTime ShiftDate { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
    }

    public class ScheduleResponse
    {
        public int ScheduleId { get; set; }
        public int JobPostId { get; set; }
        public string JobTitle { get; set; } = string.Empty;
        public int ApplicantId { get; set; }
        public string ApplicantName { get; set; } = string.Empty;
        public DateTime ShiftDate { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public string Status { get; set; } = string.Empty;
        public AttendanceDto? Attendance { get; set; }
    }

    public class AttendanceDto
    {
        public int AttendanceId { get; set; }
        public DateTime CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public string? Note { get; set; }
    }

    public class CreateSwapRequest
    {
        public int ScheduleId { get; set; }
        public int? TargetApplicantId { get; set; }
        public string? Reason { get; set; }
    }

    public class SwapRequestResponse
    {
        public int SwapRequestId { get; set; }
        public int ScheduleId { get; set; }
        public DateTime ShiftDate { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public string RequestorName { get; set; } = string.Empty;
        public string? TargetApplicantName { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Reason { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}

using System;
using System.Collections.Generic;

namespace WorkBridge.Domain.Entities;

public partial class WorkSchedule
{
    public int ScheduleId { get; set; }
    public int JobPostId { get; set; }
    public int ApplicantId { get; set; }
    public DateTime ShiftDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public string Status { get; set; } = null!;
    public DateTime? CreatedAt { get; set; }

    public virtual JobPost JobPost { get; set; } = null!;
    public virtual ApplicantProfile Applicant { get; set; } = null!;
    public virtual ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
    public virtual ICollection<ShiftSwapRequest> ShiftSwapRequests { get; set; } = new List<ShiftSwapRequest>();
}

using System;
using System.Collections.Generic;

namespace WorkBridge.Domain.Entities;

public partial class ShiftSwapRequest
{
    public int SwapRequestId { get; set; }
    public int ScheduleId { get; set; }
    public int RequestorId { get; set; }
    public int? TargetApplicantId { get; set; }
    public string? Reason { get; set; }
    public string Status { get; set; } = null!;
    public DateTime? CreatedAt { get; set; }

    public virtual WorkSchedule Schedule { get; set; } = null!;
    public virtual ApplicantProfile Requestor { get; set; } = null!;
    public virtual ApplicantProfile? TargetApplicant { get; set; }
}

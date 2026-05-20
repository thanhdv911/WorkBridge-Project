using System;

namespace WorkBridge.Domain.Entities;

public partial class WorkShift
{
    public int WorkShiftId { get; set; }

    public int EmployerId { get; set; }

    public int BranchId { get; set; }

    public string Title { get; set; } = null!;

    public DateTime StartTime { get; set; }

    public DateTime EndTime { get; set; }

    public string? RequiredRole { get; set; }

    public int RequiredPeople { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }
}

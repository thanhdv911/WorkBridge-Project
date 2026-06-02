using System;

namespace WorkBridge.Domain.Entities;

public partial class EmployerShiftTiming
{
    public int EmployerShiftTimingId { get; set; }

    public int EmployerId { get; set; }

    public string ShiftName { get; set; } = null!;

    public string StartTime { get; set; } = null!;

    public string EndTime { get; set; } = null!;

    public int RequiredPeople { get; set; }

    public bool IsActive { get; set; }
}

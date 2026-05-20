using System;

namespace WorkBridge.Domain.Entities;

public partial class PayrollPeriod
{
    public int PayrollPeriodId { get; set; }

    public int EmployerId { get; set; }

    public int Month { get; set; }

    public int Year { get; set; }

    public string Status { get; set; } = null!;

    public DateTime Payday { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? LockedAt { get; set; }

    public DateTime? PaidAt { get; set; }
}

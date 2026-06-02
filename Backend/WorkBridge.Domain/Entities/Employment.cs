using System;

namespace WorkBridge.Domain.Entities;

public partial class Employment
{
    public int EmploymentId { get; set; }

    public int EmployerId { get; set; }

    public int EmployeeUserId { get; set; }

    public int BranchId { get; set; }

    public int OfferId { get; set; }

    public string Position { get; set; } = null!;

    public string Status { get; set; } = null!;

    public DateTime StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public string? ExpectedShifts { get; set; }

    public DateTime CreatedAt { get; set; }
}

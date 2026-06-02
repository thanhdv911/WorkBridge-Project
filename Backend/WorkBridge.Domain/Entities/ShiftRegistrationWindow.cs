using System;

namespace WorkBridge.Domain.Entities;

public partial class ShiftRegistrationWindow
{
    public int ShiftRegistrationWindowId { get; set; }

    public int EmployerId { get; set; }

    public int BranchId { get; set; }

    public DateTime WeekStartDate { get; set; }

    public DateTime OpenAt { get; set; }

    public DateTime CloseAt { get; set; }

    public string Status { get; set; } = null!;

    public int MinFixedShifts { get; set; }

    public DateTime PublishedAt { get; set; }

    public DateTime? FinalizedAt { get; set; }
}

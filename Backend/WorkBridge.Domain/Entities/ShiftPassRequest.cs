using System;

namespace WorkBridge.Domain.Entities;

public partial class ShiftPassRequest
{
    public int ShiftPassRequestId { get; set; }

    public int ShiftAssignmentId { get; set; }

    public int WorkShiftId { get; set; }

    public int FromEmployeeUserId { get; set; }

    public int ToEmployeeUserId { get; set; }

    public int BranchId { get; set; }

    public string Status { get; set; } = null!;

    public DateTime RequestedAt { get; set; }

    public DateTime? RespondedAt { get; set; }

    public DateTime ExpiresAt { get; set; }

    public string? Reason { get; set; }
}

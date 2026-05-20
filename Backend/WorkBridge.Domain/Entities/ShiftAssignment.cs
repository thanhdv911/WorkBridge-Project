using System;

namespace WorkBridge.Domain.Entities;

public partial class ShiftAssignment
{
    public int ShiftAssignmentId { get; set; }

    public int WorkShiftId { get; set; }

    public int EmploymentId { get; set; }

    public int EmployeeUserId { get; set; }

    public string Status { get; set; } = null!;

    public DateTime AssignedAt { get; set; }

    public int? TransferredFromAssignmentId { get; set; }
}

using System;

namespace WorkBridge.Domain.Entities;

public partial class AttendanceRecord
{
    public int AttendanceRecordId { get; set; }

    public int ShiftAssignmentId { get; set; }

    public int EmployeeUserId { get; set; }

    public DateTime? CheckInAt { get; set; }

    public DateTime? CheckOutAt { get; set; }

    public int WorkedMinutes { get; set; }

    public string Status { get; set; } = null!;

    public int? ApprovedByEmployerId { get; set; }

    public DateTime? ApprovedAt { get; set; }

    public string? Note { get; set; }
}

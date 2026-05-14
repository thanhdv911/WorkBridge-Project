using System;
using System.Collections.Generic;

namespace WorkBridge.Domain.Entities;

public partial class Attendance
{
    public int AttendanceId { get; set; }
    public int ScheduleId { get; set; }
    public DateTime CheckInTime { get; set; }
    public DateTime? CheckOutTime { get; set; }
    public string? Note { get; set; }

    public virtual WorkSchedule Schedule { get; set; } = null!;
}

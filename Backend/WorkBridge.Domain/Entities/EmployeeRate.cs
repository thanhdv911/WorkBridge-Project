using System;

namespace WorkBridge.Domain.Entities;

public partial class EmployeeRate
{
    public int EmployeeRateId { get; set; }

    public int EmploymentId { get; set; }

    public decimal HourlyRate { get; set; }

    public DateTime EffectiveFrom { get; set; }

    public DateTime? EffectiveTo { get; set; }

    public DateTime CreatedAt { get; set; }
}

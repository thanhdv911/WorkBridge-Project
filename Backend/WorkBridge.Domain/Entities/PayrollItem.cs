namespace WorkBridge.Domain.Entities;

public partial class PayrollItem
{
    public int PayrollItemId { get; set; }

    public int PayrollPeriodId { get; set; }

    public int EmploymentId { get; set; }

    public int EmployeeUserId { get; set; }

    public int TotalApprovedMinutes { get; set; }

    public decimal HourlyRateSnapshot { get; set; }

    public decimal BaseSalary { get; set; }

    public decimal Bonus { get; set; }

    public decimal Penalty { get; set; }

    public decimal Deduction { get; set; }

    public decimal FinalSalary { get; set; }

    public string Status { get; set; } = null!;
}

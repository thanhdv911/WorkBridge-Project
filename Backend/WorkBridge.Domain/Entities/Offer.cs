using System;

namespace WorkBridge.Domain.Entities;

public partial class Offer
{
    public int OfferId { get; set; }

    public int ApplicationId { get; set; }

    public int EmployerId { get; set; }

    public int ApplicantId { get; set; }

    public int BranchId { get; set; }

    public string Position { get; set; } = null!;

    public decimal HourlyRate { get; set; }

    public DateTime StartDate { get; set; }

    public int PaydayOfMonth { get; set; }

    public string Status { get; set; } = null!;

    public DateTime? ExpiredAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? AcceptedAt { get; set; }

    public string? ExpectedShifts { get; set; }

    public DateTime? RespondedAt { get; set; }
}

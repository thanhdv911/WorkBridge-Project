using System;

namespace WorkBridge.Domain.Entities;

public partial class ApplicantBadge
{
    public int BadgeId { get; set; }
    public int ApplicantId { get; set; }
    public string BadgeName { get; set; } = null!;
    public string? IconClass { get; set; }
    public string? Description { get; set; }
    public DateTime? EarnedAt { get; set; }

    public virtual ApplicantProfile Applicant { get; set; } = null!;
}

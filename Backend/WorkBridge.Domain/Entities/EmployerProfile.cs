using System;
using System.Collections.Generic;

namespace WorkBridge.Domain.Entities;

public partial class EmployerProfile
{
    public int EmployerId { get; set; }

    public string CompanyName { get; set; } = null!;

    public string ContactEmail { get; set; } = null!;

    public string? ContactPhone { get; set; }

    public string? Address { get; set; }

    public string? Description { get; set; }

    public string? LogoUrl { get; set; }

    public int ReputationScore { get; set; } = 100;

    public int ReportCount { get; set; }

    public string Status { get; set; } = "Active";

    public string VerificationStatus { get; set; } = "Pending";

    public string? BusinessLicenseUrl { get; set; }

    public string? TaxId { get; set; }

    public virtual User Employer { get; set; } = null!;

    public virtual ICollection<JobPost> JobPosts { get; set; } = new List<JobPost>();

    public virtual ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
}

using System;
using System.Collections.Generic;

namespace WorkBridge.Infrastructure.Models;

public partial class ApplicantExperience
{
    public int ExperienceId { get; set; }

    public int ApplicantId { get; set; }

    public string Title { get; set; } = null!;

    public string CompanyName { get; set; } = null!;

    public string? Duration { get; set; }

    public string? Description { get; set; }

    public virtual ApplicantProfile Applicant { get; set; } = null!;
}

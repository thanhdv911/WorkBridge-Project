using System;
using System.Collections.Generic;

namespace WorkBridge.Infrastructure.Models;

public partial class Application
{
    public int ApplicationId { get; set; }

    public int JobPostId { get; set; }

    public int ApplicantId { get; set; }

    public string? CoverMessage { get; set; }

    public string? CvUrl { get; set; }

    public string Status { get; set; } = null!;

    public string? EmployerNotes { get; set; }

    public bool IsDeleted { get; set; }

    public DateTime? AppliedAt { get; set; }

    public DateTime? RespondedAt { get; set; }

    public virtual ApplicantProfile Applicant { get; set; } = null!;

    public virtual JobPost JobPost { get; set; } = null!;
}

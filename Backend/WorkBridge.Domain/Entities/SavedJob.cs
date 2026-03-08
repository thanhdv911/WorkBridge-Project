using System;
using System.Collections.Generic;

namespace WorkBridge.Domain.Entities;

public partial class SavedJob
{
    public int SavedJobId { get; set; }

    public int ApplicantId { get; set; }

    public int JobPostId { get; set; }

    public DateTime? SavedAt { get; set; }

    public virtual ApplicantProfile Applicant { get; set; } = null!;

    public virtual JobPost JobPost { get; set; } = null!;
}

using System;
using System.Collections.Generic;

namespace WorkBridge.Infrastructure.Models;

public partial class ApplicantProfile
{
    public int ApplicantId { get; set; }

    public string? University { get; set; }

    public string? Major { get; set; }

    public string? StudyYear { get; set; }

    public string? Phone { get; set; }

    public string? Address { get; set; }

    public string? AboutMe { get; set; }

    public string? Availability { get; set; }

    public string? CvUrl { get; set; }

    public virtual User Applicant { get; set; } = null!;

    public virtual ICollection<ApplicantExperience> ApplicantExperiences { get; set; } = new List<ApplicantExperience>();

    public virtual ICollection<ApplicantSkill> ApplicantSkills { get; set; } = new List<ApplicantSkill>();

    public virtual ICollection<Application> Applications { get; set; } = new List<Application>();

    public virtual ICollection<SavedJob> SavedJobs { get; set; } = new List<SavedJob>();
}

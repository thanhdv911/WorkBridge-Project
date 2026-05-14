using System;
using System.Collections.Generic;

namespace WorkBridge.Domain.Entities;

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

    public virtual ICollection<JobApplication> Applications { get; set; } = new List<JobApplication>();

    public virtual ICollection<SavedJob> SavedJobs { get; set; } = new List<SavedJob>();

    public virtual ICollection<WorkSchedule> WorkSchedules { get; set; } = new List<WorkSchedule>();

    public virtual ICollection<ShiftSwapRequest> ShiftSwapRequestsMade { get; set; } = new List<ShiftSwapRequest>();

    public virtual ICollection<ShiftSwapRequest> ShiftSwapRequestsReceived { get; set; } = new List<ShiftSwapRequest>();

    public virtual ICollection<EContract> EContracts { get; set; } = new List<EContract>();

    public virtual ICollection<ApplicantBadge> ApplicantBadges { get; set; } = new List<ApplicantBadge>();
}

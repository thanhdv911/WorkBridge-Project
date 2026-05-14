using System;
using System.Collections.Generic;

namespace WorkBridge.Domain.Entities;

public partial class JobPost
{
    public int JobPostId { get; set; }

    public int EmployerId { get; set; }

    public int CategoryId { get; set; }

    public string Title { get; set; } = null!;

    public string JobType { get; set; } = null!;

    public decimal? PayRate { get; set; }

    public string PayUnit { get; set; } = null!;

    public string? City { get; set; }

    public string? District { get; set; }

    public string Address { get; set; } = null!;

    public DateTime? ApplicationDeadline { get; set; }

    public string Description { get; set; } = null!;

    public string? Requirements { get; set; }

    public string? Benefits { get; set; }

    public string Status { get; set; } = null!;
    public bool IsTrending { get; set; }
    public string? Tag { get; set; }
    public bool IsDeleted { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<JobApplication> Applications { get; set; } = new List<JobApplication>();

    public virtual JobCategory Category { get; set; } = null!;

    public virtual EmployerProfile Employer { get; set; } = null!;

    public virtual ICollection<Message> Messages { get; set; } = new List<Message>();

    public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();

    public virtual ICollection<SavedJob> SavedJobs { get; set; } = new List<SavedJob>();

    public virtual ICollection<JobShift> Shifts { get; set; } = new List<JobShift>();

    public virtual ICollection<WorkSchedule> WorkSchedules { get; set; } = new List<WorkSchedule>();
}

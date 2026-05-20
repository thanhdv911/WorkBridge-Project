using System;

namespace WorkBridge.Domain.Entities;

public partial class Interview
{
    public int InterviewId { get; set; }

    public int ApplicationId { get; set; }

    public int EmployerId { get; set; }

    public int ApplicantId { get; set; }

    public DateTime ScheduledAt { get; set; }

    public string Location { get; set; } = null!;

    public string? Note { get; set; }

    public string Status { get; set; } = null!;

    public string? Result { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}

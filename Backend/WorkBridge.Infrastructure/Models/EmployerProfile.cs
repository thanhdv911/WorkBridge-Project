using System;
using System.Collections.Generic;

namespace WorkBridge.Infrastructure.Models;

public partial class EmployerProfile
{
    public int EmployerId { get; set; }

    public string CompanyName { get; set; } = null!;

    public string ContactEmail { get; set; } = null!;

    public string? ContactPhone { get; set; }

    public string? Address { get; set; }

    public string? Description { get; set; }

    public string? LogoUrl { get; set; }

    public virtual User Employer { get; set; } = null!;

    public virtual ICollection<JobPost> JobPosts { get; set; } = new List<JobPost>();

    public virtual ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
}

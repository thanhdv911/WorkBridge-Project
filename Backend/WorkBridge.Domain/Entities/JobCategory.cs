using System;
using System.Collections.Generic;

namespace WorkBridge.Domain.Entities;

public partial class JobCategory
{
    public int CategoryId { get; set; }

    public string Name { get; set; } = null!;
    public string? IconName { get; set; }
    public string? Description { get; set; }

    public virtual ICollection<JobPost> JobPosts { get; set; } = new List<JobPost>();
}

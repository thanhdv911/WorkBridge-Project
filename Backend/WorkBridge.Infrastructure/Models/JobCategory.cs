using System;
using System.Collections.Generic;

namespace WorkBridge.Infrastructure.Models;

public partial class JobCategory
{
    public int CategoryId { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public virtual ICollection<JobPost> JobPosts { get; set; } = new List<JobPost>();
}

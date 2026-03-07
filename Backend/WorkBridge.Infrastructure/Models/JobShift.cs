using System;
using System.Collections.Generic;

namespace WorkBridge.Infrastructure.Models;

public partial class JobShift
{
    public int ShiftId { get; set; }

    public string ShiftName { get; set; } = null!;

    public virtual ICollection<JobPost> JobPosts { get; set; } = new List<JobPost>();
}

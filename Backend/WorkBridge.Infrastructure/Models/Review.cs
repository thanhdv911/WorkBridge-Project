using System;
using System.Collections.Generic;

namespace WorkBridge.Infrastructure.Models;

public partial class Review
{
    public int ReviewId { get; set; }

    public int ReviewerId { get; set; }

    public int RevieweeId { get; set; }

    public int JobPostId { get; set; }

    public int Rating { get; set; }

    public string? Comment { get; set; }

    public bool IsDeleted { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual JobPost JobPost { get; set; } = null!;

    public virtual User Reviewee { get; set; } = null!;

    public virtual User Reviewer { get; set; } = null!;
}

using System;
using System.Collections.Generic;

namespace WorkBridge.Domain.Entities;

public partial class ApplicationHistory
{
    public int HistoryId { get; set; }
    public int ApplicationId { get; set; }
    public string Status { get; set; } = null!;
    public string? Note { get; set; }
    public DateTime? CreatedAt { get; set; }

    public virtual JobApplication Application { get; set; } = null!;
}

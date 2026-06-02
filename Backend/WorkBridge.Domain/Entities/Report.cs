using System;
using System.Collections.Generic;

namespace WorkBridge.Domain.Entities;

public partial class Report
{
    public int ReportId { get; set; }

    public int ReporterId { get; set; }

    public int ReportedEntityId { get; set; }

    public string EntityType { get; set; } = null!;

    public string Reason { get; set; } = null!;

    public string? Description { get; set; }

    public string Status { get; set; } = null!;

    public DateTime? CreatedAt { get; set; }

    public string? AiAnalysis { get; set; }

    public virtual User Reporter { get; set; } = null!;
}

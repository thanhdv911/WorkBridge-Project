using System;
using System.Collections.Generic;

namespace WorkBridge.Domain.Entities;

public partial class Dispute
{
    public int DisputeId { get; set; }
    public int ContractId { get; set; }
    public int InitiatorId { get; set; }
    public int RespondentId { get; set; }
    public string Reason { get; set; } = null!;
    public string? EvidenceData { get; set; }
    public string Status { get; set; } = null!;
    public string? AdminNotes { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }

    public virtual EContract Contract { get; set; } = null!;
    public virtual User Initiator { get; set; } = null!;
    public virtual User Respondent { get; set; } = null!;
}

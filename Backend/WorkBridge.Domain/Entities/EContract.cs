using System;
using System.Collections.Generic;

namespace WorkBridge.Domain.Entities;

public partial class EContract
{
    public int ContractId { get; set; }
    public int ApplicationId { get; set; }
    public int EmployerId { get; set; }
    public int ApplicantId { get; set; }
    public decimal AgreedPayRate { get; set; }
    public string AgreedPayUnit { get; set; } = null!;
    public string Terms { get; set; } = null!;
    public string Status { get; set; } = null!;
    public DateTime? CreatedAt { get; set; }
    public DateTime? SignedAt { get; set; }

    public virtual JobApplication Application { get; set; } = null!;
    public virtual EmployerProfile Employer { get; set; } = null!;
    public virtual ApplicantProfile Applicant { get; set; } = null!;
    public virtual ICollection<Dispute> Disputes { get; set; } = new List<Dispute>();
}

using System;
using System.Collections.Generic;

namespace WorkBridge.Application.DTOs
{
    public class EContractResponse
    {
        public int ContractId { get; set; }
        public int ApplicationId { get; set; }
        public string EmployerName { get; set; } = string.Empty;
        public string ApplicantName { get; set; } = string.Empty;
        public string JobTitle { get; set; } = string.Empty;
        public decimal AgreedPayRate { get; set; }
        public string AgreedPayUnit { get; set; } = string.Empty;
        public string Terms { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime? CreatedAt { get; set; }
        public DateTime? SignedAt { get; set; }
    }

    public class CreateDisputeRequest
    {
        public int ContractId { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    public class DisputeResponse
    {
        public int DisputeId { get; set; }
        public int ContractId { get; set; }
        public string JobTitle { get; set; } = string.Empty;
        public string InitiatorName { get; set; } = string.Empty;
        public string RespondentName { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public string? EvidenceData { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? AdminNotes { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
    }
}

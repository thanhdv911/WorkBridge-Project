using System;

namespace WorkBridge.API.DTOs
{
    public class CreateReportRequest
    {
        public int ReportedEntityId { get; set; }
        public string EntityType { get; set; } = string.Empty; // "Job" or "User"
        public string Reason { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class AdminReportResponse
    {
        public int ReportId { get; set; }
        public string ReporterName { get; set; } = string.Empty;
        public int ReportedEntityId { get; set; }
        public string EntityType { get; set; } = string.Empty;
        public string EntityTitle { get; set; } = string.Empty; // Job Title or User Full Name
        public string Reason { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? CreatedAt { get; set; }
    }
}

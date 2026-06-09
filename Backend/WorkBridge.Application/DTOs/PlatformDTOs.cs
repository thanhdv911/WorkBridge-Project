using System;

namespace WorkBridge.Application.DTOs
{
    public class PlatformMaintenanceStatusResponse
    {
        public bool IsActive { get; set; }
        public bool IsEnabled { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTime? StartedAtUtc { get; set; }
        public DateTime? EndsAtUtc { get; set; }
        public int? RemainingSeconds { get; set; }
        public string? UpdatedBy { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
    }

    public class AdminMaintenanceRequest
    {
        public bool IsEnabled { get; set; }
        public int? DurationMinutes { get; set; }
        public string? Title { get; set; }
        public string? Message { get; set; }
        public bool SendEmail { get; set; }
        public string Audience { get; set; } = "All";
        public string? EmailSubject { get; set; }
        public string? EmailMessage { get; set; }
    }

    public class AdminBroadcastEmailRequest
    {
        public string Type { get; set; } = "General";
        public string Audience { get; set; } = "All";
        public string Subject { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? ActionUrl { get; set; }
        public string? ActionText { get; set; }
    }

    public class AdminEmailActionResponse
    {
        public string Message { get; set; } = string.Empty;
        public int QueuedCount { get; set; }
        public PlatformMaintenanceStatusResponse? Maintenance { get; set; }
    }
}

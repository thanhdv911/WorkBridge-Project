namespace WorkBridge.API.DTOs
{
    public class ApplyJobRequest
    {
        public int JobPostId { get; set; }
        public string? CoverMessage { get; set; }
    }

    public class ApplicationResponse
    {
        public int ApplicationId { get; set; }
        public int JobPostId { get; set; }
        public string JobTitle { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime AppliedAt { get; set; }
        public string Location { get; set; } = string.Empty;
    }
}

namespace WorkBridge.Application.DTOs
{
    public class ApplyJobRequest
    {
        public int JobPostId { get; set; }
        public string? CoverMessage { get; set; }
    }

    public class UpdateApplicationStatusRequest
    {
        public string Status { get; set; } = string.Empty;
        public string? Note { get; set; }
    }

    public class ApplicationHistoryDto
    {
        public string Status { get; set; } = string.Empty;
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ApplicationResponse
    {
        public int ApplicationId { get; set; }
        public int JobPostId { get; set; }
        public int EmployerId { get; set; }
        public string JobTitle { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime AppliedAt { get; set; }
        public string Location { get; set; } = string.Empty;
        public List<ApplicationHistoryDto> Histories { get; set; } = new();
    }

    public class EmployerApplicationResponse
    {
        public int ApplicationId { get; set; }
        public int JobPostId { get; set; }
        public string JobTitle { get; set; } = string.Empty;
        public int ApplicantId { get; set; }
        public string ApplicantName { get; set; } = string.Empty;
        public string ApplicantEmail { get; set; } = string.Empty;
        public string? ApplicantMajor { get; set; }
        public string? StudyYear { get; set; }
        public string? CoverMessage { get; set; }
        public string? CvUrl { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime AppliedAt { get; set; }
        public List<ApplicationHistoryDto> Histories { get; set; } = new();
    }
}

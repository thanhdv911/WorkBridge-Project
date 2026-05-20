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
    }

    public class ApplicationStatusUpdateResult
    {
        public bool Success { get; set; }
        public string? Error { get; set; }
        public string? Status { get; set; }
        public int? ConversationContactId { get; set; }
        public string? ConversationContactName { get; set; }
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
        public bool CanMessage { get; set; }
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
        public bool CanMessage { get; set; }
        public string? University { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? AboutMe { get; set; }
        public string? Availability { get; set; }
        public double AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public List<string> Skills { get; set; } = new();
        public List<ApplicantExperienceSummary> Experiences { get; set; } = new();
        public List<ApplicantReviewSummary> RecentReviews { get; set; } = new();
    }

    public class ApplicantExperienceSummary
    {
        public string Title { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public string? Duration { get; set; }
        public string? Description { get; set; }
    }

    public class ApplicantReviewSummary
    {
        public string ReviewerName { get; set; } = string.Empty;
        public string JobTitle { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}

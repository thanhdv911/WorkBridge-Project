namespace WorkBridge.Application.DTOs
{
    public class CreateInterviewRequest
    {
        public int ApplicationId { get; set; }
        public DateTime ScheduledAt { get; set; }
        public string Location { get; set; } = string.Empty;
        public string? Note { get; set; }
    }

    public class CreateChatInterviewRequest : CreateInterviewRequest
    {
        public int ContactId { get; set; }
    }

    public class UpdateInterviewStatusRequest
    {
        public string Status { get; set; } = string.Empty;
        public string? Note { get; set; }
    }

    public class UpdateInterviewResultRequest
    {
        public string Result { get; set; } = string.Empty;
        public string? Note { get; set; }
        public int? BranchId { get; set; }
        public string? Position { get; set; }
        public decimal? HourlyRate { get; set; }
        public DateTime? StartDate { get; set; }
        public int? PaydayOfMonth { get; set; }
    }

    public class InterviewResponse
    {
        public int InterviewId { get; set; }
        public int ApplicationId { get; set; }
        public int EmployerId { get; set; }
        public int ApplicantId { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public string ApplicantName { get; set; } = string.Empty;
        public string JobTitle { get; set; } = string.Empty;
        public DateTime ScheduledAt { get; set; }
        public string Location { get; set; } = string.Empty;
        public string? Note { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Result { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public bool CanEmployerMarkResult { get; set; }
        public string ApplicationStatus { get; set; } = string.Empty;
        public string? OfferStatus { get; set; }
        public bool HasSentOffer { get; set; }
        public bool HasAcceptedOffer { get; set; }
        public bool IsEmployee { get; set; }
    }

    public class InterviewChatApplicationResponse
    {
        public int ApplicationId { get; set; }
        public int JobPostId { get; set; }
        public string JobTitle { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime AppliedAt { get; set; }
        public string? OfferStatus { get; set; }
        public bool HasSentOffer { get; set; }
        public bool HasAcceptedOffer { get; set; }
        public bool IsEmployee { get; set; }
    }
}

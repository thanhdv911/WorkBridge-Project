using System;

namespace WorkBridge.Application.DTOs
{
    public class ApplicantProfileResponse
    {
        public int UserId { get; set; }
        public string Email { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string? AvatarUrl { get; set; }
        public DateTime? CreatedAt { get; set; }

        // From ApplicantProfile
        public string? University { get; set; }
        public string? Major { get; set; }
        public string? StudyYear { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? AboutMe { get; set; }
        public string? Availability { get; set; }
        public string? CvUrl { get; set; }
        public int ReputationScore { get; set; }
        public int ReportCount { get; set; }
    }

    public class UpdateApplicantProfileRequest
    {
        public string FullName { get; set; } = null!;
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? AboutMe { get; set; }
        public string? University { get; set; }
        public string? Major { get; set; }
        public string? StudyYear { get; set; }
        public string? Availability { get; set; }
    }

    public class SaveGeneratedCvRequest
    {
        public string? FullName { get; set; }
        public string? ContactLine { get; set; }
        public string? Headline { get; set; }
        public string? Summary { get; set; }
        public string? Skills { get; set; }
        public string? Experience { get; set; }
        public string? Education { get; set; }
        public string? Projects { get; set; }
        public string? Achievements { get; set; }
        public string? Availability { get; set; }
        public string? Additional { get; set; }
    }
}

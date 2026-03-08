using System;

namespace WorkBridge.API.DTOs
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
}

using System;
using System.Collections.Generic;

namespace WorkBridge.Application.DTOs
{
    public class EndorseSkillRequest
    {
        public int ApplicantId { get; set; }
        public List<string> Skills { get; set; } = new List<string>();
    }

    public class BadgeDto
    {
        public int BadgeId { get; set; }
        public string BadgeName { get; set; } = string.Empty;
        public string? IconClass { get; set; }
        public string? Description { get; set; }
        public DateTime? EarnedAt { get; set; }
    }

    public class SkillDto
    {
        public string SkillName { get; set; } = string.Empty;
        public int EndorsementCount { get; set; }
    }

    public class PracticalCvResponse
    {
        public int ApplicantId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Major { get; set; } = string.Empty;
        public string University { get; set; } = string.Empty;
        
        public int TotalJobsCompleted { get; set; }
        public int TotalHoursWorked { get; set; }
        public double AverageRating { get; set; }
        
        public List<SkillDto> TopSkills { get; set; } = new List<SkillDto>();
        public List<BadgeDto> EarnedBadges { get; set; } = new List<BadgeDto>();
        public List<ExperienceDto> Experiences { get; set; } = new List<ExperienceDto>();
    }

    public class ExperienceDto
    {
        public string JobTitle { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public int TotalHours { get; set; }
    }
}

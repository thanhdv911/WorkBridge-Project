using System;

namespace WorkBridge.Application.DTOs
{
    public class EmployerProfileResponse
    {
        public int EmployerId { get; set; }
        public string Email { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string CompanyName { get; set; } = null!;
        public string ContactEmail { get; set; } = null!;
        public string? ContactPhone { get; set; }
        public string? Address { get; set; }
        public string? Description { get; set; }
        public string? LogoUrl { get; set; }
        public int ReputationScore { get; set; }
        public int ReportCount { get; set; }
        public string Status { get; set; } = null!;
    }

    public class UpdateEmployerProfileRequest
    {
        public string CompanyName { get; set; } = null!;
        public string ContactEmail { get; set; } = null!;
        public string? ContactPhone { get; set; }
        public string? Address { get; set; }
        public string? Description { get; set; }
        public string? LogoUrl { get; set; }
    }

    public class CreateJobRequest
    {
        public int CategoryId { get; set; }
        public int? BranchId { get; set; }
        public string Title { get; set; } = null!;
        public string JobType { get; set; } = null!;
        public decimal? PayRate { get; set; }
        public string PayUnit { get; set; } = null!;
        public string? City { get; set; }
        public string? District { get; set; }
        public string Address { get; set; } = null!;
        public DateTime? ApplicationDeadline { get; set; }
        public string? Position { get; set; }
        public int? Vacancies { get; set; }
        public string Description { get; set; } = null!;
        public string? Requirements { get; set; }
        public string? Benefits { get; set; }
        public List<int>? ShiftIds { get; set; }
    }

    public class EmployerDashboardStats
    {
        public int JobPostCount { get; set; }
        public int TotalApplications { get; set; }
        public int SuitablePercentage { get; set; }
        public double Rating { get; set; }
        public int ReputationScore { get; set; }
    }
}

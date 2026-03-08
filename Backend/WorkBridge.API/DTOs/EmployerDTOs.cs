using System;

namespace WorkBridge.API.DTOs
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
        public string Title { get; set; } = null!;
        public string JobType { get; set; } = null!;
        public decimal? PayRate { get; set; }
        public string PayUnit { get; set; } = null!;
        public string? City { get; set; }
        public string? District { get; set; }
        public string Address { get; set; } = null!;
        public DateTime? ApplicationDeadline { get; set; }
        public string Description { get; set; } = null!;
        public string? Requirements { get; set; }
        public string? Benefits { get; set; }
        public List<int>? ShiftIds { get; set; }
    }
}

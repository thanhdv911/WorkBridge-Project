using System;

namespace WorkBridge.API.DTOs
{
    public class JobResponse
    {
        public int JobPostId { get; set; }
        public int EmployerId { get; set; }
        public int CategoryId { get; set; }
        public string Title { get; set; } = null!;
        public string CompanyName { get; set; } = null!;
        public string? CompanyLogoUrl { get; set; }
        public string JobType { get; set; } = null!;
        public string Location { get; set; } = null!; // Combined City/District
        public decimal? PayRate { get; set; }
        public string PayUnit { get; set; } = null!;
        public string Description { get; set; } = null!;
        public string? Requirements { get; set; }
        public string? Benefits { get; set; }
        public DateTime? ApplicationDeadline { get; set; }
        public DateTime? CreatedAt { get; set; }
    }
}

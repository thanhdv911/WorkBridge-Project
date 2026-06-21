using System;

namespace WorkBridge.Application.DTOs
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
        public string Location { get; set; } = null!;
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public decimal? PayRate { get; set; }
        public string PayUnit { get; set; } = null!;
        public string Description { get; set; } = null!;
        public string? Requirements { get; set; }
        public string? Benefits { get; set; }
        public string? WorkingHours { get; set; }
        public DateTime? ApplicationDeadline { get; set; }
        public string? Position { get; set; }
        public int? Vacancies { get; set; }
        public string Status { get; set; } = null!;
        public DateTime? CreatedAt { get; set; }
        public bool IsFeatured { get; set; }
        public bool IsVipEmployer { get; set; }
        public int? BranchId { get; set; }
        public string? BranchName { get; set; }
        public int EmployerReputationScore { get; set; } = 100;
        public int EmployerReportCount { get; set; }
        public string EmployerStatus { get; set; } = "Active";
        public string? CompanyDescription { get; set; }
        public List<ShiftResponse> Shifts { get; set; } = new();
    }

    public class ShiftResponse
    {
        public int ShiftId { get; set; }
        public string ShiftName { get; set; } = null!;
        public string? StartTime { get; set; }
        public string? EndTime { get; set; }
    }

    public class PaginatedResponse<T>
    {
        public IEnumerable<T> Items { get; set; } = new List<T>();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
        public bool HasPreviousPage => PageNumber > 1;
        public bool HasNextPage => PageNumber < TotalPages;
    }
}

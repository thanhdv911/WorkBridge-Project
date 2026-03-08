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
        public string Location { get; set; } = null!; 
        public decimal? PayRate { get; set; }
        public string PayUnit { get; set; } = null!;
        public string Description { get; set; } = null!;
        public string? Requirements { get; set; }
        public string? Benefits { get; set; }
        public DateTime? ApplicationDeadline { get; set; }
        public string Status { get; set; } = null!;
        public DateTime? CreatedAt { get; set; }
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

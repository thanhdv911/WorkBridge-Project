using System;
using System.Collections.Generic;

namespace WorkBridge.Application.DTOs
{
    public class AdminUserResponse
    {
        public int UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string RoleName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int? ReputationScore { get; set; }
        public int? ReportCount { get; set; }
        public bool IsVip { get; set; }
        public int? VipSubscriptionId { get; set; }
        public int? VipPlanId { get; set; }
        public string? VipPlanName { get; set; }
        public string? VipAudience { get; set; }
        public DateTime? VipStartDate { get; set; }
        public DateTime? VipEndDate { get; set; }
        public int? VipDaysRemaining { get; set; }
        public DateTime? CreatedAt { get; set; }
    }

    public class AdminJobResponse
    {
        public int JobPostId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public string CategoryName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime? CreatedAt { get; set; }
    }

    public class AdminCategoryRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class AdminUpdateStatusRequest
    {
        public string NewStatus { get; set; } = string.Empty;
    }

    public class AdminUpdateReputationRequest
    {
        public int ReputationScore { get; set; }
    }

    public class AdminStatsResponse
    {
        public int TotalUsers { get; set; }
        public int TotalEmployers { get; set; }
        public int TotalApplicants { get; set; }
        public int TotalHired { get; set; }
        public int TotalJobs { get; set; }
        public int TotalApplications { get; set; }
        public double ApplicationSuccessRate { get; set; }
        public int NewUsersThisMonth { get; set; }
        public int NewJobsThisMonth { get; set; }
        public List<GrowthDataPoint> JobGrowth { get; set; } = new();
        public List<GrowthDataPoint> ApplicationGrowth { get; set; } = new();
    }

    public class GrowthDataPoint
    {
        public string Date { get; set; } = string.Empty;
        public int Count { get; set; }
    }
}

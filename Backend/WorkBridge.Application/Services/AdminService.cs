using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using WorkBridge.Application.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkBridge.Application.DTOs;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public class AdminService : IAdminService
    {
        private readonly IWorkBridgeContext _context;
        private readonly INotificationService _notificationService;

        public AdminService(IWorkBridgeContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        // User Management
        public async Task<IEnumerable<AdminUserResponse>> GetUsersAsync()
        {
            var now = DateTime.UtcNow;
            var users = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.ApplicantProfile)
                .Include(u => u.EmployerProfile)
                .OrderByDescending(u => u.CreatedAt)
                .ToListAsync();

            var userIds = users.Select(u => u.UserId).ToList();
            var activeSubscriptions = await _context.Subscriptions
                .Include(s => s.SubscriptionPlan)
                .Where(s => s.Status == "Active" &&
                            s.EndDate >= now &&
                            ((s.UserId.HasValue && userIds.Contains(s.UserId.Value)) ||
                             (s.EmployerId.HasValue && userIds.Contains(s.EmployerId.Value))))
                .ToListAsync();

            return users.Select(u =>
            {
                var roleName = u.Role.RoleName;
                var activeVip = activeSubscriptions
                    .Where(s => roleName == "Employer"
                        ? ((s.UserId == u.UserId && s.Audience == "Employer") || s.EmployerId == u.UserId)
                        : roleName == "Applicant" && s.UserId == u.UserId && s.Audience == "Applicant")
                    .OrderByDescending(s => s.EndDate)
                    .FirstOrDefault();

                return new AdminUserResponse
                {
                    UserId = u.UserId,
                    Email = u.Email,
                    FullName = u.FullName,
                    RoleName = roleName,
                    Status = u.Status,
                    ReputationScore = roleName == "Employer"
                        ? u.EmployerProfile != null ? u.EmployerProfile.ReputationScore : null
                        : roleName == "Applicant"
                            ? u.ApplicantProfile != null ? u.ApplicantProfile.ReputationScore : null
                            : null,
                    ReportCount = roleName == "Employer"
                        ? u.EmployerProfile != null ? u.EmployerProfile.ReportCount : null
                        : roleName == "Applicant"
                            ? u.ApplicantProfile != null ? u.ApplicantProfile.ReportCount : null
                            : null,
                    IsVip = activeVip != null,
                    VipSubscriptionId = activeVip?.SubscriptionId,
                    VipPlanId = activeVip?.SubscriptionPlanId,
                    VipPlanName = activeVip?.SubscriptionPlan?.Name ?? activeVip?.PlanName,
                    VipAudience = activeVip?.Audience,
                    VipStartDate = activeVip?.StartDate,
                    VipEndDate = activeVip?.EndDate,
                    VipDaysRemaining = activeVip != null ? (int)Math.Ceiling((activeVip.EndDate - now).TotalDays) : null,
                    CreatedAt = u.CreatedAt
                };
            }).ToList();
        }

        public async Task<bool> UpdateUserStatusAsync(int userId, string status)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return false;

            user.Status = status;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UpdateUserReputationAsync(int userId, int reputationScore)
        {
            var score = Math.Clamp(reputationScore, 0, 100);
            var user = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.ApplicantProfile)
                .Include(u => u.EmployerProfile)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null) return false;

            if (user.Role.RoleName == "Employer")
            {
                if (user.EmployerProfile == null) return false;

                user.EmployerProfile.ReputationScore = score;
            }
            else if (user.Role.RoleName == "Applicant")
            {
                if (user.ApplicantProfile == null) return false;

                user.ApplicantProfile.ReputationScore = score;
            }
            else
            {
                return false;
            }

            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        // Job Moderation
        public async Task<IEnumerable<AdminJobResponse>> GetJobsByStatusAsync(string? status)
        {
            var query = _context.JobPosts
                .Include(j => j.Employer)
                .Include(j => j.Category)
                .AsQueryable();

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(j => j.Status == status);
            }

            return await query
                .OrderByDescending(j => j.CreatedAt)
                .Select(j => new AdminJobResponse
                {
                    JobPostId = j.JobPostId,
                    Title = j.Title,
                    CompanyName = j.Employer.CompanyName,
                    CategoryName = j.Category.Name,
                    Status = j.Status,
                    CreatedAt = j.CreatedAt
                })
                .ToListAsync();
        }

        public async Task<bool> UpdateJobStatusAsync(int jobId, string status)
        {
            var job = await _context.JobPosts.FindAsync(jobId);
            if (job == null) return false;

            string oldStatus = job.Status;
            job.Status = status;
            job.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            if (oldStatus != status)
            {
                try
                {
                    string title = "";
                    string message = "";

                    if (status.Equals("Published", StringComparison.OrdinalIgnoreCase))
                    {
                        title = "Tin tuyển dụng đã được phê duyệt";
                        message = $"Tin tuyển dụng '{job.Title}' của bạn đã được kiểm duyệt và đăng tải thành công trên WorkBridge.";
                    }
                    else if (status.Equals("Rejected", StringComparison.OrdinalIgnoreCase))
                    {
                        title = "Tin tuyển dụng không được phê duyệt";
                        message = $"Tin tuyển dụng '{job.Title}' của bạn không được phê duyệt do chưa đáp ứng đủ tiêu chuẩn kiểm duyệt của hệ thống.";
                    }

                    if (!string.IsNullOrEmpty(title))
                    {
                        await _notificationService.CreateNotificationAsync(job.EmployerId, title, message);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error sending job status update notification: {ex.Message}");
                }
            }

            return true;
        }

        // Category Management
        public async Task<IEnumerable<AdminCategoryResponse>> GetCategoriesAsync()
        {
            return await _context.JobCategories
                .Select(c => new AdminCategoryResponse
                {
                    CategoryId = c.CategoryId,
                    Name = c.Name,
                    Description = c.Description
                })
                .ToListAsync();
        }

        public async Task<AdminCategoryResponse> CreateCategoryAsync(AdminCategoryRequest request)
        {
            var category = new JobCategory
            {
                Name = request.Name,
                Description = request.Description
            };

            await _context.JobCategories.AddAsync(category);
            await _context.SaveChangesAsync();

            return new AdminCategoryResponse
            {
                CategoryId = category.CategoryId,
                Name = category.Name,
                Description = category.Description
            };
        }

        public async Task<bool> UpdateCategoryAsync(int id, AdminCategoryRequest request)
        {
            var category = await _context.JobCategories.FindAsync(id);
            if (category == null) return false;

            category.Name = request.Name;
            category.Description = request.Description;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteCategoryAsync(int id)
        {
            var category = await _context.JobCategories.FindAsync(id);
            if (category == null) return false;

            // Optional: Check if any jobs use this category
            var hasJobs = await _context.JobPosts.AnyAsync(j => j.CategoryId == id);
            if (hasJobs) return false; // Or handle as needed

            _context.JobCategories.Remove(category);
            await _context.SaveChangesAsync();
            return true;
        }

        // Statistics
        public async Task<AdminStatsResponse> GetDashboardStatsAsync()
        {
            var now = DateTime.UtcNow;
            var startOfMonth = new DateTime(now.Year, now.Month, 1);
            var last30Days = now.AddDays(-30);

            // Fetch actual counts: RoleId 3 = Applicant/Student, RoleId 2 = Employer, Job Status Published & !IsDeleted
            var totalUsersAll = await _context.Users.CountAsync(u => !u.IsDeleted);
            var totalApplicants = await _context.Users.CountAsync(u => u.RoleId == 3 && !u.IsDeleted);
            var totalEmployers = await _context.Users.CountAsync(u => u.RoleId == 2 && !u.IsDeleted);
            var totalJobs = await _context.JobPosts.CountAsync(j => j.Status == "Published" && !j.IsDeleted);
            var totalApplications = await _context.Applications.CountAsync(a => !a.IsDeleted);

            var totalHired = await _context.Applications.CountAsync(a => (a.Status == "Hired" || a.Status == "Accepted") && !a.IsDeleted);
            var successRate = totalApplications > 0 ? (double)totalHired / totalApplications * 100 : 0;

            var newUsersThisMonth = await _context.Users.CountAsync(u => u.CreatedAt >= startOfMonth && !u.IsDeleted);
            var newJobsThisMonth = await _context.JobPosts.CountAsync(j => j.CreatedAt >= startOfMonth && !j.IsDeleted);

            // Growth data for last 30 days
            var jobGrowthRaw = await _context.JobPosts
                .Where(j => j.CreatedAt >= last30Days && !j.IsDeleted)
                .Select(j => j.CreatedAt!.Value.Date)
                .ToListAsync();

            var jobGrowth = jobGrowthRaw
                .GroupBy(d => d)
                .Select(g => new GrowthDataPoint
                {
                    Date = g.Key.ToString("MM/dd"),
                    Count = g.Count()
                })
                .OrderBy(g => g.Date)
                .ToList();

            var appGrowthRaw = await _context.Applications
                .Where(a => a.AppliedAt >= last30Days && !a.IsDeleted)
                .Select(a => a.AppliedAt!.Value.Date)
                .ToListAsync();

            var appGrowth = appGrowthRaw
                .GroupBy(d => d)
                .Select(g => new GrowthDataPoint
                {
                    Date = g.Key.ToString("MM/dd"),
                    Count = g.Count()
                })
                .OrderBy(g => g.Date)
                .ToList();

            return new AdminStatsResponse
            {
                TotalUsers = totalUsersAll,
                TotalEmployers = totalEmployers,
                TotalApplicants = totalApplicants,
                TotalHired = totalHired,
                TotalJobs = totalJobs,
                TotalApplications = totalApplications,
                ApplicationSuccessRate = Math.Round(successRate, 1),
                NewUsersThisMonth = newUsersThisMonth,
                NewJobsThisMonth = newJobsThisMonth,
                JobGrowth = jobGrowth,
                ApplicationGrowth = appGrowth
            };
        }

        // Report Management
        public async Task<IEnumerable<AdminReportResponse>> GetReportsAsync()
        {
            var reports = await _context.Reports
                .Include(r => r.Reporter)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            var result = new List<AdminReportResponse>();

            foreach (var r in reports)
            {
                string entityTitle = "Unknown";
                if (r.EntityType == "Job")
                {
                    entityTitle = (await _context.JobPosts.FindAsync(r.ReportedEntityId))?.Title ?? "Deleted Job";
                }
                else if (r.EntityType == "Employer")
                {
                    entityTitle = (await _context.EmployerProfiles.FindAsync(r.ReportedEntityId))?.CompanyName ?? "Deleted Employer";
                }
                else if (r.EntityType == "Applicant")
                {
                    entityTitle = (await _context.Users.FindAsync(r.ReportedEntityId))?.FullName ?? "Deleted Applicant";
                }
                else if (r.EntityType == "User")
                {
                    entityTitle = (await _context.Users.FindAsync(r.ReportedEntityId))?.FullName ?? "Deleted User";
                }

                result.Add(new AdminReportResponse
                {
                    ReportId = r.ReportId,
                    ReporterName = r.Reporter?.FullName ?? "Deleted User",
                    ReportedEntityId = r.ReportedEntityId,
                    EntityType = r.EntityType,
                    EntityTitle = entityTitle,
                    Reason = r.Reason,
                    Description = r.Description,
                    Status = r.Status,
                    CreatedAt = r.CreatedAt
                });
            }

            return result;
        }

        public async Task<bool> UpdateReportStatusAsync(int reportId, string status)
        {
            var report = await _context.Reports.FindAsync(reportId);
            if (report == null) return false;

            report.Status = status;
            await _context.SaveChangesAsync();
            return true;
        }
    }
}

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

        public AdminService(IWorkBridgeContext context)
        {
            _context = context;
        }

        // User Management
        public async Task<IEnumerable<AdminUserResponse>> GetUsersAsync()
        {
            return await _context.Users
                .Include(u => u.Role)
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new AdminUserResponse
                {
                    UserId = u.UserId,
                    Email = u.Email,
                    FullName = u.FullName,
                    RoleName = u.Role.RoleName,
                    Status = u.Status,
                    CreatedAt = u.CreatedAt
                })
                .ToListAsync();
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

            job.Status = status;
            job.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
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
                    IconName = c.IconName,
                    Description = c.Description
                })
                .ToListAsync();
        }

        public async Task<AdminCategoryResponse> CreateCategoryAsync(AdminCategoryRequest request)
        {
            var category = new JobCategory
            {
                Name = request.Name,
                IconName = request.IconName,
                Description = request.Description
            };

            await _context.JobCategories.AddAsync(category);
            await _context.SaveChangesAsync();

            return new AdminCategoryResponse
            {
                CategoryId = category.CategoryId,
                Name = category.Name,
                IconName = category.IconName,
                Description = category.Description
            };
        }

        public async Task<bool> UpdateCategoryAsync(int id, AdminCategoryRequest request)
        {
            var category = await _context.JobCategories.FindAsync(id);
            if (category == null) return false;

            category.Name = request.Name;
            category.IconName = request.IconName;
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

            var totalUsers = await _context.Users.CountAsync();
            var totalJobs = await _context.JobPosts.CountAsync();
            var totalApplications = await _context.Applications.CountAsync();

            var acceptedApps = await _context.Applications.CountAsync(a => a.Status == "Accepted");
            var successRate = totalApplications > 0 ? (double)acceptedApps / totalApplications * 100 : 0;

            var newUsersThisMonth = await _context.Users.CountAsync(u => u.CreatedAt >= startOfMonth);
            var newJobsThisMonth = await _context.JobPosts.CountAsync(j => j.CreatedAt >= startOfMonth);

            // Growth data for last 30 days
            var jobGrowthRaw = await _context.JobPosts
                .Where(j => j.CreatedAt >= last30Days)
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
                .Where(a => a.AppliedAt >= last30Days)
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
                TotalUsers = totalUsers,
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
                else if (r.EntityType == "User")
                {
                    entityTitle = (await _context.Users.FindAsync(r.ReportedEntityId))?.FullName ?? "Deleted User";
                }

                result.Add(new AdminReportResponse
                {
                    ReportId = r.ReportId,
                    ReporterName = r.Reporter.FullName,
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

using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using WorkBridge.Application.Interfaces;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkBridge.Application.DTOs;

namespace WorkBridge.Application.Services
{
    public interface IAdminService
    {
        // User Management
        Task<IEnumerable<AdminUserResponse>> GetUsersAsync();
        Task<bool> UpdateUserStatusAsync(int userId, string status);

        // Job Moderation
        Task<IEnumerable<AdminJobResponse>> GetJobsByStatusAsync(string? status);
        Task<bool> UpdateJobStatusAsync(int jobId, string status);

        // Category Management
        Task<IEnumerable<AdminCategoryResponse>> GetCategoriesAsync();
        Task<AdminCategoryResponse> CreateCategoryAsync(AdminCategoryRequest request);
        Task<bool> UpdateCategoryAsync(int id, AdminCategoryRequest request);
        Task<bool> DeleteCategoryAsync(int id);

        // Statistics
        Task<AdminStatsResponse> GetDashboardStatsAsync();

        // Report Management
        Task<IEnumerable<AdminReportResponse>> GetReportsAsync();
        Task<bool> UpdateReportStatusAsync(int reportId, string status);
    }

    public class AdminCategoryResponse
    {
        public int CategoryId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }
}

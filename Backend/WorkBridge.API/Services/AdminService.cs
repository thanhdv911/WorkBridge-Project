using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkBridge.API.DTOs;
using WorkBridge.Infrastructure.Models;

namespace WorkBridge.API.Services
{
    public class AdminService : IAdminService
    {
        private readonly WorkBridgeContext _context;

        public AdminService(WorkBridgeContext context)
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
    }
}

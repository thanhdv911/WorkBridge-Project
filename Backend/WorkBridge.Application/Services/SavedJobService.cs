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
    public class SavedJobService : ISavedJobService
    {
        private readonly IWorkBridgeContext _context;

        public SavedJobService(IWorkBridgeContext context)
        {
            _context = context;
        }

        public async Task<bool> SaveJobAsync(int userId, int jobId)
        {
            // Check if job exists and not deleted
            var job = await _context.JobPosts.FirstOrDefaultAsync(j => j.JobPostId == jobId && !j.IsDeleted);
            if (job == null) return false;

            // Check if already saved
            var existing = await _context.SavedJobs.FirstOrDefaultAsync(s => s.ApplicantId == userId && s.JobPostId == jobId);
            if (existing != null) return true; // Already saved

            var savedJob = new SavedJob
            {
                ApplicantId = userId,
                JobPostId = jobId,
                SavedAt = DateTime.UtcNow
            };

            _context.SavedJobs.Add(savedJob);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UnsaveJobAsync(int userId, int jobId)
        {
            var savedJob = await _context.SavedJobs.FirstOrDefaultAsync(s => s.ApplicantId == userId && s.JobPostId == jobId);
            if (savedJob == null) return false;

            _context.SavedJobs.Remove(savedJob);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<JobResponse>> GetSavedJobsAsync(int userId)
        {
            return await _context.SavedJobs
                .Include(s => s.JobPost)
                    .ThenInclude(j => j.Employer)
                .Where(s => s.ApplicantId == userId && !s.JobPost.IsDeleted)
                .OrderByDescending(s => s.SavedAt)
                .Select(s => new JobResponse
                {
                    JobPostId = s.JobPost.JobPostId,
                    EmployerId = s.JobPost.EmployerId,
                    CategoryId = s.JobPost.CategoryId,
                    Title = s.JobPost.Title,
                    CompanyName = s.JobPost.Employer != null ? s.JobPost.Employer.CompanyName : "Unknown",
                    CompanyLogoUrl = s.JobPost.Employer != null ? s.JobPost.Employer.LogoUrl : null,
                    Location = (!string.IsNullOrEmpty(s.JobPost.District) ? s.JobPost.District + ", " : "") + (s.JobPost.City ?? "Unknown Location"),
                    JobType = s.JobPost.JobType,
                    PayRate = s.JobPost.PayRate,
                    PayUnit = s.JobPost.PayUnit,
                    Description = s.JobPost.Description,
                    Requirements = s.JobPost.Requirements,
                    Benefits = s.JobPost.Benefits,
                    WorkingHours = s.JobPost.WorkingHours,
                    Status = s.JobPost.Status,
                    CreatedAt = s.JobPost.CreatedAt,
                    IsFeatured = s.JobPost.IsFeatured,
                    ApplicationDeadline = s.JobPost.ApplicationDeadline,
                    Position = s.JobPost.Position,
                    Vacancies = s.JobPost.Vacancies
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<int>> GetSavedJobIdsAsync(int userId)
        {
            return await _context.SavedJobs
                .Where(s => s.ApplicantId == userId)
                .Select(s => s.JobPostId)
                .ToListAsync();
        }
    }
}

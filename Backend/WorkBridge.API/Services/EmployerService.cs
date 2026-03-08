using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkBridge.API.DTOs;
using WorkBridge.Infrastructure.Models;

namespace WorkBridge.API.Services
{
    public class EmployerService : IEmployerService
    {
        private readonly WorkBridgeContext _context;

        public EmployerService(WorkBridgeContext context)
        {
            _context = context;
        }

        public async Task<EmployerProfileResponse> GetProfileAsync(int userId)
        {
            var user = await _context.Users
                .Include(u => u.EmployerProfile)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null || user.EmployerProfile == null)
            {
                return new EmployerProfileResponse
                {
                    EmployerId = 0,
                    Email = user?.Email ?? "",
                    FullName = user?.FullName ?? "",
                    CompanyName = user?.FullName ?? "", // Fallback
                    ContactEmail = user?.Email ?? ""
                };
            }

            var profile = user.EmployerProfile;
            return new EmployerProfileResponse
            {
                EmployerId = profile.EmployerId,
                Email = user.Email,
                FullName = user.FullName,
                CompanyName = profile.CompanyName,
                ContactEmail = profile.ContactEmail,
                ContactPhone = profile.ContactPhone,
                Address = profile.Address,
                Description = profile.Description,
                LogoUrl = profile.LogoUrl
            };
        }

        public async Task<EmployerProfileResponse> UpdateProfileAsync(int userId, UpdateEmployerProfileRequest request)
        {
            var user = await _context.Users
                .Include(u => u.EmployerProfile)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null)
                throw new Exception("User not found");

            if (user.EmployerProfile == null)
            {
                // Create new profile
                user.EmployerProfile = new EmployerProfile
                {
                    CompanyName = request.CompanyName,
                    ContactEmail = request.ContactEmail,
                    ContactPhone = request.ContactPhone,
                    Address = request.Address,
                    Description = request.Description,
                    LogoUrl = request.LogoUrl
                };
                _context.EmployerProfiles.Add(user.EmployerProfile);
            }
            else
            {
                // Update existing
                user.EmployerProfile.CompanyName = request.CompanyName;
                user.EmployerProfile.ContactEmail = request.ContactEmail;
                user.EmployerProfile.ContactPhone = request.ContactPhone;
                user.EmployerProfile.Address = request.Address;
                user.EmployerProfile.Description = request.Description;
                user.EmployerProfile.LogoUrl = request.LogoUrl;
            }

            await _context.SaveChangesAsync();

            return await GetProfileAsync(userId);
        }

        public async Task<JobResponse> CreateJobAsync(int userId, CreateJobRequest request)
        {
            var profile = await _context.EmployerProfiles.FirstOrDefaultAsync(p => p.EmployerId == userId);
            
            if (profile == null)
            {
                throw new Exception("Employer profile is required before posting a job.");
            }

            var newJob = new JobPost
            {
                EmployerId = profile.EmployerId,
                CategoryId = request.CategoryId,
                Title = request.Title,
                JobType = request.JobType,
                PayRate = request.PayRate,
                PayUnit = request.PayUnit,
                City = request.City,
                District = request.District,
                Address = request.Address,
                ApplicationDeadline = request.ApplicationDeadline,
                Description = request.Description,
                Requirements = request.Requirements,
                Benefits = request.Benefits,
                Status = "Pending", // Require Admin approval
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.JobPosts.Add(newJob);

            if (request.ShiftIds != null && request.ShiftIds.Any())
            {
                var shifts = await _context.JobShifts
                    .Where(s => request.ShiftIds.Contains(s.ShiftId))
                    .ToListAsync();
                foreach (var shift in shifts)
                {
                    newJob.Shifts.Add(shift);
                }
            }

            await _context.SaveChangesAsync();

            // Return limited info or refetch with full details
            return new JobResponse
            {
                JobPostId = newJob.JobPostId,
                EmployerId = newJob.EmployerId,
                CategoryId = newJob.CategoryId,
                Title = newJob.Title,
                CompanyName = profile.CompanyName,
                Location = (!string.IsNullOrEmpty(newJob.District) ? newJob.District + ", " : "") + newJob.City,
                JobType = newJob.JobType,
                PayRate = newJob.PayRate,
                PayUnit = newJob.PayUnit,
                Description = newJob.Description,
                CreatedAt = newJob.CreatedAt
            };
        }

        public async Task<IEnumerable<JobResponse>> GetMyJobsAsync(int userId)
        {
            return await _context.JobPosts
                .Include(j => j.Employer)
                .Where(j => j.Employer.EmployerId == userId && !j.IsDeleted)
                .OrderByDescending(j => j.CreatedAt)
                .Select(j => new JobResponse
                {
                     JobPostId = j.JobPostId,
                     EmployerId = j.EmployerId,
                     CategoryId = j.CategoryId,
                     Title = j.Title,
                     CompanyName = j.Employer.CompanyName,
                     Location = (!string.IsNullOrEmpty(j.District) ? j.District + ", " : "") + j.City,
                     JobType = j.JobType,
                     PayRate = j.PayRate,
                     PayUnit = j.PayUnit,
                     Description = j.Description,
                     Status = j.Status,
                     CreatedAt = j.CreatedAt,
                     ApplicationDeadline = j.ApplicationDeadline
                })
                .ToListAsync();
        }

        public async Task<bool> UpdateJobStatusAsync(int userId, int jobId, string status)
        {
            var job = await _context.JobPosts
                .FirstOrDefaultAsync(j => j.JobPostId == jobId && j.EmployerId == userId && !j.IsDeleted);

            if (job == null) return false;

            job.Status = status;
            await _context.SaveChangesAsync();
            return true;
        }
    }
}

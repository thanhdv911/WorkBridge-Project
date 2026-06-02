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
    public class EmployerService : IEmployerService
    {
        private const int StandardEmployerJobLimit = 2;
        private readonly IWorkBridgeContext _context;

        public EmployerService(IWorkBridgeContext context)
        {
            _context = context;
        }

        private Task<bool> HasActiveEmployerVipAsync(int employerId, DateTime now)
        {
            return _context.Subscriptions.AnyAsync(s =>
                s.Status == "Active" &&
                s.EndDate >= now &&
                (s.EmployerId == employerId || (s.UserId == employerId && s.Audience == "Employer")));
        }

        private Task<bool> HasActiveAnnualEmployerVipAsync(int employerId, DateTime now)
        {
            return _context.Subscriptions.AnyAsync(s =>
                s.Status == "Active" &&
                s.EndDate >= now &&
                (s.EmployerId == employerId || (s.UserId == employerId && s.Audience == "Employer")) &&
                ((s.SubscriptionPlan != null && s.SubscriptionPlan.DurationDays >= 365) ||
                 (s.SubscriptionPlan == null && s.PlanName.Contains("365"))));
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
                LogoUrl = profile.LogoUrl,
                ReputationScore = profile.ReputationScore,
                ReportCount = profile.ReportCount,
                Status = profile.Status ?? "Active"
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

            if (profile.Status == "Suspended" || profile.ReputationScore < 80)
            {
                throw new Exception("Doanh nghiệp của bạn đã bị tạm ngưng hoạt động do điểm uy tín quá thấp.");
            }

            // Enforce maximum 2 jobs posted for standard (non-VIP) employers
            var now = DateTime.UtcNow;
            var isVip = await HasActiveEmployerVipAsync(userId, now);
            var canAutoPublishJob = await HasActiveAnnualEmployerVipAsync(userId, now);

            if (!isVip)
            {
                var activeJobCount = await _context.JobPosts
                    .CountAsync(j => j.EmployerId == userId && !j.IsDeleted);

                if (activeJobCount >= StandardEmployerJobLimit)
                {
                    throw new Exception("Doanh nghiệp thường chỉ được đăng tối đa 2 tin tuyển dụng. Vui lòng nâng cấp VIP để đăng tuyển không giới hạn, có huy hiệu lửa và được ưu tiên hiển thị.");
                }
            }

            var newJob = new JobPost
            {
                EmployerId = profile.EmployerId,
                CategoryId = request.CategoryId,
                BranchId = request.BranchId,
                Title = request.Title,
                JobType = request.JobType,
                PayRate = request.PayRate,
                PayUnit = request.PayUnit,
                City = request.City,
                District = request.District,
                Address = request.Address,
                ApplicationDeadline = request.ApplicationDeadline,
                Position = request.Position,
                Vacancies = request.Vacancies,
                Description = request.Description,
                Requirements = request.Requirements,
                Benefits = request.Benefits,
                Status = canAutoPublishJob ? "Published" : "Pending",
                IsDeleted = false,
                IsFeatured = isVip,
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
                Address = newJob.Address,
                City = newJob.City,
                District = newJob.District,
                JobType = newJob.JobType,
                PayRate = newJob.PayRate,
                PayUnit = newJob.PayUnit,
                Description = newJob.Description,
                Status = newJob.Status,
                IsFeatured = newJob.IsFeatured,
                IsVipEmployer = isVip,
                CreatedAt = newJob.CreatedAt,
                Position = newJob.Position,
                Vacancies = newJob.Vacancies,
                BranchId = newJob.BranchId,
                BranchName = newJob.BranchId.HasValue ? _context.Branches.FirstOrDefault(b => b.BranchId == newJob.BranchId.Value)?.Name : null
            };
        }

        public async Task<IEnumerable<JobResponse>> GetMyJobsAsync(int userId)
        {
            var isVip = await _context.Subscriptions
                .AnyAsync(s => s.EmployerId == userId && s.Status == "Active" && s.EndDate >= DateTime.UtcNow);

            return await _context.JobPosts
                .Include(j => j.Employer)
                .Include(j => j.Branch)
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
                     Address = j.Address,
                     City = j.City,
                     District = j.District,
                     JobType = j.JobType,
                     PayRate = j.PayRate,
                     PayUnit = j.PayUnit,
                     Description = j.Description,
                     Status = j.Status,
                     CreatedAt = j.CreatedAt,
                     IsFeatured = j.IsFeatured || isVip,
                     IsVipEmployer = isVip,
                     ApplicationDeadline = j.ApplicationDeadline,
                     Position = j.Position,
                     Vacancies = j.Vacancies,
                     BranchId = j.BranchId,
                     BranchName = j.Branch != null ? j.Branch.Name : null
                })
                .ToListAsync();
        }

        public async Task<JobResponse> UpdateJobAsync(int userId, int jobId, CreateJobRequest request)
        {
            var profile = await _context.EmployerProfiles.FirstOrDefaultAsync(p => p.EmployerId == userId);
            if (profile == null)
            {
                throw new Exception("Employer profile is required before updating a job.");
            }

            if (profile.Status == "Suspended" || profile.ReputationScore < 80)
            {
                throw new Exception("Doanh nghiệp của bạn đã bị tạm ngưng hoạt động do điểm uy tín quá thấp.");
            }

            var job = await _context.JobPosts
                .Include(j => j.Shifts)
                .FirstOrDefaultAsync(j => j.JobPostId == jobId && j.EmployerId == profile.EmployerId && !j.IsDeleted);

            if (job == null)
            {
                throw new Exception("Job post not found or access denied.");
            }

            job.CategoryId = request.CategoryId;
            job.BranchId = request.BranchId;
            job.Title = request.Title;
            job.JobType = request.JobType;
            job.PayRate = request.PayRate;
            job.PayUnit = request.PayUnit;
            job.City = request.City;
            job.District = request.District;
            job.Address = request.Address;
            job.ApplicationDeadline = request.ApplicationDeadline;
            job.Position = request.Position;
            job.Vacancies = request.Vacancies;
            job.Description = request.Description;
            job.Requirements = request.Requirements;
            job.Benefits = request.Benefits;
            var now = DateTime.UtcNow;
            var isVip = await HasActiveEmployerVipAsync(userId, now);
            var canAutoPublishJob = await HasActiveAnnualEmployerVipAsync(userId, now);

            job.Status = canAutoPublishJob ? "Published" : "Pending";
            job.IsFeatured = job.IsFeatured || isVip;
            job.UpdatedAt = now;

            // Update Shifts
            job.Shifts.Clear();
            if (request.ShiftIds != null && request.ShiftIds.Any())
            {
                var shifts = await _context.JobShifts
                    .Where(s => request.ShiftIds.Contains(s.ShiftId))
                    .ToListAsync();
                foreach (var shift in shifts)
                {
                    job.Shifts.Add(shift);
                }
            }

            await _context.SaveChangesAsync();

            return new JobResponse
            {
                JobPostId = job.JobPostId,
                EmployerId = job.EmployerId,
                CategoryId = job.CategoryId,
                Title = job.Title,
                CompanyName = profile.CompanyName,
                Location = (!string.IsNullOrEmpty(job.District) ? job.District + ", " : "") + job.City,
                Address = job.Address,
                City = job.City,
                District = job.District,
                JobType = job.JobType,
                PayRate = job.PayRate,
                PayUnit = job.PayUnit,
                Description = job.Description,
                Status = job.Status,
                IsFeatured = job.IsFeatured,
                IsVipEmployer = isVip,
                CreatedAt = job.CreatedAt,
                Position = job.Position,
                Vacancies = job.Vacancies,
                BranchId = job.BranchId,
                BranchName = job.BranchId.HasValue ? _context.Branches.FirstOrDefault(b => b.BranchId == job.BranchId.Value)?.Name : null
            };
        }

        public async Task<bool> UpdateJobStatusAsync(int userId, int jobId, string status)
        {
            var job = await _context.JobPosts
                .FirstOrDefaultAsync(j => j.JobPostId == jobId && j.EmployerId == userId && !j.IsDeleted);

            if (job == null) return false;

            var profile = await _context.EmployerProfiles.FirstOrDefaultAsync(p => p.EmployerId == userId);
            if (profile != null && (profile.Status == "Suspended" || profile.ReputationScore < 80))
            {
                throw new Exception("Doanh nghiệp của bạn đã bị tạm ngưng hoạt động do điểm uy tín quá thấp.");
            }

            var now = DateTime.UtcNow;
            var canAutoPublishJob = await HasActiveAnnualEmployerVipAsync(userId, now);
            if (status == "Published" && (job.Status == "Pending" || job.Status == "Rejected") && !canAutoPublishJob)
            {
                throw new Exception("Tin tuyển dụng này đang cần admin phê duyệt trước khi đăng.");
            }

            job.Status = status;
            job.UpdatedAt = now;
            if (await HasActiveEmployerVipAsync(userId, now))
            {
                job.IsFeatured = true;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<EmployerDashboardStats> GetDashboardStatsAsync(int userId)
        {
            var profile = await _context.EmployerProfiles.FirstOrDefaultAsync(p => p.EmployerId == userId);
            var reputationScore = profile?.ReputationScore ?? 100;

            var jobPostCount = await _context.JobPosts
                .CountAsync(j => j.EmployerId == userId && !j.IsDeleted);

            var totalApplications = await _context.Applications
                .CountAsync(a => a.JobPost.EmployerId == userId && !a.IsDeleted);

            int suitablePercentage = 0;
            if (totalApplications > 0)
            {
                var suitableCount = await _context.Applications
                    .CountAsync(a => a.JobPost.EmployerId == userId && !a.IsDeleted &&
                        (a.Status == "Accepted" || a.Status == "Hired" || a.Status == "Interviewing" || a.Status == "Interview Passed"));

                suitablePercentage = (suitableCount * 100) / totalApplications;
            }

            var reviews = await _context.Reviews
                .Where(r => r.RevieweeId == userId)
                .ToListAsync();
            double rating = reviews.Any() ? Math.Round(reviews.Average(r => r.Rating), 1) : 5.0;

            return new EmployerDashboardStats
            {
                JobPostCount = jobPostCount,
                TotalApplications = totalApplications,
                SuitablePercentage = suitablePercentage,
                Rating = rating,
                ReputationScore = reputationScore
            };
        }
    }
}

using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkBridge.API.DTOs;
using WorkBridge.Infrastructure.Models;

namespace WorkBridge.API.Services
{
    public class ApplicationService : IApplicationService
    {
        private readonly WorkBridgeContext _context;

        public ApplicationService(WorkBridgeContext context)
        {
            _context = context;
        }

        public async Task<string?> ApplyForJobAsync(int userId, ApplyJobRequest request)
        {
            // Check if job exists and is published
            var job = await _context.JobPosts.FirstOrDefaultAsync(j => j.JobPostId == request.JobPostId && !j.IsDeleted);
            if (job == null) return "Job does not exist.";
            if (job.Status != "Published") return $"This job is not currently open for applications (Status: {job.Status}).";

            // Check if user has applicant profile
            var profile = await _context.ApplicantProfiles.FirstOrDefaultAsync(p => p.ApplicantId == userId);
            if (profile == null) return "Your profile is incomplete. Please complete your Applicant Profile before applying.";

            // Check if already applied
            var existingApplication = await _context.Applications.FirstOrDefaultAsync(a => a.JobPostId == request.JobPostId && a.ApplicantId == profile.ApplicantId);
            if (existingApplication != null) return "You have already applied for this job.";

            var application = new Application
            {
                JobPostId = request.JobPostId,
                ApplicantId = profile.ApplicantId,
                CoverMessage = request.CoverMessage,
                Status = "Pending",
                AppliedAt = System.DateTime.UtcNow
            };

            _context.Applications.Add(application);
            await _context.SaveChangesAsync();
            return null; // Success
        }

        public async Task<IEnumerable<ApplicationResponse>> GetMyApplicationsAsync(int userId)
        {
            return await _context.Applications
                .Include(a => a.JobPost)
                    .ThenInclude(j => j.Employer)
                .Where(a => a.ApplicantId == userId)
                .OrderByDescending(a => a.AppliedAt)
                .Select(a => new ApplicationResponse
                {
                    ApplicationId = a.ApplicationId,
                    JobPostId = a.JobPostId,
                    JobTitle = a.JobPost.Title,
                    CompanyName = a.JobPost.Employer.CompanyName,
                    Status = a.Status,
                    AppliedAt = a.AppliedAt.GetValueOrDefault(),
                    Location = (!string.IsNullOrEmpty(a.JobPost.District) ? a.JobPost.District + ", " : "") + a.JobPost.City
                })
                .ToListAsync();
        }
    }
}

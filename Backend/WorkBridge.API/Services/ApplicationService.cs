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
        private readonly INotificationService _notificationService;

        public ApplicationService(WorkBridgeContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<string?> ApplyForJobAsync(int userId, ApplyJobRequest request)
        {
            // Check if job exists and is published
            var job = await _context.JobPosts.FirstOrDefaultAsync(j => j.JobPostId == request.JobPostId && !j.IsDeleted);
            if (job == null) return "Job does not exist.";
            if (job.Status != "Published") return $"This job is not currently open for applications (Status: {job.Status}).";

            // Check if user has applicant profile
            var profile = await _context.ApplicantProfiles
                .Include(p => p.Applicant)
                .FirstOrDefaultAsync(p => p.ApplicantId == userId);
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

            // Notify Employer
            await _notificationService.CreateNotificationAsync(
                job.EmployerId,
                "New Job Application",
                $"Student {profile.Applicant?.FullName ?? "Someone"} has applied for your job: {job.Title}"
            );

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
                    EmployerId = a.JobPost.EmployerId,
                    JobTitle = a.JobPost.Title,
                    CompanyName = a.JobPost.Employer.CompanyName,
                    Status = a.Status,
                    AppliedAt = a.AppliedAt.GetValueOrDefault(),
                    Location = (!string.IsNullOrEmpty(a.JobPost.District) ? a.JobPost.District + ", " : "") + a.JobPost.City
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<EmployerApplicationResponse>> GetApplicationsForEmployerAsync(int employerId)
        {
            return await _context.Applications
                .Include(a => a.JobPost)
                .Include(a => a.Applicant)
                    .ThenInclude(p => p.Applicant) // Inner User
                .Where(a => a.JobPost.EmployerId == employerId && !a.IsDeleted)
                .OrderByDescending(a => a.AppliedAt)
                .Select(a => new EmployerApplicationResponse
                {
                    ApplicationId = a.ApplicationId,
                    JobPostId = a.JobPostId,
                    JobTitle = a.JobPost.Title,
                    ApplicantId = a.ApplicantId,
                    ApplicantName = a.Applicant.Applicant.FullName,
                    ApplicantEmail = a.Applicant.Applicant.Email,
                    ApplicantMajor = a.Applicant.Major,
                    StudyYear = a.Applicant.StudyYear,
                    CoverMessage = a.CoverMessage,
                    CvUrl = a.CvUrl,
                    Status = a.Status,
                    AppliedAt = a.AppliedAt.GetValueOrDefault()
                })
                .ToListAsync();
        }

        public async Task<bool> UpdateApplicationStatusAsync(int employerId, int applicationId, string status)
        {
            var application = await _context.Applications
                .Include(a => a.JobPost)
                .FirstOrDefaultAsync(a => a.ApplicationId == applicationId && a.JobPost.EmployerId == employerId && !a.IsDeleted);

            if (application == null) return false;

            application.Status = status;
            application.RespondedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();

            // Notify Applicant
            await _notificationService.CreateNotificationAsync(
                application.ApplicantId,
                "Application Status Update",
                $"Your application for '{application.JobPost.Title}' has been updated to: {status}"
            );

            return true;
        }
    }
}

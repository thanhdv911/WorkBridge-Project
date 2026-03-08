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

        public async Task<bool> ApplyForJobAsync(int userId, ApplyJobRequest request)
        {
            // Check if job exists and is published
            var job = await _context.JobPosts.FirstOrDefaultAsync(j => j.JobPostId == request.JobPostId && j.Status == "Published" && !j.IsDeleted);
            if (job == null) return false;

            // Check if user has applicant profile
            var profile = await _context.ApplicantProfiles.FirstOrDefaultAsync(p => p.ApplicantId == userId);
            if (profile == null) return false;

            // Check if already applied
            var existingApplication = await _context.Applications.FirstOrDefaultAsync(a => a.JobPostId == request.JobPostId && a.ApplicantId == profile.ApplicantId);
            if (existingApplication != null) return false; // Already applied

            var application = new Application
            {
                JobPostId = request.JobPostId,
                ApplicantId = profile.ApplicantId,
                CoverMessage = request.CoverMessage,
                Status = "Pending"
            };

            _context.Applications.Add(application);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}

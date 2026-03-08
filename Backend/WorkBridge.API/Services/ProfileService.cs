using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkBridge.API.DTOs;
using WorkBridge.Infrastructure.Models;

namespace WorkBridge.API.Services
{
    public class ProfileService : IProfileService
    {
        private readonly WorkBridgeContext _context;

        public ProfileService(WorkBridgeContext context)
        {
            _context = context;
        }

        public async Task<ApplicantProfileResponse?> GetApplicantProfileAsync(int userId)
        {
            var user = await _context.Users
                .Include(u => u.ApplicantProfile)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null || user.IsDeleted) return null;

            return new ApplicantProfileResponse
            {
                UserId = user.UserId,
                Email = user.Email,
                FullName = user.FullName,
                AvatarUrl = user.AvatarUrl,
                CreatedAt = user.CreatedAt,
                University = user.ApplicantProfile?.University,
                Major = user.ApplicantProfile?.Major,
                StudyYear = user.ApplicantProfile?.StudyYear,
                Phone = user.ApplicantProfile?.Phone,
                Address = user.ApplicantProfile?.Address,
                AboutMe = user.ApplicantProfile?.AboutMe,
                Availability = user.ApplicantProfile?.Availability
            };
        }

        public async Task<bool> UpdateApplicantProfileAsync(int userId, UpdateApplicantProfileRequest request)
        {
            var user = await _context.Users
                .Include(u => u.ApplicantProfile)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null || user.IsDeleted) return false;

            // Update cross-table fields
            user.FullName = request.FullName;
            user.UpdatedAt = System.DateTime.UtcNow;

            if (user.ApplicantProfile == null)
            {
                user.ApplicantProfile = new ApplicantProfile { ApplicantId = userId };
            }

            user.ApplicantProfile.Phone = request.Phone;
            user.ApplicantProfile.Address = request.Address;
            user.ApplicantProfile.AboutMe = request.AboutMe;
            user.ApplicantProfile.University = request.University;
            user.ApplicantProfile.Major = request.Major;
            user.ApplicantProfile.StudyYear = request.StudyYear;
            user.ApplicantProfile.Availability = request.Availability;

            await _context.SaveChangesAsync();
            return true;
        }
    }
}

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
                Availability = user.ApplicantProfile?.Availability,
                CvUrl = user.ApplicantProfile?.CvUrl
            };
        }

        public async Task<string?> UploadCvAsync(int userId, Microsoft.AspNetCore.Http.IFormFile file)
        {
            var user = await _context.Users
                .Include(u => u.ApplicantProfile)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null || user.IsDeleted) return null;

            if (user.ApplicantProfile == null)
            {
                user.ApplicantProfile = new ApplicantProfile { ApplicantId = userId };
            }

            // Ensure directory exists
            var uploadsFolder = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "wwwroot", "uploads", "cvs");
            if (!System.IO.Directory.Exists(uploadsFolder))
            {
                System.IO.Directory.CreateDirectory(uploadsFolder);
            }

            // Generate unique filename
            var fileName = $"CV_{userId}_{System.Guid.NewGuid()}{System.IO.Path.GetExtension(file.FileName)}";
            var filePath = System.IO.Path.Combine(uploadsFolder, fileName);

            // Save file
            using (var stream = new System.IO.FileStream(filePath, System.IO.FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Update DB
            var relativeUrl = $"/uploads/cvs/{fileName}";
            user.ApplicantProfile.CvUrl = relativeUrl;
            await _context.SaveChangesAsync();

            return relativeUrl;
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

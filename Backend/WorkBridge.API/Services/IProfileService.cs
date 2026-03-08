using System.Threading.Tasks;
using WorkBridge.API.DTOs;

namespace WorkBridge.API.Services
{
    public interface IProfileService
    {
        Task<ApplicantProfileResponse?> GetApplicantProfileAsync(int userId);
        Task<bool> UpdateApplicantProfileAsync(int userId, UpdateApplicantProfileRequest request);
        Task<string?> UploadCvAsync(int userId, Microsoft.AspNetCore.Http.IFormFile file);
    }
}

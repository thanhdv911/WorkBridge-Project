using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using WorkBridge.Application.Interfaces;
using System.Threading.Tasks;
using WorkBridge.Application.DTOs;

namespace WorkBridge.Application.Services
{
    public interface IProfileService
    {
        Task<ApplicantProfileResponse?> GetApplicantProfileAsync(int userId);
        Task<bool> UpdateApplicantProfileAsync(int userId, UpdateApplicantProfileRequest request);
        Task<string?> UploadCvAsync(int userId, Microsoft.AspNetCore.Http.IFormFile file);
    }
}

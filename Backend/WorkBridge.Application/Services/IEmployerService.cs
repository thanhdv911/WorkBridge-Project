using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using WorkBridge.Application.Interfaces;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkBridge.Application.DTOs;

namespace WorkBridge.Application.Services
{
    public interface IEmployerService
    {
        Task<EmployerProfileResponse> GetProfileAsync(int userId);
        Task<EmployerProfileResponse> UpdateProfileAsync(int userId, UpdateEmployerProfileRequest request);
        Task<JobResponse> CreateJobAsync(int userId, CreateJobRequest request);
        Task<JobResponse> UpdateJobAsync(int userId, int jobId, CreateJobRequest request);
        Task<IEnumerable<JobResponse>> GetMyJobsAsync(int userId);
        Task<bool> UpdateJobStatusAsync(int userId, int jobId, string status);
        Task<EmployerDashboardStats> GetDashboardStatsAsync(int userId);
        Task<string?> UploadLogoAsync(int userId, IFormFile file);
    }
}

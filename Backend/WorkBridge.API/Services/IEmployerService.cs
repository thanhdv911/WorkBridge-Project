using System.Collections.Generic;
using System.Threading.Tasks;
using WorkBridge.API.DTOs;

namespace WorkBridge.API.Services
{
    public interface IEmployerService
    {
        Task<EmployerProfileResponse> GetProfileAsync(int userId);
        Task<EmployerProfileResponse> UpdateProfileAsync(int userId, UpdateEmployerProfileRequest request);
        Task<JobResponse> CreateJobAsync(int userId, CreateJobRequest request);
        Task<IEnumerable<JobResponse>> GetMyJobsAsync(int userId);
    }
}

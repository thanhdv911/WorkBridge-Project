using System.Collections.Generic;
using System.Threading.Tasks;
using WorkBridge.API.DTOs;

namespace WorkBridge.API.Services
{
    public interface IJobService
    {
        Task<PaginatedResponse<JobResponse>> GetJobsAsync(string? keyword, string? location, decimal? minSalary, int pageNumber = 1, int pageSize = 10);
        Task<JobResponse?> GetJobByIdAsync(int id);
    }
}

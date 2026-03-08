using System.Collections.Generic;
using System.Threading.Tasks;
using WorkBridge.API.DTOs;

namespace WorkBridge.API.Services
{
    public interface IJobService
    {
        Task<IEnumerable<JobResponse>> GetJobsAsync(string? keyword, string? location, decimal? minSalary);
    }
}

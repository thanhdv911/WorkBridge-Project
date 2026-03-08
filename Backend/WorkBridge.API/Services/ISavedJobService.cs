using System.Collections.Generic;
using System.Threading.Tasks;
using WorkBridge.API.DTOs;

namespace WorkBridge.API.Services
{
    public interface ISavedJobService
    {
        Task<bool> SaveJobAsync(int userId, int jobId);
        Task<bool> UnsaveJobAsync(int userId, int jobId);
        Task<IEnumerable<JobResponse>> GetSavedJobsAsync(int userId);
        Task<IEnumerable<int>> GetSavedJobIdsAsync(int userId);
    }
}

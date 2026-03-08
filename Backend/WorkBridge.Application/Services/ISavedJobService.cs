using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using WorkBridge.Application.Interfaces;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkBridge.Application.DTOs;

namespace WorkBridge.Application.Services
{
    public interface ISavedJobService
    {
        Task<bool> SaveJobAsync(int userId, int jobId);
        Task<bool> UnsaveJobAsync(int userId, int jobId);
        Task<IEnumerable<JobResponse>> GetSavedJobsAsync(int userId);
        Task<IEnumerable<int>> GetSavedJobIdsAsync(int userId);
    }
}

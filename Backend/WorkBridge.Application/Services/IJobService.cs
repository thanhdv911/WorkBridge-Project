using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using WorkBridge.Application.Interfaces;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkBridge.Application.DTOs;

namespace WorkBridge.Application.Services
{
    public interface IJobService
    {
        Task<PaginatedResponse<JobResponse>> GetJobsAsync(string? keyword, string? location, decimal? minSalary, int pageNumber = 1, int pageSize = 10, int? categoryId = null);
        Task<JobResponse?> GetJobByIdAsync(int id);
    }
}

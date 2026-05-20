using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using WorkBridge.Application.Interfaces;
using System.Threading.Tasks;
using WorkBridge.Application.DTOs;

namespace WorkBridge.Application.Services
{
    public interface IApplicationService
    {
        Task<string?> ApplyForJobAsync(int userId, ApplyJobRequest request);
        Task<IEnumerable<ApplicationResponse>> GetMyApplicationsAsync(int userId);
        Task<IEnumerable<EmployerApplicationResponse>> GetApplicationsForEmployerAsync(int employerId);
        Task<ApplicationStatusUpdateResult> UpdateApplicationStatusAsync(int employerId, int applicationId, string status);
    }
}

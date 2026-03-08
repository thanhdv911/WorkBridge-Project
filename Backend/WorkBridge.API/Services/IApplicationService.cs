using System.Threading.Tasks;
using WorkBridge.API.DTOs;

namespace WorkBridge.API.Services
{
    public interface IApplicationService
    {
        Task<string?> ApplyForJobAsync(int userId, ApplyJobRequest request);
        Task<IEnumerable<ApplicationResponse>> GetMyApplicationsAsync(int userId);
        Task<IEnumerable<EmployerApplicationResponse>> GetApplicationsForEmployerAsync(int employerId);
        Task<bool> UpdateApplicationStatusAsync(int employerId, int applicationId, string status);
    }
}

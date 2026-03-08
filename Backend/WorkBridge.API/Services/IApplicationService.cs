using System.Threading.Tasks;
using WorkBridge.API.DTOs;

namespace WorkBridge.API.Services
{
    public interface IApplicationService
    {
        Task<bool> ApplyForJobAsync(int userId, ApplyJobRequest request);
    }
}

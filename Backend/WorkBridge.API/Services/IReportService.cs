using System.Threading.Tasks;
using WorkBridge.API.DTOs;

namespace WorkBridge.API.Services
{
    public interface IReportService
    {
        Task<bool> SubmitReportAsync(int reporterId, CreateReportRequest request);
    }
}

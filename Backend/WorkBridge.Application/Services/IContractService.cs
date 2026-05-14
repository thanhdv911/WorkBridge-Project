using System.Collections.Generic;
using System.Threading.Tasks;
using WorkBridge.Application.DTOs;

namespace WorkBridge.Application.Services
{
    public interface IContractService
    {
        Task<EContractResponse?> GetContractByApplicationAsync(int applicationId, int userId);
        Task<bool> SignContractAsync(int contractId, int applicantId);
        
        Task<DisputeResponse> CreateDisputeAsync(int userId, CreateDisputeRequest request);
        Task<IEnumerable<DisputeResponse>> GetMyDisputesAsync(int userId);
        Task<IEnumerable<DisputeResponse>> GetAllDisputesAsync();
    }
}

using WorkBridge.Application.DTOs;

namespace WorkBridge.Application.Services
{
    public interface IBranchService
    {
        Task<IEnumerable<BranchResponse>> GetBranchesAsync(int employerId);
        Task<BranchResponse?> CreateBranchAsync(int employerId, CreateBranchRequest request);
        Task<BranchResponse?> UpdateBranchAsync(int employerId, int branchId, CreateBranchRequest request);
    }
}

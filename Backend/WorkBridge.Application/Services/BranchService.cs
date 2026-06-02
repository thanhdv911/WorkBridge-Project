using Microsoft.EntityFrameworkCore;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Interfaces;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public class BranchService : IBranchService
    {
        private readonly IWorkBridgeContext _context;

        public BranchService(IWorkBridgeContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<BranchResponse>> GetBranchesAsync(int employerId)
        {
            return await _context.Branches
                .Where(b => b.EmployerId == employerId && b.IsActive)
                .OrderBy(b => b.Name)
                .Select(b => new BranchResponse
                {
                    BranchId = b.BranchId,
                    Name = b.Name,
                    Address = b.Address,
                    Phone = b.Phone,
                    IsActive = b.IsActive
                })
                .ToListAsync();
        }

        public async Task<BranchResponse?> CreateBranchAsync(int employerId, CreateBranchRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Address))
            {
                return null;
            }

            var branch = new Branch
            {
                EmployerId = employerId,
                Name = request.Name.Trim(),
                Address = request.Address.Trim(),
                Phone = request.Phone?.Trim(),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _context.Branches.AddAsync(branch);
            await _context.SaveChangesAsync();

            return new BranchResponse
            {
                BranchId = branch.BranchId,
                Name = branch.Name,
                Address = branch.Address,
                Phone = branch.Phone,
                IsActive = branch.IsActive
            };
        }

        public async Task<BranchResponse?> UpdateBranchAsync(int employerId, int branchId, CreateBranchRequest request)
        {
            var branch = await _context.Branches
                .FirstOrDefaultAsync(b => b.BranchId == branchId && b.EmployerId == employerId);

            if (branch == null || string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Address))
            {
                return null;
            }

            branch.Name = request.Name.Trim();
            branch.Address = request.Address.Trim();
            branch.Phone = request.Phone?.Trim();

            await _context.SaveChangesAsync();

            return new BranchResponse
            {
                BranchId = branch.BranchId,
                Name = branch.Name,
                Address = branch.Address,
                Phone = branch.Phone,
                IsActive = branch.IsActive
            };
        }

        public async Task<bool> DeleteBranchAsync(int employerId, int branchId)
        {
            var branch = await _context.Branches
                .FirstOrDefaultAsync(b => b.BranchId == branchId && b.EmployerId == employerId);

            if (branch == null)
            {
                return false;
            }

            var hasActiveEmployees = await _context.Employments.AnyAsync(e => e.BranchId == branchId && e.Status != "Ended");
            if (hasActiveEmployees)
            {
                throw new InvalidOperationException("Không thể xóa chi nhánh này vì vẫn còn nhân viên đang hoạt động. Vui lòng chuyển nhân viên sang chi nhánh khác hoặc chấm dứt hợp đồng trước.");
            }

            var hasReferences = await _context.Offers.AnyAsync(o => o.BranchId == branchId)
                || await _context.Employments.AnyAsync(e => e.BranchId == branchId)
                || await _context.WorkShifts.AnyAsync(w => w.BranchId == branchId)
                || await _context.ShiftRegistrationWindows.AnyAsync(s => s.BranchId == branchId)
                || await _context.ShiftPassRequests.AnyAsync(s => s.BranchId == branchId)
                || await _context.JobPosts.AnyAsync(j => j.BranchId == branchId);

            if (hasReferences)
            {
                branch.IsActive = false;
            }
            else
            {
                _context.Branches.Remove(branch);
            }

            await _context.SaveChangesAsync();
            return true;
        }
    }
}

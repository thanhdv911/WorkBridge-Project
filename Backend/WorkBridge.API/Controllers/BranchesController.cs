using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Services;

namespace WorkBridge.API.Controllers
{
    [Route("api/branches")]
    [ApiController]
    [Authorize(Roles = "Employer")]
    public class BranchesController : ControllerBase
    {
        private readonly IBranchService _branchService;

        public BranchesController(IBranchService branchService)
        {
            _branchService = branchService;
        }

        [HttpGet]
        public async Task<IActionResult> GetBranches()
        {
            var employerId = GetUserId();
            return Ok(await _branchService.GetBranchesAsync(employerId));
        }

        [HttpPost]
        public async Task<IActionResult> CreateBranch([FromBody] CreateBranchRequest request)
        {
            var employerId = GetUserId();
            var branch = await _branchService.CreateBranchAsync(employerId, request);
            if (branch == null) return BadRequest(new { message = "Vui lòng nhập tên chi nhánh và địa chỉ." });
            return Ok(branch);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateBranch(int id, [FromBody] CreateBranchRequest request)
        {
            var employerId = GetUserId();
            var branch = await _branchService.UpdateBranchAsync(employerId, id, request);
            if (branch == null) return NotFound(new { message = "Không tìm thấy chi nhánh hoặc dữ liệu không hợp lệ." });
            return Ok(branch);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBranch(int id)
        {
            var employerId = GetUserId();
            try
            {
                var result = await _branchService.DeleteBranchAsync(employerId, id);
                if (!result) return NotFound(new { message = "Không tìm thấy chi nhánh." });
                return Ok(new { message = "Đã xóa chi nhánh." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private int GetUserId()
        {
            return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }
    }
}

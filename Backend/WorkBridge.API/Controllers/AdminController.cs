using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using WorkBridge.API.DTOs;
using WorkBridge.API.Services;

namespace WorkBridge.API.Controllers
{
    [Authorize(Roles = "Admin")]
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;

        public AdminController(IAdminService adminService)
        {
            _adminService = adminService;
        }

        // Users
        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            return Ok(await _adminService.GetUsersAsync());
        }

        [HttpPatch("users/{id}/status")]
        public async Task<IActionResult> UpdateUserStatus(int id, [FromBody] AdminUpdateStatusRequest request)
        {
            var result = await _adminService.UpdateUserStatusAsync(id, request.NewStatus);
            if (!result) return NotFound("User not found.");
            return Ok(new { message = "User status updated successfully." });
        }

        // Jobs
        [HttpGet("jobs")]
        public async Task<IActionResult> GetJobs([FromQuery] string? status)
        {
            return Ok(await _adminService.GetJobsByStatusAsync(status));
        }

        [HttpPatch("jobs/{id}/status")]
        public async Task<IActionResult> UpdateJobStatus(int id, [FromBody] AdminUpdateStatusRequest request)
        {
            var result = await _adminService.UpdateJobStatusAsync(id, request.NewStatus);
            if (!result) return NotFound("Job not found.");
            return Ok(new { message = "Job status updated successfully." });
        }

        // Categories
        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            return Ok(await _adminService.GetCategoriesAsync());
        }

        [HttpPost("categories")]
        public async Task<IActionResult> CreateCategory([FromBody] AdminCategoryRequest request)
        {
            var result = await _adminService.CreateCategoryAsync(request);
            return Ok(result);
        }

        [HttpPut("categories/{id}")]
        public async Task<IActionResult> UpdateCategory(int id, [FromBody] AdminCategoryRequest request)
        {
            var result = await _adminService.UpdateCategoryAsync(id, request);
            if (!result) return NotFound("Category not found.");
            return Ok(new { message = "Category updated successfully." });
        }

        [HttpDelete("categories/{id}")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            var result = await _adminService.DeleteCategoryAsync(id);
            if (!result) return BadRequest("Category not found or still has associated jobs.");
            return Ok(new { message = "Category deleted successfully." });
        }

        // Statistics
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            return Ok(await _adminService.GetDashboardStatsAsync());
        }
    }
}

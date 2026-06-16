using System;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Services;

namespace WorkBridge.API.Controllers
{
    [Authorize(Roles = "Admin")]
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;
        private readonly ISubscriptionPaymentService _subscriptionPaymentService;

        public AdminController(IAdminService adminService, ISubscriptionPaymentService subscriptionPaymentService)
        {
            _adminService = adminService;
            _subscriptionPaymentService = subscriptionPaymentService;
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
            if (!result) return NotFound(new { message = "Không tìm thấy người dùng." });
            return Ok(new { message = "Đã cập nhật trạng thái người dùng." });
        }

        [HttpPatch("users/{id}/reputation")]
        public async Task<IActionResult> UpdateUserReputation(int id, [FromBody] AdminUpdateReputationRequest request)
        {
            if (request.ReputationScore < 0 || request.ReputationScore > 100)
            {
                return BadRequest(new { message = "Điểm uy tín phải nằm trong khoảng 0 - 100." });
            }

            var result = await _adminService.UpdateUserReputationAsync(id, request.ReputationScore);
            if (!result) return NotFound(new { message = "Không tìm thấy hồ sơ người dùng." });
            return Ok(new { message = "Đã cập nhật điểm uy tín.", reputationScore = request.ReputationScore });
        }

        [HttpPost("users/{id}/vip")]
        public async Task<IActionResult> GrantUserVip(int id, [FromBody] AdminGrantVipRequest request)
        {
            try
            {
                var result = await _subscriptionPaymentService.GrantByAdminAsync(id, request);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
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
            if (!result) return NotFound(new { message = "Không tìm thấy tin tuyển dụng." });
            return Ok(new { message = "Đã cập nhật trạng thái tin tuyển dụng." });
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
            if (!result) return NotFound(new { message = "Không tìm thấy danh mục." });
            return Ok(new { message = "Đã cập nhật danh mục." });
        }

        [HttpDelete("categories/{id}")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            var result = await _adminService.DeleteCategoryAsync(id);
            if (!result) return BadRequest(new { message = "Không thể xóa danh mục vì vẫn còn tin tuyển dụng liên quan." });
            return Ok(new { message = "Đã xóa danh mục." });
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            return Ok(await _adminService.GetDashboardStatsAsync());
        }

        // Reports
        [HttpGet("reports")]
        public async Task<IActionResult> GetReports()
        {
            return Ok(await _adminService.GetReportsAsync());
        }

        [HttpPatch("reports/{id}/status")]
        public async Task<IActionResult> UpdateReportStatus(int id, [FromBody] AdminUpdateStatusRequest request)
        {
            var result = await _adminService.UpdateReportStatusAsync(id, request.NewStatus);
            if (!result) return NotFound(new { message = "Không tìm thấy báo cáo." });
            return Ok(new { message = "Đã cập nhật trạng thái báo cáo." });
        }

        // Employer Verifications
        [HttpGet("employers/verifications/pending")]
        public async Task<IActionResult> GetPendingVerifications()
        {
            var result = await _adminService.GetPendingVerificationsAsync();
            return Ok(result);
        }

        [HttpPatch("employers/verifications/{id}/review")]
        public async Task<IActionResult> ReviewVerification(int id, [FromBody] AdminReviewVerificationRequest request)
        {
            if (request.Status != "Verified" && request.Status != "Rejected")
                return BadRequest(new { message = "Trạng thái không hợp lệ." });

            var result = await _adminService.ReviewEmployerVerificationAsync(id, request.Status);
            if (!result) return NotFound(new { message = "Không tìm thấy hồ sơ doanh nghiệp." });
            return Ok(new { message = "Đã cập nhật trạng thái xác thực." });
        }
    }
}

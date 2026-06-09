using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Services;

namespace WorkBridge.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Employer")] // Protect all endpoints here to only Employers
    public class EmployerController : ControllerBase
    {
        private readonly IEmployerService _employerService;

        public EmployerController(IEmployerService employerService)
        {
            _employerService = employerService;
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (int.TryParse(userIdClaim, out int userId))
            {
                return userId;
            }
            throw new System.UnauthorizedAccessException("Không tìm thấy mã người dùng trong phiên đăng nhập.");
        }

        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            try
            {
                var userId = GetUserId();
                var profile = await _employerService.GetProfileAsync(userId);
                return Ok(profile);
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateEmployerProfileRequest request)
        {
            try
            {
                var userId = GetUserId();
                var profile = await _employerService.UpdateProfileAsync(userId, request);
                return Ok(profile);
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpGet("jobs")]
        public async Task<IActionResult> GetMyJobs()
        {
            try
            {
                var userId = GetUserId();
                var jobs = await _employerService.GetMyJobsAsync(userId);
                return Ok(jobs);
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpPost("jobs")]
        public async Task<IActionResult> CreateJob([FromBody] CreateJobRequest request)
        {
            try
            {
                var userId = GetUserId();
                var newJob = await _employerService.CreateJobAsync(userId, request);
                return CreatedAtAction(nameof(GetMyJobs), new { id = newJob.JobPostId }, newJob);
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpPut("jobs/{id}")]
        public async Task<IActionResult> UpdateJob(int id, [FromBody] CreateJobRequest request)
        {
            try
            {
                var userId = GetUserId();
                var updatedJob = await _employerService.UpdateJobAsync(userId, id, request);
                return Ok(updatedJob);
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpPatch("jobs/{id}/status")]
        public async Task<IActionResult> UpdateJobStatus(int id, [FromBody] string status)
        {
            try
            {
                var userId = GetUserId();
                var success = await _employerService.UpdateJobStatusAsync(userId, id, status);
                if (!success) return NotFound(new { Message = "Không tìm thấy tin tuyển dụng hoặc bạn không có quyền thao tác." });
                return Ok(new { Message = "Đã cập nhật trạng thái tin tuyển dụng." });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpGet("dashboard/stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            try
            {
                var userId = GetUserId();
                var stats = await _employerService.GetDashboardStatsAsync(userId);
                return Ok(stats);
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }
    }
}

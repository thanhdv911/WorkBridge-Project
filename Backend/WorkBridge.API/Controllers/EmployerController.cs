using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using System.Linq;
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

        [HttpPost("upload-logo")]
        public async Task<IActionResult> UploadLogo(IFormFile file)
        {
            const long maxImageSizeBytes = 2 * 1024 * 1024; // 2MB

            if (file == null || file.Length == 0) return BadRequest(new { message = "Vui lòng chọn file logo." });
            if (file.Length > maxImageSizeBytes) return BadRequest(new { message = "Ảnh Logo phải có dung lượng tối đa 2MB." });

            var allowedExtensions = new[] { ".png", ".jpg", ".jpeg", ".webp" };
            var ext = System.IO.Path.GetExtension(file.FileName).ToLower();
            if (!allowedExtensions.Contains(ext))
                return BadRequest(new { message = "Chỉ hỗ trợ định dạng ảnh (.png, .jpg, .jpeg, .webp)." });

            try
            {
                var userId = GetUserId();
                var logoUrl = await _employerService.UploadLogoAsync(userId, file);
                if (logoUrl == null) return NotFound(new { message = "Không tìm thấy hồ sơ nhà tuyển dụng." });

                return Ok(new { LogoUrl = logoUrl });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpPost("verify")]
        public async Task<IActionResult> SubmitVerification([FromForm] SubmitVerificationRequest request)
        {
            if (request.BusinessLicenseFile == null || request.BusinessLicenseFile.Length == 0) 
                return BadRequest(new { message = "Vui lòng đính kèm Giấy phép kinh doanh." });
            
            if (string.IsNullOrWhiteSpace(request.TaxId))
                return BadRequest(new { message = "Mã số thuế không được để trống." });

            const long maxImageSizeBytes = 5 * 1024 * 1024; // 5MB
            if (request.BusinessLicenseFile.Length > maxImageSizeBytes) 
                return BadRequest(new { message = "File Giấy phép kinh doanh phải có dung lượng tối đa 5MB." });

            var allowedExtensions = new[] { ".png", ".jpg", ".jpeg", ".pdf", ".webp" };
            var ext = System.IO.Path.GetExtension(request.BusinessLicenseFile.FileName).ToLower();
            if (!allowedExtensions.Contains(ext))
                return BadRequest(new { message = "Chỉ hỗ trợ định dạng ảnh (.png, .jpg) hoặc file PDF." });

            try
            {
                var userId = GetUserId();
                var success = await _employerService.SubmitVerificationAsync(userId, request);
                if (!success) return NotFound(new { message = "Không tìm thấy hồ sơ nhà tuyển dụng." });

                return Ok(new { message = "Hồ sơ xác thực đã được gửi và đang chờ duyệt." });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }
    }
}

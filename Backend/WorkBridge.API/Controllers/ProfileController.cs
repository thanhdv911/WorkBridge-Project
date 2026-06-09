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
    [Authorize] // Require Bearer token for all endpoints here
    public class ProfileController : ControllerBase
    {
        private readonly IProfileService _profileService;

        public ProfileController(IProfileService profileService)
        {
            _profileService = profileService;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
            {
                return userId;
            }
            return 0;
        }

        [HttpGet("applicant")]
        public async Task<IActionResult> GetApplicantProfile()
        {
            int userId = GetCurrentUserId();
            if (userId == 0) return Unauthorized(new { message = "Phiên đăng nhập không hợp lệ." });

            var profile = await _profileService.GetApplicantProfileAsync(userId);
            if (profile == null) return NotFound(new { message = "Không tìm thấy hồ sơ ứng viên." });

            return Ok(profile);
        }

        [HttpPut("applicant")]
        public async Task<IActionResult> UpdateApplicantProfile([FromBody] UpdateApplicantProfileRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            int userId = GetCurrentUserId();
            if (userId == 0) return Unauthorized(new { message = "Phiên đăng nhập không hợp lệ." });

            var success = await _profileService.UpdateApplicantProfileAsync(userId, request);
            if (!success) return NotFound(new { message = "Không tìm thấy người dùng." });

            return Ok(new { Message = "Đã cập nhật hồ sơ." });
        }

        [HttpGet("applicant/{id}")]
        public async Task<IActionResult> GetApplicantProfileById(int id)
        {
            var profile = await _profileService.GetApplicantProfileAsync(id);
            if (profile == null) return NotFound(new { message = "Không tìm thấy hồ sơ ứng viên." });

            return Ok(profile);
        }

        [HttpPost("applicant/upload-cv")]
        public async Task<IActionResult> UploadCv(Microsoft.AspNetCore.Http.IFormFile file)
        {
            const long maxPdfSizeBytes = 5 * 1024 * 1024;

            if (file == null || file.Length == 0) return BadRequest(new { message = "Vui lòng chọn file CV." });
            if (file.Length > maxPdfSizeBytes) return BadRequest(new { message = "CV PDF phải có dung lượng tối đa 5MB." });
            if (System.IO.Path.GetExtension(file.FileName).ToLower() != ".pdf")
                return BadRequest(new { message = "Chỉ hỗ trợ file PDF." });
            if (!string.Equals(file.ContentType, "application/pdf", System.StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Chỉ hỗ trợ file PDF." });

            int userId = GetCurrentUserId();
            if (userId == 0) return Unauthorized();

            var cvUrl = await _profileService.UploadCvAsync(userId, file);
            if (cvUrl == null) return NotFound(new { message = "Không tìm thấy người dùng." });

            return Ok(new { CvUrl = cvUrl });
        }

        [HttpDelete("applicant/cv")]
        public async Task<IActionResult> DeleteCv()
        {
            int userId = GetCurrentUserId();
            if (userId == 0) return Unauthorized();

            var success = await _profileService.DeleteCvAsync(userId);
            if (!success) return NotFound(new { message = "Không tìm thấy người dùng." });

            return Ok(new { CvUrl = (string?)null, Message = "Đã xóa CV." });
        }

        [HttpPost("applicant/save-generated-cv")]
        public async Task<IActionResult> SaveGeneratedCv([FromBody] SaveGeneratedCvRequest request)
        {
            if (request == null) return BadRequest(new { message = "Dữ liệu CV không hợp lệ." });

            int userId = GetCurrentUserId();
            if (userId == 0) return Unauthorized();

            var hasAnyContent =
                !string.IsNullOrWhiteSpace(request.Summary) ||
                !string.IsNullOrWhiteSpace(request.Experience) ||
                !string.IsNullOrWhiteSpace(request.Education) ||
                !string.IsNullOrWhiteSpace(request.Skills);

            if (!hasAnyContent)
            {
                return BadRequest(new { message = "CV cần có ít nhất một phần nội dung để lưu thành PDF." });
            }

            var cvUrl = await _profileService.SaveGeneratedCvAsync(userId, request);
            if (cvUrl == null) return NotFound(new { message = "Không tìm thấy người dùng." });

            return Ok(new { CvUrl = cvUrl });
        }
    }
}

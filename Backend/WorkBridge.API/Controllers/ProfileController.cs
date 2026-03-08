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
            if (userId == 0) return Unauthorized("Invalid token format.");

            var profile = await _profileService.GetApplicantProfileAsync(userId);
            if (profile == null) return NotFound("User not found or not an applicant.");

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
            if (userId == 0) return Unauthorized("Invalid token format.");

            var success = await _profileService.UpdateApplicantProfileAsync(userId, request);
            if (!success) return NotFound("User not found.");

            return Ok(new { Message = "Profile updated successfully." });
        }

        [HttpPost("applicant/upload-cv")]
        public async Task<IActionResult> UploadCv(Microsoft.AspNetCore.Http.IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("No file uploaded.");
            if (System.IO.Path.GetExtension(file.FileName).ToLower() != ".pdf") 
                return BadRequest("Only PDF files are allowed.");

            int userId = GetCurrentUserId();
            if (userId == 0) return Unauthorized();

            var cvUrl = await _profileService.UploadCvAsync(userId, file);
            if (cvUrl == null) return NotFound("User not found.");

            return Ok(new { CvUrl = cvUrl });
        }
    }
}

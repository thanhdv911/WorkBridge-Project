using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Services;

namespace WorkBridge.API.Controllers
{
    [Route("api/gamification")]
    [ApiController]
    public class GamificationController : ControllerBase
    {
        private readonly IGamificationService _gamificationService;

        public GamificationController(IGamificationService gamificationService)
        {
            _gamificationService = gamificationService;
        }

        [HttpPost("endorse")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> EndorseSkills([FromBody] EndorseSkillRequest request)
        {
            var employerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var success = await _gamificationService.EndorseSkillsAsync(employerId, request);
            if (!success) return BadRequest(new { message = "You can only endorse applicants you have contracted with." });
            return Ok(new { message = "Skills endorsed successfully." });
        }

        [HttpGet("cv/{applicantId}")]
        public async Task<IActionResult> GetPracticalCv(int applicantId)
        {
            var result = await _gamificationService.GetPracticalCvAsync(applicantId);
            if (result == null) return NotFound(new { message = "Applicant not found." });
            return Ok(result);
        }

        [HttpGet("cv/my")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> GetMyPracticalCv()
        {
            var applicantId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _gamificationService.GetPracticalCvAsync(applicantId);
            if (result == null) return NotFound(new { message = "Applicant profile not found." });
            return Ok(result);
        }
    }
}

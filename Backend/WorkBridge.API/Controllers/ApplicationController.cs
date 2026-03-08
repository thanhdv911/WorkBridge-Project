using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkBridge.API.DTOs;
using WorkBridge.API.Services;

namespace WorkBridge.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ApplicationController : ControllerBase
    {
        private readonly IApplicationService _applicationService;

        public ApplicationController(IApplicationService applicationService)
        {
            _applicationService = applicationService;
        }

        [HttpPost]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> Apply([FromBody] ApplyJobRequest request)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out int userId))
            {
                return Unauthorized("Invalid user token.");
            }

            var error = await _applicationService.ApplyForJobAsync(userId, request);
            
            if (error != null)
            {
                return BadRequest(error);
            }

            return Ok(new { message = "Application submitted successfully." });
        }

        [HttpGet("my")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> GetMyApplications()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out int userId))
            {
                return Unauthorized("Invalid user token.");
            }

            var applications = await _applicationService.GetMyApplicationsAsync(userId);
            return Ok(applications);
        }

        [HttpGet("employer")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> GetEmployerApplications()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out int userId))
            {
                return Unauthorized("Invalid user token.");
            }

            var applications = await _applicationService.GetApplicationsForEmployerAsync(userId);
            return Ok(applications);
        }

        [HttpPatch("{id}/status")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] string status)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out int userId))
            {
                return Unauthorized("Invalid user token.");
            }

            var success = await _applicationService.UpdateApplicationStatusAsync(userId, id, status);
            if (!success)
            {
                return NotFound("Application not found or you don't have permission to update it.");
            }

            return Ok(new { message = $"Application status updated to {status}." });
        }
    }
}

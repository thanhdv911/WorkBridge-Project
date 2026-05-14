using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Services;

namespace WorkBridge.API.Controllers
{
    [Route("api/application")]
    [ApiController]
    public class JobApplicationController : ControllerBase
    {
        private readonly IApplicationService _applicationService;

        public JobApplicationController(IApplicationService applicationService)
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

            return Ok(new { message = "JobApplication submitted successfully." });
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
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateApplicationStatusRequest request)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out int userId))
            {
                return Unauthorized("Invalid user token.");
            }

            var success = await _applicationService.UpdateApplicationStatusAsync(userId, id, request);
            if (!success)
            {
                return NotFound("JobApplication not found or you don't have permission to update it.");
            }

            return Ok(new { message = $"JobApplication status updated to {request.Status}." });
        }
    }
}

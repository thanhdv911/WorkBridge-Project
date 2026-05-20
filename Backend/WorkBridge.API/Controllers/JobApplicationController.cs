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

            if (request == null || string.IsNullOrWhiteSpace(request.Status))
            {
                return BadRequest(new { message = "Status is required." });
            }

            var result = await _applicationService.UpdateApplicationStatusAsync(userId, id, request.Status);
            if (!result.Success)
            {
                if (result.Error?.Contains("not found", System.StringComparison.OrdinalIgnoreCase) == true)
                {
                    return NotFound(new { message = result.Error });
                }

                return BadRequest(new { message = result.Error });
            }

            return Ok(new
            {
                message = $"JobApplication status updated to {result.Status}.",
                status = result.Status,
                conversationContactId = result.ConversationContactId,
                conversationContactName = result.ConversationContactName
            });
        }
    }
}

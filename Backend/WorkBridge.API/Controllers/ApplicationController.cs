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

            var success = await _applicationService.ApplyForJobAsync(userId, request);
            
            if (!success)
            {
                return BadRequest("Failed to apply. You may have already applied, or your profile is incomplete, or the job does not exist.");
            }

            return Ok(new { message = "Application submitted successfully." });
        }
    }
}

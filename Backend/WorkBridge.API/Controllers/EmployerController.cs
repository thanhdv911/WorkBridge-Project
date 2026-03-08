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
            throw new System.UnauthorizedAccessException("User ID not found in token.");
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
    }
}

using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkBridge.API.Services;

namespace WorkBridge.API.Controllers
{
    [ApiController]
    [Route("api/savedjobs")]
    [Authorize]
    public class SavedJobsController : ControllerBase
    {
        private readonly ISavedJobService _savedJobService;

        public SavedJobsController(ISavedJobService savedJobService)
        {
            _savedJobService = savedJobService;
        }

        private int GetUserId()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(userIdString, out int userId) ? userId : 0;
        }

        [HttpGet]
        public async Task<IActionResult> GetSavedJobs()
        {
            var userId = GetUserId();
            var jobs = await _savedJobService.GetSavedJobsAsync(userId);
            return Ok(jobs);
        }

        [HttpGet("ids")]
        public async Task<IActionResult> GetSavedJobIds()
        {
            var userId = GetUserId();
            var ids = await _savedJobService.GetSavedJobIdsAsync(userId);
            return Ok(ids);
        }

        [HttpPost("{jobId}")]
        public async Task<IActionResult> SaveJob(int jobId)
        {
            var userId = GetUserId();
            var success = await _savedJobService.SaveJobAsync(userId, jobId);
            if (!success) return BadRequest("Could not save job. Job might not exist.");
            return Ok(new { message = "Job saved successfully." });
        }

        [HttpDelete("{jobId}")]
        public async Task<IActionResult> UnsaveJob(int jobId)
        {
            var userId = GetUserId();
            var success = await _savedJobService.UnsaveJobAsync(userId, jobId);
            if (!success) return NotFound("Saved job not found.");
            return Ok(new { message = "Job unsaved successfully." });
        }
    }
}

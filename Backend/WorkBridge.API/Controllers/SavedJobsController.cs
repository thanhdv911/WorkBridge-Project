using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkBridge.Application.Services;

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
            if (!success) return BadRequest(new { message = "Không thể lưu vì tin tuyển dụng không tồn tại." });
            return Ok(new { message = "Đã lưu tin tuyển dụng." });
        }

        [HttpDelete("{jobId}")]
        public async Task<IActionResult> UnsaveJob(int jobId)
        {
            var userId = GetUserId();
            var success = await _savedJobService.UnsaveJobAsync(userId, jobId);
            if (!success) return NotFound(new { message = "Không tìm thấy tin đã lưu." });
            return Ok(new { message = "Đã bỏ lưu tin tuyển dụng." });
        }
    }
}

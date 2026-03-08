using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using WorkBridge.Application.Services;

namespace WorkBridge.API.Controllers
{
    /// <summary>
    /// Public endpoint for Home page data (no auth required)
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class HomeController : ControllerBase
    {
        private readonly IAdminService _adminService;
        private readonly IJobService _jobService;

        public HomeController(IAdminService adminService, IJobService jobService)
        {
            _adminService = adminService;
            _jobService = jobService;
        }

        /// <summary>GET platform-wide stats (public)</summary>
        [HttpGet("stats")]
        public async Task<IActionResult> GetPublicStats()
        {
            var stats = await _adminService.GetDashboardStatsAsync();
            return Ok(stats);
        }

        /// <summary>GET latest 6 published jobs (public)</summary>
        [HttpGet("latest-jobs")]
        public async Task<IActionResult> GetLatestJobs()
        {
            var result = await _jobService.GetJobsAsync(null, null, null, 1, 6);
            return Ok(result.Items);
        }
    }
}

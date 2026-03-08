using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkBridge.API.Services;

namespace WorkBridge.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class JobController : ControllerBase
    {
        private readonly IJobService _jobService;

        public JobController(IJobService jobService)
        {
            _jobService = jobService;
        }

        [HttpGet]
        [AllowAnonymous] // Anyone can browse jobs
        public async Task<IActionResult> GetJobs(
            [FromQuery] string? keyword, 
            [FromQuery] string? location, 
            [FromQuery] decimal? minSalary)
        {
            var jobs = await _jobService.GetJobsAsync(keyword, location, minSalary);
            return Ok(jobs);
        }
    }
}

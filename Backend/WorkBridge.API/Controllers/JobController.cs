using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkBridge.Application.Services;

namespace WorkBridge.API.Controllers
{
    [Route("api/jobs")]
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
            [FromQuery] decimal? minSalary,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _jobService.GetJobsAsync(keyword, location, minSalary, page, pageSize);
            return Ok(result);
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetJob(int id)
        {
            var job = await _jobService.GetJobByIdAsync(id);
            if (job == null)
            {
                return NotFound("Job not found or not available.");
            }
            return Ok(job);
        }
    }
}

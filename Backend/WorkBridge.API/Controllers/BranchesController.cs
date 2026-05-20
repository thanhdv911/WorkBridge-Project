using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Services;

namespace WorkBridge.API.Controllers
{
    [Route("api/branches")]
    [ApiController]
    [Authorize(Roles = "Employer")]
    public class BranchesController : ControllerBase
    {
        private readonly IBranchService _branchService;

        public BranchesController(IBranchService branchService)
        {
            _branchService = branchService;
        }

        [HttpGet]
        public async Task<IActionResult> GetBranches()
        {
            var employerId = GetUserId();
            return Ok(await _branchService.GetBranchesAsync(employerId));
        }

        [HttpPost]
        public async Task<IActionResult> CreateBranch([FromBody] CreateBranchRequest request)
        {
            var employerId = GetUserId();
            var branch = await _branchService.CreateBranchAsync(employerId, request);
            if (branch == null) return BadRequest(new { message = "Name and address are required." });
            return Ok(branch);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateBranch(int id, [FromBody] CreateBranchRequest request)
        {
            var employerId = GetUserId();
            var branch = await _branchService.UpdateBranchAsync(employerId, id, request);
            if (branch == null) return NotFound(new { message = "Branch not found or invalid data." });
            return Ok(branch);
        }

        private int GetUserId()
        {
            return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }
    }
}

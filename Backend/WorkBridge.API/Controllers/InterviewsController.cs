using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Services;

namespace WorkBridge.API.Controllers
{
    [Route("api/interviews")]
    [ApiController]
    [Authorize]
    public class InterviewsController : ControllerBase
    {
        private readonly IInterviewService _interviewService;

        public InterviewsController(IInterviewService interviewService)
        {
            _interviewService = interviewService;
        }

        [HttpPost]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> Create([FromBody] CreateInterviewRequest request)
        {
            var (interview, error) = await _interviewService.CreateInterviewAsync(GetUserId(), request);
            if (error != null) return BadRequest(new { message = error });
            return Ok(interview);
        }

        [HttpGet("chat-context/{contactId}")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> GetChatContext(int contactId)
        {
            return Ok(await _interviewService.GetChatContextAsync(GetUserId(), contactId));
        }

        [HttpPost("chat-invite")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> CreateChatInvite([FromBody] CreateChatInterviewRequest request)
        {
            var (interview, error) = await _interviewService.CreateChatInterviewAsync(GetUserId(), request);
            if (error != null) return BadRequest(new { message = error });
            return Ok(interview);
        }

        [HttpGet("employer")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> GetEmployerInterviews()
        {
            return Ok(await _interviewService.GetEmployerInterviewsAsync(GetUserId()));
        }

        [HttpGet("my")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> GetMyInterviews()
        {
            return Ok(await _interviewService.GetMyInterviewsAsync(GetUserId()));
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateInterviewStatusRequest request)
        {
            var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
            var (interview, error) = await _interviewService.UpdateStatusAsync(GetUserId(), role, id, request);
            if (error != null) return BadRequest(new { message = error });
            return Ok(interview);
        }

        [HttpPatch("{id}/result")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> UpdateResult(int id, [FromBody] UpdateInterviewResultRequest request)
        {
            var (interview, error) = await _interviewService.UpdateResultAsync(GetUserId(), id, request);
            if (error != null) return BadRequest(new { message = error });
            return Ok(interview);
        }

        private int GetUserId()
        {
            return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }
    }
}

using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Services;
using WorkBridge.Infrastructure.Data;

namespace WorkBridge.API.Controllers
{
    [Route("api/cv")]
    [ApiController]
    [Authorize(Roles = "Applicant")]
    public class CvController : ControllerBase
    {
        private readonly ICvAiService _cvAiService;
        private readonly WorkBridgeContext _context;

        public CvController(ICvAiService cvAiService, WorkBridgeContext context)
        {
            _cvAiService = cvAiService;
            _context = context;
        }

        [HttpPost("analyze")]
        public async Task<IActionResult> Analyze()
        {
            var userId = GetUserId();
            if (!await IsVipApplicantAsync(userId))
            {
                return BadRequest(new { message = "AI danh gia CV chi danh cho Ca nhan VIP. Vui long nang cap VIP de su dung chuc nang nay." });
            }

            try
            {
                var jsonResult = await _cvAiService.AnalyzeCvJsonAsync(userId);
                return Content(jsonResult, "application/json");
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        private async Task<bool> IsVipApplicantAsync(int userId)
        {
            var now = DateTime.UtcNow;
            return await _context.Subscriptions.AnyAsync(s =>
                s.UserId == userId &&
                s.Audience == "Applicant" &&
                s.Status == "Active" &&
                s.EndDate >= now);
        }

        private int GetUserId()
        {
            return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }
    }
}

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
                return BadRequest(new { message = "AI đánh giá CV chỉ dành cho Cá nhân VIP. Vui lòng nâng cấp VIP để sử dụng chức năng này." });
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
            catch (Exception)
            {
                return StatusCode(500, new { message = "Không thể phân tích CV lúc này. Vui lòng thử lại sau." });
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

using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Services;

namespace WorkBridge.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ReviewController : ControllerBase
    {
        private readonly IReviewService _reviewService;

        public ReviewController(IReviewService reviewService)
        {
            _reviewService = reviewService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateReview([FromBody] CreateReviewRequest request)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
            int userId = int.Parse(userIdStr);

            var error = await _reviewService.CreateReviewAsync(userId, request);
            if (error != null) return BadRequest(new { message = error });

            return Ok(new { message = "Review submitted successfully" });
        }

        [HttpGet("user/{id}")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<ReviewResponse>>> GetUserReviews(int id)
        {
            var reviews = await _reviewService.GetReviewsForUserAsync(id);
            return Ok(reviews);
        }

        [HttpGet("user/{id}/stats")]
        [AllowAnonymous]
        public async Task<ActionResult<UserRatingStats>> GetUserStats(int id)
        {
            var stats = await _reviewService.GetUserRatingStatsAsync(id);
            return Ok(stats);
        }
    }
}

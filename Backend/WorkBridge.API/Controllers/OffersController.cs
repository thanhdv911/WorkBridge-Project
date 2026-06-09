using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Services;

namespace WorkBridge.API.Controllers
{
    [Route("api/offers")]
    [ApiController]
    [Authorize]
    public class OffersController : ControllerBase
    {
        private readonly IOfferService _offerService;
        private readonly ILogger<OffersController> _logger;

        public OffersController(IOfferService offerService, ILogger<OffersController> logger)
        {
            _offerService = offerService;
            _logger = logger;
        }

        [HttpPost]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> CreateOffer([FromBody] CreateOfferRequest request)
        {
            try
            {
                var employerId = GetUserId();
                var (offer, error) = await _offerService.CreateOfferAsync(employerId, request);
                if (error != null) return BadRequest(new { message = error });
                return Ok(offer);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Create offer failed.");
                return StatusCode(500, new { message = "Không thể gửi lời mời nhận việc. Vui lòng thử lại hoặc kiểm tra dữ liệu offer." });
            }
        }

        [HttpPatch("{id}")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> UpdateOffer(int id, [FromBody] UpdateOfferRequest request)
        {
            try
            {
                var employerId = GetUserId();
                var (offer, error) = await _offerService.UpdateOfferAsync(employerId, id, request);
                if (error != null) return BadRequest(new { message = error });
                return Ok(offer);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Update offer {OfferId} failed.", id);
                return StatusCode(500, new { message = "Không thể cập nhật lời mời nhận việc. Vui lòng thử lại hoặc kiểm tra dữ liệu offer." });
            }
        }

        [HttpGet("employer")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> GetEmployerOffers()
        {
            var employerId = GetUserId();
            return Ok(await _offerService.GetEmployerOffersAsync(employerId));
        }

        [HttpGet("my")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> GetMyOffers()
        {
            var applicantId = GetUserId();
            return Ok(await _offerService.GetMyOffersAsync(applicantId));
        }

        [HttpPatch("{id}/accept")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> AcceptOffer(int id)
        {
            var applicantId = GetUserId();
            var (employment, error) = await _offerService.AcceptOfferAsync(applicantId, id);
            if (error != null) return BadRequest(new { message = error });
            return Ok(employment);
        }

        [HttpPatch("{id}/decline")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> DeclineOffer(int id)
        {
            var applicantId = GetUserId();
            var error = await _offerService.DeclineOfferAsync(applicantId, id);
            if (error != null) return BadRequest(new { message = error });
            return Ok(new { message = "Đã từ chối lời mời nhận việc." });
        }

        [HttpPatch("{id}/cancel")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> CancelOffer(int id)
        {
            var employerId = GetUserId();
            var error = await _offerService.CancelOfferAsync(employerId, id);
            if (error != null) return BadRequest(new { message = error });
            return Ok(new { message = "Đã hủy lời mời nhận việc." });
        }

        private int GetUserId()
        {
            return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }
    }
}

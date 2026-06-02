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

        public OffersController(IOfferService offerService)
        {
            _offerService = offerService;
        }

        [HttpPost]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> CreateOffer([FromBody] CreateOfferRequest request)
        {
            var employerId = GetUserId();
            var (offer, error) = await _offerService.CreateOfferAsync(employerId, request);
            if (error != null) return BadRequest(new { message = error });
            return Ok(offer);
        }

        [HttpPatch("{id}")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> UpdateOffer(int id, [FromBody] UpdateOfferRequest request)
        {
            var employerId = GetUserId();
            var (offer, error) = await _offerService.UpdateOfferAsync(employerId, id, request);
            if (error != null) return BadRequest(new { message = error });
            return Ok(offer);
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
            return Ok(new { message = "Offer declined." });
        }

        [HttpPatch("{id}/cancel")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> CancelOffer(int id)
        {
            var employerId = GetUserId();
            var error = await _offerService.CancelOfferAsync(employerId, id);
            if (error != null) return BadRequest(new { message = error });
            return Ok(new { message = "Offer cancelled." });
        }

        private int GetUserId()
        {
            return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }
    }
}

using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Services;

namespace WorkBridge.API.Controllers
{
    [Route("api/shifts")]
    [ApiController]
    public class ShiftController : ControllerBase
    {
        private readonly IShiftService _shiftService;

        public ShiftController(IShiftService shiftService)
        {
            _shiftService = shiftService;
        }

        [HttpPost("schedule")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> CreateSchedule([FromBody] CreateScheduleRequest request)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            try
            {
                var result = await _shiftService.CreateScheduleAsync(userId, request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("employer")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> GetEmployerSchedules([FromQuery] int? jobPostId, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _shiftService.GetEmployerSchedulesAsync(userId, jobPostId, startDate, endDate);
            return Ok(result);
        }

        [HttpGet("my")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> GetMySchedules([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _shiftService.GetMySchedulesAsync(userId, startDate, endDate);
            return Ok(result);
        }

        [HttpPost("{id}/check-in")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> CheckIn(int id, [FromBody] string? note)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var error = await _shiftService.CheckInAsync(userId, id, note);
            if (error != null) return BadRequest(new { message = error });
            return Ok(new { message = "Checked in successfully." });
        }

        [HttpPost("{id}/check-out")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> CheckOut(int id)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var error = await _shiftService.CheckOutAsync(userId, id);
            if (error != null) return BadRequest(new { message = error });
            return Ok(new { message = "Checked out successfully." });
        }

        [HttpPost("swap")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> RequestSwap([FromBody] CreateSwapRequest request)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var error = await _shiftService.RequestShiftSwapAsync(userId, request);
            if (error != null) return BadRequest(new { message = error });
            return Ok(new { message = "Swap request created." });
        }

        [HttpGet("swap-board")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> GetSwapBoard()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _shiftService.GetAvailableSwapRequestsAsync(userId);
            return Ok(result);
        }

        [HttpPost("swap/{id}/accept")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> AcceptSwap(int id)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var error = await _shiftService.AcceptSwapRequestAsync(userId, id);
            if (error != null) return BadRequest(new { message = error });
            return Ok(new { message = "Swap request accepted successfully. Shift is now yours." });
        }
    }
}

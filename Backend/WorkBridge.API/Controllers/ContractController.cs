using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Services;

namespace WorkBridge.API.Controllers
{
    [Route("api/contracts")]
    [ApiController]
    [Authorize]
    public class ContractController : ControllerBase
    {
        private readonly IContractService _contractService;

        public ContractController(IContractService contractService)
        {
            _contractService = contractService;
        }

        [HttpGet("application/{applicationId}")]
        public async Task<IActionResult> GetContractByApplication(int applicationId)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _contractService.GetContractByApplicationAsync(applicationId, userId);
            if (result == null) return NotFound(new { message = "Contract not found or access denied." });
            return Ok(result);
        }

        [HttpPost("{id}/sign")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> SignContract(int id)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var success = await _contractService.SignContractAsync(id, userId);
            if (!success) return BadRequest(new { message = "Failed to sign contract. It might have already been signed." });
            return Ok(new { message = "Contract signed successfully." });
        }

        [HttpPost("dispute")]
        public async Task<IActionResult> CreateDispute([FromBody] CreateDisputeRequest request)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            try
            {
                var result = await _contractService.CreateDisputeAsync(userId, request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("disputes/my")]
        public async Task<IActionResult> GetMyDisputes()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _contractService.GetMyDisputesAsync(userId);
            return Ok(result);
        }
        
        [HttpGet("disputes/all")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllDisputes()
        {
            var result = await _contractService.GetAllDisputesAsync();
            return Ok(result);
        }
    }
}

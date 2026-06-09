using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkBridge.Application.Services;
using WorkBridge.Domain.Entities;
using WorkBridge.Infrastructure.Data;

namespace WorkBridge.API.Controllers
{
    [ApiController]
    [Route("api/subscriptions")]
    [Authorize]
    public class SubscriptionsController : ControllerBase
    {
        private static readonly HashSet<int> AllowedDurations = new() { 7, 30, 365 };
        private static readonly HashSet<string> AllowedAudiences = new(StringComparer.OrdinalIgnoreCase)
        {
            "Applicant",
            "Employer"
        };

        private readonly WorkBridgeContext _context;
        private readonly ISubscriptionPaymentService _paymentService;

        public SubscriptionsController(WorkBridgeContext context, ISubscriptionPaymentService paymentService)
        {
            _context = context;
            _paymentService = paymentService;
        }

        [HttpGet("plans")]
        public async Task<IActionResult> GetPlans([FromQuery] string? audience = null)
        {
            var normalizedAudience = NormalizeAudience(audience) ?? GetCurrentAudience();
            if (normalizedAudience == null)
            {
                return BadRequest(new { message = "Không xác định được loại gói VIP." });
            }

            var plans = await _context.SubscriptionPlans
                .Where(p => p.Audience == normalizedAudience && p.IsActive && AllowedDurations.Contains(p.DurationDays))
                .OrderBy(p => p.SortOrder)
                .ThenBy(p => p.Price)
                .Select(p => ToPlanResponse(p))
                .ToListAsync();

            return Ok(plans);
        }

        [HttpPost("buy")]
        [Authorize(Roles = "Employer,Applicant")]
        public async Task<IActionResult> BuyPremiumPlan([FromBody] BuyPlanRequest request)
        {
            var audience = GetCurrentAudience();
            if (audience == null)
            {
                return BadRequest(new { message = "Tài khoản này không thể mua gói VIP." });
            }

            try
            {
                var result = await _paymentService.BuyAsync(GetUserId(), audience, new BuyPaymentRequest
                {
                    PlanId = request.PlanId,
                    DurationDays = request.DurationDays
                });
                return Ok(result);
            }
            catch (PaymentBusyException ex)
            {
                return StatusCode(429, new { message = ex.Message });
            }
            catch (PaymentGatewayException ex)
            {
                return StatusCode(502, new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("confirm/{subscriptionId:int}")]
        public async Task<IActionResult> ConfirmPayment(int subscriptionId)
        {
            var result = await _paymentService.ConfirmAsync(GetUserId(), subscriptionId);
            if (result == null)
            {
                return NotFound(new { message = "Không tìm thấy giao dịch đăng ký." });
            }

            return result.Paid ? Ok(result) : BadRequest(result);
        }

        [HttpGet("confirm-latest")]
        public async Task<IActionResult> ConfirmLatestPayment([FromQuery] string? audience = null, [FromQuery] int? subscriptionId = null)
        {
            var normalizedAudience = NormalizeAudience(audience) ?? GetCurrentAudience();
            var result = await _paymentService.ConfirmLatestAsync(GetUserId(), normalizedAudience, subscriptionId);
            if (result == null)
            {
                return NotFound(new
                {
                    message = subscriptionId.HasValue
                        ? "Không tìm thấy giao dịch VIP hiện tại đang chờ thanh toán."
                        : "Không tìm thấy giao dịch VIP đang chờ thanh toán.",
                    paid = false
                });
            }

            return result.Paid ? Ok(result) : BadRequest(result);
        }

        [HttpGet("payment-status")]
        public async Task<IActionResult> GetPaymentStatus([FromQuery] string? audience = null, [FromQuery] int? subscriptionId = null, [FromQuery] long? orderCode = null)
        {
            if (!subscriptionId.HasValue && !orderCode.HasValue)
            {
                return BadRequest(new { message = "Cần subscriptionId hoặc orderCode để kiểm tra thanh toán.", paid = false });
            }

            var normalizedAudience = NormalizeAudience(audience) ?? GetCurrentAudience();
            var result = await _paymentService.GetPaymentStatusAsync(GetUserId(), normalizedAudience, subscriptionId, orderCode);
            if (result == null)
            {
                return NotFound(new { message = "Không tìm thấy giao dịch VIP.", paid = false });
            }

            return Ok(result);
        }

        [HttpPost("cancel")]
        [Authorize(Roles = "Employer,Applicant")]
        public async Task<IActionResult> CancelPayment([FromBody] CancelPaymentRequest request)
        {
            var audience = NormalizeAudience(request?.Audience) ?? GetCurrentAudience();
            var result = await _paymentService.CancelAsync(
                GetUserId(),
                audience,
                request?.SubscriptionId,
                request?.OrderCode,
                request?.Reason);

            if (result == null)
            {
                return NotFound(new { message = "Không tìm thấy giao dịch VIP đang chờ để hủy." });
            }

            return Ok(result);
        }

        [HttpGet("history")]
        [Authorize(Roles = "Employer,Applicant")]
        public async Task<IActionResult> GetTransactionHistory(
            [FromQuery] string? audience = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 5)
        {
            var normalizedAudience = NormalizeAudience(audience) ?? GetCurrentAudience();
            return Ok(await _paymentService.GetHistoryAsync(GetUserId(), normalizedAudience, page, pageSize));
        }

        [HttpPost("payos/webhook")]
        [AllowAnonymous]
        public async Task<IActionResult> PayOSWebhook([FromBody] PayOSWebhookRequest request)
        {
            try
            {
                var result = await _paymentService.HandlePayOSWebhookAsync(request);
                return Ok(new { success = true, result });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, new { success = false, message = "Không thể xử lý webhook PayOS lúc này." });
            }
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetVipStatus()
        {
            var userId = GetUserId();
            var audience = GetCurrentAudience();
            if (audience == null)
            {
                return Ok(new { isVip = false });
            }

            var now = DateTime.UtcNow;
            var activeVip = await ActiveSubscriptionQuery(userId, audience)
                .Include(s => s.SubscriptionPlan)
                .OrderByDescending(s => s.EndDate)
                .FirstOrDefaultAsync();

            if (activeVip != null)
            {
                var durationDays = activeVip.SubscriptionPlan?.DurationDays ?? ParseDurationDays(activeVip.PlanName);
                return Ok(new
                {
                    isVip = true,
                    audience,
                    subscriptionId = activeVip.SubscriptionId,
                    planId = activeVip.SubscriptionPlanId,
                    planName = activeVip.SubscriptionPlan?.Name ?? activeVip.PlanName,
                    planCode = activeVip.PlanName,
                    durationDays,
                    autoApproveJobPosts = audience == "Employer" && durationDays >= 365,
                    price = activeVip.Price,
                    startDate = activeVip.StartDate,
                    endDate = activeVip.EndDate,
                    daysRemaining = (int)Math.Ceiling((activeVip.EndDate - now).TotalDays)
                });
            }

            return Ok(new { isVip = false, audience });
        }

        [HttpGet("admin/plans")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAdminPlans([FromQuery] string? audience = null)
        {
            var normalizedAudience = NormalizeAudience(audience);
            var query = _context.SubscriptionPlans.AsQueryable();
            if (normalizedAudience != null)
            {
                query = query.Where(p => p.Audience == normalizedAudience);
            }

            var plans = await query
                .OrderBy(p => p.Audience)
                .ThenBy(p => p.SortOrder)
                .ThenBy(p => p.DurationDays)
                .Select(p => ToPlanResponse(p))
                .ToListAsync();

            return Ok(plans);
        }

        [HttpGet("admin/transactions")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAdminTransactions(
            [FromQuery] string? audience = null,
            [FromQuery] string? status = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 12)
        {
            return Ok(await _paymentService.GetAdminHistoryAsync(audience, status, page, pageSize));
        }

        [HttpPost("admin/plans")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateAdminPlan([FromBody] SubscriptionPlanRequest request)
        {
            var validation = ValidatePlanRequest(request);
            if (validation != null) return BadRequest(new { message = validation });

            var audience = NormalizeAudience(request.Audience)!;
            var code = NormalizeCode(request.Code);
            if (string.IsNullOrWhiteSpace(code))
            {
                code = $"{audience.ToLowerInvariant()}_{request.DurationDays}d_{Guid.NewGuid():N}"[..28];
            }

            var exists = await _context.SubscriptionPlans.AnyAsync(p => p.Audience == audience && p.Code == code);
            if (exists)
            {
                return BadRequest(new { message = "Mã gói đã tồn tại trong nhóm tài khoản này." });
            }

            var plan = new SubscriptionPlan
            {
                Audience = audience,
                Code = code,
                Name = request.Name.Trim(),
                Description = request.Description?.Trim(),
                DurationDays = request.DurationDays,
                Price = request.Price,
                Currency = string.IsNullOrWhiteSpace(request.Currency) ? "VND" : request.Currency.Trim().ToUpperInvariant(),
                IsActive = request.IsActive,
                SortOrder = request.SortOrder,
                CreatedAt = DateTime.UtcNow
            };

            await _context.SubscriptionPlans.AddAsync(plan);
            await _context.SaveChangesAsync();

            return Ok(ToPlanResponse(plan));
        }

        [HttpPut("admin/plans/{planId:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateAdminPlan(int planId, [FromBody] SubscriptionPlanRequest request)
        {
            var plan = await _context.SubscriptionPlans.FirstOrDefaultAsync(p => p.SubscriptionPlanId == planId);
            if (plan == null)
            {
                return NotFound(new { message = "Không tìm thấy gói VIP." });
            }

            var validation = ValidatePlanRequest(request);
            if (validation != null) return BadRequest(new { message = validation });

            var audience = NormalizeAudience(request.Audience)!;
            var code = NormalizeCode(request.Code);
            if (string.IsNullOrWhiteSpace(code))
            {
                code = plan.Code;
            }

            var exists = await _context.SubscriptionPlans
                .AnyAsync(p => p.SubscriptionPlanId != planId && p.Audience == audience && p.Code == code);
            if (exists)
            {
                return BadRequest(new { message = "Mã gói đã tồn tại trong nhóm tài khoản này." });
            }

            plan.Audience = audience;
            plan.Code = code;
            plan.Name = request.Name.Trim();
            plan.Description = request.Description?.Trim();
            plan.DurationDays = request.DurationDays;
            plan.Price = request.Price;
            plan.Currency = string.IsNullOrWhiteSpace(request.Currency) ? "VND" : request.Currency.Trim().ToUpperInvariant();
            plan.IsActive = request.IsActive;
            plan.SortOrder = request.SortOrder;
            plan.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(ToPlanResponse(plan));
        }

        private IQueryable<Subscription> ActiveSubscriptionQuery(int userId, string audience)
        {
            var now = DateTime.UtcNow;
            var query = _context.Subscriptions
                .Where(s => s.Status == "Active" && s.EndDate >= now);

            if (audience == "Employer")
            {
                return query.Where(s =>
                    (s.UserId == userId && s.Audience == "Employer") ||
                    s.EmployerId == userId);
            }

            return query.Where(s => s.UserId == userId && s.Audience == "Applicant");
        }

        private string? GetCurrentAudience()
        {
            if (User.IsInRole("Employer")) return "Employer";
            if (User.IsInRole("Applicant")) return "Applicant";
            return null;
        }

        private static string? NormalizeAudience(string? audience)
        {
            if (string.IsNullOrWhiteSpace(audience)) return null;
            return AllowedAudiences.FirstOrDefault(a => string.Equals(a, audience.Trim(), StringComparison.OrdinalIgnoreCase));
        }

        private static string? NormalizeCode(string? code)
        {
            if (string.IsNullOrWhiteSpace(code)) return null;
            var normalized = Regex.Replace(code.Trim().ToLowerInvariant(), "[^a-z0-9_-]+", "_").Trim('_');
            return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
        }

        private static string? ValidatePlanRequest(SubscriptionPlanRequest request)
        {
            if (request == null) return "Dữ liệu gói VIP không hợp lệ.";
            if (NormalizeAudience(request.Audience) == null) return "Loại tài khoản phải là Applicant hoặc Employer.";
            if (string.IsNullOrWhiteSpace(request.Name)) return "Tên gói không được để trống.";
            if (!AllowedDurations.Contains(request.DurationDays)) return "Chỉ được tạo gói 7 ngày, 1 tháng hoặc 1 năm.";
            if (request.Price <= 0) return "Giá gói phải lớn hơn 0.";
            return null;
        }

        private static int ParseDurationDays(string planName)
        {
            var match = Regex.Match(planName ?? "", @"(\d+)");
            return match.Success && int.TryParse(match.Groups[1].Value, out var days) ? days : 30;
        }

        private static SubscriptionPlanResponse ToPlanResponse(SubscriptionPlan plan)
        {
            return new SubscriptionPlanResponse
            {
                SubscriptionPlanId = plan.SubscriptionPlanId,
                Audience = plan.Audience,
                Code = plan.Code,
                Name = plan.Name,
                Description = plan.Description,
                DurationDays = plan.DurationDays,
                Price = plan.Price,
                Currency = plan.Currency,
                IsActive = plan.IsActive,
                SortOrder = plan.SortOrder,
                CreatedAt = plan.CreatedAt,
                UpdatedAt = plan.UpdatedAt
            };
        }

        private int GetUserId()
        {
            return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }
    }

    public class BuyPlanRequest
    {
        public int? PlanId { get; set; }
        public int? DurationDays { get; set; }
    }

    public class SubscriptionPlanRequest
    {
        public string Audience { get; set; } = "";
        public string? Code { get; set; }
        public string Name { get; set; } = "";
        public string? Description { get; set; }
        public int DurationDays { get; set; }
        public decimal Price { get; set; }
        public string? Currency { get; set; }
        public bool IsActive { get; set; } = true;
        public int SortOrder { get; set; }
    }

    public class SubscriptionPlanResponse
    {
        public int SubscriptionPlanId { get; set; }
        public string Audience { get; set; } = "";
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
        public string? Description { get; set; }
        public int DurationDays { get; set; }
        public decimal Price { get; set; }
        public string Currency { get; set; } = "VND";
        public bool IsActive { get; set; }
        public int SortOrder { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}

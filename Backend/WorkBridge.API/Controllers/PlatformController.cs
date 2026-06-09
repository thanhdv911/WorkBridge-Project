using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Services;
using WorkBridge.Domain.Entities;
using WorkBridge.Infrastructure.Data;

namespace WorkBridge.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PlatformController : ControllerBase
    {
        private const int SettingId = 1;
        private readonly WorkBridgeContext _context;
        private readonly IEmailQueue _emailQueue;
        private readonly IConfiguration _configuration;

        public PlatformController(
            WorkBridgeContext context,
            IEmailQueue emailQueue,
            IConfiguration configuration)
        {
            _context = context;
            _emailQueue = emailQueue;
            _configuration = configuration;
        }

        [AllowAnonymous]
        [HttpGet("maintenance")]
        public async Task<ActionResult<PlatformMaintenanceStatusResponse>> GetMaintenanceStatus()
        {
            var setting = await GetOrCreateMaintenanceSettingAsync();
            return Ok(ToMaintenanceResponse(setting));
        }

        [AllowAnonymous]
        [HttpGet("admin-contact")]
        public async Task<IActionResult> GetAdminContact()
        {
            var admin = await _context.Users
                .AsNoTracking()
                .Include(user => user.Role)
                .Where(user =>
                    !user.IsDeleted &&
                    user.Status == "Active" &&
                    user.Role.RoleName == "Admin")
                .OrderBy(user => user.UserId)
                .Select(user => new
                {
                    userId = user.UserId,
                    fullName = string.IsNullOrWhiteSpace(user.FullName) ? "Quản trị viên WorkBridge" : user.FullName,
                    email = user.Email,
                    facebookUrl = "https://www.facebook.com/profile.php?id=61590592532967"
                })
                .FirstOrDefaultAsync();

            if (admin == null)
            {
                return NotFound(new { message = "Chưa tìm thấy tài khoản quản trị viên." });
            }

            return Ok(admin);
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("admin/maintenance")]
        public async Task<ActionResult<PlatformMaintenanceStatusResponse>> GetAdminMaintenanceStatus()
        {
            var setting = await GetOrCreateMaintenanceSettingAsync();
            return Ok(ToMaintenanceResponse(setting));
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("admin/maintenance")]
        public async Task<ActionResult<AdminEmailActionResponse>> UpdateMaintenance([FromBody] AdminMaintenanceRequest request)
        {
            var setting = await GetOrCreateMaintenanceSettingAsync();
            var now = DateTime.UtcNow;
            var adminEmail = User.FindFirstValue(ClaimTypes.Email)
                ?? User.FindFirstValue(ClaimTypes.Name)
                ?? "Admin WorkBridge";

            var title = NormalizeText(request.Title, "WorkBridge đang bảo trì", 200);
            var message = NormalizeText(
                request.Message,
                "Hệ thống đang được bảo trì để nâng cấp trải nghiệm. Vui lòng quay lại sau ít phút.",
                1000);

            if (request.IsEnabled)
            {
                var durationMinutes = request.DurationMinutes.GetValueOrDefault(30);
                if (durationMinutes < 1 || durationMinutes > 1440)
                {
                    return BadRequest(new { message = "Thời gian bảo trì phải từ 1 đến 1440 phút." });
                }

                setting.IsEnabled = true;
                setting.StartedAtUtc = now;
                setting.EndsAtUtc = now.AddMinutes(durationMinutes);
                setting.Title = title;
                setting.Message = message;
            }
            else
            {
                setting.IsEnabled = false;
                setting.EndsAtUtc = now;
                setting.Title = title;
                setting.Message = message;
            }

            setting.UpdatedBy = adminEmail;
            setting.UpdatedAtUtc = now;
            await _context.SaveChangesAsync();

            var queuedCount = 0;
            if (request.SendEmail)
            {
                var subject = NormalizeText(
                    request.EmailSubject,
                    request.IsEnabled ? title : "WorkBridge đã hoạt động trở lại",
                    180);
                var emailMessage = NormalizeText(
                    request.EmailMessage,
                    BuildMaintenanceEmailMessage(setting, request.IsEnabled),
                    1400);
                queuedCount = await QueueEmailByAudienceAsync(
                    request.Audience,
                    subject,
                    emailMessage,
                    $"{GetWebAppUrl()}/maintenance",
                    request.IsEnabled ? "Xem trạng thái bảo trì" : "Mở WorkBridge");
            }

            return Ok(new AdminEmailActionResponse
            {
                Message = request.IsEnabled
                    ? "Đã bật chế độ bảo trì."
                    : "Đã tắt chế độ bảo trì.",
                QueuedCount = queuedCount,
                Maintenance = ToMaintenanceResponse(setting)
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("admin/broadcast-email")]
        public async Task<ActionResult<AdminEmailActionResponse>> SendBroadcastEmail([FromBody] AdminBroadcastEmailRequest request)
        {
            var subject = (request.Subject ?? string.Empty).Trim();
            var message = (request.Message ?? string.Empty).Trim();

            if (string.IsNullOrWhiteSpace(subject))
            {
                return BadRequest(new { message = "Vui lòng nhập tiêu đề email." });
            }

            if (string.IsNullOrWhiteSpace(message))
            {
                return BadRequest(new { message = "Vui lòng nhập nội dung email." });
            }

            if (subject.Length > 180)
            {
                return BadRequest(new { message = "Tiêu đề email tối đa 180 ký tự." });
            }

            if (message.Length > 1600)
            {
                return BadRequest(new { message = "Nội dung email tối đa 1600 ký tự." });
            }

            var typeLabel = NormalizeEmailTypeLabel(request.Type);
            var actionUrl = string.IsNullOrWhiteSpace(request.ActionUrl) ? GetWebAppUrl() : request.ActionUrl.Trim();
            var actionText = string.IsNullOrWhiteSpace(request.ActionText) ? "Mở WorkBridge" : request.ActionText.Trim();
            var queuedCount = await QueueEmailByAudienceAsync(
                request.Audience,
                $"{typeLabel}: {subject}",
                message,
                actionUrl,
                actionText);

            return Ok(new AdminEmailActionResponse
            {
                Message = queuedCount > 0
                    ? $"Đã đưa {queuedCount} email vào hàng đợi gửi."
                    : "Không có người nhận phù hợp.",
                QueuedCount = queuedCount
            });
        }

        private async Task<PlatformMaintenanceSetting> GetOrCreateMaintenanceSettingAsync()
        {
            var setting = await _context.PlatformMaintenanceSettings
                .FirstOrDefaultAsync(item => item.PlatformMaintenanceSettingId == SettingId);

            if (setting != null)
            {
                return setting;
            }

            setting = new PlatformMaintenanceSetting
            {
                PlatformMaintenanceSettingId = SettingId,
                IsEnabled = false,
                Title = "WorkBridge đang bảo trì",
                Message = "Hệ thống đang được bảo trì để nâng cấp trải nghiệm. Vui lòng quay lại sau ít phút.",
                UpdatedAtUtc = DateTime.UtcNow
            };
            await _context.PlatformMaintenanceSettings.AddAsync(setting);
            await _context.SaveChangesAsync();
            return setting;
        }

        private async Task<int> QueueEmailByAudienceAsync(
            string? audience,
            string subject,
            string message,
            string? actionUrl,
            string? actionText)
        {
            var normalizedAudience = NormalizeAudience(audience);
            var query = _context.Users
                .AsNoTracking()
                .Include(user => user.Role)
                .Where(user =>
                    !user.IsDeleted &&
                    user.Status == "Active" &&
                    user.Role.RoleName != "Admin" &&
                    user.Email != "");

            if (normalizedAudience != "All")
            {
                query = query.Where(user => user.Role.RoleName == normalizedAudience);
            }

            var recipients = await query
                .Select(user => new
                {
                    user.Email,
                    user.FullName
                })
                .ToListAsync();

            var queuedCount = 0;
            foreach (var recipient in recipients)
            {
                if (_emailQueue.QueueNotificationEmail(
                    recipient.Email,
                    string.IsNullOrWhiteSpace(recipient.FullName) ? recipient.Email : recipient.FullName,
                    subject,
                    message,
                    actionUrl,
                    actionText))
                {
                    queuedCount++;
                }
            }

            return queuedCount;
        }

        private PlatformMaintenanceStatusResponse ToMaintenanceResponse(PlatformMaintenanceSetting setting)
        {
            var now = DateTime.UtcNow;
            var isActive = setting.IsEnabled &&
                (!setting.EndsAtUtc.HasValue || setting.EndsAtUtc.Value > now);

            return new PlatformMaintenanceStatusResponse
            {
                IsActive = isActive,
                IsEnabled = setting.IsEnabled,
                Title = string.IsNullOrWhiteSpace(setting.Title) ? "WorkBridge đang bảo trì" : setting.Title,
                Message = string.IsNullOrWhiteSpace(setting.Message)
                    ? "Hệ thống đang được bảo trì để nâng cấp trải nghiệm. Vui lòng quay lại sau ít phút."
                    : setting.Message,
                StartedAtUtc = setting.StartedAtUtc,
                EndsAtUtc = setting.EndsAtUtc,
                RemainingSeconds = isActive && setting.EndsAtUtc.HasValue
                    ? Math.Max(0, (int)Math.Ceiling((setting.EndsAtUtc.Value - now).TotalSeconds))
                    : null,
                UpdatedBy = setting.UpdatedBy,
                UpdatedAtUtc = setting.UpdatedAtUtc
            };
        }

        private static string NormalizeAudience(string? audience)
        {
            var normalized = (audience ?? "All").Trim();
            return normalized switch
            {
                "Applicant" => "Applicant",
                "Employer" => "Employer",
                _ => "All"
            };
        }

        private static string NormalizeEmailTypeLabel(string? type)
        {
            return (type ?? "General").Trim() switch
            {
                "Maintenance" => "Bảo trì hệ thống",
                "Upgrade" => "Nâng cấp WorkBridge",
                _ => "Thông báo WorkBridge"
            };
        }

        private static string NormalizeText(string? value, string fallback, int maxLength)
        {
            var text = string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
            return text.Length <= maxLength ? text : text[..maxLength];
        }

        private static string BuildMaintenanceEmailMessage(PlatformMaintenanceSetting setting, bool isEnabled)
        {
            if (!isEnabled)
            {
                return "WorkBridge đã hoàn tất bảo trì và hoạt động trở lại. Bạn có thể tiếp tục đăng nhập, tìm việc, ứng tuyển hoặc quản lý tuyển dụng như bình thường.";
            }

            var endText = setting.EndsAtUtc.HasValue
                ? setting.EndsAtUtc.Value.AddHours(7).ToString("dd/MM/yyyy HH:mm")
                : "chưa xác định";

            return
                $"{setting.Message}\n" +
                $"Thời gian dự kiến hoàn tất: {endText} (UTC+7).\n" +
                "Trong thời gian này, một số thao tác trên WorkBridge có thể tạm dừng để đảm bảo dữ liệu an toàn.";
        }

        private string GetWebAppUrl()
        {
            return (_configuration["Email:WebAppUrl"]
                ?? _configuration["Cors:AllowedOrigins"]?.Split(',', ';').FirstOrDefault()
                ?? "https://workbridge.vercel.app").Trim().TrimEnd('/');
        }
    }
}

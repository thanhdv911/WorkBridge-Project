using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using WorkBridge.API.Hubs;
using WorkBridge.Infrastructure.Data;
using WorkBridge.Application.Services;
using WorkBridge.API.Services;

namespace WorkBridge.API.Controllers
{
    /// <summary>
    /// Public endpoint for Home page data (no auth required)
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]
    public class HomeController : ControllerBase
    {
        private readonly IAdminService _adminService;
        private readonly IJobService _jobService;
        private readonly WorkBridgeContext _context;
        private readonly HomePresenceService _presence;
        private readonly IHubContext<HomePresenceHub> _presenceHub;

        public HomeController(
            IAdminService adminService,
            IJobService jobService,
            WorkBridgeContext context,
            HomePresenceService presence,
            IHubContext<HomePresenceHub> presenceHub)
        {
            _adminService = adminService;
            _jobService = jobService;
            _context = context;
            _presence = presence;
            _presenceHub = presenceHub;
        }

        /// <summary>GET platform-wide stats (public)</summary>
        [HttpGet("stats")]
        public async Task<IActionResult> GetPublicStats()
        {
            var stats = await _adminService.GetDashboardStatsAsync();
            return Ok(stats);
        }

        /// <summary>GET latest 6 published jobs (public)</summary>
        [HttpGet("latest-jobs")]
        public async Task<IActionResult> GetLatestJobs()
        {
            var result = await _jobService.GetJobsAsync(null, null, null, 1, 6);
            return Ok(result.Items);
        }

        /// <summary>GET job categories for public home page</summary>
        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            var categories = await _adminService.GetCategoriesAsync();
            return Ok(categories);
        }

        /// <summary>POST a lightweight public heartbeat and return current active visitors.</summary>
        [HttpPost("presence")]
        public async Task<IActionResult> TrackPresence([FromBody] PresenceHeartbeatRequest? request)
        {
            var visitorId = NormalizeVisitorId(request?.VisitorId);
            var currentUserId = GetCurrentUserId();
            var page = Math.Max(1, request?.Page ?? 1);
            var pageSize = Math.Clamp(request?.PageSize ?? 4, 1, 8);

            var presenceChanged = _presence.TrackPresence($"visitor:{visitorId}", currentUserId);
            var snapshot = _presence.GetSnapshot(page, pageSize);

            var onlineUsers = snapshot.OnlineUserIds.Count == 0
                ? new List<OnlineUserSummary>()
                : _context.Users
                    .AsNoTracking()
                    .Include(user => user.Role)
                    .Where(user =>
                        snapshot.OnlineUserIds.Contains(user.UserId) &&
                        !user.IsDeleted &&
                        user.Status == "Active" &&
                        user.Role.RoleName != "Admin")
                    .Select(user => new
                    {
                        UserId = user.UserId,
                        FullName = user.FullName,
                        AvatarUrl = user.AvatarUrl,
                        RoleName = user.Role.RoleName
                    })
                    .ToList()
                    .Select(user => new OnlineUserSummary
                    {
                        UserId = user.UserId,
                        FullName = user.FullName,
                        AvatarUrl = user.AvatarUrl,
                        RoleName = user.RoleName,
                        LastSeenAt = snapshot.LastSeenByUserId[user.UserId]
                    })
                    .OrderByDescending(user => user.LastSeenAt)
                    .ThenBy(user => user.FullName)
                    .ToList();

            var totalUsers = onlineUsers.Count;
            var totalPages = Math.Max(1, (int)Math.Ceiling(totalUsers / (double)snapshot.PageSize));
            page = Math.Min(page, totalPages);

            if (presenceChanged)
            {
                await _presenceHub.Clients.All.SendAsync(HomePresenceHub.PresenceChangedEvent);
            }

            return Ok(new
            {
                onlineCount = totalUsers,
                activeVisitorCount = snapshot.ActiveVisitorCount,
                users = onlineUsers
                    .Skip((page - 1) * snapshot.PageSize)
                    .Take(snapshot.PageSize)
                    .ToList(),
                page,
                pageSize = snapshot.PageSize,
                totalPages,
                activeWindowSeconds = snapshot.ActiveWindowSeconds,
                updatedAt = snapshot.UpdatedAt
            });
        }

        private static string NormalizeVisitorId(string? visitorId)
        {
            var value = (visitorId ?? "").Trim();
            if (value.Length is >= 12 and <= 80)
            {
                return value;
            }

            return Guid.NewGuid().ToString("N");
        }

        private int? GetCurrentUserId()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

            return int.TryParse(raw, out var userId) ? userId : null;
        }
    }

    public class PresenceHeartbeatRequest
    {
        public string? VisitorId { get; set; }
        public int? Page { get; set; }
        public int? PageSize { get; set; }
    }

    public class OnlineUserSummary
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = "";
        public string? AvatarUrl { get; set; }
        public string RoleName { get; set; } = "";
        public DateTime LastSeenAt { get; set; }
    }
}

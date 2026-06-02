using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkBridge.Infrastructure.Data;
using WorkBridge.Application.Services;

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
        private static readonly ConcurrentDictionary<string, ActiveVisitorPresence> ActiveVisitors = new();
        private static readonly TimeSpan ActiveVisitorWindow = TimeSpan.FromSeconds(75);
        private readonly IAdminService _adminService;
        private readonly IJobService _jobService;
        private readonly WorkBridgeContext _context;

        public HomeController(IAdminService adminService, IJobService jobService, WorkBridgeContext context)
        {
            _adminService = adminService;
            _jobService = jobService;
            _context = context;
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
        public IActionResult TrackPresence([FromBody] PresenceHeartbeatRequest? request)
        {
            var now = DateTime.UtcNow;
            var visitorId = NormalizeVisitorId(request?.VisitorId);
            var currentUserId = GetCurrentUserId();
            var page = Math.Max(1, request?.Page ?? 1);
            var pageSize = Math.Clamp(request?.PageSize ?? 4, 1, 8);

            ActiveVisitors[visitorId] = new ActiveVisitorPresence(visitorId, currentUserId, now);
            PruneInactiveVisitors(now);

            var lastSeenByUserId = ActiveVisitors.Values
                .Where(visitor => visitor.UserId.HasValue)
                .GroupBy(visitor => visitor.UserId!.Value)
                .ToDictionary(group => group.Key, group => group.Max(visitor => visitor.LastSeenAt));

            var onlineUserIds = lastSeenByUserId.Keys.ToList();
            var onlineUsers = onlineUserIds.Count == 0
                ? new List<OnlineUserSummary>()
                : _context.Users
                    .AsNoTracking()
                    .Include(user => user.Role)
                    .Where(user =>
                        onlineUserIds.Contains(user.UserId) &&
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
                        LastSeenAt = lastSeenByUserId[user.UserId]
                    })
                    .OrderByDescending(user => user.LastSeenAt)
                    .ThenBy(user => user.FullName)
                    .ToList();

            var totalUsers = onlineUsers.Count;
            var totalPages = Math.Max(1, (int)Math.Ceiling(totalUsers / (double)pageSize));
            page = Math.Min(page, totalPages);

            return Ok(new
            {
                onlineCount = totalUsers,
                activeVisitorCount = ActiveVisitors.Count,
                users = onlineUsers
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToList(),
                page,
                pageSize,
                totalPages,
                activeWindowSeconds = (int)ActiveVisitorWindow.TotalSeconds,
                updatedAt = now
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

        private static void PruneInactiveVisitors(DateTime now)
        {
            foreach (var item in ActiveVisitors)
            {
                if (now - item.Value.LastSeenAt > ActiveVisitorWindow)
                {
                    ActiveVisitors.TryRemove(item.Key, out _);
                }
            }
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

    public sealed record ActiveVisitorPresence(string VisitorId, int? UserId, DateTime LastSeenAt);

    public class OnlineUserSummary
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = "";
        public string? AvatarUrl { get; set; }
        public string RoleName { get; set; } = "";
        public DateTime LastSeenAt { get; set; }
    }
}

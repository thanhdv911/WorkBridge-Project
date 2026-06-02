using Microsoft.EntityFrameworkCore;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Services;
using WorkBridge.Infrastructure.Data;

namespace WorkBridge.API.Services
{
    public class ShiftRegistrationAutoPublishHostedService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<ShiftRegistrationAutoPublishHostedService> _logger;
        private DateTime? _lastAutoPublishDate;

        public ShiftRegistrationAutoPublishHostedService(
            IServiceScopeFactory scopeFactory,
            ILogger<ShiftRegistrationAutoPublishHostedService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Shift Registration Auto-Publish Hosted Service started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var now = DateTime.Now;
                    if (now.DayOfWeek == DayOfWeek.Tuesday && _lastAutoPublishDate != now.Date)
                    {
                        await AutoPublishNextWeekWindowsAsync(stoppingToken);
                        _lastAutoPublishDate = now.Date;
                    }
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Shift registration auto-publish sweep failed.");
                }

                await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
            }
        }

        private async Task AutoPublishNextWeekWindowsAsync(CancellationToken stoppingToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<WorkBridgeContext>();
            var workforceService = scope.ServiceProvider.GetRequiredService<IWorkforceService>();

            var now = DateTime.Now;
            var targetWeekStart = GetWeekStart(now).AddDays(7);
            var targetWeekStartStored = ToStoredLocalDateTime(targetWeekStart);

            var branches = await context.Branches
                .Where(branch => branch.IsActive &&
                                 context.EmployerProfiles.Any(profile =>
                                     profile.EmployerId == branch.EmployerId &&
                                     profile.Status == "Active") &&
                                 context.Users.Any(user =>
                                     user.UserId == branch.EmployerId &&
                                     user.Status == "Active" &&
                                     !user.IsDeleted) &&
                                 context.Employments.Any(employment =>
                                     employment.EmployerId == branch.EmployerId &&
                                     employment.BranchId == branch.BranchId &&
                                     employment.Status == "Active"))
                .Select(branch => new
                {
                    branch.BranchId,
                    branch.EmployerId,
                    branch.Name
                })
                .OrderBy(branch => branch.EmployerId)
                .ThenBy(branch => branch.Name)
                .ToListAsync(stoppingToken);

            var publishedCount = 0;
            var skippedCount = 0;

            foreach (var branch in branches)
            {
                var existingWindow = await context.ShiftRegistrationWindows
                    .Where(window => window.EmployerId == branch.EmployerId &&
                                     window.BranchId == branch.BranchId &&
                                     (window.WeekStartDate == targetWeekStartStored ||
                                      window.WeekStartDate == targetWeekStart))
                    .Select(window => new { window.ShiftRegistrationWindowId })
                    .FirstOrDefaultAsync(stoppingToken);

                if (existingWindow != null)
                {
                    var hasShifts = await context.WorkShifts
                        .AnyAsync(shift =>
                            shift.RegistrationWindowId == existingWindow.ShiftRegistrationWindowId &&
                            shift.Status != "Cancelled",
                            stoppingToken);

                    if (hasShifts)
                    {
                        skippedCount++;
                        continue;
                    }
                }

                var (_, error) = await workforceService.PublishNextWeekRegistrationWindowAsync(
                    branch.EmployerId,
                    new PublishRegistrationWindowRequest { BranchId = branch.BranchId });

                if (error != null)
                {
                    _logger.LogWarning(
                        "Could not auto-publish next-week registration window for employer {EmployerId}, branch {BranchId}: {Error}",
                        branch.EmployerId,
                        branch.BranchId,
                        error);
                    continue;
                }

                publishedCount++;
                _logger.LogInformation(
                    "Auto-published next-week registration window for employer {EmployerId}, branch {BranchId} ({BranchName}).",
                    branch.EmployerId,
                    branch.BranchId,
                    branch.Name);
            }

            _logger.LogInformation(
                "Shift registration auto-publish completed for week {WeekStart:yyyy-MM-dd}. Published {PublishedCount}, skipped {SkippedCount}.",
                targetWeekStart,
                publishedCount,
                skippedCount);
        }

        private static DateTime GetWeekStart(DateTime value)
        {
            var date = value.Date;
            var diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
            return date.AddDays(-diff);
        }

        private static DateTime NormalizeToLocalDateTime(DateTime value)
        {
            if (value.Kind == DateTimeKind.Utc) return value.ToLocalTime();
            if (value.Kind == DateTimeKind.Local) return value;
            return DateTime.SpecifyKind(value, DateTimeKind.Local);
        }

        private static DateTime ToStoredLocalDateTime(DateTime value)
        {
            var localValue = NormalizeToLocalDateTime(value);
            return DateTime.SpecifyKind(localValue, DateTimeKind.Local).ToUniversalTime();
        }
    }
}

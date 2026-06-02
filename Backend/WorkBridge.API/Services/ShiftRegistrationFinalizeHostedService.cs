using Microsoft.EntityFrameworkCore;
using WorkBridge.Infrastructure.Data;
using WorkBridge.Application.Services;

namespace WorkBridge.API.Services
{
    public class ShiftRegistrationFinalizeHostedService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<ShiftRegistrationFinalizeHostedService> _logger;

        public ShiftRegistrationFinalizeHostedService(IServiceScopeFactory scopeFactory, ILogger<ShiftRegistrationFinalizeHostedService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Shift Registration Auto-Finalize Hosted Service started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var context = scope.ServiceProvider.GetRequiredService<WorkBridgeContext>();
                    var workforceService = scope.ServiceProvider.GetRequiredService<IWorkforceService>();

                    var now = DateTime.Now; // local time, matching the CloseAt local time timezone in DB

                    // Sweep for ShiftRegistrationWindows that are open and have passed their close deadline
                    var expiredWindows = await context.ShiftRegistrationWindows
                        .Where(w => w.Status == "Open" && w.CloseAt <= now)
                        .ToListAsync(stoppingToken);

                    if (expiredWindows.Count > 0)
                    {
                        _logger.LogInformation("Found {Count} expired shift registration windows to auto-finalize.", expiredWindows.Count);
                        foreach (var window in expiredWindows)
                        {
                            try
                            {
                                _logger.LogInformation("Auto-finalizing shift registration window ID {WindowId} for Employer {EmployerId}.", window.ShiftRegistrationWindowId, window.EmployerId);

                                // Invoke the AI Scheduling Engine & Finalization Logic
                                var (result, error) = await workforceService.FinalizeRegistrationWindowAsync(window.EmployerId, window.ShiftRegistrationWindowId);
                                if (error != null)
                                {
                                    _logger.LogWarning("Failed to auto-finalize shift registration window ID {WindowId}: {Error}", window.ShiftRegistrationWindowId, error);
                                }
                                else
                                {
                                    _logger.LogInformation("Successfully auto-finalized shift registration window ID {WindowId} using AI Scheduling Engine.", window.ShiftRegistrationWindowId);
                                }
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, "An error occurred while auto-finalizing window ID {WindowId}.", window.ShiftRegistrationWindowId);
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Shift registration auto-finalize sweep failed.");
                }

                // Check every 1 minute
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }
    }
}

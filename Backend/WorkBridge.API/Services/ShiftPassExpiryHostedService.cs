using Microsoft.EntityFrameworkCore;
using WorkBridge.Infrastructure.Data;

namespace WorkBridge.API.Services
{
    public class ShiftPassExpiryHostedService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<ShiftPassExpiryHostedService> _logger;

        public ShiftPassExpiryHostedService(IServiceScopeFactory scopeFactory, ILogger<ShiftPassExpiryHostedService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var context = scope.ServiceProvider.GetRequiredService<WorkBridgeContext>();
                    var now = DateTime.Now;
                    var staleRequests = await context.ShiftPassRequests
                        .Where(r => r.Status == "Pending" && r.ExpiresAt <= now)
                        .ToListAsync(stoppingToken);

                    if (staleRequests.Count > 0)
                    {
                        foreach (var request in staleRequests)
                        {
                            request.Status = "Expired";
                            request.RespondedAt = DateTime.UtcNow;
                        }

                        await context.SaveChangesAsync(stoppingToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Shift pass expiry sweep failed.");
                }

                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }
    }
}

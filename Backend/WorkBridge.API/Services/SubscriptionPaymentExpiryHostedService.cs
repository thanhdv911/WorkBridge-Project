using WorkBridge.Application.Services;

namespace WorkBridge.API.Services
{
    public class SubscriptionPaymentExpiryHostedService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<SubscriptionPaymentExpiryHostedService> _logger;

        public SubscriptionPaymentExpiryHostedService(
            IServiceScopeFactory scopeFactory,
            ILogger<SubscriptionPaymentExpiryHostedService> logger)
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
                    var paymentService = scope.ServiceProvider.GetRequiredService<ISubscriptionPaymentService>();
                    var expiredCount = await paymentService.ExpirePendingPaymentsAsync();
                    if (expiredCount > 0)
                    {
                        _logger.LogInformation("Expired {ExpiredCount} stale VIP payment request(s).", expiredCount);
                    }
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "VIP payment expiry sweep failed.");
                }

                await Task.Delay(TimeSpan.FromSeconds(60), stoppingToken);
            }
        }
    }
}

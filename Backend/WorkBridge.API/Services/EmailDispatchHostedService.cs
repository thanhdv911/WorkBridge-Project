using WorkBridge.Application.Services;

namespace WorkBridge.API.Services
{
    public class EmailDispatchHostedService : BackgroundService
    {
        private readonly IEmailQueue _emailQueue;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<EmailDispatchHostedService> _logger;

        public EmailDispatchHostedService(
            IEmailQueue emailQueue,
            IServiceScopeFactory scopeFactory,
            ILogger<EmailDispatchHostedService> logger)
        {
            _emailQueue = emailQueue;
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await foreach (var email in _emailQueue.DequeueAllAsync(stoppingToken))
            {
                try
                {
                    _logger.LogInformation("Dispatching queued email '{Title}' to {ToEmail}.", email.Title, email.ToEmail);
                    using var scope = _scopeFactory.CreateScope();
                    var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
                    await emailService.SendNotificationEmailAsync(
                        email.ToEmail,
                        email.ToName,
                        email.Title,
                        email.Message,
                        email.ActionUrl,
                        email.ActionText);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Background email delivery failed for {ToEmail}.", email.ToEmail);
                }
            }
        }
    }
}

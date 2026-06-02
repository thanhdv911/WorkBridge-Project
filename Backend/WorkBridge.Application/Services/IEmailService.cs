namespace WorkBridge.Application.Services
{
    public interface IEmailService
    {
        Task SendNotificationEmailAsync(
            string toEmail,
            string toName,
            string title,
            string message,
            string? actionUrl = null,
            string? actionText = null);
    }
}

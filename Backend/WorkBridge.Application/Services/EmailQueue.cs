using System.Threading.Channels;

namespace WorkBridge.Application.Services
{
    public sealed record EmailNotificationMessage(
        string ToEmail,
        string ToName,
        string Title,
        string Message,
        string? ActionUrl = null,
        string? ActionText = null);

    public interface IEmailQueue
    {
        bool QueueNotificationEmail(
            string toEmail,
            string toName,
            string title,
            string message,
            string? actionUrl = null,
            string? actionText = null);
        IAsyncEnumerable<EmailNotificationMessage> DequeueAllAsync(CancellationToken cancellationToken);
    }

    public class InMemoryEmailQueue : IEmailQueue
    {
        private readonly Channel<EmailNotificationMessage> _queue = Channel.CreateUnbounded<EmailNotificationMessage>(
            new UnboundedChannelOptions
            {
                SingleReader = true,
                SingleWriter = false
            });

        public bool QueueNotificationEmail(
            string toEmail,
            string toName,
            string title,
            string message,
            string? actionUrl = null,
            string? actionText = null)
        {
            if (string.IsNullOrWhiteSpace(toEmail))
            {
                return false;
            }

            return _queue.Writer.TryWrite(new EmailNotificationMessage(toEmail, toName, title, message, actionUrl, actionText));
        }

        public IAsyncEnumerable<EmailNotificationMessage> DequeueAllAsync(CancellationToken cancellationToken)
        {
            return _queue.Reader.ReadAllAsync(cancellationToken);
        }
    }
}

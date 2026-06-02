using System.Net;
using System.Net.Mail;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace WorkBridge.Application.Services
{
    public class SmtpEmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<SmtpEmailService> _logger;

        public SmtpEmailService(IConfiguration configuration, ILogger<SmtpEmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task SendNotificationEmailAsync(
            string toEmail,
            string toName,
            string title,
            string message,
            string? actionUrl = null,
            string? actionText = null)
        {
            if (string.IsNullOrWhiteSpace(toEmail))
            {
                return;
            }

            var enabled = _configuration.GetValue("Email:Enabled", false);
            var host = _configuration["Email:Host"];
            var fromEmail = _configuration["Email:FromEmail"];
            var fromName = _configuration["Email:FromName"] ?? "WorkBridge";
            var webAppUrl = (_configuration["Email:WebAppUrl"] ?? "http://127.0.0.1:5173").TrimEnd('/');

            if (!enabled || string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(fromEmail))
            {
                _logger.LogInformation(
                    "\n=================== [MOCK EMAIL DISPATCHED] ===================\n" +
                    $"TO: {toEmail} ({toName})\n" +
                    $"SUBJECT: WorkBridge - {title}\n" +
                    $"MESSAGE:\n{message}\n" +
                    (!string.IsNullOrWhiteSpace(actionUrl) ? $"ACTION: {actionUrl}\n" : string.Empty) +
                    "===============================================================");
                return;
            }

            var port = _configuration.GetValue("Email:Port", 587);
            var useSsl = _configuration.GetValue("Email:UseSsl", true);
            var userName = _configuration["Email:UserName"];
            var password = _configuration["Email:Password"];

            using var mail = new MailMessage
            {
                From = new MailAddress(fromEmail, fromName, Encoding.UTF8),
                Subject = $"WorkBridge - {title}",
                SubjectEncoding = Encoding.UTF8,
                BodyEncoding = Encoding.UTF8,
                IsBodyHtml = true,
                Body = BuildHtmlBody(toName, title, message, webAppUrl, actionUrl, actionText)
            };
            mail.To.Add(new MailAddress(toEmail, string.IsNullOrWhiteSpace(toName) ? toEmail : toName, Encoding.UTF8));

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = useSsl
            };

            if (!string.IsNullOrWhiteSpace(userName))
            {
                client.Credentials = new NetworkCredential(userName, password);
            }

            await client.SendMailAsync(mail);
        }

        private static string BuildHtmlBody(string toName, string title, string message, string webAppUrl, string? actionUrl, string? actionText)
        {
            var safeName = WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(toName) ? "ban" : toName);
            var safeTitle = WebUtility.HtmlEncode(title);
            var safeMessage = WebUtility.HtmlEncode(message);
            var finalUrl = string.IsNullOrWhiteSpace(actionUrl) ? webAppUrl : actionUrl;
            var finalText = string.IsNullOrWhiteSpace(actionText) ? "Mo WorkBridge" : actionText;
            var safeUrl = WebUtility.HtmlEncode(finalUrl);
            var safeActionText = WebUtility.HtmlEncode(finalText);

            return $@"
<!doctype html>
<html>
<body style=""margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;"">
  <div style=""max-width:620px;margin:0 auto;padding:28px 16px;"">
    <div style=""background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;"">
      <div style=""padding:22px 24px;background:#2563eb;color:white;"">
        <div style=""font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;"">WorkBridge Notification</div>
        <h1 style=""margin:8px 0 0;font-size:22px;line-height:1.3;"">{safeTitle}</h1>
      </div>
      <div style=""padding:24px;"">
        <p style=""margin:0 0 14px;font-size:15px;line-height:1.6;"">Xin chao {safeName},</p>
        <p style=""margin:0 0 16px;font-size:15px;line-height:1.6;"">{safeMessage}</p>
        <div style=""margin:18px 0;padding:14px 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;color:#1d4ed8;font-size:14px;line-height:1.5;"">
          Ban nhan email nay vi co cap nhat quan trong tren WorkBridge. Hay vao website de xem chi tiet va thuc hien hanh dong can thiet.
        </div>
        <a href=""{safeUrl}"" style=""display:inline-block;margin-top:8px;padding:12px 18px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;"">
          {safeActionText}
        </a>
        <p style=""margin:22px 0 0;color:#64748b;font-size:12px;line-height:1.5;"">
          Neu nut tren khong mo duoc, hay truy cap: <a href=""{safeUrl}"" style=""color:#2563eb;"">{safeUrl}</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>";
        }
    }
}

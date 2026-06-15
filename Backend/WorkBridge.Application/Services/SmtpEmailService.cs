using System.Net;
using System.Net.Mail;
using System.Text;
using System.Text.RegularExpressions;
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
                _logger.LogWarning(
                    "\n=================== [EMAIL CHƯA GỬI - CHẾ ĐỘ THỬ] ===================\n" +
                    "SMTP chưa được cấu hình nên email bên dưới chỉ được ghi log.\n" +
                    $"Người nhận: {toEmail} ({toName})\n" +
                    $"Tiêu đề: WorkBridge | {title}\n" +
                    $"Nội dung:\n{message}\n" +
                    (!string.IsNullOrWhiteSpace(actionUrl) ? $"Liên kết hành động: {actionUrl}\n" : string.Empty) +
                    "================================================================");
                return;
            }

            var port = _configuration.GetValue("Email:Port", 587);
            var useSsl = _configuration.GetValue("Email:UseSsl", true);
            var userName = _configuration["Email:UserName"];
            var password = _configuration["Email:Password"];

            using var mail = new MailMessage
            {
                From = new MailAddress(fromEmail, fromName, Encoding.UTF8),
                Subject = $"WorkBridge | {title}",
                SubjectEncoding = Encoding.UTF8,
                BodyEncoding = Encoding.UTF8,
                IsBodyHtml = true,
                Body = BuildHtmlBody(toEmail, toName, title, message, webAppUrl, actionUrl, actionText)
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

        private static string BuildHtmlBody(
            string toEmail,
            string toName,
            string title,
            string message,
            string webAppUrl,
            string? actionUrl,
            string? actionText)
        {
            var safeName = WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(toName) ? "bạn" : toName);
            var safeEmail = WebUtility.HtmlEncode(toEmail);
            var safeTitle = WebUtility.HtmlEncode(title);
            var finalUrl = string.IsNullOrWhiteSpace(actionUrl) ? webAppUrl : actionUrl;
            var finalText = string.IsNullOrWhiteSpace(actionText) ? "Mở WorkBridge" : actionText;
            var safeUrl = WebUtility.HtmlEncode(finalUrl);
            var safeActionText = WebUtility.HtmlEncode(finalText);
            var messageHtml = BuildMessageHtml(message);
            var verificationCode = ExtractVerificationCode(message);
            
            var codeHtml = string.IsNullOrWhiteSpace(verificationCode)
                ? string.Empty
                : $@"
              <!-- Verification Code Box -->
              <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""margin: 30px 0;"">
                <tr>
                  <td align=""center"">
                    <div style=""background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; display: inline-block;"">
                      <div style=""font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;"">Mã xác thực của bạn</div>
                      <div style=""font-size: 36px; font-weight: 800; color: #0f8fe8; letter-spacing: 6px;"">{WebUtility.HtmlEncode(verificationCode)}</div>
                    </div>
                  </td>
                </tr>
              </table>";

            var buttonHtml = $@"
              <!-- Action Button -->
              <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""margin: 35px 0 20px;"">
                <tr>
                  <td align=""center"">
                    <a href=""{safeUrl}"" style=""display: inline-block; background-color: #0f8fe8; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(15, 143, 232, 0.25);"">{safeActionText}</a>
                  </td>
                </tr>
              </table>
              <p style=""margin: 0; font-size: 13px; color: #94a3b8; text-align: center;"">
                Hoặc truy cập liên kết:<br>
                <a href=""{safeUrl}"" style=""color: #0f8fe8; text-decoration: none;"">{safeUrl}</a>
              </p>";

            return $@"
<!doctype html>
<html lang=""vi"">
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width,initial-scale=1"">
  <title>{safeTitle}</title>
</head>
<body style=""margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;"">
  
  <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color: #f1f5f9; padding: 40px 20px;"">
    <tr>
      <td align=""center"">
        
        <!-- Header Logo -->
        <table width=""100%"" max-width=""600"" cellpadding=""0"" cellspacing=""0"" style=""max-width: 600px; margin-bottom: 24px;"">
          <tr>
            <td align=""center"">
              <a href=""{webAppUrl}"" target=""_blank"">
                <img src=""{webAppUrl}/workbridge-mark.png"" alt=""WorkBridge"" height=""45"" style=""display: block; border: none;"" />
              </a>
            </td>
          </tr>
        </table>
        
        <!-- Main Card -->
        <table width=""100%"" max-width=""600"" cellpadding=""0"" cellspacing=""0"" style=""max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);"">
          <!-- Top Accent Line -->
          <tr>
            <td style=""height: 6px; background: linear-gradient(90deg, #0f8fe8 0%, #0ea5e9 100%);""></td>
          </tr>
          
          <!-- Content Area -->
          <tr>
            <td style=""padding: 40px;"">
              <h1 style=""margin: 0 0 24px; font-size: 22px; font-weight: 700; color: #0f172a; text-align: center;"">{safeTitle}</h1>
              
              <p style=""margin: 0 0 16px; font-size: 16px; color: #334155;"">Xin chào <strong style=""color: #0f172a;"">{safeName}</strong>,</p>
              
              <div style=""font-size: 16px; color: #475569; line-height: 1.6;"">
                {messageHtml}
              </div>
              
              {codeHtml}
              
              {buttonHtml}
              
              <hr style=""border: none; border-top: 1px solid #e2e8f0; margin: 35px 0 24px;"">
              
              <!-- Security Notice -->
              <div style=""background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 16px;"">
                <p style=""margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;"">
                  <strong>Lưu ý bảo mật:</strong> WorkBridge không bao giờ yêu cầu bạn cung cấp mật khẩu. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc liên hệ với chúng tôi.
                </p>
              </div>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table width=""100%"" max-width=""600"" cellpadding=""0"" cellspacing=""0"" style=""max-width: 600px; margin-top: 24px;"">
          <tr>
            <td align=""center"" style=""font-size: 13px; color: #64748b; line-height: 1.6;"">
              &copy; {DateTime.UtcNow.AddHours(7).Year} <strong>WorkBridge</strong>. Kết nối năng lực - Kiến tạo tương lai.<br>
              Email này được gửi đến {safeEmail}.<br>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>";
        }

        private static string BuildMessageHtml(string message)
        {
            var normalized = (message ?? string.Empty).Replace("\r\n", "\n").Trim();
            if (string.IsNullOrWhiteSpace(normalized))
            {
                normalized = "Bạn có một cập nhật mới trên WorkBridge. Vui lòng mở trang WorkBridge để xem chi tiết.";
            }

            var lines = normalized
                .Split('\n')
                .Select(line => line.Trim())
                .Where(line => !string.IsNullOrWhiteSpace(line))
                .ToList();

            var html = new StringBuilder();
            foreach (var line in lines)
            {
                html.Append($@"<p style=""margin:0 0 12px;"">{WebUtility.HtmlEncode(line)}</p>");
            }

            return html.ToString();
        }

        private static string? ExtractVerificationCode(string message)
        {
            var match = Regex.Match(message ?? string.Empty, @"(?<!\d)(\d{6})(?!\d)");
            return match.Success ? match.Groups[1].Value : null;
        }
    }
}

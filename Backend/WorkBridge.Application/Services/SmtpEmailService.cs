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
              <tr>
                <td style=""padding:0 32px 22px;"">
                  <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""border-collapse:collapse;background:#f0f9ff;border:1px solid #bae6fd;border-radius:18px;"">
                    <tr>
                      <td style=""padding:22px 20px;text-align:center;"">
                        <div style=""font-size:12px;line-height:18px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#0369a1;"">Mã xác thực của bạn</div>
                        <div style=""margin-top:10px;font-family:'Segoe UI',Arial,sans-serif;font-size:34px;line-height:42px;font-weight:900;letter-spacing:8px;color:#075985;"">{WebUtility.HtmlEncode(verificationCode)}</div>
                        <div style=""margin-top:10px;font-size:13px;line-height:20px;color:#0f5f8c;"">Mã chỉ dùng một lần. Vui lòng không chia sẻ mã này với bất kỳ ai.</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>";
            var sentAt = DateTime.UtcNow.AddHours(7).ToString("dd/MM/yyyy HH:mm");

            return $@"
<!doctype html>
<html lang=""vi"">
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width,initial-scale=1"">
  <title>{safeTitle}</title>
</head>
<body style=""margin:0;padding:0;background:#eef7ff;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#0f172a;"">
  <div style=""display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;"">
    WorkBridge gửi bạn một thông báo quan trọng. Vui lòng mở email để xem đầy đủ thông tin.
  </div>

  <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""border-collapse:collapse;background:#eef7ff;margin:0;padding:0;"">
    <tr>
      <td align=""center"" style=""padding:32px 14px;"">
        <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""border-collapse:collapse;max-width:680px;background:#ffffff;border:1px solid #cfe7ff;border-radius:26px;overflow:hidden;box-shadow:0 22px 70px rgba(15,23,42,.12);"">
          <tr>
            <td style=""padding:0;background:#0f8fe8;"">
              <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""border-collapse:collapse;background:linear-gradient(135deg,#0f8fe8 0%,#0b6bc7 55%,#0b3d91 100%);"">
                <tr>
                  <td style=""padding:30px 32px;color:#ffffff;"">
                    <div style=""display:inline-block;padding:7px 12px;border:1px solid rgba(255,255,255,.35);border-radius:999px;background:rgba(255,255,255,.14);font-size:12px;line-height:16px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;"">
                      Thông báo từ WorkBridge
                    </div>
                    <h1 style=""margin:16px 0 0;font-size:28px;line-height:36px;font-weight:900;color:#ffffff;"">{safeTitle}</h1>
                    <p style=""margin:10px 0 0;font-size:15px;line-height:23px;color:#dff2ff;"">
                      Email này được gửi tự động để bạn không bỏ lỡ thông tin quan trọng trong tài khoản WorkBridge.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style=""padding:30px 32px 18px;"">
              <p style=""margin:0 0 14px;font-size:16px;line-height:26px;color:#0f172a;"">Xin chào <strong>{safeName}</strong>,</p>
              <div style=""font-size:15px;line-height:25px;color:#334155;"">
                {messageHtml}
              </div>
            </td>
          </tr>

          {codeHtml}

          <tr>
            <td style=""padding:0 32px 24px;"">
              <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;"">
                <tr>
                  <td style=""padding:18px 20px;"">
                    <div style=""font-size:13px;line-height:20px;font-weight:900;color:#0f172a;"">Lưu ý bảo mật</div>
                    <div style=""margin-top:6px;font-size:13px;line-height:21px;color:#475569;"">
                      WorkBridge không bao giờ yêu cầu bạn cung cấp mật khẩu qua email. Nếu bạn không nhận ra hoạt động này, hãy đăng nhập và kiểm tra lại thông tin tài khoản càng sớm càng tốt.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align=""center"" style=""padding:0 32px 26px;"">
              <a href=""{safeUrl}"" style=""display:inline-block;background:#0f8fe8;color:#ffffff;text-decoration:none;border-radius:14px;padding:14px 24px;font-size:15px;line-height:20px;font-weight:900;box-shadow:0 12px 28px rgba(15,143,232,.28);"">
                {safeActionText}
              </a>
              <p style=""margin:18px 0 0;font-size:12px;line-height:20px;color:#64748b;"">
                Nếu nút trên không mở được, hãy sao chép liên kết này và dán vào trình duyệt:
              </p>
              <p style=""margin:6px 0 0;font-size:12px;line-height:20px;word-break:break-all;color:#0b6bc7;"">
                <a href=""{safeUrl}"" style=""color:#0b6bc7;text-decoration:underline;"">{safeUrl}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style=""padding:0 32px 30px;"">
              <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""border-collapse:collapse;border-top:1px solid #e2e8f0;"">
                <tr>
                  <td style=""padding-top:18px;font-size:12px;line-height:20px;color:#64748b;"">
                    <strong style=""color:#334155;"">Người nhận:</strong> {safeEmail}<br>
                    <strong style=""color:#334155;"">Thời gian gửi:</strong> {sentAt} (UTC+7)<br>
                    Đây là email tự động từ WorkBridge. Vui lòng không trả lời trực tiếp email này.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <div style=""max-width:680px;margin:18px auto 0;text-align:center;font-size:12px;line-height:20px;color:#64748b;"">
          © WorkBridge. Nền tảng kết nối việc làm bán thời gian và quản lý ca làm.
        </div>
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

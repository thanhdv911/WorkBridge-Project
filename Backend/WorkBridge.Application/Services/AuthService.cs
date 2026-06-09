using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using WorkBridge.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Security.Claims;
using System.Text;
using System.Net.Http.Json;
using WorkBridge.Application.DTOs;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public class AuthService : IAuthService
    {
        private readonly IWorkBridgeContext _context;
        private readonly IConfiguration _config;
        private readonly IEmailQueue _emailQueue;

        public AuthService(IWorkBridgeContext context, IConfiguration config, IEmailQueue emailQueue)
        {
            _context = context;
            _config = config;
            _emailQueue = emailQueue;
        }

        public async Task<(AuthResponse? Response, string? Error)> LoginAsync(LoginRequest request)
        {
            var email = NormalizeEmail(request.Email);
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email && !u.IsDeleted);

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return (null, "Email hoặc mật khẩu không đúng.");
            }

            if (!IsActiveUser(user))
            {
                return (null, "Tài khoản của bạn đang bị khóa. Vui lòng liên hệ quản trị viên.");
            }

            // Generate JWT
            var token = GenerateJwtToken(user);

            return (new AuthResponse
            {
                Token = token,
                FullName = user.FullName,
                Role = user.Role.RoleName,
                UserId = user.UserId
            }, null);
        }

        public async Task<(RegisterStartResponse? Response, string? Error)> RegisterAsync(RegisterRequest request)
        {
            var email = NormalizeEmail(request.Email);
            if (string.IsNullOrWhiteSpace(email))
            {
                return (null, "Email là bắt buộc.");
            }

            if (string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName))
            {
                return (null, "Vui lòng nhập đầy đủ họ và tên.");
            }

            if (string.IsNullOrWhiteSpace(request.Password))
            {
                return (null, "Mật khẩu là bắt buộc.");
            }

            if (request.Password.Length < 8)
            {
                return (null, "Mật khẩu phải có ít nhất 8 ký tự.");
            }

            if (await _context.Users.AnyAsync(u => u.Email.ToLower() == email))
            {
                return (null, "Email này đã được đăng ký.");
            }

            var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == request.Role);
            if (role == null)
            {
                return (null, "Vai trò đăng ký không hợp lệ.");
            }

            var now = DateTime.UtcNow;
            var pendingRequests = await _context.EmailVerificationRequests
                .Where(v => v.Email.ToLower() == email && v.Status == "Pending")
                .ToListAsync();

            foreach (var pending in pendingRequests)
            {
                pending.Status = "Replaced";
            }

            var code = GenerateSixDigitCode();
            var verification = new EmailVerificationRequest
            {
                Email = email,
                FirstName = request.FirstName.Trim(),
                LastName = request.LastName.Trim(),
                RoleName = role.RoleName,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                CodeHash = HashVerificationCode(email, code),
                AttemptCount = 0,
                Status = "Pending",
                CreatedAt = now,
                ExpiresAt = now.AddMinutes(10)
            };

            await _context.EmailVerificationRequests.AddAsync(verification);
            await _context.SaveChangesAsync();

            var displayName = $"{verification.FirstName} {verification.LastName}".Trim();
            var webAppUrl = (_config["Email:WebAppUrl"] ?? "http://127.0.0.1:5173").TrimEnd('/');
            _emailQueue.QueueNotificationEmail(
                email,
                string.IsNullOrWhiteSpace(displayName) ? email : displayName,
                "Xác thực email đăng ký WorkBridge",
                $"""
                WorkBridge đã nhận yêu cầu tạo tài khoản mới bằng địa chỉ email này.
                Mã xác thực của bạn là {code}.
                Mã có hiệu lực trong 10 phút kể từ khi email được gửi.
                Sau khi nhập đúng mã, tài khoản WorkBridge của bạn mới được tạo chính thức.
                Nếu bạn không thực hiện yêu cầu đăng ký này, vui lòng bỏ qua email và không chia sẻ mã cho bất kỳ ai.
                """,
                $"{webAppUrl}/signup",
                "Mở trang xác thực");

            return (new RegisterStartResponse
            {
                Message = "Mã xác thực 6 số đã được gửi đến email của bạn.",
                Email = email,
                ExpiresInMinutes = 10
            }, null);
        }

        public async Task<(AuthResponse? Response, string? Error)> VerifyRegistrationAsync(VerifyRegisterEmailRequest request)
        {
            var email = NormalizeEmail(request.Email);
            var code = request.Code?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(email) || code.Length != 6 || !code.All(char.IsDigit))
            {
                return (null, "Mã xác thực không hợp lệ.");
            }

            var now = DateTime.UtcNow;
            var verification = await _context.EmailVerificationRequests
                .Where(v => v.Email.ToLower() == email && v.Status == "Pending")
                .OrderByDescending(v => v.CreatedAt)
                .FirstOrDefaultAsync();

            if (verification == null)
            {
                return (null, "Không tìm thấy yêu cầu xác thực. Vui lòng đăng ký lại.");
            }

            if (verification.ExpiresAt <= now)
            {
                verification.Status = "Expired";
                await _context.SaveChangesAsync();
                return (null, "Mã xác thực đã hết hạn. Vui lòng đăng ký lại để nhận mã mới.");
            }

            if (verification.AttemptCount >= 5)
            {
                verification.Status = "Failed";
                await _context.SaveChangesAsync();
                return (null, "Bạn đã nhập sai quá nhiều lần. Vui lòng đăng ký lại để nhận mã mới.");
            }

            if (!string.Equals(verification.CodeHash, HashVerificationCode(email, code), StringComparison.Ordinal))
            {
                verification.AttemptCount++;
                if (verification.AttemptCount >= 5)
                {
                    verification.Status = "Failed";
                }

                await _context.SaveChangesAsync();
                return (null, "Mã xác thực không đúng.");
            }

            if (await _context.Users.AnyAsync(u => u.Email.ToLower() == email))
            {
                verification.Status = "Used";
                await _context.SaveChangesAsync();
                return (null, "Email này đã được sử dụng.");
            }

            var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == verification.RoleName);
            if (role == null)
            {
                return (null, "Vai trò đăng ký không hợp lệ.");
            }

            await using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var user = new User
                {
                    Email = verification.Email,
                    FullName = $"{verification.FirstName} {verification.LastName}".Trim(),
                    PasswordHash = verification.PasswordHash,
                    RoleId = role.RoleId,
                    Status = "Active",
                    IsDeleted = false,
                    CreatedAt = now
                };

                if (string.IsNullOrWhiteSpace(user.FullName))
                {
                    user.FullName = verification.Email;
                }

                await _context.Users.AddAsync(user);
                await _context.SaveChangesAsync();

                if (role.RoleName == "Applicant")
                {
                    var profile = new ApplicantProfile
                    {
                        ApplicantId = user.UserId,
                        ReputationScore = 80,
                        ReportCount = 0
                    };
                    profile.ReputationScore = ProfileReputationCalculator.CalculateApplicantScore(profile, user);
                    await _context.ApplicantProfiles.AddAsync(profile);
                }
                else if (role.RoleName == "Employer")
                {
                    var profile = new EmployerProfile
                    {
                        EmployerId = user.UserId,
                        CompanyName = user.FullName,
                        ContactEmail = user.Email,
                        ReputationScore = 80,
                        ReportCount = 0,
                        Status = "Active"
                    };
                    profile.ReputationScore = ProfileReputationCalculator.CalculateEmployerScore(profile, user);
                    await _context.EmployerProfiles.AddAsync(profile);
                }

                verification.Status = "Verified";
                verification.VerifiedAt = now;
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var token = GenerateJwtToken(user, role.RoleName);
                return (new AuthResponse
                {
                    Token = token,
                    FullName = user.FullName,
                    Role = role.RoleName,
                    UserId = user.UserId
                }, null);
            }
            catch (DbUpdateException)
            {
                await transaction.RollbackAsync();
                return (null, "Email này đã được sử dụng hoặc tài khoản đã tồn tại.");
            }
        }

        public async Task RequestPasswordResetAsync(ForgotPasswordRequest request)
        {
            var email = request.Email.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(email))
            {
                return;
            }

            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email && !u.IsDeleted && u.Status == "Active");

            if (user == null)
            {
                return;
            }

            var now = DateTime.UtcNow;
            var existingTokens = await _context.PasswordResetTokens
                .Where(t => t.UserId == user.UserId && t.UsedAt == null && t.ExpiresAt > now)
                .ToListAsync();

            foreach (var existing in existingTokens)
            {
                existing.UsedAt = now;
            }

            var rawToken = GenerateResetToken();
            var resetToken = new PasswordResetToken
            {
                UserId = user.UserId,
                TokenHash = HashResetToken(rawToken),
                CreatedAt = now,
                ExpiresAt = now.AddMinutes(30)
            };

            await _context.PasswordResetTokens.AddAsync(resetToken);
            await _context.SaveChangesAsync();

            var webAppUrl = (_config["Email:WebAppUrl"] ?? "http://127.0.0.1:5173").TrimEnd('/');
            var resetUrl = $"{webAppUrl}/reset-password?email={Uri.EscapeDataString(user.Email)}&token={Uri.EscapeDataString(rawToken)}";

            _emailQueue.QueueNotificationEmail(
                user.Email,
                user.FullName,
                "Đặt lại mật khẩu WorkBridge",
                """
                WorkBridge vừa nhận yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
                Vui lòng nhấn nút bên dưới để tạo mật khẩu mới.
                Liên kết đặt lại mật khẩu chỉ dùng được một lần và có hiệu lực trong 30 phút.
                Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email. Mật khẩu hiện tại của bạn sẽ không thay đổi.
                """,
                resetUrl,
                "Đặt lại mật khẩu");
        }

        public async Task<(bool Success, string? Error)> ResetPasswordAsync(ResetPasswordRequest request)
        {
            var email = request.Email.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Token))
            {
                return (false, "Email và mã đặt lại mật khẩu là bắt buộc.");
            }

            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
            {
                return (false, "Mật khẩu phải có ít nhất 8 ký tự.");
            }

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email && !u.IsDeleted && u.Status == "Active");
            if (user == null)
            {
                return (false, "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
            }

            var tokenHash = HashResetToken(request.Token);
            var now = DateTime.UtcNow;
            var resetToken = await _context.PasswordResetTokens
                .Where(t => t.UserId == user.UserId &&
                            t.TokenHash == tokenHash &&
                            t.UsedAt == null &&
                            t.ExpiresAt > now)
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefaultAsync();

            if (resetToken == null)
            {
                return (false, "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.UpdatedAt = now;
            resetToken.UsedAt = now;

            await _context.SaveChangesAsync();
            return (true, null);
        }

        private static string GenerateResetToken()
        {
            return Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));
        }

        private static string GenerateSixDigitCode()
        {
            return RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        }

        private static string NormalizeEmail(string? email)
        {
            return (email ?? string.Empty).Trim().ToLowerInvariant();
        }

        private string HashVerificationCode(string email, string code)
        {
            var secret = _config["JwtSettings:Secret"] ?? "workbridge-email-verification";
            return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{email}|{code}|{secret}")));
        }

        private static string HashResetToken(string token)
        {
            return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
        }

        private string GenerateJwtToken(User user, string? roleName = null)
        {
            var jwtSettings = _config.GetSection("JwtSettings");
            var key = Encoding.ASCII.GetBytes(jwtSettings["Secret"]!);

        // Use provided roleName or user's navigation property
        var userRole = roleName ?? user.Role?.RoleName ?? "Applicant";

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(ClaimTypes.Name, user.FullName),
                new Claim(ClaimTypes.Role, userRole)
            }),
            Expires = DateTime.UtcNow.AddMinutes(double.Parse(jwtSettings["ExpiryMinutes"]!)),
            Issuer = jwtSettings["Issuer"],
            Audience = jwtSettings["Audience"],
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public async Task<AuthResponse?> LoginWithGoogleAsync(ExternalAuthRequest request)
    {
        var clientId = _config["GoogleAuth:ClientId"];
        if (string.IsNullOrWhiteSpace(clientId))
        {
            return null;
        }

        var settings = new Google.Apis.Auth.GoogleJsonWebSignature.ValidationSettings()
        {
            Audience = new List<string>() { clientId }
        };

        Google.Apis.Auth.GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await Google.Apis.Auth.GoogleJsonWebSignature.ValidateAsync(request.IdToken, settings);
        }
        catch
        {
            // Invalid token
            return null;
        }

        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == payload.Email && !u.IsDeleted);

        if (user == null)
        {
            // Register a new user automatically as "Applicant" per our agreed spec
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Applicant");
            if (role == null) return null;

            user = new User
            {
                Email = payload.Email,
                FullName = payload.Name,
                // Assign a dummy, strong random password for external logins
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString() + "GoogleLogin!99"),
                RoleId = role.RoleId,
                Status = "Active",
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow
            };

            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();

            // Create Applicant Profile
            var profile = new ApplicantProfile
            {
                ApplicantId = user.UserId,
                ReputationScore = 80,
                ReportCount = 0
            };
            profile.ReputationScore = ProfileReputationCalculator.CalculateApplicantScore(profile, user);
            await _context.ApplicantProfiles.AddAsync(profile);
            await _context.SaveChangesAsync();

            user.Role = role; // Attach role to generate correct token claims
        }
        else if (!IsActiveUser(user))
        {
            return null;
        }

        var token = GenerateJwtToken(user);

        return new AuthResponse
        {
            Token = token,
            FullName = user.FullName,
            Role = user.Role.RoleName,
            UserId = user.UserId
        };
    }

    public async Task<AuthResponse?> LoginWithFacebookAsync(FacebookAuthRequest request)
    {
        using var httpClient = new HttpClient();
        var fbUrl = $"https://graph.facebook.com/me?fields=id,name,email&access_token={request.AccessToken}";

        try
        {
            var fbResponse = await httpClient.GetAsync(fbUrl);
            if (!fbResponse.IsSuccessStatusCode) return null;

            var fbData = await fbResponse.Content.ReadFromJsonAsync<FacebookUserData>();
            if (fbData == null || string.IsNullOrEmpty(fbData.Email)) return null;

            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email == fbData.Email && !u.IsDeleted);

            if (user == null)
            {
                var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Applicant");
                if (role == null) return null;

                user = new User
                {
                    Email = fbData.Email,
                    FullName = fbData.Name,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString() + "FBLogin!123"),
                    RoleId = role.RoleId,
                    Status = "Active",
                    IsDeleted = false,
                    CreatedAt = DateTime.UtcNow
                };

                await _context.Users.AddAsync(user);
                await _context.SaveChangesAsync();

                var profile = new ApplicantProfile
                {
                    ApplicantId = user.UserId,
                    ReputationScore = 80,
                    ReportCount = 0
                };
                profile.ReputationScore = ProfileReputationCalculator.CalculateApplicantScore(profile, user);
                await _context.ApplicantProfiles.AddAsync(profile);
                await _context.SaveChangesAsync();

                user.Role = role;
            }
            else if (!IsActiveUser(user))
            {
                return null;
            }

            var token = GenerateJwtToken(user);

            return new AuthResponse
            {
                Token = token,
                FullName = user.FullName,
                Role = user.Role.RoleName,
                UserId = user.UserId
            };
        }
        catch
        {
            return null;
        }
    }

    private class FacebookUserData
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
    }

    private static bool IsActiveUser(User user)
    {
        return !user.IsDeleted && string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase);
    }
}
}

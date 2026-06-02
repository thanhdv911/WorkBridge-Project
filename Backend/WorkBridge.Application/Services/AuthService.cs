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

        public async Task<AuthResponse?> LoginAsync(LoginRequest request)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email == request.Email && !u.IsDeleted);

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return null;
            }

            if (!IsActiveUser(user))
            {
                return null;
            }

            // Generate JWT
            var token = GenerateJwtToken(user);

            return new AuthResponse
            {
                Token = token,
                FullName = user.FullName,
                Role = user.Role.RoleName,
                UserId = user.UserId
            };
        }

        public async Task<AuthResponse?> RegisterAsync(RegisterRequest request)
        {
            // Check if email already exists
            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            {
                return null; // Return null or throw custom exception to indicate email is taken
            }

            var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == request.Role);
            if (role == null)
            {
                return null; // Invalid role
            }

            var user = new User
            {
                Email = request.Email,
                FullName = $"{request.FirstName} {request.LastName}".Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                RoleId = role.RoleId,
                Status = "Active",
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow
            };

            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();

            // Insert into specific profile table
            if (role.RoleName == "Applicant")
            {
                var profile = new ApplicantProfile { ApplicantId = user.UserId };
                await _context.ApplicantProfiles.AddAsync(profile);
            }
            else if (role.RoleName == "Employer")
            {
                var profile = new EmployerProfile
                {
                    EmployerId = user.UserId,
                    CompanyName = user.FullName + " Company", // Temporary placeholder
                    ContactEmail = user.Email
                };
                await _context.EmployerProfiles.AddAsync(profile);
            }

            await _context.SaveChangesAsync();

            var token = GenerateJwtToken(user, role.RoleName);

            return new AuthResponse
            {
                Token = token,
                FullName = user.FullName,
                Role = role.RoleName,
                UserId = user.UserId
            };
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
                "\u0110\u1eb7t l\u1ea1i m\u1eadt kh\u1ea9u",
                "WorkBridge v\u1eeba nh\u1eadn y\u00eau c\u1ea7u \u0111\u1eb7t l\u1ea1i m\u1eadt kh\u1ea9u cho t\u00e0i kho\u1ea3n c\u1ee7a b\u1ea1n. Li\u00ean k\u1ebft n\u00e0y c\u00f3 hi\u1ec7u l\u1ef1c trong 30 ph\u00fat. N\u1ebfu b\u1ea1n kh\u00f4ng y\u00eau c\u1ea7u thao t\u00e1c n\u00e0y, b\u1ea1n c\u00f3 th\u1ec3 b\u1ecf qua email.",
                resetUrl,
                "\u0110\u1eb7t l\u1ea1i m\u1eadt kh\u1ea9u");
        }

        public async Task<(bool Success, string? Error)> ResetPasswordAsync(ResetPasswordRequest request)
        {
            var email = request.Email.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Token))
            {
                return (false, "Email and reset token are required.");
            }

            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
            {
                return (false, "Password must be at least 8 characters.");
            }

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email && !u.IsDeleted && u.Status == "Active");
            if (user == null)
            {
                return (false, "Reset link is invalid or expired.");
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
                return (false, "Reset link is invalid or expired.");
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
            var profile = new ApplicantProfile { ApplicantId = user.UserId };
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

                var profile = new ApplicantProfile { ApplicantId = user.UserId };
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

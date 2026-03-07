using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Net.Http.Json;
using WorkBridge.API.DTOs;
using WorkBridge.Infrastructure.Models;

namespace WorkBridge.API.Services
{
    public class AuthService : IAuthService
    {
        private readonly WorkBridgeContext _context;
        private readonly IConfiguration _config;

        public AuthService(WorkBridgeContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
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
        var settings = new Google.Apis.Auth.GoogleJsonWebSignature.ValidationSettings()
        {
            Audience = new List<string>() { clientId }
        };

        Google.Apis.Auth.GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await Google.Apis.Auth.GoogleJsonWebSignature.ValidateAsync(request.IdToken, settings);
        }
        catch (Exception ex)
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
        public string Id { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
    }
}
}

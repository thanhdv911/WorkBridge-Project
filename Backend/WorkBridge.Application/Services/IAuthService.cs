using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using WorkBridge.Application.Interfaces;
using WorkBridge.Application.DTOs;

namespace WorkBridge.Application.Services
{
    public interface IAuthService
    {
        Task<(AuthResponse? Response, string? Error)> LoginAsync(LoginRequest request);
        Task<(RegisterStartResponse? Response, string? Error)> RegisterAsync(RegisterRequest request);
        Task<(AuthResponse? Response, string? Error)> VerifyRegistrationAsync(VerifyRegisterEmailRequest request);
        Task<AuthResponse?> LoginWithGoogleAsync(ExternalAuthRequest request);
        Task<AuthResponse?> LoginWithFacebookAsync(FacebookAuthRequest request);
        Task RequestPasswordResetAsync(ForgotPasswordRequest request);
        Task<(bool Success, string? Error)> ResetPasswordAsync(ResetPasswordRequest request);
    }
}

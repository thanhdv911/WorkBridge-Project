using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using WorkBridge.Application.Interfaces;
using WorkBridge.Application.DTOs;

namespace WorkBridge.Application.Services
{
    public interface IAuthService
    {
        Task<AuthResponse?> LoginAsync(LoginRequest request);
        Task<AuthResponse?> RegisterAsync(RegisterRequest request);
        Task<AuthResponse?> LoginWithGoogleAsync(ExternalAuthRequest request);
        Task<AuthResponse?> LoginWithFacebookAsync(FacebookAuthRequest request);
    }
}

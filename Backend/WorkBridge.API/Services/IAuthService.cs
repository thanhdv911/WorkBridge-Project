using WorkBridge.API.DTOs;

namespace WorkBridge.API.Services
{
    public interface IAuthService
    {
        Task<AuthResponse?> LoginAsync(LoginRequest request);
        Task<AuthResponse?> RegisterAsync(RegisterRequest request);
        Task<AuthResponse?> LoginWithGoogleAsync(ExternalAuthRequest request);
        Task<AuthResponse?> LoginWithFacebookAsync(FacebookAuthRequest request);
    }
}

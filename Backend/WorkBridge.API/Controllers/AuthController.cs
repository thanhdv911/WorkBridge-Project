using Microsoft.AspNetCore.Mvc;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Services;

namespace WorkBridge.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
            {
                return BadRequest("Email and Password are required");
            }

            var response = await _authService.LoginAsync(request);

            if (response == null)
            {
                return Unauthorized("Invalid email or password");
            }

            return Ok(response);
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
            {
                return BadRequest("Email and Password are required");
            }

            var response = await _authService.RegisterAsync(request);

            if (response == null)
            {
                return BadRequest("Registration failed. Email might already exist or role is invalid.");
            }

            return Ok(response);
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new AuthMessageResponse { Message = "Email is required." });
            }

            await _authService.RequestPasswordResetAsync(request);
            return Ok(new AuthMessageResponse
            {
                Message = "If that email is registered, a password reset link has been sent."
            });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            var (success, error) = await _authService.ResetPasswordAsync(request);
            if (!success)
            {
                return BadRequest(new AuthMessageResponse { Message = error ?? "Password reset failed." });
            }

            return Ok(new AuthMessageResponse { Message = "Password has been reset successfully." });
        }

        [HttpPost("google")]
        public async Task<IActionResult> GoogleLogin([FromBody] ExternalAuthRequest request)
        {
            if (string.IsNullOrEmpty(request.IdToken))
            {
                return BadRequest("ID Token is required");
            }

            var response = await _authService.LoginWithGoogleAsync(request);

            if (response == null)
            {
                return Unauthorized("Invalid Google Token or authentication failed.");
            }

            return Ok(response);
        }

        [HttpPost("facebook")]
        public async Task<IActionResult> FacebookLogin([FromBody] FacebookAuthRequest request)
        {
            if (string.IsNullOrEmpty(request.AccessToken))
            {
                return BadRequest("Access Token is required");
            }

            var response = await _authService.LoginWithFacebookAsync(request);

            if (response == null)
            {
                return Unauthorized("Invalid Facebook Token or authentication failed.");
            }

            return Ok(response);
        }
    }
}

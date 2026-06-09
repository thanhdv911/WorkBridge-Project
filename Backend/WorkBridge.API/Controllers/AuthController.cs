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
            if (request == null)
            {
                return BadRequest("Dữ liệu đăng nhập không hợp lệ.");
            }

            if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
            {
                return BadRequest("Email và mật khẩu là bắt buộc.");
            }

            var (response, error) = await _authService.LoginAsync(request);

            if (response == null)
            {
                return Unauthorized(error ?? "Email hoặc mật khẩu không đúng.");
            }

            return Ok(response);
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (request == null)
            {
                return BadRequest(new AuthMessageResponse { Message = "Dữ liệu đăng ký không hợp lệ." });
            }

            if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
            {
                return BadRequest(new AuthMessageResponse { Message = "Email và mật khẩu là bắt buộc." });
            }

            var (response, error) = await _authService.RegisterAsync(request);

            if (response == null)
            {
                return BadRequest(new AuthMessageResponse { Message = error ?? "Không thể gửi mã xác thực. Vui lòng thử lại." });
            }

            return Ok(response);
        }

        [HttpPost("register/verify")]
        public async Task<IActionResult> VerifyRegistration([FromBody] VerifyRegisterEmailRequest request)
        {
            if (request == null)
            {
                return BadRequest(new AuthMessageResponse { Message = "Vui lòng nhập email và mã xác thực." });
            }

            var (response, error) = await _authService.VerifyRegistrationAsync(request);

            if (response == null)
            {
                return BadRequest(new AuthMessageResponse { Message = error ?? "Mã xác thực không đúng hoặc đã hết hạn." });
            }

            return Ok(response);
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new AuthMessageResponse { Message = "Email là bắt buộc." });
            }

            await _authService.RequestPasswordResetAsync(request);
            return Ok(new AuthMessageResponse
            {
                Message = "Nếu email này đã đăng ký, liên kết đặt lại mật khẩu đã được gửi."
            });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            if (request == null)
            {
                return BadRequest(new AuthMessageResponse { Message = "Dữ liệu đặt lại mật khẩu không hợp lệ." });
            }

            var (success, error) = await _authService.ResetPasswordAsync(request);
            if (!success)
            {
                return BadRequest(new AuthMessageResponse { Message = error ?? "Không thể đặt lại mật khẩu. Vui lòng kiểm tra liên kết." });
            }

            return Ok(new AuthMessageResponse { Message = "Đặt lại mật khẩu thành công." });
        }

        [HttpPost("google")]
        public async Task<IActionResult> GoogleLogin([FromBody] ExternalAuthRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.IdToken))
            {
                return BadRequest("Thiếu mã xác thực Google.");
            }

            var response = await _authService.LoginWithGoogleAsync(request);

            if (response == null)
            {
                return Unauthorized("Không thể xác thực Google. Vui lòng thử lại.");
            }

            return Ok(response);
        }

        [HttpPost("facebook")]
        public async Task<IActionResult> FacebookLogin([FromBody] FacebookAuthRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.AccessToken))
            {
                return BadRequest("Thiếu mã xác thực Facebook.");
            }

            var response = await _authService.LoginWithFacebookAsync(request);

            if (response == null)
            {
                return Unauthorized("Đăng nhập Facebook thất bại.");
            }

            return Ok(response);
        }
    }
}

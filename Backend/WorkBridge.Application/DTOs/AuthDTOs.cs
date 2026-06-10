namespace WorkBridge.Application.DTOs
{
    public class LoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class RegisterRequest
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = "Applicant";
    }

    public class AuthResponse
    {
        public string Token { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public int UserId { get; set; }
        public string? AvatarUrl { get; set; }
    }

    public class RegisterStartResponse
    {
        public string Message { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public int ExpiresInMinutes { get; set; }
    }

    public class VerifyRegisterEmailRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
    }

    public class ForgotPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
    }

    public class ResetPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    public class AuthMessageResponse
    {
        public string Message { get; set; } = string.Empty;
    }

  public class ExternalAuthRequest
  {
      public string IdToken { get; set; } = string.Empty;
  }

  public class FacebookAuthRequest
  {
      public string AccessToken { get; set; } = string.Empty;
  }
}

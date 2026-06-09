using System;

namespace WorkBridge.Domain.Entities;

public partial class EmailVerificationRequest
{
    public int EmailVerificationRequestId { get; set; }

    public string Email { get; set; } = null!;

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string RoleName { get; set; } = "Applicant";

    public string PasswordHash { get; set; } = null!;

    public string CodeHash { get; set; } = null!;

    public int AttemptCount { get; set; }

    public string Status { get; set; } = "Pending";

    public DateTime CreatedAt { get; set; }

    public DateTime ExpiresAt { get; set; }

    public DateTime? VerifiedAt { get; set; }
}

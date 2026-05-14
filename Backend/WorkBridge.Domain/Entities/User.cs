using System;
using System.Collections.Generic;

namespace WorkBridge.Domain.Entities;

public partial class User
{
    public int UserId { get; set; }

    public int RoleId { get; set; }

    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string FullName { get; set; } = null!;

    public string? AvatarUrl { get; set; }

    public string Status { get; set; } = null!;

    public bool IsDeleted { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ApplicantProfile? ApplicantProfile { get; set; }

    public virtual EmployerProfile? EmployerProfile { get; set; }

    public virtual ICollection<Message> MessageReceivers { get; set; } = new List<Message>();

    public virtual ICollection<Message> MessageSenders { get; set; } = new List<Message>();

    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    public virtual ICollection<Report> Reports { get; set; } = new List<Report>();

    public virtual ICollection<Review> ReviewReviewees { get; set; } = new List<Review>();

    public virtual ICollection<Review> ReviewReviewers { get; set; } = new List<Review>();

    public virtual Role Role { get; set; } = null!;

    public virtual ICollection<Dispute> DisputesInitiated { get; set; } = new List<Dispute>();

    public virtual ICollection<Dispute> DisputesResponded { get; set; } = new List<Dispute>();
}

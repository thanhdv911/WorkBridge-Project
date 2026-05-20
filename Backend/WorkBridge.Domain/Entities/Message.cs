using System;
using System.Collections.Generic;

namespace WorkBridge.Domain.Entities;

public partial class Message
{
    public int MessageId { get; set; }

    public int SenderId { get; set; }

    public int ReceiverId { get; set; }

    public int? JobPostId { get; set; }

    public int? InterviewId { get; set; }

    public string MessageType { get; set; } = "Text";

    public string Content { get; set; } = null!;

    public bool IsRead { get; set; }

    public DateTime? SentAt { get; set; }

    public virtual JobPost? JobPost { get; set; }

    public virtual Interview? Interview { get; set; }

    public virtual User Receiver { get; set; } = null!;

    public virtual User Sender { get; set; } = null!;
}

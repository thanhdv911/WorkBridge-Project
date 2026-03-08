using System;

namespace WorkBridge.Application.DTOs
{
    public class MessageResponse
    {
        public int MessageId { get; set; }
        public int SenderId { get; set; }
        public string SenderName { get; set; } = null!;
        public int ReceiverId { get; set; }
        public string Content { get; set; } = null!;
        public bool IsRead { get; set; }
        public DateTime? SentAt { get; set; }
    }

    public class SendMessageRequest
    {
        public int ReceiverId { get; set; }
        public int? JobPostId { get; set; }
        public string Content { get; set; } = null!;
    }

    public class ConversationResponse
    {
        public int ContactId { get; set; }
        public string ContactName { get; set; } = null!;
        public string? ContactRole { get; set; }
        public string LastMessage { get; set; } = null!;
        public DateTime? LastMessageAt { get; set; }
        public int UnreadCount { get; set; }
    }
}

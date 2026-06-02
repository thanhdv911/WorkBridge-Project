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
        public string MessageType { get; set; } = "Text";
        public int? InterviewId { get; set; }
        public InterviewMessageSummary? Interview { get; set; }
        public OfferResponse? Offer { get; set; }
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
        public bool IsOnline { get; set; }
        public DateTime? LastSeenAt { get; set; }
    }

    public class InterviewMessageSummary
    {
        public int InterviewId { get; set; }
        public int ApplicationId { get; set; }
        public int EmployerId { get; set; }
        public int ApplicantId { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public string ApplicantName { get; set; } = string.Empty;
        public string JobTitle { get; set; } = string.Empty;
        public DateTime ScheduledAt { get; set; }
        public string Location { get; set; } = string.Empty;
        public string? Note { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Result { get; set; }
        public bool CanEmployerMarkResult { get; set; }
        public string ApplicationStatus { get; set; } = string.Empty;
        public string? OfferStatus { get; set; }
        public bool HasSentOffer { get; set; }
        public bool HasAcceptedOffer { get; set; }
        public bool IsEmployee { get; set; }
    }
}

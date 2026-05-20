using WorkBridge.Application.DTOs;

namespace WorkBridge.Application.Interfaces
{
    /// <summary>
    /// Abstraction for pushing real-time events to connected clients via SignalR.
    /// Decouples Application layer from the API (Hub) layer.
    /// </summary>
    public interface IHubNotifier
    {
        // ── Chat ──────────────────────────────────────────────────────────────
        Task SendMessageToUsersAsync(int senderId, int receiverId, MessageResponse message);
        Task NotifyConversationUpdatedAsync(int userId1, int userId2);

        // ── Notifications ─────────────────────────────────────────────────────
        Task SendNotificationAsync(int userId, NotificationResponse notification);
        Task SendNotificationCountAsync(int userId, int count);

        // ── Interviews ────────────────────────────────────────────────────────
        Task NotifyInterviewChangedAsync(int employerId, int applicantId, InterviewResponse interview);

        // ── Offers ────────────────────────────────────────────────────────────
        Task NotifyOfferChangedAsync(int employerId, int applicantId, OfferResponse offer);
    }
}

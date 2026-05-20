using Microsoft.AspNetCore.SignalR;
using WorkBridge.API.Hubs;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Interfaces;

namespace WorkBridge.API.Services
{
    /// <summary>
    /// Concrete implementation of IHubNotifier using SignalR IHubContext.
    /// Registered in API layer; Application services depend on IHubNotifier abstraction.
    /// </summary>
    public class HubNotifier : IHubNotifier
    {
        private readonly IHubContext<WorkBridgeHub> _hub;

        public HubNotifier(IHubContext<WorkBridgeHub> hub)
        {
            _hub = hub;
        }

        // ── Chat ──────────────────────────────────────────────────────────────

        public async Task SendMessageToUsersAsync(int senderId, int receiverId, MessageResponse message)
        {
            // Push into the shared chat room so both participants see it instantly
            var room = WorkBridgeHub.ChatRoom(senderId, receiverId);
            await _hub.Clients.Group(room).SendAsync("ReceiveMessage", message);

            // Also push to the receiver's private group in case they're not in the room
            await _hub.Clients.Group(WorkBridgeHub.UserGroup(receiverId))
                              .SendAsync("ReceiveMessage", message);
        }

        public async Task NotifyConversationUpdatedAsync(int userId1, int userId2)
        {
            await Task.WhenAll(
                _hub.Clients.Group(WorkBridgeHub.UserGroup(userId1))
                            .SendAsync("ConversationUpdated"),
                _hub.Clients.Group(WorkBridgeHub.UserGroup(userId2))
                            .SendAsync("ConversationUpdated")
            );
        }

        // ── Notifications ─────────────────────────────────────────────────────

        public async Task SendNotificationAsync(int userId, NotificationResponse notification)
        {
            await _hub.Clients.Group(WorkBridgeHub.UserGroup(userId))
                              .SendAsync("ReceiveNotification", notification);
        }

        public async Task SendNotificationCountAsync(int userId, int count)
        {
            await _hub.Clients.Group(WorkBridgeHub.UserGroup(userId))
                              .SendAsync("NotificationCountChanged", count);
        }

        // ── Interviews ────────────────────────────────────────────────────────

        public async Task NotifyInterviewChangedAsync(int employerId, int applicantId, InterviewResponse interview)
        {
            await Task.WhenAll(
                _hub.Clients.Group(WorkBridgeHub.UserGroup(employerId))
                            .SendAsync("InterviewStatusChanged", interview),
                _hub.Clients.Group(WorkBridgeHub.UserGroup(applicantId))
                            .SendAsync("InterviewStatusChanged", interview)
            );
        }

        // ── Offers ────────────────────────────────────────────────────────────

        public async Task NotifyOfferChangedAsync(int employerId, int applicantId, OfferResponse offer)
        {
            await Task.WhenAll(
                _hub.Clients.Group(WorkBridgeHub.UserGroup(employerId))
                            .SendAsync("OfferStatusChanged", offer),
                _hub.Clients.Group(WorkBridgeHub.UserGroup(applicantId))
                            .SendAsync("OfferStatusChanged", offer)
            );
        }

        // ── Applications ──────────────────────────────────────────────────────

        public async Task NotifyApplicationChangedAsync(int employerId, int applicantId)
        {
            await Task.WhenAll(
                _hub.Clients.Group(WorkBridgeHub.UserGroup(employerId))
                            .SendAsync("ApplicationChanged"),
                _hub.Clients.Group(WorkBridgeHub.UserGroup(applicantId))
                            .SendAsync("ApplicationChanged")
            );
        }

        // ── Workforce ─────────────────────────────────────────────────────────

        public async Task NotifyWorkforceChangedAsync(int employerId, int employeeUserId)
        {
            await Task.WhenAll(
                _hub.Clients.Group(WorkBridgeHub.UserGroup(employerId))
                            .SendAsync("WorkforceChanged"),
                _hub.Clients.Group(WorkBridgeHub.UserGroup(employeeUserId))
                            .SendAsync("WorkforceChanged")
            );
        }
    }
}

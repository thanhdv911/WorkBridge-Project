using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace WorkBridge.API.Hubs
{
    [Authorize]
    public class WorkBridgeHub : Hub
    {
        private static readonly string UserGroupPrefix = "user_";
        private static readonly string ChatRoomPrefix = "chat_";

        /// <summary>
        /// Returns the private group name for a given userId.
        /// </summary>
        public static string UserGroup(int userId) => $"{UserGroupPrefix}{userId}";

        /// <summary>
        /// Returns a deterministic chat room name for two users (order-independent).
        /// </summary>
        public static string ChatRoom(int id1, int id2)
        {
            var min = Math.Min(id1, id2);
            var max = Math.Max(id1, id2);
            return $"{ChatRoomPrefix}{min}_{max}";
        }

        private int CurrentUserId =>
            int.TryParse(Context.User?.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
                ? id
                : 0;

        // ─── Lifecycle ──────────────────────────────────────────────────────────

        public override async Task OnConnectedAsync()
        {
            var userId = CurrentUserId;
            if (userId > 0)
            {
                // Each user gets their own private group for targeted pushes
                await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(userId));
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await base.OnDisconnectedAsync(exception);
        }

        // ─── Client-invokable methods ────────────────────────────────────────────

        /// <summary>
        /// Client calls this when opening a chat thread to receive real-time messages
        /// from the other participant.
        /// </summary>
        public async Task JoinConversation(int contactId)
        {
            var userId = CurrentUserId;
            if (userId <= 0 || contactId <= 0 || userId == contactId) return;

            var room = ChatRoom(userId, contactId);
            await Groups.AddToGroupAsync(Context.ConnectionId, room);
        }

        /// <summary>
        /// Client calls this when leaving a chat thread.
        /// </summary>
        public async Task LeaveConversation(int contactId)
        {
            var userId = CurrentUserId;
            if (userId <= 0 || contactId <= 0) return;

            var room = ChatRoom(userId, contactId);
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, room);
        }

        /// <summary>
        /// Client notifies the server that a user is typing.
        /// Server forwards the indicator to the other participant.
        /// </summary>
        public async Task SendTypingIndicator(int contactId, bool isTyping)
        {
            var userId = CurrentUserId;
            if (userId <= 0 || contactId <= 0 || userId == contactId) return;

            // Notify the other person in the chat room, excluding the sender
            var room = ChatRoom(userId, contactId);
            await Clients.GroupExcept(room, Context.ConnectionId)
                         .SendAsync("TypingIndicator", userId, isTyping);
        }
    }
}

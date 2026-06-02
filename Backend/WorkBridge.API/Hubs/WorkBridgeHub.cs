using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

using System.IdentityModel.Tokens.Jwt;

namespace WorkBridge.API.Hubs
{
    [Authorize]
    public class WorkBridgeHub : Hub
    {
        private static readonly string UserGroupPrefix = "user_";
        private static readonly string ChatRoomPrefix = "chat_";
        private readonly ILogger<WorkBridgeHub> _logger;

        public WorkBridgeHub(ILogger<WorkBridgeHub> logger)
        {
            _logger = logger;
        }

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

        private int CurrentUserId
        {
            get
            {
                // .NET 8 may not auto-map "sub" → ClaimTypes.NameIdentifier
                var raw = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                       ?? Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub);
                return int.TryParse(raw, out var id) ? id : 0;
            }
        }

        // ─── Lifecycle ──────────────────────────────────────────────────────────

        public override async Task OnConnectedAsync()
        {
            var userId = CurrentUserId;
            _logger.LogInformation("[Hub] OnConnectedAsync — userId={UserId}, connectionId={ConnId}", userId, Context.ConnectionId);

            if (userId > 0)
            {
                // Each user gets their own private group for targeted pushes
                await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(userId));

                // Add to OnlineUsers tracker
                var connections = WorkBridge.Application.Services.MessageService.OnlineUsers.GetOrAdd(userId, _ => new System.Collections.Generic.HashSet<string>());
                bool wentOnline = false;
                lock (connections)
                {
                    if (connections.Count == 0)
                    {
                        wentOnline = true;
                    }
                    connections.Add(Context.ConnectionId);
                }

                if (wentOnline)
                {
                    WorkBridge.Application.Services.MessageService.LastSeenTimes.TryRemove(userId, out _);
                    _logger.LogInformation("[Hub] User {UserId} went ONLINE (broadcasting)", userId);
                    await Clients.All.SendAsync("UserOnlineStatusChanged", userId, true, (DateTime?)null);
                }
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = CurrentUserId;
            _logger.LogInformation("[Hub] OnDisconnectedAsync — userId={UserId}, connectionId={ConnId}", userId, Context.ConnectionId);

            if (userId > 0)
            {
                if (WorkBridge.Application.Services.MessageService.OnlineUsers.TryGetValue(userId, out var connections))
                {
                    bool wentOffline = false;
                    lock (connections)
                    {
                        connections.Remove(Context.ConnectionId);
                        if (connections.Count == 0)
                        {
                            wentOffline = true;
                        }
                    }
                    if (wentOffline)
                    {
                        WorkBridge.Application.Services.MessageService.OnlineUsers.TryRemove(userId, out _);

                        var lastSeenAt = DateTime.UtcNow;
                        WorkBridge.Application.Services.MessageService.LastSeenTimes[userId] = lastSeenAt;

                        _logger.LogInformation("[Hub] User {UserId} went OFFLINE (broadcasting, lastSeen={LastSeen})", userId, lastSeenAt);
                        await Clients.All.SendAsync("UserOnlineStatusChanged", userId, false, lastSeenAt);
                    }
                }
            }
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

            // Real-time peer online status synchronization: query current status and push directly back to the caller
            var isOnline = WorkBridge.Application.Services.MessageService.OnlineUsers.TryGetValue(contactId, out var connections) && connections.Count > 0;
            var lastSeenAt = WorkBridge.Application.Services.MessageService.LastSeenTimes.TryGetValue(contactId, out var seenTime) ? (DateTime?)seenTime : null;

            await Clients.Caller.SendAsync("UserOnlineStatusChanged", contactId, isOnline, lastSeenAt);
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

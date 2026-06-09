using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using WorkBridge.API.Services;

namespace WorkBridge.API.Hubs
{
    [AllowAnonymous]
    public class HomePresenceHub : Hub
    {
        public const string PresenceChangedEvent = "HomePresenceChanged";

        private readonly HomePresenceService _presence;

        public HomePresenceHub(HomePresenceService presence)
        {
            _presence = presence;
        }

        private int? CurrentUserId
        {
            get
            {
                var raw = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub);

                return int.TryParse(raw, out var userId) ? userId : null;
            }
        }

        private string PresenceKey => $"hub:{Context.ConnectionId}";

        public override async Task OnConnectedAsync()
        {
            if (_presence.TrackPresence(PresenceKey, CurrentUserId))
            {
                await Clients.All.SendAsync(PresenceChangedEvent);
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            if (_presence.RemovePresence(PresenceKey))
            {
                await Clients.All.SendAsync(PresenceChangedEvent);
            }

            await base.OnDisconnectedAsync(exception);
        }

        public async Task PingPresence()
        {
            if (_presence.TrackPresence(PresenceKey, CurrentUserId))
            {
                await Clients.All.SendAsync(PresenceChangedEvent);
            }
        }
    }
}

using System.Collections.Concurrent;

namespace WorkBridge.API.Services
{
    public sealed class HomePresenceService
    {
        private readonly ConcurrentDictionary<string, ActiveVisitorPresence> _activeVisitors = new();

        public TimeSpan ActiveVisitorWindow { get; } = TimeSpan.FromSeconds(18);

        public bool TrackPresence(string presenceKey, int? userId)
        {
            var now = DateTime.UtcNow;
            var before = GetOnlineUserIds(now);

            _activeVisitors[presenceKey] = new ActiveVisitorPresence(presenceKey, userId, now);
            PruneInactiveVisitors(now);

            var after = GetOnlineUserIds(now);
            return !before.SetEquals(after);
        }

        public bool RemovePresence(string presenceKey)
        {
            var now = DateTime.UtcNow;
            var before = GetOnlineUserIds(now);

            _activeVisitors.TryRemove(presenceKey, out _);
            PruneInactiveVisitors(now);

            var after = GetOnlineUserIds(now);
            return !before.SetEquals(after);
        }

        public HomePresenceSnapshot GetSnapshot(int page, int pageSize)
        {
            var now = DateTime.UtcNow;
            PruneInactiveVisitors(now);

            var lastSeenByUserId = _activeVisitors.Values
                .Where(visitor => visitor.UserId.HasValue)
                .GroupBy(visitor => visitor.UserId!.Value)
                .ToDictionary(group => group.Key, group => group.Max(visitor => visitor.LastSeenAt));

            return new HomePresenceSnapshot(
                OnlineUserIds: lastSeenByUserId.Keys.ToList(),
                LastSeenByUserId: lastSeenByUserId,
                ActiveVisitorCount: _activeVisitors.Count,
                Page: Math.Max(1, page),
                PageSize: Math.Clamp(pageSize, 1, 8),
                UpdatedAt: now,
                ActiveWindowSeconds: (int)ActiveVisitorWindow.TotalSeconds
            );
        }

        private HashSet<int> GetOnlineUserIds(DateTime now)
        {
            PruneInactiveVisitors(now);

            return _activeVisitors.Values
                .Where(visitor => visitor.UserId.HasValue)
                .Select(visitor => visitor.UserId!.Value)
                .ToHashSet();
        }

        private void PruneInactiveVisitors(DateTime now)
        {
            foreach (var item in _activeVisitors)
            {
                if (now - item.Value.LastSeenAt > ActiveVisitorWindow)
                {
                    _activeVisitors.TryRemove(item.Key, out _);
                }
            }
        }
    }

    public sealed record ActiveVisitorPresence(string PresenceKey, int? UserId, DateTime LastSeenAt);

    public sealed record HomePresenceSnapshot(
        List<int> OnlineUserIds,
        Dictionary<int, DateTime> LastSeenByUserId,
        int ActiveVisitorCount,
        int Page,
        int PageSize,
        DateTime UpdatedAt,
        int ActiveWindowSeconds
    );
}

using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using WorkBridge.Application.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkBridge.Application.DTOs;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public class NotificationService : INotificationService
    {
        private readonly IWorkBridgeContext _context;
        private readonly IHubNotifier _hubNotifier;

        public NotificationService(IWorkBridgeContext context, IHubNotifier hubNotifier)
        {
            _context = context;
            _hubNotifier = hubNotifier;
        }

        public async Task CreateNotificationAsync(int userId, string title, string message)
        {
            var notification = new Notification
            {
                UserId = userId,
                Title = title,
                Message = message,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            await _context.Notifications.AddAsync(notification);
            await _context.SaveChangesAsync();

            var response = new NotificationResponse
            {
                NotificationId = notification.NotificationId,
                Title = notification.Title,
                Message = notification.Message,
                IsRead = notification.IsRead,
                CreatedAt = notification.CreatedAt
            };

            // Push real-time to the target user (fire-and-forget)
            _ = Task.Run(async () =>
            {
                try
                {
                    await _hubNotifier.SendNotificationAsync(userId, response);

                    var unreadCount = await _context.Notifications
                        .CountAsync(n => n.UserId == userId && !n.IsRead);
                    await _hubNotifier.SendNotificationCountAsync(userId, unreadCount);
                }
                catch { /* Hub errors must never break notification creation */ }
            });
        }

        public async Task<IEnumerable<NotificationResponse>> GetNotificationsAsync(int userId)
        {
            return await _context.Notifications
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .Select(n => new NotificationResponse
                {
                    NotificationId = n.NotificationId,
                    Title = n.Title,
                    Message = n.Message,
                    IsRead = n.IsRead,
                    CreatedAt = n.CreatedAt
                })
                .ToListAsync();
        }

        public async Task<bool> MarkAsReadAsync(int userId, int notificationId)
        {
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.NotificationId == notificationId && n.UserId == userId);

            if (notification == null) return false;

            notification.IsRead = true;
            await _context.SaveChangesAsync();

            // Update the badge count in real-time
            _ = Task.Run(async () =>
            {
                try
                {
                    var unreadCount = await _context.Notifications
                        .CountAsync(n => n.UserId == userId && !n.IsRead);
                    await _hubNotifier.SendNotificationCountAsync(userId, unreadCount);
                }
                catch { }
            });

            return true;
        }

        public async Task<int> GetUnreadCountAsync(int userId)
        {
            return await _context.Notifications
                .CountAsync(n => n.UserId == userId && !n.IsRead);
        }
    }
}

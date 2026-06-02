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
        private readonly IEmailQueue _emailQueue;

        public NotificationService(IWorkBridgeContext context, IHubNotifier hubNotifier, IEmailQueue emailQueue)
        {
            _context = context;
            _hubNotifier = hubNotifier;
            _emailQueue = emailQueue;
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

            // Query unread count synchronously on the request thread before launching the fire-and-forget task
            var unreadCount = await _context.Notifications
                .CountAsync(n => n.UserId == userId && !n.IsRead);

            // Push real-time to the target user safely on the request thread
            try
            {
                await _hubNotifier.SendNotificationAsync(userId, response);
                await _hubNotifier.SendNotificationCountAsync(userId, unreadCount);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SignalR Notification Error]: {ex.Message}");
            }

            try
            {
                var user = await _context.Users
                    .Where(u => u.UserId == userId && !u.IsDeleted && u.Status == "Active")
                    .Select(u => new { u.Email, u.FullName })
                    .FirstOrDefaultAsync();

                if (user != null)
                {
                    _emailQueue.QueueNotificationEmail(user.Email, user.FullName, title, message);
                }
            }
            catch
            {
                // Email queueing must never block in-app notifications or the main business flow.
            }
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

            // Query unread count synchronously on the request thread before launching the fire-and-forget task
            var unreadCount = await _context.Notifications
                .CountAsync(n => n.UserId == userId && !n.IsRead);

            // Update the badge count in real-time safely on the request thread
            try
            {
                await _hubNotifier.SendNotificationCountAsync(userId, unreadCount);
            }
            catch { }

            return true;
        }

        public async Task<bool> MarkAllAsReadAsync(int userId)
        {
            var unreadNotifications = await _context.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ToListAsync();

            if (!unreadNotifications.Any()) return true;

            foreach (var n in unreadNotifications)
            {
                n.IsRead = true;
            }

            await _context.SaveChangesAsync();

            try
            {
                await _hubNotifier.SendNotificationCountAsync(userId, 0);
            }
            catch { }

            return true;
        }

        public async Task<int> GetUnreadCountAsync(int userId)
        {
            return await _context.Notifications
                .CountAsync(n => n.UserId == userId && !n.IsRead);
        }

        public async Task<bool> DeleteNotificationAsync(int userId, int notificationId)
        {
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.NotificationId == notificationId && n.UserId == userId);

            if (notification == null) return false;

            _context.Notifications.Remove(notification);
            await _context.SaveChangesAsync();

            // Push real-time unread count update
            var unreadCount = await _context.Notifications
                .CountAsync(n => n.UserId == userId && !n.IsRead);

            try
            {
                await _hubNotifier.SendNotificationCountAsync(userId, unreadCount);
            }
            catch { }

            return true;
        }

        public async Task<bool> DeleteAllReadNotificationsAsync(int userId)
        {
            var readNotifications = await _context.Notifications
                .Where(n => n.UserId == userId && n.IsRead)
                .ToListAsync();

            if (!readNotifications.Any()) return true;

            _context.Notifications.RemoveRange(readNotifications);
            await _context.SaveChangesAsync();

            return true;
        }
    }
}

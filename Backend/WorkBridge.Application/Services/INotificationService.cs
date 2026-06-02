using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using WorkBridge.Application.Interfaces;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkBridge.Application.DTOs;

namespace WorkBridge.Application.Services
{
    public interface INotificationService
    {
        Task CreateNotificationAsync(int userId, string title, string message);
        Task<IEnumerable<NotificationResponse>> GetNotificationsAsync(int userId);
        Task<bool> MarkAsReadAsync(int userId, int notificationId);
        Task<bool> MarkAllAsReadAsync(int userId);
        Task<int> GetUnreadCountAsync(int userId);
        Task<bool> DeleteNotificationAsync(int userId, int notificationId);
        Task<bool> DeleteAllReadNotificationsAsync(int userId);
    }
}

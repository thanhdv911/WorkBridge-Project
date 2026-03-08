using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using WorkBridge.Application.Interfaces;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkBridge.Application.DTOs;

namespace WorkBridge.Application.Services
{
    public interface IMessageService
    {
        Task<IEnumerable<ConversationResponse>> GetConversationsAsync(int userId);
        Task<IEnumerable<MessageResponse>> GetChatHistoryAsync(int userId, int contactId);
        Task<MessageResponse?> SendMessageAsync(int senderId, SendMessageRequest request);
        Task MarkAsReadAsync(int userId, int contactId);
        Task<int> GetUnreadCountAsync(int userId);
    }
}

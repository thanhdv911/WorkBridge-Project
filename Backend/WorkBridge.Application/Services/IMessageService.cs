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
        Task<PagedResult<MessageResponse>> GetChatHistoryAsync(int userId, int contactId, int page = 1, int pageSize = 50);
        Task<MessageResponse?> SendMessageAsync(int senderId, SendMessageRequest request);
        Task MarkAsReadAsync(int userId, int contactId);
        Task<int> GetUnreadCountAsync(int userId);
    }
}

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
    public class MessageService : IMessageService
    {
        private readonly IWorkBridgeContext _context;

        public MessageService(IWorkBridgeContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<ConversationResponse>> GetConversationsAsync(int userId)
        {
            // Get all unique contacts (people user has exchanged messages with)
            var sentTo = await _context.Messages
                .Where(m => m.SenderId == userId)
                .Select(m => m.ReceiverId)
                .Distinct()
                .ToListAsync();

            var receivedFrom = await _context.Messages
                .Where(m => m.ReceiverId == userId)
                .Select(m => m.SenderId)
                .Distinct()
                .ToListAsync();

            var contactIds = sentTo.Union(receivedFrom).Distinct().ToList();

            var conversations = new List<ConversationResponse>();

            foreach (var contactId in contactIds)
            {
                var contact = await _context.Users.FindAsync(contactId);
                if (contact == null) continue;

                var lastMessage = await _context.Messages
                    .Where(m => (m.SenderId == userId && m.ReceiverId == contactId) || (m.SenderId == contactId && m.ReceiverId == userId))
                    .OrderByDescending(m => m.SentAt)
                    .FirstOrDefaultAsync();

                var unreadCount = await _context.Messages
                    .CountAsync(m => m.SenderId == contactId && m.ReceiverId == userId && !m.IsRead);

                conversations.Add(new ConversationResponse
                {
                    ContactId = contactId,
                    ContactName = contact.FullName,
                    LastMessage = lastMessage?.Content ?? "",
                    LastMessageAt = lastMessage?.SentAt,
                    UnreadCount = unreadCount
                });
            }

            return conversations.OrderByDescending(c => c.LastMessageAt);
        }

        public async Task<IEnumerable<MessageResponse>> GetChatHistoryAsync(int userId, int contactId)
        {
            return await _context.Messages
                .Include(m => m.Sender)
                .Where(m => (m.SenderId == userId && m.ReceiverId == contactId) || (m.SenderId == contactId && m.ReceiverId == userId))
                .OrderBy(m => m.SentAt)
                .Select(m => new MessageResponse
                {
                    MessageId = m.MessageId,
                    SenderId = m.SenderId,
                    SenderName = m.Sender.FullName,
                    ReceiverId = m.ReceiverId,
                    Content = m.Content,
                    IsRead = m.IsRead,
                    SentAt = m.SentAt
                })
                .ToListAsync();
        }

        public async Task<MessageResponse?> SendMessageAsync(int senderId, SendMessageRequest request)
        {
            var sender = await _context.Users.FindAsync(senderId);
            if (sender == null) return null;

            var message = new Message
            {
                SenderId = senderId,
                ReceiverId = request.ReceiverId,
                JobPostId = request.JobPostId,
                Content = request.Content,
                IsRead = false,
                SentAt = DateTime.UtcNow
            };

            await _context.Messages.AddAsync(message);
            await _context.SaveChangesAsync();

            return new MessageResponse
            {
                MessageId = message.MessageId,
                SenderId = message.SenderId,
                SenderName = sender.FullName,
                ReceiverId = message.ReceiverId,
                Content = message.Content,
                IsRead = message.IsRead,
                SentAt = message.SentAt
            };
        }

        public async Task MarkAsReadAsync(int userId, int contactId)
        {
            var unreadMessages = await _context.Messages
                .Where(m => m.SenderId == contactId && m.ReceiverId == userId && !m.IsRead)
                .ToListAsync();

            if (unreadMessages.Any())
            {
                unreadMessages.ForEach(m => m.IsRead = true);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<int> GetUnreadCountAsync(int userId)
        {
            return await _context.Messages
                .CountAsync(m => m.ReceiverId == userId && !m.IsRead);
        }
    }
}

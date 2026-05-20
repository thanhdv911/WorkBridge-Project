using Microsoft.EntityFrameworkCore;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Interfaces;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public class MessageService : IMessageService
    {
        private readonly IWorkBridgeContext _context;
        private static readonly string[] MessageableStatuses =
        {
            "Accepted",
            "Interview Scheduled",
            "Interview Passed",
            "Offered",
            "Hired"
        };

        public MessageService(IWorkBridgeContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<ConversationResponse>> GetConversationsAsync(int userId)
        {
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
            if (!await CanAccessThreadAsync(userId, contactId))
            {
                return Enumerable.Empty<MessageResponse>();
            }

            var messages = await _context.Messages
                .Include(m => m.Sender)
                .Where(m => (m.SenderId == userId && m.ReceiverId == contactId) || (m.SenderId == contactId && m.ReceiverId == userId))
                .OrderBy(m => m.SentAt)
                .ToListAsync();

            var interviewIds = messages
                .Where(m => m.InterviewId.HasValue)
                .Select(m => m.InterviewId!.Value)
                .Distinct()
                .ToList();

            var interviewSummaries = await GetInterviewSummariesAsync(interviewIds);

            return messages.Select(m => new MessageResponse
            {
                MessageId = m.MessageId,
                SenderId = m.SenderId,
                SenderName = m.Sender.FullName,
                ReceiverId = m.ReceiverId,
                Content = m.Content,
                MessageType = string.IsNullOrWhiteSpace(m.MessageType) ? "Text" : m.MessageType,
                InterviewId = m.InterviewId,
                Interview = m.InterviewId.HasValue && interviewSummaries.TryGetValue(m.InterviewId.Value, out var summary)
                    ? summary
                    : null,
                IsRead = m.IsRead,
                SentAt = m.SentAt
            }).ToList();
        }

        public async Task<MessageResponse?> SendMessageAsync(int senderId, SendMessageRequest request)
        {
            if (request.ReceiverId <= 0 || string.IsNullOrWhiteSpace(request.Content))
            {
                return null;
            }

            var sender = await _context.Users.FindAsync(senderId);
            if (sender == null) return null;

            var receiverExists = await _context.Users.AnyAsync(u => u.UserId == request.ReceiverId && !u.IsDeleted && u.Status == "Active");
            if (!receiverExists) return null;

            if (!await CanAccessThreadAsync(senderId, request.ReceiverId))
            {
                return null;
            }

            var message = new Message
            {
                SenderId = senderId,
                ReceiverId = request.ReceiverId,
                JobPostId = request.JobPostId,
                MessageType = "Text",
                Content = request.Content.Trim(),
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
                MessageType = message.MessageType,
                IsRead = message.IsRead,
                SentAt = message.SentAt
            };
        }

        public async Task MarkAsReadAsync(int userId, int contactId)
        {
            if (!await CanAccessThreadAsync(userId, contactId))
            {
                return;
            }

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

        private async Task<Dictionary<int, InterviewMessageSummary>> GetInterviewSummariesAsync(IEnumerable<int> interviewIds)
        {
            var ids = interviewIds.Distinct().ToList();
            if (ids.Count == 0)
            {
                return new Dictionary<int, InterviewMessageSummary>();
            }

            return await (from interview in _context.Interviews
                          join app in _context.Applications on interview.ApplicationId equals app.ApplicationId
                          join job in _context.JobPosts on app.JobPostId equals job.JobPostId
                          join employer in _context.EmployerProfiles on interview.EmployerId equals employer.EmployerId
                          join applicant in _context.Users on interview.ApplicantId equals applicant.UserId
                          where ids.Contains(interview.InterviewId)
                          select new InterviewMessageSummary
                          {
                              InterviewId = interview.InterviewId,
                              ApplicationId = interview.ApplicationId,
                              EmployerId = interview.EmployerId,
                              ApplicantId = interview.ApplicantId,
                              CompanyName = employer.CompanyName,
                              ApplicantName = applicant.FullName,
                              JobTitle = job.Title,
                              ScheduledAt = interview.ScheduledAt,
                              Location = interview.Location,
                              Note = interview.Note,
                              Status = interview.Status,
                              Result = interview.Result,
                              CanEmployerMarkResult = interview.Status == "Confirmed" &&
                                                      interview.Result == null &&
                                                      interview.ScheduledAt <= DateTime.Now
                          })
                .ToDictionaryAsync(i => i.InterviewId);
        }

        private async Task<bool> CanAccessThreadAsync(int userId, int contactId)
        {
            if (userId <= 0 || contactId <= 0 || userId == contactId)
            {
                return false;
            }

            var existingThread = await _context.Messages.AnyAsync(m =>
                (m.SenderId == userId && m.ReceiverId == contactId) ||
                (m.SenderId == contactId && m.ReceiverId == userId));

            if (existingThread)
            {
                return true;
            }

            return await _context.Applications
                .Include(a => a.JobPost)
                .AnyAsync(a =>
                    !a.IsDeleted &&
                    MessageableStatuses.Contains(a.Status) &&
                    ((a.ApplicantId == userId && a.JobPost.EmployerId == contactId) ||
                     (a.ApplicantId == contactId && a.JobPost.EmployerId == userId)));
        }
    }
}

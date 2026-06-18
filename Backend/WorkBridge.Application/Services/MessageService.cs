using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;
using System.Collections.Generic;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Interfaces;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public class MessageService : IMessageService
    {
        public static readonly ConcurrentDictionary<int, HashSet<string>> OnlineUsers = new();
        public static readonly ConcurrentDictionary<int, DateTime> LastSeenTimes = new();
        private readonly IWorkBridgeContext _context;
        private readonly IHubNotifier _hubNotifier;
        private static readonly string[] MessageableStatuses =
        {
            "Accepted",
            "Interview Scheduled",
            "Interview Passed",
            "Offered",
            "Hired"
        };

        public MessageService(IWorkBridgeContext context, IHubNotifier hubNotifier)
        {
            _context = context;
            _hubNotifier = hubNotifier;
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
                    ContactRole = contact.Role.ToString(),
                    AvatarUrl = contact.AvatarUrl,
                    LastMessage = BuildConversationPreview(lastMessage),
                    LastMessageAt = lastMessage?.SentAt,
                    UnreadCount = unreadCount,
                    IsOnline = OnlineUsers.TryGetValue(contactId, out var connections) && connections.Count > 0,
                    LastSeenAt = LastSeenTimes.TryGetValue(contactId, out var seenTime) ? seenTime : null
                });
            }

            return conversations.OrderByDescending(c => c.LastMessageAt);
        }

        private static string BuildConversationPreview(Message? message)
        {
            if (message == null) return "";

            return message.MessageType switch
            {
                "OfferInvite" => "Đã gửi lời mời nhận việc. Đang chờ phản hồi.",
                "InterviewInvite" => "Đã gửi lời mời phỏng vấn.",
                _ => message.Content ?? ""
            };
        }

        public async Task<PagedResult<MessageResponse>> GetChatHistoryAsync(int userId, int contactId, int page = 1, int pageSize = 50)
        {
            if (!await CanAccessThreadAsync(userId, contactId))
            {
                return new PagedResult<MessageResponse> { Items = Enumerable.Empty<MessageResponse>(), TotalItems = 0, Page = page, TotalPages = 0 };
            }

            var query = _context.Messages
                .Include(m => m.Sender)
                .Where(m => (m.SenderId == userId && m.ReceiverId == contactId) || (m.SenderId == contactId && m.ReceiverId == userId));

            var totalItems = await query.CountAsync();
            var totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

            var messages = await query
                .OrderByDescending(m => m.SentAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            messages.Reverse();

            var interviewIds = messages
                .Where(m => m.InterviewId.HasValue)
                .Select(m => m.InterviewId!.Value)
                .Distinct()
                .ToList();

            var offerIds = messages
                .Where(m => m.MessageType == "OfferInvite" && int.TryParse(m.Content, out _))
                .Select(m => int.Parse(m.Content))
                .Distinct()
                .ToList();

            var interviewSummaries = await GetInterviewSummariesAsync(interviewIds);
            var offerSummaries = await GetOfferSummariesAsync(offerIds);

            var items = messages.Select(m => new MessageResponse
            {
                MessageId = m.MessageId,
                SenderId = m.SenderId,
                SenderName = m.Sender.FullName,
                SenderAvatarUrl = m.Sender.AvatarUrl,
                ReceiverId = m.ReceiverId,
                Content = m.Content,
                MessageType = string.IsNullOrWhiteSpace(m.MessageType) ? "Text" : m.MessageType,
                InterviewId = m.InterviewId,
                Interview = m.InterviewId.HasValue && interviewSummaries.TryGetValue(m.InterviewId.Value, out var summary)
                    ? summary
                    : null,
                Offer = m.MessageType == "OfferInvite" && int.TryParse(m.Content, out var offerId) && offerSummaries.TryGetValue(offerId, out var offer)
                    ? offer
                    : null,
                IsRead = m.IsRead,
                SentAt = m.SentAt
            }).ToList();

            return new PagedResult<MessageResponse>
            {
                Items = items,
                TotalItems = totalItems,
                Page = page,
                TotalPages = totalPages
            };
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

            var response = new MessageResponse
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

            // Push real-time via SignalR (fire-and-forget, never block on Hub errors)
            _ = Task.Run(async () =>
            {
                try
                {
                    await _hubNotifier.SendMessageToUsersAsync(senderId, request.ReceiverId, response);
                    await _hubNotifier.NotifyConversationUpdatedAsync(senderId, request.ReceiverId);
                }
                catch { /* Hub push errors must never break message delivery */ }
            });

            return response;
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
                // Notify the sender that their messages were read
                _ = Task.Run(async () =>
                {
                    try { await _hubNotifier.NotifyConversationUpdatedAsync(userId, contactId); }
                    catch { }
                });
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
                              ApplicationStatus = app.Status,
                              OfferStatus = _context.Offers
                                  .Where(o => o.ApplicationId == interview.ApplicationId)
                                  .OrderByDescending(o => o.CreatedAt)
                                  .Select(o => o.Status)
                                  .FirstOrDefault(),
                              HasSentOffer = _context.Offers
                                  .Any(o => o.ApplicationId == interview.ApplicationId && o.Status == "Sent"),
                              HasAcceptedOffer = _context.Offers
                                  .Any(o => o.ApplicationId == interview.ApplicationId && o.Status == "Accepted"),
                              IsEmployee = _context.Employments
                                  .Any(e => e.EmployerId == interview.EmployerId &&
                                            e.EmployeeUserId == interview.ApplicantId &&
                                            e.Status == "Active"),
                              CanEmployerMarkResult = interview.Status == "Confirmed" &&
                                                      interview.Result == null &&
                                                      interview.ScheduledAt <= DateTime.UtcNow &&
                                                      !_context.Employments.Any(e => e.EmployerId == interview.EmployerId &&
                                                                                    e.EmployeeUserId == interview.ApplicantId &&
                                                                                    e.Status == "Active")
                          })
                .ToDictionaryAsync(i => i.InterviewId);
        }

        private async Task<bool> CanAccessThreadAsync(int userId, int contactId)
        {
            if (userId <= 0 || contactId <= 0 || userId == contactId)
            {
                return false;
            }

            var adminThread = await _context.Users
                .Include(u => u.Role)
                .AnyAsync(u =>
                    (u.UserId == userId || u.UserId == contactId) &&
                    u.Role.RoleName == "Admin" &&
                    !u.IsDeleted &&
                    u.Status == "Active");

            if (adminThread)
            {
                return true;
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

        private async Task<Dictionary<int, OfferResponse>> GetOfferSummariesAsync(IEnumerable<int> offerIds)
        {
            var ids = offerIds.Distinct().ToList();
            if (ids.Count == 0)
            {
                return new Dictionary<int, OfferResponse>();
            }

            return await (from offer in _context.Offers
                           join app in _context.Applications on offer.ApplicationId equals app.ApplicationId
                           join job in _context.JobPosts on app.JobPostId equals job.JobPostId
                           join branch in _context.Branches on offer.BranchId equals branch.BranchId
                           join employer in _context.EmployerProfiles on offer.EmployerId equals employer.EmployerId
                           join applicant in _context.Users on offer.ApplicantId equals applicant.UserId
                           where ids.Contains(offer.OfferId)
                           select new OfferResponse
                           {
                               OfferId = offer.OfferId,
                               ApplicationId = offer.ApplicationId,
                               JobPostId = job.JobPostId,
                               EmployerId = offer.EmployerId,
                               ApplicantId = offer.ApplicantId,
                               BranchId = offer.BranchId,
                               BranchName = branch.Name,
                               CompanyName = employer.CompanyName,
                               ApplicantName = applicant.FullName,
                               JobTitle = job.Title,
                               Position = offer.Position,
                               HourlyRate = offer.HourlyRate,
                               StartDate = offer.StartDate,
                               PaydayOfMonth = offer.PaydayOfMonth,
                               Status = offer.Status,
                               CreatedAt = offer.CreatedAt,
                               AcceptedAt = offer.AcceptedAt,
                               ExpiredAt = offer.ExpiredAt,
                               Vacancies = job.Vacancies
                           })
                .ToDictionaryAsync(o => o.OfferId);
        }
    }
}

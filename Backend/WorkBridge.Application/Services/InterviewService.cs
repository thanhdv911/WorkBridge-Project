using Microsoft.EntityFrameworkCore;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Interfaces;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public class InterviewService : IInterviewService
    {
        private readonly IWorkBridgeContext _context;
        private readonly INotificationService _notificationService;
        private readonly IHubNotifier _hubNotifier;

        private static readonly string[] SchedulableApplicationStatuses =
        {
            "Accepted",
            "Under Review",
            "Interview Scheduled",
            "Interview Passed"
        };

        private static readonly string[] ApplicantStatuses = { "Confirmed", "Declined", "ChangeRequested" };
        private static readonly string[] EmployerStatuses = { "Cancelled" };

        public InterviewService(IWorkBridgeContext context, INotificationService notificationService, IHubNotifier hubNotifier)
        {
            _context = context;
            _notificationService = notificationService;
            _hubNotifier = hubNotifier;
        }

        public Task<(InterviewResponse? Interview, string? Error)> CreateInterviewAsync(int employerId, CreateInterviewRequest request)
        {
            return CreateInterviewCoreAsync(employerId, request, createChatMessage: false);
        }

        public async Task<IEnumerable<InterviewChatApplicationResponse>> GetChatContextAsync(int employerId, int contactId)
        {
            if (contactId <= 0 || contactId == employerId)
            {
                return Enumerable.Empty<InterviewChatApplicationResponse>();
            }

            return await _context.Applications
                .Include(a => a.JobPost)
                .Where(a =>
                    !a.IsDeleted &&
                    a.ApplicantId == contactId &&
                    a.JobPost.EmployerId == employerId &&
                    SchedulableApplicationStatuses.Contains(a.Status) &&
                    !_context.Employments.Any(e => e.EmployerId == a.JobPost.EmployerId &&
                                                   e.EmployeeUserId == a.ApplicantId &&
                                                   e.Status == "Active"))
                .OrderByDescending(a => a.AppliedAt)
                .Select(a => new InterviewChatApplicationResponse
                {
                    ApplicationId = a.ApplicationId,
                    JobPostId = a.JobPostId,
                    JobTitle = a.JobPost.Title,
                    Status = a.Status,
                    AppliedAt = a.AppliedAt.GetValueOrDefault(),
                    OfferStatus = _context.Offers
                        .Where(o => o.ApplicationId == a.ApplicationId)
                        .OrderByDescending(o => o.CreatedAt)
                        .Select(o => o.Status)
                        .FirstOrDefault(),
                    HasSentOffer = _context.Offers.Any(o => o.ApplicationId == a.ApplicationId && o.Status == "Sent"),
                    HasAcceptedOffer = _context.Offers.Any(o => o.ApplicationId == a.ApplicationId && o.Status == "Accepted"),
                    IsEmployee = _context.Employments.Any(e => e.EmployerId == a.JobPost.EmployerId &&
                                                               e.EmployeeUserId == a.ApplicantId &&
                                                               e.Status == "Active")
                })
                .ToListAsync();
        }

        public async Task<(InterviewResponse? Interview, string? Error)> CreateChatInterviewAsync(int employerId, CreateChatInterviewRequest request)
        {
            var application = await _context.Applications
                .Include(a => a.JobPost)
                .FirstOrDefaultAsync(a =>
                    a.ApplicationId == request.ApplicationId &&
                    a.JobPost.EmployerId == employerId &&
                    a.ApplicantId == request.ContactId &&
                    !a.IsDeleted);

            if (application == null) return (null, "Application not found for this chat.");

            return await CreateInterviewCoreAsync(employerId, request, createChatMessage: true);
        }

        public async Task<IEnumerable<InterviewResponse>> GetEmployerInterviewsAsync(int employerId)
        {
            return await BuildInterviewQuery()
                .Where(i => i.EmployerId == employerId)
                .OrderByDescending(i => i.ScheduledAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<InterviewResponse>> GetMyInterviewsAsync(int applicantId)
        {
            return await BuildInterviewQuery()
                .Where(i => i.ApplicantId == applicantId)
                .OrderByDescending(i => i.ScheduledAt)
                .ToListAsync();
        }

        public async Task<(InterviewResponse? Interview, string? Error)> UpdateStatusAsync(int userId, string role, int interviewId, UpdateInterviewStatusRequest request)
        {
            var status = request.Status?.Trim();
            if (string.IsNullOrWhiteSpace(status)) return (null, "Status is required.");

            var interview = await _context.Interviews.FirstOrDefaultAsync(i => i.InterviewId == interviewId);
            if (interview == null) return (null, "Interview not found.");

            // Idempotency: if the interview is already in the requested status, return early with success
            if (interview.Status == status)
            {
                return (await GetInterviewResponseAsync(interview.InterviewId), null);
            }

            if (interview.Result != null || interview.Status == "Completed")
            {
                return (null, "Completed interviews cannot be updated.");
            }

            var application = await _context.Applications
                .Include(a => a.JobPost)
                .FirstOrDefaultAsync(a => a.ApplicationId == interview.ApplicationId);
            if (application == null) return (null, "Application not found.");

            if (role == "Employer")
            {
                if (interview.EmployerId != userId) return (null, "Interview not found.");
                if (!EmployerStatuses.Contains(status)) return (null, "Invalid employer interview status.");
            }
            else if (role == "Applicant")
            {
                if (interview.ApplicantId != userId) return (null, "Interview not found.");
                if (!ApplicantStatuses.Contains(status)) return (null, "Invalid applicant interview status.");
                if (interview.Status != "Scheduled") return (null, "Only scheduled interviews can be answered.");
            }
            else
            {
                return (null, "Invalid role.");
            }

            interview.Status = status;
            if (!string.IsNullOrWhiteSpace(request.Note))
            {
                interview.Note = request.Note.Trim();
            }
            interview.UpdatedAt = DateTime.UtcNow;

            if (status == "Cancelled" || status == "Declined" || status == "ChangeRequested")
            {
                // Only revert to "Under Review" if there are no other active (Scheduled or Confirmed) interviews left for this application
                var hasOtherActiveInterviews = await _context.Interviews.AnyAsync(i =>
                    i.ApplicationId == interview.ApplicationId &&
                    i.InterviewId != interview.InterviewId &&
                    i.Result == null &&
                    (i.Status == "Scheduled" || i.Status == "Confirmed"));

                if (!hasOtherActiveInterviews)
                {
                    application.Status = "Under Review";
                    application.RespondedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();

            var notifyUserId = role == "Employer" ? interview.ApplicantId : interview.EmployerId;
            var notificationTitle = status switch
            {
                "Confirmed" => "Interview Accepted",
                "Declined" => "Interview Declined",
                "Cancelled" => "Interview Cancelled",
                "ChangeRequested" => "Interview Change Requested",
                _ => "Interview Updated"
            };
            var notificationMessage = status switch
            {
                "Confirmed" => $"Applicant accepted the offline interview for '{application.JobPost.Title}'. Open WorkBridge to continue the chat and prepare for the interview.",
                "Declined" => $"Applicant declined the offline interview for '{application.JobPost.Title}'. Open WorkBridge to reschedule or continue reviewing the application.",
                "Cancelled" => $"Your offline interview for '{application.JobPost.Title}' was cancelled by the employer. Open WorkBridge to view the updated interview status.",
                "ChangeRequested" => $"Applicant requested a change for the offline interview for '{application.JobPost.Title}'. Open WorkBridge to review and reschedule.",
                _ => $"Interview status for '{application.JobPost.Title}' changed to {status}. Open WorkBridge to view details."
            };

            await _notificationService.CreateNotificationAsync(
                notifyUserId,
                notificationTitle,
                notificationMessage
            );

            var updatedInterview = await GetInterviewResponseAsync(interview.InterviewId);

            // Push real-time update to both participants
            _ = Task.Run(async () =>
            {
                try
                {
                    if (updatedInterview != null)
                        await _hubNotifier.NotifyInterviewChangedAsync(interview.EmployerId, interview.ApplicantId, updatedInterview);
                }
                catch { }
            });

            return (updatedInterview, null);
        }

        public async Task<(InterviewResponse? Interview, string? Error)> UpdateInterviewScheduleAsync(int employerId, int interviewId, CreateInterviewRequest request)
        {
            if (request.ScheduledAt <= DateTime.UtcNow.AddMinutes(115)) return (null, "Thời gian phỏng vấn phải được hẹn trước ít nhất 2 giờ.");
            if (string.IsNullOrWhiteSpace(request.Location)) return (null, "Địa điểm phỏng vấn là bắt buộc.");

            var interview = await _context.Interviews.FirstOrDefaultAsync(i => i.InterviewId == interviewId && i.EmployerId == employerId);
            if (interview == null) return (null, "Không tìm thấy lịch phỏng vấn.");
            if (interview.Result != null || interview.Status == "Completed") return (null, "Không thể cập nhật cuộc phỏng vấn đã hoàn thành.");

            var application = await _context.Applications
                .Include(a => a.JobPost)
                .FirstOrDefaultAsync(a => a.ApplicationId == interview.ApplicationId);
            if (application == null) return (null, "Không tìm thấy hồ sơ ứng tuyển.");

            interview.ScheduledAt = request.ScheduledAt;
            interview.Location = request.Location.Trim();
            interview.Note = request.Note?.Trim();
            interview.Status = "Scheduled"; // Reset to Scheduled so applicant can respond again
            interview.UpdatedAt = DateTime.UtcNow;

            application.Status = "Interview Scheduled";
            application.RespondedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                interview.ApplicantId,
                "Lịch phỏng vấn đã thay đổi",
                $"Lịch phỏng vấn công việc '{application.JobPost.Title}' đã được cập nhật thành {interview.ScheduledAt:g} tại {interview.Location}. Vui lòng mở ứng dụng để phản hồi."
            );

            var updatedInterview = await GetInterviewResponseAsync(interview.InterviewId);

            _ = Task.Run(async () =>
            {
                try
                {
                    if (updatedInterview != null)
                    {
                        await _hubNotifier.NotifyInterviewChangedAsync(interview.EmployerId, interview.ApplicantId, updatedInterview);
                        await _hubNotifier.NotifyConversationUpdatedAsync(interview.EmployerId, interview.ApplicantId);
                    }
                }
                catch { }
            });

            return (updatedInterview, null);
        }

        public async Task<(InterviewResponse? Interview, string? Error)> UpdateResultAsync(int employerId, int interviewId, UpdateInterviewResultRequest request)
        {
            var result = request.Result?.Trim();
            if (result != "Passed" && result != "Failed") return (null, "Result must be Passed or Failed.");

            var interview = await _context.Interviews.FirstOrDefaultAsync(i => i.InterviewId == interviewId && i.EmployerId == employerId);
            if (interview == null) return (null, "Interview not found.");
            if (interview.Result != null || interview.Status == "Completed") return (null, "Interview already has a result.");

            var application = await _context.Applications
                .Include(a => a.JobPost)
                .FirstOrDefaultAsync(a => a.ApplicationId == interview.ApplicationId);
            if (application == null) return (null, "Application not found.");

            var hasActiveEmploymentBeforeResult = await _context.Employments.AnyAsync(e =>
                e.EmployerId == employerId &&
                e.EmployeeUserId == interview.ApplicantId &&
                e.Status == "Active");
            if (hasActiveEmploymentBeforeResult) return (null, "Applicant is already an active employee for this employer.");

            if (interview.Status != "Confirmed") return (null, "Applicant must accept the interview before you can mark a result.");
            if (interview.ScheduledAt > DateTime.UtcNow) return (null, "Interview result is available after the scheduled time.");

            if (result == "Failed")
            {
                interview.Status = "Completed";
                interview.Result = "Failed";
                interview.UpdatedAt = DateTime.UtcNow;
                if (!string.IsNullOrWhiteSpace(request.Note))
                {
                    interview.Note = request.Note.Trim();
                }

                application.Status = "Rejected";
                application.RespondedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                await _notificationService.CreateNotificationAsync(
                    interview.ApplicantId,
                    "Interview Result",
                    $"Your interview for '{application.JobPost.Title}' was marked as Not Passed. Open WorkBridge to view the result and continue applying for other jobs."
                );

                var failedInterview = await GetInterviewResponseAsync(interview.InterviewId);
                _ = Task.Run(async () =>
                {
                    try
                    {
                        if (failedInterview != null)
                            await _hubNotifier.NotifyInterviewChangedAsync(interview.EmployerId, interview.ApplicantId, failedInterview);
                    }
                    catch { }
                });

                return (failedInterview, null);
            }

            var hireError = ValidateHireRequest(request);
            if (hireError != null) return (null, hireError);

            var branch = await _context.Branches.FirstOrDefaultAsync(b =>
                b.BranchId == request.BranchId!.Value &&
                b.EmployerId == employerId &&
                b.IsActive);
            if (branch == null) return (null, "Branch not found or inactive.");

            // Cancel any existing pending ("Sent") offers to allow sending a new/revised one
            var pendingOffers = await _context.Offers
                .Where(o => o.ApplicationId == interview.ApplicationId && o.Status == "Sent")
                .ToListAsync();
            foreach (var pendingOffer in pendingOffers)
            {
                pendingOffer.Status = "Cancelled";
                pendingOffer.RespondedAt = DateTime.UtcNow;
            }

            await using var transaction = await _context.Database.BeginTransactionAsync();

            var now = DateTime.UtcNow;
            var offer = new Offer
            {
                ApplicationId = application.ApplicationId,
                EmployerId = employerId,
                ApplicantId = interview.ApplicantId,
                BranchId = branch.BranchId,
                Position = request.Position!.Trim(),
                HourlyRate = request.HourlyRate!.Value,
                StartDate = request.StartDate!.Value.Date,
                PaydayOfMonth = request.PaydayOfMonth!.Value,
                Status = "Sent",
                CreatedAt = now
            };

            await _context.Offers.AddAsync(offer);
            await _context.SaveChangesAsync();

            var offerMessage = new Message
            {
                SenderId = employerId,
                ReceiverId = interview.ApplicantId,
                JobPostId = application.JobPostId,
                MessageType = "OfferInvite",
                Content = offer.OfferId.ToString(),
                IsRead = false,
                SentAt = now
            };

            await _context.Messages.AddAsync(offerMessage);
            await _context.SaveChangesAsync();

            interview.Status = "Completed";
            interview.Result = "Passed";
            interview.UpdatedAt = now;
            if (!string.IsNullOrWhiteSpace(request.Note))
            {
                interview.Note = request.Note.Trim();
            }

            application.Status = "Offered";
            application.RespondedAt = now;
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            await _notificationService.CreateNotificationAsync(
                interview.ApplicantId,
                "Job Offer Received",
                $"You passed the interview and received a job offer for '{application.JobPost.Title}'. Open WorkBridge to review the offer and choose Accept or Decline."
            );

            var passedInterview = await GetInterviewResponseAsync(interview.InterviewId);
            var offerResponse = await (from o in _context.Offers
                                      join app in _context.Applications on o.ApplicationId equals app.ApplicationId
                                      join job in _context.JobPosts on app.JobPostId equals job.JobPostId
                                      join b in _context.Branches on o.BranchId equals b.BranchId
                                      join emp in _context.EmployerProfiles on o.EmployerId equals emp.EmployerId
                                      join applicant in _context.Users on o.ApplicantId equals applicant.UserId
                                      where o.OfferId == offer.OfferId
                                      select new OfferResponse
                                      {
                                          OfferId = o.OfferId,
                                          ApplicationId = o.ApplicationId,
                                          JobPostId = job.JobPostId,
                                          EmployerId = o.EmployerId,
                                          ApplicantId = o.ApplicantId,
                                          BranchId = o.BranchId,
                                          BranchName = b.Name,
                                          CompanyName = emp.CompanyName,
                                          ApplicantName = applicant.FullName,
                                          JobTitle = job.Title,
                                          Position = o.Position,
                                          HourlyRate = o.HourlyRate,
                                          StartDate = o.StartDate,
                                          PaydayOfMonth = o.PaydayOfMonth,
                                          Status = o.Status,
                                          CreatedAt = o.CreatedAt,
                                          AcceptedAt = o.AcceptedAt,
                                          ExpiredAt = o.ExpiredAt,
                                          Vacancies = job.Vacancies
                                      }).FirstOrDefaultAsync();

            var messageResponse = new MessageResponse
            {
                MessageId = offerMessage.MessageId,
                SenderId = offerMessage.SenderId,
                SenderName = (await _context.Users.FindAsync(employerId))?.FullName ?? "",
                ReceiverId = offerMessage.ReceiverId,
                Content = offerMessage.Content,
                MessageType = offerMessage.MessageType,
                Offer = offerResponse,
                IsRead = false,
                SentAt = offerMessage.SentAt
            };

            _ = Task.Run(async () =>
            {
                try
                {
                    if (passedInterview != null)
                        await _hubNotifier.NotifyInterviewChangedAsync(interview.EmployerId, interview.ApplicantId, passedInterview);

                    if (offerResponse != null)
                    {
                        await _hubNotifier.NotifyOfferChangedAsync(interview.EmployerId, interview.ApplicantId, offerResponse);
                        await _hubNotifier.SendMessageToUsersAsync(employerId, interview.ApplicantId, messageResponse);
                        await _hubNotifier.NotifyConversationUpdatedAsync(employerId, interview.ApplicantId);
                    }
                }
                catch { }
            });

            return (passedInterview, null);
        }

        private async Task<(InterviewResponse? Interview, string? Error)> CreateInterviewCoreAsync(int employerId, CreateInterviewRequest request, bool createChatMessage)
        {
            if (request.ScheduledAt <= DateTime.UtcNow.AddMinutes(115)) return (null, "Interview time must be scheduled at least 2 hours in advance.");
            if (string.IsNullOrWhiteSpace(request.Location)) return (null, "Offline interview location is required.");

            var application = await _context.Applications
                .Include(a => a.JobPost)
                .FirstOrDefaultAsync(a => a.ApplicationId == request.ApplicationId && a.JobPost.EmployerId == employerId && !a.IsDeleted);
            if (application == null) return (null, "Application not found.");
            if (!SchedulableApplicationStatuses.Contains(application.Status))
            {
                return (null, "Only accepted or under-review applications can be scheduled.");
            }

            // Cancel any existing future interviews for the same application that haven't happened yet
            var existingFutureInterviews = await _context.Interviews
                .Where(i => i.ApplicationId == application.ApplicationId &&
                            i.Result == null &&
                            (i.Status == "Scheduled" || i.Status == "Confirmed") &&
                            i.ScheduledAt > DateTime.UtcNow)
                .ToListAsync();

            foreach (var oldInterview in existingFutureInterviews)
            {
                oldInterview.Status = "Cancelled";
                oldInterview.UpdatedAt = DateTime.UtcNow;

                var oldInterviewResponse = await GetInterviewResponseAsync(oldInterview.InterviewId);
                if (oldInterviewResponse != null)
                {
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            await _hubNotifier.NotifyInterviewChangedAsync(oldInterview.EmployerId, oldInterview.ApplicantId, oldInterviewResponse);
                        }
                        catch { }
                    });
                }
            }


            var interview = new Interview
            {
                ApplicationId = application.ApplicationId,
                EmployerId = employerId,
                ApplicantId = application.ApplicantId,
                ScheduledAt = request.ScheduledAt,
                Location = request.Location.Trim(),
                Note = request.Note?.Trim(),
                Status = "Scheduled",
                CreatedAt = DateTime.UtcNow
            };

            await _context.Interviews.AddAsync(interview);
            application.Status = "Interview Scheduled";
            application.RespondedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            foreach (var oldInterview in existingFutureInterviews)
            {
                await _notificationService.CreateNotificationAsync(
                    oldInterview.ApplicantId,
                    "Interview Cancelled",
                    $"A previous offline interview for '{application.JobPost.Title}' on {oldInterview.ScheduledAt:g} was cancelled because a new interview was scheduled. Open WorkBridge to view the new invitation."
                );
            }

            if (createChatMessage)
            {
                var message = new Message
                {
                    SenderId = employerId,
                    ReceiverId = application.ApplicantId,
                    JobPostId = application.JobPostId,
                    InterviewId = interview.InterviewId,
                    MessageType = "InterviewInvite",
                    Content = $"Interview invitation: {application.JobPost.Title} on {interview.ScheduledAt:g} at {interview.Location}.",
                    IsRead = false,
                    SentAt = DateTime.UtcNow
                };
                await _context.Messages.AddAsync(message);
                await _context.SaveChangesAsync();

                var sender = await _context.Users.FindAsync(employerId);
                var senderName = sender?.FullName ?? "Employer";

                var applicant = await _context.Users.FindAsync(application.ApplicantId);
                var applicantName = applicant?.FullName ?? "Applicant";

                var employerProfile = await _context.EmployerProfiles.FirstOrDefaultAsync(ep => ep.EmployerId == employerId);
                var companyName = employerProfile?.CompanyName ?? "Company";

                var interviewSummary = new InterviewMessageSummary
                {
                    InterviewId = interview.InterviewId,
                    ApplicationId = interview.ApplicationId,
                    EmployerId = interview.EmployerId,
                    ApplicantId = interview.ApplicantId,
                    CompanyName = companyName,
                    ApplicantName = applicantName,
                    JobTitle = application.JobPost.Title,
                    ScheduledAt = interview.ScheduledAt,
                    Location = interview.Location,
                    Note = interview.Note,
                    Status = interview.Status,
                    Result = interview.Result,
                    CanEmployerMarkResult = false,
                    ApplicationStatus = application.Status,
                    OfferStatus = null,
                    HasSentOffer = false,
                    HasAcceptedOffer = false,
                    IsEmployee = false
                };

                var messageResponse = new MessageResponse
                {
                    MessageId = message.MessageId,
                    SenderId = message.SenderId,
                    SenderName = senderName,
                    ReceiverId = message.ReceiverId,
                    Content = message.Content,
                    MessageType = message.MessageType,
                    InterviewId = message.InterviewId,
                    Interview = interviewSummary,
                    IsRead = message.IsRead,
                    SentAt = message.SentAt
                };

                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _hubNotifier.SendMessageToUsersAsync(employerId, application.ApplicantId, messageResponse);
                        await _hubNotifier.NotifyConversationUpdatedAsync(employerId, application.ApplicantId);
                        await _hubNotifier.NotifyApplicationChangedAsync(employerId, application.ApplicantId);
                    }
                    catch { }
                });
            }

            await _notificationService.CreateNotificationAsync(
                application.ApplicantId,
                "Interview Scheduled",
                $"You have an offline interview for '{application.JobPost.Title}' on {interview.ScheduledAt:g} at {interview.Location}. Open WorkBridge to accept or reject this invitation."
            );

            return (await GetInterviewResponseAsync(interview.InterviewId), null);
        }

        private static string? ValidateHireRequest(UpdateInterviewResultRequest request)
        {
            if (!request.BranchId.HasValue || request.BranchId.Value <= 0) return "Branch is required when passing an applicant.";
            if (string.IsNullOrWhiteSpace(request.Position)) return "Position is required when passing an applicant.";
            if (!request.HourlyRate.HasValue || request.HourlyRate.Value <= 0) return "Hourly rate must be greater than 0.";
            if (!request.StartDate.HasValue) return "Start date is required when passing an applicant.";
            if (!request.PaydayOfMonth.HasValue || request.PaydayOfMonth.Value < 1 || request.PaydayOfMonth.Value > 28)
            {
                return "Payday must be between day 1 and 28.";
            }

            return null;
        }

        private IQueryable<InterviewResponse> BuildInterviewQuery()
        {
            return from interview in _context.Interviews
                   join app in _context.Applications on interview.ApplicationId equals app.ApplicationId
                   join job in _context.JobPosts on app.JobPostId equals job.JobPostId
                   join employer in _context.EmployerProfiles on interview.EmployerId equals employer.EmployerId
                   join applicant in _context.Users on interview.ApplicantId equals applicant.UserId
                   select new InterviewResponse
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
                       CreatedAt = interview.CreatedAt,
                       UpdatedAt = interview.UpdatedAt,
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
                   };
        }

        private async Task<InterviewResponse?> GetInterviewResponseAsync(int interviewId)
        {
            return await BuildInterviewQuery().FirstOrDefaultAsync(i => i.InterviewId == interviewId);
        }
    }
}

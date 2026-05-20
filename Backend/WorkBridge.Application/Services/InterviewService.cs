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
                    SchedulableApplicationStatuses.Contains(a.Status))
                .OrderByDescending(a => a.AppliedAt)
                .Select(a => new InterviewChatApplicationResponse
                {
                    ApplicationId = a.ApplicationId,
                    JobPostId = a.JobPostId,
                    JobTitle = a.JobPost.Title,
                    Status = a.Status,
                    AppliedAt = a.AppliedAt.GetValueOrDefault()
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
                application.Status = "Under Review";
                application.RespondedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            var notifyUserId = role == "Employer" ? interview.ApplicantId : interview.EmployerId;
            await _notificationService.CreateNotificationAsync(
                notifyUserId,
                "Interview Updated",
                $"Interview status changed to {status}."
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

        public async Task<(InterviewResponse? Interview, string? Error)> UpdateResultAsync(int employerId, int interviewId, UpdateInterviewResultRequest request)
        {
            var result = request.Result?.Trim();
            if (result != "Passed" && result != "Failed") return (null, "Result must be Passed or Failed.");

            var interview = await _context.Interviews.FirstOrDefaultAsync(i => i.InterviewId == interviewId && i.EmployerId == employerId);
            if (interview == null) return (null, "Interview not found.");
            if (interview.Result != null || interview.Status == "Completed") return (null, "Interview already has a result.");
            if (interview.Status != "Confirmed") return (null, "Applicant must accept the interview before result can be marked.");
            if (interview.ScheduledAt > DateTime.Now) return (null, "Interview result can only be marked after the scheduled time.");

            var application = await _context.Applications
                .Include(a => a.JobPost)
                .FirstOrDefaultAsync(a => a.ApplicationId == interview.ApplicationId);
            if (application == null) return (null, "Application not found.");

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
                    $"Your interview for '{application.JobPost.Title}' was marked as Failed."
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

            var hasActiveEmployment = await _context.Employments.AnyAsync(e =>
                e.EmployerId == employerId &&
                e.EmployeeUserId == interview.ApplicantId &&
                e.Status == "Active");
            if (hasActiveEmployment) return (null, "Applicant is already an active employee for this employer.");

            var hasOpenOffer = await _context.Offers.AnyAsync(o =>
                o.ApplicationId == interview.ApplicationId &&
                (o.Status == "Sent" || o.Status == "Accepted"));
            if (hasOpenOffer) return (null, "This application already has an active offer.");

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
                Status = "Accepted",
                CreatedAt = now,
                AcceptedAt = now,
                RespondedAt = now
            };

            await _context.Offers.AddAsync(offer);
            await _context.SaveChangesAsync();

            var employment = new Employment
            {
                EmployerId = employerId,
                EmployeeUserId = interview.ApplicantId,
                BranchId = branch.BranchId,
                OfferId = offer.OfferId,
                Position = offer.Position,
                Status = "Active",
                StartDate = offer.StartDate,
                CreatedAt = now
            };

            await _context.Employments.AddAsync(employment);
            await _context.SaveChangesAsync();

            await _context.EmployeeRates.AddAsync(new EmployeeRate
            {
                EmploymentId = employment.EmploymentId,
                HourlyRate = offer.HourlyRate,
                EffectiveFrom = offer.StartDate,
                CreatedAt = now
            });

            interview.Status = "Completed";
            interview.Result = "Passed";
            interview.UpdatedAt = now;
            if (!string.IsNullOrWhiteSpace(request.Note))
            {
                interview.Note = request.Note.Trim();
            }

            application.Status = "Hired";
            application.RespondedAt = now;
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            await _notificationService.CreateNotificationAsync(
                interview.ApplicantId,
                "Interview Passed",
                $"You passed the interview for '{application.JobPost.Title}' and are now an employee."
            );

            var passedInterview = await GetInterviewResponseAsync(interview.InterviewId);
            _ = Task.Run(async () =>
            {
                try
                {
                    if (passedInterview != null)
                        await _hubNotifier.NotifyInterviewChangedAsync(interview.EmployerId, interview.ApplicantId, passedInterview);
                }
                catch { }
            });

            return (passedInterview, null);
        }

        private async Task<(InterviewResponse? Interview, string? Error)> CreateInterviewCoreAsync(int employerId, CreateInterviewRequest request, bool createChatMessage)
        {
            if (request.ScheduledAt <= DateTime.Now) return (null, "Interview time must be in the future.");
            if (string.IsNullOrWhiteSpace(request.Location)) return (null, "Offline interview location is required.");

            var application = await _context.Applications
                .Include(a => a.JobPost)
                .FirstOrDefaultAsync(a => a.ApplicationId == request.ApplicationId && a.JobPost.EmployerId == employerId && !a.IsDeleted);
            if (application == null) return (null, "Application not found.");
            if (!SchedulableApplicationStatuses.Contains(application.Status))
            {
                return (null, "Only accepted or under-review applications can be scheduled.");
            }

            var hasActiveInterview = await _context.Interviews.AnyAsync(i =>
                i.ApplicationId == application.ApplicationId &&
                i.Result == null &&
                (i.Status == "Scheduled" || i.Status == "Confirmed"));
            if (hasActiveInterview) return (null, "This application already has an active interview.");

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

            if (createChatMessage)
            {
                await _context.Messages.AddAsync(new Message
                {
                    SenderId = employerId,
                    ReceiverId = application.ApplicantId,
                    JobPostId = application.JobPostId,
                    InterviewId = interview.InterviewId,
                    MessageType = "InterviewInvite",
                    Content = $"Interview invitation: {application.JobPost.Title} on {interview.ScheduledAt:g} at {interview.Location}.",
                    IsRead = false,
                    SentAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
            }

            await _notificationService.CreateNotificationAsync(
                application.ApplicantId,
                "Interview Scheduled",
                $"You have an offline interview for '{application.JobPost.Title}'."
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
                       CanEmployerMarkResult = interview.Status == "Confirmed" &&
                                               interview.Result == null &&
                                               interview.ScheduledAt <= DateTime.Now
                   };
        }

        private async Task<InterviewResponse?> GetInterviewResponseAsync(int interviewId)
        {
            return await BuildInterviewQuery().FirstOrDefaultAsync(i => i.InterviewId == interviewId);
        }
    }
}

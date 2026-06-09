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

            if (application == null) return (null, "Không tìm thấy hồ sơ ứng tuyển trong cuộc trò chuyện này.");

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
            if (string.IsNullOrWhiteSpace(status)) return (null, "Vui lòng chọn trạng thái phỏng vấn.");

            var interview = await _context.Interviews.FirstOrDefaultAsync(i => i.InterviewId == interviewId);
            if (interview == null) return (null, "Không tìm thấy lịch phỏng vấn.");

            // Idempotency: if the interview is already in the requested status, return early with success
            if (interview.Status == status)
            {
                return (await GetInterviewResponseAsync(interview.InterviewId), null);
            }

            if (interview.Result != null || interview.Status == "Completed")
            {
                return (null, "Không thể cập nhật phỏng vấn đã hoàn tất.");
            }

            var application = await _context.Applications
                .Include(a => a.JobPost)
                .FirstOrDefaultAsync(a => a.ApplicationId == interview.ApplicationId);
            if (application == null) return (null, "Không tìm thấy hồ sơ ứng tuyển.");

            if (role == "Employer")
            {
                if (interview.EmployerId != userId) return (null, "Không tìm thấy lịch phỏng vấn.");
                if (!EmployerStatuses.Contains(status)) return (null, "Trạng thái phỏng vấn không hợp lệ với nhà tuyển dụng.");
            }
            else if (role == "Applicant")
            {
                if (interview.ApplicantId != userId) return (null, "Không tìm thấy lịch phỏng vấn.");
                if (!ApplicantStatuses.Contains(status)) return (null, "Trạng thái phỏng vấn không hợp lệ với ứng viên.");
                if (interview.Status != "Scheduled") return (null, "Chỉ lịch phỏng vấn đang chờ mới có thể phản hồi.");
            }
            else
            {
                return (null, "Vai trò tài khoản không hợp lệ.");
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
                "Confirmed" => "Ứng viên đã xác nhận phỏng vấn",
                "Declined" => "Ứng viên đã từ chối phỏng vấn",
                "Cancelled" => "Lịch phỏng vấn đã hủy",
                "ChangeRequested" => "Ứng viên muốn đổi lịch",
                _ => "Lịch phỏng vấn đã cập nhật"
            };
            var notificationMessage = status switch
            {
                "Confirmed" => $"Ứng viên đã xác nhận lịch phỏng vấn cho '{application.JobPost.Title}'.",
                "Declined" => $"Ứng viên đã từ chối lịch phỏng vấn cho '{application.JobPost.Title}'. Bạn có thể hẹn lại hoặc tiếp tục xét hồ sơ.",
                "Cancelled" => $"Nhà tuyển dụng đã hủy lịch phỏng vấn cho '{application.JobPost.Title}'.",
                "ChangeRequested" => $"Ứng viên muốn đổi lịch phỏng vấn cho '{application.JobPost.Title}'. Vui lòng xem lại và hẹn lịch mới.",
                _ => $"Trạng thái phỏng vấn cho '{application.JobPost.Title}' đã chuyển sang: {ToVietnameseInterviewStatus(status)}."
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
            if (result != "Passed" && result != "Failed") return (null, "Kết quả phỏng vấn phải là Đạt hoặc Không đạt.");

            var interview = await _context.Interviews.FirstOrDefaultAsync(i => i.InterviewId == interviewId && i.EmployerId == employerId);
            if (interview == null) return (null, "Không tìm thấy lịch phỏng vấn.");
            if (interview.Result != null || interview.Status == "Completed") return (null, "Lịch phỏng vấn này đã có kết quả.");

            var application = await _context.Applications
                .Include(a => a.JobPost)
                .FirstOrDefaultAsync(a => a.ApplicationId == interview.ApplicationId);
            if (application == null) return (null, "Không tìm thấy hồ sơ ứng tuyển.");

            var hasActiveEmploymentBeforeResult = await _context.Employments.AnyAsync(e =>
                e.EmployerId == employerId &&
                e.EmployeeUserId == interview.ApplicantId &&
                e.Status == "Active");
            if (hasActiveEmploymentBeforeResult) return (null, "Ứng viên đã là nhân viên đang hoạt động của doanh nghiệp này.");

            if (interview.Status != "Confirmed") return (null, "Ứng viên cần xác nhận lịch phỏng vấn trước khi chấm kết quả.");
            if (interview.ScheduledAt > DateTime.UtcNow) return (null, "Chỉ được cập nhật kết quả sau thời gian phỏng vấn.");

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
                    "Kết quả phỏng vấn",
                    $"Phỏng vấn cho '{application.JobPost.Title}' được đánh dấu Không đạt. Bạn có thể tiếp tục ứng tuyển công việc khác."
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
            if (branch == null) return (null, "Không tìm thấy chi nhánh hoặc chi nhánh đã ngừng hoạt động.");

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
                "Bạn đã nhận được lời mời nhận việc",
                $"Bạn đã đạt phỏng vấn và nhận được lời mời cho '{application.JobPost.Title}'. Vui lòng mở WorkBridge để xem chi tiết và phản hồi."
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
            if (request.ScheduledAt <= DateTime.UtcNow.AddMinutes(115)) return (null, "Lịch phỏng vấn phải được hẹn trước ít nhất 2 giờ.");
            if (string.IsNullOrWhiteSpace(request.Location)) return (null, "Vui lòng nhập địa điểm phỏng vấn.");

            var application = await _context.Applications
                .Include(a => a.JobPost)
                .FirstOrDefaultAsync(a => a.ApplicationId == request.ApplicationId && a.JobPost.EmployerId == employerId && !a.IsDeleted);
            if (application == null) return (null, "Không tìm thấy hồ sơ ứng tuyển.");
            if (!SchedulableApplicationStatuses.Contains(application.Status))
            {
                return (null, "Chỉ hồ sơ đã duyệt hoặc đang xem xét mới được hẹn phỏng vấn.");
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
                    "Lịch phỏng vấn cũ đã hủy",
                    $"Lịch phỏng vấn cũ cho '{application.JobPost.Title}' vào {oldInterview.ScheduledAt:g} đã bị hủy vì có lịch mới."
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
                    Content = $"Lời mời phỏng vấn: {application.JobPost.Title} vào {interview.ScheduledAt:g} tại {interview.Location}.",
                    IsRead = false,
                    SentAt = DateTime.UtcNow
                };
                await _context.Messages.AddAsync(message);
                await _context.SaveChangesAsync();

                var sender = await _context.Users.FindAsync(employerId);
                var senderName = sender?.FullName ?? "Nhà tuyển dụng";

                var applicant = await _context.Users.FindAsync(application.ApplicantId);
                var applicantName = applicant?.FullName ?? "Ứng viên";

                var employerProfile = await _context.EmployerProfiles.FirstOrDefaultAsync(ep => ep.EmployerId == employerId);
                var companyName = employerProfile?.CompanyName ?? "Doanh nghiệp";

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
                "Bạn có lịch phỏng vấn mới",
                $"Bạn có lịch phỏng vấn cho '{application.JobPost.Title}' vào {interview.ScheduledAt:g} tại {interview.Location}. Vui lòng phản hồi lời mời."
            );

            return (await GetInterviewResponseAsync(interview.InterviewId), null);
        }

        private static string? ValidateHireRequest(UpdateInterviewResultRequest request)
        {
            if (!request.BranchId.HasValue || request.BranchId.Value <= 0) return "Vui lòng chọn chi nhánh làm việc.";
            if (string.IsNullOrWhiteSpace(request.Position)) return "Vui lòng nhập vị trí làm việc.";
            if (!request.HourlyRate.HasValue || request.HourlyRate.Value <= 0) return "Mức lương theo giờ phải lớn hơn 0.";
            if (!request.StartDate.HasValue) return "Vui lòng chọn ngày bắt đầu làm việc.";
            if (!request.PaydayOfMonth.HasValue || request.PaydayOfMonth.Value < 1 || request.PaydayOfMonth.Value > 28)
            {
                return "Ngày trả lương phải nằm trong khoảng 1 - 28.";
            }

            return null;
        }

        private static string ToVietnameseInterviewStatus(string? status)
        {
            return status?.Trim().ToLowerInvariant() switch
            {
                "scheduled" => "Đang chờ phản hồi",
                "confirmed" => "Đã xác nhận",
                "declined" => "Đã từ chối",
                "cancelled" or "canceled" => "Đã hủy",
                "changerequested" => "Yêu cầu đổi lịch",
                "completed" => "Đã hoàn tất",
                _ => string.IsNullOrWhiteSpace(status) ? "Không rõ" : status
            };
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

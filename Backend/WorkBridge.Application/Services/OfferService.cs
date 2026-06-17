using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Interfaces;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public class OfferService : IOfferService
    {
        private readonly IWorkBridgeContext _context;
        private readonly INotificationService _notificationService;
        private readonly IHubNotifier _hubNotifier;
        private readonly ILogger<OfferService> _logger;

        public OfferService(
            IWorkBridgeContext context,
            INotificationService notificationService,
            IHubNotifier hubNotifier,
            ILogger<OfferService> logger)
        {
            _context = context;
            _notificationService = notificationService;
            _hubNotifier = hubNotifier;
            _logger = logger;
        }

        public async Task<(OfferResponse? Offer, string? Error)> CreateOfferAsync(int employerId, CreateOfferRequest request)
        {
            if (request.HourlyRate <= 0) return (null, "Mức lương theo giờ phải lớn hơn 0.");
            if (request.PaydayOfMonth < 1 || request.PaydayOfMonth > 28) return (null, "Ngày trả lương phải nằm trong khoảng 1 - 28.");
            if (string.IsNullOrWhiteSpace(request.Position)) return (null, "Vui lòng nhập vị trí làm việc.");

            var branch = await _context.Branches
                .FirstOrDefaultAsync(b => b.BranchId == request.BranchId && b.EmployerId == employerId && b.IsActive);
            if (branch == null) return (null, "Không tìm thấy chi nhánh hoặc chi nhánh đã ngừng hoạt động.");

            var application = await _context.Applications
                .Include(a => a.JobPost)
                .FirstOrDefaultAsync(a => a.ApplicationId == request.ApplicationId && a.JobPost.EmployerId == employerId && !a.IsDeleted);
            if (application == null) return (null, "Không tìm thấy hồ sơ ứng tuyển.");
            if (application.Status == "Rejected")
            {
                return (null, "Hồ sơ này chưa đủ điều kiện để gửi lời mời nhận việc.");
            }

            var employerProfile = await _context.EmployerProfiles
                .FirstOrDefaultAsync(ep => ep.EmployerId == employerId);
            if (employerProfile != null && (employerProfile.Status == "Suspended" || employerProfile.ReputationScore < 80))
            {
                return (null, "Tài khoản doanh nghiệp của bạn đã bị khóa do điểm uy tín quá thấp.");
            }

            var hasActiveEmployment = await _context.Employments.AnyAsync(e =>
                e.EmployerId == employerId &&
                e.EmployeeUserId == application.ApplicantId &&
                e.Status == "Active");
            if (hasActiveEmployment)
            {
                return (null, "Ứng viên đã là nhân viên đang hoạt động của doanh nghiệp này.");
            }

            var now = DateTime.UtcNow;
            await using var transaction = await _context.Database.BeginTransactionAsync();

            var offer = await _context.Offers
                .Where(o => o.ApplicationId == request.ApplicationId && o.Status == "Sent")
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync();
            var isRevision = offer != null;

            if (offer == null)
            {
                offer = new Offer
                {
                    ApplicationId = application.ApplicationId,
                    EmployerId = employerId,
                    ApplicantId = application.ApplicantId,
                    Status = "Sent",
                    CreatedAt = now
                };
                await _context.Offers.AddAsync(offer);
            }

            ApplyOfferFields(offer, branch.BranchId, request.Position, request.HourlyRate, request.StartDate, request.PaydayOfMonth, request.ExpiredAt, request.ExpectedShifts);
            application.Status = "Offered";
            application.RespondedAt = now;
            await _context.SaveChangesAsync();

            await CancelOtherPendingOffersAsync(offer.ApplicationId, offer.OfferId, now);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            var response = await GetOfferResponseAsync(offer.OfferId)
                ?? await BuildOfferResponseFallbackAsync(offer, application, branch, employerProfile);

            var offerMessage = await TryUpsertOfferMessageAsync(
                employerId,
                application.ApplicantId,
                application.JobPostId,
                offer.OfferId,
                now,
                "create offer");

            var messageResponse = await BuildOfferMessageResponseAsync(employerId, offerMessage, response);

            await TryCreateNotificationAsync(
                application.ApplicantId,
                isRevision ? "Lời mời nhận việc đã cập nhật" : "Lời mời nhận việc mới",
                isRevision
                    ? $"Lời mời nhận việc cho '{application.JobPost.Title}' đã được cập nhật. Vui lòng mở WorkBridge để xem lương, chi nhánh, ngày bắt đầu và phản hồi."
                    : $"Bạn nhận được lời mời nhận việc cho '{application.JobPost.Title}'. Vui lòng mở WorkBridge để xem chi tiết và phản hồi.",
                $"create offer {offer.OfferId}"
            );

            if (response != null)
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _hubNotifier.NotifyOfferChangedAsync(employerId, application.ApplicantId, response);
                        if (messageResponse != null)
                        {
                            await _hubNotifier.SendMessageToUsersAsync(employerId, application.ApplicantId, messageResponse);
                        }
                        await _hubNotifier.NotifyConversationUpdatedAsync(employerId, application.ApplicantId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Offer realtime push failed after creating offer {OfferId}.", offer.OfferId);
                    }
                });
            }
            return (response, null);
        }

        public async Task<(OfferResponse? Offer, string? Error)> UpdateOfferAsync(int employerId, int offerId, UpdateOfferRequest request)
        {
            if (request.HourlyRate <= 0) return (null, "Mức lương theo giờ phải lớn hơn 0.");
            if (request.PaydayOfMonth < 1 || request.PaydayOfMonth > 28) return (null, "Ngày trả lương phải nằm trong khoảng 1 - 28.");
            if (string.IsNullOrWhiteSpace(request.Position)) return (null, "Vui lòng nhập vị trí làm việc.");

            var offer = await _context.Offers.FirstOrDefaultAsync(o => o.OfferId == offerId && o.EmployerId == employerId);
            if (offer == null) return (null, "Không tìm thấy lời mời nhận việc.");
            if (offer.Status != "Sent") return (null, "Chỉ lời mời đang chờ ứng viên phản hồi mới có thể chỉnh sửa.");

            var application = await _context.Applications
                .Include(a => a.JobPost)
                .FirstOrDefaultAsync(a => a.ApplicationId == offer.ApplicationId && !a.IsDeleted);
            if (application == null) return (null, "Không tìm thấy hồ sơ ứng tuyển.");

            var branch = await _context.Branches.FirstOrDefaultAsync(b =>
                b.BranchId == request.BranchId &&
                b.EmployerId == employerId &&
                b.IsActive);
            if (branch == null) return (null, "Không tìm thấy chi nhánh hoặc chi nhánh đã ngừng hoạt động.");

            var employerProfile = await _context.EmployerProfiles
                .FirstOrDefaultAsync(ep => ep.EmployerId == employerId);
            if (employerProfile != null && (employerProfile.Status == "Suspended" || employerProfile.ReputationScore < 80))
            {
                return (null, "Tài khoản doanh nghiệp của bạn đã bị khóa do điểm uy tín quá thấp.");
            }

            var hasActiveEmployment = await _context.Employments.AnyAsync(e =>
                e.EmployerId == employerId &&
                e.EmployeeUserId == offer.ApplicantId &&
                e.Status == "Active");
            if (hasActiveEmployment) return (null, "Ứng viên đã là nhân viên đang hoạt động của doanh nghiệp này.");

            var now = DateTime.UtcNow;
            await using var transaction = await _context.Database.BeginTransactionAsync();

            ApplyOfferFields(offer, branch.BranchId, request.Position, request.HourlyRate, request.StartDate, request.PaydayOfMonth, request.ExpiredAt, request.ExpectedShifts);
            application.Status = "Offered";
            application.RespondedAt = now;
            await CancelOtherPendingOffersAsync(offer.ApplicationId, offer.OfferId, now);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            var response = await GetOfferResponseAsync(offer.OfferId)
                ?? await BuildOfferResponseFallbackAsync(offer, application, branch, employerProfile);

            var offerMessage = await TryUpsertOfferMessageAsync(
                employerId,
                offer.ApplicantId,
                application.JobPostId,
                offer.OfferId,
                now,
                "update offer");

            if (response != null)
            {
                var messageResponse = await BuildOfferMessageResponseAsync(employerId, offerMessage, response);

                await TryCreateNotificationAsync(
                    offer.ApplicantId,
                    "Lời mời nhận việc đã cập nhật",
                    $"Lời mời nhận việc cho '{application.JobPost.Title}' đã được cập nhật. Vui lòng mở WorkBridge để xem chi tiết và phản hồi.",
                    $"update offer {offer.OfferId}"
                );

                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _hubNotifier.NotifyOfferChangedAsync(employerId, offer.ApplicantId, response);
                        if (messageResponse != null)
                        {
                            await _hubNotifier.SendMessageToUsersAsync(employerId, offer.ApplicantId, messageResponse);
                        }
                        await _hubNotifier.NotifyConversationUpdatedAsync(employerId, offer.ApplicantId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Offer realtime push failed after updating offer {OfferId}.", offer.OfferId);
                    }
                });
            }

            return (response, null);
        }

        public async Task<IEnumerable<OfferResponse>> GetEmployerOffersAsync(int employerId)
        {
            var offers = await BuildOfferQuery()
                .Where(o => o.EmployerId == employerId)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();
            await AttachHiringPlanInfoAsync(offers);
            return offers;
        }

        public async Task<IEnumerable<OfferResponse>> GetMyOffersAsync(int applicantId)
        {
            var offers = await BuildOfferQuery()
                .Where(o => o.ApplicantId == applicantId)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();
            await AttachHiringPlanInfoAsync(offers);
            return offers;
        }

        public async Task<(EmploymentResponse? Employment, string? Error)> AcceptOfferAsync(int applicantId, int offerId)
        {
            var offer = await _context.Offers.FirstOrDefaultAsync(o => o.OfferId == offerId && o.ApplicantId == applicantId);
            if (offer == null) return (null, "Không tìm thấy lời mời nhận việc.");
            if (offer.Status != "Sent") return (null, "Chỉ lời mời đang chờ phản hồi mới có thể chấp nhận.");
            if (offer.ExpiredAt.HasValue && offer.ExpiredAt.Value < DateTime.UtcNow) return (null, "Lời mời nhận việc đã hết hạn.");

            var activeEmploymentsCount = await _context.Employments
                .Where(e => e.EmployeeUserId == applicantId && e.Status == "Active")
                .Select(e => e.EmployerId)
                .Distinct()
                .CountAsync();
            if (activeEmploymentsCount >= 2)
            {
                return (null, "Bạn đã có đủ 2 công việc đang hoạt động (làm việc tối đa tại 2 doanh nghiệp). Không thể nhận thêm công việc.");
            }

            var hasActiveEmployment = await _context.Employments.AnyAsync(e =>
                e.EmployerId == offer.EmployerId &&
                e.EmployeeUserId == offer.ApplicantId &&
                e.Status == "Active");
            if (hasActiveEmployment) return (null, "Bạn đã là nhân viên đang hoạt động của doanh nghiệp này.");

            var application = await _context.Applications
                .Include(a => a.JobPost)
                .FirstOrDefaultAsync(a => a.ApplicationId == offer.ApplicationId);
            if (application == null) return (null, "Không tìm thấy hồ sơ ứng tuyển.");

            await using var transaction = await _context.Database.BeginTransactionAsync();

            var now = DateTime.UtcNow;
            var employment = new Employment
            {
                EmployerId = offer.EmployerId,
                EmployeeUserId = offer.ApplicantId,
                BranchId = offer.BranchId,
                OfferId = offer.OfferId,
                Position = offer.Position,
                Status = "Active",
                StartDate = offer.StartDate,
                ExpectedShifts = offer.ExpectedShifts,
                CreatedAt = now
            };

            await _context.Employments.AddAsync(employment);
            await _context.SaveChangesAsync();

            var rate = new EmployeeRate
            {
                EmploymentId = employment.EmploymentId,
                HourlyRate = offer.HourlyRate,
                EffectiveFrom = offer.StartDate,
                CreatedAt = now
            };

            await _context.EmployeeRates.AddAsync(rate);
            offer.Status = "Accepted";
            offer.AcceptedAt = now;
            offer.RespondedAt = now;
            application.Status = "Hired";
            application.RespondedAt = now;

            var otherSentOffers = await _context.Offers
                .Where(o => o.ApplicationId == offer.ApplicationId &&
                            o.OfferId != offer.OfferId &&
                            o.Status == "Sent")
                .ToListAsync();
            foreach (var otherOffer in otherSentOffers)
            {
                otherOffer.Status = "Cancelled";
                otherOffer.RespondedAt = now;
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            await _notificationService.CreateNotificationAsync(
                offer.EmployerId,
                "Ứng viên đã nhận việc",
                $"Ứng viên đã chấp nhận lời mời cho '{application.JobPost.Title}'. Vui lòng mở WorkBridge để quản lý nhân viên, ca làm và lương."
            );

            var response = await GetEmploymentResponseAsync(employment.EmploymentId);

            // Also push updated offer state to both parties
            var offerResponse = await GetOfferResponseAsync(offer.OfferId);
            if (offerResponse != null)
            {
                _ = Task.Run(async () =>
                {
                    try { await _hubNotifier.NotifyOfferChangedAsync(offer.EmployerId, applicantId, offerResponse); }
                    catch { }
                });
            }

            return (response, null);
        }

        public async Task<string?> DeclineOfferAsync(int applicantId, int offerId)
        {
            var offer = await _context.Offers.FirstOrDefaultAsync(o => o.OfferId == offerId && o.ApplicantId == applicantId);
            if (offer == null) return "Không tìm thấy lời mời nhận việc.";
            if (offer.Status != "Sent") return "Chỉ lời mời đang chờ phản hồi mới có thể từ chối.";

            offer.Status = "Declined";
            offer.RespondedAt = DateTime.UtcNow;

            var application = await _context.Applications.FirstOrDefaultAsync(a => a.ApplicationId == offer.ApplicationId);
            if (application != null && application.Status == "Offered")
            {
                application.Status = "Accepted";
                application.RespondedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                offer.EmployerId,
                "Ứng viên đã từ chối lời mời",
                "Ứng viên đã từ chối lời mời nhận việc. Bạn có thể xem lại hồ sơ, tiếp tục nhắn tin hoặc gửi lời mời mới sau."
            );

            var offerResponse = await GetOfferResponseAsync(offer.OfferId);
            if (offerResponse != null)
            {
                _ = Task.Run(async () =>
                {
                    try { await _hubNotifier.NotifyOfferChangedAsync(offer.EmployerId, applicantId, offerResponse); }
                    catch { }
                });
            }

            return null;
        }

        public async Task<string?> CancelOfferAsync(int employerId, int offerId)
        {
            var offer = await _context.Offers.FirstOrDefaultAsync(o => o.OfferId == offerId && o.EmployerId == employerId);
            if (offer == null) return "Không tìm thấy lời mời nhận việc.";
            if (offer.Status != "Sent") return "Chỉ lời mời đang chờ phản hồi mới có thể hủy.";

            offer.Status = "Cancelled";
            offer.RespondedAt = DateTime.UtcNow;

            var application = await _context.Applications.FirstOrDefaultAsync(a => a.ApplicationId == offer.ApplicationId);
            if (application != null && application.Status == "Offered")
            {
                application.Status = "Accepted";
                application.RespondedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                offer.ApplicantId,
                "Lời mời nhận việc đã bị hủy",
                "Nhà tuyển dụng đã hủy lời mời nhận việc. Vui lòng mở WorkBridge để xem trạng thái mới và tiếp tục trao đổi nếu cần."
            );

            var offerResponse = await GetOfferResponseAsync(offer.OfferId);
            if (offerResponse != null)
            {
                _ = Task.Run(async () =>
                {
                    try { await _hubNotifier.NotifyOfferChangedAsync(employerId, offer.ApplicantId, offerResponse); }
                    catch { }
                });
            }

            return null;
        }

        private IQueryable<OfferResponse> BuildOfferQuery()
        {
            return from offer in _context.Offers
                   join app in _context.Applications on offer.ApplicationId equals app.ApplicationId
                   join job in _context.JobPosts on app.JobPostId equals job.JobPostId
                   join branch in _context.Branches on offer.BranchId equals branch.BranchId
                   join employerProfile in _context.EmployerProfiles on offer.EmployerId equals employerProfile.EmployerId into employerProfiles
                   from employer in employerProfiles.DefaultIfEmpty()
                   join applicant in _context.Users on offer.ApplicantId equals applicant.UserId
                   select new OfferResponse
                   {
                       OfferId = offer.OfferId,
                       ApplicationId = offer.ApplicationId,
                       JobPostId = job.JobPostId,
                       EmployerId = offer.EmployerId,
                       ApplicantId = offer.ApplicantId,
                       BranchId = offer.BranchId,
                       BranchName = branch.Name,
                       CompanyName = employer == null ? "Doanh nghiệp WorkBridge" : employer.CompanyName,
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
                       ExpectedShifts = offer.ExpectedShifts,
                       Vacancies = job.Vacancies
                   };
        }

        private async Task<OfferResponse?> GetOfferResponseAsync(int offerId)
        {
            var offer = await BuildOfferQuery().FirstOrDefaultAsync(o => o.OfferId == offerId);
            if (offer != null) await AttachHiringPlanInfoAsync(new List<OfferResponse> { offer });
            return offer;
        }

        private async Task AttachHiringPlanInfoAsync(List<OfferResponse> offers)
        {
            var jobPostIds = offers
                .Select(o => o.JobPostId)
                .Where(id => id > 0)
                .Distinct()
                .ToList();
            if (jobPostIds.Count == 0) return;

            var activeCounts = await (from employment in _context.Employments
                                      join offer in _context.Offers on employment.OfferId equals offer.OfferId
                                      join application in _context.Applications on offer.ApplicationId equals application.ApplicationId
                                      where jobPostIds.Contains(application.JobPostId) &&
                                            employment.Status == "Active"
                                      group employment by application.JobPostId into grouped
                                      select new
                                      {
                                          JobPostId = grouped.Key,
                                          Count = grouped.Count()
                                      })
                .ToDictionaryAsync(x => x.JobPostId, x => x.Count);

            foreach (var offer in offers)
            {
                activeCounts.TryGetValue(offer.JobPostId, out var activeCount);
                offer.ActiveEmploymentCount = activeCount;

                if (!offer.Vacancies.HasValue || offer.Vacancies.Value <= 0)
                {
                    offer.IsOverHiringPlan = false;
                    offer.HiringPlanNote = "Tin tuyển dụng chưa đặt số lượng cần tuyển; doanh nghiệp có thể tự quyết số nhân viên nhận vào.";
                    continue;
                }

                offer.IsOverHiringPlan = activeCount > offer.Vacancies.Value;
                offer.HiringPlanNote = offer.IsOverHiringPlan
                    ? $"Đã có {activeCount}/{offer.Vacancies.Value} nhân viên active cho tin này. Đây là cảnh báo vượt nhu cầu dự kiến, không chặn doanh nghiệp tuyển thêm."
                    : $"Đã có {activeCount}/{offer.Vacancies.Value} nhân viên active theo nhu cầu dự kiến.";
            }
        }

        private async Task TryCreateNotificationAsync(int userId, string title, string message, string operation)
        {
            try
            {
                await _notificationService.CreateNotificationAsync(userId, title, message);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Notification/email queue failed during {Operation}.", operation);
            }
        }

        private async Task<Message?> TryUpsertOfferMessageAsync(
            int employerId,
            int applicantId,
            int jobPostId,
            int offerId,
            DateTime sentAt,
            string operation)
        {
            try
            {
                var message = await UpsertOfferMessageAsync(employerId, applicantId, jobPostId, offerId, sentAt);
                await _context.SaveChangesAsync();
                return message;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Offer chat message failed during {Operation} for offer {OfferId}.", operation, offerId);
                return null;
            }
        }

        private async Task<MessageResponse?> BuildOfferMessageResponseAsync(
            int employerId,
            Message? offerMessage,
            OfferResponse? offer)
        {
            if (offerMessage == null)
            {
                return null;
            }

            return new MessageResponse
            {
                MessageId = offerMessage.MessageId,
                SenderId = offerMessage.SenderId,
                SenderName = (await _context.Users.FindAsync(employerId))?.FullName ?? "",
                ReceiverId = offerMessage.ReceiverId,
                Content = offerMessage.Content,
                MessageType = offerMessage.MessageType,
                Offer = offer,
                IsRead = offerMessage.IsRead,
                SentAt = offerMessage.SentAt
            };
        }

        private async Task<OfferResponse> BuildOfferResponseFallbackAsync(
            Offer offer,
            JobApplication application,
            Branch branch,
            EmployerProfile? employerProfile)
        {
            var applicantName = await _context.Users
                .Where(u => u.UserId == offer.ApplicantId)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync();

            var response = new OfferResponse
            {
                OfferId = offer.OfferId,
                ApplicationId = offer.ApplicationId,
                JobPostId = application.JobPost?.JobPostId ?? application.JobPostId,
                EmployerId = offer.EmployerId,
                ApplicantId = offer.ApplicantId,
                BranchId = offer.BranchId,
                BranchName = branch.Name,
                CompanyName = string.IsNullOrWhiteSpace(employerProfile?.CompanyName)
                    ? "Doanh nghiệp WorkBridge"
                    : employerProfile.CompanyName,
                ApplicantName = applicantName ?? "",
                JobTitle = application.JobPost?.Title ?? offer.Position,
                Position = offer.Position,
                HourlyRate = offer.HourlyRate,
                StartDate = offer.StartDate,
                PaydayOfMonth = offer.PaydayOfMonth,
                Status = offer.Status,
                CreatedAt = offer.CreatedAt,
                AcceptedAt = offer.AcceptedAt,
                ExpiredAt = offer.ExpiredAt,
                ExpectedShifts = offer.ExpectedShifts,
                Vacancies = application.JobPost?.Vacancies
            };

            await AttachHiringPlanInfoAsync(new List<OfferResponse> { response });
            return response;
        }

        private static void ApplyOfferFields(
            Offer offer,
            int branchId,
            string position,
            decimal hourlyRate,
            DateTime startDate,
            int paydayOfMonth,
            DateTime? expiredAt,
            string? expectedShifts)
        {
            offer.BranchId = branchId;
            offer.Position = position.Trim();
            offer.HourlyRate = hourlyRate;
            offer.StartDate = startDate.Date;
            offer.PaydayOfMonth = paydayOfMonth;
            offer.ExpiredAt = expiredAt;
            offer.ExpectedShifts = expectedShifts;
        }

        private async Task<Message> UpsertOfferMessageAsync(
            int employerId,
            int applicantId,
            int jobPostId,
            int offerId,
            DateTime sentAt)
        {
            var offerIdText = offerId.ToString();
            var message = await _context.Messages
                .Where(m => m.MessageType == "OfferInvite" && m.Content == offerIdText)
                .OrderByDescending(m => m.SentAt)
                .FirstOrDefaultAsync();

            if (message == null)
            {
                message = new Message
                {
                    SenderId = employerId,
                    ReceiverId = applicantId,
                    JobPostId = jobPostId,
                    MessageType = "OfferInvite",
                    Content = offerIdText
                };
                await _context.Messages.AddAsync(message);
            }

            message.SenderId = employerId;
            message.ReceiverId = applicantId;
            message.JobPostId = jobPostId;
            message.IsRead = false;
            message.SentAt = sentAt;
            return message;
        }

        private async Task CancelOtherPendingOffersAsync(int applicationId, int activeOfferId, DateTime now)
        {
            var duplicatePendingOffers = await _context.Offers
                .Where(o => o.ApplicationId == applicationId &&
                            o.OfferId != activeOfferId &&
                            o.Status == "Sent")
                .ToListAsync();

            foreach (var duplicateOffer in duplicatePendingOffers)
            {
                duplicateOffer.Status = "Cancelled";
                duplicateOffer.RespondedAt = now;
            }
        }

        private async Task<EmploymentResponse?> GetEmploymentResponseAsync(int employmentId)
        {
            return await (from employment in _context.Employments
                          join user in _context.Users on employment.EmployeeUserId equals user.UserId
                          join branch in _context.Branches on employment.BranchId equals branch.BranchId
                          join rate in _context.EmployeeRates on employment.EmploymentId equals rate.EmploymentId
                          where employment.EmploymentId == employmentId && rate.EffectiveTo == null
                          select new EmploymentResponse
                          {
                              EmploymentId = employment.EmploymentId,
                              EmployerId = employment.EmployerId,
                              EmployeeUserId = employment.EmployeeUserId,
                              BranchId = employment.BranchId,
                              BranchName = branch.Name,
                              OfferId = employment.OfferId,
                              EmployeeName = user.FullName,
                              EmployeeEmail = user.Email,
                              Position = employment.Position,
                              Status = employment.Status,
                              StartDate = employment.StartDate,
                              EndDate = employment.EndDate,
                              CurrentHourlyRate = rate.HourlyRate,
                              ExpectedShifts = employment.ExpectedShifts,
                              AvatarUrl = user.AvatarUrl
                          })
                .FirstOrDefaultAsync();
        }
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Interfaces;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public class ApplicationService : IApplicationService
    {
        private readonly IWorkBridgeContext _context;
        private readonly INotificationService _notificationService;
        private readonly IHubNotifier _hubNotifier;
        private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "Applied",
            "Pending",
            "Under Review",
            "Accepted",
            "Rejected",
            "Interview Scheduled",
            "Interview Passed",
            "Interview Failed",
            "Offered",
            "Hired",
            "Cancelled"
        };
        private static readonly string[] MessageableStatuses =
        {
            "Accepted",
            "Interview Scheduled",
            "Interview Passed",
            "Offered",
            "Hired"
        };
        private static readonly HashSet<string> ReapplyableStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "Rejected",
            "Cancelled",
            "Canceled",
            "Interview Failed"
        };
        private static readonly HashSet<string> ReapplyableClosedOfferStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "Accepted",
            "Declined",
            "Cancelled",
            "Canceled"
        };

        public ApplicationService(IWorkBridgeContext context, INotificationService notificationService, IHubNotifier hubNotifier)
        {
            _context = context;
            _notificationService = notificationService;
            _hubNotifier = hubNotifier;
        }

        public async Task<ApplyJobResult> ApplyForJobAsync(int userId, ApplyJobRequest request)
        {
            // Check if job exists and is published
            var job = await _context.JobPosts.FirstOrDefaultAsync(j => j.JobPostId == request.JobPostId && !j.IsDeleted);
            if (job == null) return ApplyError("Công việc không tồn tại.");
            if (job.Status != "Published") return ApplyError($"Công việc này chưa mở ứng tuyển. Trạng thái hiện tại: {ToVietnameseStatus(job.Status)}.");

            // Check if user has applicant profile
            var profile = await _context.ApplicantProfiles
                .Include(p => p.Applicant)
                .FirstOrDefaultAsync(p => p.ApplicantId == userId);
            if (profile == null) return ApplyProfileIncomplete(new[] { "hồ sơ ứng viên", "số điện thoại", "vị trí/địa chỉ", "CV PDF" }, 80);

            profile.ReputationScore = ProfileReputationCalculator.CalculateApplicantScore(profile, profile.Applicant);
            var missingProfileFields = ProfileReputationCalculator.GetMissingApplicantApplyFields(profile);
            if (missingProfileFields.Count > 0)
            {
                await _context.SaveChangesAsync();
                return ApplyProfileIncomplete(missingProfileFields, profile.ReputationScore);
            }

            // Check if applicant is blocked due to reputation < 80
            if (profile.ReputationScore < 80)
            {
                await _context.SaveChangesAsync();
                return ApplyError("Tài khoản của bạn có điểm uy tín dưới 80. Bạn không thể tiếp tục ứng tuyển.", profile.ReputationScore);
            }

            // Check if applicant is already working in 2 distinct businesses (employers)
            var activeEmploymentsCount = await _context.Employments
                .Where(e => e.EmployeeUserId == userId && e.Status == "Active")
                .Select(e => e.EmployerId)
                .Distinct()
                .CountAsync();
            if (activeEmploymentsCount >= 2)
            {
                return ApplyError("Bạn đã có đủ 2 công việc đang hoạt động (làm việc tối đa tại 2 doanh nghiệp). Không thể ứng tuyển thêm.", profile.ReputationScore);
            }

            // Check if the employer is suspended or has reputation < 80
            var employerProfile = await _context.EmployerProfiles
                .FirstOrDefaultAsync(ep => ep.EmployerId == job.EmployerId);
            if (employerProfile != null && (employerProfile.Status == "Suspended" || employerProfile.ReputationScore < 80))
            {
                return ApplyError("Doanh nghiệp này đã bị tạm ngưng hoạt động do điểm uy tín quá thấp.", profile.ReputationScore);
            }

            // Check if user is already an active employee of this employer
            var isAlreadyEmployee = await _context.Employments
                .AnyAsync(e => e.EmployeeUserId == userId && e.EmployerId == job.EmployerId && e.Status == "Active");
            if (isAlreadyEmployee) return ApplyError("Bạn đang là nhân viên của doanh nghiệp này nên không thể ứng tuyển lại.", profile.ReputationScore);

            // Block only active application pipelines. Closed historical applications remain as history,
            // and a re-apply creates a fresh application row so old offers/employments stay intact.
            var existingApplications = await _context.Applications
                .Where(a => a.JobPostId == request.JobPostId && a.ApplicantId == profile.ApplicantId)
                .OrderByDescending(a => a.AppliedAt)
                .ToListAsync();
            foreach (var existingApplication in existingApplications)
            {
                if (!await CanReapplyExistingApplicationAsync(existingApplication, job.EmployerId))
                {
                    return ApplyError($"Bạn đã ứng tuyển công việc này. Trạng thái hiện tại: {ToVietnameseStatus(existingApplication.Status)}.", profile.ReputationScore);
                }
            }

            var application = new JobApplication
            {
                JobPostId = request.JobPostId,
                ApplicantId = profile.ApplicantId,
                CoverMessage = request.CoverMessage,
                CvUrl = profile.CvUrl,
                Status = "Applied",
                IsDeleted = false,
                AppliedAt = DateTime.UtcNow
            };
            _context.Applications.Add(application);

            await _context.SaveChangesAsync();

            // Notify Employer
            await _notificationService.CreateNotificationAsync(
                job.EmployerId,
                "Đơn ứng tuyển mới",
                $"Ứng viên {profile.Applicant?.FullName ?? "WorkBridge"} đã ứng tuyển công việc: {job.Title}"
            );

            // Push real-time to both employer and applicant
            _ = Task.Run(async () =>
            {
                try { await _hubNotifier.NotifyApplicationChangedAsync(job.EmployerId, profile.ApplicantId); }
                catch { }
            });

            return new ApplyJobResult
            {
                Success = true,
                ReputationScore = profile.ReputationScore
            };
        }

        private static ApplyJobResult ApplyError(string error, int? reputationScore = null)
        {
            return new ApplyJobResult
            {
                Success = false,
                Error = error,
                ReputationScore = reputationScore
            };
        }

        private static ApplyJobResult ApplyProfileIncomplete(IEnumerable<string> missingFields, int? reputationScore = null)
        {
            var fields = missingFields
                .Where(field => !string.IsNullOrWhiteSpace(field))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            return new ApplyJobResult
            {
                Success = false,
                RequiresProfileUpdate = true,
                MissingFields = fields,
                ReputationScore = reputationScore,
                Error = fields.Count > 0
                    ? $"Bạn cần cập nhật hồ sơ trước khi ứng tuyển. Còn thiếu: {string.Join(", ", fields)}."
                    : "Bạn cần cập nhật hồ sơ trước khi ứng tuyển."
            };
        }

        public async Task<IEnumerable<ApplicationResponse>> GetMyApplicationsAsync(int userId)
        {
            return await _context.Applications
                .Include(a => a.JobPost)
                    .ThenInclude(j => j.Employer)
                .Where(a => a.ApplicantId == userId && !a.IsDeleted)
                .OrderByDescending(a => a.AppliedAt)
                .Select(a => new ApplicationResponse
                {
                    ApplicationId = a.ApplicationId,
                    JobPostId = a.JobPostId,
                    EmployerId = a.JobPost.EmployerId,
                    JobTitle = a.JobPost.Title,
                    CompanyName = a.JobPost.Employer.CompanyName,
                    Status = _context.Employments.Any(e => e.Status == "Ended" &&
                                                           _context.Offers.Any(o => o.OfferId == e.OfferId &&
                                                                                    o.ApplicationId == a.ApplicationId))
                             ? "Ended"
                             : a.Status,
                    AppliedAt = a.AppliedAt.GetValueOrDefault(),
                    Location = (!string.IsNullOrEmpty(a.JobPost.District) ? a.JobPost.District + ", " : "") + a.JobPost.City,
                    CanMessage = MessageableStatuses.Contains(a.Status) ||
                                 _context.Employments.Any(e => _context.Offers.Any(o => o.OfferId == e.OfferId && o.ApplicationId == a.ApplicationId)),
                    IsActiveEmployee = _context.Employments.Any(e => e.Status == "Active" &&
                                                                      _context.Offers.Any(o => o.OfferId == e.OfferId &&
                                                                                               o.ApplicationId == a.ApplicationId)),
                    CanReapply =
                        a.Status == "Rejected" ||
                        a.Status == "Cancelled" ||
                        a.Status == "Canceled" ||
                        a.Status == "Interview Failed" ||
                        (
                            (a.Status == "Accepted" || a.Status == "Offered" || a.Status == "Interview Passed" || a.Status == "Hired") &&
                            !_context.Offers.Any(o => o.ApplicationId == a.ApplicationId && o.Status == "Sent") &&
                            _context.Offers.Any(o => o.ApplicationId == a.ApplicationId && (o.Status == "Accepted" || o.Status == "Declined" || o.Status == "Cancelled" || o.Status == "Canceled")) &&
                            !_context.Employments.Any(e => e.EmployerId == a.JobPost.EmployerId &&
                                                          e.EmployeeUserId == a.ApplicantId &&
                                                          e.Status == "Active")
                        )
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<EmployerApplicationResponse>> GetApplicationsForEmployerAsync(int employerId)
        {
            return await _context.Applications
                .Include(a => a.JobPost)
                .Include(a => a.Applicant)
                    .ThenInclude(p => p.Applicant) // Inner User
                .Where(a => a.JobPost.EmployerId == employerId && !a.IsDeleted)
                .OrderByDescending(a => a.AppliedAt)
                .Select(a => new EmployerApplicationResponse
                {
                    ApplicationId = a.ApplicationId,
                    OfferId = _context.Offers
                        .Where(o => o.ApplicationId == a.ApplicationId && o.Status == "Sent")
                        .OrderByDescending(o => o.CreatedAt)
                        .Select(o => o.OfferId)
                        .FirstOrDefault(),
                    OfferStatus = _context.Offers
                        .Where(o => o.ApplicationId == a.ApplicationId)
                        .OrderByDescending(o => o.CreatedAt)
                        .Select(o => o.Status)
                        .FirstOrDefault(),
                    HasOffer = _context.Offers
                        .Any(o => o.ApplicationId == a.ApplicationId && (o.Status == "Sent" || o.Status == "Accepted")),
                    HasSentOffer = _context.Offers
                        .Any(o => o.ApplicationId == a.ApplicationId && o.Status == "Sent"),
                    HasAcceptedOffer = _context.Offers
                        .Any(o => o.ApplicationId == a.ApplicationId && o.Status == "Accepted"),
                    IsEmployee = _context.Employments
                        .Any(e => e.EmployerId == a.JobPost.EmployerId &&
                                  e.EmployeeUserId == a.ApplicantId &&
                                  e.Status == "Active"),
                    JobPostId = a.JobPostId,
                    JobTitle = a.JobPost.Title,
                    ApplicantId = a.ApplicantId,
                    ApplicantName = a.Applicant.Applicant.FullName,
                    ApplicantEmail = a.Applicant.Applicant.Email,
                    ApplicantAvatarUrl = a.Applicant.Applicant.AvatarUrl,
                    ApplicantMajor = a.Applicant.Major,
                    StudyYear = a.Applicant.StudyYear,
                    CoverMessage = a.CoverMessage,
                    CvUrl = a.CvUrl,
                    Status = a.Status,
                    AppliedAt = a.AppliedAt.GetValueOrDefault(),
                    CanMessage = MessageableStatuses.Contains(a.Status),
                    University = a.Applicant.University,
                    Phone = a.Applicant.Phone,
                    Address = a.Applicant.Address,
                    AboutMe = a.Applicant.AboutMe,
                    Availability = a.Applicant.Availability,
                    Skills = a.Applicant.ApplicantSkills
                        .OrderBy(s => s.SkillName)
                        .Select(s => s.SkillName)
                        .ToList(),
                    Experiences = a.Applicant.ApplicantExperiences
                        .OrderBy(e => e.ExperienceId)
                        .Select(e => new ApplicantExperienceSummary
                        {
                            Title = e.Title,
                            CompanyName = e.CompanyName,
                            Duration = e.Duration,
                            Description = e.Description
                        })
                        .ToList(),
                    AverageRating = _context.Reviews
                        .Where(r => r.RevieweeId == a.ApplicantId && !r.IsDeleted)
                        .Select(r => (double?)r.Rating)
                        .Average() ?? 0,
                    TotalReviews = _context.Reviews
                        .Count(r => r.RevieweeId == a.ApplicantId && !r.IsDeleted),
                    RecentReviews = _context.Reviews
                        .Where(r => r.RevieweeId == a.ApplicantId && !r.IsDeleted)
                        .OrderByDescending(r => r.CreatedAt)
                        .Take(3)
                        .Select(r => new ApplicantReviewSummary
                        {
                            ReviewerName = r.Reviewer.FullName,
                            JobTitle = r.JobPost.Title,
                            Rating = r.Rating,
                            Comment = r.Comment,
                            CreatedAt = r.CreatedAt.GetValueOrDefault()
                        })
                        .ToList()
                })
                .ToListAsync();
        }

        public async Task<ApplicationStatusUpdateResult> UpdateApplicationStatusAsync(int employerId, int applicationId, string status)
        {
            var normalizedStatus = NormalizeStatus(status);
            if (string.IsNullOrWhiteSpace(normalizedStatus) || !AllowedStatuses.Contains(normalizedStatus))
            {
                return new ApplicationStatusUpdateResult
                {
                    Success = false,
                    Error = "Trạng thái ứng tuyển không hợp lệ."
                };
            }

            var application = await _context.Applications
                .Include(a => a.JobPost)
                .Include(a => a.Applicant)
                    .ThenInclude(p => p.Applicant)
                .FirstOrDefaultAsync(a => a.ApplicationId == applicationId && a.JobPost.EmployerId == employerId && !a.IsDeleted);

            if (application == null)
            {
                return new ApplicationStatusUpdateResult
                {
                    Success = false,
                    Error = "Không tìm thấy hồ sơ ứng tuyển hoặc bạn không có quyền cập nhật."
                };
            }

            var wasAccepted = application.Status.Equals("Accepted", StringComparison.OrdinalIgnoreCase);
            application.Status = normalizedStatus;
            application.RespondedAt = DateTime.UtcNow;

            if (normalizedStatus.Equals("Accepted", StringComparison.OrdinalIgnoreCase) && !wasAccepted)
            {
                await EnsureAcceptedConversationAsync(application);
            }

            await _context.SaveChangesAsync();

            // Notify Applicant
            await _notificationService.CreateNotificationAsync(
                application.ApplicantId,
                "Cập nhật trạng thái ứng tuyển",
                $"Đơn ứng tuyển của bạn cho '{application.JobPost.Title}' đã chuyển sang: {ToVietnameseStatus(normalizedStatus)}."
            );

            // Push real-time
            _ = Task.Run(async () =>
            {
                try { await _hubNotifier.NotifyApplicationChangedAsync(employerId, application.ApplicantId); }
                catch { }
            });

            return new ApplicationStatusUpdateResult
            {
                Success = true,
                Status = normalizedStatus,
                ConversationContactId = MessageableStatuses.Contains(normalizedStatus) ? application.ApplicantId : null,
                ConversationContactName = MessageableStatuses.Contains(normalizedStatus)
                    ? application.Applicant.Applicant.FullName
                    : null
            };
        }

        private static string NormalizeStatus(string status)
        {
            if (string.IsNullOrWhiteSpace(status)) return string.Empty;

            var trimmed = status.Trim();
            return trimmed.ToLowerInvariant() switch
            {
                "pending" => "Applied",
                "applied" => "Applied",
                "underreview" => "Under Review",
                "under review" => "Under Review",
                "accepted" => "Accepted",
                "approved" => "Accepted",
                "rejected" => "Rejected",
                "interviewscheduled" => "Interview Scheduled",
                "interview scheduled" => "Interview Scheduled",
                "interviewpassed" => "Interview Passed",
                "interview passed" => "Interview Passed",
                "interviewfailed" => "Interview Failed",
                "interview failed" => "Interview Failed",
                "offered" => "Offered",
                "hired" => "Hired",
                "cancelled" => "Cancelled",
                "canceled" => "Cancelled",
                _ => trimmed
            };
        }

        private static string ToVietnameseStatus(string? status)
        {
            return status?.Trim().ToLowerInvariant() switch
            {
                "applied" => "Đã ứng tuyển",
                "pending" => "Đang chờ",
                "under review" => "Đang xét duyệt",
                "accepted" => "Đã duyệt",
                "rejected" => "Đã từ chối",
                "interview scheduled" => "Đã hẹn phỏng vấn",
                "interview passed" => "Phỏng vấn đạt",
                "interview failed" => "Phỏng vấn không đạt",
                "offered" => "Đã gửi lời mời nhận việc",
                "hired" => "Đã nhận việc",
                "cancelled" or "canceled" => "Đã hủy",
                "published" => "Đang mở",
                "draft" => "Bản nháp",
                _ => string.IsNullOrWhiteSpace(status) ? "Không rõ" : status
            };
        }

        private async Task EnsureAcceptedConversationAsync(JobApplication application)
        {
            var alreadyHasThread = await _context.Messages.AnyAsync(m =>
                m.JobPostId == application.JobPostId &&
                ((m.SenderId == application.JobPost.EmployerId && m.ReceiverId == application.ApplicantId) ||
                 (m.SenderId == application.ApplicantId && m.ReceiverId == application.JobPost.EmployerId)));

            if (alreadyHasThread) return;

            _context.Messages.Add(new Message
            {
                SenderId = application.JobPost.EmployerId,
                ReceiverId = application.ApplicantId,
                JobPostId = application.JobPostId,
                Content = $"Đơn ứng tuyển của bạn cho \"{application.JobPost.Title}\" đã được chấp nhận. Hai bên có thể trao đổi lịch phỏng vấn tại đây.",
                IsRead = false,
                SentAt = DateTime.UtcNow
            });
        }

        private async Task<bool> CanReapplyExistingApplicationAsync(JobApplication application, int employerId)
        {
            if (application.IsDeleted || ReapplyableStatuses.Contains(application.Status))
            {
                return true;
            }

            var hasActiveEmployment = await _context.Employments.AnyAsync(e =>
                e.EmployerId == employerId &&
                e.EmployeeUserId == application.ApplicantId &&
                e.Status == "Active");
            if (hasActiveEmployment)
            {
                return false;
            }

            var hasPendingOffer = await _context.Offers.AnyAsync(o =>
                o.ApplicationId == application.ApplicationId &&
                o.Status == "Sent");
            if (hasPendingOffer)
            {
                return false;
            }

            var latestOfferStatus = await _context.Offers
                .Where(o => o.ApplicationId == application.ApplicationId)
                .OrderByDescending(o => o.CreatedAt)
                .Select(o => o.Status)
                .FirstOrDefaultAsync();

            return latestOfferStatus != null && ReapplyableClosedOfferStatuses.Contains(latestOfferStatus);
        }
    }
}

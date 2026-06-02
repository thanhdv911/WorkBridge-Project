using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using WorkBridge.Application.Interfaces;
using System;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkBridge.Application.DTOs;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public class ReportService : IReportService
    {
        private readonly IWorkBridgeContext _context;
        private readonly INotificationService _notificationService;

        public ReportService(IWorkBridgeContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<bool> SubmitReportAsync(int reporterId, CreateReportRequest request)
        {
            var entityType = request.EntityType?.Trim();

            // Spam protection: check if user is reporting a business (Job or Employer) and has already reported them
            if (string.Equals(entityType, "Job", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(entityType, "Employer", StringComparison.OrdinalIgnoreCase))
            {
                int employerId = 0;
                if (string.Equals(entityType, "Job", StringComparison.OrdinalIgnoreCase))
                {
                    var job = await _context.JobPosts.FirstOrDefaultAsync(j => j.JobPostId == request.ReportedEntityId);
                    if (job != null)
                    {
                        employerId = job.EmployerId;
                    }
                }
                else
                {
                    employerId = request.ReportedEntityId;
                }

                if (employerId > 0)
                {
                    // Check previous reports count this reporter has submitted against this employer
                    var previousReportsCount = await _context.Reports.CountAsync(r =>
                        r.ReporterId == reporterId &&
                        (
                            (r.EntityType == "Employer" && r.ReportedEntityId == employerId) ||
                            (r.EntityType == "Job" && _context.JobPosts.Any(j => j.JobPostId == r.ReportedEntityId && j.EmployerId == employerId))
                        )
                    );

                    if (previousReportsCount > 0)
                    {
                        if (previousReportsCount == 1)
                        {
                            // 2nd report attempt: gentle warning notification, NO points deducted!
                            var spamReport = new Report
                            {
                                ReporterId = reporterId,
                                ReportedEntityId = request.ReportedEntityId,
                                EntityType = request.EntityType ?? string.Empty,
                                Reason = "[Spam Warning] " + (request.Reason ?? string.Empty),
                                Description = request.Description,
                                Status = "SpamWarning",
                                CreatedAt = DateTime.UtcNow
                            };
                            await _context.Reports.AddAsync(spamReport);
                            await _context.SaveChangesAsync();

                            await _notificationService.CreateNotificationAsync(
                                reporterId,
                                "Nhắc nhở: Không spam báo cáo",
                                "Bạn đã gửi báo cáo cho doanh nghiệp này trước đó. Lần thứ 2 này hệ thống chỉ nhắc nhở cảnh báo và KHÔNG trừ điểm uy tín của bạn. Vui lòng tránh spam báo cáo."
                            );

                            throw new Exception("Bạn chỉ được phép tố cáo doanh nghiệp này một lần duy nhất. Lần thứ 2 này hệ thống chỉ gửi lời nhắc nhở cảnh cáo và không trừ điểm uy tín của bạn.");
                        }
                        else
                        {
                            // 3rd attempt or more: strict warning and deduct 10 points!
                            var spamReport = new Report
                            {
                                ReporterId = reporterId,
                                ReportedEntityId = request.ReportedEntityId,
                                EntityType = request.EntityType ?? string.Empty,
                                Reason = "[Spam Penalty] " + (request.Reason ?? string.Empty),
                                Description = request.Description,
                                Status = "SpamDeducted",
                                CreatedAt = DateTime.UtcNow
                            };
                            await _context.Reports.AddAsync(spamReport);

                            var applicantProfile = await _context.ApplicantProfiles.FirstOrDefaultAsync(ap => ap.ApplicantId == reporterId);
                            if (applicantProfile != null)
                            {
                                applicantProfile.ReputationScore = Math.Max(0, applicantProfile.ReputationScore - 10);
                                await _context.SaveChangesAsync();

                                await _notificationService.CreateNotificationAsync(
                                    reporterId,
                                    "Cảnh báo spam báo cáo",
                                    $"Bạn đã bị trừ 10 điểm uy tín do cố tình spam báo cáo đối với doanh nghiệp này nhiều lần ({previousReportsCount + 1} lần). Điểm uy tín hiện tại của bạn: {applicantProfile.ReputationScore}/100."
                                );
                            }
                            else
                            {
                                await _context.SaveChangesAsync();
                            }

                            throw new Exception($"Bạn đã cố tình spam báo cáo doanh nghiệp này nhiều lần ({previousReportsCount + 1} lần). Hành vi đã bị hệ thống ghi nhận và trừ 10 điểm uy tín của bạn!");
                        }
                    }
                }
            }

            var report = new Report
            {
                ReporterId = reporterId,
                ReportedEntityId = request.ReportedEntityId,
                EntityType = request.EntityType ?? string.Empty,
                Reason = request.Reason ?? string.Empty,
                Description = request.Description,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            await _context.Reports.AddAsync(report);
            await _context.SaveChangesAsync();

            if (string.Equals(entityType, "User", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(entityType, "Applicant", StringComparison.OrdinalIgnoreCase))
            {
                // Handle Applicant report
                var profile = await _context.ApplicantProfiles
                    .Include(p => p.Applicant)
                    .FirstOrDefaultAsync(p => p.ApplicantId == request.ReportedEntityId);
                if (profile != null)
                {
                    profile.ReportCount++;
                    profile.ReputationScore = Math.Max(0, profile.ReputationScore - 5); // Deduct 5 points per report
                    await _context.SaveChangesAsync();

                    var msg = $"Tài khoản của bạn vừa nhận một báo cáo vi phạm từ doanh nghiệp. Lý do: '{request.Reason}'. Điểm uy tín hiện tại của bạn là {profile.ReputationScore}/100.";
                    if (profile.ReputationScore < 80)
                    {
                        msg += " Bạn đã bị tạm khóa tính năng ứng tuyển do điểm uy tín giảm xuống dưới 80.";
                    }
                    await _notificationService.CreateNotificationAsync(profile.ApplicantId, "Cảnh báo vi phạm tài khoản", msg);
                }
            }
            else if (string.Equals(entityType, "Job", StringComparison.OrdinalIgnoreCase) ||
                     string.Equals(entityType, "Employer", StringComparison.OrdinalIgnoreCase))
            {
                // Handle Employer/Job report
                int employerId = 0;
                if (string.Equals(entityType, "Job", StringComparison.OrdinalIgnoreCase))
                {
                    var job = await _context.JobPosts.FirstOrDefaultAsync(j => j.JobPostId == request.ReportedEntityId);
                    if (job != null)
                    {
                        employerId = job.EmployerId;
                    }
                }
                else
                {
                    employerId = request.ReportedEntityId;
                }

                if (employerId > 0)
                {
                    var employerProfile = await _context.EmployerProfiles
                        .FirstOrDefaultAsync(ep => ep.EmployerId == employerId);
                    if (employerProfile != null)
                    {
                        employerProfile.ReportCount++;

                        // Get total reports against this employer
                        var totalReports = await _context.Reports.CountAsync(r =>
                            (r.EntityType == "Employer" && r.ReportedEntityId == employerId) ||
                            (r.EntityType == "Job" && _context.JobPosts.Any(j => j.JobPostId == r.ReportedEntityId && j.EmployerId == employerId)));

                        // Get all reviews for this employer
                        var reviews = await _context.Reviews.Where(rev => rev.RevieweeId == employerId).ToListAsync();
                        var reviewsCount = reviews.Count;
                        var avgRating = reviews.Any() ? reviews.Average(rev => rev.Rating) : 5.0;

                        // AI Review Arbitration Engine evaluation
                        var aiReport = new StringBuilder();
                        aiReport.AppendLine("### AI Review Arbitration Engine Report");
                        aiReport.AppendLine("**Báo Cáo Phân Tích Trọng Tài AI**\n");
                        aiReport.AppendLine($"- **Doanh nghiệp:** {employerProfile.CompanyName}");
                        aiReport.AppendLine($"- **Tổng số lượt báo cáo:** {totalReports}");
                        aiReport.AppendLine($"- **Tổng số lượt đánh giá:** {reviewsCount}");
                        aiReport.AppendLine($"- **Điểm đánh giá trung bình:** {avgRating:F1} / 5.0\n");
                        aiReport.AppendLine("#### Phân Tích Lý Do & Phản Hồi:");
                        aiReport.AppendLine($"- **Lý do báo cáo hiện tại:** {request.Reason}");
                        aiReport.AppendLine($"- **Mô tả chi tiết:** {request.Description ?? "Không có mô tả chi tiết."}\n");

                        string aiVerdict = "";
                        if (totalReports <= 1 && reviewsCount <= 1)
                        {
                            // Rule 1: 1 report & 1 rating -> Warning only, no deduction
                            aiVerdict = "AI Verdict: Nhận diện 1 lượt báo cáo và tối đa 1 lượt đánh giá. AI quyết định gửi cảnh báo nhắc nhở doanh nghiệp nghiêm túc hơn mà chưa trừ điểm.";
                            aiReport.AppendLine($"#### Kết Luận Trọng Tài AI:\n{aiVerdict}");

                            await _notificationService.CreateNotificationAsync(
                                employerId,
                                "Cảnh báo nhắc nhở nghiêm túc",
                                "Cảnh báo nhắc nhở từ Ban quản trị WorkBridge: Doanh nghiệp của bạn vừa nhận được 1 báo cáo vi phạm và đánh giá chưa tốt. Vui lòng làm việc nghiêm túc, cải thiện chất lượng để tránh bị trừ điểm uy tín."
                            );
                        }
                        else if (totalReports >= 10)
                        {
                            // Rule 2: > 10 reports -> Automatic point deduction even with 1 review
                            employerProfile.ReputationScore = Math.Max(0, employerProfile.ReputationScore - 20);
                            aiVerdict = $"AI Verdict: Số lượng báo cáo rất cao vượt quá 10 lượt ({totalReports} báo cáo). Kích hoạt tự động trừ 20 điểm uy tín.";
                            aiReport.AppendLine($"#### Kết Luận Trọng Tài AI:\n{aiVerdict}");

                            await _notificationService.CreateNotificationAsync(
                                employerId,
                                "Cảnh báo trừ điểm uy tín",
                                $"Cảnh báo nghiêm trọng: Doanh nghiệp của bạn nhận được trên 10 báo cáo vi phạm từ người lao động. Bạn đã bị trừ 20 điểm uy tín. Điểm uy tín hiện tại: {employerProfile.ReputationScore}."
                            );
                        }
                        else if (totalReports > 1 && avgRating < 3.5)
                        {
                            // Rule 3: AI evaluates multiple reports and low ratings
                            employerProfile.ReputationScore = Math.Max(0, employerProfile.ReputationScore - 15);
                            aiVerdict = $"AI Verdict: Phát hiện doanh nghiệp bị tố cáo nhiều lần ({totalReports} lượt) kèm theo điểm đánh giá thấp ({avgRating:F1}/5.0). Quyết định trừ 15 điểm uy tín.";
                            aiReport.AppendLine($"#### Kết Luận Trọng Tài AI:\n{aiVerdict}");

                            await _notificationService.CreateNotificationAsync(
                                employerId,
                                "AI Trọng Tài: Báo cáo vi phạm & đánh giá thấp",
                                $"Doanh nghiệp của bạn nhận được nhiều báo cáo vi phạm ({totalReports} lượt) và điểm đánh giá thấp ({avgRating:F1}/5.0). AI quyết định trừ 15 điểm uy tín. Điểm uy tín hiện tại: {employerProfile.ReputationScore}."
                            );
                        }
                        else
                        {
                            // Rule 4: Moderate reports/issues
                            employerProfile.ReputationScore = Math.Max(0, employerProfile.ReputationScore - 10);
                            aiVerdict = $"AI Verdict: Phát hiện phản hồi tiêu cực và báo cáo vi phạm ({totalReports} lượt). Quyết định trừ 10 điểm uy tín.";
                            aiReport.AppendLine($"#### Kết Luận Trọng Tài AI:\n{aiVerdict}");

                            await _notificationService.CreateNotificationAsync(
                                employerId,
                                "Cảnh báo trừ điểm uy tín",
                                $"Doanh nghiệp nhận báo cáo vi phạm và phản hồi tiêu cực. Bạn bị trừ 10 điểm uy tín. Điểm uy tín hiện tại: {employerProfile.ReputationScore}."
                            );
                        }

                        // Capping rule: employer reputation score cannot fall below 80 unless they have more than 5 reports
                        if (totalReports <= 5)
                        {
                            employerProfile.ReputationScore = Math.Max(80, employerProfile.ReputationScore);
                        }

                        // Rule 5: Reputation score < 80 -> Suspend business
                        if (employerProfile.ReputationScore < 80)
                        {
                            employerProfile.Status = "Suspended";
                            await _notificationService.CreateNotificationAsync(
                                employerId,
                                "Tài khoản doanh nghiệp BỊ ĐÌNH CHỈ",
                                $"Tài khoản doanh nghiệp của bạn đã bị ĐÌNH CHỈ hoạt động do điểm uy tín giảm xuống dưới 80 ({employerProfile.ReputationScore}). Các tin tuyển dụng của bạn đã bị ẩn và bạn không thể tiếp tục gửi lời mời làm việc."
                            );
                        }

                        report.AiAnalysis = aiReport.ToString();
                        await _context.SaveChangesAsync();
                    }
                }
            }

            return true;
        }
    }
}

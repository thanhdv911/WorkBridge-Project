using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Interfaces;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public class ReportService : IReportService
    {
        private const int ExternalReportUniqueThreshold = 20;

        private readonly IWorkBridgeContext _context;
        private readonly INotificationService _notificationService;

        public ReportService(IWorkBridgeContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<bool> SubmitReportAsync(int reporterId, CreateReportRequest request)
        {
            var entityType = NormalizeEntityType(request.EntityType);
            var employerId = await ResolveEmployerIdAsync(entityType, request.ReportedEntityId);

            if (employerId > 0)
            {
                var previousReportsCount = await CountPreviousBusinessReportsAsync(reporterId, employerId);
                if (previousReportsCount > 0)
                {
                    await HandleDuplicateBusinessReportAsync(reporterId, request, entityType, previousReportsCount);
                }
            }

            var report = new Report
            {
                ReporterId = reporterId,
                ReportedEntityId = request.ReportedEntityId,
                EntityType = entityType,
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
                await ProcessApplicantReportAsync(request, report);
            }
            else if (employerId > 0)
            {
                await ProcessBusinessReportAsync(reporterId, employerId, request, report);
            }

            return true;
        }

        private async Task ProcessApplicantReportAsync(CreateReportRequest request, Report report)
        {
            var profile = await _context.ApplicantProfiles
                .Include(p => p.Applicant)
                .FirstOrDefaultAsync(p => p.ApplicantId == request.ReportedEntityId);

            if (profile == null) return;

            profile.ReportCount++;
            profile.ReputationScore = Math.Max(0, profile.ReputationScore - 5);

            var message = $"Tài khoản của bạn vừa nhận một báo cáo vi phạm từ doanh nghiệp. Lý do: \"{request.Reason}\". Điểm uy tín hiện tại: {profile.ReputationScore}/100.";
            if (profile.ReputationScore < 80)
            {
                message += " Tính năng ứng tuyển của bạn đã bị tạm khóa vì điểm uy tín dưới 80.";
            }

            report.AiAnalysis = "Báo cáo ứng viên: hệ thống ghi nhận trực tiếp và trừ 5 điểm uy tín theo cơ chế hiện tại.";

            await _notificationService.CreateNotificationAsync(
                profile.ApplicantId,
                "Cảnh báo vi phạm tài khoản",
                message);

            await _context.SaveChangesAsync();
        }

        private async Task ProcessBusinessReportAsync(int reporterId, int employerId, CreateReportRequest request, Report report)
        {
            var employerProfile = await _context.EmployerProfiles
                .FirstOrDefaultAsync(ep => ep.EmployerId == employerId);

            if (employerProfile == null) return;

            var hasEmploymentHistory = await HasEmploymentHistoryAsync(employerId, reporterId);
            var employeeReporterIds = await GetEmployeeReporterIdsAsync(employerId);
            var reportsAgainstEmployer = ReportsAgainstEmployerQuery(employerId);
            var trustedReports = await reportsAgainstEmployer
                .Where(r => employeeReporterIds.Contains(r.ReporterId))
                .CountAsync();
            var externalUniqueReporters = await reportsAgainstEmployer
                .Where(r => !employeeReporterIds.Contains(r.ReporterId))
                .Select(r => r.ReporterId)
                .Distinct()
                .CountAsync();

            var reviews = await _context.Reviews.Where(rev => rev.RevieweeId == employerId).ToListAsync();
            var reviewsCount = reviews.Count;
            var avgRating = reviews.Any() ? reviews.Average(rev => rev.Rating) : 5.0;

            var aiReport = BuildBusinessReportHeader(
                employerProfile,
                request,
                trustedReports,
                externalUniqueReporters,
                reviewsCount,
                avgRating,
                hasEmploymentHistory);

            if (!hasEmploymentHistory)
            {
                await ProcessExternalBusinessReportAsync(
                    employerId,
                    employerProfile,
                    report,
                    aiReport,
                    externalUniqueReporters);
                return;
            }

            employerProfile.ReportCount++;

            string verdict;
            if (trustedReports <= 1 && reviewsCount <= 1)
            {
                verdict = "Báo cáo đầu tiên từ nhân viên hoặc cựu nhân viên. Hệ thống nhắc nhở doanh nghiệp, chưa trừ điểm.";
                aiReport.AppendLine($"#### Kết luận\n{verdict}");

                await _notificationService.CreateNotificationAsync(
                    employerId,
                    "Nhắc nhở về báo cáo vi phạm",
                    "Doanh nghiệp của bạn vừa nhận một báo cáo từ nhân viên hoặc cựu nhân viên. Vui lòng kiểm tra lại quy trình làm việc để tránh ảnh hưởng điểm uy tín.");
            }
            else if (trustedReports >= 10)
            {
                employerProfile.ReputationScore = Math.Max(0, employerProfile.ReputationScore - 20);
                verdict = $"Có {trustedReports} báo cáo đáng tin cậy từ nhân viên hoặc cựu nhân viên. Hệ thống trừ 20 điểm uy tín.";
                aiReport.AppendLine($"#### Kết luận\n{verdict}");

                await _notificationService.CreateNotificationAsync(
                    employerId,
                    "Cảnh báo trừ điểm uy tín",
                    $"Doanh nghiệp của bạn có nhiều báo cáo từ nhân viên hoặc cựu nhân viên ({trustedReports} lượt). Điểm uy tín bị trừ 20 điểm. Điểm hiện tại: {employerProfile.ReputationScore}/100.");
            }
            else if (trustedReports > 1 && avgRating < 3.5)
            {
                employerProfile.ReputationScore = Math.Max(0, employerProfile.ReputationScore - 15);
                verdict = $"Có nhiều báo cáo đáng tin cậy ({trustedReports} lượt) và điểm đánh giá thấp ({avgRating:F1}/5). Hệ thống trừ 15 điểm uy tín.";
                aiReport.AppendLine($"#### Kết luận\n{verdict}");

                await _notificationService.CreateNotificationAsync(
                    employerId,
                    "Báo cáo vi phạm và đánh giá thấp",
                    $"Doanh nghiệp của bạn nhận nhiều báo cáo đáng tin cậy và điểm đánh giá thấp. Điểm uy tín bị trừ 15 điểm. Điểm hiện tại: {employerProfile.ReputationScore}/100.");
            }
            else
            {
                employerProfile.ReputationScore = Math.Max(0, employerProfile.ReputationScore - 10);
                verdict = $"Có {trustedReports} báo cáo đáng tin cậy từ người lao động. Hệ thống trừ 10 điểm uy tín.";
                aiReport.AppendLine($"#### Kết luận\n{verdict}");

                await _notificationService.CreateNotificationAsync(
                    employerId,
                    "Cảnh báo trừ điểm uy tín",
                    $"Doanh nghiệp của bạn nhận báo cáo đáng tin cậy từ người lao động. Điểm uy tín bị trừ 10 điểm. Điểm hiện tại: {employerProfile.ReputationScore}/100.");
            }

            if (trustedReports <= 5)
            {
                employerProfile.ReputationScore = Math.Max(80, employerProfile.ReputationScore);
            }

            if (employerProfile.ReputationScore < 80)
            {
                employerProfile.Status = "Suspended";
                await _notificationService.CreateNotificationAsync(
                    employerId,
                    "Tài khoản doanh nghiệp bị tạm dừng",
                    $"Doanh nghiệp của bạn đã bị tạm dừng vì điểm uy tín giảm xuống dưới 80 ({employerProfile.ReputationScore}/100). Các tin tuyển dụng sẽ bị hạn chế cho đến khi được xử lý.");
            }

            report.AiAnalysis = aiReport.ToString();
            await _context.SaveChangesAsync();
        }

        private async Task ProcessExternalBusinessReportAsync(
            int employerId,
            EmployerProfile employerProfile,
            Report report,
            StringBuilder aiReport,
            int externalUniqueReporters)
        {
            if (externalUniqueReporters < ExternalReportUniqueThreshold)
            {
                aiReport.AppendLine("#### Kết luận");
                aiReport.AppendLine($"Báo cáo đến từ người chưa từng là nhân viên. Hệ thống chỉ lưu cho quản trị viên xét duyệt, chưa tăng số báo cáo công khai và chưa trừ điểm. Cần đủ {ExternalReportUniqueThreshold} tài khoản khác nhau trước khi tạo tác động uy tín.");
                report.AiAnalysis = aiReport.ToString();
                await _context.SaveChangesAsync();
                return;
            }

            if (externalUniqueReporters % ExternalReportUniqueThreshold == 0)
            {
                employerProfile.ReportCount++;
                employerProfile.ReputationScore = Math.Max(80, employerProfile.ReputationScore - 10);

                aiReport.AppendLine("#### Kết luận");
                aiReport.AppendLine($"Đã có {externalUniqueReporters} tài khoản chưa có lịch sử làm việc cùng báo cáo doanh nghiệp này. Hệ thống ghi nhận một mốc cảnh báo nhẹ và trừ tối đa 10 điểm, nhưng không cho điểm uy tín giảm dưới 80 từ nhóm báo cáo này.");

                await _notificationService.CreateNotificationAsync(
                    employerId,
                    "Cảnh báo từ nhiều báo cáo bên ngoài",
                    $"Doanh nghiệp của bạn nhận báo cáo từ {externalUniqueReporters} tài khoản khác nhau chưa có lịch sử làm việc. Hệ thống đã ghi nhận một mốc cảnh báo và điểm uy tín hiện tại là {employerProfile.ReputationScore}/100.");
            }
            else
            {
                aiReport.AppendLine("#### Kết luận");
                aiReport.AppendLine($"Báo cáo ngoài đã vượt mốc theo dõi ({externalUniqueReporters} tài khoản), nhưng chưa đến mốc xử lý tiếp theo. Hệ thống lưu báo cáo cho quản trị viên xét duyệt.");
            }

            report.AiAnalysis = aiReport.ToString();
            await _context.SaveChangesAsync();
        }

        private static StringBuilder BuildBusinessReportHeader(
            EmployerProfile employerProfile,
            CreateReportRequest request,
            int trustedReports,
            int externalUniqueReporters,
            int reviewsCount,
            double avgRating,
            bool hasEmploymentHistory)
        {
            var aiReport = new StringBuilder();
            aiReport.AppendLine("### Báo cáo phân tích uy tín doanh nghiệp");
            aiReport.AppendLine($"- Doanh nghiệp: {employerProfile.CompanyName}");
            aiReport.AppendLine($"- Nguồn báo cáo: {(hasEmploymentHistory ? "Nhân viên hoặc cựu nhân viên" : "Tài khoản chưa có lịch sử làm việc")}");
            aiReport.AppendLine($"- Báo cáo đáng tin cậy từ nhân viên/cựu nhân viên: {trustedReports}");
            aiReport.AppendLine($"- Người báo cáo bên ngoài khác nhau: {externalUniqueReporters}");
            aiReport.AppendLine($"- Đánh giá trung bình: {avgRating:F1}/5 từ {reviewsCount} lượt đánh giá");
            aiReport.AppendLine($"- Lý do hiện tại: {request.Reason}");
            aiReport.AppendLine($"- Mô tả: {request.Description ?? "Không có mô tả."}");
            aiReport.AppendLine();
            return aiReport;
        }

        private async Task HandleDuplicateBusinessReportAsync(
            int reporterId,
            CreateReportRequest request,
            string entityType,
            int previousReportsCount)
        {
            var isSecondAttempt = previousReportsCount == 1;
            var spamReport = new Report
            {
                ReporterId = reporterId,
                ReportedEntityId = request.ReportedEntityId,
                EntityType = entityType,
                Reason = $"{(isSecondAttempt ? "[Nhắc nhở gửi trùng]" : "[Phạt spam báo cáo]")} {request.Reason ?? string.Empty}".Trim(),
                Description = request.Description,
                Status = isSecondAttempt ? "SpamWarning" : "SpamDeducted",
                CreatedAt = DateTime.UtcNow,
                AiAnalysis = "Báo cáo trùng từ cùng một tài khoản. Hệ thống không tính thêm vào uy tín doanh nghiệp."
            };

            await _context.Reports.AddAsync(spamReport);

            if (isSecondAttempt)
            {
                await _context.SaveChangesAsync();
                await _notificationService.CreateNotificationAsync(
                    reporterId,
                    "Bạn đã gửi báo cáo này",
                    "Hệ thống đã ghi nhận báo cáo trước đó. Vui lòng không gửi trùng nhiều lần.");

                throw new Exception("Bạn đã gửi báo cáo cho doanh nghiệp này. Hệ thống đã ghi nhận rồi.");
            }

            var applicantProfile = await _context.ApplicantProfiles.FirstOrDefaultAsync(ap => ap.ApplicantId == reporterId);
            if (applicantProfile != null)
            {
                applicantProfile.ReputationScore = Math.Max(0, applicantProfile.ReputationScore - 10);
            }

            await _context.SaveChangesAsync();

            if (applicantProfile != null)
            {
                await _notificationService.CreateNotificationAsync(
                    reporterId,
                    "Cảnh báo spam báo cáo",
                    $"Bạn bị trừ 10 điểm uy tín vì gửi trùng báo cáo nhiều lần. Điểm hiện tại: {applicantProfile.ReputationScore}/100.");
            }

            throw new Exception("Bạn đang gửi trùng báo cáo nhiều lần. Hệ thống đã trừ 10 điểm uy tín.");
        }

        private async Task<int> ResolveEmployerIdAsync(string entityType, int reportedEntityId)
        {
            if (string.Equals(entityType, "Job", StringComparison.OrdinalIgnoreCase))
            {
                return await _context.JobPosts
                    .Where(j => j.JobPostId == reportedEntityId)
                    .Select(j => j.EmployerId)
                    .FirstOrDefaultAsync();
            }

            if (string.Equals(entityType, "Employer", StringComparison.OrdinalIgnoreCase))
            {
                return reportedEntityId;
            }

            return 0;
        }

        private IQueryable<Report> ReportsAgainstEmployerQuery(int employerId)
        {
            return _context.Reports.Where(r =>
                (r.EntityType == "Employer" && r.ReportedEntityId == employerId) ||
                (r.EntityType == "Job" && _context.JobPosts.Any(j => j.JobPostId == r.ReportedEntityId && j.EmployerId == employerId)));
        }

        private Task<int> CountPreviousBusinessReportsAsync(int reporterId, int employerId)
        {
            return ReportsAgainstEmployerQuery(employerId)
                .CountAsync(r => r.ReporterId == reporterId);
        }

        private Task<bool> HasEmploymentHistoryAsync(int employerId, int reporterId)
        {
            return _context.Employments.AnyAsync(e =>
                e.EmployerId == employerId &&
                e.EmployeeUserId == reporterId);
        }

        private Task<List<int>> GetEmployeeReporterIdsAsync(int employerId)
        {
            return _context.Employments
                .Where(e => e.EmployerId == employerId)
                .Select(e => e.EmployeeUserId)
                .Distinct()
                .ToListAsync();
        }

        private static string NormalizeEntityType(string? entityType)
        {
            if (string.Equals(entityType, "Job", StringComparison.OrdinalIgnoreCase)) return "Job";
            if (string.Equals(entityType, "Employer", StringComparison.OrdinalIgnoreCase)) return "Employer";
            if (string.Equals(entityType, "User", StringComparison.OrdinalIgnoreCase)) return "User";
            if (string.Equals(entityType, "Applicant", StringComparison.OrdinalIgnoreCase)) return "Applicant";
            return entityType?.Trim() ?? string.Empty;
        }
    }
}

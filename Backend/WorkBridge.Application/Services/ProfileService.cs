using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using WorkBridge.Application.Interfaces;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using WorkBridge.Application.DTOs;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public class ProfileService : IProfileService
    {
        private readonly IWorkBridgeContext _context;
        private readonly string _cvUploadsRoot;
        private readonly IReadOnlyList<string> _cvUploadCandidateRoots;

        public ProfileService(IWorkBridgeContext context, IHostEnvironment hostEnvironment)
        {
            _context = context;
            _cvUploadsRoot = UploadStorage.ResolveCvUploadsRoot(hostEnvironment.ContentRootPath);
            _cvUploadCandidateRoots = UploadStorage.GetCandidateCvUploadRoots(hostEnvironment.ContentRootPath);
        }

        public async Task<ApplicantProfileResponse?> GetApplicantProfileAsync(int userId)
        {
            var user = await _context.Users
                .Include(u => u.ApplicantProfile)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null || user.IsDeleted) return null;

            return new ApplicantProfileResponse
            {
                UserId = user.UserId,
                Email = user.Email,
                FullName = user.FullName,
                AvatarUrl = user.AvatarUrl,
                CreatedAt = user.CreatedAt,
                University = user.ApplicantProfile?.University,
                Major = user.ApplicantProfile?.Major,
                StudyYear = user.ApplicantProfile?.StudyYear,
                Phone = user.ApplicantProfile?.Phone,
                Address = user.ApplicantProfile?.Address,
                AboutMe = user.ApplicantProfile?.AboutMe,
                Availability = user.ApplicantProfile?.Availability,
                CvUrl = user.ApplicantProfile?.CvUrl,
                ReputationScore = user.ApplicantProfile?.ReputationScore ?? 100,
                ReportCount = user.ApplicantProfile?.ReportCount ?? 0
            };
        }

        public async Task<string?> UploadCvAsync(int userId, Microsoft.AspNetCore.Http.IFormFile file)
        {
            var user = await _context.Users
                .Include(u => u.ApplicantProfile)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null || user.IsDeleted) return null;

            if (user.ApplicantProfile == null)
            {
                user.ApplicantProfile = new ApplicantProfile { ApplicantId = userId };
            }

            // Store runtime uploads outside the deployed package on App Service.
            var uploadsFolder = _cvUploadsRoot;
            if (!System.IO.Directory.Exists(uploadsFolder))
            {
                System.IO.Directory.CreateDirectory(uploadsFolder);
            }

            // Generate unique filename
            var fileName = $"CV_{userId}_{System.Guid.NewGuid()}{System.IO.Path.GetExtension(file.FileName)}";
            var filePath = System.IO.Path.Combine(uploadsFolder, fileName);

            // Save file
            using (var stream = new System.IO.FileStream(filePath, System.IO.FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Update DB
            var relativeUrl = $"/uploads/cvs/{fileName}";
            user.ApplicantProfile.CvUrl = relativeUrl;
            await _context.SaveChangesAsync();

            return relativeUrl;
        }

        public async Task<bool> DeleteCvAsync(int userId)
        {
            var user = await _context.Users
                .Include(u => u.ApplicantProfile)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null || user.IsDeleted) return false;

            if (user.ApplicantProfile == null)
            {
                user.ApplicantProfile = new ApplicantProfile { ApplicantId = userId };
            }

            var currentCvUrl = user.ApplicantProfile.CvUrl;
            user.ApplicantProfile.CvUrl = null;
            await _context.SaveChangesAsync();

            TryDeleteUploadedCvFile(currentCvUrl);
            return true;
        }

        private void TryDeleteUploadedCvFile(string? cvUrl)
        {
            if (string.IsNullOrWhiteSpace(cvUrl)) return;

            try
            {
                var cleanUrl = cvUrl.Split('?', '#')[0]
                    .TrimStart('/', '\\')
                    .Replace('/', System.IO.Path.DirectorySeparatorChar)
                    .Replace('\\', System.IO.Path.DirectorySeparatorChar);
                const string uploadsPrefix = "uploads";
                var fileName = cleanUrl;

                var cvsMarker = $"{System.IO.Path.DirectorySeparatorChar}cvs{System.IO.Path.DirectorySeparatorChar}";
                var markerIndex = cleanUrl.IndexOf(cvsMarker, System.StringComparison.OrdinalIgnoreCase);
                if (markerIndex >= 0)
                {
                    fileName = cleanUrl[(markerIndex + cvsMarker.Length)..];
                }
                else if (cleanUrl.StartsWith(uploadsPrefix + System.IO.Path.DirectorySeparatorChar, System.StringComparison.OrdinalIgnoreCase))
                {
                    fileName = System.IO.Path.GetFileName(cleanUrl);
                }

                foreach (var uploadsFolder in _cvUploadCandidateRoots)
                {
                    var fullPath = System.IO.Path.GetFullPath(System.IO.Path.Combine(uploadsFolder, fileName));
                    if (UploadStorage.IsInsideRoot(uploadsFolder, fullPath) && System.IO.File.Exists(fullPath))
                    {
                        System.IO.File.Delete(fullPath);
                    }
                }
            }
            catch
            {
                // DB state is the source of truth; file cleanup should not block the user's action.
            }
        }

        public async Task<string?> SaveGeneratedCvAsync(int userId, SaveGeneratedCvRequest request)
        {
            var user = await _context.Users
                .Include(u => u.ApplicantProfile)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null || user.IsDeleted) return null;

            if (user.ApplicantProfile == null)
            {
                user.ApplicantProfile = new ApplicantProfile { ApplicantId = userId };
            }

            var uploadsFolder = _cvUploadsRoot;
            if (!System.IO.Directory.Exists(uploadsFolder))
            {
                System.IO.Directory.CreateDirectory(uploadsFolder);
            }

            var fileName = $"CV_{userId}_AI_{System.DateTime.UtcNow:yyyyMMddHHmmss}_{System.Guid.NewGuid():N}.pdf";
            var filePath = System.IO.Path.Combine(uploadsFolder, fileName);

            GenerateCvPdf(filePath, request, user.FullName, user.Email);

            var relativeUrl = $"/uploads/cvs/{fileName}";
            user.ApplicantProfile.CvUrl = relativeUrl;
            await _context.SaveChangesAsync();

            return relativeUrl;
        }

        private static void GenerateCvPdf(string filePath, SaveGeneratedCvRequest request, string? fallbackName, string? fallbackEmail)
        {
            QuestPDF.Settings.License = LicenseType.Community;

            var fullName = CleanPdfText(request.FullName) ?? CleanPdfText(fallbackName) ?? "Ứng viên WorkBridge";
            var contactLine = CleanPdfText(request.ContactLine) ?? CleanPdfText(fallbackEmail) ?? "";
            var headline = CleanPdfText(request.Headline);

            Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(38);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(text => text
                        .FontFamily("Arial")
                        .FontSize(10)
                        .LineHeight(1.35f)
                        .FontColor(Colors.BlueGrey.Darken4));

                    page.Content().Column(column =>
                    {
                        column.Spacing(10);

                        column.Item().Row(row =>
                        {
                            row.RelativeItem().Column(header =>
                            {
                                header.Item().Text(fullName)
                                    .FontSize(24)
                                    .Bold()
                                    .FontColor(Colors.BlueGrey.Darken4);

                                if (!string.IsNullOrWhiteSpace(headline))
                                {
                                    header.Item().PaddingTop(4).Text(headline)
                                        .FontSize(12)
                                        .SemiBold()
                                        .FontColor(Colors.Blue.Darken2);
                                }

                                if (!string.IsNullOrWhiteSpace(contactLine))
                                {
                                    header.Item().PaddingTop(5).Text(contactLine)
                                        .FontSize(9)
                                        .FontColor(Colors.BlueGrey.Darken1);
                                }
                            });

                            row.ConstantItem(72)
                                .Height(72)
                                .Background(Colors.Blue.Lighten5)
                                .Border(1)
                                .BorderColor(Colors.Blue.Lighten3)
                                .AlignCenter()
                                .AlignMiddle()
                                .Text("WB")
                                .Bold()
                                .FontSize(20)
                                .FontColor(Colors.Blue.Darken2);
                        });

                        column.Item().PaddingTop(10).LineHorizontal(1).LineColor(Colors.Blue.Lighten3);

                        AddCvSection(column, "Giới thiệu", request.Summary, false);
                        AddCvSection(column, "Kỹ năng", request.Skills, true);
                        AddCvSection(column, "Kinh nghiệm", request.Experience, true);
                        AddCvSection(column, "Học vấn", request.Education, true);
                        AddCvSection(column, "Dự án / Hoạt động", request.Projects, true);
                        AddCvSection(column, "Thành tích", request.Achievements, true);
                        AddCvSection(column, "Thời gian rảnh", request.Availability, false);
                        AddCvSection(column, "Thông tin thêm", request.Additional, false);
                    });

                    page.Footer().AlignCenter().Text(text =>
                    {
                        text.Span("CV được cập nhật bằng WorkBridge AI").FontSize(8).FontColor(Colors.BlueGrey.Lighten1);
                    });
                });
            }).GeneratePdf(filePath);
        }

        private static void AddCvSection(ColumnDescriptor column, string title, string? content, bool preferBullets)
        {
            var lines = SplitPdfLines(content).ToList();
            if (lines.Count == 0) return;

            column.Item().PaddingTop(12).Text(title.ToUpperInvariant())
                .FontSize(9)
                .Bold()
                .FontColor(Colors.Blue.Darken2);

            column.Item().PaddingTop(3).LineHorizontal(0.75f).LineColor(Colors.Blue.Lighten4);

            if (preferBullets && lines.Count > 1)
            {
                foreach (var line in lines)
                {
                    column.Item().PaddingTop(5).Row(row =>
                    {
                        row.ConstantItem(12).Text("•").FontColor(Colors.Blue.Darken2);
                        row.RelativeItem().Text(line).FontSize(9.5f);
                    });
                }
            }
            else
            {
                column.Item().PaddingTop(5).Text(string.Join("\n", lines)).FontSize(9.5f);
            }
        }

        private static IEnumerable<string> SplitPdfLines(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return Enumerable.Empty<string>();
            }

            return value
                .Replace("\r", "\n")
                .Split('\n', StringSplitOptions.RemoveEmptyEntries)
                .Select(line => line.Trim().TrimStart('-', '•', '*').Trim())
                .Where(line => line.Length > 0);
        }

        private static string? CleanPdfText(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            return string.Join(" ", value.Split(' ', StringSplitOptions.RemoveEmptyEntries)).Trim();
        }

        public async Task<bool> UpdateApplicantProfileAsync(int userId, UpdateApplicantProfileRequest request)
        {
            var user = await _context.Users
                .Include(u => u.ApplicantProfile)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null || user.IsDeleted) return false;

            // Update cross-table fields
            user.FullName = request.FullName;
            user.UpdatedAt = System.DateTime.UtcNow;

            if (user.ApplicantProfile == null)
            {
                user.ApplicantProfile = new ApplicantProfile { ApplicantId = userId };
            }

            user.ApplicantProfile.Phone = request.Phone;
            user.ApplicantProfile.Address = request.Address;
            user.ApplicantProfile.AboutMe = request.AboutMe;
            user.ApplicantProfile.University = request.University;
            user.ApplicantProfile.Major = request.Major;
            user.ApplicantProfile.StudyYear = request.StudyYear;
            user.ApplicantProfile.Availability = request.Availability;

            await _context.SaveChangesAsync();
            return true;
        }
    }
}

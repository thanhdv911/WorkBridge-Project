using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using UglyToad.PdfPig;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Interfaces;

namespace WorkBridge.Application.Services
{
    public class CvPdfService : ICvPdfService
    {
        private const int MaxCvPdfPagesToRead = 8;
        private const int MaxCvTextLength = 14000;
        private readonly IWorkBridgeContext _context;
        private readonly string _contentRootPath;
        private readonly string _uploadsRoot;
        private readonly IReadOnlyList<string> _cvUploadRoots;

        public CvPdfService(IWorkBridgeContext context, IHostEnvironment hostEnvironment)
        {
            _context = context;
            _contentRootPath = Path.GetFullPath(hostEnvironment.ContentRootPath);
            _uploadsRoot = UploadStorage.ResolveCvUploadsRoot(_contentRootPath);
            _cvUploadRoots = UploadStorage.GetCandidateCvUploadRoots(_contentRootPath);
        }

        public async Task<CvPdfReadResult> ReadCurrentCvAsync(int userId)
        {
            var cvUrl = await _context.ApplicantProfiles
                .AsNoTracking()
                .Where(p => p.ApplicantId == userId)
                .Select(p => p.CvUrl)
                .FirstOrDefaultAsync();

            return ReadUploadedCvPdf(cvUrl);
        }

        private CvPdfReadResult ReadUploadedCvPdf(string? cvUrl)
        {
            if (string.IsNullOrWhiteSpace(cvUrl))
            {
                return new CvPdfReadResult
                {
                    HasFile = false,
                    Readable = false,
                    Note = "Ứng viên chưa upload CV PDF."
                };
            }

            try
            {
                if (!TryResolveCvPath(cvUrl, out var fullPath, out var error))
                {
                    return new CvPdfReadResult
                    {
                        HasFile = true,
                        Readable = false,
                        Note = error ?? "Đường dẫn CV không hợp lệ."
                    };
                }

                var builder = new StringBuilder();
                using var document = PdfDocument.Open(fullPath);
                var pagesRead = 0;

                foreach (var page in document.GetPages().Take(MaxCvPdfPagesToRead))
                {
                    pagesRead++;
                    builder.AppendLine(page.Text);
                    builder.AppendLine();

                    if (builder.Length >= MaxCvTextLength)
                    {
                        break;
                    }
                }

                var text = CleanCvText(builder.ToString());
                if (text.Length > MaxCvTextLength)
                {
                    text = text[..MaxCvTextLength];
                }

                if (string.IsNullOrWhiteSpace(text))
                {
                    return new CvPdfReadResult
                    {
                        HasFile = true,
                        Readable = false,
                        PagesRead = pagesRead,
                        Note = "PDF có thể là bản scan/ảnh nên chưa đọc được text."
                    };
                }

                return new CvPdfReadResult
                {
                    Text = text,
                    HasFile = true,
                    Readable = true,
                    PagesRead = pagesRead,
                    Note = $"Đã đọc {pagesRead} trang đầu từ CV PDF."
                };
            }
            catch
            {
                return new CvPdfReadResult
                {
                    HasFile = true,
                    Readable = false,
                    Note = "Không thể đọc nội dung PDF."
                };
            }
        }

        private bool TryResolveCvPath(string? cvUrl, out string fullPath, out string? error)
        {
            fullPath = "";
            error = null;

            if (string.IsNullOrWhiteSpace(cvUrl))
            {
                error = "Ứng viên chưa upload CV PDF.";
                return false;
            }

            var uploadsRoot = _uploadsRoot;
            var relativePath = cvUrl.Split('?', '#')[0]
                .TrimStart('/', '\\')
                .Replace('/', Path.DirectorySeparatorChar)
                .Replace('\\', Path.DirectorySeparatorChar);

            var uploadsPrefix = $"uploads{Path.DirectorySeparatorChar}cvs{Path.DirectorySeparatorChar}";
            if (relativePath.StartsWith(uploadsPrefix, StringComparison.OrdinalIgnoreCase))
            {
                var filePart = relativePath[uploadsPrefix.Length..];
                foreach (var root in _cvUploadRoots)
                {
                    var candidatePath = Path.GetFullPath(Path.Combine(root, filePart));
                    if (UploadStorage.IsInsideRoot(root, candidatePath) && File.Exists(candidatePath))
                    {
                        fullPath = candidatePath;
                        return true;
                    }
                }

                fullPath = Path.GetFullPath(Path.Combine(uploadsRoot, filePart));
            }
            else
            {
                fullPath = Path.GetFullPath(Path.Combine(_contentRootPath, relativePath));
            }

            if (!fullPath.StartsWith(uploadsRoot, StringComparison.OrdinalIgnoreCase))
            {
                error = "Đường dẫn CV không hợp lệ.";
                return false;
            }

            if (!File.Exists(fullPath))
            {
                error = "Không tìm thấy file CV trên máy chủ.";
                return false;
            }

            return true;
        }

        private static string CleanCvText(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return "";
            }

            var normalizedLines = value
                .Replace("\r", "\n")
                .Split('\n', StringSplitOptions.RemoveEmptyEntries)
                .Select(line => string.Join(" ", line.Split(' ', StringSplitOptions.RemoveEmptyEntries)).Trim())
                .Where(line => line.Length > 0);

            return string.Join("\n", normalizedLines);
        }
    }
}

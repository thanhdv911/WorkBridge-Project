using System;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Interfaces;

namespace WorkBridge.Application.Services
{
    public class CvAiService : ICvAiService
    {
        private readonly IWorkBridgeContext _context;
        private readonly ICvPdfService _cvPdfService;
        private readonly IGeminiService _aiService;

        public CvAiService(IWorkBridgeContext context, ICvPdfService cvPdfService, IGeminiService aiService)
        {
            _context = context;
            _cvPdfService = cvPdfService;
            _aiService = aiService;
        }

        public async Task<string> AnalyzeCvJsonAsync(int userId)
        {
            var user = await _context.Users
                .Include(u => u.ApplicantProfile)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == userId && !u.IsDeleted);

            if (user == null)
            {
                throw new InvalidOperationException("Khong tim thay ho so ung vien.");
            }

            var cvPdf = await _cvPdfService.ReadCurrentCvAsync(userId);
            if (!cvPdf.HasFile)
            {
                throw new InvalidOperationException("Ban can upload CV PDF truoc khi dung AI danh gia CV.");
            }

            if (!cvPdf.Readable || string.IsNullOrWhiteSpace(cvPdf.Text))
            {
                return JsonSerializer.Serialize(new
                {
                    score = 0,
                    readable = false,
                    pdfNote = cvPdf.Note,
                    summary = "WorkBridge chưa đọc được text trong file PDF này. AI cần PDF có text để chấm CV chính xác.",
                    strengths = Array.Empty<string>(),
                    issues = new[] { "PDF có thể là file scan/ảnh nên AI không trích xuất được nội dung." },
                    suggestions = new[] { "Upload bản PDF có text, hoặc copy nội dung CV vào file PDF mới trước khi chấm lại." },
                    detectedContent = Array.Empty<string>(),
                    missingInformation = new[] { "Nội dung CV đang không đọc được bằng text." }
                });
            }

            var userMessage = $"""
Thong tin nguoi dung:
- Ho ten tai khoan: {user.FullName}
- Email: {user.Email}

Trang thai doc PDF:
- readable: {cvPdf.Readable}
- pdfNote: {cvPdf.Note}
- pagesRead: {cvPdf.PagesRead}

Noi dung CV PDF trich xuat duoc:
<<<CV_PDF_TEXT
{cvPdf.Text}
CV_PDF_TEXT
>>>
""";

            var jsonResult = await _aiService.SendPromptAsync(CvAnalysisPrompt(), userMessage, "application/json");
            return NormalizeAnalysisJson(jsonResult, cvPdf);
        }

        public async Task<string> ChatAsync(int userId, CvChatRequestDto request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Message))
            {
                throw new InvalidOperationException("Tin nhan khong duoc de trong.");
            }

            var user = await _context.Users
                .Include(u => u.ApplicantProfile)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == userId && !u.IsDeleted);

            if (user == null)
            {
                throw new InvalidOperationException("Khong tim thay ho so ung vien.");
            }

            var cvPdf = await _cvPdfService.ReadCurrentCvAsync(userId);
            if (!cvPdf.HasFile)
            {
                throw new InvalidOperationException("Ban can upload CV PDF truoc khi chat voi AI CV.");
            }

            var history = (request.History ?? new())
                .TakeLast(8)
                .Select(item => $"{item.Role}: {item.Content}")
                .ToList();

            var userMessage = $"""
Ngu canh bat buoc:
- Ho ten tai khoan: {user.FullName}
- Email: {user.Email}
- Trang thai doc PDF: {cvPdf.Note}

Noi dung CV PDF:
<<<CV_PDF_TEXT
{(string.IsNullOrWhiteSpace(cvPdf.Text) ? "PDF khong doc duoc text. Hay noi ro can upload PDF co text neu can cham noi dung." : cvPdf.Text)}
CV_PDF_TEXT
>>>

Lich su chat gan day:
{(history.Count > 0 ? string.Join("\n", history) : "Chua co.")}

Cau hoi moi cua nguoi dung:
{request.Message.Trim()}
""";

            return await _aiService.SendPromptAsync(CvChatPrompt(), userMessage);
        }

        private static string CvAnalysisPrompt()
        {
            return """
Bạn là WorkBridge AI CV Coach, chuyên đọc và chấm CV PDF cho ứng viên bán thời gian.

Nhiệm vụ:
- Chỉ đánh giá dựa trên nội dung CV PDF đã trích xuất được. Không dùng profile/bio bên ngoài để lập điểm thay cho CV.
- Chấm điểm CV từ 1 đến 10 dựa trên độ rõ ràng, bố cục, kinh nghiệm, kỹ năng, học vấn, mức phù hợp với việc bán thời gian và khả năng nhà tuyển dụng đọc nhanh.
- Nếu thiếu dữ liệu quan trọng, nêu rõ trong missingInformation và gợi ý người dùng bổ sung.
- Không bịa kinh nghiệm, kỹ năng, bằng cấp, thành tích, công ty, số liệu hoặc thời gian không có trong CV.
- Chỉ đưa ra nhận xét và gợi ý cải thiện bằng chữ. Không tạo thao tác chỉnh/sửa file PDF.
- Không trả về improvedBio, editableCv, sectionEdits hoặc suggestedEdits.
- Tất cả nội dung chuỗi trong JSON phải là tiếng Việt có dấu đầy đủ, tự nhiên, không viết không dấu.

Bắt buộc trả về JSON hợp lệ, không markdown, không giải thích ngoài JSON:
{
  "score": 8,
  "readable": true,
  "pdfNote": "Đã đọc 2 trang đầu từ CV PDF.",
  "summary": "Nhận xét ngắn về CV",
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "issues": ["Vấn đề cần sửa 1", "Vấn đề cần sửa 2"],
  "suggestions": ["Gợi ý cụ thể 1", "Gợi ý cụ thể 2"],
  "detectedContent": ["CV hiện có thông tin 1", "CV hiện có thông tin 2"],
  "missingInformation": ["Thông tin nên bổ sung 1"]
}
""";
        }

        private static string CvChatPrompt()
        {
            return """
Bạn là WorkBridge AI CV Coach, chỉ đánh giá CV PDF đã upload.

Nguyên tắc:
- Chỉ dựa trên nội dung CV PDF và thông tin mới người dùng vừa cung cấp trong chat.
- Nếu PDF không đọc được text, nói ngắn gọn rằng cần upload PDF có text để AI chấm nội dung chính xác.
- Nếu người dùng hỏi CV thiếu gì, chỉ ra phần còn thiếu và hỏi lại một câu hỏi quan trọng nhất.
- Nếu người dùng yêu cầu sửa hộ hoặc viết lại thay, hãy đưa ra tiêu chí/gợi ý cải thiện thay vì viết thay toàn bộ nội dung.
- Không bịa kinh nghiệm, kỹ năng, chứng chỉ, công ty, số liệu hoặc thành tích chưa được cung cấp.
- Trả lời bằng tiếng Việt có dấu đầy đủ, ngắn và dễ đọc. Tuyệt đối không viết tiếng Việt không dấu.
""";
        }

        private static string NormalizeAnalysisJson(string jsonResult, CvPdfReadResult cvPdf)
        {
            try
            {
                var node = JsonNode.Parse(jsonResult)?.AsObject();
                if (node == null)
                {
                    return jsonResult;
                }

                node.Remove("improvedBio");
                node.Remove("editableCv");
                node.Remove("sectionEdits");
                node.Remove("suggestedEdits");
                node["readable"] = cvPdf.Readable;
                node["pdfNote"] = cvPdf.Note;

                return node.ToJsonString(new JsonSerializerOptions { WriteIndented = false });
            }
            catch
            {
                return jsonResult;
            }
        }
    }
}

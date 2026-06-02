using System.Collections.Generic;

namespace WorkBridge.Application.DTOs
{
    public class CvPdfReadResult
    {
        public string Text { get; set; } = "";
        public bool HasFile { get; set; }
        public bool Readable { get; set; }
        public string Note { get; set; } = "";
        public int PagesRead { get; set; }
    }

    public class CvChatRequestDto
    {
        public string Message { get; set; } = "";
        public List<CvChatMessageDto> History { get; set; } = new();
    }

    public class CvChatMessageDto
    {
        public string Role { get; set; } = "";
        public string Content { get; set; } = "";
    }

}

using System.Threading.Tasks;
using WorkBridge.Application.DTOs;

namespace WorkBridge.Application.Services
{
    public interface ICvAiService
    {
        Task<string> AnalyzeCvJsonAsync(int userId);
        Task<string> ChatAsync(int userId, CvChatRequestDto request);
    }
}

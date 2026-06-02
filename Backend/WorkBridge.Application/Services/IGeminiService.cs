using System.Threading.Tasks;

namespace WorkBridge.Application.Services
{
    public interface IGeminiService
    {
        Task<string> SendPromptAsync(string systemPrompt, string userMessage, string? responseMimeType = null);
    }
}

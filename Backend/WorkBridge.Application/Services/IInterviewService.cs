using WorkBridge.Application.DTOs;

namespace WorkBridge.Application.Services
{
    public interface IInterviewService
    {
        Task<(InterviewResponse? Interview, string? Error)> CreateInterviewAsync(int employerId, CreateInterviewRequest request);
        Task<IEnumerable<InterviewChatApplicationResponse>> GetChatContextAsync(int employerId, int contactId);
        Task<(InterviewResponse? Interview, string? Error)> CreateChatInterviewAsync(int employerId, CreateChatInterviewRequest request);
        Task<IEnumerable<InterviewResponse>> GetEmployerInterviewsAsync(int employerId);
        Task<IEnumerable<InterviewResponse>> GetMyInterviewsAsync(int applicantId);
        Task<(InterviewResponse? Interview, string? Error)> UpdateStatusAsync(int userId, string role, int interviewId, UpdateInterviewStatusRequest request);
        Task<(InterviewResponse? Interview, string? Error)> UpdateResultAsync(int employerId, int interviewId, UpdateInterviewResultRequest request);
    }
}

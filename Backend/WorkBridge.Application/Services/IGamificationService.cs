using System.Threading.Tasks;
using WorkBridge.Application.DTOs;

namespace WorkBridge.Application.Services
{
    public interface IGamificationService
    {
        Task<bool> EndorseSkillsAsync(int employerId, EndorseSkillRequest request);
        Task<PracticalCvResponse?> GetPracticalCvAsync(int applicantId);
        Task TriggerBadgeEvaluationAsync(int applicantId);
    }
}

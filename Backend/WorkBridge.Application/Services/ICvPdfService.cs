using System.Threading.Tasks;
using WorkBridge.Application.DTOs;

namespace WorkBridge.Application.Services
{
    public interface ICvPdfService
    {
        Task<CvPdfReadResult> ReadCurrentCvAsync(int userId);
    }
}

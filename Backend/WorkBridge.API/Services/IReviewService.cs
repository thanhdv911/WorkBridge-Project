using System.Collections.Generic;
using System.Threading.Tasks;
using WorkBridge.API.DTOs;

namespace WorkBridge.API.Services
{
    public interface IReviewService
    {
        Task<string?> CreateReviewAsync(int reviewerId, CreateReviewRequest request);
        Task<IEnumerable<ReviewResponse>> GetReviewsForUserAsync(int userId);
        Task<UserRatingStats> GetUserRatingStatsAsync(int userId);
    }
}

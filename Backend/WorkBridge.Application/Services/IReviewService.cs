using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using WorkBridge.Application.Interfaces;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkBridge.Application.DTOs;

namespace WorkBridge.Application.Services
{
    public interface IReviewService
    {
        Task<string?> CreateReviewAsync(int reviewerId, CreateReviewRequest request);
        Task<IEnumerable<ReviewResponse>> GetReviewsForUserAsync(int userId);
        Task<UserRatingStats> GetUserRatingStatsAsync(int userId);
    }
}

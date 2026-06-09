using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using WorkBridge.Application.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkBridge.Application.DTOs;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public class ReviewService : IReviewService
    {
        private readonly IWorkBridgeContext _context;
        private readonly INotificationService _notificationService;

        public ReviewService(IWorkBridgeContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<string?> CreateReviewAsync(int reviewerId, CreateReviewRequest request)
        {
            // Verify if a review already exists for this job context by this reviewer for this reviewee
            var existingReview = await _context.Reviews
                .FirstOrDefaultAsync(r => r.ReviewerId == reviewerId 
                                     && r.RevieweeId == request.RevieweeId 
                                     && r.JobPostId == request.JobPostId 
                                     && !r.IsDeleted);

            if (existingReview != null) return "Bạn đã đánh giá người này cho công việc này rồi.";

            // Verify if the JobPost exists
            var job = await _context.JobPosts.FindAsync(request.JobPostId);
            if (job == null) return "Không tìm thấy tin tuyển dụng.";

            var review = new Review
            {
                ReviewerId = reviewerId,
                RevieweeId = request.RevieweeId,
                JobPostId = request.JobPostId,
                Rating = request.Rating,
                Comment = request.Comment,
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false
            };

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            // Notify the reviewee
            var reviewer = await _context.Users.FindAsync(reviewerId);
            await _notificationService.CreateNotificationAsync(
                request.RevieweeId,
                "Bạn có đánh giá mới",
                $"{reviewer?.FullName ?? "Một người dùng"} đã đánh giá bạn {request.Rating} sao cho công việc: {job.Title}"
            );

            return null; // Success
        }

        public async Task<IEnumerable<ReviewResponse>> GetReviewsForUserAsync(int userId)
        {
            return await _context.Reviews
                .Include(r => r.Reviewer)
                .Include(r => r.JobPost)
                .Where(r => r.RevieweeId == userId && !r.IsDeleted)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new ReviewResponse
                {
                    ReviewId = r.ReviewId,
                    ReviewerId = r.ReviewerId,
                    ReviewerName = r.Reviewer.FullName,
                    RevieweeId = r.RevieweeId,
                    JobPostId = r.JobPostId,
                    JobTitle = r.JobPost.Title,
                    Rating = r.Rating,
                    Comment = r.Comment,
                    CreatedAt = r.CreatedAt.GetValueOrDefault()
                })
                .ToListAsync();
        }

        public async Task<UserRatingStats> GetUserRatingStatsAsync(int userId)
        {
            var reviews = await _context.Reviews
                .Where(r => r.RevieweeId == userId && !r.IsDeleted)
                .ToListAsync();

            if (!reviews.Any()) return new UserRatingStats { AverageRating = 0, TotalReviews = 0 };

            return new UserRatingStats
            {
                AverageRating = Math.Round(reviews.Average(r => r.Rating), 1),
                TotalReviews = reviews.Count
            };
        }
    }
}

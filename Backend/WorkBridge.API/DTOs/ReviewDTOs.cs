using System;

namespace WorkBridge.API.DTOs
{
    public class CreateReviewRequest
    {
        public int RevieweeId { get; set; }
        public int JobPostId { get; set; }
        public int Rating { get; set; } // 1-5
        public string? Comment { get; set; }
    }

    public class ReviewResponse
    {
        public int ReviewId { get; set; }
        public int ReviewerId { get; set; }
        public string ReviewerName { get; set; } = null!;
        public int RevieweeId { get; set; }
        public int JobPostId { get; set; }
        public string JobTitle { get; set; } = null!;
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class UserRatingStats
    {
        public double AverageRating { get; set; }
        public int TotalReviews { get; set; }
    }
}

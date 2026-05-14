using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Interfaces;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public class GamificationService : IGamificationService
    {
        private readonly IWorkBridgeContext _context;
        private readonly INotificationService _notificationService;

        public GamificationService(IWorkBridgeContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<bool> EndorseSkillsAsync(int employerId, EndorseSkillRequest request)
        {
            var hasWorked = await _context.EContracts
                .AnyAsync(c => c.EmployerId == employerId && c.ApplicantId == request.ApplicantId && c.Status == "Signed");

            if (!hasWorked) return false;

            var existingSkills = await _context.ApplicantSkills
                .Where(s => s.ApplicantId == request.ApplicantId)
                .ToListAsync();

            foreach (var skillName in request.Skills)
            {
                var skill = existingSkills.FirstOrDefault(s => s.SkillName.ToLower() == skillName.ToLower());
                if (skill != null)
                {
                    skill.EndorsementCount++;
                }
                else
                {
                    _context.ApplicantSkills.Add(new ApplicantSkill
                    {
                        ApplicantId = request.ApplicantId,
                        SkillName = skillName,
                        EndorsementCount = 1
                    });
                }
            }

            await _context.SaveChangesAsync();
            
            await TriggerBadgeEvaluationAsync(request.ApplicantId);

            return true;
        }

        public async Task<PracticalCvResponse?> GetPracticalCvAsync(int applicantId)
        {
            var profile = await _context.ApplicantProfiles
                .Include(p => p.Applicant)
                .Include(p => p.ApplicantSkills)
                .Include(p => p.ApplicantBadges)
                .FirstOrDefaultAsync(p => p.ApplicantId == applicantId);

            if (profile == null) return null;

            var attendances = await _context.Attendances
                .Include(a => a.Schedule).ThenInclude(s => s.JobPost).ThenInclude(j => j.Employer)
                .Where(a => a.Schedule.ApplicantId == applicantId && a.CheckOutTime != null)
                .ToListAsync();

            var totalMinutes = attendances.Sum(a => (a.CheckOutTime!.Value - a.CheckInTime).TotalMinutes);
            var totalHours = (int)(totalMinutes / 60);

            var reviews = await _context.Reviews
                .Where(r => r.RevieweeId == applicantId)
                .ToListAsync();
            
            var averageRating = reviews.Any() ? Math.Round(reviews.Average(r => r.Rating), 1) : 0;
            var completedJobsCount = await _context.EContracts.CountAsync(c => c.ApplicantId == applicantId && c.Status == "Signed");

            var groupedExperiences = attendances
                .GroupBy(a => new { a.Schedule.JobPost.Title, a.Schedule.JobPost.Employer.CompanyName })
                .Select(g => new ExperienceDto
                {
                    JobTitle = g.Key.Title,
                    CompanyName = g.Key.CompanyName,
                    TotalHours = (int)(g.Sum(a => (a.CheckOutTime!.Value - a.CheckInTime).TotalMinutes) / 60)
                }).ToList();

            return new PracticalCvResponse
            {
                ApplicantId = applicantId,
                FullName = profile.Applicant.FullName,
                Major = profile.Major ?? string.Empty,
                University = profile.University ?? string.Empty,
                TotalJobsCompleted = completedJobsCount,
                TotalHoursWorked = totalHours,
                AverageRating = averageRating,
                TopSkills = profile.ApplicantSkills.OrderByDescending(s => s.EndorsementCount)
                    .Select(s => new SkillDto { SkillName = s.SkillName, EndorsementCount = s.EndorsementCount }).ToList(),
                EarnedBadges = profile.ApplicantBadges.OrderByDescending(b => b.EarnedAt)
                    .Select(b => new BadgeDto { 
                        BadgeId = b.BadgeId, 
                        BadgeName = b.BadgeName, 
                        IconClass = b.IconClass,
                        Description = b.Description,
                        EarnedAt = b.EarnedAt
                    }).ToList(),
                Experiences = groupedExperiences
            };
        }

        public async Task TriggerBadgeEvaluationAsync(int applicantId)
        {
            var profile = await _context.ApplicantProfiles
                .Include(p => p.ApplicantBadges)
                .Include(p => p.ApplicantSkills)
                .FirstOrDefaultAsync(p => p.ApplicantId == applicantId);

            if (profile == null) return;

            var existingBadges = profile.ApplicantBadges.Select(b => b.BadgeName).ToHashSet();
            bool newBadgeEarned = false;

            if (!existingBadges.Contains("Uy Tín (5-Star Worker)"))
            {
                var fiveStarCount = await _context.Reviews.CountAsync(r => r.RevieweeId == applicantId && r.Rating == 5);
                if (fiveStarCount >= 3)
                {
                    _context.ApplicantBadges.Add(new ApplicantBadge
                    {
                        ApplicantId = applicantId,
                        BadgeName = "Uy Tín (5-Star Worker)",
                        IconClass = "workspace_premium",
                        Description = "Received three 5-star reviews from employers.",
                        EarnedAt = DateTime.UtcNow
                    });
                    newBadgeEarned = true;
                    await _notificationService.CreateNotificationAsync(applicantId, "New Badge Earned! 🏆", "Congratulations! You earned the 'Uy Tín (5-Star Worker)' badge.");
                }
            }

            if (!existingBadges.Contains("Thánh Đúng Giờ (Punctual)"))
            {
                var onTimeCount = await _context.Attendances
                    .Include(a => a.Schedule)
                    .CountAsync(a => a.Schedule.ApplicantId == applicantId && a.CheckInTime.TimeOfDay <= a.Schedule.StartTime);
                
                if (onTimeCount >= 5) 
                {
                    _context.ApplicantBadges.Add(new ApplicantBadge
                    {
                        ApplicantId = applicantId,
                        BadgeName = "Thánh Đúng Giờ (Punctual)",
                        IconClass = "alarm_on",
                        Description = "Checked in on time for 5 consecutive shifts.",
                        EarnedAt = DateTime.UtcNow
                    });
                    newBadgeEarned = true;
                    await _notificationService.CreateNotificationAsync(applicantId, "New Badge Earned! ⏰", "Congratulations! You earned the 'Thánh Đúng Giờ (Punctual)' badge.");
                }
            }

            if (!existingBadges.Contains("Bậc Thầy Giao Tiếp (Communicator)"))
            {
                var commSkill = profile.ApplicantSkills.FirstOrDefault(s => s.SkillName.Contains("Giao tiếp") || s.SkillName.Contains("Communication"));
                if (commSkill != null && commSkill.EndorsementCount >= 5)
                {
                    _context.ApplicantBadges.Add(new ApplicantBadge
                    {
                        ApplicantId = applicantId,
                        BadgeName = "Bậc Thầy Giao Tiếp (Communicator)",
                        IconClass = "record_voice_over",
                        Description = "Endorsed 5 times for communication skills.",
                        EarnedAt = DateTime.UtcNow
                    });
                    newBadgeEarned = true;
                    await _notificationService.CreateNotificationAsync(applicantId, "New Badge Earned! 🗣️", "Congratulations! You earned the 'Bậc Thầy Giao Tiếp' badge.");
                }
            }

            if (newBadgeEarned)
            {
                await _context.SaveChangesAsync();
            }
        }
    }
}

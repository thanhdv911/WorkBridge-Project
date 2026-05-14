using Microsoft.EntityFrameworkCore;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Interfaces
{
    public interface IWorkBridgeContext
    {
        DbSet<ApplicantExperience> ApplicantExperiences { get; set; }
        DbSet<ApplicantProfile> ApplicantProfiles { get; set; }
        DbSet<ApplicantSkill> ApplicantSkills { get; set; }
        DbSet<JobApplication> Applications { get; set; }
        DbSet<EmployerProfile> EmployerProfiles { get; set; }
        DbSet<JobCategory> JobCategories { get; set; }
        DbSet<JobPost> JobPosts { get; set; }
        DbSet<JobShift> JobShifts { get; set; }
        DbSet<Message> Messages { get; set; }
        DbSet<Notification> Notifications { get; set; }
        DbSet<Report> Reports { get; set; }
        DbSet<Review> Reviews { get; set; }
        DbSet<Role> Roles { get; set; }
        DbSet<SavedJob> SavedJobs { get; set; }
        DbSet<Subscription> Subscriptions { get; set; }
        DbSet<User> Users { get; set; }
        DbSet<ApplicationHistory> ApplicationHistories { get; set; }
        DbSet<WorkSchedule> WorkSchedules { get; set; }
        DbSet<Attendance> Attendances { get; set; }
        DbSet<ShiftSwapRequest> ShiftSwapRequests { get; set; }
        DbSet<EContract> EContracts { get; set; }
        DbSet<Dispute> Disputes { get; set; }
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}

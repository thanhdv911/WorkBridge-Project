using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Interfaces
{
    public interface IWorkBridgeContext
    {
        DatabaseFacade Database { get; }
        DbSet<ApplicantExperience> ApplicantExperiences { get; set; }
        DbSet<ApplicantProfile> ApplicantProfiles { get; set; }
        DbSet<ApplicantSkill> ApplicantSkills { get; set; }
        DbSet<AttendanceRecord> AttendanceRecords { get; set; }
        DbSet<Branch> Branches { get; set; }
        DbSet<EmployeeRate> EmployeeRates { get; set; }
        DbSet<Employment> Employments { get; set; }
        DbSet<EmailVerificationRequest> EmailVerificationRequests { get; set; }
        DbSet<JobApplication> Applications { get; set; }
        DbSet<EmployerProfile> EmployerProfiles { get; set; }
        DbSet<JobCategory> JobCategories { get; set; }
        DbSet<JobPost> JobPosts { get; set; }
        DbSet<JobShift> JobShifts { get; set; }
        DbSet<Interview> Interviews { get; set; }
        DbSet<Message> Messages { get; set; }
        DbSet<Notification> Notifications { get; set; }
        DbSet<Offer> Offers { get; set; }
        DbSet<PayrollItem> PayrollItems { get; set; }
        DbSet<PayrollPeriod> PayrollPeriods { get; set; }
        DbSet<PasswordResetToken> PasswordResetTokens { get; set; }
        DbSet<PlatformMaintenanceSetting> PlatformMaintenanceSettings { get; set; }
        DbSet<Report> Reports { get; set; }
        DbSet<Review> Reviews { get; set; }
        DbSet<Role> Roles { get; set; }
        DbSet<SavedJob> SavedJobs { get; set; }
        DbSet<ShiftAssignment> ShiftAssignments { get; set; }
        DbSet<ShiftPassRequest> ShiftPassRequests { get; set; }
        DbSet<ShiftRegistrationWindow> ShiftRegistrationWindows { get; set; }
        DbSet<Subscription> Subscriptions { get; set; }
        DbSet<SubscriptionPlan> SubscriptionPlans { get; set; }
        DbSet<User> Users { get; set; }
        DbSet<WorkShift> WorkShifts { get; set; }
        DbSet<EmployerShiftTiming> EmployerShiftTimings { get; set; }

        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}

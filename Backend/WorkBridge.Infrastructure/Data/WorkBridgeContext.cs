using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using WorkBridge.Domain.Entities;

using WorkBridge.Application.Interfaces;

namespace WorkBridge.Infrastructure.Data;

public partial class WorkBridgeContext : DbContext, IWorkBridgeContext
{
    public WorkBridgeContext()
    {
    }

    public WorkBridgeContext(DbContextOptions<WorkBridgeContext> options)
        : base(options)
    {
    }

    public virtual DbSet<ApplicantExperience> ApplicantExperiences { get; set; }

    public virtual DbSet<ApplicantProfile> ApplicantProfiles { get; set; }

    public virtual DbSet<ApplicantSkill> ApplicantSkills { get; set; }

    public virtual DbSet<AttendanceRecord> AttendanceRecords { get; set; }

    public virtual DbSet<Branch> Branches { get; set; }

    public virtual DbSet<EmployeeRate> EmployeeRates { get; set; }

    public virtual DbSet<Employment> Employments { get; set; }

    public virtual DbSet<JobApplication> Applications { get; set; }

    public virtual DbSet<EmployerProfile> EmployerProfiles { get; set; }

    public virtual DbSet<JobCategory> JobCategories { get; set; }

    public virtual DbSet<JobPost> JobPosts { get; set; }

    public virtual DbSet<JobShift> JobShifts { get; set; }

    public virtual DbSet<Interview> Interviews { get; set; }

    public virtual DbSet<Message> Messages { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<Offer> Offers { get; set; }

    public virtual DbSet<PayrollItem> PayrollItems { get; set; }

    public virtual DbSet<PayrollPeriod> PayrollPeriods { get; set; }

    public virtual DbSet<PasswordResetToken> PasswordResetTokens { get; set; }

    public virtual DbSet<Report> Reports { get; set; }

    public virtual DbSet<Review> Reviews { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<SavedJob> SavedJobs { get; set; }

    public virtual DbSet<ShiftAssignment> ShiftAssignments { get; set; }

    public virtual DbSet<ShiftPassRequest> ShiftPassRequests { get; set; }

    public virtual DbSet<ShiftRegistrationWindow> ShiftRegistrationWindows { get; set; }

    public virtual DbSet<Subscription> Subscriptions { get; set; }

    public virtual DbSet<SubscriptionPlan> SubscriptionPlans { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<WorkShift> WorkShifts { get; set; }

    public virtual DbSet<EmployerShiftTiming> EmployerShiftTimings { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
                ?? "Server=.;Database=WorkBridgeDB;Trusted_Connection=True;Encrypt=False;TrustServerCertificate=True";

            optionsBuilder.UseSqlServer(connectionString);
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ApplicantExperience>(entity =>
        {
            entity.HasKey(e => e.ExperienceId).HasName("PK__Applican__2F4E34496C276AD8");

            entity.Property(e => e.CompanyName).HasMaxLength(150);
            entity.Property(e => e.Duration).HasMaxLength(100);
            entity.Property(e => e.Title).HasMaxLength(150);

            entity.HasOne(d => d.Applicant).WithMany(p => p.ApplicantExperiences)
                .HasForeignKey(d => d.ApplicantId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Applicant__Appli__440B1D61");
        });

        modelBuilder.Entity<ApplicantProfile>(entity =>
        {
            entity.HasKey(e => e.ApplicantId).HasName("PK__Applican__39AE91A8EAA77268");

            entity.Property(e => e.ApplicantId).ValueGeneratedNever();
            entity.Property(e => e.Address).HasMaxLength(255);
            entity.Property(e => e.Major).HasMaxLength(150);
            entity.Property(e => e.Phone).HasMaxLength(20);
            entity.Property(e => e.StudyYear).HasMaxLength(50);
            entity.Property(e => e.University).HasMaxLength(255);
            entity.Property(e => e.CvUrl).IsUnicode(true);

            entity.HasOne(d => d.Applicant).WithOne(p => p.ApplicantProfile)
                .HasForeignKey<ApplicantProfile>(d => d.ApplicantId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Applicant__Appli__412EB0B6");
        });

        modelBuilder.Entity<ApplicantSkill>(entity =>
        {
            entity.HasKey(e => e.SkillId).HasName("PK__Applican__DFA0918790064E45");

            entity.Property(e => e.SkillName).HasMaxLength(100);

            entity.HasOne(d => d.Applicant).WithMany(p => p.ApplicantSkills)
                .HasForeignKey(d => d.ApplicantId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Applicant__Appli__46E78A0C");
        });

        modelBuilder.Entity<AttendanceRecord>(entity =>
        {
            entity.HasKey(e => e.AttendanceRecordId);
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("NotStarted");
            entity.Property(e => e.CheckInAt).HasColumnType("datetime");
            entity.Property(e => e.CheckOutAt).HasColumnType("datetime");
            entity.Property(e => e.ApprovedAt).HasColumnType("datetime");
            entity.Property(e => e.WorkedMinutes).HasDefaultValue(0);
            entity.HasOne<ShiftAssignment>()
                .WithMany()
                .HasForeignKey(e => e.ShiftAssignmentId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(e => e.EmployeeUserId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Branch>(entity =>
        {
            entity.HasKey(e => e.BranchId);
            entity.Property(e => e.Name).HasMaxLength(150);
            entity.Property(e => e.Address).HasMaxLength(255);
            entity.Property(e => e.Phone).HasMaxLength(20);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.HasOne<EmployerProfile>()
                .WithMany()
                .HasForeignKey(e => e.EmployerId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<EmployeeRate>(entity =>
        {
            entity.HasKey(e => e.EmployeeRateId);
            entity.Property(e => e.HourlyRate).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.EffectiveFrom).HasColumnType("datetime");
            entity.Property(e => e.EffectiveTo).HasColumnType("datetime");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.HasOne<Employment>()
                .WithMany()
                .HasForeignKey(e => e.EmploymentId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Employment>(entity =>
        {
            entity.HasKey(e => e.EmploymentId);
            entity.Property(e => e.Position).HasMaxLength(150);
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("Active");
            entity.Property(e => e.ExpectedShifts).HasMaxLength(100);
            entity.Property(e => e.StartDate).HasColumnType("datetime");
            entity.Property(e => e.EndDate).HasColumnType("datetime");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.HasOne<EmployerProfile>()
                .WithMany()
                .HasForeignKey(e => e.EmployerId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(e => e.EmployeeUserId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<Branch>()
                .WithMany()
                .HasForeignKey(e => e.BranchId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<Offer>()
                .WithMany()
                .HasForeignKey(e => e.OfferId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<JobApplication>(entity =>
        {
            entity.HasKey(e => e.ApplicationId).HasName("PK__Applicat__C93A4C99EAD2D717");

            entity.Property(e => e.AppliedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.RespondedAt).HasColumnType("datetime");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Applied");

            entity.HasOne(d => d.Applicant).WithMany(p => p.Applications)
                .HasForeignKey(d => d.ApplicantId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Applicati__Appli__619B8048");

            entity.HasOne(d => d.JobPost).WithMany(p => p.Applications)
                .HasForeignKey(d => d.JobPostId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Applicati__JobPo__60A75C0F");
        });

        modelBuilder.Entity<EmployerProfile>(entity =>
        {
            entity.HasKey(e => e.EmployerId).HasName("PK__Employer__CA44526143C6B38D");

            entity.Property(e => e.EmployerId).ValueGeneratedNever();
            entity.Property(e => e.Address).HasMaxLength(255);
            entity.Property(e => e.CompanyName).HasMaxLength(255);
            entity.Property(e => e.ContactEmail).HasMaxLength(255);
            entity.Property(e => e.ContactPhone).HasMaxLength(20);
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("Active");

            entity.HasOne(d => d.Employer).WithOne(p => p.EmployerProfile)
                .HasForeignKey<EmployerProfile>(d => d.EmployerId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__EmployerP__Emplo__49C3F6B7");
        });

        modelBuilder.Entity<JobCategory>(entity =>
        {
            entity.HasKey(e => e.CategoryId).HasName("PK__JobCateg__19093A0B8EB9ECC2");

            entity.HasIndex(e => e.Name, "UQ__JobCateg__737584F6109B5743").IsUnique();

            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Name).HasMaxLength(100);
            entity.HasData(
                new JobCategory { CategoryId = 1, Name = "Food & Beverage", Description = "Cafe, restaurants, bars" },
                new JobCategory { CategoryId = 2, Name = "Tutoring", Description = "Academic and skill tutoring" },
                new JobCategory { CategoryId = 3, Name = "Delivery", Description = "Food and parcel delivery services" },
                new JobCategory { CategoryId = 4, Name = "Retail", Description = "Stores, sales assistants" },
                new JobCategory { CategoryId = 5, Name = "Marketing", Description = "Digital marketing, promoters" },
                new JobCategory { CategoryId = 6, Name = "Creative", Description = "Design, photography, writing" },
                new JobCategory { CategoryId = 7, Name = "Office", Description = "Data entry, admin assistants" }
            );
        });

        modelBuilder.Entity<JobPost>(entity =>
        {
            entity.HasKey(e => e.JobPostId).HasName("PK__JobPosts__57689C3A02B54011");

            entity.Property(e => e.Address).HasMaxLength(255);
            entity.Property(e => e.ApplicationDeadline).HasColumnType("datetime");
            entity.Property(e => e.City).HasMaxLength(100);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.District).HasMaxLength(100);
            entity.Property(e => e.JobType).HasMaxLength(50);
            entity.Property(e => e.PayRate).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PayUnit)
                .HasMaxLength(50)
                .HasDefaultValue("PerHour");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Draft");
            entity.Property(e => e.Title).HasMaxLength(200);
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime");
            entity.Property(e => e.IsFeatured).HasDefaultValue(false);
            entity.Property(e => e.Position).HasMaxLength(150);
            entity.Property(e => e.Vacancies);

            entity.HasOne(d => d.Category).WithMany(p => p.JobPosts)
                .HasForeignKey(d => d.CategoryId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__JobPosts__Catego__571DF1D5");

            entity.HasOne(d => d.Employer).WithMany(p => p.JobPosts)
                .HasForeignKey(d => d.EmployerId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__JobPosts__Employ__5629CD9C");

            entity.HasOne(d => d.Branch).WithMany()
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("FK_JobPosts_Branches");

            entity.HasMany(d => d.Shifts).WithMany(p => p.JobPosts)
                .UsingEntity<Dictionary<string, object>>(
                    "JobPostShift",
                    r => r.HasOne<JobShift>().WithMany()
                        .HasForeignKey("ShiftId")
                        .HasConstraintName("FK__JobPostSh__Shift__5AEE82B9"),
                    l => l.HasOne<JobPost>().WithMany()
                        .HasForeignKey("JobPostId")
                        .HasConstraintName("FK__JobPostSh__JobPo__59FA5E80"),
                    j =>
                    {
                        j.HasKey("JobPostId", "ShiftId").HasName("PK__JobPostS__5B621FB252C26F12");
                        j.ToTable("JobPostShifts");
                    });
        });

        modelBuilder.Entity<JobShift>(entity =>
        {
            entity.HasKey(e => e.ShiftId).HasName("PK__JobShift__C0A838818353CA3C");

            entity.HasIndex(e => e.ShiftName, "UQ__JobShift__EB2D1556C8DF7BA1").IsUnique();

            entity.Property(e => e.ShiftName).HasMaxLength(50);
            entity.Property(e => e.StartTime).HasMaxLength(10);
            entity.Property(e => e.EndTime).HasMaxLength(10);
            entity.HasData(
                new JobShift { ShiftId = 1, ShiftName = "Morning", StartTime = "08:00", EndTime = "12:00" },
                new JobShift { ShiftId = 2, ShiftName = "Afternoon", StartTime = "13:00", EndTime = "17:00" },
                new JobShift { ShiftId = 3, ShiftName = "Evening", StartTime = "18:00", EndTime = "22:00" },
                new JobShift { ShiftId = 4, ShiftName = "Weekend", StartTime = null, EndTime = null }
            );
        });

        modelBuilder.Entity<Interview>(entity =>
        {
            entity.HasKey(e => e.InterviewId);
            entity.Property(e => e.ScheduledAt).HasColumnType("datetime");
            entity.Property(e => e.Location).HasMaxLength(255);
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("Scheduled");
            entity.Property(e => e.Result).HasMaxLength(20);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime");
            entity.HasOne<JobApplication>()
                .WithMany()
                .HasForeignKey(e => e.ApplicationId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<EmployerProfile>()
                .WithMany()
                .HasForeignKey(e => e.EmployerId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(e => e.ApplicantId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasKey(e => e.MessageId).HasName("PK__Messages__C87C0C9C94C14212");

            entity.Property(e => e.MessageType)
                .HasMaxLength(30)
                .HasDefaultValue("Text");

            entity.Property(e => e.SentAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.JobPost).WithMany(p => p.Messages)
                .HasForeignKey(d => d.JobPostId)
                .HasConstraintName("FK__Messages__JobPos__797309D9");

            entity.HasOne(d => d.Interview).WithMany()
                .HasForeignKey(d => d.InterviewId)
                .HasConstraintName("FK_Messages_Interviews_InterviewId");

            entity.HasOne(d => d.Receiver).WithMany(p => p.MessageReceivers)
                .HasForeignKey(d => d.ReceiverId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Messages__Receiv__787EE5A0");

            entity.HasOne(d => d.Sender).WithMany(p => p.MessageSenders)
                .HasForeignKey(d => d.SenderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Messages__Sender__778AC167");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.NotificationId).HasName("PK__Notifica__20CF2E12D7B8EFFD");

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Title).HasMaxLength(200);

            entity.HasOne(d => d.User).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK__Notificat__UserI__72C60C4A");
        });

        modelBuilder.Entity<Offer>(entity =>
        {
            entity.HasKey(e => e.OfferId);
            entity.Property(e => e.Position).HasMaxLength(150);
            entity.Property(e => e.HourlyRate).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.StartDate).HasColumnType("datetime");
            entity.Property(e => e.PaydayOfMonth).HasDefaultValue(5);
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("Sent");
            entity.Property(e => e.ExpectedShifts).HasMaxLength(100);
            entity.Property(e => e.ExpiredAt).HasColumnType("datetime");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.Property(e => e.AcceptedAt).HasColumnType("datetime");
            entity.Property(e => e.RespondedAt).HasColumnType("datetime");
            entity.HasOne<JobApplication>()
                .WithMany()
                .HasForeignKey(e => e.ApplicationId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<EmployerProfile>()
                .WithMany()
                .HasForeignKey(e => e.EmployerId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(e => e.ApplicantId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<Branch>()
                .WithMany()
                .HasForeignKey(e => e.BranchId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<PayrollItem>(entity =>
        {
            entity.HasKey(e => e.PayrollItemId);
            entity.Property(e => e.HourlyRateSnapshot).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.BaseSalary).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Bonus).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Penalty).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Deduction).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.FinalSalary).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("Draft");
            entity.HasOne<PayrollPeriod>()
                .WithMany()
                .HasForeignKey(e => e.PayrollPeriodId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<Employment>()
                .WithMany()
                .HasForeignKey(e => e.EmploymentId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(e => e.EmployeeUserId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<PayrollPeriod>(entity =>
        {
            entity.HasKey(e => e.PayrollPeriodId);
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("Draft");
            entity.Property(e => e.Payday).HasColumnType("datetime");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.Property(e => e.LockedAt).HasColumnType("datetime");
            entity.Property(e => e.PaidAt).HasColumnType("datetime");
            entity.HasIndex(e => new { e.EmployerId, e.Month, e.Year }).IsUnique();
            entity.HasOne<EmployerProfile>()
                .WithMany()
                .HasForeignKey(e => e.EmployerId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Report>(entity =>
        {
            entity.HasKey(e => e.ReportId).HasName("PK__Reports__D5BD4805F8F27DFE");

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.EntityType).HasMaxLength(50);
            entity.Property(e => e.Reason).HasMaxLength(255);
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Pending");
            entity.Property(e => e.AiAnalysis).HasColumnType("nvarchar(max)");

            entity.HasOne(d => d.Reporter).WithMany(p => p.Reports)
                .HasForeignKey(d => d.ReporterId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Reports__Reporte__02FC7413");
        });

        modelBuilder.Entity<Review>(entity =>
        {
            entity.HasKey(e => e.ReviewId).HasName("PK__Reviews__74BC79CE57121A27");

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.JobPost).WithMany(p => p.Reviews)
                .HasForeignKey(d => d.JobPostId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Reviews__JobPost__693CA210");

            entity.HasOne(d => d.Reviewee).WithMany(p => p.ReviewReviewees)
                .HasForeignKey(d => d.RevieweeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Reviews__Reviewe__68487DD7");

            entity.HasOne(d => d.Reviewer).WithMany(p => p.ReviewReviewers)
                .HasForeignKey(d => d.ReviewerId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Reviews__Reviewe__6754599E");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.RoleId).HasName("PK__Roles__8AFACE1ACBE21852");

            entity.HasIndex(e => e.RoleName, "UQ__Roles__8A2B6160952414CC").IsUnique();

            entity.Property(e => e.RoleName).HasMaxLength(50);
            entity.HasData(
                new Role { RoleId = 1, RoleName = "Admin" },
                new Role { RoleId = 2, RoleName = "Employer" },
                new Role { RoleId = 3, RoleName = "Applicant" }
            );
        });

        modelBuilder.Entity<SavedJob>(entity =>
        {
            entity.HasKey(e => e.SavedJobId).HasName("PK__SavedJob__B7E5F397A9175823");

            entity.Property(e => e.SavedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.Applicant).WithMany(p => p.SavedJobs)
                .HasForeignKey(d => d.ApplicantId)
                .HasConstraintName("FK__SavedJobs__Appli__6D0D32F4");

            entity.HasOne(d => d.JobPost).WithMany(p => p.SavedJobs)
                .HasForeignKey(d => d.JobPostId)
                .HasConstraintName("FK__SavedJobs__JobPo__6E01572D");
        });

        modelBuilder.Entity<ShiftAssignment>(entity =>
        {
            entity.HasKey(e => e.ShiftAssignmentId);
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("Assigned");
            entity.Property(e => e.IsFixed).HasDefaultValue(false);
            entity.Property(e => e.AssignmentSource).HasMaxLength(30).HasDefaultValue("EmployerAssign");
            entity.Property(e => e.AssignedAt).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.HasIndex(e => new { e.WorkShiftId, e.EmployeeUserId, e.Status });
            entity.HasOne<WorkShift>()
                .WithMany()
                .HasForeignKey(e => e.WorkShiftId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<Employment>()
                .WithMany()
                .HasForeignKey(e => e.EmploymentId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(e => e.EmployeeUserId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<ShiftRegistrationWindow>(entity =>
        {
            entity.HasKey(e => e.ShiftRegistrationWindowId);
            entity.Property(e => e.WeekStartDate).HasColumnType("datetime");
            entity.Property(e => e.OpenAt).HasColumnType("datetime");
            entity.Property(e => e.CloseAt).HasColumnType("datetime");
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("Open");
            entity.Property(e => e.MinFixedShifts).HasDefaultValue(3);
            entity.Property(e => e.PublishedAt).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.Property(e => e.FinalizedAt).HasColumnType("datetime");
            entity.HasIndex(e => new { e.EmployerId, e.BranchId, e.WeekStartDate }).IsUnique();
            entity.HasOne<EmployerProfile>()
                .WithMany()
                .HasForeignKey(e => e.EmployerId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<Branch>()
                .WithMany()
                .HasForeignKey(e => e.BranchId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<EmployerShiftTiming>(entity =>
        {
            entity.HasKey(e => e.EmployerShiftTimingId);
            entity.Property(e => e.ShiftName).HasMaxLength(50);
            entity.Property(e => e.StartTime).HasMaxLength(5);
            entity.Property(e => e.EndTime).HasMaxLength(5);
            entity.Property(e => e.RequiredPeople).HasDefaultValue(1);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.HasOne<EmployerProfile>()
                .WithMany()
                .HasForeignKey(e => e.EmployerId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ShiftPassRequest>(entity =>
        {
            entity.HasKey(e => e.ShiftPassRequestId);
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("Pending");
            entity.Property(e => e.RequestedAt).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.Property(e => e.RespondedAt).HasColumnType("datetime");
            entity.Property(e => e.ExpiresAt).HasColumnType("datetime");
            entity.HasOne<ShiftAssignment>()
                .WithMany()
                .HasForeignKey(e => e.ShiftAssignmentId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<WorkShift>()
                .WithMany()
                .HasForeignKey(e => e.WorkShiftId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(e => e.FromEmployeeUserId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(e => e.ToEmployeeUserId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<Branch>()
                .WithMany()
                .HasForeignKey(e => e.BranchId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<SubscriptionPlan>(entity =>
        {
            entity.HasKey(e => e.SubscriptionPlanId);

            entity.HasIndex(e => new { e.Audience, e.Code })
                .IsUnique()
                .HasDatabaseName("UQ_SubscriptionPlans_Audience_Code");

            entity.Property(e => e.Audience).HasMaxLength(20);
            entity.Property(e => e.Code).HasMaxLength(50);
            entity.Property(e => e.Currency)
                .HasMaxLength(10)
                .HasDefaultValue("VND");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.Name).HasMaxLength(120);
            entity.Property(e => e.Price).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime");
        });

        modelBuilder.Entity<Subscription>(entity =>
        {
            entity.HasKey(e => e.SubscriptionId).HasName("PK__Subscrip__9A2B249DA23168A5");

            entity.Property(e => e.Audience)
                .HasMaxLength(20)
                .HasDefaultValue("Employer");
            entity.Property(e => e.EndDate).HasColumnType("datetime");
            entity.Property(e => e.PlanName).HasMaxLength(100);
            entity.Property(e => e.Price).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.StartDate)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Active");

            entity.HasOne(d => d.Employer).WithMany(p => p.Subscriptions)
                .HasForeignKey(d => d.EmployerId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Subscript__Emplo__7E37BEF6");

            entity.HasOne(d => d.User)
                .WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.NoAction)
                .HasConstraintName("FK_Subscriptions_Users_UserId");

            entity.HasOne(d => d.SubscriptionPlan)
                .WithMany(p => p.Subscriptions)
                .HasForeignKey(d => d.SubscriptionPlanId)
                .OnDelete(DeleteBehavior.NoAction)
                .HasConstraintName("FK_Subscriptions_SubscriptionPlans_SubscriptionPlanId");
        });

        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.HasKey(e => e.PasswordResetTokenId);
            entity.Property(e => e.TokenHash).HasMaxLength(128);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.Property(e => e.ExpiresAt).HasColumnType("datetime");
            entity.Property(e => e.UsedAt).HasColumnType("datetime");
            entity.HasIndex(e => e.TokenHash);
            entity.HasIndex(e => new { e.UserId, e.UsedAt, e.ExpiresAt });
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__Users__1788CC4C753B0BDF");

            entity.HasIndex(e => e.Email, "UQ__Users__A9D1053409FCA5A0").IsUnique();

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Email).HasMaxLength(255);
            entity.Property(e => e.FullName).HasMaxLength(150);
            entity.Property(e => e.PasswordHash).HasMaxLength(255);
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Active");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime");

            entity.HasOne(d => d.Role).WithMany(p => p.Users)
                .HasForeignKey(d => d.RoleId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Users__RoleId__3E52440B");
        });

        modelBuilder.Entity<WorkShift>(entity =>
        {
            entity.HasKey(e => e.WorkShiftId);
            entity.Property(e => e.Title).HasMaxLength(150);
            entity.Property(e => e.StartTime).HasColumnType("datetime");
            entity.Property(e => e.EndTime).HasColumnType("datetime");
            entity.Property(e => e.RequiredRole).HasMaxLength(100);
            entity.Property(e => e.RequiredPeople).HasDefaultValue(1);
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("Published");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.HasIndex(e => e.RegistrationWindowId);
            entity.HasOne<EmployerProfile>()
                .WithMany()
                .HasForeignKey(e => e.EmployerId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<Branch>()
                .WithMany()
                .HasForeignKey(e => e.BranchId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<ShiftRegistrationWindow>()
                .WithMany()
                .HasForeignKey(e => e.RegistrationWindowId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}

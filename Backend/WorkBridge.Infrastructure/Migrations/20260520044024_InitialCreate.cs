using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace WorkBridge.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "JobCategories",
                columns: table => new
                {
                    CategoryId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__JobCateg__19093A0B8EB9ECC2", x => x.CategoryId);
                });

            migrationBuilder.CreateTable(
                name: "JobShifts",
                columns: table => new
                {
                    ShiftId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ShiftName = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    StartTime = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    EndTime = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__JobShift__C0A838818353CA3C", x => x.ShiftId);
                });

            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    RoleId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleName = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Roles__8AFACE1ACBE21852", x => x.RoleId);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleId = table.Column<int>(type: "int", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    AvatarUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Active"),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Users__1788CC4C753B0BDF", x => x.UserId);
                    table.ForeignKey(
                        name: "FK__Users__RoleId__3E52440B",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "RoleId");
                });

            migrationBuilder.CreateTable(
                name: "ApplicantProfiles",
                columns: table => new
                {
                    ApplicantId = table.Column<int>(type: "int", nullable: false),
                    University = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Major = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    StudyYear = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Phone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Address = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    AboutMe = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Availability = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CvUrl = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Applican__39AE91A8EAA77268", x => x.ApplicantId);
                    table.ForeignKey(
                        name: "FK__Applicant__Appli__412EB0B6",
                        column: x => x.ApplicantId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "EmployerProfiles",
                columns: table => new
                {
                    EmployerId = table.Column<int>(type: "int", nullable: false),
                    CompanyName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    ContactEmail = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    ContactPhone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Address = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LogoUrl = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Employer__CA44526143C6B38D", x => x.EmployerId);
                    table.ForeignKey(
                        name: "FK__EmployerP__Emplo__49C3F6B7",
                        column: x => x.EmployerId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    NotificationId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsRead = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Notifica__20CF2E12D7B8EFFD", x => x.NotificationId);
                    table.ForeignKey(
                        name: "FK__Notificat__UserI__72C60C4A",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Reports",
                columns: table => new
                {
                    ReportId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReporterId = table.Column<int>(type: "int", nullable: false),
                    ReportedEntityId = table.Column<int>(type: "int", nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Pending"),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Reports__D5BD4805F8F27DFE", x => x.ReportId);
                    table.ForeignKey(
                        name: "FK__Reports__Reporte__02FC7413",
                        column: x => x.ReporterId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "ApplicantExperiences",
                columns: table => new
                {
                    ExperienceId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ApplicantId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    CompanyName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Duration = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Applican__2F4E34496C276AD8", x => x.ExperienceId);
                    table.ForeignKey(
                        name: "FK__Applicant__Appli__440B1D61",
                        column: x => x.ApplicantId,
                        principalTable: "ApplicantProfiles",
                        principalColumn: "ApplicantId");
                });

            migrationBuilder.CreateTable(
                name: "ApplicantSkills",
                columns: table => new
                {
                    SkillId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ApplicantId = table.Column<int>(type: "int", nullable: false),
                    SkillName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Applican__DFA0918790064E45", x => x.SkillId);
                    table.ForeignKey(
                        name: "FK__Applicant__Appli__46E78A0C",
                        column: x => x.ApplicantId,
                        principalTable: "ApplicantProfiles",
                        principalColumn: "ApplicantId");
                });

            migrationBuilder.CreateTable(
                name: "Branches",
                columns: table => new
                {
                    BranchId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployerId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Address = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "(getdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Branches", x => x.BranchId);
                    table.ForeignKey(
                        name: "FK_Branches_EmployerProfiles_EmployerId",
                        column: x => x.EmployerId,
                        principalTable: "EmployerProfiles",
                        principalColumn: "EmployerId");
                });

            migrationBuilder.CreateTable(
                name: "JobPosts",
                columns: table => new
                {
                    JobPostId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployerId = table.Column<int>(type: "int", nullable: false),
                    CategoryId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    JobType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PayRate = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    PayUnit = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "PerHour"),
                    City = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    District = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Address = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    ApplicationDeadline = table.Column<DateTime>(type: "datetime", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Requirements = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Benefits = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Draft"),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__JobPosts__57689C3A02B54011", x => x.JobPostId);
                    table.ForeignKey(
                        name: "FK__JobPosts__Catego__571DF1D5",
                        column: x => x.CategoryId,
                        principalTable: "JobCategories",
                        principalColumn: "CategoryId");
                    table.ForeignKey(
                        name: "FK__JobPosts__Employ__5629CD9C",
                        column: x => x.EmployerId,
                        principalTable: "EmployerProfiles",
                        principalColumn: "EmployerId");
                });

            migrationBuilder.CreateTable(
                name: "PayrollPeriods",
                columns: table => new
                {
                    PayrollPeriodId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployerId = table.Column<int>(type: "int", nullable: false),
                    Month = table.Column<int>(type: "int", nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Draft"),
                    Payday = table.Column<DateTime>(type: "datetime", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "(getdate())"),
                    LockedAt = table.Column<DateTime>(type: "datetime", nullable: true),
                    PaidAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PayrollPeriods", x => x.PayrollPeriodId);
                    table.ForeignKey(
                        name: "FK_PayrollPeriods_EmployerProfiles_EmployerId",
                        column: x => x.EmployerId,
                        principalTable: "EmployerProfiles",
                        principalColumn: "EmployerId");
                });

            migrationBuilder.CreateTable(
                name: "Subscriptions",
                columns: table => new
                {
                    SubscriptionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployerId = table.Column<int>(type: "int", nullable: false),
                    PlanName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "(getdate())"),
                    EndDate = table.Column<DateTime>(type: "datetime", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Active")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Subscrip__9A2B249DA23168A5", x => x.SubscriptionId);
                    table.ForeignKey(
                        name: "FK__Subscript__Emplo__7E37BEF6",
                        column: x => x.EmployerId,
                        principalTable: "EmployerProfiles",
                        principalColumn: "EmployerId");
                });

            migrationBuilder.CreateTable(
                name: "WorkShifts",
                columns: table => new
                {
                    WorkShiftId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployerId = table.Column<int>(type: "int", nullable: false),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    StartTime = table.Column<DateTime>(type: "datetime", nullable: false),
                    EndTime = table.Column<DateTime>(type: "datetime", nullable: false),
                    RequiredRole = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RequiredPeople = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Published"),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "(getdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkShifts", x => x.WorkShiftId);
                    table.ForeignKey(
                        name: "FK_WorkShifts_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "BranchId");
                    table.ForeignKey(
                        name: "FK_WorkShifts_EmployerProfiles_EmployerId",
                        column: x => x.EmployerId,
                        principalTable: "EmployerProfiles",
                        principalColumn: "EmployerId");
                });

            migrationBuilder.CreateTable(
                name: "Applications",
                columns: table => new
                {
                    ApplicationId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    JobPostId = table.Column<int>(type: "int", nullable: false),
                    ApplicantId = table.Column<int>(type: "int", nullable: false),
                    CoverMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CvUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Applied"),
                    EmployerNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    AppliedAt = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())"),
                    RespondedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Applicat__C93A4C99EAD2D717", x => x.ApplicationId);
                    table.ForeignKey(
                        name: "FK__Applicati__Appli__619B8048",
                        column: x => x.ApplicantId,
                        principalTable: "ApplicantProfiles",
                        principalColumn: "ApplicantId");
                    table.ForeignKey(
                        name: "FK__Applicati__JobPo__60A75C0F",
                        column: x => x.JobPostId,
                        principalTable: "JobPosts",
                        principalColumn: "JobPostId");
                });

            migrationBuilder.CreateTable(
                name: "JobPostShifts",
                columns: table => new
                {
                    JobPostId = table.Column<int>(type: "int", nullable: false),
                    ShiftId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__JobPostS__5B621FB252C26F12", x => new { x.JobPostId, x.ShiftId });
                    table.ForeignKey(
                        name: "FK__JobPostSh__JobPo__59FA5E80",
                        column: x => x.JobPostId,
                        principalTable: "JobPosts",
                        principalColumn: "JobPostId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK__JobPostSh__Shift__5AEE82B9",
                        column: x => x.ShiftId,
                        principalTable: "JobShifts",
                        principalColumn: "ShiftId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Reviews",
                columns: table => new
                {
                    ReviewId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReviewerId = table.Column<int>(type: "int", nullable: false),
                    RevieweeId = table.Column<int>(type: "int", nullable: false),
                    JobPostId = table.Column<int>(type: "int", nullable: false),
                    Rating = table.Column<int>(type: "int", nullable: false),
                    Comment = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Reviews__74BC79CE57121A27", x => x.ReviewId);
                    table.ForeignKey(
                        name: "FK__Reviews__JobPost__693CA210",
                        column: x => x.JobPostId,
                        principalTable: "JobPosts",
                        principalColumn: "JobPostId");
                    table.ForeignKey(
                        name: "FK__Reviews__Reviewe__6754599E",
                        column: x => x.ReviewerId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                    table.ForeignKey(
                        name: "FK__Reviews__Reviewe__68487DD7",
                        column: x => x.RevieweeId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "SavedJobs",
                columns: table => new
                {
                    SavedJobId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ApplicantId = table.Column<int>(type: "int", nullable: false),
                    JobPostId = table.Column<int>(type: "int", nullable: false),
                    SavedAt = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__SavedJob__B7E5F397A9175823", x => x.SavedJobId);
                    table.ForeignKey(
                        name: "FK__SavedJobs__Appli__6D0D32F4",
                        column: x => x.ApplicantId,
                        principalTable: "ApplicantProfiles",
                        principalColumn: "ApplicantId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK__SavedJobs__JobPo__6E01572D",
                        column: x => x.JobPostId,
                        principalTable: "JobPosts",
                        principalColumn: "JobPostId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Interviews",
                columns: table => new
                {
                    InterviewId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ApplicationId = table.Column<int>(type: "int", nullable: false),
                    EmployerId = table.Column<int>(type: "int", nullable: false),
                    ApplicantId = table.Column<int>(type: "int", nullable: false),
                    ScheduledAt = table.Column<DateTime>(type: "datetime", nullable: false),
                    Location = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Scheduled"),
                    Result = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "(getdate())"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Interviews", x => x.InterviewId);
                    table.ForeignKey(
                        name: "FK_Interviews_Applications_ApplicationId",
                        column: x => x.ApplicationId,
                        principalTable: "Applications",
                        principalColumn: "ApplicationId");
                    table.ForeignKey(
                        name: "FK_Interviews_EmployerProfiles_EmployerId",
                        column: x => x.EmployerId,
                        principalTable: "EmployerProfiles",
                        principalColumn: "EmployerId");
                    table.ForeignKey(
                        name: "FK_Interviews_Users_ApplicantId",
                        column: x => x.ApplicantId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "Offers",
                columns: table => new
                {
                    OfferId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ApplicationId = table.Column<int>(type: "int", nullable: false),
                    EmployerId = table.Column<int>(type: "int", nullable: false),
                    ApplicantId = table.Column<int>(type: "int", nullable: false),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                    Position = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    HourlyRate = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime", nullable: false),
                    PaydayOfMonth = table.Column<int>(type: "int", nullable: false, defaultValue: 5),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Sent"),
                    ExpiredAt = table.Column<DateTime>(type: "datetime", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "(getdate())"),
                    AcceptedAt = table.Column<DateTime>(type: "datetime", nullable: true),
                    RespondedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Offers", x => x.OfferId);
                    table.ForeignKey(
                        name: "FK_Offers_Applications_ApplicationId",
                        column: x => x.ApplicationId,
                        principalTable: "Applications",
                        principalColumn: "ApplicationId");
                    table.ForeignKey(
                        name: "FK_Offers_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "BranchId");
                    table.ForeignKey(
                        name: "FK_Offers_EmployerProfiles_EmployerId",
                        column: x => x.EmployerId,
                        principalTable: "EmployerProfiles",
                        principalColumn: "EmployerId");
                    table.ForeignKey(
                        name: "FK_Offers_Users_ApplicantId",
                        column: x => x.ApplicantId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "Messages",
                columns: table => new
                {
                    MessageId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SenderId = table.Column<int>(type: "int", nullable: false),
                    ReceiverId = table.Column<int>(type: "int", nullable: false),
                    JobPostId = table.Column<int>(type: "int", nullable: true),
                    InterviewId = table.Column<int>(type: "int", nullable: true),
                    MessageType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "Text"),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsRead = table.Column<bool>(type: "bit", nullable: false),
                    SentAt = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Messages__C87C0C9C94C14212", x => x.MessageId);
                    table.ForeignKey(
                        name: "FK_Messages_Interviews_InterviewId",
                        column: x => x.InterviewId,
                        principalTable: "Interviews",
                        principalColumn: "InterviewId");
                    table.ForeignKey(
                        name: "FK__Messages__JobPos__797309D9",
                        column: x => x.JobPostId,
                        principalTable: "JobPosts",
                        principalColumn: "JobPostId");
                    table.ForeignKey(
                        name: "FK__Messages__Receiv__787EE5A0",
                        column: x => x.ReceiverId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                    table.ForeignKey(
                        name: "FK__Messages__Sender__778AC167",
                        column: x => x.SenderId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "Employments",
                columns: table => new
                {
                    EmploymentId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployerId = table.Column<int>(type: "int", nullable: false),
                    EmployeeUserId = table.Column<int>(type: "int", nullable: false),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                    OfferId = table.Column<int>(type: "int", nullable: false),
                    Position = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Active"),
                    StartDate = table.Column<DateTime>(type: "datetime", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "(getdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Employments", x => x.EmploymentId);
                    table.ForeignKey(
                        name: "FK_Employments_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "BranchId");
                    table.ForeignKey(
                        name: "FK_Employments_EmployerProfiles_EmployerId",
                        column: x => x.EmployerId,
                        principalTable: "EmployerProfiles",
                        principalColumn: "EmployerId");
                    table.ForeignKey(
                        name: "FK_Employments_Offers_OfferId",
                        column: x => x.OfferId,
                        principalTable: "Offers",
                        principalColumn: "OfferId");
                    table.ForeignKey(
                        name: "FK_Employments_Users_EmployeeUserId",
                        column: x => x.EmployeeUserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "EmployeeRates",
                columns: table => new
                {
                    EmployeeRateId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmploymentId = table.Column<int>(type: "int", nullable: false),
                    HourlyRate = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    EffectiveFrom = table.Column<DateTime>(type: "datetime", nullable: false),
                    EffectiveTo = table.Column<DateTime>(type: "datetime", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "(getdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeeRates", x => x.EmployeeRateId);
                    table.ForeignKey(
                        name: "FK_EmployeeRates_Employments_EmploymentId",
                        column: x => x.EmploymentId,
                        principalTable: "Employments",
                        principalColumn: "EmploymentId");
                });

            migrationBuilder.CreateTable(
                name: "PayrollItems",
                columns: table => new
                {
                    PayrollItemId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PayrollPeriodId = table.Column<int>(type: "int", nullable: false),
                    EmploymentId = table.Column<int>(type: "int", nullable: false),
                    EmployeeUserId = table.Column<int>(type: "int", nullable: false),
                    TotalApprovedMinutes = table.Column<int>(type: "int", nullable: false),
                    HourlyRateSnapshot = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    BaseSalary = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Bonus = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Penalty = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Deduction = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    FinalSalary = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Draft")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PayrollItems", x => x.PayrollItemId);
                    table.ForeignKey(
                        name: "FK_PayrollItems_Employments_EmploymentId",
                        column: x => x.EmploymentId,
                        principalTable: "Employments",
                        principalColumn: "EmploymentId");
                    table.ForeignKey(
                        name: "FK_PayrollItems_PayrollPeriods_PayrollPeriodId",
                        column: x => x.PayrollPeriodId,
                        principalTable: "PayrollPeriods",
                        principalColumn: "PayrollPeriodId");
                    table.ForeignKey(
                        name: "FK_PayrollItems_Users_EmployeeUserId",
                        column: x => x.EmployeeUserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "ShiftAssignments",
                columns: table => new
                {
                    ShiftAssignmentId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WorkShiftId = table.Column<int>(type: "int", nullable: false),
                    EmploymentId = table.Column<int>(type: "int", nullable: false),
                    EmployeeUserId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Assigned"),
                    AssignedAt = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "(getdate())"),
                    TransferredFromAssignmentId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftAssignments", x => x.ShiftAssignmentId);
                    table.ForeignKey(
                        name: "FK_ShiftAssignments_Employments_EmploymentId",
                        column: x => x.EmploymentId,
                        principalTable: "Employments",
                        principalColumn: "EmploymentId");
                    table.ForeignKey(
                        name: "FK_ShiftAssignments_Users_EmployeeUserId",
                        column: x => x.EmployeeUserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                    table.ForeignKey(
                        name: "FK_ShiftAssignments_WorkShifts_WorkShiftId",
                        column: x => x.WorkShiftId,
                        principalTable: "WorkShifts",
                        principalColumn: "WorkShiftId");
                });

            migrationBuilder.CreateTable(
                name: "AttendanceRecords",
                columns: table => new
                {
                    AttendanceRecordId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ShiftAssignmentId = table.Column<int>(type: "int", nullable: false),
                    EmployeeUserId = table.Column<int>(type: "int", nullable: false),
                    CheckInAt = table.Column<DateTime>(type: "datetime", nullable: true),
                    CheckOutAt = table.Column<DateTime>(type: "datetime", nullable: true),
                    WorkedMinutes = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "NotStarted"),
                    ApprovedByEmployerId = table.Column<int>(type: "int", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AttendanceRecords", x => x.AttendanceRecordId);
                    table.ForeignKey(
                        name: "FK_AttendanceRecords_ShiftAssignments_ShiftAssignmentId",
                        column: x => x.ShiftAssignmentId,
                        principalTable: "ShiftAssignments",
                        principalColumn: "ShiftAssignmentId");
                    table.ForeignKey(
                        name: "FK_AttendanceRecords_Users_EmployeeUserId",
                        column: x => x.EmployeeUserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "ShiftPassRequests",
                columns: table => new
                {
                    ShiftPassRequestId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ShiftAssignmentId = table.Column<int>(type: "int", nullable: false),
                    WorkShiftId = table.Column<int>(type: "int", nullable: false),
                    FromEmployeeUserId = table.Column<int>(type: "int", nullable: false),
                    ToEmployeeUserId = table.Column<int>(type: "int", nullable: false),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Pending"),
                    RequestedAt = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "(getdate())"),
                    RespondedAt = table.Column<DateTime>(type: "datetime", nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "datetime", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftPassRequests", x => x.ShiftPassRequestId);
                    table.ForeignKey(
                        name: "FK_ShiftPassRequests_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "BranchId");
                    table.ForeignKey(
                        name: "FK_ShiftPassRequests_ShiftAssignments_ShiftAssignmentId",
                        column: x => x.ShiftAssignmentId,
                        principalTable: "ShiftAssignments",
                        principalColumn: "ShiftAssignmentId");
                    table.ForeignKey(
                        name: "FK_ShiftPassRequests_Users_FromEmployeeUserId",
                        column: x => x.FromEmployeeUserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                    table.ForeignKey(
                        name: "FK_ShiftPassRequests_Users_ToEmployeeUserId",
                        column: x => x.ToEmployeeUserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                    table.ForeignKey(
                        name: "FK_ShiftPassRequests_WorkShifts_WorkShiftId",
                        column: x => x.WorkShiftId,
                        principalTable: "WorkShifts",
                        principalColumn: "WorkShiftId");
                });

            migrationBuilder.InsertData(
                table: "JobCategories",
                columns: new[] { "CategoryId", "Description", "Name" },
                values: new object[,]
                {
                    { 1, "Cafe, restaurants, bars", "Food & Beverage" },
                    { 2, "Academic and skill tutoring", "Tutoring" },
                    { 3, "Food and parcel delivery services", "Delivery" },
                    { 4, "Stores, sales assistants", "Retail" },
                    { 5, "Digital marketing, promoters", "Marketing" },
                    { 6, "Design, photography, writing", "Creative" },
                    { 7, "Data entry, admin assistants", "Office" }
                });

            migrationBuilder.InsertData(
                table: "JobShifts",
                columns: new[] { "ShiftId", "EndTime", "ShiftName", "StartTime" },
                values: new object[,]
                {
                    { 1, "12:00", "Morning", "08:00" },
                    { 2, "17:00", "Afternoon", "13:00" },
                    { 3, "22:00", "Evening", "18:00" },
                    { 4, null, "Weekend", null }
                });

            migrationBuilder.InsertData(
                table: "Roles",
                columns: new[] { "RoleId", "RoleName" },
                values: new object[,]
                {
                    { 1, "Admin" },
                    { 2, "Employer" },
                    { 3, "Applicant" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_ApplicantExperiences_ApplicantId",
                table: "ApplicantExperiences",
                column: "ApplicantId");

            migrationBuilder.CreateIndex(
                name: "IX_ApplicantSkills_ApplicantId",
                table: "ApplicantSkills",
                column: "ApplicantId");

            migrationBuilder.CreateIndex(
                name: "IX_Applications_ApplicantId",
                table: "Applications",
                column: "ApplicantId");

            migrationBuilder.CreateIndex(
                name: "IX_Applications_JobPostId",
                table: "Applications",
                column: "JobPostId");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceRecords_EmployeeUserId",
                table: "AttendanceRecords",
                column: "EmployeeUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceRecords_ShiftAssignmentId",
                table: "AttendanceRecords",
                column: "ShiftAssignmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Branches_EmployerId",
                table: "Branches",
                column: "EmployerId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeRates_EmploymentId",
                table: "EmployeeRates",
                column: "EmploymentId");

            migrationBuilder.CreateIndex(
                name: "IX_Employments_BranchId",
                table: "Employments",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Employments_EmployeeUserId",
                table: "Employments",
                column: "EmployeeUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Employments_EmployerId",
                table: "Employments",
                column: "EmployerId");

            migrationBuilder.CreateIndex(
                name: "IX_Employments_OfferId",
                table: "Employments",
                column: "OfferId");

            migrationBuilder.CreateIndex(
                name: "IX_Interviews_ApplicantId",
                table: "Interviews",
                column: "ApplicantId");

            migrationBuilder.CreateIndex(
                name: "IX_Interviews_ApplicationId",
                table: "Interviews",
                column: "ApplicationId");

            migrationBuilder.CreateIndex(
                name: "IX_Interviews_EmployerId",
                table: "Interviews",
                column: "EmployerId");

            migrationBuilder.CreateIndex(
                name: "UQ__JobCateg__737584F6109B5743",
                table: "JobCategories",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JobPosts_CategoryId",
                table: "JobPosts",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_JobPosts_EmployerId",
                table: "JobPosts",
                column: "EmployerId");

            migrationBuilder.CreateIndex(
                name: "IX_JobPostShifts_ShiftId",
                table: "JobPostShifts",
                column: "ShiftId");

            migrationBuilder.CreateIndex(
                name: "UQ__JobShift__EB2D1556C8DF7BA1",
                table: "JobShifts",
                column: "ShiftName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Messages_InterviewId",
                table: "Messages",
                column: "InterviewId");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_JobPostId",
                table: "Messages",
                column: "JobPostId");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_ReceiverId",
                table: "Messages",
                column: "ReceiverId");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_SenderId",
                table: "Messages",
                column: "SenderId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId",
                table: "Notifications",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Offers_ApplicantId",
                table: "Offers",
                column: "ApplicantId");

            migrationBuilder.CreateIndex(
                name: "IX_Offers_ApplicationId",
                table: "Offers",
                column: "ApplicationId");

            migrationBuilder.CreateIndex(
                name: "IX_Offers_BranchId",
                table: "Offers",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Offers_EmployerId",
                table: "Offers",
                column: "EmployerId");

            migrationBuilder.CreateIndex(
                name: "IX_PayrollItems_EmployeeUserId",
                table: "PayrollItems",
                column: "EmployeeUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PayrollItems_EmploymentId",
                table: "PayrollItems",
                column: "EmploymentId");

            migrationBuilder.CreateIndex(
                name: "IX_PayrollItems_PayrollPeriodId",
                table: "PayrollItems",
                column: "PayrollPeriodId");

            migrationBuilder.CreateIndex(
                name: "IX_PayrollPeriods_EmployerId_Month_Year",
                table: "PayrollPeriods",
                columns: new[] { "EmployerId", "Month", "Year" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reports_ReporterId",
                table: "Reports",
                column: "ReporterId");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_JobPostId",
                table: "Reviews",
                column: "JobPostId");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_RevieweeId",
                table: "Reviews",
                column: "RevieweeId");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_ReviewerId",
                table: "Reviews",
                column: "ReviewerId");

            migrationBuilder.CreateIndex(
                name: "UQ__Roles__8A2B6160952414CC",
                table: "Roles",
                column: "RoleName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SavedJobs_ApplicantId",
                table: "SavedJobs",
                column: "ApplicantId");

            migrationBuilder.CreateIndex(
                name: "IX_SavedJobs_JobPostId",
                table: "SavedJobs",
                column: "JobPostId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftAssignments_EmployeeUserId",
                table: "ShiftAssignments",
                column: "EmployeeUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftAssignments_EmploymentId",
                table: "ShiftAssignments",
                column: "EmploymentId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftAssignments_WorkShiftId",
                table: "ShiftAssignments",
                column: "WorkShiftId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftPassRequests_BranchId",
                table: "ShiftPassRequests",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftPassRequests_FromEmployeeUserId",
                table: "ShiftPassRequests",
                column: "FromEmployeeUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftPassRequests_ShiftAssignmentId",
                table: "ShiftPassRequests",
                column: "ShiftAssignmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftPassRequests_ToEmployeeUserId",
                table: "ShiftPassRequests",
                column: "ToEmployeeUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftPassRequests_WorkShiftId",
                table: "ShiftPassRequests",
                column: "WorkShiftId");

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_EmployerId",
                table: "Subscriptions",
                column: "EmployerId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_RoleId",
                table: "Users",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "UQ__Users__A9D1053409FCA5A0",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkShifts_BranchId",
                table: "WorkShifts",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkShifts_EmployerId",
                table: "WorkShifts",
                column: "EmployerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApplicantExperiences");

            migrationBuilder.DropTable(
                name: "ApplicantSkills");

            migrationBuilder.DropTable(
                name: "AttendanceRecords");

            migrationBuilder.DropTable(
                name: "EmployeeRates");

            migrationBuilder.DropTable(
                name: "JobPostShifts");

            migrationBuilder.DropTable(
                name: "Messages");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "PayrollItems");

            migrationBuilder.DropTable(
                name: "Reports");

            migrationBuilder.DropTable(
                name: "Reviews");

            migrationBuilder.DropTable(
                name: "SavedJobs");

            migrationBuilder.DropTable(
                name: "ShiftPassRequests");

            migrationBuilder.DropTable(
                name: "Subscriptions");

            migrationBuilder.DropTable(
                name: "JobShifts");

            migrationBuilder.DropTable(
                name: "Interviews");

            migrationBuilder.DropTable(
                name: "PayrollPeriods");

            migrationBuilder.DropTable(
                name: "ShiftAssignments");

            migrationBuilder.DropTable(
                name: "Employments");

            migrationBuilder.DropTable(
                name: "WorkShifts");

            migrationBuilder.DropTable(
                name: "Offers");

            migrationBuilder.DropTable(
                name: "Applications");

            migrationBuilder.DropTable(
                name: "Branches");

            migrationBuilder.DropTable(
                name: "ApplicantProfiles");

            migrationBuilder.DropTable(
                name: "JobPosts");

            migrationBuilder.DropTable(
                name: "JobCategories");

            migrationBuilder.DropTable(
                name: "EmployerProfiles");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Roles");
        }
    }
}

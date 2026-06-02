using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkBridge.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class WeeklyShiftRegistration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.EmployerShiftTimings', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.EmployerShiftTimings (
        EmployerShiftTimingId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_EmployerShiftTimings PRIMARY KEY,
        EmployerId INT NOT NULL,
        ShiftName NVARCHAR(50) NOT NULL,
        StartTime NVARCHAR(5) NOT NULL,
        EndTime NVARCHAR(5) NOT NULL,
        RequiredPeople INT NOT NULL CONSTRAINT DF_EmployerShiftTimings_RequiredPeople DEFAULT 1,
        IsActive BIT NOT NULL CONSTRAINT DF_EmployerShiftTimings_IsActive DEFAULT 1,
        CONSTRAINT FK_EmployerShiftTimings_EmployerProfiles_EmployerId FOREIGN KEY (EmployerId) REFERENCES dbo.EmployerProfiles(EmployerId) ON DELETE CASCADE
    );
END;

IF OBJECT_ID('dbo.ShiftRegistrationWindows', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ShiftRegistrationWindows (
        ShiftRegistrationWindowId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ShiftRegistrationWindows PRIMARY KEY,
        EmployerId INT NOT NULL,
        BranchId INT NOT NULL,
        WeekStartDate DATETIME NOT NULL,
        OpenAt DATETIME NOT NULL,
        CloseAt DATETIME NOT NULL,
        Status NVARCHAR(20) NOT NULL CONSTRAINT DF_ShiftRegistrationWindows_Status DEFAULT 'Open',
        MinFixedShifts INT NOT NULL CONSTRAINT DF_ShiftRegistrationWindows_MinFixedShifts DEFAULT 3,
        PublishedAt DATETIME NOT NULL CONSTRAINT DF_ShiftRegistrationWindows_PublishedAt DEFAULT GETDATE(),
        FinalizedAt DATETIME NULL,
        CONSTRAINT FK_ShiftRegistrationWindows_EmployerProfiles_EmployerId FOREIGN KEY (EmployerId) REFERENCES dbo.EmployerProfiles(EmployerId),
        CONSTRAINT FK_ShiftRegistrationWindows_Branches_BranchId FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId)
    );
END;

IF COL_LENGTH('dbo.WorkShifts', 'RegistrationWindowId') IS NULL
BEGIN
    ALTER TABLE dbo.WorkShifts ADD RegistrationWindowId INT NULL;
END;

IF COL_LENGTH('dbo.ShiftAssignments', 'IsFixed') IS NULL
BEGIN
    ALTER TABLE dbo.ShiftAssignments ADD IsFixed BIT NOT NULL CONSTRAINT DF_ShiftAssignments_IsFixed DEFAULT 0;
END;

IF COL_LENGTH('dbo.ShiftAssignments', 'AssignmentSource') IS NULL
BEGIN
    ALTER TABLE dbo.ShiftAssignments ADD AssignmentSource NVARCHAR(30) NOT NULL CONSTRAINT DF_ShiftAssignments_AssignmentSource DEFAULT 'EmployerAssign';
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_EmployerShiftTimings_EmployerId' AND object_id = OBJECT_ID('dbo.EmployerShiftTimings'))
    CREATE INDEX IX_EmployerShiftTimings_EmployerId ON dbo.EmployerShiftTimings(EmployerId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ShiftRegistrationWindows_BranchId' AND object_id = OBJECT_ID('dbo.ShiftRegistrationWindows'))
    CREATE INDEX IX_ShiftRegistrationWindows_BranchId ON dbo.ShiftRegistrationWindows(BranchId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ShiftRegistrationWindows_EmployerId_BranchId_WeekStartDate' AND object_id = OBJECT_ID('dbo.ShiftRegistrationWindows'))
    CREATE UNIQUE INDEX IX_ShiftRegistrationWindows_EmployerId_BranchId_WeekStartDate ON dbo.ShiftRegistrationWindows(EmployerId, BranchId, WeekStartDate);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WorkShifts_RegistrationWindowId' AND object_id = OBJECT_ID('dbo.WorkShifts'))
    CREATE INDEX IX_WorkShifts_RegistrationWindowId ON dbo.WorkShifts(RegistrationWindowId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ShiftAssignments_WorkShiftId_EmployeeUserId_Status' AND object_id = OBJECT_ID('dbo.ShiftAssignments'))
    CREATE INDEX IX_ShiftAssignments_WorkShiftId_EmployeeUserId_Status ON dbo.ShiftAssignments(WorkShiftId, EmployeeUserId, Status);

IF OBJECT_ID('dbo.FK_WorkShifts_ShiftRegistrationWindows_RegistrationWindowId', 'F') IS NULL
BEGIN
    ALTER TABLE dbo.WorkShifts
    ADD CONSTRAINT FK_WorkShifts_ShiftRegistrationWindows_RegistrationWindowId
    FOREIGN KEY (RegistrationWindowId) REFERENCES dbo.ShiftRegistrationWindows(ShiftRegistrationWindowId);
END;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WorkShifts_ShiftRegistrationWindows_RegistrationWindowId",
                table: "WorkShifts");

            migrationBuilder.DropTable(
                name: "EmployerShiftTimings");

            migrationBuilder.DropTable(
                name: "ShiftRegistrationWindows");

            migrationBuilder.DropIndex(
                name: "IX_WorkShifts_RegistrationWindowId",
                table: "WorkShifts");

            migrationBuilder.DropIndex(
                name: "IX_ShiftAssignments_WorkShiftId_EmployeeUserId_Status",
                table: "ShiftAssignments");

            migrationBuilder.DropColumn(
                name: "RegistrationWindowId",
                table: "WorkShifts");

            migrationBuilder.DropColumn(
                name: "AssignmentSource",
                table: "ShiftAssignments");

            migrationBuilder.DropColumn(
                name: "IsFixed",
                table: "ShiftAssignments");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftAssignments_WorkShiftId",
                table: "ShiftAssignments",
                column: "WorkShiftId");
        }
    }
}

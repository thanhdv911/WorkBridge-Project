-- =========================================================================================
-- WORKBRIDGE DATABASE SCHEMA SCRIPT (V2 - OPTIMIZED FOR PRODUCTION)
-- =========================================================================================

-- Create Database
CREATE DATABASE WorkBridgeDB;
GO
USE WorkBridgeDB;
GO

-- =========================================================================================
-- TABLES CREATION
-- =========================================================================================

-- 1. Roles Table
CREATE TABLE Roles (
    RoleId INT IDENTITY(1,1) PRIMARY KEY,
    RoleName NVARCHAR(50) NOT NULL UNIQUE -- e.g., 'Admin', 'Employer', 'Applicant'
);

-- 2. Users Table
CREATE TABLE Users (
    UserId INT IDENTITY(1,1) PRIMARY KEY,
    RoleId INT NOT NULL,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    FullName NVARCHAR(150) NOT NULL,
    AvatarUrl NVARCHAR(MAX) NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Active', -- 'Active', 'Pending', 'Suspended'
    IsDeleted BIT NOT NULL DEFAULT 0, -- Soft delete flag
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME NULL,
    FOREIGN KEY (RoleId) REFERENCES Roles(RoleId)
);

-- 3. Applicant Profiles
CREATE TABLE ApplicantProfiles (
    ApplicantId INT PRIMARY KEY,
    University NVARCHAR(255) NULL,
    Major NVARCHAR(150) NULL,
    StudyYear NVARCHAR(50) NULL,
    Phone NVARCHAR(20) NULL,
    Address NVARCHAR(255) NULL,
    AboutMe NVARCHAR(MAX) NULL,
    Availability NVARCHAR(MAX) NULL, -- Can store as JSON array "['Mon_AM', 'Tue_PM']"
    CvUrl NVARCHAR(MAX) NULL,
    FOREIGN KEY (ApplicantId) REFERENCES Users(UserId) 
    -- Removed ON DELETE CASCADE to enforce soft delete
);

-- 4. Applicant Experiences
CREATE TABLE ApplicantExperiences (
    ExperienceId INT IDENTITY(1,1) PRIMARY KEY,
    ApplicantId INT NOT NULL,
    Title NVARCHAR(150) NOT NULL,
    CompanyName NVARCHAR(150) NOT NULL,
    Duration NVARCHAR(100) NULL, -- e.g., "Jan 2024 - Present"
    Description NVARCHAR(MAX) NULL,
    FOREIGN KEY (ApplicantId) REFERENCES ApplicantProfiles(ApplicantId)
);

-- 5. Applicant Skills
CREATE TABLE ApplicantSkills (
    SkillId INT IDENTITY(1,1) PRIMARY KEY,
    ApplicantId INT NOT NULL,
    SkillName NVARCHAR(100) NOT NULL,
    FOREIGN KEY (ApplicantId) REFERENCES ApplicantProfiles(ApplicantId)
);

-- 6. Employer Profiles
CREATE TABLE EmployerProfiles (
    EmployerId INT PRIMARY KEY,
    CompanyName NVARCHAR(255) NOT NULL,
    ContactEmail NVARCHAR(255) NOT NULL,
    ContactPhone NVARCHAR(20) NULL,
    Address NVARCHAR(255) NULL,
    Description NVARCHAR(MAX) NULL,
    LogoUrl NVARCHAR(MAX) NULL,
    FOREIGN KEY (EmployerId) REFERENCES Users(UserId)
);

-- 7. Job Categories
CREATE TABLE JobCategories (
    CategoryId INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL UNIQUE, -- e.g., 'F&B', 'Tutoring', 'Retail'
    Description NVARCHAR(500) NULL
);

-- 8. Job Shifts
CREATE TABLE JobShifts (
    ShiftId INT IDENTITY(1,1) PRIMARY KEY,
    ShiftName NVARCHAR(50) NOT NULL UNIQUE, -- e.g., 'Morning', 'Afternoon', 'Evening', 'Weekend'
    StartTime NVARCHAR(10) NULL,
    EndTime NVARCHAR(10) NULL
);

-- 9. Job Posts
CREATE TABLE JobPosts (
    JobPostId INT IDENTITY(1,1) PRIMARY KEY,
    EmployerId INT NOT NULL,
    CategoryId INT NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    JobType NVARCHAR(50) NOT NULL, -- e.g., 'Part-time', 'Freelance', 'Internship'
    
    -- Tiền lương được cải tiến
    PayRate DECIMAL(18,2) NULL, -- Cho phép NULL nếu là Thỏa thuận
    PayUnit NVARCHAR(50) NOT NULL DEFAULT 'PerHour', -- 'PerHour', 'PerDay', 'PerMonth', 'Negotiable'
    
    -- Địa lý được chia nhỏ để dễ Filter
    City NVARCHAR(100) NULL,
    District NVARCHAR(100) NULL,
    Address NVARCHAR(255) NOT NULL, -- Số nhà, tên đường cụ thể
    
    ApplicationDeadline DATETIME NULL,
    Description NVARCHAR(MAX) NOT NULL,
    Requirements NVARCHAR(MAX) NULL,
    Benefits NVARCHAR(MAX) NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Draft', -- 'Draft', 'Published', 'Closed'
    IsDeleted BIT NOT NULL DEFAULT 0, -- Soft delete flag
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME NULL,
    FOREIGN KEY (EmployerId) REFERENCES EmployerProfiles(EmployerId),
    FOREIGN KEY (CategoryId) REFERENCES JobCategories(CategoryId)
);

-- 10. Job Post Shifts (Many-to-Many between JobPosts and JobShifts)
CREATE TABLE JobPostShifts (
    JobPostId INT NOT NULL,
    ShiftId INT NOT NULL,
    PRIMARY KEY (JobPostId, ShiftId),
    FOREIGN KEY (JobPostId) REFERENCES JobPosts(JobPostId) ON DELETE CASCADE, -- Giữ Cascade cho bảng trung gian
    FOREIGN KEY (ShiftId) REFERENCES JobShifts(ShiftId) ON DELETE CASCADE
);

-- 11. Applications
CREATE TABLE Applications (
    ApplicationId INT IDENTITY(1,1) PRIMARY KEY,
    JobPostId INT NOT NULL,
    ApplicantId INT NOT NULL,
    CoverMessage NVARCHAR(MAX) NULL,
    CvUrl NVARCHAR(MAX) NULL, -- Bổ sung link tải file CV (PDF/Word)
    Status NVARCHAR(20) NOT NULL DEFAULT 'Applied', -- 'Applied', 'Under Review', 'Accepted', 'Rejected'
    EmployerNotes NVARCHAR(MAX) NULL,
    IsDeleted BIT NOT NULL DEFAULT 0, -- Soft delete cho lịch sử ứng tuyển
    AppliedAt DATETIME DEFAULT GETDATE(),
    RespondedAt DATETIME NULL,
    FOREIGN KEY (JobPostId) REFERENCES JobPosts(JobPostId),
    FOREIGN KEY (ApplicantId) REFERENCES ApplicantProfiles(ApplicantId)
);

-- 12. Reviews
CREATE TABLE Reviews (
    ReviewId INT IDENTITY(1,1) PRIMARY KEY,
    ReviewerId INT NOT NULL, 
    RevieweeId INT NOT NULL, 
    JobPostId INT NOT NULL, 
    Rating INT NOT NULL CHECK (Rating >= 1 AND Rating <= 5),
    Comment NVARCHAR(MAX) NULL,
    IsDeleted BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ReviewerId) REFERENCES Users(UserId),
    FOREIGN KEY (RevieweeId) REFERENCES Users(UserId),
    -- Tạm bỏ FK với JobPosts hoặc để NO ACTION để tránh lỗi vòng lặp xóa
    FOREIGN KEY (JobPostId) REFERENCES JobPosts(JobPostId) 
);

-- 13. Saved Jobs (Bookmarks)
CREATE TABLE SavedJobs (
    SavedJobId INT IDENTITY(1,1) PRIMARY KEY,
    ApplicantId INT NOT NULL,
    JobPostId INT NOT NULL,
    SavedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ApplicantId) REFERENCES ApplicantProfiles(ApplicantId) ON DELETE CASCADE,
    FOREIGN KEY (JobPostId) REFERENCES JobPosts(JobPostId) ON DELETE CASCADE
);

-- 14. Notifications
CREATE TABLE Notifications (
    NotificationId INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    Message NVARCHAR(MAX) NOT NULL,
    IsRead BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);

-- 15. Messages (Chat)
CREATE TABLE Messages (
    MessageId INT IDENTITY(1,1) PRIMARY KEY,
    SenderId INT NOT NULL,
    ReceiverId INT NOT NULL,
    JobPostId INT NULL, 
    InterviewId INT NULL,
    MessageType NVARCHAR(30) NOT NULL DEFAULT 'Text',
    Content NVARCHAR(MAX) NOT NULL,
    IsRead BIT NOT NULL DEFAULT 0,
    SentAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (SenderId) REFERENCES Users(UserId),
    FOREIGN KEY (ReceiverId) REFERENCES Users(UserId),
    FOREIGN KEY (JobPostId) REFERENCES JobPosts(JobPostId)
);

-- 16. Subscriptions (Payment/Premium Plans)
CREATE TABLE Subscriptions (
    SubscriptionId INT IDENTITY(1,1) PRIMARY KEY,
    EmployerId INT NOT NULL,
    PlanName NVARCHAR(100) NOT NULL, -- e.g., 'Basic', 'Premium', 'Pro'
    Price DECIMAL(18,2) NOT NULL,
    StartDate DATETIME NOT NULL DEFAULT GETDATE(),
    EndDate DATETIME NOT NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Active', -- 'Active', 'Expired', 'Cancelled'
    FOREIGN KEY (EmployerId) REFERENCES EmployerProfiles(EmployerId)
);

-- 17. Reports (Báo xấu/vi phạm)
CREATE TABLE Reports (
    ReportId INT IDENTITY(1,1) PRIMARY KEY,
    ReporterId INT NOT NULL,
    ReportedEntityId INT NOT NULL, 
    EntityType NVARCHAR(50) NOT NULL, -- 'JobPost', 'User'
    Reason NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Resolved', 'Dismissed'
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ReporterId) REFERENCES Users(UserId)
);

-- Workforce extension: Branch -> Offer -> Employment -> Shift -> Attendance -> Payroll
IF OBJECT_ID('dbo.Branches', 'U') IS NULL
BEGIN
    CREATE TABLE Branches (
        BranchId INT IDENTITY(1,1) PRIMARY KEY,
        EmployerId INT NOT NULL,
        Name NVARCHAR(150) NOT NULL,
        Address NVARCHAR(255) NOT NULL,
        Phone NVARCHAR(20) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (EmployerId) REFERENCES EmployerProfiles(EmployerId)
    );
END;

IF OBJECT_ID('dbo.Offers', 'U') IS NULL
BEGIN
    CREATE TABLE Offers (
        OfferId INT IDENTITY(1,1) PRIMARY KEY,
        ApplicationId INT NOT NULL,
        EmployerId INT NOT NULL,
        ApplicantId INT NOT NULL,
        BranchId INT NOT NULL,
        Position NVARCHAR(150) NOT NULL,
        HourlyRate DECIMAL(18,2) NOT NULL CHECK (HourlyRate > 0),
        StartDate DATETIME NOT NULL,
        PaydayOfMonth INT NOT NULL DEFAULT 5 CHECK (PaydayOfMonth BETWEEN 1 AND 28),
        Status NVARCHAR(20) NOT NULL DEFAULT 'Sent',
        ExpiredAt DATETIME NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        AcceptedAt DATETIME NULL,
        RespondedAt DATETIME NULL,
        FOREIGN KEY (ApplicationId) REFERENCES Applications(ApplicationId),
        FOREIGN KEY (EmployerId) REFERENCES EmployerProfiles(EmployerId),
        FOREIGN KEY (ApplicantId) REFERENCES Users(UserId),
        FOREIGN KEY (BranchId) REFERENCES Branches(BranchId)
    );
END;

IF OBJECT_ID('dbo.Employments', 'U') IS NULL
BEGIN
    CREATE TABLE Employments (
        EmploymentId INT IDENTITY(1,1) PRIMARY KEY,
        EmployerId INT NOT NULL,
        EmployeeUserId INT NOT NULL,
        BranchId INT NOT NULL,
        OfferId INT NOT NULL,
        Position NVARCHAR(150) NOT NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'Active',
        StartDate DATETIME NOT NULL,
        EndDate DATETIME NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (EmployerId) REFERENCES EmployerProfiles(EmployerId),
        FOREIGN KEY (EmployeeUserId) REFERENCES Users(UserId),
        FOREIGN KEY (BranchId) REFERENCES Branches(BranchId),
        FOREIGN KEY (OfferId) REFERENCES Offers(OfferId)
    );
END;

IF OBJECT_ID('dbo.EmployeeRates', 'U') IS NULL
BEGIN
    CREATE TABLE EmployeeRates (
        EmployeeRateId INT IDENTITY(1,1) PRIMARY KEY,
        EmploymentId INT NOT NULL,
        HourlyRate DECIMAL(18,2) NOT NULL CHECK (HourlyRate > 0),
        EffectiveFrom DATETIME NOT NULL,
        EffectiveTo DATETIME NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (EmploymentId) REFERENCES Employments(EmploymentId)
    );
END;

IF OBJECT_ID('dbo.WorkShifts', 'U') IS NULL
BEGIN
    CREATE TABLE WorkShifts (
        WorkShiftId INT IDENTITY(1,1) PRIMARY KEY,
        EmployerId INT NOT NULL,
        BranchId INT NOT NULL,
        Title NVARCHAR(150) NOT NULL,
        StartTime DATETIME NOT NULL,
        EndTime DATETIME NOT NULL,
        RequiredRole NVARCHAR(100) NULL,
        RequiredPeople INT NOT NULL DEFAULT 1 CHECK (RequiredPeople > 0),
        Status NVARCHAR(20) NOT NULL DEFAULT 'Published',
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (EmployerId) REFERENCES EmployerProfiles(EmployerId),
        FOREIGN KEY (BranchId) REFERENCES Branches(BranchId),
        CHECK (EndTime > StartTime)
    );
END;

IF OBJECT_ID('dbo.ShiftAssignments', 'U') IS NULL
BEGIN
    CREATE TABLE ShiftAssignments (
        ShiftAssignmentId INT IDENTITY(1,1) PRIMARY KEY,
        WorkShiftId INT NOT NULL,
        EmploymentId INT NOT NULL,
        EmployeeUserId INT NOT NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'Assigned',
        AssignedAt DATETIME NOT NULL DEFAULT GETDATE(),
        TransferredFromAssignmentId INT NULL,
        FOREIGN KEY (WorkShiftId) REFERENCES WorkShifts(WorkShiftId),
        FOREIGN KEY (EmploymentId) REFERENCES Employments(EmploymentId),
        FOREIGN KEY (EmployeeUserId) REFERENCES Users(UserId)
    );
END;

IF OBJECT_ID('dbo.Interviews', 'U') IS NULL
BEGIN
    CREATE TABLE Interviews (
        InterviewId INT IDENTITY(1,1) PRIMARY KEY,
        ApplicationId INT NOT NULL,
        EmployerId INT NOT NULL,
        ApplicantId INT NOT NULL,
        ScheduledAt DATETIME NOT NULL,
        Location NVARCHAR(255) NOT NULL,
        Note NVARCHAR(MAX) NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'Scheduled',
        Result NVARCHAR(20) NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NULL,
        FOREIGN KEY (ApplicationId) REFERENCES Applications(ApplicationId),
        FOREIGN KEY (EmployerId) REFERENCES EmployerProfiles(EmployerId),
        FOREIGN KEY (ApplicantId) REFERENCES Users(UserId)
    );
END;

IF COL_LENGTH('dbo.Messages', 'MessageType') IS NULL
BEGIN
    ALTER TABLE dbo.Messages
    ADD MessageType NVARCHAR(30) NOT NULL
        CONSTRAINT DF_Messages_MessageType DEFAULT 'Text';
END;

IF COL_LENGTH('dbo.Messages', 'InterviewId') IS NULL
BEGIN
    ALTER TABLE dbo.Messages ADD InterviewId INT NULL;
END;

IF OBJECT_ID('dbo.Messages', 'U') IS NOT NULL
   AND OBJECT_ID('dbo.Interviews', 'U') IS NOT NULL
   AND NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE name = 'FK_Messages_Interviews_InterviewId'
          AND parent_object_id = OBJECT_ID('dbo.Messages')
   )
BEGIN
    ALTER TABLE dbo.Messages
    ADD CONSTRAINT FK_Messages_Interviews_InterviewId
    FOREIGN KEY (InterviewId) REFERENCES dbo.Interviews(InterviewId);
END;

IF OBJECT_ID('dbo.ShiftPassRequests', 'U') IS NULL
BEGIN
    CREATE TABLE ShiftPassRequests (
        ShiftPassRequestId INT IDENTITY(1,1) PRIMARY KEY,
        ShiftAssignmentId INT NOT NULL,
        WorkShiftId INT NOT NULL,
        FromEmployeeUserId INT NOT NULL,
        ToEmployeeUserId INT NOT NULL,
        BranchId INT NOT NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
        RequestedAt DATETIME NOT NULL DEFAULT GETDATE(),
        RespondedAt DATETIME NULL,
        ExpiresAt DATETIME NOT NULL,
        Reason NVARCHAR(MAX) NULL,
        FOREIGN KEY (ShiftAssignmentId) REFERENCES ShiftAssignments(ShiftAssignmentId),
        FOREIGN KEY (WorkShiftId) REFERENCES WorkShifts(WorkShiftId),
        FOREIGN KEY (FromEmployeeUserId) REFERENCES Users(UserId),
        FOREIGN KEY (ToEmployeeUserId) REFERENCES Users(UserId),
        FOREIGN KEY (BranchId) REFERENCES Branches(BranchId)
    );
END;

IF OBJECT_ID('dbo.AttendanceRecords', 'U') IS NULL
BEGIN
    CREATE TABLE AttendanceRecords (
        AttendanceRecordId INT IDENTITY(1,1) PRIMARY KEY,
        ShiftAssignmentId INT NOT NULL,
        EmployeeUserId INT NOT NULL,
        CheckInAt DATETIME NULL,
        CheckOutAt DATETIME NULL,
        WorkedMinutes INT NOT NULL DEFAULT 0,
        Status NVARCHAR(20) NOT NULL DEFAULT 'NotStarted',
        ApprovedByEmployerId INT NULL,
        ApprovedAt DATETIME NULL,
        Note NVARCHAR(MAX) NULL,
        FOREIGN KEY (ShiftAssignmentId) REFERENCES ShiftAssignments(ShiftAssignmentId),
        FOREIGN KEY (EmployeeUserId) REFERENCES Users(UserId)
    );
END;

IF OBJECT_ID('dbo.PayrollPeriods', 'U') IS NULL
BEGIN
    CREATE TABLE PayrollPeriods (
        PayrollPeriodId INT IDENTITY(1,1) PRIMARY KEY,
        EmployerId INT NOT NULL,
        Month INT NOT NULL CHECK (Month BETWEEN 1 AND 12),
        Year INT NOT NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'Draft',
        Payday DATETIME NOT NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        LockedAt DATETIME NULL,
        PaidAt DATETIME NULL,
        FOREIGN KEY (EmployerId) REFERENCES EmployerProfiles(EmployerId),
        CONSTRAINT UQ_PayrollPeriods_Employer_Month_Year UNIQUE (EmployerId, Month, Year)
    );
END;

IF OBJECT_ID('dbo.PayrollItems', 'U') IS NULL
BEGIN
    CREATE TABLE PayrollItems (
        PayrollItemId INT IDENTITY(1,1) PRIMARY KEY,
        PayrollPeriodId INT NOT NULL,
        EmploymentId INT NOT NULL,
        EmployeeUserId INT NOT NULL,
        TotalApprovedMinutes INT NOT NULL DEFAULT 0,
        HourlyRateSnapshot DECIMAL(18,2) NOT NULL DEFAULT 0,
        BaseSalary DECIMAL(18,2) NOT NULL DEFAULT 0,
        Bonus DECIMAL(18,2) NOT NULL DEFAULT 0,
        Penalty DECIMAL(18,2) NOT NULL DEFAULT 0,
        Deduction DECIMAL(18,2) NOT NULL DEFAULT 0,
        FinalSalary DECIMAL(18,2) NOT NULL DEFAULT 0,
        Status NVARCHAR(20) NOT NULL DEFAULT 'Draft',
        FOREIGN KEY (PayrollPeriodId) REFERENCES PayrollPeriods(PayrollPeriodId),
        FOREIGN KEY (EmploymentId) REFERENCES Employments(EmploymentId),
        FOREIGN KEY (EmployeeUserId) REFERENCES Users(UserId)
    );
END;

-- =========================================================================================
-- INITIAL DATA SEEDING (OPTIONAL QUICK START)
-- =========================================================================================

INSERT INTO Roles (RoleName) VALUES ('Admin'), ('Employer'), ('Applicant');

INSERT INTO JobCategories (Name, Description) VALUES 
('Food & Beverage', 'Cafe, restaurants, bars'),
('Tutoring', 'Academic and skill tutoring'),
('Delivery', 'Food and parcel delivery services'),
('Retail', 'Stores, sales assistants'),
('Marketing', 'Digital marketing, promoters'),
('Creative', 'Design, photography, writing'),
('Office', 'Data entry, admin assistants');

INSERT INTO JobShifts (ShiftName, StartTime, EndTime) VALUES
('Morning', '08:00', '12:00'),
('Afternoon', '13:00', '17:00'),
('Evening', '18:00', '22:00'),
('Weekend', NULL, NULL);

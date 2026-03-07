-- =========================================================================================
-- WORKBRIDGE DATABASE SCHEMA SCRIPT (V2 - OPTIMIZED FOR PRODUCTION)
-- =========================================================================================

-- Create Database
-- CREATE DATABASE WorkBridgeDB;
-- GO
-- USE WorkBridgeDB;
-- GO

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
    ShiftName NVARCHAR(50) NOT NULL UNIQUE -- e.g., 'Morning', 'Afternoon', 'Evening', 'Weekend'
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
    Status NVARCHAR(20) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
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

INSERT INTO JobShifts (ShiftName) VALUES ('Morning'), ('Afternoon'), ('Evening'), ('Weekend');


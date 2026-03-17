-- =========================================================================================
-- WORKBRIDGE DATABASE SCHEMA SCRIPT (V4 - CLEAN SEEDING)
-- =========================================================================================

USE master;
GO

-- Drop Database if exists to start fresh
IF EXISTS (SELECT name FROM sys.databases WHERE name = N'WorkBridgeDB')
BEGIN
    ALTER DATABASE WorkBridgeDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE WorkBridgeDB;
END
GO

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
    RoleName NVARCHAR(50) NOT NULL UNIQUE
);

-- 2. Users Table
CREATE TABLE Users (
    UserId INT IDENTITY(1,1) PRIMARY KEY,
    RoleId INT NOT NULL,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    FullName NVARCHAR(150) NOT NULL,
    AvatarUrl NVARCHAR(MAX) NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Active',
    IsDeleted BIT NOT NULL DEFAULT 0,
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
    Availability NVARCHAR(MAX) NULL,
    CvUrl NVARCHAR(MAX) NULL,
    FOREIGN KEY (ApplicantId) REFERENCES Users(UserId)
);

-- 4. Applicant Experiences
CREATE TABLE ApplicantExperiences (
    ExperienceId INT IDENTITY(1,1) PRIMARY KEY,
    ApplicantId INT NOT NULL,
    Title NVARCHAR(150) NOT NULL,
    CompanyName NVARCHAR(150) NOT NULL,
    Duration NVARCHAR(100) NULL,
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
    Name NVARCHAR(100) NOT NULL UNIQUE,
    IconName NVARCHAR(100) NULL,
    Description NVARCHAR(500) NULL
);

-- 8. Job Shifts
CREATE TABLE JobShifts (
    ShiftId INT IDENTITY(1,1) PRIMARY KEY,
    ShiftName NVARCHAR(50) NOT NULL UNIQUE,
    StartTime NVARCHAR(10) NULL,
    EndTime NVARCHAR(10) NULL
);

-- 9. Job Posts
CREATE TABLE JobPosts (
    JobPostId INT IDENTITY(1,1) PRIMARY KEY,
    EmployerId INT NOT NULL,
    CategoryId INT NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    JobType NVARCHAR(50) NOT NULL,
    PayRate DECIMAL(18,2) NULL,
    PayUnit NVARCHAR(50) NOT NULL DEFAULT 'PerHour',
    City NVARCHAR(100) NULL,
    District NVARCHAR(100) NULL,
    Address NVARCHAR(255) NOT NULL,
    ApplicationDeadline DATETIME NULL,
    Description NVARCHAR(MAX) NOT NULL,
    Requirements NVARCHAR(MAX) NULL,
    Benefits NVARCHAR(MAX) NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Draft',
    IsTrending BIT NOT NULL DEFAULT 0,
    Tag NVARCHAR(50) NULL,
    IsDeleted BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME NULL,
    FOREIGN KEY (EmployerId) REFERENCES EmployerProfiles(EmployerId),
    FOREIGN KEY (CategoryId) REFERENCES JobCategories(CategoryId)
);

-- 10. Job Post Shifts
CREATE TABLE JobPostShifts (
    JobPostId INT NOT NULL,
    ShiftId INT NOT NULL,
    PRIMARY KEY (JobPostId, ShiftId),
    FOREIGN KEY (JobPostId) REFERENCES JobPosts(JobPostId) ON DELETE CASCADE,
    FOREIGN KEY (ShiftId) REFERENCES JobShifts(ShiftId) ON DELETE CASCADE
);

-- 11. Applications
CREATE TABLE Applications (
    ApplicationId INT IDENTITY(1,1) PRIMARY KEY,
    JobPostId INT NOT NULL,
    ApplicantId INT NOT NULL,
    CoverMessage NVARCHAR(MAX) NULL,
    CvUrl NVARCHAR(MAX) NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
    EmployerNotes NVARCHAR(MAX) NULL,
    IsDeleted BIT NOT NULL DEFAULT 0,
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
    FOREIGN KEY (JobPostId) REFERENCES JobPosts(JobPostId) 
);

-- 13. Saved Jobs
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

-- 15. Messages
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

-- 16. Subscriptions
CREATE TABLE Subscriptions (
    SubscriptionId INT IDENTITY(1,1) PRIMARY KEY,
    EmployerId INT NOT NULL,
    PlanName NVARCHAR(100) NOT NULL,
    Price DECIMAL(18,2) NOT NULL,
    StartDate DATETIME NOT NULL DEFAULT GETDATE(),
    EndDate DATETIME NOT NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Active',
    FOREIGN KEY (EmployerId) REFERENCES EmployerProfiles(EmployerId)
);

-- 17. Reports
CREATE TABLE Reports (
    ReportId INT IDENTITY(1,1) PRIMARY KEY,
    ReporterId INT NOT NULL,
    ReportedEntityId INT NOT NULL, 
    EntityType NVARCHAR(50) NOT NULL,
    Reason NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ReporterId) REFERENCES Users(UserId)
);

-- =========================================================================================
-- INITIAL DATA SEEDING (LOOKUP DATA ONLY)
-- =========================================================================================

-- Roles
INSERT INTO Roles (RoleName) VALUES ('Admin'), ('Employer'), ('Applicant');

-- Categories
INSERT INTO JobCategories (Name, IconName, Description) VALUES 
('Food & Beverage', 'restaurant', 'Cafe, restaurants, bars'),
('Creative Tech', 'code', 'Design, development, and tech roles'),
('Education', 'school', 'Academic and skill tutoring'),
('Delivery Service', 'local_shipping', 'Food and parcel delivery services'),
('Retail', 'store', 'Stores, sales assistants'),
('Marketing', 'trending_up', 'Digital marketing, promoters'),
('Office', 'work', 'Data entry, admin assistants');

-- Shifts
INSERT INTO JobShifts (ShiftName, StartTime, EndTime) VALUES 
('Morning', '08:00', '12:00'),
('Afternoon', '13:00', '17:00'),
('Evening', '18:00', '22:00'),
('Weekend', '08:00', '20:00');

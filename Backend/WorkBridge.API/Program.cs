using Microsoft.EntityFrameworkCore;
using WorkBridge.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.FileProviders;
using WorkBridge.API.Services;
using WorkBridge.API.Hubs;
using WorkBridge.Application.Interfaces;
using WorkBridge.Application.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new UtcDateTimeConverter());
        options.JsonSerializerOptions.Converters.Add(new NullableUtcDateTimeConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add SignalR
builder.Services.AddSignalR();

var allowedOrigins = builder.Configuration["Cors:AllowedOrigins"]?
    .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    .Select(origin => origin.TrimEnd('/'))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

if (allowedOrigins == null || allowedOrigins.Length == 0)
{
    allowedOrigins = [
        "http://localhost:5173",
        "https://localhost:5173",
        "http://127.0.0.1:5173",
        "https://127.0.0.1:5173",
        "https://work-bridge-project.vercel.app"
    ];
}

// Configure CORS — must AllowCredentials for SignalR WebSocket auth
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy =>
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials(); // Required for SignalR
        });
});

// Configure EF Core DbContext
builder.Services.AddDbContext<WorkBridgeContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Register custom services
builder.Services.AddScoped<WorkBridge.Application.Services.IAuthService, WorkBridge.Application.Services.AuthService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IProfileService, WorkBridge.Application.Services.ProfileService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IJobService, WorkBridge.Application.Services.JobService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IEmployerService, WorkBridge.Application.Services.EmployerService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IApplicationService, WorkBridge.Application.Services.ApplicationService>();
builder.Services.AddScoped<WorkBridge.Application.Services.ISavedJobService, WorkBridge.Application.Services.SavedJobService>();
builder.Services.AddSingleton<WorkBridge.Application.Services.IEmailQueue, WorkBridge.Application.Services.InMemoryEmailQueue>();
builder.Services.AddScoped<WorkBridge.Application.Services.IEmailService, WorkBridge.Application.Services.SmtpEmailService>();
builder.Services.AddScoped<WorkBridge.Application.Services.INotificationService, WorkBridge.Application.Services.NotificationService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IMessageService, WorkBridge.Application.Services.MessageService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IAdminService, WorkBridge.Application.Services.AdminService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IReviewService, WorkBridge.Application.Services.ReviewService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IReportService, WorkBridge.Application.Services.ReportService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IBranchService, WorkBridge.Application.Services.BranchService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IOfferService, WorkBridge.Application.Services.OfferService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IWorkforceService, WorkBridge.Application.Services.WorkforceService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IInterviewService, WorkBridge.Application.Services.InterviewService>();
builder.Services.AddScoped<WorkBridge.Application.Services.ICvPdfService, WorkBridge.Application.Services.CvPdfService>();
builder.Services.AddScoped<WorkBridge.Application.Services.ICvAiService, WorkBridge.Application.Services.CvAiService>();
builder.Services.AddScoped<WorkBridge.Application.Services.ISubscriptionPaymentService, WorkBridge.Application.Services.SubscriptionPaymentService>();
builder.Services.AddSingleton<WorkBridge.Application.Services.IGeminiService, WorkBridge.Application.Services.OpenAiService>();
builder.Services.AddSingleton(provider => {
    var config = provider.GetRequiredService<IConfiguration>();
    var payOSSection = config.GetSection("PayOS");
    return new WorkBridge.Application.Services.PayOSHelper(
        payOSSection["ClientId"]!,
        payOSSection["ApiKey"]!,
        payOSSection["ChecksumKey"]!
    );
});
builder.Services.AddSingleton<WorkBridge.Application.Services.IPayOSClient>(provider =>
    provider.GetRequiredService<WorkBridge.Application.Services.PayOSHelper>());
builder.Services.AddScoped<WorkBridge.Application.Interfaces.IWorkBridgeContext>(provider =>
    provider.GetRequiredService<WorkBridgeContext>());
builder.Services.AddHostedService<ShiftPassExpiryHostedService>();
builder.Services.AddHostedService<EmailDispatchHostedService>();
builder.Services.AddHostedService<SubscriptionPaymentExpiryHostedService>();
builder.Services.AddHostedService<ShiftRegistrationAutoPublishHostedService>();
builder.Services.AddHostedService<ShiftRegistrationFinalizeHostedService>();
builder.Services.AddSingleton<HomePresenceService>();

// Register HubNotifier — bridges Application services to SignalR Hub
builder.Services.AddScoped<IHubNotifier, HubNotifier>();

// Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = Encoding.UTF8.GetBytes(jwtSettings["Secret"]!);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(secretKey)
    };

    // Allow SignalR to pass the JWT token via query string (WebSocket upgrade)
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        },
        OnTokenValidated = async context =>
        {
            var rawUserId = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? context.Principal?.FindFirstValue(JwtRegisteredClaimNames.Sub);

            if (!int.TryParse(rawUserId, out var userId))
            {
                context.Fail("Invalid user token.");
                return;
            }

            var db = context.HttpContext.RequestServices.GetRequiredService<WorkBridgeContext>();
            var user = await db.Users
                .AsNoTracking()
                .Where(u => u.UserId == userId)
                .Select(u => new { u.IsDeleted, u.Status })
                .FirstOrDefaultAsync();

            if (user == null || user.IsDeleted || !string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase))
            {
                context.Fail("Account is locked or inactive.");
            }
        }
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReactApp");

var runtimeUploadsRoot = UploadStorage.ResolveUploadsRoot(app.Environment.ContentRootPath);
Directory.CreateDirectory(runtimeUploadsRoot);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(runtimeUploadsRoot),
    RequestPath = "/uploads",
    OnPrepareResponse = context =>
    {
        var origin = context.Context.Request.Headers.Origin.ToString().TrimEnd('/');
        if (!string.IsNullOrWhiteSpace(origin) &&
            allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
        {
            context.Context.Response.Headers["Access-Control-Allow-Origin"] = origin;
            context.Context.Response.Headers["Access-Control-Allow-Credentials"] = "true";
            context.Context.Response.Headers["Vary"] = "Origin";
        }
    }
});

app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = context =>
    {
        var origin = context.Context.Request.Headers.Origin.ToString().TrimEnd('/');
        if (!string.IsNullOrWhiteSpace(origin) &&
            allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
        {
            context.Context.Response.Headers["Access-Control-Allow-Origin"] = origin;
            context.Context.Response.Headers["Access-Control-Allow-Credentials"] = "true";
            context.Context.Response.Headers["Vary"] = "Origin";
        }
    }
});

app.UseAuthentication();
app.UseAuthorization();

app.Use(async (httpContext, next) =>
{
    var path = httpContext.Request.Path;
    if (!path.StartsWithSegments("/api") ||
        string.Equals(httpContext.Request.Method, "OPTIONS", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWithSegments("/api/platform/maintenance") ||
        path.StartsWithSegments("/api/platform/admin") ||
        path.StartsWithSegments("/api/auth/login") ||
        path.StartsWithSegments("/api/auth/google") ||
        httpContext.User.IsInRole("Admin"))
    {
        await next();
        return;
    }

    var db = httpContext.RequestServices.GetRequiredService<WorkBridgeContext>();
    var now = DateTime.UtcNow;
    var setting = await db.PlatformMaintenanceSettings
        .AsNoTracking()
        .FirstOrDefaultAsync(item => item.PlatformMaintenanceSettingId == 1);

    var isActive = setting?.IsEnabled == true &&
        (!setting.EndsAtUtc.HasValue || setting.EndsAtUtc.Value > now);

    if (!isActive)
    {
        await next();
        return;
    }

    var remainingSeconds = setting!.EndsAtUtc.HasValue
        ? Math.Max(0, (int)Math.Ceiling((setting.EndsAtUtc.Value - now).TotalSeconds))
        : (int?)null;

    httpContext.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
    httpContext.Response.ContentType = "application/json; charset=utf-8";
    await httpContext.Response.WriteAsJsonAsync(new
    {
        message = "WorkBridge đang bảo trì. Vui lòng quay lại sau ít phút.",
        maintenance = new
        {
            isActive = true,
            isEnabled = setting.IsEnabled,
            title = setting.Title,
            message = setting.Message,
            startedAtUtc = setting.StartedAtUtc,
            endsAtUtc = setting.EndsAtUtc,
            remainingSeconds,
            updatedBy = setting.UpdatedBy,
            updatedAtUtc = setting.UpdatedAtUtc
        }
    });
});

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// Map the SignalR hub endpoint
app.MapHub<WorkBridgeHub>("/hubs/workbridge");
app.MapHub<HomePresenceHub>("/hubs/presence");

// Seed Admin, Employer, and Applicant users if they do not exist
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<WorkBridgeContext>();

    // Ensure ShiftRegistrationWindows and other tables are created if missing
    try
    {
        // Automatically apply any pending EF Core migrations on startup
        context.Database.Migrate();

        context.Database.ExecuteSqlRaw(@"
            IF OBJECT_ID('dbo.ShiftRegistrationWindows', 'U') IS NULL
            BEGIN
                CREATE TABLE ShiftRegistrationWindows (
                    ShiftRegistrationWindowId INT IDENTITY(1,1) PRIMARY KEY,
                    EmployerId INT NOT NULL,
                    BranchId INT NOT NULL,
                    WeekStartDate DATETIME NOT NULL,
                    OpenAt DATETIME NOT NULL,
                    CloseAt DATETIME NOT NULL,
                    Status NVARCHAR(20) NOT NULL DEFAULT 'Open',
                    MinFixedShifts INT NOT NULL DEFAULT 3,
                    PublishedAt DATETIME NOT NULL DEFAULT GETDATE(),
                    FinalizedAt DATETIME NULL,
                    FOREIGN KEY (EmployerId) REFERENCES EmployerProfiles(EmployerId),
                    FOREIGN KEY (BranchId) REFERENCES Branches(BranchId),
                    CONSTRAINT UQ_ShiftRegistrationWindows_Employer_Branch_Week UNIQUE (EmployerId, BranchId, WeekStartDate)
                );
            END
        ");

        context.Database.ExecuteSqlRaw(@"
            IF COL_LENGTH('dbo.WorkShifts', 'RegistrationWindowId') IS NULL
            BEGIN
                ALTER TABLE dbo.WorkShifts ADD RegistrationWindowId INT NULL;
            END
        ");

        context.Database.ExecuteSqlRaw(@"
            IF OBJECT_ID('dbo.WorkShifts', 'U') IS NOT NULL
               AND OBJECT_ID('dbo.ShiftRegistrationWindows', 'U') IS NOT NULL
               AND NOT EXISTS (
                    SELECT 1 FROM sys.foreign_keys
                    WHERE name = 'FK_WorkShifts_ShiftRegistrationWindows_RegistrationWindowId'
                      AND parent_object_id = OBJECT_ID('dbo.WorkShifts')
               )
            BEGIN
                ALTER TABLE dbo.WorkShifts
                ADD CONSTRAINT FK_WorkShifts_ShiftRegistrationWindows_RegistrationWindowId
                FOREIGN KEY (RegistrationWindowId) REFERENCES dbo.ShiftRegistrationWindows(ShiftRegistrationWindowId);
            END
        ");

        context.Database.ExecuteSqlRaw(@"
            IF OBJECT_ID('dbo.SubscriptionPlans', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.SubscriptionPlans (
                    SubscriptionPlanId INT IDENTITY(1,1) PRIMARY KEY,
                    Audience NVARCHAR(20) NOT NULL,
                    Code NVARCHAR(50) NOT NULL,
                    Name NVARCHAR(120) NOT NULL,
                    Description NVARCHAR(500) NULL,
                    DurationDays INT NOT NULL,
                    Price DECIMAL(18,2) NOT NULL,
                    Currency NVARCHAR(10) NOT NULL DEFAULT 'VND',
                    IsActive BIT NOT NULL DEFAULT 1,
                    SortOrder INT NOT NULL DEFAULT 0,
                    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                    UpdatedAt DATETIME NULL,
                    CONSTRAINT UQ_SubscriptionPlans_Audience_Code UNIQUE (Audience, Code)
                );
            END
        ");

        context.Database.ExecuteSqlRaw(@"
            IF OBJECT_ID('dbo.Subscriptions', 'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH('dbo.Subscriptions', 'UserId') IS NULL
                BEGIN
                    ALTER TABLE dbo.Subscriptions ADD UserId INT NULL;
                END

                IF COL_LENGTH('dbo.Subscriptions', 'Audience') IS NULL
                BEGIN
                    ALTER TABLE dbo.Subscriptions ADD Audience NVARCHAR(20) NULL;
                END

                IF COL_LENGTH('dbo.Subscriptions', 'SubscriptionPlanId') IS NULL
                BEGIN
                    ALTER TABLE dbo.Subscriptions ADD SubscriptionPlanId INT NULL;
                END

                IF COL_LENGTH('dbo.Subscriptions', 'PaymentOrderCode') IS NULL
                BEGIN
                    ALTER TABLE dbo.Subscriptions ADD PaymentOrderCode BIGINT NULL;
                END

                IF COL_LENGTH('dbo.Subscriptions', 'PaymentPayloadJson') IS NULL
                BEGIN
                    ALTER TABLE dbo.Subscriptions ADD PaymentPayloadJson NVARCHAR(MAX) NULL;
                END

                IF EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE object_id = OBJECT_ID('dbo.Subscriptions')
                      AND name = 'EmployerId'
                      AND is_nullable = 0
                )
                BEGIN
                    ALTER TABLE dbo.Subscriptions ALTER COLUMN EmployerId INT NULL;
                END

                UPDATE dbo.Subscriptions
                SET Audience = 'Employer'
                WHERE Audience IS NULL;

                UPDATE dbo.Subscriptions
                SET UserId = EmployerId
                WHERE UserId IS NULL AND EmployerId IS NOT NULL;
            END
        ");

        context.Database.ExecuteSqlRaw(@"
            IF OBJECT_ID('dbo.Subscriptions', 'U') IS NOT NULL
               AND COL_LENGTH('dbo.Subscriptions', 'UserId') IS NOT NULL
               AND NOT EXISTS (
                    SELECT 1 FROM sys.foreign_keys
                    WHERE name = 'FK_Subscriptions_Users_UserId'
                      AND parent_object_id = OBJECT_ID('dbo.Subscriptions')
               )
            BEGIN
                ALTER TABLE dbo.Subscriptions
                ADD CONSTRAINT FK_Subscriptions_Users_UserId
                FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId);
            END
        ");

        context.Database.ExecuteSqlRaw(@"
            IF OBJECT_ID('dbo.Subscriptions', 'U') IS NOT NULL
               AND OBJECT_ID('dbo.SubscriptionPlans', 'U') IS NOT NULL
               AND COL_LENGTH('dbo.Subscriptions', 'SubscriptionPlanId') IS NOT NULL
               AND NOT EXISTS (
                    SELECT 1 FROM sys.foreign_keys
                    WHERE name = 'FK_Subscriptions_SubscriptionPlans_SubscriptionPlanId'
                      AND parent_object_id = OBJECT_ID('dbo.Subscriptions')
               )
            BEGIN
                ALTER TABLE dbo.Subscriptions
                ADD CONSTRAINT FK_Subscriptions_SubscriptionPlans_SubscriptionPlanId
                FOREIGN KEY (SubscriptionPlanId) REFERENCES dbo.SubscriptionPlans(SubscriptionPlanId);
            END
        ");

        context.Database.ExecuteSqlRaw(@"
            IF OBJECT_ID('dbo.SubscriptionPlans', 'U') IS NOT NULL
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM dbo.SubscriptionPlans WHERE Audience = 'Applicant' AND Code = 'applicant_7d')
                    INSERT INTO dbo.SubscriptionPlans (Audience, Code, Name, Description, DurationDays, Price, Currency, IsActive, SortOrder)
                    VALUES ('Applicant', 'applicant_7d', N'VIP Cá nhân 7 ngày', N'Mở khóa WorkBridge AI, gợi ý việc làm và đánh giá CV trong 7 ngày.', 7, 19000, 'VND', 1, 10);

                IF NOT EXISTS (SELECT 1 FROM dbo.SubscriptionPlans WHERE Audience = 'Applicant' AND Code = 'applicant_30d')
                    INSERT INTO dbo.SubscriptionPlans (Audience, Code, Name, Description, DurationDays, Price, Currency, IsActive, SortOrder)
                    VALUES ('Applicant', 'applicant_30d', N'VIP Cá nhân 1 tháng', N'Gói dễ tiếp cận cho AI tìm việc, CV và phỏng vấn với chi phí thấp.', 30, 49000, 'VND', 1, 20);

                IF NOT EXISTS (SELECT 1 FROM dbo.SubscriptionPlans WHERE Audience = 'Applicant' AND Code = 'applicant_365d')
                    INSERT INTO dbo.SubscriptionPlans (Audience, Code, Name, Description, DurationDays, Price, Currency, IsActive, SortOrder)
                    VALUES ('Applicant', 'applicant_365d', N'VIP Cá nhân 1 năm', N'Tiết kiệm nhất cho ứng viên dùng AI WorkBridge dài hạn.', 365, 399000, 'VND', 1, 30);

                IF NOT EXISTS (SELECT 1 FROM dbo.SubscriptionPlans WHERE Audience = 'Employer' AND Code = 'employer_7d')
                    INSERT INTO dbo.SubscriptionPlans (Audience, Code, Name, Description, DurationDays, Price, Currency, IsActive, SortOrder)
                    VALUES ('Employer', 'employer_7d', N'VIP Doanh nghiệp 7 ngày', N'Trải nghiệm AI tuyển dụng, xếp ca và tính lương trong 7 ngày.', 7, 69000, 'VND', 1, 40);

                IF NOT EXISTS (SELECT 1 FROM dbo.SubscriptionPlans WHERE Audience = 'Employer' AND Code = 'employer_30d')
                    INSERT INTO dbo.SubscriptionPlans (Audience, Code, Name, Description, DurationDays, Price, Currency, IsActive, SortOrder)
                    VALUES ('Employer', 'employer_30d', N'VIP Doanh nghiệp 1 tháng', N'Gói vận hành hằng tháng cho tuyển dụng, xếp ca và bảng lương AI.', 30, 149000, 'VND', 1, 50);

                IF NOT EXISTS (SELECT 1 FROM dbo.SubscriptionPlans WHERE Audience = 'Employer' AND Code = 'employer_365d')
                    INSERT INTO dbo.SubscriptionPlans (Audience, Code, Name, Description, DurationDays, Price, Currency, IsActive, SortOrder)
                    VALUES ('Employer', 'employer_365d', N'VIP Doanh nghiệp 1 năm', N'Tự động xuất bản tin tuyển dụng không cần admin duyệt, kèm AI vận hành dài hạn.', 365, 1190000, 'VND', 1, 60);

                UPDATE dbo.SubscriptionPlans
                SET IsActive = 0, UpdatedAt = GETDATE()
                WHERE DurationDays NOT IN (7, 30, 365);
            END
        ");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error running schema setup: {ex.Message}");
    }

    void RunSubscriptionSchemaSql(string sql)
    {
        try
        {
            context.Database.ExecuteSqlRaw(sql);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Subscription Schema] {ex.Message}");
        }
    }

    RunSubscriptionSchemaSql(@"
        IF OBJECT_ID('dbo.SubscriptionPlans', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.SubscriptionPlans (
                SubscriptionPlanId INT IDENTITY(1,1) PRIMARY KEY,
                Audience NVARCHAR(20) NOT NULL,
                Code NVARCHAR(50) NOT NULL,
                Name NVARCHAR(120) NOT NULL,
                Description NVARCHAR(500) NULL,
                DurationDays INT NOT NULL,
                Price DECIMAL(18,2) NOT NULL,
                Currency NVARCHAR(10) NOT NULL DEFAULT 'VND',
                IsActive BIT NOT NULL DEFAULT 1,
                SortOrder INT NOT NULL DEFAULT 0,
                CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                UpdatedAt DATETIME NULL,
                CONSTRAINT UQ_SubscriptionPlans_Audience_Code UNIQUE (Audience, Code)
            );
        END
    ");

    RunSubscriptionSchemaSql(@"
        IF OBJECT_ID('dbo.Subscriptions', 'U') IS NOT NULL
        BEGIN
            IF COL_LENGTH('dbo.Subscriptions', 'UserId') IS NULL
                ALTER TABLE dbo.Subscriptions ADD UserId INT NULL;

            IF COL_LENGTH('dbo.Subscriptions', 'Audience') IS NULL
                ALTER TABLE dbo.Subscriptions ADD Audience NVARCHAR(20) NULL;

            IF COL_LENGTH('dbo.Subscriptions', 'SubscriptionPlanId') IS NULL
                ALTER TABLE dbo.Subscriptions ADD SubscriptionPlanId INT NULL;

            IF COL_LENGTH('dbo.Subscriptions', 'PaymentOrderCode') IS NULL
                ALTER TABLE dbo.Subscriptions ADD PaymentOrderCode BIGINT NULL;

            IF COL_LENGTH('dbo.Subscriptions', 'PaymentPayloadJson') IS NULL
                ALTER TABLE dbo.Subscriptions ADD PaymentPayloadJson NVARCHAR(MAX) NULL;
        END
    ");

    RunSubscriptionSchemaSql(@"
        IF OBJECT_ID('dbo.Subscriptions', 'U') IS NOT NULL
           AND COL_LENGTH('dbo.Subscriptions', 'UserId') IS NOT NULL
           AND COL_LENGTH('dbo.Subscriptions', 'Audience') IS NOT NULL
        BEGIN
            UPDATE dbo.Subscriptions
            SET Audience = 'Employer'
            WHERE Audience IS NULL;

            UPDATE dbo.Subscriptions
            SET UserId = EmployerId
            WHERE UserId IS NULL AND EmployerId IS NOT NULL;
        END
    ");

    RunSubscriptionSchemaSql(@"
        IF OBJECT_ID('dbo.Subscriptions', 'U') IS NOT NULL
           AND EXISTS (
                SELECT 1 FROM sys.columns
                WHERE object_id = OBJECT_ID('dbo.Subscriptions')
                  AND name = 'EmployerId'
                  AND is_nullable = 0
           )
        BEGIN
            ALTER TABLE dbo.Subscriptions ALTER COLUMN EmployerId INT NULL;
        END
    ");

    RunSubscriptionSchemaSql(@"
        IF OBJECT_ID('dbo.Subscriptions', 'U') IS NOT NULL
           AND COL_LENGTH('dbo.Subscriptions', 'UserId') IS NOT NULL
           AND NOT EXISTS (
                SELECT 1 FROM sys.foreign_keys
                WHERE name = 'FK_Subscriptions_Users_UserId'
                  AND parent_object_id = OBJECT_ID('dbo.Subscriptions')
           )
        BEGIN
            ALTER TABLE dbo.Subscriptions
            ADD CONSTRAINT FK_Subscriptions_Users_UserId
            FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId);
        END
    ");

    RunSubscriptionSchemaSql(@"
        IF OBJECT_ID('dbo.Subscriptions', 'U') IS NOT NULL
           AND OBJECT_ID('dbo.SubscriptionPlans', 'U') IS NOT NULL
           AND COL_LENGTH('dbo.Subscriptions', 'SubscriptionPlanId') IS NOT NULL
           AND NOT EXISTS (
                SELECT 1 FROM sys.foreign_keys
                WHERE name = 'FK_Subscriptions_SubscriptionPlans_SubscriptionPlanId'
                  AND parent_object_id = OBJECT_ID('dbo.Subscriptions')
           )
        BEGIN
            ALTER TABLE dbo.Subscriptions
            ADD CONSTRAINT FK_Subscriptions_SubscriptionPlans_SubscriptionPlanId
            FOREIGN KEY (SubscriptionPlanId) REFERENCES dbo.SubscriptionPlans(SubscriptionPlanId);
        END
    ");

    RunSubscriptionSchemaSql(@"
        IF OBJECT_ID('dbo.SubscriptionPlans', 'U') IS NOT NULL
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM dbo.SubscriptionPlans WHERE Audience = 'Applicant' AND Code = 'applicant_7d')
                INSERT INTO dbo.SubscriptionPlans (Audience, Code, Name, Description, DurationDays, Price, Currency, IsActive, SortOrder)
                VALUES ('Applicant', 'applicant_7d', N'VIP Cá nhân 7 ngày', N'Mở khóa WorkBridge AI, gợi ý việc làm và đánh giá CV trong 7 ngày.', 7, 19000, 'VND', 1, 10);

            IF NOT EXISTS (SELECT 1 FROM dbo.SubscriptionPlans WHERE Audience = 'Applicant' AND Code = 'applicant_30d')
                INSERT INTO dbo.SubscriptionPlans (Audience, Code, Name, Description, DurationDays, Price, Currency, IsActive, SortOrder)
                VALUES ('Applicant', 'applicant_30d', N'VIP Cá nhân 1 tháng', N'Gói dễ tiếp cận cho AI tìm việc, CV và phỏng vấn với chi phí thấp.', 30, 49000, 'VND', 1, 20);

            IF NOT EXISTS (SELECT 1 FROM dbo.SubscriptionPlans WHERE Audience = 'Applicant' AND Code = 'applicant_365d')
                INSERT INTO dbo.SubscriptionPlans (Audience, Code, Name, Description, DurationDays, Price, Currency, IsActive, SortOrder)
                VALUES ('Applicant', 'applicant_365d', N'VIP Cá nhân 1 năm', N'Tiết kiệm nhất cho ứng viên dùng AI WorkBridge dài hạn.', 365, 399000, 'VND', 1, 30);

            IF NOT EXISTS (SELECT 1 FROM dbo.SubscriptionPlans WHERE Audience = 'Employer' AND Code = 'employer_7d')
                INSERT INTO dbo.SubscriptionPlans (Audience, Code, Name, Description, DurationDays, Price, Currency, IsActive, SortOrder)
                VALUES ('Employer', 'employer_7d', N'VIP Doanh nghiệp 7 ngày', N'Trải nghiệm AI tuyển dụng, xếp ca và tính lương trong 7 ngày.', 7, 69000, 'VND', 1, 40);

            IF NOT EXISTS (SELECT 1 FROM dbo.SubscriptionPlans WHERE Audience = 'Employer' AND Code = 'employer_30d')
                INSERT INTO dbo.SubscriptionPlans (Audience, Code, Name, Description, DurationDays, Price, Currency, IsActive, SortOrder)
                VALUES ('Employer', 'employer_30d', N'VIP Doanh nghiệp 1 tháng', N'Gói vận hành hằng tháng cho tuyển dụng, xếp ca và bảng lương AI.', 30, 149000, 'VND', 1, 50);

            IF NOT EXISTS (SELECT 1 FROM dbo.SubscriptionPlans WHERE Audience = 'Employer' AND Code = 'employer_365d')
                INSERT INTO dbo.SubscriptionPlans (Audience, Code, Name, Description, DurationDays, Price, Currency, IsActive, SortOrder)
                VALUES ('Employer', 'employer_365d', N'VIP Doanh nghiệp 1 năm', N'Tự động xuất bản tin tuyển dụng không cần admin duyệt, kèm AI vận hành dài hạn.', 365, 1190000, 'VND', 1, 60);

            UPDATE dbo.SubscriptionPlans SET
                Name = N'VIP Cá nhân 7 ngày',
                Description = N'Mở khóa WorkBridge AI, gợi ý việc làm và đánh giá CV trong 7 ngày.',
                Price = 19000,
                SortOrder = 10
            WHERE Audience = 'Applicant' AND Code = 'applicant_7d';

            UPDATE dbo.SubscriptionPlans SET
                Name = N'VIP Cá nhân 1 tháng',
                Description = N'Gói dễ tiếp cận cho AI tìm việc, CV và phỏng vấn.',
                Price = 49000,
                SortOrder = 20
            WHERE Audience = 'Applicant' AND Code = 'applicant_30d';

            UPDATE dbo.SubscriptionPlans SET
                Name = N'VIP Cá nhân 1 năm',
                Description = N'Tiết kiệm nhất cho ứng viên dùng AI WorkBridge dài hạn.',
                Price = 399000,
                SortOrder = 30
            WHERE Audience = 'Applicant' AND Code = 'applicant_365d';

            UPDATE dbo.SubscriptionPlans SET
                Name = N'VIP Doanh nghiệp 7 ngày',
                Description = N'Trải nghiệm AI tuyển dụng, xếp ca và tính lương trong 7 ngày.',
                Price = 69000,
                SortOrder = 40
            WHERE Audience = 'Employer' AND Code = 'employer_7d';

            UPDATE dbo.SubscriptionPlans SET
                Name = N'VIP Doanh nghiệp 1 tháng',
                Description = N'Gói vận hành hằng tháng cho tuyển dụng, xếp ca và bảng lương AI.',
                Price = 149000,
                SortOrder = 50
            WHERE Audience = 'Employer' AND Code = 'employer_30d';

            UPDATE dbo.SubscriptionPlans SET
                Name = N'VIP Doanh nghiệp 1 năm',
                Description = N'Tự động xuất bản tin tuyển dụng không cần admin duyệt, kèm AI vận hành dài hạn.',
                Price = 1190000,
                SortOrder = 60
            WHERE Audience = 'Employer' AND Code = 'employer_365d';

            UPDATE dbo.SubscriptionPlans
            SET IsActive = 0, UpdatedAt = GETDATE()
            WHERE DurationDays NOT IN (7, 30, 365);
        END
    ");

    RunSubscriptionSchemaSql(@"
        IF OBJECT_ID('dbo.EmailVerificationRequests', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.EmailVerificationRequests (
                EmailVerificationRequestId INT IDENTITY(1,1) PRIMARY KEY,
                Email NVARCHAR(255) NOT NULL,
                FirstName NVARCHAR(100) NOT NULL DEFAULT '',
                LastName NVARCHAR(100) NOT NULL DEFAULT '',
                RoleName NVARCHAR(30) NOT NULL,
                PasswordHash NVARCHAR(255) NOT NULL,
                CodeHash NVARCHAR(128) NOT NULL,
                AttemptCount INT NOT NULL DEFAULT 0,
                Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
                CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                ExpiresAt DATETIME NOT NULL,
                VerifiedAt DATETIME NULL
            );
        END

        IF OBJECT_ID('dbo.EmailVerificationRequests', 'U') IS NOT NULL
           AND NOT EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE name = 'IX_EmailVerificationRequests_Email_Status_ExpiresAt'
                  AND object_id = OBJECT_ID('dbo.EmailVerificationRequests')
           )
        BEGIN
            CREATE INDEX IX_EmailVerificationRequests_Email_Status_ExpiresAt
            ON dbo.EmailVerificationRequests (Email, Status, ExpiresAt);
        END
    ");

    RunSubscriptionSchemaSql(@"
        IF OBJECT_ID('dbo.EmployerProfiles', 'U') IS NOT NULL
        BEGIN
            IF COL_LENGTH('dbo.EmployerProfiles', 'ReputationScore') IS NULL
                ALTER TABLE dbo.EmployerProfiles ADD ReputationScore INT NOT NULL CONSTRAINT DF_EmployerProfiles_ReputationScore DEFAULT 80;

            IF COL_LENGTH('dbo.EmployerProfiles', 'ReportCount') IS NULL
                ALTER TABLE dbo.EmployerProfiles ADD ReportCount INT NOT NULL CONSTRAINT DF_EmployerProfiles_ReportCount DEFAULT 0;

            IF COL_LENGTH('dbo.EmployerProfiles', 'Status') IS NULL
                ALTER TABLE dbo.EmployerProfiles ADD Status NVARCHAR(20) NOT NULL CONSTRAINT DF_EmployerProfiles_Status DEFAULT 'Active';
        END
    ");

    RunSubscriptionSchemaSql(@"
        IF OBJECT_ID('dbo.ApplicantProfiles', 'U') IS NOT NULL
        BEGIN
            IF COL_LENGTH('dbo.ApplicantProfiles', 'ReputationScore') IS NULL
                ALTER TABLE dbo.ApplicantProfiles ADD ReputationScore INT NOT NULL CONSTRAINT DF_ApplicantProfiles_ReputationScore DEFAULT 80;

            IF COL_LENGTH('dbo.ApplicantProfiles', 'ReportCount') IS NULL
                ALTER TABLE dbo.ApplicantProfiles ADD ReportCount INT NOT NULL CONSTRAINT DF_ApplicantProfiles_ReportCount DEFAULT 0;

            UPDATE dbo.ApplicantProfiles
            SET ReputationScore = 80
            WHERE ReputationScore = 0 AND ReportCount = 0;
        END
    ");

    RunSubscriptionSchemaSql(@"
        IF OBJECT_ID('dbo.Offers', 'U') IS NOT NULL
        BEGIN
            IF COL_LENGTH('dbo.Offers', 'ExpectedShifts') IS NULL
                ALTER TABLE dbo.Offers ADD ExpectedShifts NVARCHAR(100) NULL;
        END

        IF OBJECT_ID('dbo.Employments', 'U') IS NOT NULL
        BEGIN
            IF COL_LENGTH('dbo.Employments', 'ExpectedShifts') IS NULL
                ALTER TABLE dbo.Employments ADD ExpectedShifts NVARCHAR(100) NULL;
        END
    ");

    RunSubscriptionSchemaSql(@"
        IF OBJECT_ID('dbo.Reports', 'U') IS NOT NULL
        BEGIN
            IF COL_LENGTH('dbo.Reports', 'AiAnalysis') IS NULL
                ALTER TABLE dbo.Reports ADD AiAnalysis NVARCHAR(MAX) NULL;
        END
    ");

    RunSubscriptionSchemaSql(@"
        IF OBJECT_ID('dbo.PlatformMaintenanceSettings', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.PlatformMaintenanceSettings (
                PlatformMaintenanceSettingId INT NOT NULL PRIMARY KEY,
                IsEnabled BIT NOT NULL DEFAULT 0,
                StartedAtUtc DATETIME2 NULL,
                EndsAtUtc DATETIME2 NULL,
                Title NVARCHAR(200) NOT NULL,
                Message NVARCHAR(1000) NOT NULL,
                UpdatedBy NVARCHAR(255) NULL,
                UpdatedAtUtc DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                CONSTRAINT CK_PlatformMaintenanceSettings_Singleton CHECK (PlatformMaintenanceSettingId = 1)
            );
        END

        IF OBJECT_ID('dbo.PlatformMaintenanceSettings', 'U') IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM dbo.PlatformMaintenanceSettings WHERE PlatformMaintenanceSettingId = 1)
        BEGIN
            INSERT INTO dbo.PlatformMaintenanceSettings
                (PlatformMaintenanceSettingId, IsEnabled, StartedAtUtc, EndsAtUtc, Title, Message, UpdatedBy, UpdatedAtUtc)
            VALUES
                (1, 0, NULL, NULL, N'WorkBridge đang bảo trì',
                 N'Hệ thống đang được bảo trì để nâng cấp trải nghiệm. Vui lòng quay lại sau ít phút.',
                 NULL, SYSUTCDATETIME());
        END
    ");

    // 1. Seed Admin
    var adminRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Admin");
    if (adminRole != null)
    {
        var adminEmail = "admin@workbridge.com";
        var hasAdmin = await context.Users.AnyAsync(u => u.Email == adminEmail);
        if (!hasAdmin)
        {
            var adminUser = new WorkBridge.Domain.Entities.User
            {
                Email = adminEmail,
                FullName = "System Admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("AdminPassword123!"),
                RoleId = adminRole.RoleId,
                Status = "Active",
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow
            };
            await context.Users.AddAsync(adminUser);
            await context.SaveChangesAsync();
        }
    }

    // 2. Seed Employer
    var employerRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Employer");
    if (employerRole != null)
    {
        var employerEmail = "employer@workbridge.com";
        var employerUser = await context.Users.FirstOrDefaultAsync(u => u.Email == employerEmail);
        if (employerUser == null)
        {
            employerUser = new WorkBridge.Domain.Entities.User
            {
                Email = employerEmail,
                FullName = "Employer User",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("EmployerPassword123!"),
                RoleId = employerRole.RoleId,
                Status = "Active",
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow
            };
            await context.Users.AddAsync(employerUser);
            await context.SaveChangesAsync();
        }

        var hasEmployerProfile = await context.EmployerProfiles.AnyAsync(p => p.EmployerId == employerUser.UserId);
        if (!hasEmployerProfile)
        {
            var employerProfile = new WorkBridge.Domain.Entities.EmployerProfile
            {
                EmployerId = employerUser.UserId,
                CompanyName = "TGD High-Tech Corporation",
                ContactEmail = employerEmail,
                ContactPhone = "0987654321",
                Address = "123 Innovation Boulevard, District 1, HCMC",
                Description = "A leading retail and technology solutions provider in Vietnam."
            };
            await context.EmployerProfiles.AddAsync(employerProfile);
            await context.SaveChangesAsync();
        }
    }

    // 3. Seed Applicant
    var applicantRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Applicant");
    if (applicantRole != null)
    {
        var applicantEmail = "applicant@workbridge.com";
        var applicantUser = await context.Users.FirstOrDefaultAsync(u => u.Email == applicantEmail);
        if (applicantUser == null)
        {
            applicantUser = new WorkBridge.Domain.Entities.User
            {
                Email = applicantEmail,
                FullName = "Nguyen Van A",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("ApplicantPassword123!"),
                RoleId = applicantRole.RoleId,
                Status = "Active",
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow
            };
            await context.Users.AddAsync(applicantUser);
            await context.SaveChangesAsync();
        }

        var hasApplicantProfile = await context.ApplicantProfiles.AnyAsync(p => p.ApplicantId == applicantUser.UserId);
        if (!hasApplicantProfile)
        {
            var applicantProfile = new WorkBridge.Domain.Entities.ApplicantProfile
            {
                ApplicantId = applicantUser.UserId,
                University = "HCMUT (Bach Khoa)",
                Major = "Computer Science",
                StudyYear = "3rd Year",
                Phone = "0912345678",
                Address = "456 University Way, Thu Duc, HCMC",
                AboutMe = "Highly motivated software engineering student looking for part-time work."
            };
            await context.ApplicantProfiles.AddAsync(applicantProfile);
            await context.SaveChangesAsync();
        }
    }

    // 4. One-time database correction for existing shifts and windows timezone mismatch
    try
    {
        var localShifts = await context.WorkShifts
            .Where(s => s.RegistrationWindowId != null && (s.StartTime.Hour == 8 || s.StartTime.Hour == 13 || s.StartTime.Hour == 18))
            .ToListAsync();
        int patchCount = 0;
        foreach (var shift in localShifts)
        {
            if (shift.StartTime.Kind != DateTimeKind.Utc)
            {
                shift.StartTime = DateTime.SpecifyKind(shift.StartTime, DateTimeKind.Local).ToUniversalTime();
                shift.EndTime = DateTime.SpecifyKind(shift.EndTime, DateTimeKind.Local).ToUniversalTime();
                patchCount++;
            }
        }
        if (patchCount > 0)
        {
            await context.SaveChangesAsync();
            Console.WriteLine($"[TimeZone Patch] Successfully patched {patchCount} shifts to UTC.");
        }

        var localWindows = await context.ShiftRegistrationWindows
            .Where(w => w.WeekStartDate.Hour == 0)
            .ToListAsync();
        int windowPatchCount = 0;
        foreach (var window in localWindows)
        {
            if (window.WeekStartDate.Kind != DateTimeKind.Utc)
            {
                window.WeekStartDate = DateTime.SpecifyKind(window.WeekStartDate, DateTimeKind.Local).ToUniversalTime();
                window.OpenAt = DateTime.SpecifyKind(window.OpenAt, DateTimeKind.Local).ToUniversalTime();
                window.CloseAt = DateTime.SpecifyKind(window.CloseAt, DateTimeKind.Local).ToUniversalTime();
                if (window.FinalizedAt.HasValue)
                {
                    window.FinalizedAt = DateTime.SpecifyKind(window.FinalizedAt.Value, DateTimeKind.Local).ToUniversalTime();
                }
                windowPatchCount++;
            }
        }
        if (windowPatchCount > 0)
        {
            await context.SaveChangesAsync();
            Console.WriteLine($"[TimeZone Patch] Successfully patched {windowPatchCount} registration windows to UTC.");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[TimeZone Patch] Error patching database timezones: {ex.Message}");
    }
}

app.Run();

public class UtcDateTimeConverter : System.Text.Json.Serialization.JsonConverter<DateTime>
{
    public override DateTime Read(ref System.Text.Json.Utf8JsonReader reader, Type typeToConvert, System.Text.Json.JsonSerializerOptions options)
    {
        return DateTime.Parse(reader.GetString()!).ToUniversalTime();
    }

    public override void Write(System.Text.Json.Utf8JsonWriter writer, DateTime value, System.Text.Json.JsonSerializerOptions options)
    {
        var utcValue = value.Kind == DateTimeKind.Utc
            ? value
            : DateTime.SpecifyKind(value, DateTimeKind.Utc);
        writer.WriteStringValue(utcValue.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"));
    }
}

public class NullableUtcDateTimeConverter : System.Text.Json.Serialization.JsonConverter<DateTime?>
{
    public override DateTime? Read(ref System.Text.Json.Utf8JsonReader reader, Type typeToConvert, System.Text.Json.JsonSerializerOptions options)
    {
        var val = reader.GetString();
        if (string.IsNullOrEmpty(val)) return null;
        return DateTime.Parse(val).ToUniversalTime();
    }

    public override void Write(System.Text.Json.Utf8JsonWriter writer, DateTime? value, System.Text.Json.JsonSerializerOptions options)
    {
        if (value == null)
        {
            writer.WriteNullValue();
        }
        else
        {
            var utcValue = value.Value.Kind == DateTimeKind.Utc
                ? value.Value
                : DateTime.SpecifyKind(value.Value, DateTimeKind.Utc);
            writer.WriteStringValue(utcValue.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"));
        }
    }
}

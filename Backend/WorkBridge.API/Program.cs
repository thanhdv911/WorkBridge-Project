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

var allowedOriginsList = new List<string>
{
    "http://localhost:5173",
    "https://localhost:5173",
    "http://127.0.0.1:5173",
    "https://127.0.0.1:5173",
    "https://workbridge.io.vn",
    "https://www.workbridge.io.vn"
};

var configOrigins = builder.Configuration["Cors:AllowedOrigins"]?
    .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    .Select(origin => origin.TrimEnd('/'))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

if (configOrigins != null && configOrigins.Length > 0)
{
    allowedOriginsList.AddRange(configOrigins);
}

var allowedOrigins = allowedOriginsList.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();

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

app.MapGet("/api/seed-vip", async (WorkBridgeContext context) => 
{
    try 
    {
        var plansToSeed = new List<WorkBridge.Domain.Entities.SubscriptionPlan>
        {
            new() { Audience = "Applicant", Code = "applicant_7d", Name = "VIP Cá nhân 7 ngày", Description = "Mở khóa WorkBridge AI, gợi ý việc làm và đánh giá CV trong 7 ngày.", DurationDays = 7, Price = 19000, Currency = "VND", IsActive = true, SortOrder = 10, CreatedAt = DateTime.UtcNow },
            new() { Audience = "Applicant", Code = "applicant_30d", Name = "VIP Cá nhân 1 tháng", Description = "Gói dễ tiếp cận cho AI tìm việc, CV và phỏng vấn với chi phí thấp.", DurationDays = 30, Price = 49000, Currency = "VND", IsActive = true, SortOrder = 20, CreatedAt = DateTime.UtcNow },
            new() { Audience = "Applicant", Code = "applicant_365d", Name = "VIP Cá nhân 1 năm", Description = "Tiết kiệm nhất cho ứng viên dùng AI WorkBridge dài hạn.", DurationDays = 365, Price = 399000, Currency = "VND", IsActive = true, SortOrder = 30, CreatedAt = DateTime.UtcNow },
            new() { Audience = "Employer", Code = "employer_7d", Name = "VIP Doanh nghiệp 7 ngày", Description = "Trải nghiệm AI tuyển dụng, xếp ca và tính lương trong 7 ngày.", DurationDays = 7, Price = 69000, Currency = "VND", IsActive = true, SortOrder = 40, CreatedAt = DateTime.UtcNow },
            new() { Audience = "Employer", Code = "employer_30d", Name = "VIP Doanh nghiệp 1 tháng", Description = "Gói vận hành hàng tháng cho tuyển dụng, xếp ca và bảng lương AI.", DurationDays = 30, Price = 149000, Currency = "VND", IsActive = true, SortOrder = 50, CreatedAt = DateTime.UtcNow },
            new() { Audience = "Employer", Code = "employer_365d", Name = "VIP Doanh nghiệp 1 năm", Description = "Tự động xuất bản tin tuyển dụng không cần admin duyệt, kèm AI vận hành dài hạn.", DurationDays = 365, Price = 1190000, Currency = "VND", IsActive = true, SortOrder = 60, CreatedAt = DateTime.UtcNow }
        };

        var seeded = 0;
        foreach (var plan in plansToSeed)
        {
            if (!await context.SubscriptionPlans.AnyAsync(p => p.Audience == plan.Audience && p.Code == plan.Code))
            {
                await context.SubscriptionPlans.AddAsync(plan);
                seeded++;
            }
        }
        await context.SaveChangesAsync();
        return Results.Ok(new { message = $"Seeded {seeded} plans successfully." });
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.ToString());
    }
});

app.MapGet("/api/clean-spam", async (WorkBridge.Infrastructure.Data.WorkBridgeContext db) => 
{
    var spamMsgs = db.Messages.Where(m => m.Content.Contains("rate-limit-test"));
    db.Messages.RemoveRange(spamMsgs);
    var count = await db.SaveChangesAsync();
    return Results.Ok(new { message = $"Đã dọn dẹp sạch sẽ {count} tin nhắn rác!" });
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

    try
    {
        Console.WriteLine("Running EF Migrations...");
        context.Database.Migrate();
        Console.WriteLine("EF Migrations completed.");

        // Seed Subscription Plans
        var plansToSeed = new List<WorkBridge.Domain.Entities.SubscriptionPlan>
        {
            new() { Audience = "Applicant", Code = "applicant_7d", Name = "VIP Cá nhân 7 ngày", Description = "Mở khóa WorkBridge AI, gợi ý việc làm và đánh giá CV trong 7 ngày.", DurationDays = 7, Price = 19000, Currency = "VND", IsActive = true, SortOrder = 10, CreatedAt = DateTime.UtcNow },
            new() { Audience = "Applicant", Code = "applicant_30d", Name = "VIP Cá nhân 1 tháng", Description = "Gói dễ tiếp cận cho AI tìm việc, CV và phỏng vấn với chi phí thấp.", DurationDays = 30, Price = 49000, Currency = "VND", IsActive = true, SortOrder = 20, CreatedAt = DateTime.UtcNow },
            new() { Audience = "Applicant", Code = "applicant_365d", Name = "VIP Cá nhân 1 năm", Description = "Tiết kiệm nhất cho ứng viên dùng AI WorkBridge dài hạn.", DurationDays = 365, Price = 399000, Currency = "VND", IsActive = true, SortOrder = 30, CreatedAt = DateTime.UtcNow },
            new() { Audience = "Employer", Code = "employer_7d", Name = "VIP Doanh nghiệp 7 ngày", Description = "Trải nghiệm AI tuyển dụng, xếp ca và tính lương trong 7 ngày.", DurationDays = 7, Price = 69000, Currency = "VND", IsActive = true, SortOrder = 40, CreatedAt = DateTime.UtcNow },
            new() { Audience = "Employer", Code = "employer_30d", Name = "VIP Doanh nghiệp 1 tháng", Description = "Gói vận hành hàng tháng cho tuyển dụng, xếp ca và bảng lương AI.", DurationDays = 30, Price = 149000, Currency = "VND", IsActive = true, SortOrder = 50, CreatedAt = DateTime.UtcNow },
            new() { Audience = "Employer", Code = "employer_365d", Name = "VIP Doanh nghiệp 1 năm", Description = "Tự động xuất bản tin tuyển dụng không cần admin duyệt, kèm AI vận hành dài hạn.", DurationDays = 365, Price = 1190000, Currency = "VND", IsActive = true, SortOrder = 60, CreatedAt = DateTime.UtcNow }
        };

        foreach (var plan in plansToSeed)
        {
            if (!await context.SubscriptionPlans.AnyAsync(p => p.Audience == plan.Audience && p.Code == plan.Code))
            {
                await context.SubscriptionPlans.AddAsync(plan);
            }
        }
        await context.SaveChangesAsync();
    }
    catch (Exception ex)
    {
        Console.WriteLine("Error during reset/migrate: " + ex.Message);
    }

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



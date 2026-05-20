using Microsoft.EntityFrameworkCore;
using WorkBridge.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using WorkBridge.API.Services;
using WorkBridge.API.Hubs;
using WorkBridge.Application.Interfaces;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add SignalR
builder.Services.AddSignalR();

// Configure CORS — must AllowCredentials for SignalR WebSocket auth
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
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
builder.Services.AddScoped<WorkBridge.Application.Services.INotificationService, WorkBridge.Application.Services.NotificationService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IMessageService, WorkBridge.Application.Services.MessageService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IAdminService, WorkBridge.Application.Services.AdminService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IReviewService, WorkBridge.Application.Services.ReviewService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IReportService, WorkBridge.Application.Services.ReportService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IBranchService, WorkBridge.Application.Services.BranchService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IOfferService, WorkBridge.Application.Services.OfferService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IWorkforceService, WorkBridge.Application.Services.WorkforceService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IInterviewService, WorkBridge.Application.Services.InterviewService>();
builder.Services.AddScoped<WorkBridge.Application.Interfaces.IWorkBridgeContext>(provider =>
    provider.GetRequiredService<WorkBridgeContext>());
builder.Services.AddHostedService<ShiftPassExpiryHostedService>();

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

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Map the SignalR hub endpoint
app.MapHub<WorkBridgeHub>("/hubs/workbridge");

app.Run();

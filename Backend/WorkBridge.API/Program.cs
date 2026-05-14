using Microsoft.EntityFrameworkCore;
using WorkBridge.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure CORS for React Vite frontend Let's assume port 5173
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
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
builder.Services.AddScoped<WorkBridge.Application.Services.IShiftService, WorkBridge.Application.Services.ShiftService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IContractService, WorkBridge.Application.Services.ContractService>();
builder.Services.AddScoped<WorkBridge.Application.Services.ISavedJobService, WorkBridge.Application.Services.SavedJobService>();
builder.Services.AddScoped<WorkBridge.Application.Services.INotificationService, WorkBridge.Application.Services.NotificationService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IMessageService, WorkBridge.Application.Services.MessageService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IAdminService, WorkBridge.Application.Services.AdminService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IReviewService, WorkBridge.Application.Services.ReviewService>();
builder.Services.AddScoped<WorkBridge.Application.Services.IReportService, WorkBridge.Application.Services.ReportService>();
builder.Services.AddScoped<WorkBridge.Application.Interfaces.IWorkBridgeContext>(provider =>
    provider.GetRequiredService<WorkBridgeContext>());

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

app.Run();

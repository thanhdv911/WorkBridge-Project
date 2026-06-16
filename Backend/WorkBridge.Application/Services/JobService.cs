using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using WorkBridge.Application.Interfaces;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkBridge.Application.DTOs;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public class JobService : IJobService
    {
        private readonly IWorkBridgeContext _context;

        public JobService(IWorkBridgeContext context)
        {
            _context = context;
        }

        public async Task<PaginatedResponse<JobResponse>> GetJobsAsync(string? keyword, string? location, decimal? minSalary, int pageNumber = 1, int pageSize = 10, int? categoryId = null)
        {
            var query = _context.JobPosts
                .Include(j => j.Employer)
                .Where(j => j.Status == "Published" && !j.IsDeleted)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var lowerKeyword = keyword.ToLower();
                query = query.Where(j =>
                    j.Title.ToLower().Contains(lowerKeyword) ||
                    j.Employer.CompanyName.ToLower().Contains(lowerKeyword));
            }

            if (!string.IsNullOrWhiteSpace(location))
            {
                var lowerLocation = location.ToLower();
                if (lowerLocation.Contains(","))
                {
                    var parts = lowerLocation.Split(',').Select(p => p.Trim()).Where(p => !string.IsNullOrEmpty(p)).ToList();
                    foreach (var part in parts)
                    {
                        var term = part;
                        query = query.Where(j =>
                            (j.City != null && j.City.ToLower().Contains(term)) ||
                            (j.District != null && j.District.ToLower().Contains(term)) ||
                            (j.Address != null && j.Address.ToLower().Contains(term)));
                    }
                }
                else
                {
                    query = query.Where(j =>
                        (j.City != null && j.City.ToLower().Contains(lowerLocation)) ||
                        (j.District != null && j.District.ToLower().Contains(lowerLocation)) ||
                        (j.Address != null && j.Address.ToLower().Contains(lowerLocation)));
                }
            }

            if (minSalary.HasValue)
            {
                query = query.Where(j => j.PayRate >= minSalary.Value);
            }

            if (categoryId.HasValue)
            {
                query = query.Where(j => j.CategoryId == categoryId.Value);
            }

            var totalCount = await query.CountAsync();

            var now = DateTime.UtcNow;
            var twentyFourHoursAgo = now.AddHours(-24);
            var activeVipEmployerIds = await _context.Subscriptions
                .Where(s => s.EmployerId.HasValue && s.Status == "Active" && s.EndDate >= now)
                .Select(s => s.EmployerId!.Value)
                .Distinct()
                .ToListAsync();

            var jobs = await query
                .OrderByDescending(j => (j.IsFeatured || activeVipEmployerIds.Contains(j.EmployerId)) ? 2 : (j.CreatedAt >= twentyFourHoursAgo ? 1 : 0))
                .ThenByDescending(j => j.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(j => new JobResponse
                {
                    JobPostId = j.JobPostId,
                    EmployerId = j.EmployerId,
                    CategoryId = j.CategoryId,
                    Title = j.Title,
                    CompanyName = j.Employer.CompanyName,
                    CompanyLogoUrl = j.Employer.LogoUrl,
                    JobType = j.JobType,
                    Location = (!string.IsNullOrEmpty(j.District) ? j.District + ", " : "") + j.City,
                    Address = j.Address,
                    City = j.City,
                    District = j.District,
                    PayRate = j.PayRate,
                    PayUnit = j.PayUnit,
                    Description = j.Description,
                    Requirements = j.Requirements,
                    Benefits = j.Benefits,
                    WorkingHours = j.WorkingHours,
                    ApplicationDeadline = j.ApplicationDeadline,
                    Position = j.Position,
                    Vacancies = j.Vacancies,
                    Status = j.Status,
                    CreatedAt = j.CreatedAt,
                    IsFeatured = j.IsFeatured || activeVipEmployerIds.Contains(j.EmployerId),
                    IsVipEmployer = activeVipEmployerIds.Contains(j.EmployerId),
                    BranchId = j.BranchId,
                    BranchName = j.Branch != null ? j.Branch.Name : null,
                    EmployerReputationScore = j.Employer.ReputationScore,
                    EmployerReportCount = j.Employer.ReportCount,
                    EmployerStatus = j.Employer.Status,
                    Shifts = j.Shifts.Select(s => new ShiftResponse
                    {
                        ShiftId = s.ShiftId,
                        ShiftName = s.ShiftName,
                        StartTime = s.StartTime,
                        EndTime = s.EndTime
                    }).ToList()
                })
                .ToListAsync();

            return new PaginatedResponse<JobResponse>
            {
                Items = jobs,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        public async Task<JobResponse?> GetJobByIdAsync(int id)
        {
            var now = DateTime.UtcNow;
            var activeVipEmployerIds = await _context.Subscriptions
                .Where(s => s.EmployerId.HasValue && s.Status == "Active" && s.EndDate >= now)
                .Select(s => s.EmployerId!.Value)
                .Distinct()
                .ToListAsync();

            return await _context.JobPosts
                .Include(j => j.Employer)
                .Include(j => j.Shifts)
                .Where(j => j.JobPostId == id && !j.IsDeleted)
                .Select(j => new JobResponse
                {
                    JobPostId = j.JobPostId,
                    EmployerId = j.EmployerId,
                    CategoryId = j.CategoryId,
                    Title = j.Title,
                    CompanyName = j.Employer.CompanyName,
                    CompanyLogoUrl = j.Employer.LogoUrl,
                    JobType = j.JobType,
                    Location = (!string.IsNullOrEmpty(j.District) ? j.District + ", " : "") + j.City,
                    Address = j.Address,
                    City = j.City,
                    District = j.District,
                    PayRate = j.PayRate,
                    PayUnit = j.PayUnit,
                    Description = j.Description,
                    Requirements = j.Requirements,
                    Benefits = j.Benefits,
                    WorkingHours = j.WorkingHours,
                    ApplicationDeadline = j.ApplicationDeadline,
                    Position = j.Position,
                    Vacancies = j.Vacancies,
                    Status = j.Status,
                    CreatedAt = j.CreatedAt,
                    IsFeatured = j.IsFeatured || activeVipEmployerIds.Contains(j.EmployerId),
                    IsVipEmployer = activeVipEmployerIds.Contains(j.EmployerId),
                    BranchId = j.BranchId,
                    BranchName = j.Branch != null ? j.Branch.Name : null,
                    EmployerReputationScore = j.Employer.ReputationScore,
                    EmployerReportCount = j.Employer.ReportCount,
                    EmployerStatus = j.Employer.Status,
                    Shifts = j.Shifts.Select(s => new ShiftResponse
                    {
                        ShiftId = s.ShiftId,
                        ShiftName = s.ShiftName,
                        StartTime = s.StartTime,
                        EndTime = s.EndTime
                    }).ToList()
                })
                .FirstOrDefaultAsync();
        }
    }
}

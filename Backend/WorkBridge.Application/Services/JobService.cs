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

        public async Task<PaginatedResponse<JobResponse>> GetJobsAsync(string? keyword, string? location, decimal? minSalary, int pageNumber = 1, int pageSize = 10)
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
                query = query.Where(j => 
                    (j.City != null && j.City.ToLower().Contains(lowerLocation)) || 
                    (j.District != null && j.District.ToLower().Contains(lowerLocation)) ||
                    j.Address.ToLower().Contains(lowerLocation));
            }

            if (minSalary.HasValue)
            {
                query = query.Where(j => j.PayRate >= minSalary.Value);
            }

            var totalCount = await query.CountAsync();

            var jobs = await query
                .OrderByDescending(j => j.CreatedAt)
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
                    PayRate = j.PayRate,
                    PayUnit = j.PayUnit,
                    Description = j.Description,
                    Requirements = j.Requirements,
                    Benefits = j.Benefits,
                    ApplicationDeadline = j.ApplicationDeadline,
                    Status = j.Status,
                    IsTrending = j.IsTrending,
                    Tag = j.Tag,
                    CreatedAt = j.CreatedAt,
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
                    PayRate = j.PayRate,
                    PayUnit = j.PayUnit,
                    Description = j.Description,
                    Requirements = j.Requirements,
                    Benefits = j.Benefits,
                    ApplicationDeadline = j.ApplicationDeadline,
                    Status = j.Status,
                    IsTrending = j.IsTrending,
                    Tag = j.Tag,
                    CreatedAt = j.CreatedAt,
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

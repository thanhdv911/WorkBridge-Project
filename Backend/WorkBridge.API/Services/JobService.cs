using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkBridge.API.DTOs;
using WorkBridge.Infrastructure.Models;

namespace WorkBridge.API.Services
{
    public class JobService : IJobService
    {
        private readonly WorkBridgeContext _context;

        public JobService(WorkBridgeContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<JobResponse>> GetJobsAsync(string? keyword, string? location, decimal? minSalary)
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

            var jobs = await query
                .OrderByDescending(j => j.CreatedAt)
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
                    CreatedAt = j.CreatedAt
                })
                .ToListAsync();

            return jobs;
        }
    }
}

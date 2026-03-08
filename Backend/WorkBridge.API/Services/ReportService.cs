using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkBridge.API.DTOs;
using WorkBridge.Infrastructure.Models;

namespace WorkBridge.API.Services
{
    public class ReportService : IReportService
    {
        private readonly WorkBridgeContext _context;

        public ReportService(WorkBridgeContext context)
        {
            _context = context;
        }

        public async Task<bool> SubmitReportAsync(int reporterId, CreateReportRequest request)
        {
            var report = new Report
            {
                ReporterId = reporterId,
                ReportedEntityId = request.ReportedEntityId,
                EntityType = request.EntityType,
                Reason = request.Reason,
                Description = request.Description,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            await _context.Reports.AddAsync(report);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}

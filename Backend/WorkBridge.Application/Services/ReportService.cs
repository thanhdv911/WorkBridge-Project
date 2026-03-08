using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using WorkBridge.Application.Interfaces;
using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkBridge.Application.DTOs;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public class ReportService : IReportService
    {
        private readonly IWorkBridgeContext _context;

        public ReportService(IWorkBridgeContext context)
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

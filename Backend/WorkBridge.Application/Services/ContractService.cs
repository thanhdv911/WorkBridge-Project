using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Interfaces;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public class ContractService : IContractService
    {
        private readonly IWorkBridgeContext _context;

        public ContractService(IWorkBridgeContext context)
        {
            _context = context;
        }

        public async Task<EContractResponse?> GetContractByApplicationAsync(int applicationId, int userId)
        {
            var contract = await _context.EContracts
                .Include(c => c.Employer).ThenInclude(e => e.Employer)
                .Include(c => c.Applicant).ThenInclude(a => a.Applicant)
                .Include(c => c.Application).ThenInclude(a => a.JobPost)
                .FirstOrDefaultAsync(c => c.ApplicationId == applicationId);

            if (contract == null) return null;

            if (contract.EmployerId != userId && contract.ApplicantId != userId)
                return null;

            return MapContract(contract);
        }

        public async Task<bool> SignContractAsync(int contractId, int applicantId)
        {
            var contract = await _context.EContracts.FirstOrDefaultAsync(c => c.ContractId == contractId && c.ApplicantId == applicantId);
            if (contract == null || contract.Status != "Pending") return false;

            contract.Status = "Signed";
            contract.SignedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<DisputeResponse> CreateDisputeAsync(int userId, CreateDisputeRequest request)
        {
            var contract = await _context.EContracts
                .Include(c => c.Application).ThenInclude(a => a.JobPost)
                .FirstOrDefaultAsync(c => c.ContractId == request.ContractId);

            if (contract == null) throw new Exception("Contract not found.");

            int respondentId;
            if (contract.ApplicantId == userId) respondentId = contract.EmployerId;
            else if (contract.EmployerId == userId) respondentId = contract.ApplicantId;
            else throw new UnauthorizedAccessException("You are not part of this contract.");

            var attendances = await _context.Attendances
                .Include(a => a.Schedule)
                .Where(a => a.Schedule.ApplicantId == contract.ApplicantId && a.Schedule.JobPostId == contract.Application.JobPostId)
                .Select(a => new { Date = a.Schedule.ShiftDate, CheckIn = a.CheckInTime, CheckOut = a.CheckOutTime })
                .ToListAsync();

            var evidenceJson = JsonSerializer.Serialize(attendances);

            var dispute = new Dispute
            {
                ContractId = request.ContractId,
                InitiatorId = userId,
                RespondentId = respondentId,
                Reason = request.Reason,
                EvidenceData = evidenceJson,
                Status = "Open",
                CreatedAt = DateTime.UtcNow
            };

            _context.Disputes.Add(dispute);
            await _context.SaveChangesAsync();

            return await GetDisputeDetailsAsync(dispute.DisputeId);
        }

        public async Task<IEnumerable<DisputeResponse>> GetMyDisputesAsync(int userId)
        {
            var disputes = await _context.Disputes
                .Include(d => d.Contract).ThenInclude(c => c.Application).ThenInclude(a => a.JobPost)
                .Include(d => d.Initiator)
                .Include(d => d.Respondent)
                .Where(d => d.InitiatorId == userId || d.RespondentId == userId)
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();

            return disputes.Select(MapDispute);
        }

        public async Task<IEnumerable<DisputeResponse>> GetAllDisputesAsync()
        {
            var disputes = await _context.Disputes
                .Include(d => d.Contract).ThenInclude(c => c.Application).ThenInclude(a => a.JobPost)
                .Include(d => d.Initiator)
                .Include(d => d.Respondent)
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();

            return disputes.Select(MapDispute);
        }

        private EContractResponse MapContract(EContract contract)
        {
            return new EContractResponse
            {
                ContractId = contract.ContractId,
                ApplicationId = contract.ApplicationId,
                EmployerName = contract.Employer.CompanyName,
                ApplicantName = contract.Applicant.Applicant.FullName,
                JobTitle = contract.Application.JobPost.Title,
                AgreedPayRate = contract.AgreedPayRate,
                AgreedPayUnit = contract.AgreedPayUnit,
                Terms = contract.Terms,
                Status = contract.Status,
                CreatedAt = contract.CreatedAt,
                SignedAt = contract.SignedAt
            };
        }

        private DisputeResponse MapDispute(Dispute dispute)
        {
            return new DisputeResponse
            {
                DisputeId = dispute.DisputeId,
                ContractId = dispute.ContractId,
                JobTitle = dispute.Contract.Application.JobPost.Title,
                InitiatorName = dispute.Initiator.FullName,
                RespondentName = dispute.Respondent.FullName,
                Reason = dispute.Reason,
                EvidenceData = dispute.EvidenceData,
                Status = dispute.Status,
                AdminNotes = dispute.AdminNotes,
                CreatedAt = dispute.CreatedAt,
                ResolvedAt = dispute.ResolvedAt
            };
        }
        
        private async Task<DisputeResponse> GetDisputeDetailsAsync(int disputeId)
        {
            var dispute = await _context.Disputes
                .Include(d => d.Contract).ThenInclude(c => c.Application).ThenInclude(a => a.JobPost)
                .Include(d => d.Initiator)
                .Include(d => d.Respondent)
                .FirstOrDefaultAsync(d => d.DisputeId == disputeId);
            return MapDispute(dispute!);
        }
    }
}

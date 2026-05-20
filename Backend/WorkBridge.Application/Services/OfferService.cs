using Microsoft.EntityFrameworkCore;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Interfaces;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public class OfferService : IOfferService
    {
        private readonly IWorkBridgeContext _context;
        private readonly INotificationService _notificationService;
        private readonly IHubNotifier _hubNotifier;

        public OfferService(IWorkBridgeContext context, INotificationService notificationService, IHubNotifier hubNotifier)
        {
            _context = context;
            _notificationService = notificationService;
            _hubNotifier = hubNotifier;
        }

        public async Task<(OfferResponse? Offer, string? Error)> CreateOfferAsync(int employerId, CreateOfferRequest request)
        {
            if (request.HourlyRate <= 0) return (null, "Hourly rate must be greater than 0.");
            if (request.PaydayOfMonth < 1 || request.PaydayOfMonth > 28) return (null, "Payday must be between day 1 and 28.");
            if (string.IsNullOrWhiteSpace(request.Position)) return (null, "Position is required.");

            var branch = await _context.Branches
                .FirstOrDefaultAsync(b => b.BranchId == request.BranchId && b.EmployerId == employerId && b.IsActive);
            if (branch == null) return (null, "Branch not found or inactive.");

            var application = await _context.Applications
                .Include(a => a.JobPost)
                .FirstOrDefaultAsync(a => a.ApplicationId == request.ApplicationId && a.JobPost.EmployerId == employerId && !a.IsDeleted);
            if (application == null) return (null, "Application not found.");
            if (application.Status != "Accepted" && application.Status != "Interview Passed")
            {
                return (null, "Only accepted or interview-passed applications can receive an offer.");
            }

            var hasOpenOffer = await _context.Offers.AnyAsync(o =>
                o.ApplicationId == request.ApplicationId &&
                (o.Status == "Sent" || o.Status == "Accepted"));
            if (hasOpenOffer) return (null, "This application already has an active offer.");

            var offer = new Offer
            {
                ApplicationId = application.ApplicationId,
                EmployerId = employerId,
                ApplicantId = application.ApplicantId,
                BranchId = branch.BranchId,
                Position = request.Position.Trim(),
                HourlyRate = request.HourlyRate,
                StartDate = request.StartDate.Date,
                PaydayOfMonth = request.PaydayOfMonth,
                Status = "Sent",
                ExpiredAt = request.ExpiredAt,
                CreatedAt = DateTime.UtcNow
            };

            await _context.Offers.AddAsync(offer);
            application.Status = "Offered";
            application.RespondedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                application.ApplicantId,
                "New Job Offer",
                $"You received an offer for '{application.JobPost.Title}'."
            );

            var response = await GetOfferResponseAsync(offer.OfferId);
            if (response != null)
            {
                _ = Task.Run(async () =>
                {
                    try { await _hubNotifier.NotifyOfferChangedAsync(employerId, application.ApplicantId, response); }
                    catch { }
                });
            }
            return (response, null);
        }

        public async Task<IEnumerable<OfferResponse>> GetEmployerOffersAsync(int employerId)
        {
            return await BuildOfferQuery()
                .Where(o => o.EmployerId == employerId)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<OfferResponse>> GetMyOffersAsync(int applicantId)
        {
            return await BuildOfferQuery()
                .Where(o => o.ApplicantId == applicantId)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();
        }

        public async Task<(EmploymentResponse? Employment, string? Error)> AcceptOfferAsync(int applicantId, int offerId)
        {
            var offer = await _context.Offers.FirstOrDefaultAsync(o => o.OfferId == offerId && o.ApplicantId == applicantId);
            if (offer == null) return (null, "Offer not found.");
            if (offer.Status != "Sent") return (null, "Only sent offers can be accepted.");
            if (offer.ExpiredAt.HasValue && offer.ExpiredAt.Value < DateTime.UtcNow) return (null, "Offer has expired.");

            var hasActiveEmployment = await _context.Employments.AnyAsync(e =>
                e.EmployerId == offer.EmployerId &&
                e.EmployeeUserId == offer.ApplicantId &&
                e.Status == "Active");
            if (hasActiveEmployment) return (null, "You are already an active employee for this employer.");

            var application = await _context.Applications
                .Include(a => a.JobPost)
                .FirstOrDefaultAsync(a => a.ApplicationId == offer.ApplicationId);
            if (application == null) return (null, "Application not found.");

            var employment = new Employment
            {
                EmployerId = offer.EmployerId,
                EmployeeUserId = offer.ApplicantId,
                BranchId = offer.BranchId,
                OfferId = offer.OfferId,
                Position = offer.Position,
                Status = "Active",
                StartDate = offer.StartDate,
                CreatedAt = DateTime.UtcNow
            };

            await _context.Employments.AddAsync(employment);
            await _context.SaveChangesAsync();

            var rate = new EmployeeRate
            {
                EmploymentId = employment.EmploymentId,
                HourlyRate = offer.HourlyRate,
                EffectiveFrom = offer.StartDate,
                CreatedAt = DateTime.UtcNow
            };

            await _context.EmployeeRates.AddAsync(rate);
            offer.Status = "Accepted";
            offer.AcceptedAt = DateTime.UtcNow;
            offer.RespondedAt = DateTime.UtcNow;
            application.Status = "Hired";
            application.RespondedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                offer.EmployerId,
                "Offer Accepted",
                $"Your offer for '{application.JobPost.Title}' was accepted."
            );

            var response = await GetEmploymentResponseAsync(employment.EmploymentId);

            // Also push updated offer state to both parties
            var offerResponse = await GetOfferResponseAsync(offer.OfferId);
            if (offerResponse != null)
            {
                _ = Task.Run(async () =>
                {
                    try { await _hubNotifier.NotifyOfferChangedAsync(offer.EmployerId, applicantId, offerResponse); }
                    catch { }
                });
            }

            return (response, null);
        }

        public async Task<string?> DeclineOfferAsync(int applicantId, int offerId)
        {
            var offer = await _context.Offers.FirstOrDefaultAsync(o => o.OfferId == offerId && o.ApplicantId == applicantId);
            if (offer == null) return "Offer not found.";
            if (offer.Status != "Sent") return "Only sent offers can be declined.";

            offer.Status = "Declined";
            offer.RespondedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                offer.EmployerId,
                "Offer Declined",
                "An applicant declined your offer."
            );

            var offerResponse = await GetOfferResponseAsync(offer.OfferId);
            if (offerResponse != null)
            {
                _ = Task.Run(async () =>
                {
                    try { await _hubNotifier.NotifyOfferChangedAsync(offer.EmployerId, applicantId, offerResponse); }
                    catch { }
                });
            }

            return null;
        }

        private IQueryable<OfferResponse> BuildOfferQuery()
        {
            return from offer in _context.Offers
                   join app in _context.Applications on offer.ApplicationId equals app.ApplicationId
                   join job in _context.JobPosts on app.JobPostId equals job.JobPostId
                   join branch in _context.Branches on offer.BranchId equals branch.BranchId
                   join employer in _context.EmployerProfiles on offer.EmployerId equals employer.EmployerId
                   join applicant in _context.Users on offer.ApplicantId equals applicant.UserId
                   select new OfferResponse
                   {
                       OfferId = offer.OfferId,
                       ApplicationId = offer.ApplicationId,
                       EmployerId = offer.EmployerId,
                       ApplicantId = offer.ApplicantId,
                       BranchId = offer.BranchId,
                       BranchName = branch.Name,
                       CompanyName = employer.CompanyName,
                       ApplicantName = applicant.FullName,
                       JobTitle = job.Title,
                       Position = offer.Position,
                       HourlyRate = offer.HourlyRate,
                       StartDate = offer.StartDate,
                       PaydayOfMonth = offer.PaydayOfMonth,
                       Status = offer.Status,
                       CreatedAt = offer.CreatedAt,
                       AcceptedAt = offer.AcceptedAt,
                       ExpiredAt = offer.ExpiredAt
                   };
        }

        private async Task<OfferResponse?> GetOfferResponseAsync(int offerId)
        {
            return await BuildOfferQuery().FirstOrDefaultAsync(o => o.OfferId == offerId);
        }

        private async Task<EmploymentResponse?> GetEmploymentResponseAsync(int employmentId)
        {
            return await (from employment in _context.Employments
                          join user in _context.Users on employment.EmployeeUserId equals user.UserId
                          join branch in _context.Branches on employment.BranchId equals branch.BranchId
                          join rate in _context.EmployeeRates on employment.EmploymentId equals rate.EmploymentId
                          where employment.EmploymentId == employmentId && rate.EffectiveTo == null
                          select new EmploymentResponse
                          {
                              EmploymentId = employment.EmploymentId,
                              EmployerId = employment.EmployerId,
                              EmployeeUserId = employment.EmployeeUserId,
                              BranchId = employment.BranchId,
                              BranchName = branch.Name,
                              OfferId = employment.OfferId,
                              EmployeeName = user.FullName,
                              EmployeeEmail = user.Email,
                              Position = employment.Position,
                              Status = employment.Status,
                              StartDate = employment.StartDate,
                              CurrentHourlyRate = rate.HourlyRate
                          })
                .FirstOrDefaultAsync();
        }
    }
}

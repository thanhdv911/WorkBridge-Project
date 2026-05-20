using WorkBridge.Application.DTOs;

namespace WorkBridge.Application.Services
{
    public interface IOfferService
    {
        Task<(OfferResponse? Offer, string? Error)> CreateOfferAsync(int employerId, CreateOfferRequest request);
        Task<IEnumerable<OfferResponse>> GetEmployerOffersAsync(int employerId);
        Task<IEnumerable<OfferResponse>> GetMyOffersAsync(int applicantId);
        Task<(EmploymentResponse? Employment, string? Error)> AcceptOfferAsync(int applicantId, int offerId);
        Task<string?> DeclineOfferAsync(int applicantId, int offerId);
    }
}

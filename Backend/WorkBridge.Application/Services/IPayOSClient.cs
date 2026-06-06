using System.Text.Json;
using System.Threading.Tasks;

namespace WorkBridge.Application.Services
{
    public interface IPayOSClient
    {
        Task<PayOSPaymentResponse?> CreatePaymentLinkAsync(long orderCode, int amount, string description, string returnUrl, string cancelUrl);
        Task<PayOSPaymentResponse?> GetPaymentRequestAsync(long orderCode);
        Task<PayOSPaymentResponse?> CancelPaymentRequestAsync(long orderCode, string cancellationReason);
        bool VerifyWebhookSignature(JsonElement data, string signature);
    }
}

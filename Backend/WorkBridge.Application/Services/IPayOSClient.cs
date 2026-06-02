using System.Text.Json;
using System.Threading.Tasks;

namespace WorkBridge.Application.Services
{
    public interface IPayOSClient
    {
        Task<PayOSPaymentResponse?> CreatePaymentLinkAsync(long orderCode, int amount, string description, string returnUrl, string cancelUrl);
        Task<PayOSPaymentResponse?> GetPaymentRequestAsync(long orderCode);
        bool VerifyWebhookSignature(JsonElement data, string signature);
    }
}

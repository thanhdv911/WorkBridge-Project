using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace WorkBridge.Application.Services
{
    public class PayOSHelper : IPayOSClient
    {
        private readonly string _clientId;
        private readonly string _apiKey;
        private readonly string _checksumKey;
        private static readonly HttpClient _httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(20)
        };

        public PayOSHelper(string clientId, string apiKey, string checksumKey)
        {
            _clientId = clientId;
            _apiKey = apiKey;
            _checksumKey = checksumKey;
        }

        public async Task<PayOSPaymentResponse?> CreatePaymentLinkAsync(long orderCode, int amount, string description, string returnUrl, string cancelUrl)
        {
            for (var attempt = 1; attempt <= 3; attempt++)
            {
                try
                {
                    var data = new SortedDictionary<string, string>
                    {
                        { "amount", amount.ToString() },
                        { "cancelUrl", cancelUrl },
                        { "description", description },
                        { "orderCode", orderCode.ToString() },
                        { "returnUrl", returnUrl }
                    };

                    var rawData = string.Join("&", data.Select(x => $"{x.Key}={x.Value}"));
                    var signature = HmacSha256(rawData, _checksumKey);

                    var requestBody = new
                    {
                        orderCode = orderCode,
                        amount = amount,
                        description = description,
                        cancelUrl = cancelUrl,
                        returnUrl = returnUrl,
                        signature = signature
                    };

                    using var request = new HttpRequestMessage(HttpMethod.Post, "https://api-merchant.payos.vn/v2/payment-requests")
                    {
                        Content = JsonContent.Create(requestBody)
                    };

                    AddPayOSHeaders(request);

                    var response = await _httpClient.SendAsync(request);
                    var content = await response.Content.ReadAsStringAsync();

                    if (!response.IsSuccessStatusCode)
                    {
                        Console.WriteLine($"PayOS error creating link (attempt {attempt}): Status {response.StatusCode}, Content: {content}");
                    }
                    else
                    {
                        using var doc = JsonDocument.Parse(content);
                        var root = doc.RootElement;
                        if (root.TryGetProperty("code", out var codeProp) && codeProp.GetString() == "00")
                        {
                            return ReadPaymentResponse(root.GetProperty("data"), amount, orderCode);
                        }

                        var code = root.TryGetProperty("code", out var failedCodeProp) ? failedCodeProp.GetString() : "unknown";
                        var message = root.TryGetProperty("desc", out var descProp) ? descProp.GetString() : content;
                        Console.WriteLine($"PayOS API returned code: {code} - Msg: {message}");
                    }

                    var existing = await GetPaymentRequestAsync(orderCode);
                    if (existing != null)
                    {
                        return existing;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"PayOS creation exception (attempt {attempt}): {ex}");
                }

                if (attempt < 3)
                {
                    await Task.Delay(TimeSpan.FromMilliseconds(350 * attempt));
                }
            }

            return null;
        }

        public async Task<PayOSPaymentResponse?> GetPaymentRequestAsync(long orderCode)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, $"https://api-merchant.payos.vn/v2/payment-requests/{orderCode}");
                AddPayOSHeaders(request);

                var response = await _httpClient.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"PayOS error getting payment request: Status {response.StatusCode}, Content: {content}");
                    return null;
                }

                using var doc = JsonDocument.Parse(content);
                var root = doc.RootElement;
                if (root.TryGetProperty("code", out var codeProp) && codeProp.GetString() == "00")
                {
                    return ReadPaymentResponse(root.GetProperty("data"), 0, orderCode);
                }

                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"PayOS get payment exception: {ex}");
                return null;
            }
        }

        public async Task<PayOSPaymentResponse?> CancelPaymentRequestAsync(long orderCode, string cancellationReason)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, $"https://api-merchant.payos.vn/v2/payment-requests/{orderCode}/cancel")
                {
                    Content = JsonContent.Create(new
                    {
                        cancellationReason = string.IsNullOrWhiteSpace(cancellationReason)
                            ? "WorkBridge cancelled pending payment"
                            : cancellationReason
                    })
                };
                AddPayOSHeaders(request);

                var response = await _httpClient.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"PayOS error cancelling payment request: Status {response.StatusCode}, Content: {content}");
                    return await GetPaymentRequestAsync(orderCode);
                }

                using var doc = JsonDocument.Parse(content);
                var root = doc.RootElement;
                if (root.TryGetProperty("code", out var codeProp) && codeProp.GetString() == "00")
                {
                    return ReadPaymentResponse(root.GetProperty("data"), 0, orderCode);
                }

                Console.WriteLine($"PayOS cancel returned unexpected payload: {content}");
                return await GetPaymentRequestAsync(orderCode);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"PayOS cancel exception: {ex}");
                return await GetPaymentRequestAsync(orderCode);
            }
        }

        public async Task<bool> VerifyPaymentPaidAsync(long orderCode)
        {
            var payment = await GetPaymentRequestAsync(orderCode);
            return IsPaidStatus(payment?.status);
        }

        public bool VerifyWebhookSignature(JsonElement data, string signature)
        {
            if (string.IsNullOrWhiteSpace(signature) || data.ValueKind != JsonValueKind.Object)
            {
                return false;
            }

            var rawData = string.Join("&", data.EnumerateObject()
                .OrderBy(property => property.Name, StringComparer.Ordinal)
                .Select(property => $"{property.Name}={FormatSignatureValue(property.Value)}"));

            var expected = HmacSha256(rawData, _checksumKey);
            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(expected.ToLowerInvariant()),
                Encoding.UTF8.GetBytes(signature.Trim().ToLowerInvariant()));
        }

        public static bool IsPaidStatus(string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
            {
                return false;
            }

            return string.Equals(status.Trim(), "PAID", StringComparison.OrdinalIgnoreCase);
        }

        private static string HmacSha256(string data, string key)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));

            var hex = new StringBuilder(hash.Length * 2);
            foreach (var b in hash)
            {
                hex.AppendFormat("{0:x2}", b);
            }
            return hex.ToString();
        }

        private static string FormatSignatureValue(JsonElement value)
        {
            return value.ValueKind switch
            {
                JsonValueKind.String => value.GetString() ?? "",
                JsonValueKind.Number => value.GetRawText(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                JsonValueKind.Null => "",
                _ => value.GetRawText()
            };
        }

        private void AddPayOSHeaders(HttpRequestMessage request)
        {
            request.Headers.Add("x-client-id", _clientId);
            request.Headers.Add("x-api-key", _apiKey);
        }

        private static PayOSPaymentResponse ReadPaymentResponse(JsonElement dataElement, int fallbackAmount, long fallbackOrderCode)
        {
            return new PayOSPaymentResponse
            {
                bin = dataElement.TryGetProperty("bin", out var binProp) ? binProp.GetString() ?? "" : "",
                accountNumber = dataElement.TryGetProperty("accountNumber", out var accProp) ? accProp.GetString() ?? "" : "",
                accountName = dataElement.TryGetProperty("accountName", out var nameProp) ? nameProp.GetString() ?? "" : "",
                amount = dataElement.TryGetProperty("amount", out var amtProp) && amtProp.ValueKind == JsonValueKind.Number ? amtProp.GetInt32() : fallbackAmount,
                description = dataElement.TryGetProperty("description", out var descProp) ? descProp.GetString() ?? "" : "",
                orderCode = dataElement.TryGetProperty("orderCode", out var codeProp) && codeProp.ValueKind == JsonValueKind.Number ? codeProp.GetInt64() : fallbackOrderCode,
                qrCode = dataElement.TryGetProperty("qrCode", out var qrProp) ? qrProp.GetString() ?? "" : "",
                checkoutUrl = dataElement.TryGetProperty("checkoutUrl", out var urlProp) ? urlProp.GetString() ?? "" : "",
                status = dataElement.TryGetProperty("status", out var statusProp) ? statusProp.GetString() ?? "" : ""
            };
        }
    }

    public class PayOSPaymentResponse
    {
        public string bin { get; set; } = string.Empty;
        public string accountNumber { get; set; } = string.Empty;
        public string accountName { get; set; } = string.Empty;
        public int amount { get; set; }
        public string description { get; set; } = string.Empty;
        public long orderCode { get; set; }
        public string qrCode { get; set; } = string.Empty;
        public string checkoutUrl { get; set; } = string.Empty;
        public string status { get; set; } = string.Empty;
    }
}

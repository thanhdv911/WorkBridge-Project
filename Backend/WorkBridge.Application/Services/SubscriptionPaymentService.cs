using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using WorkBridge.Application.Interfaces;
using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public interface ISubscriptionPaymentService
    {
        Task<PaymentBuyResult> BuyAsync(int userId, string audience, BuyPaymentRequest request);
        Task<PaymentStatusResult?> ConfirmAsync(int userId, int subscriptionId);
        Task<PaymentStatusResult?> ConfirmLatestAsync(int userId, string? audience, int? subscriptionId);
        Task<PaymentStatusResult?> GetPaymentStatusAsync(int userId, string? audience, int? subscriptionId, long? orderCode);
        Task<PaymentStatusResult> HandlePayOSWebhookAsync(PayOSWebhookRequest request);
    }

    public class SubscriptionPaymentService : ISubscriptionPaymentService
    {
        private static readonly HashSet<int> AllowedDurations = new() { 7, 30, 365 };
        private static readonly HashSet<string> AllowedAudiences = new(StringComparer.OrdinalIgnoreCase)
        {
            "Applicant",
            "Employer"
        };
        private static readonly SemaphoreSlim PaymentCreationLock = new(1, 1);

        private readonly IWorkBridgeContext _context;
        private readonly IPayOSClient _payOSClient;
        private readonly IConfiguration _configuration;

        public SubscriptionPaymentService(IWorkBridgeContext context, IPayOSClient payOSClient, IConfiguration configuration)
        {
            _context = context;
            _payOSClient = payOSClient;
            _configuration = configuration;
        }

        public async Task<PaymentBuyResult> BuyAsync(int userId, string audience, BuyPaymentRequest request)
        {
            var normalizedAudience = NormalizeAudience(audience)
                ?? throw new InvalidOperationException("Tai khoan nay khong the mua goi VIP.");

            var plan = await ResolvePlanAsync(normalizedAudience, request);
            if (plan == null || !AllowedDurations.Contains(plan.DurationDays))
            {
                throw new InvalidOperationException("Goi VIP khong hop le. He thong chi ho tro goi 7 ngay, 1 thang va 1 nam.");
            }

            if (normalizedAudience == "Employer")
            {
                var hasEmployerProfile = await _context.EmployerProfiles.AnyAsync(p => p.EmployerId == userId);
                if (!hasEmployerProfile)
                {
                    throw new InvalidOperationException("Vui long tao ho so doanh nghiep truoc khi nang cap VIP.");
                }
            }

            var lockResource = $"vip-buy:{normalizedAudience}:{userId}:{plan.SubscriptionPlanId}";
            var dbLockAcquired = false;

            await PaymentCreationLock.WaitAsync();
            try
            {
                dbLockAcquired = await AcquireDatabasePaymentLockAsync(lockResource);
                if (!dbLockAcquired)
                {
                    throw new PaymentBusyException("He thong dang tao giao dich thanh toan. Vui long doi vai giay.");
                }

                var reusable = await TryReuseOrActivatePendingAsync(userId, normalizedAudience, plan);
                if (reusable != null)
                {
                    return reusable;
                }

                var now = DateTime.UtcNow;
                var subscription = new Subscription
                {
                    EmployerId = normalizedAudience == "Employer" ? userId : null,
                    UserId = userId,
                    SubscriptionPlanId = plan.SubscriptionPlanId,
                    Audience = normalizedAudience,
                    PlanName = plan.Code,
                    Price = plan.Price,
                    StartDate = now,
                    EndDate = now.AddDays(plan.DurationDays),
                    Status = "Pending"
                };

                await _context.Subscriptions.AddAsync(subscription);
                await _context.SaveChangesAsync();

                var orderCode = GeneratePayOSOrderCode(subscription.SubscriptionId);
                subscription.PaymentOrderCode = orderCode;
                await _context.SaveChangesAsync();

                var amount = decimal.ToInt32(decimal.Truncate(plan.Price));
                var description = $"VIP {normalizedAudience} {plan.DurationDays}d";
                var payment = await _payOSClient.CreatePaymentLinkAsync(
                    orderCode,
                    amount,
                    description.Length > 25 ? description[..25] : description,
                    BuildReturnUrl(normalizedAudience, subscription.SubscriptionId),
                    BuildCancelUrl(normalizedAudience));

                payment ??= await _payOSClient.GetPaymentRequestAsync(orderCode);
                if (payment == null || !IsReusablePayment(payment))
                {
                    _context.Subscriptions.Remove(subscription);
                    await _context.SaveChangesAsync();
                    throw new PaymentGatewayException("PayOS dang phan hoi cham. Vui long doi vai giay roi thu lai.");
                }

                subscription.PaymentPayloadJson = JsonSerializer.Serialize(payment);
                await _context.SaveChangesAsync();

                return new PaymentBuyResult
                {
                    CheckoutUrl = payment.checkoutUrl,
                    SubscriptionId = subscription.SubscriptionId,
                    OrderCode = orderCode,
                    Plan = ToPlanResponse(plan),
                    Payment = payment,
                    State = "Pending",
                    Paid = false,
                    Message = "Da tao ma thanh toan VIP."
                };
            }
            finally
            {
                if (dbLockAcquired)
                {
                    await ReleaseDatabasePaymentLockAsync(lockResource);
                }

                PaymentCreationLock.Release();
            }
        }

        public async Task<PaymentStatusResult?> ConfirmAsync(int userId, int subscriptionId)
        {
            var subscription = await _context.Subscriptions
                .Include(s => s.SubscriptionPlan)
                .FirstOrDefaultAsync(s => s.SubscriptionId == subscriptionId &&
                                          (s.UserId == userId || s.EmployerId == userId));

            return subscription == null
                ? null
                : await RefreshAndActivateIfPaidAsync(subscription, userId);
        }

        public async Task<PaymentStatusResult?> ConfirmLatestAsync(int userId, string? audience, int? subscriptionId)
        {
            var normalizedAudience = NormalizeAudience(audience);
            var cutoff = DateTime.UtcNow.AddHours(-6);
            var pendingQuery = _context.Subscriptions
                .Include(s => s.SubscriptionPlan)
                .Where(s => s.Status == "Pending" &&
                            s.StartDate >= cutoff &&
                            (s.UserId == userId || s.EmployerId == userId) &&
                            (normalizedAudience == null || s.Audience == normalizedAudience));

            if (subscriptionId.HasValue)
            {
                pendingQuery = pendingQuery.Where(s => s.SubscriptionId == subscriptionId.Value);
            }

            var pendingPayments = await pendingQuery
                .OrderByDescending(s => s.SubscriptionId)
                .Take(5)
                .ToListAsync();

            PaymentStatusResult? latest = null;
            foreach (var pending in pendingPayments)
            {
                latest = await RefreshAndActivateIfPaidAsync(pending, userId);
                if (latest.Paid)
                {
                    return latest;
                }
            }

            return latest;
        }

        public async Task<PaymentStatusResult?> GetPaymentStatusAsync(int userId, string? audience, int? subscriptionId, long? orderCode)
        {
            var normalizedAudience = NormalizeAudience(audience);
            var query = _context.Subscriptions
                .Include(s => s.SubscriptionPlan)
                .Where(s => (s.UserId == userId || s.EmployerId == userId) &&
                            (normalizedAudience == null || s.Audience == normalizedAudience));

            if (subscriptionId.HasValue)
            {
                query = query.Where(s => s.SubscriptionId == subscriptionId.Value);
            }

            if (orderCode.HasValue)
            {
                query = query.Where(s => s.PaymentOrderCode == orderCode.Value);
            }

            var subscription = await query.OrderByDescending(s => s.SubscriptionId).FirstOrDefaultAsync();
            return subscription == null
                ? null
                : await RefreshAndActivateIfPaidAsync(subscription, userId);
        }

        public async Task<PaymentStatusResult> HandlePayOSWebhookAsync(PayOSWebhookRequest request)
        {
            if (request == null || request.Data.ValueKind != JsonValueKind.Object)
            {
                throw new InvalidOperationException("Du lieu webhook PayOS khong hop le.");
            }

            if (!_payOSClient.VerifyWebhookSignature(request.Data, request.Signature))
            {
                throw new InvalidOperationException("Chu ky webhook PayOS khong hop le.");
            }

            if (!TryGetLong(request.Data, "orderCode", out var orderCode))
            {
                throw new InvalidOperationException("Webhook PayOS thieu orderCode.");
            }

            var subscription = await _context.Subscriptions
                .Include(s => s.SubscriptionPlan)
                .FirstOrDefaultAsync(s => s.PaymentOrderCode == orderCode);

            if (subscription == null)
            {
                throw new InvalidOperationException("Khong tim thay giao dich VIP theo orderCode PayOS.");
            }

            if (TryGetDecimal(request.Data, "amount", out var webhookAmount) &&
                decimal.Truncate(webhookAmount) != decimal.Truncate(subscription.Price))
            {
                throw new InvalidOperationException("So tien webhook PayOS khong khop giao dich VIP.");
            }

            var accountUserId = subscription.UserId ?? subscription.EmployerId ?? 0;
            return await RefreshAndActivateIfPaidAsync(subscription, accountUserId, request.Success && request.Code == "00");
        }

        private async Task<PaymentBuyResult?> TryReuseOrActivatePendingAsync(int userId, string audience, SubscriptionPlan plan)
        {
            var now = DateTime.UtcNow;
            var pendingCandidates = await _context.Subscriptions
                .Include(s => s.SubscriptionPlan)
                .Where(s => s.Status == "Pending" &&
                            s.UserId == userId &&
                            s.Audience == audience &&
                            s.SubscriptionPlanId == plan.SubscriptionPlanId &&
                            s.StartDate >= now.AddMinutes(-30))
                .OrderByDescending(s => s.SubscriptionId)
                .ToListAsync();

            foreach (var pending in pendingCandidates)
            {
                var status = await RefreshAndActivateIfPaidAsync(pending, userId);
                if (status.Paid)
                {
                    return new PaymentBuyResult
                    {
                        SubscriptionId = pending.SubscriptionId,
                        OrderCode = pending.PaymentOrderCode ?? pending.SubscriptionId,
                        Plan = ToPlanResponse(plan),
                        State = status.State,
                        Paid = true,
                        Message = status.Message
                    };
                }

                var cachedPayment = ReadCachedPayment(pending.PaymentPayloadJson);
                if (cachedPayment != null && pending.PaymentOrderCode.HasValue && IsReusablePayment(cachedPayment))
                {
                    return new PaymentBuyResult
                    {
                        CheckoutUrl = cachedPayment.checkoutUrl,
                        SubscriptionId = pending.SubscriptionId,
                        OrderCode = pending.PaymentOrderCode.Value,
                        Plan = ToPlanResponse(plan),
                        Payment = cachedPayment,
                        Reused = true,
                        State = "Pending",
                        Paid = false,
                        Message = "Dang dung lai giao dich thanh toan VIP con hieu luc."
                    };
                }

                _context.Subscriptions.Remove(pending);
            }

            if (pendingCandidates.Count > 0)
            {
                await _context.SaveChangesAsync();
            }

            return null;
        }

        private async Task<PaymentStatusResult> RefreshAndActivateIfPaidAsync(Subscription subscription, int userId, bool webhookIndicatesPaid = false)
        {
            if (subscription.Status == "Active")
            {
                return ToStatus(subscription, true, "PAID", "Giao dich da duoc thanh toan va kich hoat truoc do.");
            }

            if (subscription.Status != "Pending")
            {
                return ToStatus(subscription, false, "UNKNOWN", $"Trang thai giao dich khong hop le: {subscription.Status}");
            }

            var orderCode = subscription.PaymentOrderCode ?? subscription.SubscriptionId;
            var payment = await _payOSClient.GetPaymentRequestAsync(orderCode);
            var payOSStatus = string.IsNullOrWhiteSpace(payment?.status) ? (webhookIndicatesPaid ? "PAID" : "UNKNOWN") : payment.status.Trim();

            if (payment != null)
            {
                subscription.PaymentPayloadJson = JsonSerializer.Serialize(payment);
            }

            if (!PayOSHelper.IsPaidStatus(payOSStatus) && !webhookIndicatesPaid)
            {
                await _context.SaveChangesAsync();
                return ToStatus(subscription, false, payOSStatus, "PayOS chua tra trang thai thanh toan thanh cong. He thong se tiep tuc kiem tra.");
            }

            return await ActivateSubscriptionAsync(subscription, userId, payOSStatus);
        }

        private async Task<PaymentStatusResult> ActivateSubscriptionAsync(Subscription subscription, int userId, string payOSStatus)
        {
            var audience = NormalizeAudience(subscription.Audience) ??
                           (subscription.EmployerId.HasValue ? "Employer" : "Applicant");
            var durationDays = subscription.SubscriptionPlan?.DurationDays ?? ParseDurationDays(subscription.PlanName);
            if (!AllowedDurations.Contains(durationDays))
            {
                durationDays = 30;
            }

            var now = DateTime.UtcNow;
            var activeVip = await ActiveSubscriptionQuery(userId, audience)
                .Where(s => s.SubscriptionId != subscription.SubscriptionId)
                .OrderByDescending(s => s.EndDate)
                .FirstOrDefaultAsync();
            var extendedExistingVip = activeVip != null;

            if (activeVip != null)
            {
                subscription.StartDate = activeVip.EndDate;
                subscription.EndDate = activeVip.EndDate.AddDays(durationDays);
            }
            else
            {
                subscription.StartDate = now;
                subscription.EndDate = now.AddDays(durationDays);
            }

            subscription.UserId ??= userId;
            subscription.Audience = audience;
            subscription.Status = "Active";

            if (audience == "Employer")
            {
                var activeJobPosts = await _context.JobPosts
                    .Where(j => j.EmployerId == userId && !j.IsDeleted)
                    .ToListAsync();

                foreach (var jobPost in activeJobPosts)
                {
                    jobPost.IsFeatured = true;
                    if (durationDays >= 365 && jobPost.Status == "Pending")
                    {
                        jobPost.Status = "Published";
                        jobPost.UpdatedAt = now;
                    }
                }
            }

            await _context.SaveChangesAsync();

            return ToStatus(
                subscription,
                true,
                payOSStatus,
                extendedExistingVip
                    ? "Thanh toan thanh cong! Goi VIP moi da duoc cong noi tiep vao so ngay con lai."
                    : audience == "Applicant"
                        ? "Thanh toan thanh cong! Goi VIP Ca nhan da duoc kich hoat."
                        : "Thanh toan thanh cong! Goi VIP Doanh nghiep da duoc kich hoat.");
        }

        private IQueryable<Subscription> ActiveSubscriptionQuery(int userId, string audience)
        {
            var now = DateTime.UtcNow;
            var query = _context.Subscriptions
                .Where(s => s.Status == "Active" && s.EndDate >= now);

            if (audience == "Employer")
            {
                return query.Where(s =>
                    (s.UserId == userId && s.Audience == "Employer") ||
                    s.EmployerId == userId);
            }

            return query.Where(s => s.UserId == userId && s.Audience == "Applicant");
        }

        private async Task<SubscriptionPlan?> ResolvePlanAsync(string audience, BuyPaymentRequest request)
        {
            if (request.PlanId.HasValue)
            {
                return await _context.SubscriptionPlans
                    .FirstOrDefaultAsync(p => p.SubscriptionPlanId == request.PlanId.Value &&
                                              p.Audience == audience &&
                                              p.IsActive);
            }

            if (request.DurationDays.HasValue)
            {
                return await _context.SubscriptionPlans
                    .Where(p => p.Audience == audience &&
                                p.DurationDays == request.DurationDays.Value &&
                                p.IsActive)
                    .OrderBy(p => p.Price)
                    .FirstOrDefaultAsync();
            }

            return null;
        }

        private PaymentStatusResult ToStatus(Subscription subscription, bool paid, string payOSStatus, string message)
        {
            var audience = NormalizeAudience(subscription.Audience) ??
                           (subscription.EmployerId.HasValue ? "Employer" : "Applicant");
            return new PaymentStatusResult
            {
                State = subscription.Status,
                Paid = paid,
                IsVip = subscription.Status == "Active" && subscription.EndDate >= DateTime.UtcNow,
                SubscriptionId = subscription.SubscriptionId,
                OrderCode = subscription.PaymentOrderCode ?? subscription.SubscriptionId,
                PayOSStatus = payOSStatus,
                Audience = audience,
                Message = message,
                Subscription = subscription
            };
        }

        private string BuildReturnUrl(string audience, int subscriptionId)
        {
            var frontendBaseUrl = (_configuration["Frontend:BaseUrl"] ?? "http://localhost:5173").TrimEnd('/');
            return audience == "Employer"
                ? $"{frontendBaseUrl}/employer-dashboard?tab=vip&confirmId={subscriptionId}"
                : $"{frontendBaseUrl}/profile?tab=vip&confirmId={subscriptionId}";
        }

        private string BuildCancelUrl(string audience)
        {
            var frontendBaseUrl = (_configuration["Frontend:BaseUrl"] ?? "http://localhost:5173").TrimEnd('/');
            return audience == "Employer"
                ? $"{frontendBaseUrl}/employer-dashboard?tab=vip&payment=cancelled"
                : $"{frontendBaseUrl}/profile?tab=vip&payment=cancelled";
        }

        private async Task<bool> AcquireDatabasePaymentLockAsync(string resource)
        {
            var connection = _context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await _context.Database.OpenConnectionAsync();
            }

            await using var command = connection.CreateCommand();
            command.CommandText = @"
                DECLARE @result int;
                EXEC @result = sp_getapplock
                    @Resource = @resource,
                    @LockMode = 'Exclusive',
                    @LockOwner = 'Session',
                    @LockTimeout = 10000;
                SELECT @result;";

            var parameter = command.CreateParameter();
            parameter.ParameterName = "@resource";
            parameter.Value = resource;
            command.Parameters.Add(parameter);

            var result = await command.ExecuteScalarAsync();
            return result != null && Convert.ToInt32(result) >= 0;
        }

        private async Task ReleaseDatabasePaymentLockAsync(string resource)
        {
            try
            {
                var connection = _context.Database.GetDbConnection();
                if (connection.State == ConnectionState.Open)
                {
                    await using var command = connection.CreateCommand();
                    command.CommandText = @"
                        EXEC sp_releaseapplock
                            @Resource = @resource,
                            @LockOwner = 'Session';";

                    var parameter = command.CreateParameter();
                    parameter.ParameterName = "@resource";
                    parameter.Value = resource;
                    command.Parameters.Add(parameter);

                    await command.ExecuteNonQueryAsync();
                }
            }
            finally
            {
                await _context.Database.CloseConnectionAsync();
            }
        }

        private static int ParseDurationDays(string planName)
        {
            var match = Regex.Match(planName ?? "", @"(\d+)");
            return match.Success && int.TryParse(match.Groups[1].Value, out var days) ? days : 30;
        }

        private static long GeneratePayOSOrderCode(int subscriptionId)
        {
            return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() * 1000L + Math.Abs(subscriptionId % 1000);
        }

        private static PayOSPaymentResponse? ReadCachedPayment(string? payloadJson)
        {
            if (string.IsNullOrWhiteSpace(payloadJson))
            {
                return null;
            }

            try
            {
                return JsonSerializer.Deserialize<PayOSPaymentResponse>(payloadJson);
            }
            catch
            {
                return null;
            }
        }

        private static bool IsReusablePayment(PayOSPaymentResponse payment)
        {
            if (string.IsNullOrWhiteSpace(payment.checkoutUrl) && string.IsNullOrWhiteSpace(payment.qrCode))
            {
                return false;
            }

            return !string.Equals(payment.status, "CANCELLED", StringComparison.OrdinalIgnoreCase) &&
                   !string.Equals(payment.status, "CANCELED", StringComparison.OrdinalIgnoreCase) &&
                   !string.Equals(payment.status, "EXPIRED", StringComparison.OrdinalIgnoreCase);
        }

        private static string? NormalizeAudience(string? audience)
        {
            if (string.IsNullOrWhiteSpace(audience)) return null;
            return AllowedAudiences.FirstOrDefault(a => string.Equals(a, audience.Trim(), StringComparison.OrdinalIgnoreCase));
        }

        private static PaymentPlanResponse ToPlanResponse(SubscriptionPlan plan)
        {
            return new PaymentPlanResponse
            {
                SubscriptionPlanId = plan.SubscriptionPlanId,
                Audience = plan.Audience,
                Code = plan.Code,
                Name = plan.Name,
                Description = plan.Description,
                DurationDays = plan.DurationDays,
                Price = plan.Price,
                Currency = plan.Currency,
                IsActive = plan.IsActive,
                SortOrder = plan.SortOrder,
                CreatedAt = plan.CreatedAt,
                UpdatedAt = plan.UpdatedAt
            };
        }

        private static bool TryGetLong(JsonElement data, string propertyName, out long value)
        {
            value = 0;
            return data.TryGetProperty(propertyName, out var property) &&
                   property.ValueKind == JsonValueKind.Number &&
                   property.TryGetInt64(out value);
        }

        private static bool TryGetDecimal(JsonElement data, string propertyName, out decimal value)
        {
            value = 0;
            return data.TryGetProperty(propertyName, out var property) &&
                   property.ValueKind == JsonValueKind.Number &&
                   property.TryGetDecimal(out value);
        }
    }

    public class BuyPaymentRequest
    {
        public int? PlanId { get; set; }
        public int? DurationDays { get; set; }
    }

    public class PaymentBuyResult
    {
        [JsonPropertyName("checkoutUrl")]
        public string? CheckoutUrl { get; set; }
        [JsonPropertyName("subscriptionId")]
        public int SubscriptionId { get; set; }
        [JsonPropertyName("orderCode")]
        public long OrderCode { get; set; }
        [JsonPropertyName("plan")]
        public PaymentPlanResponse? Plan { get; set; }
        [JsonPropertyName("payment")]
        public PayOSPaymentResponse? Payment { get; set; }
        [JsonPropertyName("reused")]
        public bool Reused { get; set; }
        [JsonPropertyName("paid")]
        public bool Paid { get; set; }
        [JsonPropertyName("state")]
        public string State { get; set; } = "";
        [JsonPropertyName("message")]
        public string Message { get; set; } = "";
    }

    public class PaymentStatusResult
    {
        [JsonPropertyName("state")]
        public string State { get; set; } = "";
        [JsonPropertyName("paid")]
        public bool Paid { get; set; }
        [JsonPropertyName("isVip")]
        public bool IsVip { get; set; }
        [JsonPropertyName("subscriptionId")]
        public int SubscriptionId { get; set; }
        [JsonPropertyName("orderCode")]
        public long OrderCode { get; set; }
        [JsonPropertyName("payOSStatus")]
        public string PayOSStatus { get; set; } = "";
        [JsonPropertyName("audience")]
        public string Audience { get; set; } = "";
        [JsonPropertyName("message")]
        public string Message { get; set; } = "";
        [JsonIgnore]
        public Subscription? Subscription { get; set; }
    }

    public class PaymentPlanResponse
    {
        public int SubscriptionPlanId { get; set; }
        public string Audience { get; set; } = "";
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
        public string? Description { get; set; }
        public int DurationDays { get; set; }
        public decimal Price { get; set; }
        public string Currency { get; set; } = "VND";
        public bool IsActive { get; set; }
        public int SortOrder { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class PayOSWebhookRequest
    {
        [JsonPropertyName("code")]
        public string Code { get; set; } = "";
        [JsonPropertyName("desc")]
        public string Desc { get; set; } = "";
        [JsonPropertyName("success")]
        public bool Success { get; set; }
        [JsonPropertyName("data")]
        public JsonElement Data { get; set; }
        [JsonPropertyName("signature")]
        public string Signature { get; set; } = "";
    }

    public class PaymentBusyException : Exception
    {
        public PaymentBusyException(string message) : base(message) { }
    }

    public class PaymentGatewayException : Exception
    {
        public PaymentGatewayException(string message) : base(message) { }
    }
}

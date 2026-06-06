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
        Task<PaymentStatusResult> GrantByAdminAsync(int targetUserId, AdminGrantVipRequest request);
        Task<PaymentStatusResult?> CancelAsync(int userId, string? audience, int? subscriptionId, long? orderCode, string? reason);
        Task<int> ExpirePendingPaymentsAsync();
        Task<SubscriptionHistoryResult> GetHistoryAsync(int userId, string? audience, int page, int pageSize);
        Task<AdminSubscriptionHistoryResult> GetAdminHistoryAsync(string? audience, string? status, int page, int pageSize);
    }

    public class SubscriptionPaymentService : ISubscriptionPaymentService
    {
        private static readonly HashSet<int> AllowedDurations = new() { 7, 30, 365 };
        private static readonly HashSet<string> AllowedAudiences = new(StringComparer.OrdinalIgnoreCase)
        {
            "Applicant",
            "Employer"
        };
        private static readonly TimeSpan PendingPaymentTimeout = TimeSpan.FromMinutes(5);
        private static readonly SemaphoreSlim PaymentCreationLock = new(1, 1);

        private readonly IWorkBridgeContext _context;
        private readonly IPayOSClient _payOSClient;
        private readonly IConfiguration _configuration;
        private readonly INotificationService _notificationService;

        public SubscriptionPaymentService(
            IWorkBridgeContext context,
            IPayOSClient payOSClient,
            IConfiguration configuration,
            INotificationService notificationService)
        {
            _context = context;
            _payOSClient = payOSClient;
            _configuration = configuration;
            _notificationService = notificationService;
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
                    EndDate = now.Add(PendingPaymentTimeout),
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
                    ExpiresAt = GetPendingExpiresAt(subscription),
                    ExpiresInSeconds = GetPendingExpiresInSeconds(subscription),
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
                .Include(s => s.User)
                .Include(s => s.Employer)
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

        public async Task<PaymentStatusResult?> CancelAsync(int userId, string? audience, int? subscriptionId, long? orderCode, string? reason)
        {
            if (!subscriptionId.HasValue && !orderCode.HasValue)
            {
                return null;
            }

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
            if (subscription == null)
            {
                return null;
            }

            var refreshed = await RefreshAndActivateIfPaidAsync(subscription, userId);
            if (refreshed.Paid || subscription.Status != "Pending")
            {
                return refreshed;
            }

            return await CancelPendingSubscriptionAsync(subscription, userId, reason ?? "Nguoi dung roi khoi trang thanh toan QR.");
        }

        public async Task<int> ExpirePendingPaymentsAsync()
        {
            return await ExpirePendingPaymentsAsync(null, null);
        }

        public async Task<SubscriptionHistoryResult> GetHistoryAsync(int userId, string? audience, int page, int pageSize)
        {
            var normalizedAudience = NormalizeAudience(audience);
            await ExpirePendingPaymentsAsync(userId, normalizedAudience);
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 5, 50);

            var query = _context.Subscriptions
                .Include(s => s.SubscriptionPlan)
                .Where(s => (s.UserId == userId || s.EmployerId == userId) &&
                            (normalizedAudience == null || s.Audience == normalizedAudience));

            var summarySource = await query.ToListAsync();
            var totalItems = summarySource.Count;
            var totalPages = Math.Max(1, (int)Math.Ceiling(totalItems / (double)pageSize));
            page = Math.Min(page, totalPages);

            var transactions = summarySource
                .OrderByDescending(s => s.SubscriptionId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return new SubscriptionHistoryResult
            {
                Summary = BuildSummary(summarySource),
                Transactions = transactions.Select(ToTransactionResponse).ToList(),
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = totalPages
            };
        }

        public async Task<AdminSubscriptionHistoryResult> GetAdminHistoryAsync(string? audience, string? status, int page, int pageSize)
        {
            await ExpirePendingPaymentsAsync();

            var normalizedAudience = NormalizeAudience(audience);
            var normalizedStatus = NormalizeStatus(status);
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 5, 100);

            var query = _context.Subscriptions
                .Include(s => s.SubscriptionPlan)
                .Include(s => s.User)
                .Include(s => s.Employer)
                .AsQueryable();

            if (normalizedAudience != null)
            {
                query = query.Where(s => s.Audience == normalizedAudience);
            }

            if (normalizedStatus != null)
            {
                query = query.Where(s => s.Status == normalizedStatus);
            }

            var summarySource = await query.ToListAsync();
            var totalItems = summarySource.Count;
            var pageItems = summarySource
                .OrderByDescending(s => s.SubscriptionId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(ToTransactionResponse)
                .ToList();

            return new AdminSubscriptionHistoryResult
            {
                Summary = BuildSummary(summarySource),
                Transactions = pageItems,
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = Math.Max(1, (int)Math.Ceiling(totalItems / (double)pageSize))
            };
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

            var webhookStatus = request.Data.TryGetProperty("status", out var statusProp) ? statusProp.GetString() : null;
            var webhookIndicatesPaid = request.Success && request.Code == "00" && PayOSHelper.IsPaidStatus(webhookStatus);
            var accountUserId = subscription.UserId ?? subscription.EmployerId ?? 0;
            return await RefreshAndActivateIfPaidAsync(subscription, accountUserId, webhookIndicatesPaid);
        }

        public async Task<PaymentStatusResult> GrantByAdminAsync(int targetUserId, AdminGrantVipRequest request)
        {
            request ??= new AdminGrantVipRequest();

            var user = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.EmployerProfile)
                .FirstOrDefaultAsync(u => u.UserId == targetUserId && !u.IsDeleted);

            if (user == null)
            {
                throw new InvalidOperationException("Khong tim thay nguoi dung.");
            }

            if (user.Status != "Active")
            {
                throw new InvalidOperationException("Chi co the nang VIP cho tai khoan dang hoat dong.");
            }

            var audience = NormalizeAudience(user.Role?.RoleName);
            if (audience == null)
            {
                throw new InvalidOperationException("Chi co the nang VIP cho tai khoan Ca nhan hoac Doanh nghiep.");
            }

            if (audience == "Employer" && user.EmployerProfile == null)
            {
                throw new InvalidOperationException("Tai khoan doanh nghiep chua co ho so doanh nghiep.");
            }

            var plan = await ResolvePlanAsync(audience, new BuyPaymentRequest
            {
                PlanId = request.PlanId,
                DurationDays = request.DurationDays
            });

            if (plan == null)
            {
                throw new InvalidOperationException("Khong tim thay goi VIP phu hop.");
            }

            if (!plan.IsActive || !AllowedDurations.Contains(plan.DurationDays))
            {
                throw new InvalidOperationException("Goi VIP khong hop le hoac da tat.");
            }

            var now = DateTime.UtcNow;
            var subscription = new Subscription
            {
                EmployerId = audience == "Employer" ? targetUserId : null,
                UserId = targetUserId,
                SubscriptionPlanId = plan.SubscriptionPlanId,
                Audience = audience,
                PlanName = plan.Code,
                Price = 0,
                StartDate = now,
                EndDate = now.AddDays(plan.DurationDays),
                Status = "Pending",
                PaymentPayloadJson = JsonSerializer.Serialize(new
                {
                    source = "AdminGrant",
                    grantedAt = now,
                    planId = plan.SubscriptionPlanId,
                    planName = plan.Name,
                    note = request.Note
                })
            };

            await _context.Subscriptions.AddAsync(subscription);

            return await ActivateSubscriptionAsync(subscription, targetUserId, "ADMIN_GRANTED", true);
        }

        private async Task<PaymentBuyResult?> TryReuseOrActivatePendingAsync(int userId, string audience, SubscriptionPlan plan)
        {
            await ExpirePendingPaymentsAsync(userId, audience);

            var now = DateTime.UtcNow;
            var pendingCandidates = await _context.Subscriptions
                .Include(s => s.SubscriptionPlan)
                .Where(s => s.Status == "Pending" &&
                            s.UserId == userId &&
                            s.Audience == audience &&
                            s.SubscriptionPlanId == plan.SubscriptionPlanId &&
                            s.StartDate >= now.Subtract(PendingPaymentTimeout))
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
                        ExpiresAt = GetPendingExpiresAt(pending),
                        ExpiresInSeconds = GetPendingExpiresInSeconds(pending),
                        Message = status.Message
                    };
                }

                var cachedPayment = ReadCachedPayment(pending.PaymentPayloadJson);
                if (cachedPayment != null &&
                    pending.PaymentOrderCode.HasValue &&
                    IsReusablePayment(cachedPayment) &&
                    !IsPendingExpired(pending))
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
                        ExpiresAt = GetPendingExpiresAt(pending),
                        ExpiresInSeconds = GetPendingExpiresInSeconds(pending),
                        Message = "Dang dung lai giao dich thanh toan VIP con hieu luc."
                    };
                }

                if (pending.Status == "Pending")
                {
                    await CancelPendingSubscriptionAsync(pending, userId, "Giao dich VIP qua han 5 phut.");
                }
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
                if (IsCancelledStatus(payOSStatus))
                {
                    subscription.Status = "Cancelled";
                    subscription.EndDate = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    return ToStatus(subscription, false, payOSStatus, "Giao dich da bi huy.");
                }

                if (IsPendingExpired(subscription))
                {
                    return await CancelPendingSubscriptionAsync(subscription, userId, "Tu dong huy do qua 5 phut chua thanh toan.", payOSStatus);
                }

                await _context.SaveChangesAsync();
                return ToStatus(subscription, false, payOSStatus, "PayOS chua tra trang thai thanh toan thanh cong. He thong se tiep tuc kiem tra.");
            }

            return await ActivateSubscriptionAsync(subscription, userId, payOSStatus);
        }

        private async Task<PaymentStatusResult> ActivateSubscriptionAsync(
            Subscription subscription,
            int userId,
            string payOSStatus,
            bool grantedByAdmin = false)
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

            await NotifyVipActivatedAsync(subscription, userId, audience, durationDays, extendedExistingVip, grantedByAdmin);

            return ToStatus(
                subscription,
                true,
                payOSStatus,
                BuildActivationMessage(audience, extendedExistingVip, grantedByAdmin));
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

        private async Task<int> ExpirePendingPaymentsAsync(int? userId, string? audience)
        {
            var cutoff = DateTime.UtcNow.Subtract(PendingPaymentTimeout);
            var query = _context.Subscriptions
                .Include(s => s.SubscriptionPlan)
                .Where(s => s.Status == "Pending" && s.StartDate <= cutoff);

            if (userId.HasValue)
            {
                query = query.Where(s => s.UserId == userId.Value || s.EmployerId == userId.Value);
            }

            if (!string.IsNullOrWhiteSpace(audience))
            {
                query = query.Where(s => s.Audience == audience);
            }

            var stalePayments = await query
                .OrderBy(s => s.SubscriptionId)
                .Take(50)
                .ToListAsync();

            var expired = 0;
            foreach (var subscription in stalePayments)
            {
                var accountUserId = subscription.UserId ?? subscription.EmployerId ?? 0;
                if (accountUserId <= 0) continue;

                var result = await RefreshAndActivateIfPaidAsync(subscription, accountUserId);
                if (result.State == "Cancelled")
                {
                    expired++;
                }
            }

            return expired;
        }

        private async Task<PaymentStatusResult> CancelPendingSubscriptionAsync(
            Subscription subscription,
            int userId,
            string reason,
            string? knownPayOSStatus = null)
        {
            if (subscription.Status == "Active")
            {
                return ToStatus(subscription, true, "PAID", "Giao dich da thanh toan va khong the huy.");
            }

            if (subscription.Status != "Pending")
            {
                return ToStatus(subscription, false, knownPayOSStatus ?? "UNKNOWN", $"Trang thai giao dich khong the huy: {subscription.Status}");
            }

            PayOSPaymentResponse? payment = null;
            var orderCode = subscription.PaymentOrderCode ?? subscription.SubscriptionId;

            if (subscription.PaymentOrderCode.HasValue)
            {
                payment = await _payOSClient.GetPaymentRequestAsync(orderCode);
                if (PayOSHelper.IsPaidStatus(payment?.status))
                {
                    if (payment != null)
                    {
                        subscription.PaymentPayloadJson = JsonSerializer.Serialize(payment);
                    }

                    return await ActivateSubscriptionAsync(subscription, userId, payment?.status ?? "PAID");
                }

                if (!IsCancelledStatus(payment?.status))
                {
                    payment = await _payOSClient.CancelPaymentRequestAsync(orderCode, reason);
                }
            }

            subscription.Status = "Cancelled";
            subscription.EndDate = DateTime.UtcNow;
            if (payment != null)
            {
                subscription.PaymentPayloadJson = JsonSerializer.Serialize(payment);
            }

            await _context.SaveChangesAsync();

            return ToStatus(subscription, false, payment?.status ?? knownPayOSStatus ?? "CANCELLED", "Giao dich VIP da duoc huy.");
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
                ExpiresAt = subscription.Status == "Pending" ? GetPendingExpiresAt(subscription) : null,
                ExpiresInSeconds = GetPendingExpiresInSeconds(subscription),
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

        private static string? NormalizeStatus(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return null;
            return status.Trim().ToLowerInvariant() switch
            {
                "active" or "paid" => "Active",
                "pending" => "Pending",
                "cancelled" or "canceled" => "Cancelled",
                "expired" => "Expired",
                _ => null
            };
        }

        private static bool IsCancelledStatus(string? status)
        {
            return string.Equals(status, "CANCELLED", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(status, "CANCELED", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(status, "EXPIRED", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsPendingExpired(Subscription subscription)
        {
            return subscription.Status == "Pending" && DateTime.UtcNow >= GetPendingExpiresAt(subscription);
        }

        private static DateTime GetPendingExpiresAt(Subscription subscription)
        {
            return subscription.StartDate.Add(PendingPaymentTimeout);
        }

        private static int GetPendingExpiresInSeconds(Subscription subscription)
        {
            if (subscription.Status != "Pending") return 0;
            return Math.Max(0, (int)Math.Ceiling((GetPendingExpiresAt(subscription) - DateTime.UtcNow).TotalSeconds));
        }

        private static bool IsAdminGrant(Subscription subscription)
        {
            if (string.IsNullOrWhiteSpace(subscription.PaymentPayloadJson)) return false;

            try
            {
                using var doc = JsonDocument.Parse(subscription.PaymentPayloadJson);
                return doc.RootElement.TryGetProperty("source", out var source) &&
                       string.Equals(source.GetString(), "AdminGrant", StringComparison.OrdinalIgnoreCase);
            }
            catch
            {
                return false;
            }
        }

        private static SubscriptionTransactionSummary BuildSummary(IEnumerable<Subscription> subscriptions)
        {
            var list = subscriptions.ToList();
            var paid = list.Where(s => s.Status == "Active" && !IsAdminGrant(s)).ToList();
            var adminGranted = list.Count(s => s.Status == "Active" && IsAdminGrant(s));

            return new SubscriptionTransactionSummary
            {
                TotalTransactions = list.Count,
                PaidTransactions = paid.Count,
                PendingTransactions = list.Count(s => s.Status == "Pending"),
                CancelledTransactions = list.Count(s => s.Status == "Cancelled" || s.Status == "Expired"),
                AdminGrantedTransactions = adminGranted,
                TotalRevenue = paid.Sum(s => s.Price)
            };
        }

        private static SubscriptionTransactionResponse ToTransactionResponse(Subscription subscription)
        {
            var isAdminGrant = IsAdminGrant(subscription);
            var audience = NormalizeAudience(subscription.Audience) ??
                           (subscription.EmployerId.HasValue ? "Employer" : "Applicant");
            var user = subscription.User;
            var employer = subscription.Employer;
            var accountName = audience == "Employer"
                ? employer?.CompanyName ?? user?.FullName ?? ""
                : user?.FullName ?? employer?.CompanyName ?? "";
            var accountEmail = audience == "Employer"
                ? employer?.ContactEmail ?? user?.Email ?? ""
                : user?.Email ?? employer?.ContactEmail ?? "";

            return new SubscriptionTransactionResponse
            {
                SubscriptionId = subscription.SubscriptionId,
                UserId = subscription.UserId ?? subscription.EmployerId,
                AccountName = string.IsNullOrWhiteSpace(accountName) ? "WorkBridge user" : accountName,
                AccountEmail = accountEmail,
                Audience = audience,
                PlanId = subscription.SubscriptionPlanId,
                PlanName = subscription.SubscriptionPlan?.Name ?? subscription.PlanName,
                PlanCode = subscription.PlanName,
                DurationDays = subscription.SubscriptionPlan?.DurationDays ?? ParseDurationDays(subscription.PlanName),
                Price = subscription.Price,
                Currency = subscription.SubscriptionPlan?.Currency ?? "VND",
                Status = subscription.Status,
                Source = isAdminGrant ? "AdminGrant" : "PayOS",
                OrderCode = subscription.PaymentOrderCode,
                CreatedAt = subscription.StartDate,
                StartDate = subscription.Status == "Active" ? subscription.StartDate : null,
                EndDate = subscription.Status == "Active" ? subscription.EndDate : null,
                ExpiresAt = subscription.Status == "Pending" ? GetPendingExpiresAt(subscription) : null,
                ExpiresInSeconds = GetPendingExpiresInSeconds(subscription),
                IsPaid = subscription.Status == "Active",
                IsAdminGrant = isAdminGrant
            };
        }

        private async Task NotifyVipActivatedAsync(
            Subscription subscription,
            int userId,
            string audience,
            int durationDays,
            bool extendedExistingVip,
            bool grantedByAdmin)
        {
            try
            {
                var planName = subscription.SubscriptionPlan?.Name ?? subscription.PlanName;
                var vipLabel = audience == "Employer" ? "Doanh nghiep" : "Ca nhan";
                var title = grantedByAdmin
                    ? $"Tai khoan cua ban da duoc nang cap VIP {vipLabel}"
                    : $"Goi VIP {vipLabel} da duoc kich hoat";
                var action = grantedByAdmin
                    ? "Quan tri vien da kich hoat"
                    : "Thanh toan thanh cong va he thong da kich hoat";
                var message = $"{action} goi {planName} cho tai khoan cua ban. " +
                              (extendedExistingVip
                                  ? $"Thoi han moi duoc cong noi tiep den {subscription.EndDate:dd/MM/yyyy}."
                                  : $"Goi co hieu luc {durationDays} ngay, den {subscription.EndDate:dd/MM/yyyy}.");

                await _notificationService.CreateNotificationAsync(userId, title, message);
            }
            catch
            {
                // VIP activation must not fail because email/notification delivery is unavailable.
            }
        }

        private static string BuildActivationMessage(string audience, bool extendedExistingVip, bool grantedByAdmin)
        {
            if (grantedByAdmin)
            {
                return extendedExistingVip
                    ? "Da nang VIP thanh cong. Goi moi duoc cong noi tiep vao so ngay con lai."
                    : audience == "Applicant"
                        ? "Da nang VIP Ca nhan thanh cong."
                        : "Da nang VIP Doanh nghiep thanh cong.";
            }

            return extendedExistingVip
                ? "Thanh toan thanh cong! Goi VIP moi da duoc cong noi tiep vao so ngay con lai."
                : audience == "Applicant"
                    ? "Thanh toan thanh cong! Goi VIP Ca nhan da duoc kich hoat."
                    : "Thanh toan thanh cong! Goi VIP Doanh nghiep da duoc kich hoat.";
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

    public class AdminGrantVipRequest
    {
        public int? PlanId { get; set; }
        public int? DurationDays { get; set; }
        public string? Note { get; set; }
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
        [JsonPropertyName("expiresAt")]
        public DateTime? ExpiresAt { get; set; }
        [JsonPropertyName("expiresInSeconds")]
        public int ExpiresInSeconds { get; set; }
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
        [JsonPropertyName("expiresAt")]
        public DateTime? ExpiresAt { get; set; }
        [JsonPropertyName("expiresInSeconds")]
        public int ExpiresInSeconds { get; set; }
        [JsonIgnore]
        public Subscription? Subscription { get; set; }
    }

    public class CancelPaymentRequest
    {
        public int? SubscriptionId { get; set; }
        public long? OrderCode { get; set; }
        public string? Audience { get; set; }
        public string? Reason { get; set; }
    }

    public class SubscriptionHistoryResult
    {
        public SubscriptionTransactionSummary Summary { get; set; } = new();
        public List<SubscriptionTransactionResponse> Transactions { get; set; } = new();
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalItems { get; set; }
        public int TotalPages { get; set; }
    }

    public class AdminSubscriptionHistoryResult : SubscriptionHistoryResult
    {
    }

    public class SubscriptionTransactionSummary
    {
        public int TotalTransactions { get; set; }
        public int PaidTransactions { get; set; }
        public int PendingTransactions { get; set; }
        public int CancelledTransactions { get; set; }
        public int AdminGrantedTransactions { get; set; }
        public decimal TotalRevenue { get; set; }
    }

    public class SubscriptionTransactionResponse
    {
        public int SubscriptionId { get; set; }
        public int? UserId { get; set; }
        public string AccountName { get; set; } = "";
        public string AccountEmail { get; set; } = "";
        public string Audience { get; set; } = "";
        public int? PlanId { get; set; }
        public string PlanName { get; set; } = "";
        public string PlanCode { get; set; } = "";
        public int DurationDays { get; set; }
        public decimal Price { get; set; }
        public string Currency { get; set; } = "VND";
        public string Status { get; set; } = "";
        public string Source { get; set; } = "";
        public long? OrderCode { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public int ExpiresInSeconds { get; set; }
        public bool IsPaid { get; set; }
        public bool IsAdminGrant { get; set; }
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

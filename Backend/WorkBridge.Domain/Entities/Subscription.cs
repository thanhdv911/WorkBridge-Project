using System;
using System.Collections.Generic;

namespace WorkBridge.Domain.Entities;

public partial class Subscription
{
    public int SubscriptionId { get; set; }

    public int? EmployerId { get; set; }

    public int? UserId { get; set; }

    public int? SubscriptionPlanId { get; set; }

    public long? PaymentOrderCode { get; set; }

    public string? PaymentPayloadJson { get; set; }

    public string Audience { get; set; } = "Employer";

    public string PlanName { get; set; } = null!;

    public decimal Price { get; set; }

    public DateTime StartDate { get; set; }

    public DateTime EndDate { get; set; }

    public string Status { get; set; } = null!;

    public virtual EmployerProfile? Employer { get; set; }

    public virtual User? User { get; set; }

    public virtual SubscriptionPlan? SubscriptionPlan { get; set; }
}

using System;
using System.Collections.Generic;

namespace WorkBridge.Infrastructure.Models;

public partial class Subscription
{
    public int SubscriptionId { get; set; }

    public int EmployerId { get; set; }

    public string PlanName { get; set; } = null!;

    public decimal Price { get; set; }

    public DateTime StartDate { get; set; }

    public DateTime EndDate { get; set; }

    public string Status { get; set; } = null!;

    public virtual EmployerProfile Employer { get; set; } = null!;
}

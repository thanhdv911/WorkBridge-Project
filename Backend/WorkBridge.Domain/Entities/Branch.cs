using System;

namespace WorkBridge.Domain.Entities;

public partial class Branch
{
    public int BranchId { get; set; }

    public int EmployerId { get; set; }

    public string Name { get; set; } = null!;

    public string Address { get; set; } = null!;

    public string? Phone { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }
}

using System;

namespace WorkBridge.Domain.Entities;

public partial class PlatformMaintenanceSetting
{
    public int PlatformMaintenanceSettingId { get; set; }

    public bool IsEnabled { get; set; }

    public DateTime? StartedAtUtc { get; set; }

    public DateTime? EndsAtUtc { get; set; }

    public string Title { get; set; } = "WorkBridge đang bảo trì";

    public string Message { get; set; } = "Hệ thống đang được bảo trì để nâng cấp trải nghiệm. Vui lòng quay lại sau ít phút.";

    public string? UpdatedBy { get; set; }

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

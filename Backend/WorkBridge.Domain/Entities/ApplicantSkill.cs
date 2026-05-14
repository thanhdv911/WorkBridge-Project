using System;
using System.Collections.Generic;

namespace WorkBridge.Domain.Entities;

public partial class ApplicantSkill
{
    public int SkillId { get; set; }

    public int ApplicantId { get; set; }

    public string SkillName { get; set; } = null!;

    public int EndorsementCount { get; set; }

    public virtual ApplicantProfile Applicant { get; set; } = null!;
}

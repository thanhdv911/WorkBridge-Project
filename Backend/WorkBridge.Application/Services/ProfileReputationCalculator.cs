using WorkBridge.Domain.Entities;

namespace WorkBridge.Application.Services
{
    public static class ProfileReputationCalculator
    {
        private const int BaseScore = 80;

        public static int CalculateApplicantScore(ApplicantProfile? profile, User? user = null)
        {
            var score = BaseScore;

            if (HasValue(user?.FullName)) score += 2;
            if (HasValue(user?.Email)) score += 2;
            if (HasValue(profile?.Phone)) score += 4;
            if (HasValue(profile?.Address)) score += 4;
            if (HasValue(profile?.University)) score += 3;
            if (HasValue(profile?.Major)) score += 3;
            if (HasValue(profile?.StudyYear)) score += 3;
            if (HasValue(profile?.AboutMe)) score += 4;
            if (HasValue(profile?.CvUrl)) score += 5;

            score -= Math.Max(0, profile?.ReportCount ?? 0) * 5;
            return ClampScore(score);
        }

        public static int CalculateEmployerScore(EmployerProfile? profile, User? user = null)
        {
            var score = BaseScore;

            if (HasValue(user?.FullName)) score += 2;
            if (HasValue(user?.Email)) score += 2;
            if (HasValue(profile?.CompanyName)) score += 5;
            if (HasValue(profile?.ContactEmail)) score += 3;
            if (HasValue(profile?.ContactPhone)) score += 5;
            if (HasValue(profile?.Address)) score += 5;
            if (HasValue(profile?.Description)) score += 5;
            if (HasValue(profile?.LogoUrl)) score += 2;

            score -= Math.Max(0, profile?.ReportCount ?? 0) * 5;
            return ClampScore(score);
        }

        public static IReadOnlyList<string> GetMissingApplicantApplyFields(ApplicantProfile profile)
        {
            var missing = new List<string>();

            if (!HasValue(profile.Phone)) missing.Add("số điện thoại");
            if (!HasValue(profile.Address)) missing.Add("vị trí/địa chỉ");
            if (!HasValue(profile.University)) missing.Add("trường học");
            if (!HasValue(profile.Major)) missing.Add("chuyên ngành");
            if (!HasValue(profile.StudyYear)) missing.Add("năm học");
            if (!HasValue(profile.CvUrl)) missing.Add("CV PDF");

            return missing;
        }

        public static bool HasCompleteApplicantApplyProfile(ApplicantProfile profile)
        {
            return GetMissingApplicantApplyFields(profile).Count == 0;
        }

        private static bool HasValue(string? value)
        {
            return !string.IsNullOrWhiteSpace(value);
        }

        private static int ClampScore(int score)
        {
            return Math.Max(0, Math.Min(100, score));
        }
    }
}

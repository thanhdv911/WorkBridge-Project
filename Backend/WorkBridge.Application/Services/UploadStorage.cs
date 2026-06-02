using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace WorkBridge.Application.Services
{
    public static class UploadStorage
    {
        private const string UploadsRootEnvName = "WORKBRIDGE_UPLOADS_ROOT";

        public static string ResolveUploadsRoot(string contentRootPath)
        {
            var configuredRoot = Environment.GetEnvironmentVariable(UploadsRootEnvName);
            if (!string.IsNullOrWhiteSpace(configuredRoot))
            {
                return Path.GetFullPath(configuredRoot);
            }

            var appServiceSiteName = Environment.GetEnvironmentVariable("WEBSITE_SITE_NAME");
            var appServiceHome = Environment.GetEnvironmentVariable("HOME");
            if (!string.IsNullOrWhiteSpace(appServiceSiteName) &&
                !string.IsNullOrWhiteSpace(appServiceHome))
            {
                return Path.GetFullPath(Path.Combine(appServiceHome, "data", "workbridge", "uploads"));
            }

            return Path.GetFullPath(Path.Combine(contentRootPath, "wwwroot", "uploads"));
        }

        public static string ResolveCvUploadsRoot(string contentRootPath)
        {
            return Path.GetFullPath(Path.Combine(ResolveUploadsRoot(contentRootPath), "cvs"));
        }

        public static IReadOnlyList<string> GetCandidateCvUploadRoots(string contentRootPath)
        {
            var candidates = new[]
            {
                ResolveCvUploadsRoot(contentRootPath),
                Path.Combine(contentRootPath, "wwwroot", "uploads", "cvs"),
                Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "cvs"),
                Path.Combine(Directory.GetCurrentDirectory(), "Backend", "WorkBridge.API", "wwwroot", "uploads", "cvs")
            };

            return candidates
                .Select(Path.GetFullPath)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }

        public static bool IsInsideRoot(string rootPath, string candidatePath)
        {
            var root = Path.GetFullPath(rootPath).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
                + Path.DirectorySeparatorChar;
            var candidate = Path.GetFullPath(candidatePath);
            return candidate.StartsWith(root, StringComparison.OrdinalIgnoreCase);
        }
    }
}

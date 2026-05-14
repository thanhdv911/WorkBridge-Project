using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkBridge.Application.DTOs;

namespace WorkBridge.Application.Services
{
    public interface IShiftService
    {
        // Employer APIs
        Task<ScheduleResponse> CreateScheduleAsync(int employerId, CreateScheduleRequest request);
        Task<IEnumerable<ScheduleResponse>> GetEmployerSchedulesAsync(int employerId, int? jobPostId, DateTime? startDate, DateTime? endDate);
        
        // Applicant APIs
        Task<IEnumerable<ScheduleResponse>> GetMySchedulesAsync(int applicantId, DateTime? startDate, DateTime? endDate);
        Task<string?> CheckInAsync(int applicantId, int scheduleId, string? note);
        Task<string?> CheckOutAsync(int applicantId, int scheduleId);

        // Swap APIs
        Task<string?> RequestShiftSwapAsync(int applicantId, CreateSwapRequest request);
        Task<IEnumerable<SwapRequestResponse>> GetAvailableSwapRequestsAsync(int applicantId);
        Task<string?> AcceptSwapRequestAsync(int applicantId, int swapRequestId);
    }
}

namespace WorkBridge.Application.DTOs
{
    public class CreateBranchRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string? Phone { get; set; }
    }

    public class BranchResponse
    {
        public int BranchId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateOfferRequest
    {
        public int ApplicationId { get; set; }
        public int BranchId { get; set; }
        public string Position { get; set; } = string.Empty;
        public decimal HourlyRate { get; set; }
        public DateTime StartDate { get; set; }
        public int PaydayOfMonth { get; set; } = 5;
        public DateTime? ExpiredAt { get; set; }
        public string? ExpectedShifts { get; set; }
    }

    public class UpdateOfferRequest
    {
        public int BranchId { get; set; }
        public string Position { get; set; } = string.Empty;
        public decimal HourlyRate { get; set; }
        public DateTime StartDate { get; set; }
        public int PaydayOfMonth { get; set; } = 5;
        public DateTime? ExpiredAt { get; set; }
        public string? ExpectedShifts { get; set; }
    }

    public class OfferResponse
    {
        public int OfferId { get; set; }
        public int ApplicationId { get; set; }
        public int JobPostId { get; set; }
        public int EmployerId { get; set; }
        public int ApplicantId { get; set; }
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public string ApplicantName { get; set; } = string.Empty;
        public string JobTitle { get; set; } = string.Empty;
        public string Position { get; set; } = string.Empty;
        public decimal HourlyRate { get; set; }
        public DateTime StartDate { get; set; }
        public int PaydayOfMonth { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? AcceptedAt { get; set; }
        public DateTime? ExpiredAt { get; set; }
        public string? ExpectedShifts { get; set; }
        public int? Vacancies { get; set; }
        public int ActiveEmploymentCount { get; set; }
        public bool IsOverHiringPlan { get; set; }
        public string HiringPlanNote { get; set; } = string.Empty;
    }

    public class EmploymentResponse
    {
        public int EmploymentId { get; set; }
        public int EmployerId { get; set; }
        public int EmployeeUserId { get; set; }
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public int OfferId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string EmployeeEmail { get; set; } = string.Empty;
        public string Position { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal CurrentHourlyRate { get; set; }
        public int JobPostId { get; set; }
        public string JobTitle { get; set; } = string.Empty;
        public string? ExpectedShifts { get; set; }
        public string? AvatarUrl { get; set; }
    }

    public class UpdateEmployeePositionRequest
    {
        public string Position { get; set; } = string.Empty;
    }

    public class UpdateEmploymentStatusRequest
    {
        public string Status { get; set; } = string.Empty;
    }

    public class UpdateEmployeeBranchRequest
    {
        public int BranchId { get; set; }
    }

    public class UpdateEmployeeRateRequest
    {
        public decimal HourlyRate { get; set; }
        public DateTime EffectiveFrom { get; set; }
    }

    public class CreateWorkShiftRequest
    {
        public int BranchId { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string? RequiredRole { get; set; }
        public int RequiredPeople { get; set; } = 1;
    }

    public class DeleteWorkShiftsByWeekRequest
    {
        public DateTime WeekStartDate { get; set; }
        public int? BranchId { get; set; }
    }

    public class AssignShiftRequest
    {
        public int EmploymentId { get; set; }
    }

    public class ReplaceShiftAssignmentRequest
    {
        public int EmploymentId { get; set; }
    }

    public class AutoScheduleBatchRequest
    {
        public int? BranchId { get; set; }
        public DateTime WeekStartDate { get; set; }
    }

    public class AutoScheduleBatchResponse
    {
        public string Message { get; set; } = string.Empty;
        public int BranchesProcessed { get; set; }
        public int ShiftsProcessed { get; set; }
        public int NewAssignments { get; set; }
        public int RemainingOpenSlots { get; set; }
        public List<AutoScheduleBranchSummary> Branches { get; set; } = new();
    }

    public class AutoScheduleBranchSummary
    {
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public int ShiftsProcessed { get; set; }
        public int RequiredSlots { get; set; }
        public int AssignedSlots { get; set; }
        public int NewAssignments { get; set; }
        public int RemainingOpenSlots { get; set; }
    }

    public class WorkShiftResponse
    {
        public int WorkShiftId { get; set; }
        public int EmployerId { get; set; }
        public int BranchId { get; set; }
        public int? RegistrationWindowId { get; set; }
        public string? RegistrationWindowStatus { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string? RequiredRole { get; set; }
        public int RequiredPeople { get; set; }
        public string Status { get; set; } = string.Empty;
        public int AssignedCount { get; set; }
        public int MissingCount { get; set; }
        public string FillStatus { get; set; } = string.Empty;
        public string SchedulingNote { get; set; } = string.Empty;
        public List<ShiftAssignmentResponse> Assignments { get; set; } = new();
    }

    public class ShiftAssignmentResponse
    {
        public int ShiftAssignmentId { get; set; }
        public int WorkShiftId { get; set; }
        public int EmploymentId { get; set; }
        public int EmployeeUserId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public bool IsFixed { get; set; }
        public string AssignmentSource { get; set; } = string.Empty;
        public DateTime AssignedAt { get; set; }
        public int EditCount { get; set; }
        public int? AttendanceRecordId { get; set; }
        public string? AttendanceStatus { get; set; }
        public DateTime? CheckInAt { get; set; }
        public DateTime? CheckOutAt { get; set; }
        public int WorkedMinutes { get; set; }
        public string SchedulingReason { get; set; } = string.Empty;
    }

    public class EmployerShiftTimingResponse
    {
        public int EmployerShiftTimingId { get; set; }
        public int EmployerId { get; set; }
        public string ShiftName { get; set; } = string.Empty;
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
        public int RequiredPeople { get; set; }
        public bool IsActive { get; set; }
    }

    public class SaveEmployerShiftTimingRequest
    {
        public string ShiftName { get; set; } = string.Empty;
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
        public int RequiredPeople { get; set; }
    }

    public class PublishRegistrationWindowRequest
    {
        public int BranchId { get; set; }
    }

    public class SubmitShiftRegistrationRequest
    {
        public List<int> ShiftIds { get; set; } = new();
        public List<int> FixedShiftIds { get; set; } = new();
        public List<int> ExtraShiftIds { get; set; } = new();
    }

    public class ShiftRegistrationWindowResponse
    {
        public int ShiftRegistrationWindowId { get; set; }
        public int EmployerId { get; set; }
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public DateTime WeekStartDate { get; set; }
        public DateTime OpenAt { get; set; }
        public DateTime CloseAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public int MinFixedShifts { get; set; }
        public DateTime PublishedAt { get; set; }
        public DateTime? FinalizedAt { get; set; }
        public bool CanSubmit { get; set; }
        public int MyFixedCount { get; set; }
        public int MyExtraCount { get; set; }
        public int MySelectedCount { get; set; }
        public int RegistrationEditCount { get; set; }
        public int RemainingRegistrationEdits { get; set; }
        public int MaxRegistrationEdits { get; set; } = 2;
        public int AssignedCount { get; set; }
        public int MissingCount { get; set; }
        public string FillStatus { get; set; } = string.Empty;
        public string SchedulingNote { get; set; } = string.Empty;
        public List<WorkShiftResponse> Shifts { get; set; } = new();
        public List<ShiftRegistrationMissingEmployeeResponse> MissingEmployees { get; set; } = new();
        public List<UnderstaffedShiftResponse> UnderstaffedShifts { get; set; } = new();
    }

    public class UnderstaffedShiftResponse
    {
        public int WorkShiftId { get; set; }
        public string ShiftTitle { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public int RequiredPeople { get; set; }
        public int AssignedCount { get; set; }
        public int MissingCount { get; set; }
        public string SchedulingNote { get; set; } = string.Empty;
    }

    public class ShiftRegistrationMissingEmployeeResponse
    {
        public int EmploymentId { get; set; }
        public int EmployeeUserId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public int FixedCount { get; set; }
        public int MissingCount { get; set; }
    }

    public class AttendanceResponse
    {
        public int AttendanceRecordId { get; set; }
        public int ShiftAssignmentId { get; set; }
        public int EmployeeUserId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public DateTime? CheckInAt { get; set; }
        public DateTime? CheckOutAt { get; set; }
        public int WorkedMinutes { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Note { get; set; }
    }

    public class AdjustAttendanceRequest
    {
        public DateTime CheckInAt { get; set; }
        public DateTime CheckOutAt { get; set; }
        public string? Note { get; set; }
        public bool MarkApproved { get; set; } = true;
    }

    public class PayrollPeriodResponse
    {
        public int PayrollPeriodId { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime Payday { get; set; }
        public decimal TotalSalary { get; set; }
        public List<PayrollItemResponse> Items { get; set; } = new();
    }

    public class PayrollItemResponse
    {
        public int PayrollItemId { get; set; }
        public int EmploymentId { get; set; }
        public int EmployeeUserId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public int TotalApprovedMinutes { get; set; }
        public decimal HourlyRateSnapshot { get; set; }
        public decimal BaseSalary { get; set; }
        public decimal Bonus { get; set; }
        public decimal Penalty { get; set; }
        public decimal Deduction { get; set; }
        public decimal FinalSalary { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class UpdatePayrollItemAdjustmentRequest
    {
        public decimal Bonus { get; set; }
        public decimal Penalty { get; set; }
        public decimal Deduction { get; set; }
    }

    public class ShiftPassCandidateResponse
    {
        public int EmploymentId { get; set; }
        public int EmployeeUserId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string Position { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public decimal HourlyRate { get; set; }
    }

    public class CreateShiftPassRequest
    {
        public int ShiftAssignmentId { get; set; }
        public int ToEmployeeUserId { get; set; }
        public string? Reason { get; set; }
    }

    public class ShiftPassRequestResponse
    {
        public int ShiftPassRequestId { get; set; }
        public int ShiftAssignmentId { get; set; }
        public int WorkShiftId { get; set; }
        public string ShiftTitle { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public DateTime ShiftStartTime { get; set; }
        public DateTime ShiftEndTime { get; set; }
        public int FromEmployeeUserId { get; set; }
        public string FromEmployeeName { get; set; } = string.Empty;
        public int ToEmployeeUserId { get; set; }
        public string ToEmployeeName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime RequestedAt { get; set; }
        public DateTime? RespondedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public string? Reason { get; set; }
    }
}

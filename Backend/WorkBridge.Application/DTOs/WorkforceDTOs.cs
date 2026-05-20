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
    }

    public class OfferResponse
    {
        public int OfferId { get; set; }
        public int ApplicationId { get; set; }
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
        public decimal CurrentHourlyRate { get; set; }
    }

    public class UpdateEmploymentStatusRequest
    {
        public string Status { get; set; } = string.Empty;
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

    public class AssignShiftRequest
    {
        public int EmploymentId { get; set; }
    }

    public class WorkShiftResponse
    {
        public int WorkShiftId { get; set; }
        public int EmployerId { get; set; }
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string? RequiredRole { get; set; }
        public int RequiredPeople { get; set; }
        public string Status { get; set; } = string.Empty;
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
        public DateTime AssignedAt { get; set; }
        public int? AttendanceRecordId { get; set; }
        public string? AttendanceStatus { get; set; }
        public DateTime? CheckInAt { get; set; }
        public DateTime? CheckOutAt { get; set; }
        public int WorkedMinutes { get; set; }
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

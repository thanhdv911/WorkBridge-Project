using WorkBridge.Application.DTOs;

namespace WorkBridge.Application.Services
{
    public interface IWorkforceService
    {
        Task<IEnumerable<EmploymentResponse>> GetEmployerEmployeesAsync(int employerId);
        Task<IEnumerable<EmploymentResponse>> GetMyEmploymentsAsync(int employeeUserId);
        Task<(EmploymentResponse? Employment, string? Error)> UpdateEmploymentStatusAsync(int employerId, int employmentId, UpdateEmploymentStatusRequest request);
        Task<(EmploymentResponse? Employment, string? Error)> UpdateEmployeeRateAsync(int employerId, int employmentId, UpdateEmployeeRateRequest request);
        Task<(EmploymentResponse? Employment, string? Error)> UpdateEmployeePositionAsync(int employerId, int employmentId, UpdateEmployeePositionRequest request);
        Task<(EmploymentResponse? Employment, string? Error)> UpdateEmployeeBranchAsync(int employerId, int employmentId, UpdateEmployeeBranchRequest request);
        Task<(WorkShiftResponse? Shift, string? Error)> CreateShiftAsync(int employerId, CreateWorkShiftRequest request);
        Task<IEnumerable<WorkShiftResponse>> GetEmployerShiftsAsync(int employerId);
        Task<(bool Success, string? Error)> DeleteShiftAsync(int employerId, int workShiftId);
        Task<(int DeletedCount, string? Error)> DeleteShiftsByWeekAsync(int employerId, DeleteWorkShiftsByWeekRequest request);
        Task<IEnumerable<WorkShiftResponse>> GetAvailableShiftsAsync(int employeeUserId);
        Task<IEnumerable<WorkShiftResponse>> GetMyShiftsAsync(int employeeUserId);
        Task<IEnumerable<WorkShiftResponse>> GetMyBranchShiftsAsync(int employeeUserId);
        Task<(ShiftAssignmentResponse? Assignment, string? Error)> AssignShiftAsync(int employerId, int workShiftId, AssignShiftRequest request);
        Task<(ShiftAssignmentResponse? Assignment, string? Error)> ReplaceShiftAssignmentAsync(int employerId, int assignmentId, ReplaceShiftAssignmentRequest request);
        Task<(bool Success, string? Error)> RemoveShiftAssignmentAsync(int employerId, int assignmentId);
        Task<(ShiftAssignmentResponse? Assignment, string? Error)> RegisterForShiftAsync(int employeeUserId, int workShiftId);
        Task<(ShiftRegistrationWindowResponse? Window, string? Error)> PublishNextWeekRegistrationWindowAsync(int employerId, PublishRegistrationWindowRequest request);
        Task<IEnumerable<ShiftRegistrationWindowResponse>> GetMyNextWeekRegistrationWindowsAsync(int employeeUserId);
        Task<(ShiftRegistrationWindowResponse? Window, string? Error, bool IsConflict)> SubmitShiftRegistrationAsync(int employeeUserId, int windowId, SubmitShiftRegistrationRequest request);
        Task<(ShiftRegistrationWindowResponse? Window, string? Error)> FinalizeRegistrationWindowAsync(int employerId, int windowId);
        Task<(AttendanceResponse? Attendance, string? Error)> CheckInAsync(int employeeUserId, int shiftAssignmentId);
        Task<(AttendanceResponse? Attendance, string? Error)> CheckOutAsync(int employeeUserId, int shiftAssignmentId);
        Task<(AttendanceResponse? Attendance, string? Error)> ApproveAttendanceAsync(int employerId, int attendanceRecordId);
        Task<(AttendanceResponse? Attendance, string? Error)> RejectAttendanceAsync(int employerId, int attendanceRecordId, string? note);
        Task<(AttendanceResponse? Attendance, string? Error)> AdjustAttendanceAsync(int employerId, int attendanceRecordId, AdjustAttendanceRequest request);
        Task<(PayrollPeriodResponse? Payroll, string? Error)> GeneratePayrollAsync(int employerId, int month, int year);
        Task<IEnumerable<PayrollPeriodResponse>> GetPayrollPeriodsAsync(int employerId);
        Task<IEnumerable<PayrollPeriodResponse>> GetMyPayslipsAsync(int employeeUserId);
        Task<(PayrollPeriodResponse? Payroll, string? Error)> LockPayrollAsync(int employerId, int payrollPeriodId);
        Task<(PayrollPeriodResponse? Payroll, string? Error)> MarkPayrollPaidAsync(int employerId, int payrollPeriodId);
        Task<(PayrollPeriodResponse? Payroll, string? Error)> UpdatePayrollItemAdjustmentAsync(int employerId, int payrollItemId, UpdatePayrollItemAdjustmentRequest request);
        Task<IEnumerable<ShiftPassCandidateResponse>> GetPassCandidatesAsync(int employeeUserId, int shiftAssignmentId);
        Task<(ShiftPassRequestResponse? Request, string? Error)> CreateShiftPassRequestAsync(int employeeUserId, CreateShiftPassRequest request);
        Task<IEnumerable<ShiftPassRequestResponse>> GetIncomingPassRequestsAsync(int employeeUserId);
        Task<IEnumerable<ShiftPassRequestResponse>> GetOutgoingPassRequestsAsync(int employeeUserId);
        Task<(ShiftPassRequestResponse? Request, string? Error)> AcceptShiftPassRequestAsync(int employeeUserId, int requestId);
        Task<(ShiftPassRequestResponse? Request, string? Error)> RejectShiftPassRequestAsync(int employeeUserId, int requestId);
        Task<IEnumerable<EmployerShiftTimingResponse>> GetShiftTimingsAsync(int employerId);
        Task<IEnumerable<EmployerShiftTimingResponse>> SaveShiftTimingsAsync(int employerId, List<SaveEmployerShiftTimingRequest> request);
        Task<(ShiftAssignmentResponse? Assignment, string? Error)> ToggleAssignmentFixedStatusAsync(int userId, int assignmentId);
        Task<(bool Success, string Message)> AutoAssignUnregisteredWorkersAsync(int employerId, DateTime runTime);
        Task<(AutoScheduleBatchResponse? Result, string? Error)> AutoScheduleBatchAsync(int employerId, AutoScheduleBatchRequest request);
    }
}

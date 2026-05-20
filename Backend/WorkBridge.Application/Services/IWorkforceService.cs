using WorkBridge.Application.DTOs;

namespace WorkBridge.Application.Services
{
    public interface IWorkforceService
    {
        Task<IEnumerable<EmploymentResponse>> GetEmployerEmployeesAsync(int employerId);
        Task<IEnumerable<EmploymentResponse>> GetMyEmploymentsAsync(int employeeUserId);
        Task<(EmploymentResponse? Employment, string? Error)> UpdateEmploymentStatusAsync(int employerId, int employmentId, UpdateEmploymentStatusRequest request);
        Task<(EmploymentResponse? Employment, string? Error)> UpdateEmployeeRateAsync(int employerId, int employmentId, UpdateEmployeeRateRequest request);
        Task<(WorkShiftResponse? Shift, string? Error)> CreateShiftAsync(int employerId, CreateWorkShiftRequest request);
        Task<IEnumerable<WorkShiftResponse>> GetEmployerShiftsAsync(int employerId);
        Task<IEnumerable<WorkShiftResponse>> GetMyShiftsAsync(int employeeUserId);
        Task<(ShiftAssignmentResponse? Assignment, string? Error)> AssignShiftAsync(int employerId, int workShiftId, AssignShiftRequest request);
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
    }
}

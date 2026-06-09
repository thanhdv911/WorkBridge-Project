using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Services;

namespace WorkBridge.API.Controllers
{
    [Route("api/workforce")]
    [ApiController]
    [Authorize]
    public class WorkforceController : ControllerBase
    {
        private readonly IWorkforceService _workforceService;

        public WorkforceController(IWorkforceService workforceService)
        {
            _workforceService = workforceService;
        }

        [HttpGet("employees")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> GetEmployees()
        {
            return Ok(await _workforceService.GetEmployerEmployeesAsync(GetUserId()));
        }

        [HttpGet("my-employments")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> GetMyEmployments()
        {
            return Ok(await _workforceService.GetMyEmploymentsAsync(GetUserId()));
        }

        [HttpGet("applicant/{applicantId}/employments")]
        public async Task<IActionResult> GetApplicantEmployments(int applicantId)
        {
            return Ok(await _workforceService.GetMyEmploymentsAsync(applicantId));
        }

        [HttpPatch("employees/{employmentId}/status")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> UpdateEmploymentStatus(int employmentId, [FromBody] UpdateEmploymentStatusRequest request)
        {
            var (employment, error) = await _workforceService.UpdateEmploymentStatusAsync(GetUserId(), employmentId, request);
            if (error != null) return BadRequest(new { message = error });
            return Ok(employment);
        }

        [HttpPatch("employees/{employmentId}/rate")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> UpdateEmployeeRate(int employmentId, [FromBody] UpdateEmployeeRateRequest request)
        {
            var (employment, error) = await _workforceService.UpdateEmployeeRateAsync(GetUserId(), employmentId, request);
            if (error != null) return BadRequest(new { message = error });
            return Ok(employment);
        }

        [HttpPatch("employees/{employmentId}/position")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> UpdateEmployeePosition(int employmentId, [FromBody] UpdateEmployeePositionRequest request)
        {
            var (employment, error) = await _workforceService.UpdateEmployeePositionAsync(GetUserId(), employmentId, request);
            if (error != null) return BadRequest(new { message = error });
            return Ok(employment);
        }

        [HttpPatch("employees/{employmentId}/branch")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> UpdateEmployeeBranch(int employmentId, [FromBody] UpdateEmployeeBranchRequest request)
        {
            var (employment, error) = await _workforceService.UpdateEmployeeBranchAsync(GetUserId(), employmentId, request);
            if (error != null) return BadRequest(new { message = error });
            return Ok(employment);
        }

        [HttpPost("shifts")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> CreateShift([FromBody] CreateWorkShiftRequest request)
        {
            var (shift, error) = await _workforceService.CreateShiftAsync(GetUserId(), request);
            if (error != null) return BadRequest(new { message = error });
            return Ok(shift);
        }

        [HttpGet("shifts")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> GetEmployerShifts()
        {
            return Ok(await _workforceService.GetEmployerShiftsAsync(GetUserId()));
        }

        [HttpGet("my-shifts")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> GetMyShifts()
        {
            return Ok(await _workforceService.GetMyShiftsAsync(GetUserId()));
        }

        [HttpGet("my-branch-shifts")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> GetMyBranchShifts()
        {
            return Ok(await _workforceService.GetMyBranchShiftsAsync(GetUserId()));
        }

        [HttpGet("available-shifts")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> GetAvailableShifts()
        {
            return Ok(await _workforceService.GetAvailableShiftsAsync(GetUserId()));
        }

        [HttpPost("shifts/{id}/assign")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> AssignShift(int id, [FromBody] AssignShiftRequest request)
        {
            var (assignment, error) = await _workforceService.AssignShiftAsync(GetUserId(), id, request);
            if (error != null) return BadRequest(new { message = error });
            return Ok(assignment);
        }

        [HttpPatch("assignments/{id}/replace")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> ReplaceShiftAssignment(int id, [FromBody] ReplaceShiftAssignmentRequest request)
        {
            var (assignment, error) = await _workforceService.ReplaceShiftAssignmentAsync(GetUserId(), id, request);
            if (error != null) return BadRequest(new { message = error });
            return Ok(assignment);
        }

        [HttpDelete("assignments/{id}")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> RemoveShiftAssignment(int id)
        {
            var (success, error) = await _workforceService.RemoveShiftAssignmentAsync(GetUserId(), id);
            if (!success) return BadRequest(new { message = error });
            return Ok(new { message = "Đã gỡ nhân viên khỏi ca." });
        }

        [HttpPost("shifts/{id}/register")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> RegisterForShift(int id)
        {
            var (assignment, error) = await _workforceService.RegisterForShiftAsync(GetUserId(), id);
            if (error != null) return BadRequest(new { message = error });
            return Ok(assignment);
        }

        [HttpPost("registration-windows/publish-next-week")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> PublishNextWeekRegistrationWindow([FromBody] PublishRegistrationWindowRequest request)
        {
            var (window, error) = await _workforceService.PublishNextWeekRegistrationWindowAsync(GetUserId(), request);
            if (error != null) return BadRequest(new { message = error });
            return Ok(window);
        }

        [HttpGet("registration-windows/my-next-week")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> GetMyNextWeekRegistrationWindows()
        {
            return Ok(await _workforceService.GetMyNextWeekRegistrationWindowsAsync(GetUserId()));
        }

        [HttpPost("registration-windows/{id}/submit")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> SubmitShiftRegistration(int id, [FromBody] SubmitShiftRegistrationRequest request)
        {
            var (window, error, isConflict) = await _workforceService.SubmitShiftRegistrationAsync(GetUserId(), id, request);
            if (error != null)
            {
                if (isConflict) return Conflict(new { message = error, window });
                return BadRequest(new { message = error });
            }
            return Ok(window);
        }

        [HttpPost("registration-windows/{id}/finalize")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> FinalizeRegistrationWindow(int id)
        {
            var (window, error) = await _workforceService.FinalizeRegistrationWindowAsync(GetUserId(), id);
            if (error != null) return BadRequest(new { message = error });
            return Ok(window);
        }

        [HttpPost("attendance/{shiftAssignmentId}/check-in")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> CheckIn(int shiftAssignmentId)
        {
            var (attendance, error) = await _workforceService.CheckInAsync(GetUserId(), shiftAssignmentId);
            if (error != null) return BadRequest(new { message = error });
            return Ok(attendance);
        }

        [HttpPost("attendance/{shiftAssignmentId}/check-out")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> CheckOut(int shiftAssignmentId)
        {
            var (attendance, error) = await _workforceService.CheckOutAsync(GetUserId(), shiftAssignmentId);
            if (error != null) return BadRequest(new { message = error });
            return Ok(attendance);
        }

        [HttpPatch("attendance/{attendanceRecordId}/approve")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> ApproveAttendance(int attendanceRecordId)
        {
            var (attendance, error) = await _workforceService.ApproveAttendanceAsync(GetUserId(), attendanceRecordId);
            if (error != null) return BadRequest(new { message = error });
            return Ok(attendance);
        }

        [HttpPatch("attendance/{attendanceRecordId}/reject")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> RejectAttendance(int attendanceRecordId, [FromBody] string? note)
        {
            var (attendance, error) = await _workforceService.RejectAttendanceAsync(GetUserId(), attendanceRecordId, note);
            if (error != null) return BadRequest(new { message = error });
            return Ok(attendance);
        }

        [HttpPatch("attendance/{attendanceRecordId}/adjust")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> AdjustAttendance(int attendanceRecordId, [FromBody] AdjustAttendanceRequest request)
        {
            var (attendance, error) = await _workforceService.AdjustAttendanceAsync(GetUserId(), attendanceRecordId, request);
            if (error != null) return BadRequest(new { message = error });
            return Ok(attendance);
        }

        [HttpPost("payroll/generate")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> GeneratePayroll([FromQuery] int month, [FromQuery] int year)
        {
            var (payroll, error) = await _workforceService.GeneratePayrollAsync(GetUserId(), month, year);
            if (error != null) return BadRequest(new { message = error });
            return Ok(payroll);
        }

        [HttpGet("payroll")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> GetPayrollPeriods()
        {
            return Ok(await _workforceService.GetPayrollPeriodsAsync(GetUserId()));
        }

        [HttpPatch("payroll/{payrollPeriodId}/lock")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> LockPayroll(int payrollPeriodId)
        {
            var (payroll, error) = await _workforceService.LockPayrollAsync(GetUserId(), payrollPeriodId);
            if (error != null) return BadRequest(new { message = error });
            return Ok(payroll);
        }

        [HttpPatch("payroll/{payrollPeriodId}/mark-paid")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> MarkPayrollPaid(int payrollPeriodId)
        {
            var (payroll, error) = await _workforceService.MarkPayrollPaidAsync(GetUserId(), payrollPeriodId);
            if (error != null) return BadRequest(new { message = error });
            return Ok(payroll);
        }

        [HttpPatch("payroll/items/{payrollItemId}/adjust")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> AdjustPayrollItem(int payrollItemId, [FromBody] UpdatePayrollItemAdjustmentRequest request)
        {
            var (payroll, error) = await _workforceService.UpdatePayrollItemAdjustmentAsync(GetUserId(), payrollItemId, request);
            if (error != null) return BadRequest(new { message = error });
            return Ok(payroll);
        }

        [HttpGet("my-payslips")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> GetMyPayslips()
        {
            return Ok(await _workforceService.GetMyPayslipsAsync(GetUserId()));
        }

        [HttpGet("shift-pass/{shiftAssignmentId}/candidates")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> GetPassCandidates(int shiftAssignmentId)
        {
            return Ok(await _workforceService.GetPassCandidatesAsync(GetUserId(), shiftAssignmentId));
        }

        [HttpPost("shift-pass")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> CreateShiftPass([FromBody] CreateShiftPassRequest request)
        {
            var (passRequest, error) = await _workforceService.CreateShiftPassRequestAsync(GetUserId(), request);
            if (error != null) return BadRequest(new { message = error });
            return Ok(passRequest);
        }

        [HttpGet("shift-pass/incoming")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> GetIncomingShiftPassRequests()
        {
            return Ok(await _workforceService.GetIncomingPassRequestsAsync(GetUserId()));
        }

        [HttpGet("shift-pass/outgoing")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> GetOutgoingShiftPassRequests()
        {
            return Ok(await _workforceService.GetOutgoingPassRequestsAsync(GetUserId()));
        }

        [HttpPatch("shift-pass/{requestId}/accept")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> AcceptShiftPass(int requestId)
        {
            var (passRequest, error) = await _workforceService.AcceptShiftPassRequestAsync(GetUserId(), requestId);
            if (error != null) return BadRequest(new { message = error });
            return Ok(passRequest);
        }

        [HttpPatch("shift-pass/{requestId}/reject")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> RejectShiftPass(int requestId)
        {
            var (passRequest, error) = await _workforceService.RejectShiftPassRequestAsync(GetUserId(), requestId);
            if (error != null) return BadRequest(new { message = error });
            return Ok(passRequest);
        }

        [HttpGet("shift-timings")]
        public async Task<IActionResult> GetShiftTimings([FromQuery] int employerId)
        {
            int targetEmployerId = employerId;
            if (targetEmployerId == 0)
            {
                var role = User.FindFirstValue(ClaimTypes.Role);
                if (role == "Employer")
                {
                    targetEmployerId = GetUserId();
                }
                else
                {
                    return BadRequest(new { message = "Vui lòng chọn doanh nghiệp để xem cấu hình ca." });
                }
            }
            return Ok(await _workforceService.GetShiftTimingsAsync(targetEmployerId));
        }

        [HttpPost("shift-timings")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> SaveShiftTimings([FromBody] List<SaveEmployerShiftTimingRequest> request)
        {
            var timings = await _workforceService.SaveShiftTimingsAsync(GetUserId(), request);
            return Ok(timings);
        }

        [HttpPatch("assignments/{id}/toggle-fixed")]
        [Authorize(Roles = "Applicant")]
        public async Task<IActionResult> ToggleAssignmentFixed(int id)
        {
            var (assignment, error) = await _workforceService.ToggleAssignmentFixedStatusAsync(GetUserId(), id);
            if (error != null) return BadRequest(new { message = error });
            return Ok(assignment);
        }

        [HttpPost("auto-assign-unregistered")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> AutoAssignUnregistered([FromQuery] string? date)
        {
            DateTime runTime = DateTime.UtcNow;
            if (!string.IsNullOrEmpty(date) && DateTime.TryParse(date, out var parsedDate))
            {
                runTime = parsedDate;
            }
            var (success, message) = await _workforceService.AutoAssignUnregisteredWorkersAsync(GetUserId(), runTime);
            if (!success) return BadRequest(new { message });
            return Ok(new { message });
        }

        [HttpDelete("shifts/{id}")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> DeleteShift(int id)
        {
            var (success, error) = await _workforceService.DeleteShiftAsync(GetUserId(), id);
            if (!success) return BadRequest(new { message = error });
            return Ok(new { message = "Đã xóa ca làm." });
        }

        [HttpPost("shifts/delete-week")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> DeleteShiftsByWeek([FromBody] DeleteWorkShiftsByWeekRequest request)
        {
            var (deletedCount, error) = await _workforceService.DeleteShiftsByWeekAsync(GetUserId(), request);
            if (error != null) return BadRequest(new { message = error });
            return Ok(new { deletedCount, message = $"Đã xóa {deletedCount} ca làm." });
        }

        [HttpPost("shifts/auto-schedule-batch")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> AutoScheduleBatch([FromBody] AutoScheduleBatchRequest request)
        {
            var (result, error) = await _workforceService.AutoScheduleBatchAsync(GetUserId(), request);
            if (error != null) return BadRequest(new { message = error });
            return Ok(result);
        }

        private int GetUserId()
        {
            return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }
    }
}

using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkBridge.API.DTOs;
using WorkBridge.Infrastructure.Models;

namespace WorkBridge.API.Controllers
{
    [Route("api/shifts")]
    [ApiController]
    public class JobShiftController : ControllerBase
    {
        private readonly WorkBridgeContext _context;

        public JobShiftController(WorkBridgeContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ShiftResponse>>> GetShifts()
        {
            return await _context.JobShifts
                .Select(s => new ShiftResponse
                {
                    ShiftId = s.ShiftId,
                    ShiftName = s.ShiftName,
                    StartTime = s.StartTime,
                    EndTime = s.EndTime
                })
                .ToListAsync();
        }
    }
}

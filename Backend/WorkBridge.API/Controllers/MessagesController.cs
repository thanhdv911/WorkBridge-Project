using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkBridge.Application.DTOs;
using WorkBridge.Application.Services;

namespace WorkBridge.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MessagesController : ControllerBase
    {
        private readonly IMessageService _messageService;

        public MessagesController(IMessageService messageService)
        {
            _messageService = messageService;
        }

        private int GetUserId()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(userIdString, out int userId) ? userId : 0;
        }

        [HttpGet("conversations")]
        public async Task<IActionResult> GetConversations()
        {
            var userId = GetUserId();
            var conversations = await _messageService.GetConversationsAsync(userId);
            return Ok(conversations);
        }

        [HttpGet("{contactId}")]
        public async Task<IActionResult> GetChatHistory(int contactId)
        {
            var userId = GetUserId();
            var history = await _messageService.GetChatHistoryAsync(userId, contactId);
            
            await _messageService.MarkAsReadAsync(userId, contactId);
            
            return Ok(history);
        }

        [HttpPost]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
        {
            var userId = GetUserId();
            var response = await _messageService.SendMessageAsync(userId, request);
            if (response == null) return BadRequest("Could not send message.");
            return Ok(response);
        }
        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value!);
            var count = await _messageService.GetUnreadCountAsync(userId);
            return Ok(new { count });
        }
    }
}

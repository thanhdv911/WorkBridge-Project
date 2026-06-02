using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace WorkBridge.Application.Services
{
    public class GeminiService : IGeminiService
    {
        private readonly List<string> _keys = new List<string>();
        private readonly string _model;
        private readonly ILogger<GeminiService> _logger;
        private static readonly HttpClient _httpClient = new HttpClient();
        private int _currentKeyIndex = 0;
        private readonly object _lock = new object();

        public GeminiService(IConfiguration configuration, ILogger<GeminiService> logger)
        {
            _logger = logger;
            var keysSection = configuration.GetSection("GeminiAI:Keys");
            foreach (var child in keysSection.GetChildren())
            {
                if (child.Value != null)
                {
                    _keys.Add(child.Value);
                }
            }
            _model = configuration["GeminiAI:Model"] ?? "gemini-2.0-flash";
        }

        public async Task<string> SendPromptAsync(string systemPrompt, string userMessage, string? responseMimeType = null)
        {
            if (_keys.Count == 0)
            {
                throw new InvalidOperationException("No Gemini API keys configured.");
            }

            int attempts = 0;
            int maxAttempts = _keys.Count;

            while (attempts < maxAttempts)
            {
                string key;
                int keyIdx;
                lock (_lock)
                {
                    keyIdx = _currentKeyIndex;
                    key = _keys[keyIdx];
                }

                try
                {
                    _logger.LogInformation("Attempting Gemini API request using key index {KeyIndex}", keyIdx);

                    var requestBody = new
                    {
                        contents = new[]
                        {
                            new
                            {
                                role = "user",
                                parts = new[]
                                {
                                    new { text = userMessage }
                                }
                            }
                        },
                        systemInstruction = new
                        {
                            parts = new[]
                            {
                                new { text = systemPrompt }
                            }
                        },
                        generationConfig = responseMimeType != null ? (object)new
                        {
                            temperature = 0.7,
                            maxOutputTokens = 2048,
                            responseMimeType = responseMimeType
                        } : new
                        {
                            temperature = 0.7,
                            maxOutputTokens = 2048
                        }
                    };

                    var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent?key={key}";
                    var response = await _httpClient.PostAsJsonAsync(url, requestBody);

                    if (response.IsSuccessStatusCode)
                    {
                        var responseContent = await response.Content.ReadAsStringAsync();
                        using var doc = JsonDocument.Parse(responseContent);
                        if (doc.RootElement.TryGetProperty("candidates", out var candidates) &&
                            candidates.GetArrayLength() > 0 &&
                            candidates[0].TryGetProperty("content", out var content) &&
                            content.TryGetProperty("parts", out var parts) &&
                            parts.GetArrayLength() > 0 &&
                            parts[0].TryGetProperty("text", out var textProp))
                        {
                            return textProp.GetString() ?? "";
                        }

                        throw new Exception("Failed to parse Gemini response: elements missing.");
                    }
                    else
                    {
                        var errorContent = await response.Content.ReadAsStringAsync();
                        _logger.LogWarning("Gemini API request failed. Status: {Status}. Error: {Error}", response.StatusCode, errorContent);

                        RotateKey();
                        await Task.Delay(200);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred during Gemini request with key index {KeyIndex}", keyIdx);
                    RotateKey();
                    await Task.Delay(200);
                }

                attempts++;
            }

            throw new Exception("All Gemini API keys failed or were rate limited.");
        }

        private void RotateKey()
        {
            lock (_lock)
            {
                _currentKeyIndex = (_currentKeyIndex + 1) % _keys.Count;
                _logger.LogInformation("Rotated to next Gemini API key index {NewKeyIndex}", _currentKeyIndex);
            }
        }
    }
}

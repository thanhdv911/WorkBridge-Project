using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace WorkBridge.Application.Services
{
    public class OpenAiService : IGeminiService
    {
        private static readonly HttpClient HttpClient = new HttpClient();
        private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        private readonly string _apiKey;
        private readonly string _baseUrl;
        private readonly string _model;
        private readonly int _maxOutputTokens;
        private readonly ILogger<OpenAiService> _logger;

        public OpenAiService(IConfiguration configuration, ILogger<OpenAiService> logger)
        {
            _logger = logger;
            var configuredApiKey = configuration["OpenAI:ApiKey"];
            _apiKey = !string.IsNullOrWhiteSpace(configuredApiKey)
                ? configuredApiKey
                : Environment.GetEnvironmentVariable("OPENAI_API_KEY") ?? "";
            _baseUrl = (configuration["OpenAI:BaseUrl"] ?? "https://api.openai.com/v1").TrimEnd('/');
            _model = configuration["OpenAI:Model"] ?? "gpt-5.4-mini";

            if (!int.TryParse(configuration["OpenAI:MaxOutputTokens"], out _maxOutputTokens) || _maxOutputTokens <= 0)
            {
                _maxOutputTokens = 4096;
            }
        }

        public async Task<string> SendPromptAsync(string systemPrompt, string userMessage, string? responseMimeType = null)
        {
            if (string.IsNullOrWhiteSpace(_apiKey))
            {
                throw new InvalidOperationException("OpenAI API key is not configured. Set OpenAI:ApiKey or OPENAI_API_KEY.");
            }

            var wantsJson = string.Equals(responseMimeType, "application/json", StringComparison.OrdinalIgnoreCase);
            var input = wantsJson && userMessage.IndexOf("json", StringComparison.OrdinalIgnoreCase) < 0
                ? $"{userMessage}\n\nReturn the response as valid JSON."
                : userMessage;

            var requestBody = new Dictionary<string, object?>
            {
                ["model"] = _model,
                ["instructions"] = systemPrompt,
                ["input"] = input,
                ["max_output_tokens"] = _maxOutputTokens,
                ["store"] = false
            };

            if (wantsJson)
            {
                requestBody["text"] = new { format = new { type = "json_object" } };
            }

            var json = JsonSerializer.Serialize(requestBody, JsonOptions);
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/responses");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            _logger.LogInformation("Sending OpenAI request with model {Model}", _model);

            using var response = await HttpClient.SendAsync(request);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                var safeError = responseContent.Length > 1200
                    ? responseContent.Substring(0, 1200)
                    : responseContent;

                _logger.LogWarning("OpenAI request failed. Status: {Status}. Error: {Error}", response.StatusCode, safeError);
                throw new Exception($"OpenAI API request failed ({response.StatusCode}): {safeError}");
            }

            return ExtractText(responseContent);
        }

        private static string ExtractText(string responseContent)
        {
            using var doc = JsonDocument.Parse(responseContent);
            var root = doc.RootElement;

            if (root.TryGetProperty("output_text", out var outputText) &&
                outputText.ValueKind == JsonValueKind.String)
            {
                return outputText.GetString() ?? "";
            }

            if (root.TryGetProperty("output", out var output) &&
                output.ValueKind == JsonValueKind.Array)
            {
                var builder = new StringBuilder();
                foreach (var item in output.EnumerateArray())
                {
                    if (!item.TryGetProperty("content", out var contentParts) ||
                        contentParts.ValueKind != JsonValueKind.Array)
                    {
                        continue;
                    }

                    foreach (var part in contentParts.EnumerateArray())
                    {
                        if (part.TryGetProperty("text", out var text) &&
                            text.ValueKind == JsonValueKind.String)
                        {
                            builder.Append(text.GetString());
                        }
                    }
                }

                if (builder.Length > 0)
                {
                    return builder.ToString();
                }
            }

            if (!root.TryGetProperty("choices", out var choices) ||
                choices.GetArrayLength() == 0 ||
                !choices[0].TryGetProperty("message", out var message) ||
                !message.TryGetProperty("content", out var content))
            {
                throw new Exception("Failed to parse OpenAI response: message content is missing.");
            }

            if (content.ValueKind == JsonValueKind.String)
            {
                return content.GetString() ?? "";
            }

            if (content.ValueKind == JsonValueKind.Array)
            {
                var builder = new StringBuilder();
                foreach (var part in content.EnumerateArray())
                {
                    if (part.TryGetProperty("text", out var text) && text.ValueKind == JsonValueKind.String)
                    {
                        builder.Append(text.GetString());
                    }
                }

                return builder.ToString();
            }

            return "";
        }
    }
}

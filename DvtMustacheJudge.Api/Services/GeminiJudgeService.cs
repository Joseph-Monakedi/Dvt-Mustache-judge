using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using DvtMustacheJudge.Api.Models;

namespace DvtMustacheJudge.Api.Services;

public class GeminiJudgeService : IGeminiJudgeService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly IApiRateLimiter _rateLimiter;
    private readonly ILogger<GeminiJudgeService> _logger;

    public GeminiJudgeService(
        HttpClient httpClient,
        IConfiguration configuration,
        IApiRateLimiter rateLimiter,
        ILogger<GeminiJudgeService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _rateLimiter = rateLimiter;
        _logger = logger;
    }

    public async Task<GeminiJudgeResult> JudgeMustacheAsync(Stream imageStream, string mimeType, string contestantName, string? officeLocation)
    {
        var apiKey = _configuration["Gemini:ApiKey"];
        var model = _configuration["Gemini:Model"] ?? "gemini-3.5-flash-lite";

        if (string.IsNullOrWhiteSpace(apiKey) || apiKey.Contains("YOUR_"))
        {
            _logger.LogError("Gemini API key is not configured.");
            throw new InvalidOperationException("Gemini API key is not configured. Please set a valid API key in appsettings.json.");
        }

        // Strictly enforce 3 requests per minute rate limit on free tier
        if (!_rateLimiter.TryAcquire())
        {
            _logger.LogWarning("Gemini API rate limit reached (3 requests/min max for free tier).");
            throw new InvalidOperationException("AI Judge is experiencing high demand (maximum 3 evaluations per minute). Please wait 30 seconds and try again.");
        }

        // Read image bytes
        byte[] imageBytes;
        if (imageStream.CanSeek)
        {
            imageStream.Position = 0;
        }
        using (var ms = new MemoryStream())
        {
            await imageStream.CopyToAsync(ms);
            imageBytes = ms.ToArray();
        }

        var base64Image = Convert.ToBase64String(imageBytes);
        var normalizedMime = string.IsNullOrWhiteSpace(mimeType) || !mimeType.StartsWith("image/")
            ? "image/jpeg"
            : mimeType;

        var systemPrompt = @"You are the Chief Justice of the DVT Movember Mustache Court.
Your mission is to evaluate contestant facial hair with sharp wit, swagger, and warm humor.

CRITICAL VISUAL GROUNDING & MUSTACHE DETECTION RULE:
- You must carefully analyze the EXACT area above the upper lip (the philtrum and upper lip margin) in the submitted photo.
- If you FAIL TO CLEARLY IDENTIFY A MUSTACHE — including if the contestant is clean-shaven, has bare skin, has only invisible/microscopic hairs, has a completely hairless upper lip, or no mustache can be distinctly recognized:
  * overallScore: MUST BE 0 (strictly ZERO out of 100). DO NOT award any pity points or non-zero score to a bare lip!
  * densityScore: 0 (out of 10).
  * symmetryScore: 0 (out of 10).
  * swaggerScore: 0 (out of 10).
  * styleCategory: MUST be 'Other'.
  * mustacheTitle: A witty title acknowledging the zero-mustache verdict (e.g., 'Follicle 404: Not Found', 'The Pristine Philtrum', 'The Stealth Whisker', 'The Clean-Shaven Phantom', 'The Razor's Accomplice').
  * roast: A sharp, hilarious roast highlighting that zero bristles were detected on the upper lip, the optical calipers found only bare skin/air, and awarding an unequivocal score of ZERO points.
  * celebrityTwin: A humorous clean-shaven or smooth comparison (e.g., '95% Mr. Clean, 5% Fresh Razor Blade', '90% Lex Luthor, 10% Polished Glass').
  * verdictBadge: examples of verdicts: 'Zero-Bristle Deficit', 'Follicle 404', 'Clean-Shaven Zero', or 'Bare Philtrum'.

SCORING RULES WHEN A MUSTACHE IS CLEARLY IDENTIFIED:
- If and only if the contestant HAS a clearly identifiable mustache on the upper lip:
  * overallScore: 1 to 100 based on grooming, density, symmetry, and style:
    - Magnificent, dense, well-shaped mustaches (Chevron, Handlebar, Walrus): 80 to 98.
    - Solid, developing, deliberate mustaches (Painter's Brush, Horseshoe, Stubbled Maverick): 60 to 79.
    - Thin, faint, patchy, or early-stage growth (Pencil, Peach Fuzz): 20 to 59.
  * densityScore: 1 to 10 based on hair thickness and coverage.
  * symmetryScore: 1 to 10 based on left-right balance across the philtrum.
  * swaggerScore: 1 to 10 based on style panache, flair, and attitude.
  * styleCategory: examples of mustaches: 'Chevron', 'Handlebar', 'Pencil', 'Horseshoe', 'Walrus', 'Peach Fuzz', 'Stubbled Maverick', 'Painter's Brush', 'Other'.
  * roast: MUST describe the EXACT visible characteristics observed in this photo (thickness, curvature, trim lines, width, curl tips, color contrast).
  * celebrityTwin: A creative percentage breakdown (e.g., '78% Tom Selleck, 18% Ron Swanson, 4% Pure Grit').
  * verdictBadge: A celebratory title (e.g., 'Grand Champion', 'Aerodynamic Vanguard', 'Certified DVT Heavyweight').

CRITICAL KINDNESS & SAFETY INVARIANT:
- Evaluate and roast ONLY the facial hair (or the total absence thereof on the upper lip).
- ABSOLUTELY ZERO remarks, insults, or references regarding skin tone, ethnicity, body weight, age, gender, teeth, or non-mustache facial features.
- Keep all commentary playful, celebratory, and supportive of the Movember charity spirit.";

        var userPrompt = $"Contestant Name: {contestantName}. Office Location: {officeLocation ?? "REMOTE"}. Inspect the upper lip area of the photo. If you fail to clearly identify a mustache or if the contestant is clean-shaven, you MUST award an overallScore of 0, densityScore of 0, symmetryScore of 0, and swaggerScore of 0. If a mustache is clearly present, score and evaluate it accurately.";

        var requestBody = new
        {
            systemInstruction = new
            {
                parts = new[]
                {
                    new { text = systemPrompt }
                }
            },
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = userPrompt },
                        new
                        {
                            inlineData = new
                            {
                                mimeType = normalizedMime,
                                data = base64Image
                            }
                        }
                    }
                }
            },
            generationConfig = new
            {
                responseMimeType = "application/json",
                responseSchema = new
                {
                    type = "OBJECT",
                    properties = new
                    {
                        overallScore = new { type = "INTEGER" },
                        mustacheTitle = new { type = "STRING" },
                        densityScore = new { type = "INTEGER" },
                        symmetryScore = new { type = "INTEGER" },
                        swaggerScore = new { type = "INTEGER" },
                        styleCategory = new
                        {
                            type = "STRING",
                            @enum = new[]
                            {
                                "Chevron", "Handlebar", "Pencil", "Horseshoe", "Walrus",
                                "Peach Fuzz", "Stubbled Maverick", "Painter's Brush", "Other"
                            }
                        },
                        roast = new { type = "STRING" },
                        celebrityTwin = new { type = "STRING" },
                        verdictBadge = new { type = "STRING" }
                    },
                    required = new[]
                    {
                        "overallScore", "mustacheTitle", "densityScore", "symmetryScore",
                        "swaggerScore", "styleCategory", "roast", "celebrityTwin", "verdictBadge"
                    }
                }
            }
        };

        var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
        var jsonPayload = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync(endpoint, content);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            _logger.LogError("Gemini API returned status {StatusCode}: {Error}", response.StatusCode, errorBody);

            string userMessage = response.StatusCode switch
            {
                System.Net.HttpStatusCode.PaymentRequired => "Gemini API credits are depleted. Please check your Google AI Studio billing or API key.",
                System.Net.HttpStatusCode.TooManyRequests => "Gemini AI rate limit exceeded. Please wait a moment before trying again.",
                System.Net.HttpStatusCode.Unauthorized or System.Net.HttpStatusCode.Forbidden => "Invalid Gemini API credentials. Please verify your API key.",
                _ => $"Gemini AI Judge failed ({response.StatusCode}): {errorBody}"
            };

            throw new HttpRequestException(userMessage);
        }

        var responseJson = await response.Content.ReadAsStringAsync();
        var parsedResult = ExtractResultFromGeminiResponse(responseJson);
        if (parsedResult == null)
        {
            _logger.LogError("Failed to parse valid structured verdict from Gemini response: {Json}", responseJson);
            throw new InvalidOperationException("The AI Judge failed to produce a valid verdict for this photo. Please try uploading a clearer photo.");
        }

        _logger.LogInformation("Successfully received and parsed Gemini verdict for {Name} (Overall Score: {Score})", contestantName, parsedResult.OverallScore);
        return parsedResult;
    }

    private GeminiJudgeResult? ExtractResultFromGeminiResponse(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (root.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
            {
                var firstCandidate = candidates[0];
                if (firstCandidate.TryGetProperty("content", out var content) &&
                    content.TryGetProperty("parts", out var parts) &&
                    parts.GetArrayLength() > 0)
                {
                    var firstPart = parts[0];
                    if (firstPart.TryGetProperty("text", out var textElement))
                    {
                        var textContent = textElement.GetString();
                        if (!string.IsNullOrWhiteSpace(textContent))
                        {
                            var cleanedJson = textContent.Trim();
                            if (cleanedJson.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
                            {
                                cleanedJson = cleanedJson.Substring(7);
                            }
                            else if (cleanedJson.StartsWith("```"))
                            {
                                cleanedJson = cleanedJson.Substring(3);
                            }

                            if (cleanedJson.EndsWith("```"))
                            {
                                cleanedJson = cleanedJson.Substring(0, cleanedJson.Length - 3);
                            }

                            cleanedJson = cleanedJson.Trim();

                            var options = new JsonSerializerOptions
                            {
                                PropertyNameCaseInsensitive = true
                            };

                            return JsonSerializer.Deserialize<GeminiJudgeResult>(cleanedJson, options);
                        }
                    }
                }
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting JSON from Gemini response: {Json}", json);
            return null;
        }
    }
}


const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const GEMINI_API_BASE = process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com/v1beta/models";

const CONTROL_LABELS = {
    timeOfDay: { auto: "Auto", day: "Daytime", night: "Nighttime" },
    visualStyle: {
        realistic: "Realistic",
        cinematic: "Cinematic",
        commercial: "Commercial advertising",
        anime: "Anime"
    },
    cameraAnglePreset: { close: "Close-up", medium: "Medium shot", wide: "Wide shot" },
    outputQuality: { normal: "Standard quality", high: "High quality", ultra: "Ultra detailed premium quality" }
};

function normalizeOption(value, allowedValues, fallbackValue) {
    const normalizedValue = String(value || "").trim().toLowerCase();
    return allowedValues.includes(normalizedValue) ? normalizedValue : fallbackValue;
}

function normalizeOptions(source = {}) {
    return {
        type: normalizeOption(source.type, ["image", "video"], "image"),
        timeOfDay: normalizeOption(source.timeOfDay, ["auto", "day", "night"], "auto"),
        visualStyle: normalizeOption(source.visualStyle, ["realistic", "cinematic", "commercial", "anime"], "realistic"),
        cameraAnglePreset: normalizeOption(source.cameraAnglePreset, ["close", "medium", "wide"], "medium"),
        outputQuality: normalizeOption(source.outputQuality, ["normal", "high", "ultra"], "high")
    };
}

function getApiKey() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing API Key");
    }
    return apiKey;
}

function extractGeminiParts(data) {
    const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
    return candidates.flatMap((candidate) => Array.isArray(candidate?.content?.parts) ? candidate.content.parts : []);
}
function extractTextPart(data) {
    const textPart = extractGeminiParts(data).find((part) => typeof part?.text === "string" && part.text.trim());
    return textPart ? textPart.text.trim() : "";
}

function extractInlineImagePart(data) {
    return extractGeminiParts(data).find((part) => {
        const inlineData = part?.inlineData || part?.inline_data;
        const mimeType = inlineData?.mimeType || inlineData?.mime_type || "";
        return Boolean(inlineData?.data) && mimeType.startsWith("image/");
    }) || null;
}

function buildPromptInstruction(prompt, options = {}) {
    const normalizedOptions = normalizeOptions(options);
    return [
        "Convert this " + (normalizedOptions.type === "video" ? "video" : "image") + " request into one professional production prompt: \"" + prompt + "\"",
        "",
        "Rules:",
        "- Identify the main subject.",
        "- Identify the action.",
        "- Add a fitting environment if it is missing.",
        "- Time of day: " + CONTROL_LABELS.timeOfDay[normalizedOptions.timeOfDay] + ". If Auto, infer the best option from the scene.",
        "- Visual style: " + CONTROL_LABELS.visualStyle[normalizedOptions.visualStyle] + ".",
        "- Camera angle: " + CONTROL_LABELS.cameraAnglePreset[normalizedOptions.cameraAnglePreset] + ".",
        "- Output quality target: " + CONTROL_LABELS.outputQuality[normalizedOptions.outputQuality] + ".",
        "- Add lighting details.",
        "- Output in English only.",
        "- Do not include any text, watermark, caption, typography, or logo inside the image.",
        "- Return only the final prompt."
    ].join("\n");
}

async function callGeminiModel(model, payload) {
    if (typeof fetch !== "function") {
        throw new Error("Fetch is not available on this server runtime");
    }

    const response = await fetch(GEMINI_API_BASE + "/" + encodeURIComponent(model) + ":generateContent", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": getApiKey()
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data?.error?.message || "Gemini request failed");
    }

    return data;
}
async function improvePromptWithGemini(prompt, options = {}) {
    const data = await callGeminiModel(GEMINI_TEXT_MODEL, {
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: buildPromptInstruction(prompt, options)
                    }
                ]
            }
        ]
    });

    return extractTextPart(data) || String(prompt).trim();
}

function buildImageGenerationPrompt(prompt, options = {}) {
    const normalizedOptions = normalizeOptions(options);
    return [
        prompt,
        "",
        "Image generation rules:",
        "- Style target: " + CONTROL_LABELS.visualStyle[normalizedOptions.visualStyle],
        "- Camera framing: " + CONTROL_LABELS.cameraAnglePreset[normalizedOptions.cameraAnglePreset],
        "- Time of day: " + CONTROL_LABELS.timeOfDay[normalizedOptions.timeOfDay],
        "- Quality target: " + CONTROL_LABELS.outputQuality[normalizedOptions.outputQuality],
        "- No text inside image.",
        "- No watermark.",
        "- Single polished final frame."
    ].join("\n");
}

async function generateImageWithGemini(prompt, options = {}) {
    const normalizedOptions = normalizeOptions(options);
    const payload = {
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: buildImageGenerationPrompt(prompt, normalizedOptions)
                    }
                ]
            }
        ]
    };

    if (options.aspectRatio) {
        payload.generationConfig = {
            imageConfig: {
                aspectRatio: options.aspectRatio
            }
        };
    }

    const data = await callGeminiModel(GEMINI_IMAGE_MODEL, payload);
    const imagePart = extractInlineImagePart(data);
    if (!imagePart) {
        throw new Error(extractTextPart(data) || "Gemini did not return image data");
    }

    const inlineData = imagePart.inlineData || imagePart.inline_data;
    const mimeType = inlineData.mimeType || inlineData.mime_type || "image/png";
    return {
        bytes: Buffer.from(inlineData.data, "base64"),
        mimeType,
        text: extractTextPart(data)
    };
}

async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Only POST allowed" });
    }

    try {
        const { prompt, ...options } = req.body || {};
        if (!prompt || !String(prompt).trim()) {
            return res.status(400).json({ error: "Prompt is required" });
        }

        const improvedPrompt = await improvePromptWithGemini(String(prompt).trim(), options);
        return res.status(200).json({
            success: true,
            prompt: improvedPrompt,
            source: "gemini"
        });
    } catch (error) {
        return res.status(500).json({
            error: "Gemini API error",
            message: error.message || "Unexpected Gemini error"
        });
    }
}

module.exports = handler;
module.exports.default = handler;
module.exports.improvePromptWithGemini = improvePromptWithGemini;
module.exports.generateImageWithGemini = generateImageWithGemini;
module.exports.normalizeGeminiOptions = normalizeOptions;

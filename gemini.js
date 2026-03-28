const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

function buildInstruction(prompt) {
    return [
        "حول هذا الوصف إلى prompt احترافي لتوليد صورة.",
        `الوصف الأصلي: "${prompt}"`,
        "المطلوب:",
        "- تحديد الكائن الرئيسي",
        "- تحديد الفعل",
        "- إضافة بيئة مناسبة",
        "- إضافة إضاءة مناسبة",
        "- اختيار أسلوب احترافي مناسب مثل realistic أو cinematic إذا لزم",
        "- إخراج prompt باللغة الإنجليزية فقط",
        "- بدون أي نص داخل الصورة",
        "- بدون شرح إضافي أو عناوين أو نقاط"
    ].join("\n");
}

async function improvePromptWithGemini(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing API Key");
    }

    if (typeof fetch !== "function") {
        throw new Error("Fetch is not available on this server runtime");
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: buildInstruction(prompt)
                            }
                        ]
                    }
                ]
            })
        }
    );

    const data = await response.json();
    if (!response.ok) {
        const message = data?.error?.message || "Server error";
        throw new Error(message);
    }

    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return result || prompt;
}

async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Only POST allowed" });
    }

    try {
        const { prompt } = req.body || {};
        if (!prompt || !String(prompt).trim()) {
            return res.status(400).json({ error: "Prompt is required" });
        }

        const improvedPrompt = await improvePromptWithGemini(String(prompt).trim());
        return res.status(200).json({ prompt: improvedPrompt });
    } catch (error) {
        return res.status(500).json({
            error: "Server error",
            message: error.message || "Unexpected Gemini error"
        });
    }
}

module.exports = handler;
module.exports.default = handler;
module.exports.improvePromptWithGemini = improvePromptWithGemini;

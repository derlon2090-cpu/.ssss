const fs = require("fs");
const p = "C:/ai art/ai.js";
let t = fs.readFileSync(p, "utf8");
const insert = 'async function resolveEnhancedPrompt(promptValue, type, controls, promptSource) {\n    const normalizedPromptSource = normalizeOptionalText(promptSource);\n    if (normalizedPromptSource === "gemini") {\n        return promptValue;\n    }\n\n    return improvePromptWithGemini(promptValue, {\n        type,\n        ...controls\n    });\n}\n\nfunction adjustRemainingValue';
t = t.replace('function adjustRemainingValue', insert);
fs.writeFileSync(p, t);

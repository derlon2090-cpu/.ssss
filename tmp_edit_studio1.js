const fs = require("fs");
const p = "C:/ai art/studio.js";
let t = fs.readFileSync(p, "utf8");
const start = t.indexOf('async function improvePrompt(userPrompt) {');
const end = t.indexOf('function getCodeFromLocation() {');
const replacement = 'async function improvePrompt(userPrompt, options = {}) {\n    const response = await fetch("/api/gemini", {\n        method: "POST",\n        headers: {\n            "Content-Type": "application/json"\n        },\n        body: JSON.stringify({\n            prompt: userPrompt,\n            ...options\n        })\n    });\n\n    const raw = await response.text();\n    let payload = {};\n    try {\n        payload = raw ? JSON.parse(raw) : {};\n    } catch (error) {\n        throw new Error(raw || "Gemini response could not be read.");\n    }\n\n    if (!response.ok) {\n        throw new Error(payload.message || payload.error || "Gemini prompt enhancement failed.");\n    }\n\n    return {\n        prompt: payload.prompt || userPrompt,\n        source: "gemini"\n    };\n}\n\n';
if (start !== -1 && end !== -1) {
  t = t.slice(0, start) + replacement + t.slice(end);
  fs.writeFileSync(p, t);
}

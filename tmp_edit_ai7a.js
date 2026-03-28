const fs = require("fs");
const p = "C:/ai art/ai.js";
let t = fs.readFileSync(p, "utf8");
t = t.replace('app.post("/api/content/generate", wrap((req, res) => {', 'app.post("/api/content/generate", wrap(async (req, res) => {');
t = t.replace('    const { workRecord, saved, intelligence } = createWork(req, {\n        codeRecord,\n        prompt,\n        type,\n        duration\n    });', '    const { workRecord, saved, intelligence } = await createWork(req, {\n        codeRecord,\n        prompt,\n        originalPrompt: req.body.originalPrompt ? parsePrompt(req.body.originalPrompt) : prompt,\n        enhancedPrompt: prompt,\n        controls: req.body,\n        type,\n        duration\n    });');
t = t.replace('            mockOutput: true', '            mockOutput: type !== "image"');
fs.writeFileSync(p, t);

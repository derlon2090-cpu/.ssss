const fs = require("fs");
const p = "C:/ai art/ai.js";
let t = fs.readFileSync(p, "utf8");
t = t.replace('app.post("/api/works/:workId/regenerate", wrap((req, res) => {', 'app.post("/api/works/:workId/regenerate", wrap(async (req, res) => {');
t = t.replace('    const { workRecord, saved, intelligence } = createWork(req, {\n        codeRecord,\n        prompt,\n        type: sourceWork.type,\n        duration,\n        sourceWorkId: sourceWork.id\n    });', '    const { workRecord, saved, intelligence } = await createWork(req, {\n        codeRecord,\n        prompt,\n        originalPrompt: req.body.originalPrompt ? parsePrompt(req.body.originalPrompt) : (sourceWork.originalPrompt || prompt),\n        enhancedPrompt: prompt,\n        controls: req.body,\n        type: sourceWork.type,\n        duration,\n        sourceWorkId: sourceWork.id\n    });');
fs.writeFileSync(p, t);

const fs = require("fs");
const p = "C:/ai art/studio.js";
let t = fs.readFileSync(p, "utf8");
t = t.replace('    const promptEnhancement = await improvePrompt(userPrompt);', '    const promptEnhancement = await improvePrompt(userPrompt, { type: studioElements.type.value, ...buildControlsPayload() });');
fs.writeFileSync(p, t);

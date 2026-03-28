const fs = require("fs");
const p = "C:/ai art/ai.js";
let t = fs.readFileSync(p, "utf8");
t = t.replace('            mockOutput: true\n        }\n    });\n}));\n\napp.post("/verify-code"', '            mockOutput: sourceWork.type !== "image"\n        }\n    });\n}));\n\napp.post("/verify-code"');
t = t.replace('            mockOutput: true\n        }\n    });\n}));\n\napp.use((error, req, res, next) => {', '            mockOutput: type !== "image"\n        }\n    });\n}));\n\napp.use((error, req, res, next) => {');
fs.writeFileSync(p, t);

const fs = require("fs");
const text = fs.readFileSync("C:/ai art/ai.js", "utf8");
console.log(text.includes('function createMockPreview(workRecord, codeRecord, intelligence) {'));

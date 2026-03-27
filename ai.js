const crypto = require("crypto");
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = path.join(__dirname, "credits-store.json");
const INDEX_FILE = path.join(__dirname, "index.html");
const STYLES_FILE = path.join(__dirname, "styles.css");
const APP_FILE = path.join(__dirname, "app.js");
const ADMIN_LOGIN_FILE = path.join(__dirname, "admin-login.html");
const ADMIN_LOGIN_SCRIPT_FILE = path.join(__dirname, "admin-login.js");
const ADMIN_DASHBOARD_FILE = path.join(__dirname, "admin-dashboard.html");
const ADMIN_DASHBOARD_SCRIPT_FILE = path.join(__dirname, "admin-dashboard.js");
const STUDIO_FILE = path.join(__dirname, "studio.html");
const STUDIO_SCRIPT_FILE = path.join(__dirname, "studio.js");
const LIBRARY_FILE = path.join(__dirname, "library.html");
const LIBRARY_SCRIPT_FILE = path.join(__dirname, "library.js");
const SUPPORTED_DURATIONS = [5, 10, 30, 60];
const SUPPORTED_PLAN_TYPES = ["trial", "standard", "vip"];
const SUPPORTED_PRIORITIES = ["low", "normal", "high", "vip"];
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const ADMIN_SECURITY_CODE = process.env.ADMIN_SECURITY_CODE || "";
const adminSessions = new Map();

const store = loadStore();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/", (req, res) => {
    res.sendFile(INDEX_FILE);
});

app.get(/^\/generated-[a-z]+-\d+\.svg$/, (req, res) => {
    res.sendFile(path.join(__dirname, req.path.replace(/^\//, "")));
});

app.get("/styles.css", (req, res) => {
    res.sendFile(STYLES_FILE);
});

app.get("/app.js", (req, res) => {
    res.sendFile(APP_FILE);
});
app.get("/admin/login", (req, res) => {
    res.sendFile(ADMIN_LOGIN_FILE);
});

app.get("/admin/login.js", (req, res) => {
    res.sendFile(ADMIN_LOGIN_SCRIPT_FILE);
});

app.get("/admin/dashboard", (req, res) => {
    res.sendFile(ADMIN_DASHBOARD_FILE);
});

app.get("/admin/dashboard.js", (req, res) => {
    res.sendFile(ADMIN_DASHBOARD_SCRIPT_FILE);
});
app.get("/studio", (req, res) => {
    res.sendFile(STUDIO_FILE);
});

app.get("/studio.js", (req, res) => {
    res.sendFile(STUDIO_SCRIPT_FILE);
});

app.get("/library", (req, res) => {
    res.sendFile(LIBRARY_FILE);
});

app.get("/library.js", (req, res) => {
    res.sendFile(LIBRARY_SCRIPT_FILE);
});

function ensureDir(targetPath) {
    if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
    }
}

function createEmptyStore() {
    return {
        codes: [],
        works: [],
        events: [],
        nextWorkId: 1,
        nextEventId: 1
    };
}

function loadStore() {
    if (!fs.existsSync(DATA_FILE)) {
        const initialStore = createEmptyStore();
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialStore, null, 2));
        return initialStore;
    }

    try {
        const raw = fs.readFileSync(DATA_FILE, "utf8");
        const parsed = JSON.parse(raw);

        return {
            codes: Array.isArray(parsed.codes)
                ? parsed.codes.map((codeRecord) => {
                    const planType = parsePlanType(codeRecord.planType || codeRecord.tier, "standard");
                    return {
                        ...codeRecord,
                        tier: planType,
                        planType,
                        processingPriority: parseProcessingPriority(
                            codeRecord.processingPriority,
                            defaultPriorityForPlan(planType)
                        ),
                        clientName: normalizeOptionalText(codeRecord.clientName),
                        startsAt: normalizeOptionalText(codeRecord.startsAt) || null,
                        internalNotes: normalizeOptionalText(codeRecord.internalNotes),
                        createdBy: normalizeName(codeRecord.createdBy || "system", "system")
                    };
                })
                : [],
            works: Array.isArray(parsed.works)
                ? parsed.works.map((workRecord) => ({
                    ...workRecord,
                    originalPrompt: workRecord.originalPrompt || workRecord.prompt,
                    enhancedPrompt: workRecord.enhancedPrompt || workRecord.prompt,
                    qualityLevel: workRecord.qualityLevel || "balanced",
                    styleSuggestions: workRecord.styleSuggestions || [],
                    processingPriority: workRecord.processingPriority || "normal"
                }))
                : [],
            events: Array.isArray(parsed.events)
                ? parsed.events.map((eventRecord) => ({
                    ...eventRecord,
                    meta: eventRecord.meta && typeof eventRecord.meta === "object" ? eventRecord.meta : {}
                }))
                : [],
            nextWorkId: Number.isInteger(parsed.nextWorkId) && parsed.nextWorkId > 0
                ? parsed.nextWorkId
                : 1,
            nextEventId: Number.isInteger(parsed.nextEventId) && parsed.nextEventId > 0
                ? parsed.nextEventId
                : 1
        };
    } catch (error) {
        const backupFile = path.join(__dirname, `credits-store.corrupt-${Date.now()}.json`);
        fs.copyFileSync(DATA_FILE, backupFile);
        const resetStore = createEmptyStore();
        fs.writeFileSync(DATA_FILE, JSON.stringify(resetStore, null, 2));
        return resetStore;
    }
}

function saveStore() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function createHttpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function nowIso() {
    return new Date().toISOString();
}

function normalizeCodeValue(value) {
    if (typeof value !== "string" || !value.trim()) {
        throw createHttpError(400, "A code value is required.");
    }

    return value.trim().toUpperCase();
}

function normalizeName(value, fallbackValue) {
    if (value === undefined || value === null || value === "") {
        return fallbackValue;
    }

    if (typeof value !== "string") {
        throw createHttpError(400, "name must be a string.");
    }

    const trimmed = value.trim();
    if (!trimmed) {
        throw createHttpError(400, "name cannot be empty.");
    }

    return trimmed;
}

function normalizeOptionalText(value) {
    if (value === undefined || value === null) {
        return "";
    }

    return String(value).trim();
}

function parseInteger(value, fieldName, options = {}) {
    const { min = 0, allowUndefined = false } = options;

    if (value === undefined && allowUndefined) {
        return undefined;
    }

    const numericValue = Number(value);
    if (!Number.isInteger(numericValue) || numericValue < min) {
        throw createHttpError(400, `${fieldName} must be an integer greater than or equal to ${min}.`);
    }

    return numericValue;
}

function parseBoolean(value, fallbackValue) {
    if (value === undefined) {
        return fallbackValue;
    }

    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();

        if (["true", "1", "yes", "on"].includes(normalized)) {
            return true;
        }

        if (["false", "0", "no", "off"].includes(normalized)) {
            return false;
        }
    }

    throw createHttpError(400, "Boolean fields must be true or false.");
}

function parseTier(value, fallbackValue = "standard") {
    if (value === undefined || value === null || value === "") {
        return fallbackValue;
    }

    if (typeof value !== "string") {
        throw createHttpError(400, "tier must be a string.");
    }

    const normalized = value.trim().toLowerCase();
    if (!["trial", "standard", "vip"].includes(normalized)) {
        throw createHttpError(400, "tier must be trial, standard, or vip.");
    }

    return normalized;
}

function parsePlanType(value, fallbackValue = "standard") {
    const normalized = parseTier(value, fallbackValue);

    if (!SUPPORTED_PLAN_TYPES.includes(normalized)) {
        throw createHttpError(400, `planType must be one of: ${SUPPORTED_PLAN_TYPES.join(", ")}.`);
    }

    return normalized;
}

function parseProcessingPriority(value, fallbackValue = "normal") {
    if (value === undefined || value === null || value === "") {
        return fallbackValue;
    }

    if (typeof value !== "string") {
        throw createHttpError(400, "processingPriority must be a string.");
    }

    const normalized = value.trim().toLowerCase();
    if (!SUPPORTED_PRIORITIES.includes(normalized)) {
        throw createHttpError(400, `processingPriority must be one of: ${SUPPORTED_PRIORITIES.join(", ")}.`);
    }

    return normalized;
}

function defaultPriorityForPlan(planType) {
    if (planType === "vip") {
        return "vip";
    }

    if (planType === "trial") {
        return "low";
    }

    return "normal";
}

function parseDurations(inputValue, options = {}) {
    const { required = false } = options;

    if (inputValue === undefined) {
        if (required) {
            throw createHttpError(400, "allowedDurations is required when maxVideos is greater than 0.");
        }

        return undefined;
    }

    const values = Array.isArray(inputValue) ? inputValue : [inputValue];
    const normalized = [...new Set(values.map((value) => parseInteger(value, "allowedDurations", { min: 1 })))]
        .sort((left, right) => left - right);

    const invalidDurations = normalized.filter((duration) => !SUPPORTED_DURATIONS.includes(duration));
    if (invalidDurations.length > 0) {
        throw createHttpError(400, `allowedDurations must only contain: ${SUPPORTED_DURATIONS.join(", ")}.`);
    }

    return normalized;
}

function parseOptionalDate(value, options = {}) {
    const { allowUndefined = false } = options;

    if (value === undefined && allowUndefined) {
        return undefined;
    }

    if (value === undefined || value === null || value === "") {
        return null;
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        throw createHttpError(400, "expiresAt must be a valid date.");
    }

    return parsedDate.toISOString();
}

function parsePrompt(value) {
    if (typeof value !== "string" || !value.trim()) {
        throw createHttpError(400, "prompt is required.");
    }

    return value.trim();
}

function parseContentType(value) {
    if (typeof value !== "string") {
        throw createHttpError(400, "type must be image or video.");
    }

    const normalized = value.trim().toLowerCase();
    if (!["image", "video"].includes(normalized)) {
        throw createHttpError(400, "type must be image or video.");
    }

    return normalized;
}

function createCodeId() {
    return `code_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getCodeStatus(codeRecord) {
    if (!codeRecord.isActive) {
        return "inactive";
    }

    if (codeRecord.startsAt && new Date(codeRecord.startsAt).getTime() > Date.now()) {
        return "scheduled";
    }

    if (codeRecord.expiresAt && new Date(codeRecord.expiresAt).getTime() < Date.now()) {
        return "expired";
    }

    if (codeRecord.remainingImages <= 0 && codeRecord.remainingVideos <= 0) {
        return "consumed";
    }

    return "active";
}

function getBadgeLabel(codeRecord) {
    if (codeRecord.planType === "vip") {
        return "VIP";
    }

    if (codeRecord.planType === "trial") {
        return "Trial";
    }

    return "Standard";
}

function getWorksForCode(codeId) {
    return store.works
        .filter((workItem) => workItem.codeId === codeId)
        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

function getEventsForCode(codeId) {
    return (store.events || [])
        .filter((eventItem) => eventItem.codeId === codeId)
        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

function addEvent(codeRecord, action, message, meta = {}) {
    if (!store.events) {
        store.events = [];
    }

    if (!store.nextEventId) {
        store.nextEventId = 1;
    }

    const eventRecord = {
        id: store.nextEventId,
        codeId: codeRecord ? codeRecord.id : null,
        code: codeRecord ? codeRecord.code : null,
        action,
        message,
        meta,
        createdAt: nowIso()
    };

    store.nextEventId += 1;
    store.events.unshift(eventRecord);
    store.events = store.events.slice(0, 1000);
    return eventRecord;
}

function buildAbsoluteUrl(req, relativePath) {
    return new URL(relativePath, `${req.protocol}://${req.get("host")}`).toString();
}

function serializeCode(codeRecord) {
    const relatedWorks = getWorksForCode(codeRecord.id);

    return {
        id: codeRecord.id,
        code: codeRecord.code,
        name: codeRecord.name,
        clientName: codeRecord.clientName || "",
        tier: codeRecord.planType || codeRecord.tier,
        planType: codeRecord.planType || codeRecord.tier,
        badgeLabel: getBadgeLabel(codeRecord),
        processingPriority: codeRecord.processingPriority || "normal",
        maxImages: codeRecord.maxImages,
        maxVideos: codeRecord.maxVideos,
        remainingImages: codeRecord.remainingImages,
        remainingVideos: codeRecord.remainingVideos,
        allowedDurations: codeRecord.allowedDurations,
        startsAt: codeRecord.startsAt || null,
        expiresAt: codeRecord.expiresAt,
        isActive: codeRecord.isActive,
        allowRegenerate: codeRecord.allowRegenerate,
        allowSave: codeRecord.allowSave,
        internalNotes: codeRecord.internalNotes || "",
        createdBy: codeRecord.createdBy || "system",
        status: getCodeStatus(codeRecord),
        remainingUses: codeRecord.remainingImages + codeRecord.remainingVideos,
        usedImages: Math.max(codeRecord.maxImages - codeRecord.remainingImages, 0),
        usedVideos: Math.max(codeRecord.maxVideos - codeRecord.remainingVideos, 0),
        worksCount: relatedWorks.length,
        createdAt: codeRecord.createdAt,
        updatedAt: codeRecord.updatedAt
    };
}

function serializeWork(req, workRecord) {
    return {
        id: workRecord.id,
        codeId: workRecord.codeId,
        code: workRecord.code,
        prompt: workRecord.originalPrompt || workRecord.prompt,
        originalPrompt: workRecord.originalPrompt || workRecord.prompt,
        enhancedPrompt: workRecord.enhancedPrompt || workRecord.prompt,
        type: workRecord.type,
        duration: workRecord.duration,
        fileUrl: buildAbsoluteUrl(req, workRecord.fileUrl),
        previewUrl: buildAbsoluteUrl(req, workRecord.previewUrl),
        saved: workRecord.saved,
        sourceWorkId: workRecord.sourceWorkId,
        qualityLevel: workRecord.qualityLevel || "balanced",
        styleSuggestions: workRecord.styleSuggestions || [],
        processingPriority: workRecord.processingPriority || "normal",
        createdAt: workRecord.createdAt
    };
}

function serializeEvent(eventRecord) {
    return {
        id: eventRecord.id,
        codeId: eventRecord.codeId,
        code: eventRecord.code,
        action: eventRecord.action,
        message: eventRecord.message,
        meta: eventRecord.meta || {},
        createdAt: eventRecord.createdAt
    };
}

function findCodeOrFail(identifier) {
    const normalizedCode = normalizeCodeValue(identifier);
    const codeRecord = store.codes.find((item) => item.code === normalizedCode);

    if (!codeRecord) {
        throw createHttpError(404, "Code not found.");
    }

    return codeRecord;
}

function findWorkOrFail(workIdValue) {
    const workId = parseInteger(workIdValue, "workId", { min: 1 });
    const workRecord = store.works.find((item) => item.id === workId);

    if (!workRecord) {
        throw createHttpError(404, "Work item not found.");
    }

    return workRecord;
}

function ensureCodeCanGenerate(codeRecord) {
    const status = getCodeStatus(codeRecord);

    if (status === "inactive") {
        throw createHttpError(403, "This code is inactive.");
    }

    if (status === "scheduled") {
        throw createHttpError(403, "This code has not started yet.");
    }

    if (status === "expired") {
        throw createHttpError(403, "This code has expired.");
    }

    if (status === "consumed") {
        throw createHttpError(409, "This code has no remaining credits.");
    }
}

function escapeXml(textValue) {
    return String(textValue)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function extractKeywords(prompt) {
    const matches = prompt.match(/[A-Za-z0-9\u0600-\u06FF]+/g) || [];
    return [...new Set(matches.map((item) => item.toLowerCase()).filter((item) => item.length > 2))].slice(0, 8);
}

function pickVisualTheme(prompt) {
    const promptLower = prompt.toLowerCase();

    if (promptLower.includes("night") || promptLower.includes("ليل") || promptLower.includes("ليلي")) {
        return {
            name: "night",
            primary: "#0b132b",
            secondary: "#1c2541",
            accent: "#5bc0be",
            mood: "moody night atmosphere",
            lighting: "neon rim light"
        };
    }

    if (promptLower.includes("luxury") || promptLower.includes("فاخر") || promptLower.includes("gold")) {
        return {
            name: "luxury",
            primary: "#2b1d0e",
            secondary: "#8b5e34",
            accent: "#f4d35e",
            mood: "luxury premium mood",
            lighting: "soft golden highlights"
        };
    }

    if (promptLower.includes("anime") || promptLower.includes("أنمي") || promptLower.includes("انمي")) {
        return {
            name: "anime",
            primary: "#3d2c8d",
            secondary: "#916bbf",
            accent: "#c996cc",
            mood: "stylized anime energy",
            lighting: "bright cel-shaded highlights"
        };
    }

    return {
        name: "cinematic",
        primary: "#0d1b2a",
        secondary: "#1b4965",
        accent: "#ca6702",
        mood: "cinematic dramatic atmosphere",
        lighting: "high contrast cinematic lighting"
    };
}

function buildPromptIntelligence(prompt, type) {
    const stylesCatalog = [
        { label: "سينمائي", keywords: ["cinematic", "سينمائي", "movie"], hint: "cinematic lighting, dramatic framing" },
        { label: "واقعي", keywords: ["realistic", "واقعي", "photoreal"], hint: "photorealistic details, natural textures" },
        { label: "إعلاني", keywords: ["product", "advertising", "إعلاني"], hint: "commercial composition, polished product focus" },
        { label: "فاخر", keywords: ["luxury", "فاخر", "premium"], hint: "luxury styling, premium materials, elegant mood" },
        { label: "أنمي", keywords: ["anime", "أنمي", "انمي"], hint: "anime illustration, stylized shading, vivid color" }
    ];
    const lowerPrompt = prompt.toLowerCase();
    const detectedStyles = stylesCatalog.filter((styleItem) =>
        styleItem.keywords.some((keyword) => lowerPrompt.includes(keyword.toLowerCase()))
    );
    const finalStyles = detectedStyles.length > 0 ? detectedStyles : stylesCatalog.slice(0, 3);
    const keywords = extractKeywords(prompt);
    const visualTheme = pickVisualTheme(prompt);
    const qualityLevel = keywords.length < 4 ? "short" : keywords.length > 8 ? "rich" : "balanced";
    const notes = [];
    const aspectRatio = type === "video" ? "16:9" : (prompt.toLowerCase().includes("portrait") || prompt.includes("بورتريه") ? "4:5" : "1:1");
    const cameraAngle = prompt.toLowerCase().includes("close") || prompt.includes("قريبة")
        ? "close-up"
        : prompt.toLowerCase().includes("wide") || prompt.includes("واسعة")
            ? "wide shot"
            : "hero angle";
    const motionHint = type === "video"
        ? (prompt.toLowerCase().includes("slow") || prompt.includes("ببطء") ? "slow cinematic movement" : "smooth dynamic motion")
        : "still frame";

    if (qualityLevel === "short") {
        notes.push("الوصف قصير. أضف الإضاءة، الخلفية، أو زاوية التصوير.");
    } else {
        notes.push("الوصف جيد ويمكن تحسينه تلقائيًا.");
    }

    if (type === "video") {
        notes.push("للفيديو: وجود حركة واضحة أو انتقال يساعد على نتيجة أقوى.");
    } else {
        notes.push("للصورة: وجود ستايل بصري واضح يعطي نتيجة أفضل.");
    }

    return {
        keywords,
        suggestedStyles: finalStyles.map((styleItem) => styleItem.label),
        qualityLevel,
        visualTheme,
        aspectRatio,
        cameraAngle,
        motionHint,
        lighting: visualTheme.lighting,
        mood: visualTheme.mood,
        notes,
        enhancedPrompt: [
            prompt,
            `Style: ${finalStyles.map((styleItem) => styleItem.hint).join(", ")}`,
            `Mood: ${visualTheme.mood}`,
            `Lighting: ${visualTheme.lighting}`,
            `Camera: ${cameraAngle}`,
            `Aspect ratio: ${aspectRatio}`,
            type === "video"
                ? `Motion: ${motionHint}, layered foreground and background, consistent pacing`
                : "Image: high-detail hero frame, crisp focal subject, polished lighting"
        ].join(". "),
        recommendedOutputCount: 1
    };
}

function createMockPreview(workRecord, codeRecord, intelligence) {
    const promptPreview = escapeXml(
        workRecord.originalPrompt.length > 90
            ? `${workRecord.originalPrompt.slice(0, 87)}...`
            : workRecord.originalPrompt
    );
    const title = workRecord.type === "image" ? "IMAGE PREVIEW" : "VIDEO PREVIEW";
    const detail = workRecord.type === "video"
        ? `${workRecord.duration}s clip | ${getBadgeLabel(codeRecord)}`
        : `Still image | ${getBadgeLabel(codeRecord)}`;
    const theme = intelligence.visualTheme || pickVisualTheme(workRecord.originalPrompt);
    const filename = `generated-${workRecord.type}-${workRecord.id}.svg`;
    const outputPath = path.join(__dirname, filename);
    const svg = [
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1200\" height=\"720\" viewBox=\"0 0 1200 720\">",
        "<defs>",
        "<linearGradient id=\"bg\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">",
        `<stop offset="0%" stop-color="${theme.primary}" />`,
        `<stop offset="100%" stop-color="${theme.secondary}" />`,
        "</linearGradient>",
        "</defs>",
        "<rect width=\"1200\" height=\"720\" fill=\"url(#bg)\" rx=\"40\" />",
        `<circle cx="1040" cy="140" r="110" fill="${theme.accent}" fill-opacity="0.16" />`,
        `<circle cx="190" cy="560" r="160" fill="${theme.accent}" fill-opacity="0.12" />`,
        "<rect x=\"80\" y=\"80\" width=\"1040\" height=\"560\" rx=\"32\" fill=\"rgba(8,18,32,0.55)\" stroke=\"rgba(255,255,255,0.15)\" />",
        `<text x=\"120\" y=\"180\" fill=\"#f6f4ef\" font-size=\"46\" font-family=\"Trebuchet MS, Segoe UI, sans-serif\" font-weight=\"700\">${title}</text>`,
        `<text x=\"120\" y=\"235\" fill=\"#f7c96a\" font-size=\"24\" font-family=\"Courier New, monospace\">${escapeXml(codeRecord.code)}</text>`,
        `<text x=\"120\" y=\"320\" fill=\"#e4edf7\" font-size=\"34\" font-family=\"Trebuchet MS, Segoe UI, sans-serif\">${escapeXml(detail)}</text>`,
        `<text x=\"120\" y=\"410\" fill=\"#ffffff\" font-size=\"26\" font-family=\"Trebuchet MS, Segoe UI, sans-serif\">${promptPreview}</text>`,
        `<text x="120" y="470" fill="#bcd2e8" font-size="22" font-family="Courier New, monospace">AI: ${escapeXml(intelligence.qualityLevel)} | ${escapeXml(intelligence.suggestedStyles.join(" / "))}</text>`,
        `<text x="120" y="515" fill="#bcd2e8" font-size="20" font-family="Courier New, monospace">${escapeXml(intelligence.lighting)} | ${escapeXml(intelligence.cameraAngle)} | ${escapeXml(intelligence.aspectRatio)}</text>`,
        `<text x=\"120\" y=\"560\" fill=\"#bcd2e8\" font-size=\"22\" font-family=\"Courier New, monospace\">Generated at ${escapeXml(workRecord.createdAt)}</text>`,
        "<text x=\"120\" y=\"580\" fill=\"#bcd2e8\" font-size=\"22\" font-family=\"Courier New, monospace\">Mock preview only - connect your AI provider here.</text>",
        "</svg>"
    ].join("");

    fs.writeFileSync(outputPath, svg, "utf8");
    return `/${filename}`;
}

function createWork(req, options) {
    const { codeRecord, prompt, type, duration, sourceWorkId = null } = options;

    ensureCodeCanGenerate(codeRecord);

    if (type === "image" && codeRecord.remainingImages <= 0) {
        throw createHttpError(409, "No image credits remaining for this code.");
    }

    if (type === "video") {
        if (codeRecord.remainingVideos <= 0) {
            throw createHttpError(409, "No video credits remaining for this code.");
        }

        if (!codeRecord.allowedDurations.includes(duration)) {
            throw createHttpError(400, `Allowed video durations are: ${codeRecord.allowedDurations.join(", ")}.`);
        }
    }

    const intelligence = buildPromptIntelligence(prompt, type);
    const workId = store.nextWorkId;
    const createdAt = nowIso();
    const baseWork = {
        id: workId,
        codeId: codeRecord.id,
        code: codeRecord.code,
        prompt,
        originalPrompt: prompt,
        enhancedPrompt: intelligence.enhancedPrompt,
        type,
        duration: type === "video" ? duration : null,
        createdAt,
        sourceWorkId,
        saved: codeRecord.allowSave,
        qualityLevel: intelligence.qualityLevel,
        styleSuggestions: intelligence.suggestedStyles,
        processingPriority: codeRecord.processingPriority || "normal"
    };

    const previewPath = createMockPreview(baseWork, codeRecord, intelligence);
    const workRecord = {
        ...baseWork,
        fileUrl: previewPath,
        previewUrl: previewPath
    };

    store.nextWorkId += 1;

    if (type === "image") {
        codeRecord.remainingImages -= 1;
    } else {
        codeRecord.remainingVideos -= 1;
    }

    codeRecord.updatedAt = createdAt;

    if (codeRecord.allowSave) {
        store.works.unshift(workRecord);
    }

    addEvent(
        codeRecord,
        sourceWorkId ? "regenerate" : "generate",
        sourceWorkId ? "تمت إعادة توليد عمل جديد." : "تم إنشاء عمل جديد.",
        {
            type,
            duration,
            qualityLevel: intelligence.qualityLevel
        }
    );

    saveStore();

    return {
        workRecord,
        saved: codeRecord.allowSave,
        intelligence
    };
}

function adjustRemainingValue(currentMax, currentRemaining, nextMax) {
    const usedCount = Math.max(currentMax - currentRemaining, 0);
    return Math.max(nextMax - usedCount, 0);
}

function wrap(handler) {
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function createAdminToken() {
    return crypto.randomBytes(24).toString("hex");
}

function getAdminToken(req) {
    const authorizationHeader = req.get("authorization");
    if (authorizationHeader && authorizationHeader.toLowerCase().startsWith("bearer ")) {
        return authorizationHeader.slice(7).trim();
    }

    return req.get("x-admin-token") || null;
}

function requireAdmin(req, res, next) {
    const token = getAdminToken(req);
    if (!token || !adminSessions.has(token)) {
        res.status(401).json({
            success: false,
            message: "Admin authentication is required."
        });
        return;
    }

    req.admin = adminSessions.get(token);
    req.adminToken = token;
    next();
}

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        data: {
            status: "ok",
            codes: store.codes.length,
            works: store.works.length
        }
    });
});

app.post("/api/admin/login", wrap((req, res) => {
    const username = normalizeOptionalText(req.body.username);
    const password = normalizeOptionalText(req.body.password);
    const securityCode = normalizeOptionalText(req.body.securityCode);

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        throw createHttpError(401, "Invalid admin credentials.");
    }

    if (ADMIN_SECURITY_CODE && securityCode !== ADMIN_SECURITY_CODE) {
        throw createHttpError(401, "Invalid admin security code.");
    }

    const token = createAdminToken();
    adminSessions.set(token, {
        username,
        createdAt: nowIso()
    });

    res.json({
        success: true,
        message: "Admin login successful.",
        data: {
            token,
            username,
            securityCodeRequired: Boolean(ADMIN_SECURITY_CODE)
        }
    });
}));

app.get("/api/admin/session", requireAdmin, (req, res) => {
    res.json({
        success: true,
        data: {
            username: req.admin.username,
            createdAt: req.admin.createdAt,
            securityCodeRequired: Boolean(ADMIN_SECURITY_CODE)
        }
    });
});

app.post("/api/admin/logout", requireAdmin, (req, res) => {
    adminSessions.delete(req.adminToken);
    res.json({
        success: true,
        message: "Admin logged out."
    });
});

app.get("/api/admin/codes", requireAdmin, wrap((req, res) => {
    const codes = store.codes
        .slice()
        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
        .map((codeRecord) => serializeCode(codeRecord));

    res.json({
        success: true,
        data: {
            codes
        }
    });
}));

app.post("/api/admin/codes", requireAdmin, wrap((req, res) => {
    const codeValue = normalizeCodeValue(req.body.code);

    if (store.codes.some((item) => item.code === codeValue)) {
        throw createHttpError(409, "This code already exists.");
    }

    const maxImages = parseInteger(req.body.maxImages, "maxImages", { min: 0 });
    const maxVideos = parseInteger(req.body.maxVideos, "maxVideos", { min: 0 });

    if (maxImages === 0 && maxVideos === 0) {
        throw createHttpError(400, "At least one image or video credit is required.");
    }

    const planType = parsePlanType(req.body.planType || req.body.tier, "standard");
    const allowedDurations = maxVideos > 0
        ? parseDurations(req.body.allowedDurations, { required: true })
        : [];
    const createdAt = nowIso();

    const codeRecord = {
        id: createCodeId(),
        code: codeValue,
        name: normalizeName(req.body.name, codeValue),
        clientName: normalizeOptionalText(req.body.clientName),
        tier: planType,
        planType,
        processingPriority: parseProcessingPriority(
            req.body.processingPriority,
            defaultPriorityForPlan(planType)
        ),
        maxImages,
        maxVideos,
        remainingImages: maxImages,
        remainingVideos: maxVideos,
        allowedDurations,
        startsAt: parseOptionalDate(req.body.startsAt),
        expiresAt: parseOptionalDate(req.body.expiresAt),
        isActive: parseBoolean(req.body.isActive, true),
        allowRegenerate: parseBoolean(req.body.allowRegenerate, true),
        allowSave: parseBoolean(req.body.allowSave, true),
        internalNotes: normalizeOptionalText(req.body.internalNotes),
        createdBy: normalizeName(req.body.createdBy || req.admin.username, req.admin.username),
        createdAt,
        updatedAt: createdAt
    };

    store.codes.unshift(codeRecord);
    addEvent(codeRecord, "code-created", "تم إنشاء الكود من لوحة الأدمن.", {
        planType,
        processingPriority: codeRecord.processingPriority
    });
    saveStore();

    res.status(201).json({
        success: true,
        message: "Code created successfully.",
        data: {
            code: serializeCode(codeRecord)
        }
    });
}));

app.get("/api/admin/codes/:code", requireAdmin, wrap((req, res) => {
    const codeRecord = findCodeOrFail(req.params.code);
    const works = getWorksForCode(codeRecord.id).map((workRecord) => serializeWork(req, workRecord));
    const activity = getEventsForCode(codeRecord.id).map(serializeEvent);

    res.json({
        success: true,
        data: {
            code: serializeCode(codeRecord),
            works,
            activity
        }
    });
}));

app.patch("/api/admin/codes/:code", requireAdmin, wrap((req, res) => {
    const codeRecord = findCodeOrFail(req.params.code);

    if (req.body.name !== undefined) {
        codeRecord.name = normalizeName(req.body.name, codeRecord.name);
    }

    if (req.body.clientName !== undefined) {
        codeRecord.clientName = normalizeOptionalText(req.body.clientName);
    }

    if (req.body.tier !== undefined || req.body.planType !== undefined) {
        const nextPlanType = parsePlanType(req.body.planType || req.body.tier, codeRecord.planType || codeRecord.tier);
        codeRecord.tier = nextPlanType;
        codeRecord.planType = nextPlanType;
    }

    if (req.body.processingPriority !== undefined) {
        codeRecord.processingPriority = parseProcessingPriority(
            req.body.processingPriority,
            codeRecord.processingPriority || defaultPriorityForPlan(codeRecord.planType || codeRecord.tier)
        );
    }

    if (req.body.startsAt !== undefined) {
        codeRecord.startsAt = parseOptionalDate(req.body.startsAt, { allowUndefined: true });
    }

    if (req.body.expiresAt !== undefined) {
        codeRecord.expiresAt = parseOptionalDate(req.body.expiresAt, { allowUndefined: true });
    }

    if (req.body.allowRegenerate !== undefined) {
        codeRecord.allowRegenerate = parseBoolean(req.body.allowRegenerate, codeRecord.allowRegenerate);
    }

    if (req.body.allowSave !== undefined) {
        codeRecord.allowSave = parseBoolean(req.body.allowSave, codeRecord.allowSave);
    }

    if (req.body.isActive !== undefined) {
        codeRecord.isActive = parseBoolean(req.body.isActive, codeRecord.isActive);
    }

    if (req.body.internalNotes !== undefined) {
        codeRecord.internalNotes = normalizeOptionalText(req.body.internalNotes);
    }

    if (req.body.maxImages !== undefined) {
        const nextMaxImages = parseInteger(req.body.maxImages, "maxImages", { min: 0 });
        codeRecord.remainingImages = adjustRemainingValue(
            codeRecord.maxImages,
            codeRecord.remainingImages,
            nextMaxImages
        );
        codeRecord.maxImages = nextMaxImages;
    }

    if (req.body.maxVideos !== undefined) {
        const nextMaxVideos = parseInteger(req.body.maxVideos, "maxVideos", { min: 0 });
        codeRecord.remainingVideos = adjustRemainingValue(
            codeRecord.maxVideos,
            codeRecord.remainingVideos,
            nextMaxVideos
        );
        codeRecord.maxVideos = nextMaxVideos;
    }

    if (req.body.allowedDurations !== undefined) {
        codeRecord.allowedDurations = parseDurations(req.body.allowedDurations);
    }

    if (req.body.remainingImages !== undefined) {
        const nextRemainingImages = parseInteger(req.body.remainingImages, "remainingImages", { min: 0 });

        if (nextRemainingImages > codeRecord.maxImages) {
            throw createHttpError(400, "remainingImages cannot exceed maxImages.");
        }

        codeRecord.remainingImages = nextRemainingImages;
    }

    if (req.body.remainingVideos !== undefined) {
        const nextRemainingVideos = parseInteger(req.body.remainingVideos, "remainingVideos", { min: 0 });

        if (nextRemainingVideos > codeRecord.maxVideos) {
            throw createHttpError(400, "remainingVideos cannot exceed maxVideos.");
        }

        codeRecord.remainingVideos = nextRemainingVideos;
    }

    if (codeRecord.maxImages === 0 && codeRecord.maxVideos === 0) {
        throw createHttpError(400, "A code cannot have zero image and zero video credits at the same time.");
    }

    if (codeRecord.maxVideos > 0 && codeRecord.allowedDurations.length === 0) {
        throw createHttpError(400, "allowedDurations is required when maxVideos is greater than 0.");
    }

    if (codeRecord.maxVideos === 0) {
        codeRecord.allowedDurations = [];
        codeRecord.remainingVideos = 0;
    }

    codeRecord.updatedAt = nowIso();
    addEvent(codeRecord, "code-updated", "تم تحديث إعدادات الكود.", {
        updatedBy: req.admin.username
    });
    saveStore();

    res.json({
        success: true,
        message: "Code updated successfully.",
        data: {
            code: serializeCode(codeRecord)
        }
    });
}));

app.post("/api/codes/lookup", wrap((req, res) => {
    const codeRecord = findCodeOrFail(req.body.code || req.body.userCode);
    const works = codeRecord.allowSave
        ? getWorksForCode(codeRecord.id).map((workRecord) => serializeWork(req, workRecord))
        : [];

    res.json({
        success: true,
        data: {
            code: serializeCode(codeRecord),
            works
        }
    });
}));

app.get("/api/codes/:code", wrap((req, res) => {
    const codeRecord = findCodeOrFail(req.params.code);

    res.json({
        success: true,
        data: {
            code: serializeCode(codeRecord)
        }
    });
}));

app.get("/api/codes/:code/works", wrap((req, res) => {
    const codeRecord = findCodeOrFail(req.params.code);

    if (!codeRecord.allowSave) {
        res.json({
            success: true,
            data: {
                works: []
            }
        });
        return;
    }

    const works = getWorksForCode(codeRecord.id).map((workRecord) => serializeWork(req, workRecord));

    res.json({
        success: true,
        data: {
            works
        }
    });
}));

app.get("/api/codes/:code/activity", wrap((req, res) => {
    const codeRecord = findCodeOrFail(req.params.code);
    const activity = getEventsForCode(codeRecord.id).map(serializeEvent);

    res.json({
        success: true,
        data: {
            activity
        }
    });
}));

app.post("/api/prompt-intelligence/analyze", wrap((req, res) => {
    const prompt = parsePrompt(req.body.prompt);
    const type = parseContentType(req.body.type || "image");

    res.json({
        success: true,
        data: buildPromptIntelligence(prompt, type)
    });
}));

app.post("/api/content/generate", wrap((req, res) => {
    const codeRecord = findCodeOrFail(req.body.code || req.body.userCode);
    const prompt = parsePrompt(req.body.prompt);
    const type = parseContentType(req.body.type);
    const duration = type === "video"
        ? parseInteger(req.body.duration, "duration", { min: 1 })
        : null;

    const { workRecord, saved, intelligence } = createWork(req, {
        codeRecord,
        prompt,
        type,
        duration
    });

    res.status(201).json({
        success: true,
        message: saved
            ? "Content generated and saved inside the code library."
            : "Content generated. Saving is disabled for this code.",
        data: {
            code: serializeCode(codeRecord),
            work: serializeWork(req, workRecord),
            saved,
            intelligence,
            mockOutput: true
        }
    });
}));

app.post("/api/works/:workId/regenerate", wrap((req, res) => {
    const sourceWork = findWorkOrFail(req.params.workId);
    const codeRecord = store.codes.find((item) => item.id === sourceWork.codeId);

    if (!codeRecord) {
        throw createHttpError(404, "The code attached to this work item no longer exists.");
    }

    if (!codeRecord.allowRegenerate) {
        throw createHttpError(403, "Regenerate is disabled for this code.");
    }

    const prompt = req.body.prompt ? parsePrompt(req.body.prompt) : sourceWork.prompt;
    const duration = sourceWork.type === "video"
        ? (req.body.duration !== undefined
            ? parseInteger(req.body.duration, "duration", { min: 1 })
            : sourceWork.duration)
        : null;

    const { workRecord, saved, intelligence } = createWork(req, {
        codeRecord,
        prompt,
        type: sourceWork.type,
        duration,
        sourceWorkId: sourceWork.id
    });

    res.status(201).json({
        success: true,
        message: saved
            ? "Content regenerated and saved inside the code library."
            : "Content regenerated. Saving is disabled for this code.",
        data: {
            code: serializeCode(codeRecord),
            work: serializeWork(req, workRecord),
            saved,
            intelligence,
            mockOutput: true
        }
    });
}));

app.post("/verify-code", wrap((req, res) => {
    const codeRecord = findCodeOrFail(req.body.userCode || req.body.code);

    res.json({
        success: true,
        message: "Code verified successfully.",
        data: {
            code: serializeCode(codeRecord)
        }
    });
}));

app.post("/generate", wrap((req, res) => {
    const codeRecord = findCodeOrFail(req.body.userCode || req.body.code);
    const prompt = parsePrompt(req.body.prompt);
    const type = parseContentType(req.body.type);
    const duration = type === "video"
        ? parseInteger(req.body.duration, "duration", { min: 1 })
        : null;

    const { workRecord, saved, intelligence } = createWork(req, {
        codeRecord,
        prompt,
        type,
        duration
    });

    res.status(201).json({
        success: true,
        message: saved ? "Generated successfully." : "Generated successfully, but saving is disabled.",
        url: serializeWork(req, workRecord).fileUrl,
        data: {
            code: serializeCode(codeRecord),
            work: serializeWork(req, workRecord),
            saved,
            intelligence,
            mockOutput: true
        }
    });
}));

app.use((error, req, res, next) => {
    const status = error.status || 500;

    res.status(status).json({
        success: false,
        message: error.message || "Unexpected server error."
    });
});

app.listen(PORT, () => {
    console.log(`Credits platform running on http://localhost:${PORT}`);
});

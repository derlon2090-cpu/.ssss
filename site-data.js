(function () {
    const STORE_KEY = "credits_platform_store_v2";
    const SESSION_KEY = "credits_platform_admin_session";
    const DEFAULT_ADMIN = {
        username: "admin",
        password: "admin123",
        securityCode: ""
    };

    function createEmptyStore() {
        return {
            codes: [],
            works: [],
            events: [],
            nextCodeId: 1,
            nextWorkId: 1,
            nextEventId: 1
        };
    }

    function loadStore() {
        try {
            const raw = localStorage.getItem(STORE_KEY);
            if (!raw) {
                return createEmptyStore();
            }
            const parsed = JSON.parse(raw);
            return {
                codes: Array.isArray(parsed.codes) ? parsed.codes : [],
                works: Array.isArray(parsed.works) ? parsed.works : [],
                events: Array.isArray(parsed.events) ? parsed.events : [],
                nextCodeId: Number.isInteger(parsed.nextCodeId) ? parsed.nextCodeId : 1,
                nextWorkId: Number.isInteger(parsed.nextWorkId) ? parsed.nextWorkId : 1,
                nextEventId: Number.isInteger(parsed.nextEventId) ? parsed.nextEventId : 1
            };
        } catch (error) {
            return createEmptyStore();
        }
    }

    function saveStore(store) {
        localStorage.setItem(STORE_KEY, JSON.stringify(store));
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function normalizeText(value) {
        return String(value || "").trim();
    }

    function normalizeCode(code) {
        const value = normalizeText(code).toUpperCase();
        if (!value) {
            throw createError(400, "الكود مطلوب.");
        }
        return value;
    }

    function createError(status, message) {
        const error = new Error(message);
        error.status = status;
        return error;
    }

    function getAdminSession() {
        try {
            return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
        } catch (error) {
            return null;
        }
    }

    function setAdminSession(session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    function clearAdminSession() {
        localStorage.removeItem(SESSION_KEY);
    }

    function requireAdmin(headers) {
        const authHeader = headers.get("authorization") || "";
        const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
        const session = getAdminSession();
        if (!session || !token || token !== session.token) {
            throw createError(401, "Admin authentication is required.");
        }
        return session;
    }

    function getCodeStatus(code) {
        const now = Date.now();
        if (!code.isActive) {
            return "inactive";
        }
        if (code.startsAt && new Date(code.startsAt).getTime() > now) {
            return "scheduled";
        }
        if (code.expiresAt && new Date(code.expiresAt).getTime() < now) {
            return "expired";
        }
        if (Number(code.remainingImages || 0) + Number(code.remainingVideos || 0) <= 0) {
            return "consumed";
        }
        return "active";
    }

    function serializeCode(store, code) {
        const worksCount = store.works.filter((work) => work.codeId === code.id).length;
        return {
            id: code.id,
            code: code.code,
            name: code.name,
            clientName: code.clientName || "",
            tier: code.planType,
            planType: code.planType,
            badgeLabel: (code.planType || "standard").toUpperCase(),
            processingPriority: code.processingPriority || "normal",
            maxImages: code.maxImages,
            maxVideos: code.maxVideos,
            remainingImages: code.remainingImages,
            remainingVideos: code.remainingVideos,
            allowedDurations: code.allowedDurations || [],
            startsAt: code.startsAt || null,
            expiresAt: code.expiresAt || null,
            isActive: Boolean(code.isActive),
            allowRegenerate: Boolean(code.allowRegenerate),
            allowSave: Boolean(code.allowSave),
            internalNotes: code.internalNotes || "",
            createdBy: code.createdBy || "admin",
            status: getCodeStatus(code),
            remainingUses: Number(code.remainingImages || 0) + Number(code.remainingVideos || 0),
            usedImages: Math.max((code.maxImages || 0) - (code.remainingImages || 0), 0),
            usedVideos: Math.max((code.maxVideos || 0) - (code.remainingVideos || 0), 0),
            worksCount,
            createdAt: code.createdAt,
            updatedAt: code.updatedAt
        };
    }

    function serializeWork(work) {
        return {
            id: work.id,
            codeId: work.codeId,
            code: work.code,
            prompt: work.originalPrompt || work.prompt,
            originalPrompt: work.originalPrompt || work.prompt,
            enhancedPrompt: work.enhancedPrompt || work.prompt,
            type: work.type,
            duration: work.duration || null,
            fileUrl: work.fileUrl,
            previewUrl: work.previewUrl,
            saved: work.saved,
            sourceWorkId: work.sourceWorkId || null,
            qualityLevel: work.qualityLevel || "balanced",
            outputQuality: work.outputQuality || "high",
            qualityLabel: work.qualityLabel || "عالية",
            styleSuggestions: work.styleSuggestions || [],
            visualStyle: work.visualStyle || "realistic",
            styleLabel: work.styleLabel || "واقعي",
            timeOfDay: work.timeOfDay || "auto",
            timeOfDayLabel: work.timeOfDayLabel || "تلقائي",
            cameraAnglePreset: work.cameraAnglePreset || "medium",
            cameraAngleLabel: work.cameraAngleLabel || "متوسطة",
            processingPriority: work.processingPriority || "normal",
            createdAt: work.createdAt
        };
    }

    function serializeEvent(event) {
        return {
            id: event.id,
            codeId: event.codeId,
            code: event.code,
            action: event.action,
            message: event.message,
            meta: event.meta || {},
            createdAt: event.createdAt
        };
    }

    function addEvent(store, code, action, message, meta) {
        const event = {
            id: store.nextEventId++,
            codeId: code.id,
            code: code.code,
            action,
            message,
            meta: meta || {},
            createdAt: nowIso()
        };
        store.events.unshift(event);
        return event;
    }

    function findCode(store, codeValue) {
        const code = normalizeCode(codeValue);
        const record = store.codes.find((item) => item.code === code);
        if (!record) {
            throw createError(404, "Code not found.");
        }
        return record;
    }

    function ensureCodeCanGenerate(code) {
        const status = getCodeStatus(code);
        if (status === "inactive") {
            throw createError(403, "This code is inactive.");
        }
        if (status === "scheduled") {
            throw createError(403, "This code has not started yet.");
        }
        if (status === "expired") {
            throw createError(403, "This code has expired.");
        }
        if (status === "consumed") {
            throw createError(409, "This code has no remaining credits.");
        }
    }

    function extractKeywords(prompt) {
        const matches = (prompt.match(/[A-Za-z0-9\u0600-\u06FF]+/g) || []).map((word) => word.toLowerCase());
        return [...new Set(matches.filter((word) => word.length > 2))].slice(0, 10);
    }

    function pickTimeOfDay(prompt, requestedTime) {
        if (requestedTime === "day" || requestedTime === "night") {
            return requestedTime;
        }
        if (/night|ليل|مساء|نيون|moon/i.test(prompt)) {
            return "night";
        }
        if (/day|نهار|شمس|sun|morning/i.test(prompt)) {
            return "day";
        }
        return "day";
    }

    function getTimeLabel(value) {
        return value === "night" ? "ليل" : value === "day" ? "نهار" : "تلقائي";
    }

    function getStyleConfig(style) {
        const catalog = {
            realistic: {
                label: "واقعي",
                prompt: "photorealistic details, natural textures, realistic shadows",
                paletteDay: ["#eadfcb", "#b08968", "#283618"],
                paletteNight: ["#1d3557", "#355070", "#a8dadc"],
                mood: "واقعي ومتوازن",
                lightingDay: "natural daylight with crisp contrast",
                lightingNight: "realistic city night reflections"
            },
            cinematic: {
                label: "سينمائي",
                prompt: "cinematic lighting, dramatic framing, premium composition",
                paletteDay: ["#f4d35e", "#ee964b", "#0d3b66"],
                paletteNight: ["#0b132b", "#1c2541", "#5bc0be"],
                mood: "سينمائي وفاخر",
                lightingDay: "golden cinematic daylight",
                lightingNight: "dramatic cinematic night lighting"
            },
            commercial: {
                label: "إعلاني",
                prompt: "commercial product polish, clean composition, high brand clarity",
                paletteDay: ["#fdf0d5", "#e09f3e", "#003049"],
                paletteNight: ["#14213d", "#fca311", "#e5e5e5"],
                mood: "إعلاني ونظيف",
                lightingDay: "clean studio daylight",
                lightingNight: "premium branded spotlight"
            },
            anime: {
                label: "أنمي",
                prompt: "anime illustration style, stylized shading, expressive color depth",
                paletteDay: ["#ffc8dd", "#bde0fe", "#a2d2ff"],
                paletteNight: ["#2b2d42", "#7b2cbf", "#c77dff"],
                mood: "أنمي وحيوي",
                lightingDay: "bright stylized highlights",
                lightingNight: "vivid neon anime glow"
            }
        };
        return catalog[style] || catalog.realistic;
    }

    function getCameraLabel(value) {
        return value === "close" ? "قريبة" : value === "wide" ? "واسعة" : "متوسطة";
    }

    function getCameraDescription(value) {
        return value === "close" ? "close-up focus" : value === "wide" ? "wide establishing shot" : "medium hero framing";
    }

    function getQualityLabel(value) {
        return value === "ultra" ? "فائقة" : value === "normal" ? "عادية" : "عالية";
    }

    function getQualityDescription(value) {
        return value === "ultra" ? "ultra detailed, 4k export, premium finish" : value === "normal" ? "clean output, balanced detail" : "high quality, crisp lighting, polished details";
    }

    function inferSubject(keywords) {
        return keywords[0] || "المشهد";
    }

    function inferEnvironment(prompt) {
        const lower = prompt.toLowerCase();
        if (/car|سيارة/.test(lower)) return "سيارة أو بيئة قيادة";
        if (/street|شارع|مدينة/.test(lower)) return "مشهد حضري";
        if (/product|منتج|brand|اعلان/.test(lower)) return "عرض منتج";
        if (/portrait|بورتريه|face|شخص/.test(lower)) return "لقطة شخصية";
        return "بيئة إبداعية مخصصة";
    }

    function buildPromptIntelligence(prompt, type, options) {
        const keywords = extractKeywords(prompt);
        const isVideo = type === "video";
        const isShort = prompt.length < 40;
        const styles = [];
        if (/ليل|سينما|cinematic|night/i.test(prompt)) styles.push("سينمائي");
        if (/واقعي|realistic/i.test(prompt)) styles.push("واقعي");
        if (/إعلان|product|brand/i.test(prompt)) styles.push("إعلاني");
        if (!styles.length) styles.push(isVideo ? "حركة ناعمة" : "إضاءة متوازنة");
        return {
            keywords,
            suggestedStyles: styles,
            qualityLevel: isShort ? "needs more detail" : "enhanced",
            visualTheme: styles[0],
            aspectRatio: isVideo ? "16:9" : "4:5",
            cameraAngle: /close|قريب/i.test(prompt) ? "close-up" : "hero angle",
            motionHint: isVideo ? "smooth motion with clean transitions" : "single polished frame",
            lighting: /ليل|night/i.test(prompt) ? "cinematic night lighting" : "soft studio lighting",
            mood: /فاخر|luxury/i.test(prompt) ? "luxury premium mood" : "balanced creative mood",
            notes: [
                isShort ? "أضف تفاصيل أكثر للحصول على نتيجة أغنى" : "الوصف جيد ويحتوي تفاصيل مناسبة",
                isVideo ? "تم تجهيز الوصف بما يناسب حركة الفيديو" : "تم تجهيز الوصف بما يناسب الصورة"
            ],
            enhancedPrompt: `${prompt}, ${styles.join(", ")}, high quality, detailed lighting, polished composition`,
            recommendedOutputCount: 1
        };
    }

    function buildMockPreview(prompt, type) {
        const bg = /ليل|night/i.test(prompt) ? ["#0b132b", "#1c2541", "#5bc0be"] : ["#f4d35e", "#ee964b", "#0d3b66"];
        const label = type === "video" ? "VIDEO" : "IMAGE";
        const safePrompt = prompt.replace(/[<&>"]/g, "");
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
                <defs>
                    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="${bg[0]}"/>
                        <stop offset="50%" stop-color="${bg[1]}"/>
                        <stop offset="100%" stop-color="${bg[2]}"/>
                    </linearGradient>
                </defs>
                <rect width="1200" height="900" fill="url(#g)"/>
                <circle cx="940" cy="180" r="120" fill="rgba(255,255,255,0.18)"/>
                <rect x="110" y="590" width="980" height="180" rx="32" fill="rgba(255,255,255,0.14)"/>
                <text x="110" y="170" fill="#ffffff" font-size="68" font-family="Arial">Smart Credits ${label}</text>
                <text x="110" y="260" fill="#ffffff" font-size="34" font-family="Arial">${safePrompt.slice(0, 80)}</text>
            </svg>`;
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }

    function buildPromptIntelligence(prompt, type, options) {
        const config = options || {};
        const keywords = extractKeywords(prompt);
        const isVideo = type === "video";
        const isShort = prompt.length < 40;
        const finalTimeOfDay = pickTimeOfDay(prompt, config.timeOfDay);
        const styleKey = config.visualStyle || "realistic";
        const styleConfig = getStyleConfig(styleKey);
        const cameraAnglePreset = config.cameraAnglePreset || "medium";
        const outputQuality = config.outputQuality || "high";
        const subject = inferSubject(keywords);
        const environment = inferEnvironment(prompt);
        const timeOfDayLabel = getTimeLabel(finalTimeOfDay);
        const styleLabel = styleConfig.label;
        const cameraAngleLabel = getCameraLabel(cameraAnglePreset);
        const qualityLabel = getQualityLabel(outputQuality);
        const lighting = finalTimeOfDay === "night" ? styleConfig.lightingNight : styleConfig.lightingDay;
        const aspectRatio = isVideo ? "16:9" : cameraAnglePreset === "close" ? "4:5" : "1:1";
        const motionHint = isVideo
            ? "smooth camera motion, scene-aware pacing, refined movement arcs"
            : "single polished frame with export-ready composition";
        const notes = [
            isShort ? "أضف مزيدًا من التفاصيل للخلفية والإضاءة لنتيجة أغنى." : "الوصف جيد وتم تنظيمه في Prompt أوضح.",
            isVideo ? "الفيديو يأخذ الحركة والمدة المختارة في الحسبان." : "سيتم إخراج صورة واحدة واضحة وجاهزة للحفظ.",
            config.timeOfDay === "auto" ? "تم اختيار الوقت الأنسب تلقائيًا حسب الوصف." : `تم تثبيت الوقت على ${timeOfDayLabel}.`
        ];

        return {
            originalPrompt: prompt,
            keywords,
            subject,
            environment,
            suggestedStyles: [styleLabel],
            styleLabel,
            visualStyle: styleKey,
            qualityLevel: isShort ? "needs-detail" : "enhanced",
            qualityLabel,
            outputQuality,
            aspectRatio,
            cameraAngle: getCameraDescription(cameraAnglePreset),
            cameraAnglePreset,
            cameraAngleLabel,
            timeOfDay: finalTimeOfDay,
            timeOfDayLabel,
            motionHint,
            lighting,
            mood: styleConfig.mood,
            notes,
            visualTheme: {
                style: styleKey,
                palette: finalTimeOfDay === "night" ? styleConfig.paletteNight : styleConfig.paletteDay
            },
            enhancedPrompt: [
                prompt,
                styleConfig.prompt,
                lighting,
                getCameraDescription(cameraAnglePreset),
                getQualityDescription(outputQuality),
                finalTimeOfDay === "night" ? "night atmosphere" : "daylight atmosphere",
                isVideo ? "text to video scene planning, controlled motion, consistent pacing" : "high resolution still image, export ready"
            ].join(", "),
            recommendedOutputCount: 1
        };
    }

    function buildMockPreview(prompt, type, intelligence) {
        const palette = intelligence.visualTheme?.palette || ["#f4d35e", "#ee964b", "#0d3b66"];
        const label = type === "video" ? "VIDEO" : "IMAGE";
        const safePrompt = prompt.replace(/[<&>"]/g, "");
        const styleLabel = intelligence.styleLabel || "واقعي";
        const timeLabel = intelligence.timeOfDayLabel || "تلقائي";
        const qualityLabel = intelligence.qualityLabel || "عالية";
        const cameraLabel = intelligence.cameraAngleLabel || "متوسطة";
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
                <defs>
                    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="${palette[0]}"/>
                        <stop offset="50%" stop-color="${palette[1]}"/>
                        <stop offset="100%" stop-color="${palette[2]}"/>
                    </linearGradient>
                </defs>
                <rect width="1200" height="900" fill="url(#g)"/>
                <circle cx="960" cy="170" r="132" fill="rgba(255,255,255,0.17)"/>
                <rect x="100" y="110" width="1000" height="540" rx="36" fill="rgba(9,18,28,0.28)" stroke="rgba(255,255,255,0.2)"/>
                <rect x="100" y="690" width="1000" height="120" rx="28" fill="rgba(255,255,255,0.14)"/>
                <text x="130" y="190" fill="#ffffff" font-size="62" font-family="Arial">Smart Credits ${label}</text>
                <text x="130" y="275" fill="#ffffff" font-size="32" font-family="Arial">${safePrompt.slice(0, 88)}</text>
                <text x="130" y="735" fill="#ffffff" font-size="26" font-family="Arial">${styleLabel} | ${timeLabel} | ${qualityLabel} | ${cameraLabel}</text>
                <text x="130" y="775" fill="#ffffff" font-size="22" font-family="Arial">${intelligence.lighting}</text>
            </svg>`;
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }

    async function handleRequest(url, options) {
        const store = loadStore();
        const method = (options.method || "GET").toUpperCase();
        const headers = new Headers(options.headers || {});
        const body = options.body ? JSON.parse(options.body) : {};
        const pathname = new URL(url, window.location.href).pathname;

        if (pathname === "/api/admin/login" && method === "POST") {
            const username = normalizeText(body.username);
            const password = normalizeText(body.password);
            const securityCode = normalizeText(body.securityCode);
            if (username !== DEFAULT_ADMIN.username || password !== DEFAULT_ADMIN.password) {
                throw createError(401, "Invalid admin credentials.");
            }
            if (DEFAULT_ADMIN.securityCode && securityCode !== DEFAULT_ADMIN.securityCode) {
                throw createError(401, "Invalid admin security code.");
            }
            const token = `local-admin-${Date.now()}`;
            setAdminSession({ token, username, createdAt: nowIso() });
            return {
                success: true,
                data: {
                    token,
                    username,
                    securityCodeRequired: false
                }
            };
        }

        if (pathname === "/api/admin/session" && method === "GET") {
            const session = requireAdmin(headers);
            return { success: true, data: session };
        }

        if (pathname === "/api/admin/logout" && method === "POST") {
            requireAdmin(headers);
            clearAdminSession();
            return { success: true, message: "Admin logged out." };
        }

        if (pathname === "/api/admin/codes" && method === "GET") {
            requireAdmin(headers);
            return {
                success: true,
                data: {
                    codes: store.codes.slice().map((code) => serializeCode(store, code))
                }
            };
        }

        if (pathname === "/api/admin/codes" && method === "POST") {
            const session = requireAdmin(headers);
            const codeValue = normalizeCode(body.code);
            if (store.codes.some((item) => item.code === codeValue)) {
                throw createError(409, "This code already exists.");
            }
            const maxImages = Number(body.maxImages || 0);
            const maxVideos = Number(body.maxVideos || 0);
            if (maxImages + maxVideos <= 0) {
                throw createError(400, "At least one image or video credit is required.");
            }
            const code = {
                id: store.nextCodeId++,
                code: codeValue,
                name: normalizeText(body.name) || codeValue,
                clientName: normalizeText(body.clientName),
                planType: normalizeText(body.planType || "standard").toLowerCase(),
                processingPriority: normalizeText(body.processingPriority || "normal").toLowerCase(),
                maxImages,
                maxVideos,
                remainingImages: maxImages,
                remainingVideos: maxVideos,
                allowedDurations: Array.isArray(body.allowedDurations) ? body.allowedDurations.map(Number) : [],
                startsAt: body.startsAt || null,
                expiresAt: body.expiresAt || null,
                isActive: body.isActive !== false,
                allowRegenerate: body.allowRegenerate !== false,
                allowSave: body.allowSave !== false,
                internalNotes: normalizeText(body.internalNotes),
                createdBy: normalizeText(body.createdBy) || session.username,
                createdAt: nowIso(),
                updatedAt: nowIso()
            };
            store.codes.unshift(code);
            addEvent(store, code, "code-created", "تم إنشاء الكود من لوحة الأدمن.", {});
            saveStore(store);
            return { success: true, data: { code: serializeCode(store, code) } };
        }

        const adminCodeMatch = pathname.match(/^\/api\/admin\/codes\/([^/]+)$/);
        if (adminCodeMatch && method === "GET") {
            requireAdmin(headers);
            const code = findCode(store, decodeURIComponent(adminCodeMatch[1]));
            const works = store.works.filter((work) => work.codeId === code.id).map(serializeWork);
            const activity = store.events.filter((event) => event.codeId === code.id).map(serializeEvent);
            return { success: true, data: { code: serializeCode(store, code), works, activity } };
        }

        if (adminCodeMatch && method === "PATCH") {
            requireAdmin(headers);
            const code = findCode(store, decodeURIComponent(adminCodeMatch[1]));
            if (body.isActive !== undefined) {
                code.isActive = Boolean(body.isActive);
            }
            code.updatedAt = nowIso();
            addEvent(store, code, "code-updated", "تم تحديث إعدادات الكود.", {});
            saveStore(store);
            return { success: true, data: { code: serializeCode(store, code) } };
        }

        if (pathname === "/api/codes/lookup" && method === "POST") {
            const code = findCode(store, body.code || body.userCode);
            const works = code.allowSave ? store.works.filter((work) => work.codeId === code.id).map(serializeWork) : [];
            return { success: true, data: { code: serializeCode(store, code), works } };
        }

        const activityMatch = pathname.match(/^\/api\/codes\/([^/]+)\/activity$/);
        if (activityMatch && method === "GET") {
            const code = findCode(store, decodeURIComponent(activityMatch[1]));
            const activity = store.events.filter((event) => event.codeId === code.id).map(serializeEvent);
            return { success: true, data: { activity } };
        }

        if (pathname === "/api/prompt-intelligence/analyze" && method === "POST") {
            return {
                success: true,
                data: buildPromptIntelligence(normalizeText(body.prompt), body.type || "image", {
                    timeOfDay: normalizeText(body.timeOfDay || "auto").toLowerCase(),
                    visualStyle: normalizeText(body.visualStyle || "realistic").toLowerCase(),
                    cameraAnglePreset: normalizeText(body.cameraAnglePreset || "medium").toLowerCase(),
                    outputQuality: normalizeText(body.outputQuality || "high").toLowerCase()
                })
            };
        }

        if (pathname === "/api/content/generate" && method === "POST") {
            const code = findCode(store, body.code || body.userCode);
            ensureCodeCanGenerate(code);
            const type = normalizeText(body.type || "image").toLowerCase();
            const prompt = normalizeText(body.prompt);
            if (!prompt) {
                throw createError(400, "Prompt is required.");
            }
            if (type === "image") {
                if (code.remainingImages <= 0) throw createError(409, "No image credits remaining.");
                code.remainingImages -= 1;
            } else {
                const duration = Number(body.duration || 0);
                if (code.remainingVideos <= 0) throw createError(409, "No video credits remaining.");
                if (!(code.allowedDurations || []).includes(duration)) throw createError(400, "Selected duration is not allowed.");
                code.remainingVideos -= 1;
            }
            const intelligence = buildPromptIntelligence(prompt, type, {
                timeOfDay: normalizeText(body.timeOfDay || "auto").toLowerCase(),
                visualStyle: normalizeText(body.visualStyle || "realistic").toLowerCase(),
                cameraAnglePreset: normalizeText(body.cameraAnglePreset || "medium").toLowerCase(),
                outputQuality: normalizeText(body.outputQuality || "high").toLowerCase()
            });
            const previewUrl = buildMockPreview(prompt, type, intelligence);
            const work = {
                id: store.nextWorkId++,
                codeId: code.id,
                code: code.code,
                prompt,
                originalPrompt: prompt,
                enhancedPrompt: intelligence.enhancedPrompt,
                type,
                duration: type === "video" ? Number(body.duration || 0) : null,
                fileUrl: previewUrl,
                previewUrl,
                saved: Boolean(code.allowSave),
                sourceWorkId: null,
                qualityLevel: intelligence.qualityLevel,
                outputQuality: intelligence.outputQuality,
                qualityLabel: intelligence.qualityLabel,
                styleSuggestions: intelligence.suggestedStyles,
                visualStyle: intelligence.visualStyle,
                styleLabel: intelligence.styleLabel,
                timeOfDay: intelligence.timeOfDay,
                timeOfDayLabel: intelligence.timeOfDayLabel,
                cameraAnglePreset: intelligence.cameraAnglePreset,
                cameraAngleLabel: intelligence.cameraAngleLabel,
                processingPriority: code.processingPriority || "normal",
                createdAt: nowIso()
            };
            store.works.unshift(work);
            code.updatedAt = nowIso();
            addEvent(store, code, "content-generated", `تم إنشاء ${type === "video" ? "فيديو" : "صورة"} جديدة.`, {});
            saveStore(store);
            return {
                success: true,
                data: {
                    code: serializeCode(store, code),
                    work: serializeWork(work),
                    saved: Boolean(code.allowSave),
                    intelligence,
                    mockOutput: true
                }
            };
        }

        throw createError(404, "Not found.");
    }

    async function fallbackFetch(input, init = {}) {
        const url = typeof input === "string" ? input : input.url;
        const parsed = new URL(url, window.location.href);
        if (!parsed.pathname.startsWith("/api/")) {
            return window.__creditsOriginalFetch(input, init);
        }

        try {
            const payload = await handleRequest(url, init);
            return new Response(JSON.stringify(payload), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        } catch (error) {
            return new Response(JSON.stringify({
                success: false,
                message: error.message || "Unexpected local error."
            }), {
                status: error.status || 500,
                headers: { "Content-Type": "application/json" }
            });
        }
    }

    window.__creditsOriginalFetch = window.fetch.bind(window);
    window.fetch = fallbackFetch;
})();

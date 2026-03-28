(function () {
    const STORE_KEY = "credits_platform_store_v3";
    const LEGACY_STORE_KEY = "credits_platform_store_v2";
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

    function normalizeStore(parsed) {
        return {
            codes: Array.isArray(parsed.codes) ? parsed.codes : [],
            works: Array.isArray(parsed.works) ? parsed.works : [],
            events: Array.isArray(parsed.events) ? parsed.events : [],
            nextCodeId: Number.isInteger(parsed.nextCodeId) ? parsed.nextCodeId : 1,
            nextWorkId: Number.isInteger(parsed.nextWorkId) ? parsed.nextWorkId : 1,
            nextEventId: Number.isInteger(parsed.nextEventId) ? parsed.nextEventId : 1
        };
    }

    function loadStore() {
        try {
            const raw = localStorage.getItem(STORE_KEY) || localStorage.getItem(LEGACY_STORE_KEY);
            if (!raw) {
                return createEmptyStore();
            }
            return normalizeStore(JSON.parse(raw));
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
            throw createError(401, "تسجيل دخول الأدمن مطلوب.");
        }
        return session;
    }

    function getCodeStatus(code) {
        const now = Date.now();
        if (!code.isActive) return "inactive";
        if (code.startsAt && new Date(code.startsAt).getTime() > now) return "scheduled";
        if (code.expiresAt && new Date(code.expiresAt).getTime() < now) return "expired";
        if (Number(code.remainingImages || 0) + Number(code.remainingVideos || 0) <= 0) return "consumed";
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
            title: work.title || work.prompt || "عمل جديد",
            prompt: work.originalPrompt || work.prompt,
            originalPrompt: work.originalPrompt || work.prompt,
            enhancedPrompt: work.enhancedPrompt || work.prompt,
            type: work.type,
            duration: work.duration || null,
            fileUrl: work.fileUrl,
            previewUrl: work.previewUrl,
            svgMarkup: work.svgMarkup || "",
            downloadName: work.downloadName || "",
            saved: work.saved,
            sourceWorkId: work.sourceWorkId || null,
            qualityLevel: work.qualityLevel || "enhanced",
            outputQuality: work.outputQuality || "high",
            qualityLabel: work.qualityLabel || "عالية",
            styleSuggestions: work.styleSuggestions || [],
            visualStyle: work.visualStyle || "realistic",
            styleLabel: work.styleLabel || "واقعي",
            timeOfDay: work.timeOfDay || "auto",
            timeOfDayLabel: work.timeOfDayLabel || "تلقائي",
            cameraAnglePreset: work.cameraAnglePreset || "medium",
            cameraAngleLabel: work.cameraAngleLabel || "متوسطة",
            sceneType: work.sceneType || "abstract",
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
            throw createError(404, "الكود غير موجود.");
        }
        return record;
    }

    function ensureCodeCanGenerate(code) {
        const status = getCodeStatus(code);
        if (status === "inactive") throw createError(403, "هذا الكود موقوف.");
        if (status === "scheduled") throw createError(403, "هذا الكود لم يبدأ بعد.");
        if (status === "expired") throw createError(403, "انتهت صلاحية هذا الكود.");
        if (status === "consumed") throw createError(409, "نفد الرصيد المتاح لهذا الكود.");
    }

    function extractKeywords(prompt) {
        const matches = (prompt.match(/[A-Za-z0-9\u0600-\u06FF]+/g) || []).map((word) => word.toLowerCase());
        return [...new Set(matches.filter((word) => word.length > 2))].slice(0, 10);
    }

    function slugify(value) {
        return normalizeText(value)
            .toLowerCase()
            .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 60) || "smart-credits-result";
    }

    function escapeXml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function pickTimeOfDay(prompt, requestedTime) {
        if (requestedTime === "day" || requestedTime === "night") {
            return requestedTime;
        }
        if (/night|ليل|مساء|نيون|moon|قمري/i.test(prompt)) return "night";
        if (/day|نهار|شمس|sun|morning|شمسي/i.test(prompt)) return "day";
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
        return value === "ultra"
            ? "ultra detailed, 4k export, premium finish"
            : value === "normal"
                ? "clean output, balanced detail"
                : "high quality, crisp lighting, polished details";
    }

    function detectSceneType(prompt) {
        const lower = prompt.toLowerCase();
        if (/car|سيارة|vehicle|luxury car/.test(lower)) return "car";
        if (/portrait|face|person|man|woman|رجل|امرأة|شخص/.test(lower)) return "portrait";
        if (/product|منتج|brand|اعلان|bottle|watch|perfume/.test(lower)) return "product";
        if (/tower|building|home|villa|house|مبنى|منزل|برج|عقار/.test(lower)) return "building";
        if (/food|burger|coffee|plate|restaurant|مطعم|قهوة|برجر|طعام/.test(lower)) return "food";
        if (/mountain|beach|sea|forest|desert|طبيعة|جبال|بحر|غابة|صحراء/.test(lower)) return "landscape";
        return "abstract";
    }

    function inferSubject(keywords, sceneType) {
        const labels = {
            car: "سيارة",
            portrait: "شخصية",
            product: "منتج",
            building: "مبنى",
            food: "طبق أو منتج غذائي",
            landscape: "مشهد طبيعي",
            abstract: keywords[0] || "المشهد"
        };
        return labels[sceneType] || keywords[0] || "المشهد";
    }

    function inferEnvironment(prompt, sceneType) {
        const labels = {
            car: "سيارة أو بيئة قيادة فاخرة",
            portrait: "مشهد شخصي أو جلسة تصوير",
            product: "عرض منتج احترافي",
            building: "مشهد معماري أو عقاري",
            food: "إخراج خاص بالمطاعم والمنتجات الغذائية",
            landscape: "بيئة خارجية طبيعية",
            abstract: /city|street|شارع|مدينة/.test(prompt.toLowerCase()) ? "مشهد حضري" : "بيئة إبداعية مخصصة"
        };
        return labels[sceneType] || "بيئة إبداعية مخصصة";
    }

    function buildPromptIntelligence(prompt, type, options) {
        const config = options || {};
        const keywords = extractKeywords(prompt);
        const isVideo = type === "video";
        const isShort = prompt.length < 40;
        const sceneType = detectSceneType(prompt);
        const finalTimeOfDay = pickTimeOfDay(prompt, config.timeOfDay);
        const styleKey = config.visualStyle || "realistic";
        const styleConfig = getStyleConfig(styleKey);
        const cameraAnglePreset = config.cameraAnglePreset || "medium";
        const outputQuality = config.outputQuality || "high";
        const subject = inferSubject(keywords, sceneType);
        const environment = inferEnvironment(prompt, sceneType);
        const timeOfDayLabel = getTimeLabel(finalTimeOfDay);
        const styleLabel = styleConfig.label;
        const cameraAngleLabel = getCameraLabel(cameraAnglePreset);
        const qualityLabel = getQualityLabel(outputQuality);
        const lighting = finalTimeOfDay === "night" ? styleConfig.lightingNight : styleConfig.lightingDay;
        const aspectRatio = isVideo ? "16:9" : cameraAnglePreset === "close" ? "4:5" : "1:1";
        const motionHint = isVideo
            ? "smooth camera motion, scene-aware pacing, refined movement arcs"
            : "single polished frame with export-ready composition";
        const title = `${subject} ${isVideo ? "فيديو" : "صورة"}`;
        const notes = [
            isShort ? "أضف مزيدًا من التفاصيل للخلفية والإضاءة للحصول على نتيجة أغنى." : "تم فهم الوصف وإعادة ترتيبه في Prompt أوضح.",
            `تم التعرف على نوع المشهد: ${environment}.`,
            config.timeOfDay === "auto" ? "تم اختيار الوقت الأنسب تلقائيًا حسب الوصف." : `تم تثبيت الوقت على ${timeOfDayLabel}.`
        ];

        return {
            originalPrompt: prompt,
            title,
            sceneType,
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
                environment,
                isVideo ? "text to video scene planning, controlled motion, consistent pacing" : "high resolution still image, export ready"
            ].join(", "),
            recommendedOutputCount: 1,
            downloadName: `${slugify(title)}-${styleKey}-${finalTimeOfDay}.svg`
        };
    }

    function renderSceneSvg(sceneType, palette, accent) {
        if (sceneType === "car") {
            return [
                `<rect x="250" y="510" width="520" height="90" rx="30" fill="${accent}" fill-opacity="0.72"/>`,
                `<rect x="360" y="455" width="250" height="72" rx="24" fill="rgba(255,255,255,0.28)"/>`,
                `<circle cx="360" cy="620" r="46" fill="#102a43"/>`,
                `<circle cx="660" cy="620" r="46" fill="#102a43"/>`
            ].join("");
        }
        if (sceneType === "portrait") {
            return [
                `<circle cx="520" cy="320" r="92" fill="rgba(255,255,255,0.82)"/>`,
                `<path d="M360 570 C390 455 650 455 680 570 L680 620 L360 620 Z" fill="${accent}" fill-opacity="0.72"/>`
            ].join("");
        }
        if (sceneType === "product") {
            return [
                `<ellipse cx="540" cy="620" rx="180" ry="34" fill="rgba(255,255,255,0.18)"/>`,
                `<rect x="430" y="320" width="220" height="260" rx="28" fill="rgba(255,255,255,0.86)"/>`,
                `<rect x="470" y="260" width="140" height="90" rx="24" fill="${accent}" fill-opacity="0.65"/>`
            ].join("");
        }
        if (sceneType === "building") {
            return [
                `<rect x="260" y="280" width="120" height="320" fill="${accent}" fill-opacity="0.66"/>`,
                `<rect x="410" y="220" width="150" height="380" fill="rgba(255,255,255,0.3)"/>`,
                `<rect x="590" y="170" width="160" height="430" fill="${palette[2]}" fill-opacity="0.68"/>`
            ].join("");
        }
        if (sceneType === "food") {
            return [
                `<ellipse cx="540" cy="610" rx="210" ry="42" fill="rgba(255,255,255,0.18)"/>`,
                `<path d="M390 520 C420 360 660 360 690 520 Z" fill="${accent}" fill-opacity="0.72"/>`,
                `<rect x="430" y="520" width="220" height="36" rx="18" fill="rgba(255,255,255,0.82)"/>`
            ].join("");
        }
        if (sceneType === "landscape") {
            return [
                `<path d="M150 620 L330 360 L480 560 L620 300 L860 620 Z" fill="${accent}" fill-opacity="0.68"/>`,
                `<path d="M80 620 L280 430 L470 620 Z" fill="rgba(255,255,255,0.28)"/>`
            ].join("");
        }
        return [
            `<circle cx="430" cy="380" r="150" fill="rgba(255,255,255,0.18)"/>`,
            `<rect x="360" y="280" width="360" height="240" rx="40" fill="${accent}" fill-opacity="0.52"/>`
        ].join("");
    }

    function buildMockAsset(prompt, type, intelligence) {
        const palette = intelligence.visualTheme?.palette || ["#f4d35e", "#ee964b", "#0d3b66"];
        const label = type === "video" ? "VIDEO PREVIEW" : "IMAGE PREVIEW";
        const safePrompt = escapeXml(prompt.length > 84 ? `${prompt.slice(0, 81)}...` : prompt);
        const accent = palette[1];
        const celestial = intelligence.timeOfDay === "night"
            ? `<circle cx="980" cy="160" r="72" fill="rgba(255,255,255,0.72)"/><circle cx="1010" cy="142" r="66" fill="${palette[0]}"/>`
            : `<circle cx="980" cy="160" r="82" fill="rgba(255,245,196,0.78)"/>`;
        const motionLines = type === "video"
            ? `<path d="M820 470 C930 420 1010 430 1090 410" stroke="rgba(255,255,255,0.4)" stroke-width="14" stroke-linecap="round" fill="none"/>
               <path d="M790 530 C900 480 990 490 1080 470" stroke="rgba(255,255,255,0.25)" stroke-width="10" stroke-linecap="round" fill="none"/>`
            : "";
        const svgMarkup = [
            `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">`,
            `<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">`,
            `<stop offset="0%" stop-color="${palette[0]}"/>`,
            `<stop offset="50%" stop-color="${palette[1]}"/>`,
            `<stop offset="100%" stop-color="${palette[2]}"/>`,
            `</linearGradient></defs>`,
            `<rect width="1200" height="900" fill="url(#g)"/>`,
            celestial,
            `<rect x="86" y="96" width="1028" height="640" rx="38" fill="rgba(8,18,32,0.28)" stroke="rgba(255,255,255,0.22)"/>`,
            renderSceneSvg(intelligence.sceneType, palette, accent),
            motionLines,
            `<rect x="90" y="760" width="1020" height="96" rx="26" fill="rgba(255,255,255,0.14)"/>`,
            `<text x="130" y="182" fill="#ffffff" font-size="54" font-family="Arial" font-weight="700">${escapeXml(intelligence.title)}</text>`,
            `<text x="130" y="240" fill="#ffffff" font-size="26" font-family="Arial">${label}</text>`,
            `<text x="130" y="795" fill="#ffffff" font-size="24" font-family="Arial">${escapeXml(intelligence.styleLabel)} | ${escapeXml(intelligence.timeOfDayLabel)} | ${escapeXml(intelligence.qualityLabel)} | ${escapeXml(intelligence.cameraAngleLabel)}</text>`,
            `<text x="130" y="832" fill="#ffffff" font-size="20" font-family="Arial">${safePrompt}</text>`,
            `</svg>`
        ].join("");

        return {
            svgMarkup,
            previewUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`,
            downloadName: intelligence.downloadName
        };
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
                throw createError(401, "بيانات دخول الأدمن غير صحيحة.");
            }
            if (DEFAULT_ADMIN.securityCode && securityCode !== DEFAULT_ADMIN.securityCode) {
                throw createError(401, "كود الأمان غير صحيح.");
            }
            const token = `local-admin-${Date.now()}`;
            setAdminSession({ token, username, createdAt: nowIso() });
            return { success: true, data: { token, username, securityCodeRequired: false } };
        }

        if (pathname === "/api/admin/session" && method === "GET") {
            return { success: true, data: requireAdmin(headers) };
        }

        if (pathname === "/api/admin/logout" && method === "POST") {
            requireAdmin(headers);
            clearAdminSession();
            return { success: true, message: "تم تسجيل خروج الأدمن." };
        }

        if (pathname === "/api/admin/codes" && method === "GET") {
            requireAdmin(headers);
            return { success: true, data: { codes: store.codes.map((code) => serializeCode(store, code)) } };
        }

        if (pathname === "/api/admin/codes" && method === "POST") {
            const session = requireAdmin(headers);
            const codeValue = normalizeCode(body.code);
            if (store.codes.some((item) => item.code === codeValue)) {
                throw createError(409, "هذا الكود موجود مسبقًا.");
            }
            const maxImages = Number(body.maxImages || 0);
            const maxVideos = Number(body.maxVideos || 0);
            if (maxImages + maxVideos <= 0) {
                throw createError(400, "لا بد من توفير رصيد صورة أو فيديو واحد على الأقل.");
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
            return {
                success: true,
                data: {
                    code: serializeCode(store, code),
                    works: store.works.filter((work) => work.codeId === code.id).map(serializeWork),
                    activity: store.events.filter((event) => event.codeId === code.id).map(serializeEvent)
                }
            };
        }

        if (adminCodeMatch && method === "PATCH") {
            requireAdmin(headers);
            const code = findCode(store, decodeURIComponent(adminCodeMatch[1]));
            if (body.isActive !== undefined) {
                code.isActive = Boolean(body.isActive);
            }
            code.updatedAt = nowIso();
            addEvent(store, code, "code-updated", "تم تحديث حالة الكود.", {});
            saveStore(store);
            return { success: true, data: { code: serializeCode(store, code) } };
        }

        if (pathname === "/api/codes/lookup" && method === "POST") {
            const code = findCode(store, body.code || body.userCode);
            return {
                success: true,
                data: {
                    code: serializeCode(store, code),
                    works: code.allowSave ? store.works.filter((work) => work.codeId === code.id).map(serializeWork) : []
                }
            };
        }

        const activityMatch = pathname.match(/^\/api\/codes\/([^/]+)\/activity$/);
        if (activityMatch && method === "GET") {
            const code = findCode(store, decodeURIComponent(activityMatch[1]));
            return {
                success: true,
                data: { activity: store.events.filter((event) => event.codeId === code.id).map(serializeEvent) }
            };
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
                throw createError(400, "الوصف مطلوب.");
            }

            if (type === "image") {
                if (code.remainingImages <= 0) throw createError(409, "لا يوجد رصيد صور متبقٍ.");
                code.remainingImages -= 1;
            } else {
                const duration = Number(body.duration || 0);
                if (code.remainingVideos <= 0) throw createError(409, "لا يوجد رصيد فيديو متبقٍ.");
                if (!(code.allowedDurations || []).includes(duration)) throw createError(400, "المدة المحددة غير مسموحة لهذا الكود.");
                code.remainingVideos -= 1;
            }

            const intelligence = buildPromptIntelligence(prompt, type, {
                timeOfDay: normalizeText(body.timeOfDay || "auto").toLowerCase(),
                visualStyle: normalizeText(body.visualStyle || "realistic").toLowerCase(),
                cameraAnglePreset: normalizeText(body.cameraAnglePreset || "medium").toLowerCase(),
                outputQuality: normalizeText(body.outputQuality || "high").toLowerCase()
            });
            const asset = buildMockAsset(prompt, type, intelligence);
            const work = {
                id: store.nextWorkId++,
                codeId: code.id,
                code: code.code,
                title: intelligence.title,
                prompt,
                originalPrompt: prompt,
                enhancedPrompt: intelligence.enhancedPrompt,
                type,
                duration: type === "video" ? Number(body.duration || 0) : null,
                fileUrl: asset.previewUrl,
                previewUrl: asset.previewUrl,
                svgMarkup: asset.svgMarkup,
                downloadName: asset.downloadName,
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
                sceneType: intelligence.sceneType,
                processingPriority: code.processingPriority || "normal",
                createdAt: nowIso()
            };

            store.works.unshift(work);
            code.updatedAt = nowIso();
            addEvent(store, code, "content-generated", `تم إنشاء ${type === "video" ? "فيديو" : "صورة"} جديدة بعنوان "${intelligence.title}".`, {
                type,
                title: intelligence.title
            });
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

        throw createError(404, "المسار غير موجود.");
    }

    async function fallbackFetch(input, init = {}) {
        const url = typeof input === "string" ? input : input.url;
        const parsed = new URL(url, window.location.href);
        if (!parsed.pathname.startsWith("/api/")) {
            return window.__creditsOriginalFetch(input, init);
        }

        try {
            const payload = await handleRequest(url, init || {});
            return new Response(JSON.stringify(payload), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        } catch (error) {
            return new Response(JSON.stringify({
                success: false,
                message: error.message || "حدث خطأ محلي غير متوقع."
            }), {
                status: error.status || 500,
                headers: { "Content-Type": "application/json" }
            });
        }
    }

    window.__creditsOriginalFetch = window.fetch.bind(window);
    window.fetch = fallbackFetch;
})();

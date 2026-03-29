(function () {
    const STORE_KEY = "credits_platform_store_v4";
    const LEGACY_KEYS = ["credits_platform_store_v3", "credits_platform_store_v2"];
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
        const safe = parsed || {};
        return {
            codes: Array.isArray(safe.codes) ? safe.codes : [],
            works: Array.isArray(safe.works) ? safe.works : [],
            events: Array.isArray(safe.events) ? safe.events : [],
            nextCodeId: Number.isInteger(safe.nextCodeId) ? safe.nextCodeId : 1,
            nextWorkId: Number.isInteger(safe.nextWorkId) ? safe.nextWorkId : 1,
            nextEventId: Number.isInteger(safe.nextEventId) ? safe.nextEventId : 1
        };
    }

    function loadStore() {
        try {
            const keys = [STORE_KEY, ...LEGACY_KEYS];
            const existing = keys.map((key) => localStorage.getItem(key)).find(Boolean);
            if (!existing) {
                return createEmptyStore();
            }
            return normalizeStore(JSON.parse(existing));
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
            extracted: work.extracted || null,
            autoCompleted: work.autoCompleted || [],
            variationIndex: work.variationIndex || 0,
            variationCount: work.variationCount || 1,
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
        const normalized = normalizeCode(codeValue);
        const record = store.codes.find((item) => item.code === normalized);
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
        return [...new Set(matches.filter((word) => word.length > 2))].slice(0, 12);
    }

    function slugify(value) {
        return normalizeText(value)
            .toLowerCase()
            .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 64) || "smart-credits-result";
    }

    function pickTimeOfDay(prompt, requestedTime) {
        if (requestedTime === "day" || requestedTime === "night") {
            return requestedTime;
        }
        if (/night|ليل|مساء|نيون|moon|قمري/.test(prompt.toLowerCase())) return "night";
        if (/day|نهار|شمس|sun|morning|شمسي/.test(prompt.toLowerCase())) return "day";
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
        if (value === "ultra") return "ultra detailed, 4k export, premium finish";
        if (value === "normal") return "clean output, balanced detail";
        return "high quality, crisp lighting, polished details";
    }

    function detectSceneType(prompt) {
        const lower = prompt.toLowerCase();
        if (/car|vehicle|luxury car|drive|driving|سيارة|مركبة|قيادة/.test(lower)) return "car";
        if (/product|brand|bottle|watch|perfume|منتج|إعلان|براند|ساعة|عطر/.test(lower)) return "product";
        if (/tower|building|villa|house|office|مبنى|برج|عقار|مكتب|فيلا|منزل/.test(lower)) return "building";
        if (/food|burger|coffee|plate|restaurant|مطعم|قهوة|برجر|طعام/.test(lower)) return "food";
        if (/mountain|beach|sea|forest|desert|طبيعة|جبال|بحر|غابة|صحراء/.test(lower)) return "landscape";
        if (/person|man|woman|businessman|portrait|face|رجل|امرأة|شخص|بورتريه|وجه|أعمال/.test(lower)) return "portrait";
        return "abstract";
    }

    function inferSubject(keywords, sceneType, prompt) {
        const lower = prompt.toLowerCase();
        if (/businessman|رجل أعمال|رجل اعمال/.test(lower)) return "رجل أعمال";
        if (/woman|امرأة/.test(lower)) return "امرأة";
        if (/(^| )man( |$)|رجل/.test(lower)) return "رجل";
        if (/car|vehicle|سيارة/.test(lower) && sceneType === "car") return "سيارة فاخرة";
        const labels = {
            car: "سيارة فاخرة",
            portrait: "شخصية رئيسية",
            product: "منتج",
            building: "مبنى",
            food: "طبق احترافي",
            landscape: "مشهد طبيعي",
            abstract: keywords[0] || "المشهد"
        };
        return labels[sceneType] || keywords[0] || "المشهد";
    }

    function detectAction(prompt, sceneType) {
        const lower = prompt.toLowerCase();
        if (/run|running|يجري|يركض|سريع/.test(lower)) {
            return {
                key: "running",
                label: "يجري",
                prompt: "running fast, dynamic body posture, subtle motion blur, energetic movement"
            };
        }
        if (/sit|sitting|يجلس|جالس/.test(lower)) {
            return {
                key: "sitting",
                label: "يجلس",
                prompt: "seated posture, composed pose, confident body language"
            };
        }
        if (/drive|driving|يقود|قيادة/.test(lower) || sceneType === "car") {
            return {
                key: "driving",
                label: "يقود",
                prompt: "driving a premium vehicle, focused expression, realistic interior reflections"
            };
        }
        if (/walk|walking|يمشي/.test(lower)) {
            return {
                key: "walking",
                label: "يمشي",
                prompt: "walking naturally, confident movement, grounded pacing"
            };
        }
        if (/stand|standing|يقف|واقف/.test(lower)) {
            return {
                key: "standing",
                label: "يقف",
                prompt: "hero standing pose, balanced posture, clear subject focus"
            };
        }
        return {
            key: sceneType === "product" ? "display" : "hero",
            label: sceneType === "product" ? "يعرض" : "وضعية رئيسية",
            prompt: sceneType === "product"
                ? "premium product display, centered hero composition"
                : "hero subject pose, deliberate composition, refined presence"
        };
    }

    function inferPlace(prompt, sceneType, actionKey) {
        const lower = prompt.toLowerCase();
        if (/street|city|road|شارع|مدينة|طريق/.test(lower)) return "شارع حضري حديث";
        if (/office|desk|meeting|مكتب|شركة|اجتماع/.test(lower)) return "مكتب احترافي فاخر";
        if (/corridor|hallway|ممر/.test(lower)) return "ممر داخلي أنيق";
        if (/car|vehicle|سيارة/.test(lower)) return "داخل سيارة فاخرة";
        if (/restaurant|cafe|مطعم|مقهى/.test(lower)) return "مساحة ضيافة راقية";
        if (/studio|استوديو/.test(lower)) return "استوديو نظيف بإضاءة مضبوطة";
        if (/beach|sea|بحر|شاطئ/.test(lower)) return "واجهة بحرية مفتوحة";
        if (/mountain|جبال|جبل/.test(lower)) return "خلفية جبلية واسعة";

        if (sceneType === "car") return actionKey === "driving" ? "طريق مدينة حديث" : "مساحة عرض سيارات فاخرة";
        if (sceneType === "portrait") return actionKey === "running" ? "شارع حضري حديث" : "جلسة تصوير احترافية";
        if (sceneType === "product") return "استوديو إعلاني نظيف";
        if (sceneType === "building") return "محيط معماري فاخر";
        if (sceneType === "food") return "طاولة مطعم أنيقة";
        if (sceneType === "landscape") return "مشهد خارجي واسع";
        return actionKey === "running" ? "شارع حضري حديث" : "بيئة إبداعية مخصصة";
    }

    function inferAppearance(prompt, subject, sceneType) {
        const lower = prompt.toLowerCase();
        if (/businessman|رجل أعمال|رجل اعمال/.test(lower)) return "بدلة رسمية مفصلة بعناية ومظهر فاخر";
        if (/formal|رسمي|بدلة/.test(lower)) return "إطلالة رسمية أنيقة";
        if (/luxury|فاخر|فخمة/.test(lower)) return "تفاصيل فاخرة وملمس premium";
        if (/sport|رياضي/.test(lower)) return "إطلالة رياضية عملية";
        if (sceneType === "product") return "خامات نظيفة ولمعان احترافي";
        if (sceneType === "portrait") return `${subject} بمظهر احترافي واضح`;
        return "تفاصيل متوازنة ومظهر واضح";
    }

    function inferMood(prompt, styleConfig, sceneType) {
        const lower = prompt.toLowerCase();
        if (/luxury|فاخر|فخمة|premium/.test(lower)) return "فاخر";
        if (/fast|speed|يجري|يركض|dynamic|حركة/.test(lower)) return "ديناميكي";
        if (/tense|متوتر|serious|جدي/.test(lower)) return "متوتر";
        if (/calm|هادئ|soft/.test(lower)) return "هادئ";
        if (sceneType === "product") return "إعلاني نظيف";
        return styleConfig.mood;
    }

    function inferShotType(prompt, styleKey, cameraAnglePreset) {
        const lower = prompt.toLowerCase();
        if (/ad|advert|commercial|إعلان|إعلاني/.test(lower) || styleKey === "commercial") return "إعلاني";
        if (/cinematic|سينمائي/.test(lower) || styleKey === "cinematic") return "سينمائي";
        if (/realistic|واقعي/.test(lower) || styleKey === "realistic") return "واقعي";
        if (/anime|أنمي/.test(lower) || styleKey === "anime") return "أنمي";
        if (cameraAnglePreset === "wide") return "سينمائي";
        return "واقعي";
    }

    function translatePlaceToEnglish(place) {
        const map = {
            "شارع حضري حديث": "modern city street",
            "مكتب احترافي فاخر": "luxury executive office",
            "ممر داخلي أنيق": "elegant interior corridor",
            "داخل سيارة فاخرة": "inside a premium car",
            "طريق مدينة حديث": "modern city road",
            "استوديو إعلاني نظيف": "clean commercial studio",
            "جلسة تصوير احترافية": "professional portrait setup",
            "محيط معماري فاخر": "premium architectural environment",
            "طاولة مطعم أنيقة": "elegant restaurant table",
            "مشهد خارجي واسع": "wide outdoor environment",
            "بيئة إبداعية مخصصة": "custom premium environment",
            "واجهة بحرية مفتوحة": "open beach front",
            "خلفية جبلية واسعة": "wide mountain backdrop",
            "مساحة عرض سيارات فاخرة": "luxury car display environment",
            "مساحة ضيافة راقية": "premium hospitality environment"
        };
        return map[place] || place;
    }

    function translateAppearanceToEnglish(appearance) {
        const map = {
            "بدلة رسمية مفصلة بعناية ومظهر فاخر": "tailored formal suit, premium luxury styling",
            "إطلالة رسمية أنيقة": "elegant formal appearance",
            "تفاصيل فاخرة وملمس premium": "luxury details, premium finish",
            "إطلالة رياضية عملية": "practical sporty styling",
            "خامات نظيفة ولمعان احترافي": "clean premium materials, polished highlights",
            "تفاصيل متوازنة ومظهر واضح": "balanced details, clean clear styling"
        };
        return map[appearance] || appearance;
    }

    function buildPromptIntelligence(prompt, type, options = {}) {
        const keywords = extractKeywords(prompt);
        const isVideo = type === "video";
        const isShort = prompt.length < 40;
        const sceneType = detectSceneType(prompt);
        const styleKey = options.visualStyle || "realistic";
        const styleConfig = getStyleConfig(styleKey);
        const cameraAnglePreset = options.cameraAnglePreset || "medium";
        const outputQuality = options.outputQuality || "high";
        const timeOfDay = pickTimeOfDay(prompt, options.timeOfDay || "auto");
        const timeOfDayLabel = getTimeLabel(timeOfDay);
        const action = detectAction(prompt, sceneType);
        const subject = inferSubject(keywords, sceneType, prompt);
        const place = inferPlace(prompt, sceneType, action.key);
        const appearance = inferAppearance(prompt, subject, sceneType);
        const mood = inferMood(prompt, styleConfig, sceneType);
        const shotType = inferShotType(prompt, styleKey, cameraAnglePreset);
        const styleLabel = styleConfig.label;
        const cameraAngleLabel = getCameraLabel(cameraAnglePreset);
        const qualityLabel = getQualityLabel(outputQuality);
        const lighting = timeOfDay === "night" ? styleConfig.lightingNight : styleConfig.lightingDay;
        const aspectRatio = isVideo ? "16:9" : cameraAnglePreset === "close" ? "4:5" : cameraAnglePreset === "wide" ? "16:10" : "1:1";
        const motionHint = isVideo
            ? `${action.prompt}, smooth camera motion, scene-aware pacing, controlled movement`
            : action.key === "running"
                ? "dynamic still frame, subtle motion blur, premium export clarity"
                : "single polished frame with export-ready composition";
        const autoCompleted = [];
        const lower = prompt.toLowerCase();

        if (!/street|city|road|office|desk|meeting|car|vehicle|restaurant|studio|beach|sea|mountain|شارع|مدينة|طريق|مكتب|سيارة|مطعم|استوديو|بحر|جبل/.test(lower)) {
            autoCompleted.push(`أكمل النظام المكان إلى: ${place}`);
        }
        if (!/formal|suit|luxury|sport|رسمي|بدلة|فاخر|رياضي/.test(lower) && sceneType !== "product") {
            autoCompleted.push(`أضاف النظام المظهر إلى: ${appearance}`);
        }
        if (!/run|running|يجري|يركض|sit|sitting|يجلس|drive|driving|يقود|walk|walking|يمشي|stand|standing|يقف|واقف/.test(lower)) {
            autoCompleted.push(`استنتج النظام الفعل إلى: ${action.label}`);
        }
        if ((options.timeOfDay || "auto") === "auto") {
            autoCompleted.push(`حدد النظام الوقت الأنسب إلى: ${timeOfDayLabel}`);
        }
        if (!/cinematic|سينمائي|realistic|واقعي|anime|أنمي|commercial|إعلاني|advert/.test(lower)) {
            autoCompleted.push(`حدد النظام نوع اللقطة إلى: ${shotType}`);
        }

        return {
            originalPrompt: prompt,
            title: `${subject} ${isVideo ? "فيديو" : "صورة"}`,
            sceneType,
            keywords,
            subject,
            character: subject,
            action: action.label,
            actionKey: action.key,
            place,
            environment: place,
            appearance,
            shotType,
            suggestedStyles: [styleLabel, shotType],
            styleLabel,
            visualStyle: styleKey,
            qualityLevel: isShort ? "needs-detail" : "enhanced",
            qualityLabel,
            outputQuality,
            aspectRatio,
            cameraAngle: getCameraDescription(cameraAnglePreset),
            cameraAnglePreset,
            cameraAngleLabel,
            timeOfDay,
            timeOfDayLabel,
            motionHint,
            lighting,
            mood,
            autoCompleted,
            extracted: {
                who: subject,
                action: action.label,
                where: place,
                when: timeOfDayLabel,
                look: appearance,
                shotType
            },
            notes: [
                isShort
                    ? "الوصف كان مختصرًا، لذلك أضاف النظام تفاصيل منطقية قبل إنشاء النتيجة."
                    : "تم تفكيك الوصف إلى عناصر مشهد ثم إعادة بنائه بصيغة تصويرية أوضح.",
                `العنصر الرئيسي: ${subject}، الفعل: ${action.label}، المكان: ${place}.`,
                `الإضاءة النهائية: ${lighting}.`,
                `الإخراج النهائي: ${shotType}، الزاوية: ${cameraAngleLabel}، الجودة: ${qualityLabel}.`
            ],
            visualTheme: {
                style: styleKey,
                palette: timeOfDay === "night" ? styleConfig.paletteNight : styleConfig.paletteDay
            },
            enhancedPrompt: [
                `A ${shotType.toLowerCase()} ${subject === "رجل أعمال" ? "businessman" : sceneType === "product" ? "premium product hero" : "main subject"}`,
                action.prompt,
                `in ${translatePlaceToEnglish(place)}`,
                translateAppearanceToEnglish(appearance),
                lighting,
                getCameraDescription(cameraAnglePreset),
                getQualityDescription(outputQuality),
                mood === "فاخر" ? "luxury mood" : mood === "ديناميكي" ? "dynamic mood" : `${shotType.toLowerCase()} mood`,
                timeOfDay === "night" ? "night atmosphere" : "daylight atmosphere",
                styleConfig.prompt,
                isVideo
                    ? "text to video scene planning, temporal consistency, controlled motion"
                    : "high resolution still image, premium export ready"
            ].join(", "),
            recommendedOutputCount: isVideo ? 1 : 3,
            downloadName: `${slugify(subject)}-${styleKey}-${timeOfDay}.svg`
        };
    }

    function renderEnvironmentSvg(intelligence, palette, variationOffset) {
        const offset = variationOffset * 26;
        if (intelligence.sceneType === "building" || intelligence.place.includes("مكتب")) {
            return [
                `<rect x="${170 + offset}" y="250" width="160" height="390" fill="${palette[2]}" fill-opacity="0.44"/>`,
                `<rect x="${360 + offset}" y="180" width="200" height="460" fill="rgba(255,255,255,0.18)"/>`,
                `<rect x="${610 + offset}" y="230" width="180" height="410" fill="${palette[1]}" fill-opacity="0.3"/>`
            ].join("");
        }
        if (intelligence.sceneType === "landscape") {
            return [
                `<path d="M110 660 L300 400 L460 560 L680 330 L930 660 Z" fill="${palette[2]}" fill-opacity="0.42"/>`,
                `<path d="M70 660 L280 470 L470 660 Z" fill="rgba(255,255,255,0.18)"/>`
            ].join("");
        }
        if (intelligence.sceneType === "product" || intelligence.sceneType === "food") {
            return `<ellipse cx="600" cy="700" rx="320" ry="64" fill="rgba(255,255,255,0.12)"/>`;
        }
        return [
            `<rect x="0" y="620" width="1200" height="280" fill="rgba(11,25,40,0.16)"/>`,
            `<rect x="${120 + offset}" y="340" width="120" height="240" fill="rgba(255,255,255,0.08)"/>`,
            `<rect x="${280 + offset}" y="280" width="150" height="300" fill="${palette[2]}" fill-opacity="0.18"/>`,
            `<rect x="${470 + offset}" y="360" width="120" height="220" fill="rgba(255,255,255,0.08)"/>`,
            `<rect x="${640 + offset}" y="240" width="180" height="340" fill="${palette[1]}" fill-opacity="0.14"/>`
        ].join("");
    }

    function renderHumanFigure(actionKey, variationOffset, accent) {
        const bodyX = 540 + variationOffset * 28 + (actionKey === "running" ? -34 : 0);
        const armSpread = actionKey === "running" ? 86 : actionKey === "walking" ? 62 : 48;
        const legSpread = actionKey === "running" ? 74 : actionKey === "walking" ? 48 : 28;
        const torsoTilt = actionKey === "running" ? -24 : actionKey === "walking" ? -10 : 0;
        const rightArmRotate = actionKey === "running" ? 42 : actionKey === "walking" ? 24 : 12;
        const leftArmRotate = actionKey === "running" ? -36 : actionKey === "walking" ? -22 : -12;
        const rightLegRotate = actionKey === "running" ? 26 : actionKey === "walking" ? 12 : 5;
        const leftLegRotate = actionKey === "running" ? -18 : actionKey === "walking" ? -10 : -3;
        const motionLines = actionKey === "running" || actionKey === "walking"
            ? `<path d="M250 500 C340 470 420 450 ${bodyX - 160} 430" stroke="rgba(255,255,255,0.24)" stroke-width="14" stroke-linecap="round" fill="none"/>
               <path d="M250 560 C340 530 420 520 ${bodyX - 150} 510" stroke="rgba(255,255,255,0.14)" stroke-width="10" stroke-linecap="round" fill="none"/>`
            : "";

        return [
            `<g transform="translate(${bodyX} 0) rotate(${torsoTilt} 600 470)">`,
            `<circle cx="600" cy="300" r="72" fill="rgba(255,255,255,0.84)"/>`,
            `<rect x="548" y="372" width="104" height="220" rx="42" fill="${accent}" fill-opacity="0.8"/>`,
            `<rect x="${600 - armSpread}" y="402" width="34" height="150" rx="16" fill="rgba(255,255,255,0.72)" transform="rotate(${leftArmRotate} 600 430)"/>`,
            `<rect x="${572 + armSpread / 2}" y="402" width="34" height="150" rx="16" fill="rgba(255,255,255,0.72)" transform="rotate(${rightArmRotate} 600 430)"/>`,
            `<rect x="${564 - legSpread / 2}" y="572" width="32" height="190" rx="16" fill="#102a43" transform="rotate(${leftLegRotate} 600 590)"/>`,
            `<rect x="${604 + legSpread / 2}" y="572" width="32" height="190" rx="16" fill="#102a43" transform="rotate(${rightLegRotate} 600 590)"/>`,
            `</g>`,
            motionLines
        ].join("");
    }

    function renderSubjectSvg(intelligence, palette, variationOffset) {
        const accent = palette[1];
        if (intelligence.sceneType === "car" || intelligence.actionKey === "driving") {
            const offset = variationOffset * 12;
            return [
                `<rect x="${230 + offset}" y="545" width="580" height="96" rx="36" fill="${accent}" fill-opacity="0.78"/>`,
                `<rect x="${350 + offset}" y="475" width="260" height="88" rx="28" fill="rgba(255,255,255,0.26)"/>`,
                `<circle cx="${340 + offset}" cy="655" r="50" fill="#102a43"/>`,
                `<circle cx="${680 + offset}" cy="655" r="50" fill="#102a43"/>`,
                `<circle cx="${470 + offset}" cy="448" r="26" fill="rgba(255,255,255,0.34)"/>`
            ].join("");
        }
        if (intelligence.sceneType === "product") {
            const offset = variationOffset * 10;
            return [
                `<rect x="${440 + offset}" y="300" width="220" height="300" rx="40" fill="rgba(255,255,255,0.86)"/>`,
                `<rect x="${485 + offset}" y="240" width="130" height="92" rx="24" fill="${accent}" fill-opacity="0.66"/>`,
                `<rect x="${505 + offset}" y="360" width="90" height="170" rx="16" fill="${palette[2]}" fill-opacity="0.26"/>`
            ].join("");
        }
        if (intelligence.sceneType === "food") {
            const center = 560 + variationOffset * 34;
            return [
                `<ellipse cx="${center}" cy="640" rx="210" ry="56" fill="rgba(255,255,255,0.78)"/>`,
                `<path d="M${center - 150} 590 C${center - 120} 430 ${center + 120} 430 ${center + 150} 590 Z" fill="${accent}" fill-opacity="0.72"/>`,
                `<ellipse cx="${center}" cy="540" rx="120" ry="44" fill="rgba(255,255,255,0.2)"/>`
            ].join("");
        }
        return renderHumanFigure(intelligence.actionKey, variationOffset, accent);
    }

    function buildMockAsset(prompt, type, intelligence, options = {}) {
        const palette = intelligence.visualTheme?.palette || ["#f4d35e", "#ee964b", "#0d3b66"];
        const variationIndex = Number(options.variationIndex || 0);
        const celestial = intelligence.timeOfDay === "night"
            ? `<circle cx="${980 - variationIndex * 18}" cy="160" r="74" fill="rgba(255,255,255,0.68)"/><circle cx="${1008 - variationIndex * 18}" cy="142" r="66" fill="${palette[0]}"/>`
            : `<circle cx="${970 - variationIndex * 18}" cy="168" r="86" fill="rgba(255,245,196,0.82)"/>`;
        const motionLines = type === "video"
            ? `<path d="M760 490 C860 430 970 440 1090 400" stroke="rgba(255,255,255,0.28)" stroke-width="16" stroke-linecap="round" fill="none"/>
               <path d="M760 560 C880 500 980 505 1080 470" stroke="rgba(255,255,255,0.16)" stroke-width="10" stroke-linecap="round" fill="none"/>`
            : "";
        const svgMarkup = [
            `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">`,
            `<defs><linearGradient id="g-${variationIndex}" x1="0%" y1="0%" x2="100%" y2="100%">`,
            `<stop offset="0%" stop-color="${palette[0]}"/>`,
            `<stop offset="50%" stop-color="${palette[1]}"/>`,
            `<stop offset="100%" stop-color="${palette[2]}"/>`,
            `</linearGradient></defs>`,
            `<rect width="1200" height="900" fill="url(#g-${variationIndex})"/>`,
            celestial,
            `<rect x="70" y="88" width="1060" height="700" rx="42" fill="rgba(8,18,32,0.18)" stroke="rgba(255,255,255,0.16)"/>`,
            renderEnvironmentSvg(intelligence, palette, variationIndex),
            renderSubjectSvg(intelligence, palette, variationIndex),
            motionLines,
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

        if (pathname === "/api/gemini" && method === "POST") {
            const prompt = normalizeText(body.prompt);
            if (!prompt) {
                throw createError(400, "الوصف مطلوب.");
            }

            const intelligence = buildPromptIntelligence(prompt, normalizeText(body.type || "image").toLowerCase(), {
                timeOfDay: normalizeText(body.timeOfDay || "auto").toLowerCase(),
                visualStyle: normalizeText(body.visualStyle || "realistic").toLowerCase(),
                cameraAnglePreset: normalizeText(body.cameraAnglePreset || "medium").toLowerCase(),
                outputQuality: normalizeText(body.outputQuality || "high").toLowerCase()
            });

            return {
                success: true,
                prompt: intelligence.enhancedPrompt,
                source: "local-intelligence"
            };
        }

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
            const originalPrompt = normalizeText(body.originalPrompt) || prompt;
            if (!prompt) {
                throw createError(400, "الوصف مطلوب.");
            }

            const variations = Math.max(1, Math.min(type === "image" ? Number(body.variations || 1) : 1, 3));
            if (type === "image") {
                if (code.remainingImages < variations) {
                    throw createError(409, variations > 1 ? "الرصيد الحالي لا يكفي لإنشاء 3 نتائج." : "لا يوجد رصيد صور متبقٍ.");
                }
                code.remainingImages -= variations;
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

            const createdWorks = [];
            for (let index = 0; index < variations; index += 1) {
                const variationIntelligence = {
                    ...intelligence,
                    title: variations > 1
                        ? `${intelligence.subject} ${type === "video" ? "فيديو" : "صورة"} - نسخة ${index + 1}`
                        : intelligence.title,
                    downloadName: `${slugify(intelligence.subject)}-${intelligence.visualStyle}-${intelligence.timeOfDay}-${index + 1}.svg`
                };
                const asset = buildMockAsset(prompt, type, variationIntelligence, { variationIndex: index });
                const work = {
                    id: store.nextWorkId++,
                    codeId: code.id,
                    code: code.code,
                    title: variationIntelligence.title,
                    prompt: originalPrompt,
                    originalPrompt,
                    enhancedPrompt: variationIntelligence.enhancedPrompt,
                    type,
                    duration: type === "video" ? Number(body.duration || 0) : null,
                    fileUrl: asset.previewUrl,
                    previewUrl: asset.previewUrl,
                    svgMarkup: asset.svgMarkup,
                    downloadName: asset.downloadName,
                    saved: Boolean(code.allowSave),
                    sourceWorkId: null,
                    qualityLevel: variationIntelligence.qualityLevel,
                    outputQuality: variationIntelligence.outputQuality,
                    qualityLabel: variationIntelligence.qualityLabel,
                    styleSuggestions: variationIntelligence.suggestedStyles,
                    visualStyle: variationIntelligence.visualStyle,
                    styleLabel: variationIntelligence.styleLabel,
                    timeOfDay: variationIntelligence.timeOfDay,
                    timeOfDayLabel: variationIntelligence.timeOfDayLabel,
                    cameraAnglePreset: variationIntelligence.cameraAnglePreset,
                    cameraAngleLabel: variationIntelligence.cameraAngleLabel,
                    sceneType: variationIntelligence.sceneType,
                    extracted: variationIntelligence.extracted,
                    autoCompleted: variationIntelligence.autoCompleted,
                    processingPriority: code.processingPriority || "normal",
                    variationIndex: index,
                    variationCount: variations,
                    createdAt: nowIso()
                };
                createdWorks.unshift(work);
                store.works.unshift(work);
            }

            code.updatedAt = nowIso();
            addEvent(
                store,
                code,
                "content-generated",
                variations > 1
                    ? `تم إنشاء ${variations} نتائج ${type === "video" ? "فيديو" : "صور"} بعنوان "${intelligence.subject}".`
                    : `تم إنشاء ${type === "video" ? "فيديو" : "صورة"} جديدة بعنوان "${intelligence.subject}".`,
                { type, title: intelligence.subject, variations }
            );
            saveStore(store);

            return {
                success: true,
                data: {
                    code: serializeCode(store, code),
                    work: serializeWork(createdWorks[0]),
                    works: createdWorks.map(serializeWork),
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
            const liveResponse = await window.__creditsOriginalFetch(input, init);
            const contentType = (liveResponse.headers.get("content-type") || "").toLowerCase();
            const isJsonApi = contentType.includes("application/json");
            const isStaticNotFound = (liveResponse.status === 404 || liveResponse.status === 405) && !isJsonApi;

            if (!isStaticNotFound) {
                return liveResponse;
            }
        } catch (error) {
            // Fall back to local storage mode when there is no reachable backend.
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

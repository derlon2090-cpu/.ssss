const adminTokenKey = "creditsAdminToken";

const controlLabels = {
    timeOfDay: { auto: "تلقائي", day: "نهار", night: "ليل" },
    visualStyle: { realistic: "واقعي", cinematic: "سينمائي", commercial: "إعلاني", anime: "أنمي" },
    cameraAnglePreset: { close: "قريبة", medium: "متوسطة", wide: "واسعة" },
    outputQuality: { normal: "عادية", high: "عالية", ultra: "فائقة" }
};

const studioState = {
    code: null,
    meta: null,
    works: [],
    activity: [],
    workFilter: "all",
    adminToken: localStorage.getItem(adminTokenKey) || "",
    adminCodes: [],
    adminFilter: "all",
    adminSearch: "",
    selectedAdminCode: null,
    controls: {
        timeOfDay: "auto",
        visualStyle: "realistic",
        cameraAnglePreset: "medium",
        outputQuality: "high"
    },
    lastPayload: null,
    lastIntelligence: null,
    latestBatch: [],
    loadingTimer: null
};

const studioElements = {
    codeSummary: document.getElementById("code-summary"),
    headerCodeBadge: document.getElementById("header-code-badge"),
    createBalance: document.getElementById("create-balance"),
    message: document.getElementById("studio-message"),
    refresh: document.getElementById("refresh-workspace"),
    form: document.getElementById("generate-form"),
    prompt: document.getElementById("prompt-input"),
    type: document.getElementById("content-type"),
    durationGroup: document.getElementById("duration-group"),
    durationOptions: document.getElementById("duration-options"),
    durationValue: document.getElementById("duration-value"),
    generateButton: document.getElementById("generate-button"),
    generateThreeButton: document.getElementById("generate-three-button"),
    analyzeButton: document.getElementById("analyze-button"),
    assistant: document.getElementById("assistant-output"),
    latest: document.getElementById("latest-result"),
    latestBatch: document.getElementById("latest-batch"),
    libraryLink: document.getElementById("library-link"),
    worksGrid: document.getElementById("works-grid"),
    workFilters: [...document.querySelectorAll("[data-work-filter]")],
    activityPanel: document.getElementById("activity-panel"),
    activityPreview: document.getElementById("activity-preview"),
    suggestionButtons: [...document.querySelectorAll("[data-template]")],
    controlSegments: [...document.querySelectorAll("[data-control-group]")],
    generationProgress: document.getElementById("generation-progress"),
    generationStatus: document.getElementById("generation-status"),
    generationProgressValue: document.getElementById("generation-progress-value"),
    generationProgressBar: document.getElementById("generation-progress-bar"),
    openAdmin: document.getElementById("open-admin-panel"),
    closeAdmin: document.getElementById("close-admin-panel"),
    adminOverlay: document.getElementById("admin-overlay"),
    adminBackdrop: document.querySelector("[data-close-admin='true']"),
    adminAuthView: document.getElementById("admin-auth-view"),
    adminInlineLogin: document.getElementById("admin-inline-login"),
    adminInlineMessage: document.getElementById("admin-inline-message"),
    adminDashboard: document.getElementById("admin-dashboard-inline"),
    adminMessageLive: document.getElementById("admin-inline-message-live"),
    adminActiveCodes: document.getElementById("admin-active-codes"),
    adminTotalImages: document.getElementById("admin-total-images"),
    adminTotalVideos: document.getElementById("admin-total-videos"),
    adminQuickCreate: document.getElementById("admin-quick-create"),
    adminTabs: [...document.querySelectorAll("[data-admin-tab]")],
    adminPanes: [...document.querySelectorAll("[data-admin-pane]")],
    adminSearch: document.getElementById("admin-search"),
    adminFilterButtons: [...document.querySelectorAll("[data-admin-filter]")],
    adminCodesGrid: document.getElementById("admin-inline-codes"),
    adminCreateForm: document.getElementById("admin-inline-create-form"),
    adminSelectedCode: document.getElementById("admin-selected-code"),
    adminActivity: document.getElementById("admin-inline-activity"),
    adminLogout: document.getElementById("admin-inline-logout")
};

function setStudioMessage(text, type = "info") {
    studioElements.message.textContent = text || "";
    studioElements.message.className = text ? `message ${type}` : "message";
}

function setAdminMessage(text, type = "info", inline = false) {
    const target = inline ? studioElements.adminInlineMessage : studioElements.adminMessageLive;
    target.textContent = text || "";
    target.className = text ? `message ${type}` : "message";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

async function studioApi(url, options = {}) {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        },
        ...options
    });

    const raw = await response.text();
    let payload = {};
    try {
        payload = raw ? JSON.parse(raw) : {};
    } catch (error) {
        throw new Error(raw || "ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ°ط·آ·ط¢آ·ط·آ¢ط¢آ± ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¹â€کط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ·ط¥â€™ط·آ·ط¢آ·ط·آ¢ط¢آ© ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ·ط·آ¢ط¢آ©.");
    }

    if (!response.ok || payload.success === false) {
        throw new Error(payload.message || "ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ« ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ·ط·آ¢ط¢آ·ط·آ·ط¢آ·ط·آ¢ط¢آ£ ط·آ·ط¢آ·ط·آ·أ¢â‚¬ط›ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ± ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¹â€کط·آ·ط¢آ·ط·آ¢ط¢آ¹.");
    }

    return payload;
}

function adminApi(url, options = {}) {
    return studioApi(url, {
        headers: {
            Authorization: `Bearer ${studioState.adminToken}`
        },
        ...options
    });
}

async function improvePrompt(userPrompt, options = {}) {
    const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            prompt: userPrompt,
            ...options
        })
    });

    const raw = await response.text();
    let payload = {};
    try {
        payload = raw ? JSON.parse(raw) : {};
    } catch (error) {
        throw new Error(raw || "Gemini response could not be read.");
    }

    if (!response.ok) {
        throw new Error(payload.message || payload.error || "Gemini prompt enhancement failed.");
    }

    return {
        prompt: payload.prompt || userPrompt,
        source: "gemini"
    };
}

function getCodeFromLocation() {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("code");
    return (codeFromUrl || sessionStorage.getItem("activeCreditsCode") || "").toUpperCase();
}

function formatDate(value) {
    if (!value) return "غير محدد";
    return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function humanStatus(status) {
    return {
        active: "فعال",
        inactive: "موقوف",
        expired: "منتهي",
        scheduled: "مجدول",
        consumed: "مستهلك"
    }[status] || status || "-";
}

function humanPriority(priority) {
    return {
        low: "منخفضة",
        normal: "عادية",
        high: "عالية",
        vip: "VIP"
    }[priority] || priority || "-";
}

function findWorkById(id) {
    return studioState.works.find((work) => String(work.id) === String(id))
        || studioState.latestBatch.find((work) => String(work.id) === String(id));
}

function buildControlsPayload(overrides = {}) {
    return {
        timeOfDay: overrides.timeOfDay || studioState.controls.timeOfDay,
        visualStyle: overrides.visualStyle || studioState.controls.visualStyle,
        cameraAnglePreset: overrides.cameraAnglePreset || studioState.controls.cameraAnglePreset,
        outputQuality: overrides.outputQuality || studioState.controls.outputQuality
    };
}

function buildGenerationPayload(overrides = {}) {
    const payload = {
        code: studioState.code,
        prompt: typeof overrides.prompt === "string" ? overrides.prompt : studioElements.prompt.value.trim(),
        type: overrides.type || studioElements.type.value,
        variations: Number(overrides.variations || 1),
        ...buildControlsPayload(overrides)
    };
    if (payload.type === "video") {
        payload.duration = Number(overrides.duration || studioElements.durationValue.value);
        payload.variations = 1;
    }
    return payload;
}

function renderCreateBalance(code) {
    studioElements.createBalance.innerHTML = `
        <strong>${code.remainingImages}</strong> صورة متبقية
        <span class="balance-divider">|</span>
        <strong>${code.remainingVideos}</strong> فيديو متبقٍ
    `;
}

function renderSummary(code) {
    const badgeName = code.clientName || code.name || code.badgeLabel;
    studioElements.headerCodeBadge.innerHTML = `<strong>${escapeHtml(code.code)}</strong><span>${escapeHtml(badgeName)}</span>`;
    renderCreateBalance(code);
    studioElements.codeSummary.innerHTML = `
        <div class="summary-headline">
            <div>
                <h3>${escapeHtml(code.name)}</h3>
                <p class="summary-meta">${escapeHtml(code.badgeLabel)} | ${humanStatus(code.status)} | أولوية المعالجة ${humanPriority(code.processingPriority)}</p>
            </div>
            <span class="mini-badge">${escapeHtml(code.remainingImages + code.remainingVideos)} رصيد</span>
        </div>
        <div class="summary-metrics">
            <div class="metric"><span>الصور المتبقية</span><strong>${code.remainingImages}</strong></div>
            <div class="metric"><span>الفيديوهات المتبقية</span><strong>${code.remainingVideos}</strong></div>
            <div class="metric"><span>المدد المتاحة</span><strong>${code.allowedDurations.length ? code.allowedDurations.join(" / ") : "-"}</strong></div>
        </div>
        <div class="summary-list">
            <span>اسم العميل: ${escapeHtml(code.clientName || "-")}</span>
            <span>تاريخ البداية: ${formatDate(code.startsAt)}</span>
            <span>تاريخ الانتهاء: ${formatDate(code.expiresAt)}</span>
            <span>${code.allowSave ? "الحفظ متاح" : "الحفظ غير متاح"} | ${code.allowRegenerate ? "إعادة التوليد متاحة" : "إعادة التوليد غير متاحة"}</span>
        </div>
    `;
}

function renderDurations(code) {
    const allowed = code.allowedDurations || [];
    const allDurations = [5, 10, 30, 60];
    studioElements.durationValue.value = String(allowed[0] || 5);
    studioElements.durationOptions.innerHTML = allDurations.map((duration) => `
        <button class="duration-chip ${allowed[0] === duration ? "active" : ""}" type="button" data-duration="${duration}" ${allowed.includes(duration) ? "" : "disabled"}>
            ${duration} ثانية
        </button>
    `).join("");
}

function updateMode() {
    const isVideo = studioElements.type.value === "video";
    studioElements.durationGroup.classList.toggle("hidden", !isVideo);
    studioElements.generateButton.textContent = isVideo ? "إنشاء فيديو" : "إنشاء صورة";
    studioElements.generateThreeButton.classList.toggle("hidden", isVideo);
    studioElements.generateThreeButton.disabled = isVideo;
    studioElements.generateThreeButton.textContent = isVideo ? "3 نتائج غير متاحة للفيديو" : "إنشاء 3 نتائج";
}

function updateControlSegments() {
    studioElements.controlSegments.forEach((button) => {
        button.classList.toggle("active", studioState.controls[button.dataset.controlGroup] === button.dataset.controlValue);
    });
}

function setBusyState(isBusy) {
    studioElements.generateButton.disabled = isBusy;
    studioElements.generateThreeButton.disabled = isBusy || studioElements.type.value === "video";
    studioElements.analyzeButton.disabled = isBusy;
}

function startLoading(sequence) {
    const steps = sequence || [
        { progress: 18, text: "نفهم الوصف ونحدد عناصر المشهد..." },
        { progress: 45, text: "نرتب البرومبت ونضبط الإضاءة والستايل..." },
        { progress: 72, text: "نجهز المعاينة النهائية..." }
    ];
    clearInterval(studioState.loadingTimer);
    studioElements.generationProgress.classList.remove("hidden");
    let index = 0;
    studioElements.generationStatus.textContent = steps[0].text;
    studioElements.generationProgressValue.textContent = `${steps[0].progress}%`;
    studioElements.generationProgressBar.style.width = `${steps[0].progress}%`;
    studioState.loadingTimer = setInterval(() => {
        index = Math.min(index + 1, steps.length - 1);
        studioElements.generationStatus.textContent = steps[index].text;
        studioElements.generationProgressValue.textContent = `${steps[index].progress}%`;
        studioElements.generationProgressBar.style.width = `${steps[index].progress}%`;
        if (index === steps.length - 1) {
            clearInterval(studioState.loadingTimer);
        }
    }, 700);
}

function finishLoading(text = "اكتمل التنفيذ بنجاح.") {
    clearInterval(studioState.loadingTimer);
    studioElements.generationStatus.textContent = text;
    studioElements.generationProgressValue.textContent = "100%";
    studioElements.generationProgressBar.style.width = "100%";
    setTimeout(() => {
        studioElements.generationProgress.classList.add("hidden");
    }, 900);
}

function renderAssistant(data) {
    const extracted = data.extracted || {};
    const keywords = Array.isArray(data.keywords) && data.keywords.length ? data.keywords : ["-"];
    const notes = Array.isArray(data.notes) && data.notes.length ? data.notes : ["لا توجد ملاحظات إضافية حاليًا."];
    const completed = Array.isArray(data.autoCompleted) && data.autoCompleted.length ? data.autoCompleted : ["لا توجد عناصر مكتملة تلقائيًا."];
    studioElements.assistant.innerHTML = `
        <div class="analysis-grid">
            <div class="insight-card"><span class="insight-label">من هو؟</span><strong>${escapeHtml(extracted.who || "-")}</strong></div>
            <div class="insight-card"><span class="insight-label">ماذا يفعل؟</span><strong>${escapeHtml(extracted.action || "-")}</strong></div>
            <div class="insight-card"><span class="insight-label">أين؟</span><strong>${escapeHtml(extracted.where || "-")}</strong></div>
            <div class="insight-card"><span class="insight-label">متى؟</span><strong>${escapeHtml(extracted.when || "-")}</strong></div>
            <div class="insight-card"><span class="insight-label">كيف يبدو؟</span><strong>${escapeHtml(extracted.look || "-")}</strong></div>
            <div class="insight-card"><span class="insight-label">نوع اللقطة</span><strong>${escapeHtml(extracted.shotType || data.styleLabel || "-")}</strong></div>
        </div>
        <div class="insights-grid">
            <div class="enhanced-box">
                <span class="insight-label">الوصف الأصلي</span>
                <p>${escapeHtml(data.originalPrompt || "")}</p>
            </div>
            <div class="enhanced-box">
                <span class="insight-label">الوصف المحسن</span>
                <p>${escapeHtml(data.enhancedPrompt || "-")}</p>
            </div>
        </div>
        <div class="insights-grid">
            <div class="enhanced-box">
                <span class="insight-label">ما الذي أكمله النظام تلقائيًا؟</span>
                <p>${escapeHtml(completed.join(" | "))}</p>
            </div>
            <div class="enhanced-box">
                <span class="insight-label">الكلمات المفتاحية والخيارات المختارة</span>
                <p>${escapeHtml(keywords.join(" / "))}</p>
                <p>${escapeHtml(`${data.timeOfDayLabel || "-"} | ${data.styleLabel || "-"} | ${data.cameraAngleLabel || "-"} | ${data.qualityLabel || "-"}`)}</p>
            </div>
        </div>
        <div class="enhanced-box">
            <span class="insight-label">ملاحظات التحسين</span>
            <p>${escapeHtml(notes.join(" | "))}</p>
        </div>
    `;
}

function buildResultActions(work) {
    const regenButtons = studioState.meta?.allowRegenerate ? `
        <button class="card-button" type="button" data-result-action="regenerate">إعادة التوليد</button>
        <button class="card-button" type="button" data-result-action="hd">تحميل HD</button>
        <button class="card-button" type="button" data-result-action="4k">تحميل 4K</button>
    ` : `
        <button class="card-button" type="button" data-result-action="hd">تحميل HD</button>
        <button class="card-button" type="button" data-result-action="4k">تحميل 4K</button>
    `;
    return `
        <button class="card-button" type="button" data-result-action="preview">عرض</button>
        <button class="card-button" type="button" data-result-action="download">تحميل</button>
        <a class="card-button" href="library.html?code=${encodeURIComponent(studioState.code)}">مكتبة الأعمال</a>
        <button class="card-button" type="button" data-result-action="saved">${work.saved ? "العمل محفوظ" : "اذهب إلى المكتبة"}</button>
        ${regenButtons}
    `;
}

function renderLatest(work, intelligence) {
    const typeLabel = work.type === "video" ? `فيديو ${work.duration || ""} ثانية` : "صورة";
    const qualityLabel = work.qualityLabel || intelligence.qualityLabel || controlLabels.outputQuality[work.outputQuality] || "-";
    studioElements.latest.classList.remove("hidden");
    studioElements.latest.innerHTML = `
        <div class="section-head">
            <div>
                <p class="section-kicker">النتيجة الأخيرة</p>
                <h3>تم إنشاء العمل بنجاح</h3>
            </div>
        </div>
        <article class="result-showcase">
            <div class="result-preview-frame">
                <img src="${escapeHtml(window.CreditsWorkAssets.resolveUrl(work))}" alt="${escapeHtml(typeLabel)}">
            </div>
            <div class="result-copy">
                <div class="work-topline">
                    <span class="mini-badge">${escapeHtml(typeLabel)}</span>
                    <span class="work-meta">${formatDate(work.createdAt)}</span>
                </div>
                <strong>${escapeHtml(work.title || "عمل جديد")}</strong>
                <p class="work-prompt">${escapeHtml(work.originalPrompt || work.prompt)}</p>
                <div class="result-meta-grid">
                    <div class="insight-card compact-card"><span class="insight-label">الوقت</span><strong>${escapeHtml(work.timeOfDayLabel || intelligence.timeOfDayLabel || "-")}</strong></div>
                    <div class="insight-card compact-card"><span class="insight-label">الستايل</span><strong>${escapeHtml(work.styleLabel || intelligence.styleLabel || "-")}</strong></div>
                    <div class="insight-card compact-card"><span class="insight-label">الجودة</span><strong>${escapeHtml(qualityLabel)}</strong></div>
                    <div class="insight-card compact-card"><span class="insight-label">زاوية التصوير</span><strong>${escapeHtml(work.cameraAngleLabel || intelligence.cameraAngleLabel || "-")}</strong></div>
                </div>
                <div class="enhanced-box"><span class="insight-label">الوصف المحسن</span><p>${escapeHtml(work.enhancedPrompt || intelligence.enhancedPrompt || "-")}</p></div>
                <div class="work-actions result-actions">${buildResultActions(work)}</div>
            </div>
        </article>
    `;
}

function renderLatestBatch(works) {
    if (!works || works.length <= 1) {
        studioElements.latestBatch.classList.add("hidden");
        studioElements.latestBatch.innerHTML = "";
        return;
    }
    studioElements.latestBatch.classList.remove("hidden");
    studioElements.latestBatch.innerHTML = `
        <div class="section-head">
            <div>
                <p class="section-kicker">دفعة النتائج</p>
                <h3>3 نتائج مختلفة من نفس الفكرة</h3>
            </div>
        </div>
        <div class="batch-grid">
            ${works.map((work) => `
                <article class="batch-card">
                    <img src="${escapeHtml(window.CreditsWorkAssets.resolveUrl(work))}" alt="${escapeHtml(work.title)}">
                    <div class="work-content">
                        <div class="work-topline">
                            <span class="mini-badge">${escapeHtml(work.type === "video" ? "فيديو" : "صورة")}</span>
                            <span class="work-meta">${formatDate(work.createdAt)}</span>
                        </div>
                        <strong>${escapeHtml(work.title)}</strong>
                        <p class="work-meta">${escapeHtml(`${work.styleLabel || "-"} | ${work.timeOfDayLabel || "-"} | ${work.qualityLabel || "-"}`)}</p>
                        <div class="work-actions">
                            <button class="card-button" type="button" data-work-action="preview" data-work-id="${escapeHtml(work.id)}">عرض</button>
                            <button class="card-button" type="button" data-work-action="download" data-work-id="${escapeHtml(work.id)}">تحميل</button>
                            <button class="card-button" type="button" data-work-action="hd" data-work-id="${escapeHtml(work.id)}">HD</button>
                        </div>
                    </div>
                </article>
            `).join("")}
        </div>
    `;
}

function renderWorks() {
    let works = [...studioState.works];
    if (studioState.workFilter !== "all") {
        works = works.filter((work) => work.type === studioState.workFilter);
    }
    studioElements.worksGrid.innerHTML = works.length ? works.slice(0, 6).map((work) => `
        <article class="work-card">
            <img src="${escapeHtml(window.CreditsWorkAssets.resolveUrl(work))}" alt="${escapeHtml(work.type)}">
            <div class="work-content">
                <div class="work-topline">
                    <span class="mini-badge">${work.type === "video" ? `فيديو ${work.duration || ""} ثانية` : "صورة"}</span>
                    <span class="work-meta">${formatDate(work.createdAt)}</span>
                </div>
                <strong>${escapeHtml(work.title || "عمل جديد")}</strong>
                <p class="work-prompt">${escapeHtml(work.prompt)}</p>
                <div class="summary-list work-insights-list">
                    <span>الوقت: ${escapeHtml(work.timeOfDayLabel || "-")}</span>
                    <span>الستايل: ${escapeHtml(work.styleLabel || "-")}</span>
                    <span>الجودة: ${escapeHtml(work.qualityLabel || "-")}</span>
                </div>
                <div class="work-actions">
                    <button class="card-button" type="button" data-work-action="preview" data-work-id="${escapeHtml(work.id)}">عرض</button>
                    <button class="card-button" type="button" data-work-action="download" data-work-id="${escapeHtml(work.id)}">تحميل</button>
                    <button class="card-button" type="button" data-work-action="4k" data-work-id="${escapeHtml(work.id)}">4K</button>
                </div>
            </div>
        </article>
    `).join("") : `<div class="empty-state">لا توجد أعمال محفوظة بعد.</div>`;
}

function renderActivityPreview() {
    if (!studioState.activity.length) {
        studioElements.activityPanel.classList.add("hidden");
        studioElements.activityPreview.innerHTML = `<div class="empty-state">لا توجد عمليات مسجلة بعد.</div>`;
        return;
    }
    studioElements.activityPanel.classList.remove("hidden");
    studioElements.activityPreview.innerHTML = studioState.activity.slice(0, 5).map((event) => `
        <article class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <strong>${escapeHtml(event.message)}</strong>
                <p class="work-meta">${escapeHtml(event.action)} | ${formatDate(event.createdAt)}</p>
            </div>
        </article>
    `).join("");
}

async function loadWorkspace() {
    studioState.code = getCodeFromLocation();
    if (!studioState.code) {
        window.location.href = "index.html";
        return;
    }
    sessionStorage.setItem("activeCreditsCode", studioState.code);
    studioElements.libraryLink.href = `library.html?code=${encodeURIComponent(studioState.code)}`;
    const [lookupResponse, activityResponse] = await Promise.all([
        studioApi("/api/codes/lookup", {
            method: "POST",
            body: JSON.stringify({ code: studioState.code })
        }),
        studioApi(`/api/codes/${encodeURIComponent(studioState.code)}/activity`)
    ]);
    studioState.meta = lookupResponse.data.code;
    studioState.works = lookupResponse.data.works || [];
    studioState.activity = activityResponse.data.activity || [];
    renderSummary(studioState.meta);
    renderDurations(studioState.meta);
    renderWorks();
    renderActivityPreview();
    updateMode();
}

async function analyzePrompt() {
    const userPrompt = studioElements.prompt.value.trim();
    if (!userPrompt) {
        setStudioMessage("ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط·آ¦أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ¨ ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ§ ط·آ·ط¢آ·ط·آ¢ط¢آ£ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ§.", "error");
        return null;
    }
    startLoading([
        { progress: 24, text: "ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¬ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ  ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ط·آ·ط¢آ·ط·آ¢ط¢آ¯..." },
        { progress: 58, text: "ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ¯ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ¹ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع† ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط·آ¦أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ  ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¹â€کط·آ·ط¢آ·ط·آ¹ط¢آ¾..." },
        { progress: 84, text: "ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ·ط¥â€™ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ¸ط·آ¸ط¢آ¾ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¦ط·آ·ط¢آ¸ط·آ¸ط¢آ¹..." }
    ]);
    const promptEnhancement = await improvePrompt(userPrompt, { type: studioElements.type.value, ...buildControlsPayload() });
    const improvedPrompt = promptEnhancement.prompt;
    const usedGemini = promptEnhancement.source === "gemini";
    const response = await studioApi("/api/prompt-intelligence/analyze", {
        method: "POST",
        body: JSON.stringify({
            prompt: improvedPrompt,
            type: studioElements.type.value,
            ...buildControlsPayload()
        })
    });
    response.data.originalPrompt = userPrompt;
    if (usedGemini) {
        response.data.notes = [...(response.data.notes || []), "ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ  ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ¸ط·آ¸ط¢آ¾ ط·آ·ط¢آ·ط·آ¢ط¢آ£ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ§ ط·آ·ط¢آ·ط·آ¢ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ·ط·آ¢ط¢آ± Gemini ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¹â€کط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع† ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع† ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط·آ¸ط¢آ¹."];
    }
    studioState.lastIntelligence = response.data;
    renderAssistant(response.data);
    setStudioMessage(usedGemini ? "تم تحسين الوصف عبر Gemini قبل التحليل الداخلي." : "فشل Gemini وتم استخدام التحسين المحلي بدلًا منه.", usedGemini ? "success" : "info");
    studioState.lastIntelligence = response.data;
    return response.data;
}

async function performGeneration(variations = 1, overrides = {}) {
    const payload = buildGenerationPayload({ ...overrides, variations });
    if (!payload.prompt) {
        setStudioMessage("ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط·آ¦أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ¨ ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ§ ط·آ·ط¢آ·ط·آ¢ط¢آ£ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ§.", "error");
        return;
    }
    const userPrompt = payload.prompt;

    setBusyState(true);
    setStudioMessage(variations > 1 ? "ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ ط·آ·ط¢آ·ط·آ¢ط¢آ¥ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ·ط¥â€™ 3 ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ¬..." : "ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ ط·آ·ط¢آ·ط·آ¢ط¢آ¥ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ·ط¥â€™ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ©...", "info");
    startLoading([
        { progress: 18, text: "ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ¸ط·آ¸ط¢آ¾ ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¹â€کط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ ط·آ·ط¢آ·ط·آ¢ط¢آ¥ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ° ط·آ·ط¢آ·ط·آ¢ط¢آ¹ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ·ط·آ¢ط¢آ±..." },
        { progress: 42, text: "ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ ط·آ·ط¢آ·ط·آ¢ط¢آ¥ط·آ·ط¢آ¸ط·آ¦أ¢â‚¬â„¢ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع† ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع† ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¹â€کط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ·ط·آ¢ط¢آ© ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ·ط¥â€™ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ط·آ·ط¢آ·ط·آ¢ط¢آ¯..." },
        { progress: 68, text: variations > 1 ? "ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ ط·آ·ط¢آ·ط·آ¢ط¢آ¥ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ·ط¥â€™ ط·آ·ط¢آ·ط·آ¢ط¢آ£ط·آ·ط¢آ¸ط·آ¦أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ«ط·آ·ط¢آ·ط·آ¢ط¢آ± ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ  ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ© ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ  ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ³ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ¸ط·آ¦أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ©..." : "ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ ط·آ·ط¢آ·ط·آ¢ط¢آ¥ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¬ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ© ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¦ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ©..." },
        { progress: 88, text: "ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ² ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ© ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ¸ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع† ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط·آ¦أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ·ط·آ¢ط¢آ©..." }
    ]);

    try {
        const promptEnhancement = await improvePrompt(userPrompt, { type: payload.type, ...buildControlsPayload(payload) });
        const usedGemini = promptEnhancement.source === "gemini";
        payload.prompt = promptEnhancement.prompt;
        payload.originalPrompt = userPrompt;
        payload.promptSource = promptEnhancement.source;
        const response = await studioApi("/api/content/generate", {
            method: "POST",
            body: JSON.stringify(payload)
        });
        studioState.lastPayload = payload;
        studioState.lastIntelligence = response.data.intelligence;
        studioState.latestBatch = response.data.works || [response.data.work];
        await loadWorkspace();
        renderAssistant(response.data.intelligence);
        renderLatest(studioState.latestBatch[0], response.data.intelligence);
        renderLatestBatch(studioState.latestBatch);
        finishLoading(variations > 1 ? "ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ ط·آ·ط¢آ·ط·آ¢ط¢آ¥ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ·ط¥â€™ 3 ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ¬ ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ­." : "ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ ط·آ·ط¢آ·ط·آ¢ط¢آ¥ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ·ط¥â€™ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ© ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ­.");
        setStudioMessage(usedGemini ? (response.data.saved ? "تم تحسين الوصف عبر Gemini ثم إنشاء العمل وحفظه بنجاح." : "تم تحسين الوصف عبر Gemini ثم إنشاء العمل بنجاح.") : (response.data.saved ? "فشل Gemini وتم استخدام التحسين المحلي بدلًا منه، ثم تم إنشاء العمل وحفظه بنجاح." : "فشل Gemini وتم استخدام التحسين المحلي بدلًا منه، ثم تم إنشاء العمل بنجاح."), usedGemini ? "success" : "info");
    } catch (error) {
        clearInterval(studioState.loadingTimer);
        studioElements.generationProgress.classList.add("hidden");
        setStudioMessage(error.message, "error");
    } finally {
        setBusyState(false);
    }
}

function openAdminOverlay() {
    studioElements.adminOverlay.classList.remove("hidden");
}

function closeAdminOverlay() {
    studioElements.adminOverlay.classList.add("hidden");
}

function renderAdminStats(codes) {
    studioElements.adminActiveCodes.textContent = codes.filter((code) => code.status === "active").length;
    studioElements.adminTotalImages.textContent = codes.reduce((sum, code) => sum + code.remainingImages, 0);
    studioElements.adminTotalVideos.textContent = codes.reduce((sum, code) => sum + code.remainingVideos, 0);
}

function filteredAdminCodes() {
    return studioState.adminCodes.filter((code) => {
        const search = studioState.adminSearch;
        const matchesSearch = !search
            || code.code.toLowerCase().includes(search)
            || (code.name || "").toLowerCase().includes(search)
            || (code.clientName || "").toLowerCase().includes(search);
        const matchesFilter = studioState.adminFilter === "all"
            || (studioState.adminFilter === "vip" ? code.planType === "vip" : code.status === studioState.adminFilter);
        return matchesSearch && matchesFilter;
    });
}

function renderAdminCodes() {
    const codes = filteredAdminCodes();
    studioElements.adminCodesGrid.innerHTML = codes.length ? codes.map((code) => `
        <article class="code-card">
            <div class="work-topline">
                <div>
                    <strong>${escapeHtml(code.code)}</strong>
                    <div class="work-meta">${escapeHtml(code.name)}</div>
                </div>
                <span class="mini-badge">${escapeHtml(code.badgeLabel)}</span>
            </div>
            <div class="summary-list admin-code-list">
                <span>ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ©: ${escapeHtml(humanStatus(code.status))}</span>
                <span>ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ¹ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†: ${escapeHtml(code.clientName || "-")}</span>
                <span>ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ±: ${code.remainingImages} / ${code.maxImages}</span>
                <span>ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ : ${code.remainingVideos} / ${code.maxVideos}</span>
            </div>
            <div class="work-actions">
                <button class="card-button" type="button" data-admin-select="${escapeHtml(code.code)}">ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†</button>
                <button class="card-button" type="button" data-admin-toggle="${escapeHtml(code.code)}" data-active="${code.isActive}">
                    ${code.isActive ? "ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ·ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†" : "ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ¹ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†"}
                </button>
            </div>
        </article>
    `).join("") : `<div class="empty-state">ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ§ ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ¯ ط·آ·ط¢آ·ط·آ¢ط¢آ£ط·آ·ط¢آ¸ط·آ¦أ¢â‚¬â„¢ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¯ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ·ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¹â€کط·آ·ط¢آ·ط·آ¢ط¢آ©.</div>`;
}

function renderAdminSelectedCode(detail) {
    if (!detail) {
        studioElements.adminSelectedCode.innerHTML = `<div class="empty-state">ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ± ط·آ·ط¢آ¸ط·آ¦أ¢â‚¬â„¢ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ§ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ  ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ¨ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ£ط·آ·ط¢آ¸ط·آ¦أ¢â‚¬â„¢ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¯ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ¶ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ¯ ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¹ط¢آ¾.</div>`;
        studioElements.adminActivity.innerHTML = `<div class="empty-state">ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ± ط·آ·ط¢آ¸ط·آ¦أ¢â‚¬â„¢ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ§ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ¶ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†.</div>`;
        return;
    }
    studioElements.adminSelectedCode.innerHTML = `
        <div class="enhanced-box">
            <span class="insight-label">${escapeHtml(detail.code.code)}</span>
            <p>${escapeHtml(detail.code.name)} | ${escapeHtml(detail.code.badgeLabel)} | ${escapeHtml(humanPriority(detail.code.processingPriority))}</p>
            <p>ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ±: ${detail.code.remainingImages}/${detail.code.maxImages} | ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ : ${detail.code.remainingVideos}/${detail.code.maxVideos}</p>
            <p>ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ¯ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ : ${detail.code.allowedDurations.join(" / ") || "-"}</p>
            <p>${detail.code.allowSave ? "ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ¸ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ£ط·آ·ط¢آ·ط·آ¢ط¢آ¹ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†" : "ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ  ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ¸"} | ${detail.code.allowRegenerate ? "ط·آ·ط¢آ·ط·آ¢ط¢آ¥ط·آ·ط¢آ·ط·آ¢ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ© ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ¯ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ·ط·آ¢ط¢آ©" : "ط·آ·ط¢آ·ط·آ¢ط¢آ¥ط·آ·ط¢آ·ط·آ¢ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ© ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ¯ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ·ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ©"}</p>
        </div>
    `;
    studioElements.adminActivity.innerHTML = (detail.activity || []).length ? detail.activity.map((event) => `
        <article class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <strong>${escapeHtml(event.message)}</strong>
                <p class="work-meta">${escapeHtml(event.action)} | ${formatDate(event.createdAt)}</p>
            </div>
        </article>
    `).join("") : `<div class="empty-state">ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ§ ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ¯ ط·آ·ط¢آ·ط·آ¢ط¢آ¹ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¹ط¢آ¾ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ط·آ·ط¢آ·ط·آ¢ط¢آ°ط·آ·ط¢آ·ط·آ¢ط¢آ§ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط·آ¦أ¢â‚¬â„¢ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯.</div>`;
}

function switchAdminTab(tabName) {
    studioElements.adminTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.adminTab === tabName));
    studioElements.adminPanes.forEach((pane) => pane.classList.toggle("hidden", pane.dataset.adminPane !== tabName));
}

async function loadAdminCodes() {
    const response = await adminApi("/api/admin/codes");
    studioState.adminCodes = response.data.codes;
    renderAdminStats(studioState.adminCodes);
    renderAdminCodes();
}

async function openSelectedAdminCode(codeValue) {
    const response = await adminApi(`/api/admin/codes/${encodeURIComponent(codeValue)}`);
    studioState.selectedAdminCode = response.data;
    renderAdminSelectedCode(studioState.selectedAdminCode);
    switchAdminTab("credits");
}

async function loadAdminSessionIfAny() {
    if (!studioState.adminToken) {
        studioElements.adminAuthView.classList.remove("hidden");
        studioElements.adminDashboard.classList.add("hidden");
        return;
    }
    try {
        await adminApi("/api/admin/session");
        studioElements.adminAuthView.classList.add("hidden");
        studioElements.adminDashboard.classList.remove("hidden");
        await loadAdminCodes();
    } catch (error) {
        studioState.adminToken = "";
        localStorage.removeItem(adminTokenKey);
        studioElements.adminAuthView.classList.remove("hidden");
        studioElements.adminDashboard.classList.add("hidden");
    }
}

function handleWorkAction(work, action) {
    if (!work) return;
    if (action === "preview") {
        window.CreditsWorkAssets.preview(work);
        return;
    }
    if (action === "download") {
        window.CreditsWorkAssets.download(work);
        return;
    }
    if (action === "hd") {
        window.CreditsWorkAssets.download(work, { suffix: "hd" });
        return;
    }
    if (action === "4k") {
        window.CreditsWorkAssets.download(work, { suffix: "4k" });
    }
}

studioElements.refresh.addEventListener("click", async () => {
    try {
        await loadWorkspace();
        setStudioMessage("ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ« ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¹ط¢آ¾ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط·آ¦أ¢â‚¬â„¢ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯.", "success");
    } catch (error) {
        setStudioMessage(error.message, "error");
    }
});

studioElements.type.addEventListener("change", updateMode);

studioElements.durationOptions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-duration]");
    if (!button || button.disabled) return;
    studioElements.durationValue.value = button.dataset.duration;
    [...studioElements.durationOptions.querySelectorAll(".duration-chip")].forEach((chip) => chip.classList.remove("active"));
    button.classList.add("active");
});

studioElements.controlSegments.forEach((button) => {
    button.addEventListener("click", () => {
        studioState.controls[button.dataset.controlGroup] = button.dataset.controlValue;
        updateControlSegments();
    });
});

studioElements.workFilters.forEach((button) => {
    button.addEventListener("click", () => {
        studioState.workFilter = button.dataset.workFilter;
        studioElements.workFilters.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        renderWorks();
    });
});

studioElements.worksGrid.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-work-action]");
    if (!trigger) return;
    handleWorkAction(findWorkById(trigger.dataset.workId), trigger.dataset.workAction);
});

studioElements.latestBatch.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-work-action]");
    if (!trigger) return;
    handleWorkAction(findWorkById(trigger.dataset.workId), trigger.dataset.workAction);
});

studioElements.suggestionButtons.forEach((button) => {
    button.addEventListener("click", () => {
        studioElements.prompt.value = button.dataset.template;
    });
});

studioElements.analyzeButton.addEventListener("click", async () => {
    try {
        setBusyState(true);
        await analyzePrompt();
    } catch (error) {
        studioElements.generationProgress.classList.add("hidden");
        setStudioMessage(error.message, "error");
    } finally {
        setBusyState(false);
    }
});

studioElements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await performGeneration(1);
});

studioElements.generateThreeButton.addEventListener("click", async () => {
    await performGeneration(3);
});

studioElements.latest.addEventListener("click", async (event) => {
    const trigger = event.target.closest("[data-result-action]");
    if (!trigger) return;
    const action = trigger.dataset.resultAction;
    const work = studioState.latestBatch[0] || studioState.works[0];
    if (!work) return;
    if (action === "saved") {
        window.location.href = `library.html?code=${encodeURIComponent(studioState.code)}`;
        return;
    }
    if (action === "regenerate") {
        if (!studioState.lastPayload) {
            setStudioMessage("ط·آ·ط¢آ·ط·آ¢ط¢آ£ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ·ط·آ¢ط¢آ¦ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ© ط·آ·ط¢آ·ط·آ¢ط¢آ£ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ§ ط·آ·ط¢آ·ط·آ¢ط¢آ«ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ ط·آ·ط¢آ·ط·آ¢ط¢آ£ط·آ·ط¢آ·ط·آ¢ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ¯ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ¯.", "error");
            return;
        }
        await performGeneration(1, studioState.lastPayload);
        return;
    }
    handleWorkAction(work, action);
});

studioElements.openAdmin.addEventListener("click", async () => {
    openAdminOverlay();
    try {
        await loadAdminSessionIfAny();
    } catch (error) {
        setAdminMessage(error.message, "error", true);
    }
});

studioElements.closeAdmin.addEventListener("click", closeAdminOverlay);
studioElements.adminBackdrop.addEventListener("click", closeAdminOverlay);

studioElements.adminInlineLogin.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(studioElements.adminInlineLogin);
    try {
        const response = await studioApi("/api/admin/login", {
            method: "POST",
            body: JSON.stringify({
                username: formData.get("username"),
                password: formData.get("password"),
                securityCode: formData.get("securityCode")
            })
        });
        studioState.adminToken = response.data.token;
        localStorage.setItem(adminTokenKey, studioState.adminToken);
        setAdminMessage("ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع† ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع† ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ£ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ  ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ­.", "success", true);
        studioElements.adminAuthView.classList.add("hidden");
        studioElements.adminDashboard.classList.remove("hidden");
        await loadAdminCodes();
    } catch (error) {
        setAdminMessage(error.message, "error", true);
    }
});

studioElements.adminTabs.forEach((tab) => {
    tab.addEventListener("click", () => switchAdminTab(tab.dataset.adminTab));
});

studioElements.adminQuickCreate.addEventListener("click", () => switchAdminTab("create"));

studioElements.adminSearch.addEventListener("input", () => {
    studioState.adminSearch = studioElements.adminSearch.value.trim().toLowerCase();
    renderAdminCodes();
});

studioElements.adminFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        studioState.adminFilter = button.dataset.adminFilter;
        studioElements.adminFilterButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        renderAdminCodes();
    });
});

studioElements.adminCodesGrid.addEventListener("click", async (event) => {
    const selectButton = event.target.closest("[data-admin-select]");
    const toggleButton = event.target.closest("[data-admin-toggle]");
    if (selectButton) {
        try {
            await openSelectedAdminCode(selectButton.dataset.adminSelect);
            setAdminMessage(`ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع† ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¹ط¢آ¾ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط·آ¦أ¢â‚¬â„¢ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ ${selectButton.dataset.adminSelect}.`, "success");
        } catch (error) {
            setAdminMessage(error.message, "error");
        }
        return;
    }
    if (toggleButton) {
        try {
            await adminApi(`/api/admin/codes/${encodeURIComponent(toggleButton.dataset.adminToggle)}`, {
                method: "PATCH",
                body: JSON.stringify({ isActive: toggleButton.dataset.active !== "true" })
            });
            await loadAdminCodes();
            setAdminMessage("ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ« ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ© ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط·آ¦أ¢â‚¬â„¢ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯.", "success");
        } catch (error) {
            setAdminMessage(error.message, "error");
        }
    }
});

studioElements.adminCreateForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(studioElements.adminCreateForm);
    const allowedDurations = [...studioElements.adminCreateForm.querySelectorAll('input[name="allowedDurations"]:checked')]
        .map((input) => Number(input.value));

    try {
        await adminApi("/api/admin/codes", {
            method: "POST",
            body: JSON.stringify({
                code: formData.get("code"),
                name: formData.get("name"),
                clientName: formData.get("clientName"),
                planType: formData.get("planType"),
                processingPriority: formData.get("processingPriority"),
                maxImages: Number(formData.get("maxImages")),
                maxVideos: Number(formData.get("maxVideos")),
                allowedDurations,
                allowRegenerate: formData.get("allowRegenerate") === "on",
                allowSave: formData.get("allowSave") === "on",
                isActive: formData.get("isActive") === "on"
            })
        });
        studioElements.adminCreateForm.reset();
        setAdminMessage("ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ ط·آ·ط¢آ·ط·آ¢ط¢آ¥ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ·ط¥â€™ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط·آ¦أ¢â‚¬â„¢ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ  ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ·ط·آ¢ط¢آ© ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ©.", "success");
        await loadAdminCodes();
        switchAdminTab("codes");
    } catch (error) {
        setAdminMessage(error.message, "error");
    }
});

studioElements.adminLogout.addEventListener("click", async () => {
    try {
        await adminApi("/api/admin/logout", { method: "POST", body: JSON.stringify({}) });
    } catch (error) {
        // ignore local logout failures
    }
    studioState.adminToken = "";
    studioState.adminCodes = [];
    studioState.selectedAdminCode = null;
    localStorage.removeItem(adminTokenKey);
    studioElements.adminDashboard.classList.add("hidden");
    studioElements.adminAuthView.classList.remove("hidden");
    setAdminMessage("ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ¸ط·آ¸ط¢آ¹ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع† ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¬.", "success", true);
});

updateControlSegments();

(async () => {
    try {
        await loadWorkspace();
    } catch (error) {
        setStudioMessage(error.message, "error");
    }
})();


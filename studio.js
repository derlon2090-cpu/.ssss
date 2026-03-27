const adminTokenKey = "creditsAdminToken";

const controlLabels = {
    timeOfDay: {
        auto: "تلقائي",
        day: "نهار",
        night: "ليل"
    },
    visualStyle: {
        realistic: "واقعي",
        cinematic: "سينمائي",
        commercial: "إعلاني",
        anime: "أنمي"
    },
    cameraAnglePreset: {
        close: "قريبة",
        medium: "متوسطة",
        wide: "واسعة"
    },
    outputQuality: {
        normal: "عادية",
        high: "عالية",
        ultra: "فائقة"
    }
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
    lastIntelligence: null
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
    analyzeButton: document.getElementById("analyze-button"),
    assistant: document.getElementById("assistant-output"),
    latest: document.getElementById("latest-result"),
    libraryLink: document.getElementById("library-link"),
    worksGrid: document.getElementById("works-grid"),
    workFilters: [...document.querySelectorAll("[data-work-filter]")],
    activityPanel: document.getElementById("activity-panel"),
    activityPreview: document.getElementById("activity-preview"),
    suggestionButtons: [...document.querySelectorAll("[data-template]")],
    controlSegments: [...document.querySelectorAll("[data-control-group]")],
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
        throw new Error(raw || "تعذر قراءة الاستجابة.");
    }

    if (!response.ok || payload.success === false) {
        throw new Error(payload.message || "حدث خطأ غير متوقع.");
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

function getCodeFromLocation() {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("code");
    return (codeFromUrl || sessionStorage.getItem("activeCreditsCode") || "").toUpperCase();
}

function formatDate(value) {
    if (!value) {
        return "غير محدد";
    }

    return new Intl.DateTimeFormat("ar-SA", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(new Date(value));
}

function getLabel(group, value) {
    return controlLabels[group]?.[value] || value || "-";
}

function humanStatus(status) {
    const labels = {
        active: "فعال",
        inactive: "موقوف",
        expired: "منتهي",
        scheduled: "مجدول",
        consumed: "مستهلك"
    };
    return labels[status] || status || "-";
}

function humanPriority(priority) {
    const labels = {
        low: "منخفضة",
        normal: "عادية",
        high: "عالية",
        vip: "VIP"
    };
    return labels[priority] || priority || "-";
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
    studioElements.headerCodeBadge.innerHTML = `
        <strong>${escapeHtml(code.code)}</strong>
        <span>${escapeHtml(badgeName)}</span>
    `;
    renderCreateBalance(code);
    studioElements.codeSummary.innerHTML = `
        <div class="summary-headline">
            <div>
                <h3>${escapeHtml(code.name)}</h3>
                <p class="summary-meta">${escapeHtml(code.badgeLabel)} | ${humanStatus(code.status)} | أولوية ${humanPriority(code.processingPriority)}</p>
            </div>
            <span class="mini-badge">${escapeHtml(code.remainingImages + code.remainingVideos)} رصيد</span>
        </div>
        <div class="summary-metrics">
            <div class="metric"><span>الصور المتبقية</span><strong>${code.remainingImages}</strong></div>
            <div class="metric"><span>الفيديوهات المتبقية</span><strong>${code.remainingVideos}</strong></div>
            <div class="metric"><span>مدد الفيديو</span><strong>${code.allowedDurations.length ? code.allowedDurations.join(" / ") : "-"}</strong></div>
        </div>
        <div class="summary-list">
            <span>العميل: ${escapeHtml(code.clientName || "-")}</span>
            <span>تاريخ البداية: ${formatDate(code.startsAt)}</span>
            <span>تاريخ الانتهاء: ${formatDate(code.expiresAt)}</span>
            <span>${code.allowSave ? "حفظ الأعمال مفعل" : "حفظ الأعمال معطل"} | ${code.allowRegenerate ? "إعادة التوليد متاحة" : "إعادة التوليد غير متاحة"}</span>
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
}

function updateControlSegments() {
    studioElements.controlSegments.forEach((button) => {
        const group = button.dataset.controlGroup;
        const value = button.dataset.controlValue;
        button.classList.toggle("active", studioState.controls[group] === value);
    });
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
        ...buildControlsPayload(overrides)
    };

    if (payload.type === "video") {
        payload.duration = Number(overrides.duration || studioElements.durationValue.value);
    }

    return payload;
}

function renderAssistant(data) {
    const keywords = Array.isArray(data.keywords) && data.keywords.length ? data.keywords : ["-"];
    const styles = Array.isArray(data.suggestedStyles) && data.suggestedStyles.length ? data.suggestedStyles : ["-"];
    const notes = Array.isArray(data.notes) && data.notes.length ? data.notes : ["لا توجد ملاحظات إضافية."];

    studioElements.assistant.innerHTML = `
        <div class="insights-grid">
            <div class="insight-card">
                <span class="insight-label">فهم النص</span>
                <strong>${escapeHtml(data.subject || "المشهد الرئيسي")}</strong>
                <p>${escapeHtml(data.environment || "بيئة غير محددة بعد")} | ${escapeHtml(data.mood || "-")}</p>
            </div>
            <div class="insight-card">
                <span class="insight-label">الوقت والستايل</span>
                <strong>${escapeHtml(data.timeOfDayLabel || "-")} | ${escapeHtml(data.styleLabel || styles[0])}</strong>
                <p>${escapeHtml(data.lighting || "-")} | ${escapeHtml(data.cameraAngleLabel || data.cameraAngle || "-")}</p>
            </div>
        </div>
        <div class="insights-grid">
            <div class="insight-card">
                <span class="insight-label">الكلمات المفتاحية</span>
                <strong>${escapeHtml(keywords.join(" / "))}</strong>
                <p>${escapeHtml(styles.join(" / "))}</p>
            </div>
            <div class="insight-card">
                <span class="insight-label">الإخراج النهائي</span>
                <strong>${escapeHtml(data.qualityLabel || data.qualityLevel || "-")}</strong>
                <p>${escapeHtml(data.aspectRatio || "-")} | ${escapeHtml(data.motionHint || "-")}</p>
            </div>
        </div>
        <div class="enhanced-box">
            <span class="insight-label">الوصف الأصلي</span>
            <p>${escapeHtml(data.originalPrompt || studioElements.prompt.value.trim())}</p>
        </div>
        <div class="enhanced-box">
            <span class="insight-label">الوصف المحسن</span>
            <p>${escapeHtml(data.enhancedPrompt || "-")}</p>
        </div>
        <div class="enhanced-box">
            <span class="insight-label">ملاحظات المساعد</span>
            <p>${escapeHtml(notes.join(" | "))}</p>
        </div>
    `;
}

function buildResultActions(work) {
    const regenerateButton = studioState.meta?.allowRegenerate ? `
        <button class="card-button" type="button" data-result-action="regenerate">إعادة توليد</button>
        <button class="card-button" type="button" data-result-action="highres">نسخة بجودة عالية</button>
    ` : "";

    return `
        <a class="card-button" href="${escapeHtml(work.fileUrl)}" target="_blank" rel="noreferrer">تحميل / عرض</a>
        <a class="card-button" href="library.html?code=${encodeURIComponent(studioState.code)}">مكتبة الأعمال</a>
        <button class="card-button" type="button" data-result-action="saved">${work.saved ? "محفوظ في المكتبة" : "غير محفوظ"}</button>
        ${regenerateButton}
    `;
}

function renderLatest(work, intelligence) {
    const typeLabel = work.type === "video" ? `فيديو ${work.duration || ""} ثانية` : "صورة";
    const qualityLabel = work.qualityLabel || intelligence.qualityLabel || getLabel("outputQuality", work.outputQuality || "high");
    const timeLabel = work.timeOfDayLabel || intelligence.timeOfDayLabel || "-";
    const styleLabel = work.styleLabel || intelligence.styleLabel || "-";

    studioElements.latest.classList.remove("hidden");
    studioElements.latest.innerHTML = `
        <div class="section-head">
            <div>
                <p class="section-kicker">النتيجة الأخيرة</p>
                <h3>تم الإنشاء بنجاح</h3>
            </div>
        </div>
        <article class="result-showcase">
            <div class="result-preview-frame">
                <img src="${escapeHtml(work.previewUrl)}" alt="${escapeHtml(typeLabel)}">
            </div>
            <div class="result-copy">
                <div class="work-topline">
                    <span class="mini-badge">${escapeHtml(typeLabel)}</span>
                    <span class="work-meta">${formatDate(work.createdAt)}</span>
                </div>
                <p class="work-prompt">${escapeHtml(work.originalPrompt || work.prompt)}</p>
                <div class="result-meta-grid">
                    <div class="insight-card compact-card"><span class="insight-label">الوقت</span><strong>${escapeHtml(timeLabel)}</strong></div>
                    <div class="insight-card compact-card"><span class="insight-label">الستايل</span><strong>${escapeHtml(styleLabel)}</strong></div>
                    <div class="insight-card compact-card"><span class="insight-label">الجودة</span><strong>${escapeHtml(qualityLabel)}</strong></div>
                    <div class="insight-card compact-card"><span class="insight-label">زاوية التصوير</span><strong>${escapeHtml(work.cameraAngleLabel || intelligence.cameraAngleLabel || "-")}</strong></div>
                </div>
                <div class="enhanced-box">
                    <span class="insight-label">الوصف المحسن</span>
                    <p>${escapeHtml(work.enhancedPrompt || intelligence.enhancedPrompt || "-")}</p>
                </div>
                <div class="work-actions result-actions">
                    ${buildResultActions(work)}
                </div>
            </div>
        </article>
    `;
}

function renderWorks() {
    let works = [...studioState.works];
    if (studioState.workFilter !== "all") {
        works = works.filter((work) => work.type === studioState.workFilter);
    }

    studioElements.worksGrid.innerHTML = works.length ? works.slice(0, 6).map((work) => `
        <article class="work-card">
            <img src="${escapeHtml(work.previewUrl)}" alt="${escapeHtml(work.type)}">
            <div class="work-content">
                <div class="work-topline">
                    <span class="mini-badge">${work.type === "video" ? `فيديو ${work.duration || ""} ثانية` : "صورة"}</span>
                    <span class="work-meta">${formatDate(work.createdAt)}</span>
                </div>
                <p class="work-prompt">${escapeHtml(work.prompt)}</p>
                <div class="summary-list work-insights-list">
                    <span>الوقت: ${escapeHtml(work.timeOfDayLabel || "-")}</span>
                    <span>الستايل: ${escapeHtml(work.styleLabel || "-")}</span>
                    <span>الجودة: ${escapeHtml(work.qualityLabel || "-")}</span>
                </div>
                <div class="work-actions">
                    <a class="card-button" href="${escapeHtml(work.fileUrl)}" target="_blank" rel="noreferrer">فتح</a>
                </div>
            </div>
        </article>
    `).join("") : `<div class="empty-state">لا توجد أعمال لهذا الفلتر.</div>`;
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
                <span>الحالة: ${escapeHtml(humanStatus(code.status))}</span>
                <span>العميل: ${escapeHtml(code.clientName || "-")}</span>
                <span>صور: ${code.remainingImages} / ${code.maxImages}</span>
                <span>فيديو: ${code.remainingVideos} / ${code.maxVideos}</span>
            </div>
            <div class="work-actions">
                <button class="card-button" type="button" data-admin-select="${escapeHtml(code.code)}">تفاصيل</button>
                <button class="card-button" type="button" data-admin-toggle="${escapeHtml(code.code)}" data-active="${code.isActive}">
                    ${code.isActive ? "تعطيل" : "تفعيل"}
                </button>
            </div>
        </article>
    `).join("") : `<div class="empty-state">لا توجد أكواد مطابقة.</div>`;
}

function renderAdminSelectedCode(detail) {
    if (!detail) {
        studioElements.adminSelectedCode.innerHTML = `<div class="empty-state">اختر كودًا من تبويب الأكواد لعرض الرصيد والصلاحيات.</div>`;
        studioElements.adminActivity.innerHTML = `<div class="empty-state">اختر كودًا لعرض السجل.</div>`;
        return;
    }

    studioElements.adminSelectedCode.innerHTML = `
        <div class="enhanced-box">
            <span class="insight-label">${escapeHtml(detail.code.code)}</span>
            <p>${escapeHtml(detail.code.name)} | ${escapeHtml(detail.code.badgeLabel)} | ${escapeHtml(humanPriority(detail.code.processingPriority))}</p>
            <p>صور: ${detail.code.remainingImages}/${detail.code.maxImages} | فيديو: ${detail.code.remainingVideos}/${detail.code.maxVideos}</p>
            <p>مدد الفيديو: ${detail.code.allowedDurations.join(" / ") || "-"}</p>
            <p>${detail.code.allowSave ? "يحفظ الأعمال" : "بدون حفظ"} | ${detail.code.allowRegenerate ? "إعادة التوليد متاحة" : "إعادة التوليد معطلة"}</p>
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
    `).join("") : `<div class="empty-state">لا توجد عمليات لهذا الكود.</div>`;
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

function setBusyState(isBusy) {
    studioElements.generateButton.disabled = isBusy;
    studioElements.analyzeButton.disabled = isBusy;
}

async function analyzePrompt() {
    const prompt = studioElements.prompt.value.trim();
    if (!prompt) {
        setStudioMessage("اكتب وصفًا أولًا.", "error");
        return null;
    }

    const response = await studioApi("/api/prompt-intelligence/analyze", {
        method: "POST",
        body: JSON.stringify({
            prompt,
            type: studioElements.type.value,
            ...buildControlsPayload()
        })
    });

    studioState.lastIntelligence = response.data;
    renderAssistant(response.data);
    setStudioMessage("تم تحليل الوصف وتحسينه.", "success");
    return response.data;
}

async function performGeneration(overrides = {}) {
    const payload = buildGenerationPayload(overrides);

    if (!payload.prompt) {
        setStudioMessage("اكتب وصفًا أولًا.", "error");
        return;
    }

    setBusyState(true);
    setStudioMessage("جارٍ إنشاء النتيجة...", "info");

    try {
        const response = await studioApi("/api/content/generate", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        studioState.lastPayload = payload;
        studioState.lastIntelligence = response.data.intelligence;

        await loadWorkspace();
        renderAssistant(response.data.intelligence);
        renderLatest(response.data.work, response.data.intelligence);
        setStudioMessage(response.data.saved ? "تم إنشاء العمل وحفظه داخل المكتبة." : "تم إنشاء العمل.", "success");
    } catch (error) {
        setStudioMessage(error.message, "error");
    } finally {
        setBusyState(false);
    }
}

studioElements.refresh.addEventListener("click", async () => {
    try {
        await loadWorkspace();
        setStudioMessage("تم تحديث بيانات الكود.", "success");
    } catch (error) {
        setStudioMessage(error.message, "error");
    }
});

studioElements.type.addEventListener("change", updateMode);

studioElements.durationOptions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-duration]");
    if (!button || button.disabled) {
        return;
    }

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
        setStudioMessage(error.message, "error");
    } finally {
        setBusyState(false);
    }
});

studioElements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await performGeneration();
});

studioElements.latest.addEventListener("click", async (event) => {
    const actionButton = event.target.closest("[data-result-action]");
    if (!actionButton) {
        return;
    }

    const action = actionButton.dataset.resultAction;
    if (action === "saved") {
        window.location.href = `library.html?code=${encodeURIComponent(studioState.code)}`;
        return;
    }

    if (!studioState.lastPayload) {
        setStudioMessage("أنشئ نتيجة أولًا ثم أعد التوليد.", "error");
        return;
    }

    if (action === "regenerate") {
        await performGeneration(studioState.lastPayload);
        return;
    }

    if (action === "highres") {
        await performGeneration({
            ...studioState.lastPayload,
            outputQuality: "ultra"
        });
    }
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
        setAdminMessage("تم تسجيل دخول الأدمن بنجاح.", "success", true);
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

studioElements.adminQuickCreate.addEventListener("click", () => {
    switchAdminTab("create");
});

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
            setAdminMessage(`تم تحميل بيانات الكود ${selectButton.dataset.adminSelect}.`, "success");
        } catch (error) {
            setAdminMessage(error.message, "error");
        }
        return;
    }

    if (toggleButton) {
        try {
            await adminApi(`/api/admin/codes/${encodeURIComponent(toggleButton.dataset.adminToggle)}`, {
                method: "PATCH",
                body: JSON.stringify({
                    isActive: toggleButton.dataset.active !== "true"
                })
            });
            await loadAdminCodes();
            setAdminMessage("تم تحديث حالة الكود.", "success");
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
        setAdminMessage("تم إنشاء الكود من اللوحة الجانبية.", "success");
        await loadAdminCodes();
        switchAdminTab("codes");
    } catch (error) {
        setAdminMessage(error.message, "error");
    }
});

studioElements.adminLogout.addEventListener("click", async () => {
    try {
        await adminApi("/api/admin/logout", {
            method: "POST",
            body: JSON.stringify({})
        });
    } catch (error) {
        // Ignore logout response errors.
    }

    studioState.adminToken = "";
    studioState.adminCodes = [];
    studioState.selectedAdminCode = null;
    localStorage.removeItem(adminTokenKey);
    studioElements.adminDashboard.classList.add("hidden");
    studioElements.adminAuthView.classList.remove("hidden");
    setAdminMessage("تم تسجيل الخروج.", "success", true);
});

updateControlSegments();

(async () => {
    try {
        await loadWorkspace();
    } catch (error) {
        setStudioMessage(error.message, "error");
    }
})();

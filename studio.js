const adminTokenKey = "creditsAdminToken";

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
    selectedAdminCode: null
};

const studioElements = {
    codeSummary: document.getElementById("code-summary"),
    headerCodeBadge: document.getElementById("header-code-badge"),
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
    return String(value)
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
    const payload = await response.json().catch(() => ({
        success: false,
        message: "تعذر قراءة الاستجابة."
    }));

    if (!response.ok || payload.success === false) {
        throw new Error(payload.message || "حدث خطأ غير متوقع.");
    }

    return payload;
}

async function adminApi(url, options = {}) {
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

function renderSummary(code) {
    studioElements.headerCodeBadge.innerHTML = `
        <strong>${escapeHtml(code.code)}</strong>
        <span>${escapeHtml(code.clientName || code.badgeLabel)}</span>
    `;
    studioElements.codeSummary.innerHTML = `
        <div class="summary-headline">
            <div>
                <h3>${escapeHtml(code.name)}</h3>
                <p class="summary-meta">${escapeHtml(code.badgeLabel)} | ${escapeHtml(code.status)} | أولوية ${escapeHtml(code.processingPriority)}</p>
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
            <span>${code.allowSave ? "الحفظ مفعل" : "الحفظ معطل"} | ${code.allowRegenerate ? "إعادة التوليد متاحة" : "إعادة التوليد غير متاحة"}</span>
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

function renderAssistant(data) {
    studioElements.assistant.innerHTML = `
        <div class="insights-grid">
            <div class="insight-card">
                <span class="insight-label">تحسين الوصف</span>
                <strong>${escapeHtml(data.qualityLevel)}</strong>
                <p>${escapeHtml(data.notes.join(" | "))}</p>
            </div>
            <div class="insight-card">
                <span class="insight-label">الستايل والكلمات</span>
                <strong>${escapeHtml(data.suggestedStyles.join(" / "))}</strong>
                <p>${escapeHtml(data.keywords.join(" / "))}</p>
            </div>
        </div>
        <div class="insights-grid">
            <div class="insight-card">
                <span class="insight-label">الجو العام</span>
                <strong>${escapeHtml(data.mood)}</strong>
                <p>${escapeHtml(data.lighting)} | ${escapeHtml(data.cameraAngle)}</p>
            </div>
            <div class="insight-card">
                <span class="insight-label">الإخراج</span>
                <strong>${escapeHtml(data.aspectRatio)}</strong>
                <p>${escapeHtml(data.motionHint)}</p>
            </div>
        </div>
        <div class="enhanced-box">
            <span class="insight-label">الوصف المحسن</span>
            <p>${escapeHtml(data.enhancedPrompt)}</p>
        </div>
    `;
}

function renderLatest(work, intelligence) {
    const typeLabel = work.type === "video" ? `فيديو ${work.duration || ""} ثانية` : "صورة";
    studioElements.latest.classList.remove("hidden");
    studioElements.latest.innerHTML = `
        <div class="section-head">
            <div>
                <p class="section-kicker">النتيجة الأخيرة</p>
                <h3>تم إنشاء العمل بنجاح</h3>
            </div>
        </div>
        <article class="work-card">
            <img src="${escapeHtml(work.previewUrl)}" alt="${escapeHtml(typeLabel)}">
            <div class="work-content">
                <div class="work-topline">
                    <span class="mini-badge">${typeLabel}</span>
                    <span class="work-meta">${formatDate(work.createdAt)}</span>
                </div>
                <p class="work-prompt">${escapeHtml(work.prompt)}</p>
                <div class="work-actions">
                    <a class="card-button" href="${escapeHtml(work.fileUrl)}" target="_blank" rel="noreferrer">تحميل / عرض</a>
                    <a class="card-button" href="/library?code=${encodeURIComponent(studioState.code)}">كل المكتبة</a>
                </div>
            </div>
        </article>
        <div class="assistant-output compact-output">
            <div class="enhanced-box">
                <span class="insight-label">المحرك الذكي استخدم</span>
                <p>${escapeHtml(intelligence.enhancedPrompt)}</p>
            </div>
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
            <img src="${escapeHtml(work.previewUrl)}" alt="${escapeHtml(work.type)}">
            <div class="work-content">
                <div class="work-topline">
                    <span class="mini-badge">${work.type === "video" ? `فيديو ${work.duration || ""} ثانية` : "صورة"}</span>
                    <span class="work-meta">${formatDate(work.createdAt)}</span>
                </div>
                <p class="work-prompt">${escapeHtml(work.prompt)}</p>
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
        window.location.href = "/";
        return;
    }

    sessionStorage.setItem("activeCreditsCode", studioState.code);
    studioElements.libraryLink.href = `/library?code=${encodeURIComponent(studioState.code)}`;
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
        const matchesSearch = !studioState.adminSearch
            || code.code.toLowerCase().includes(studioState.adminSearch)
            || (code.name || "").toLowerCase().includes(studioState.adminSearch)
            || (code.clientName || "").toLowerCase().includes(studioState.adminSearch);
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
            <div class="summary-list">
                <span>الحالة: ${escapeHtml(code.status)}</span>
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
            <p>${escapeHtml(detail.code.name)} | ${escapeHtml(detail.code.badgeLabel)} | ${escapeHtml(detail.code.processingPriority)}</p>
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
    if (!studioElements.prompt.value.trim()) {
        setStudioMessage("اكتب وصفًا أولًا.", "error");
        return;
    }

    try {
        const response = await studioApi("/api/prompt-intelligence/analyze", {
            method: "POST",
            body: JSON.stringify({
                prompt: studioElements.prompt.value,
                type: studioElements.type.value
            })
        });
        renderAssistant(response.data);
        setStudioMessage("تم تحليل الوصف وتحسينه.", "success");
    } catch (error) {
        setStudioMessage(error.message, "error");
    }
});

studioElements.form.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        setStudioMessage("جارٍ إنشاء النتيجة...", "info");
        const response = await studioApi("/api/content/generate", {
            method: "POST",
            body: JSON.stringify({
                code: studioState.code,
                prompt: studioElements.prompt.value,
                type: studioElements.type.value,
                duration: studioElements.type.value === "video" ? Number(studioElements.durationValue.value) : undefined
            })
        });
        await loadWorkspace();
        renderAssistant(response.data.intelligence);
        renderLatest(response.data.work, response.data.intelligence);
        setStudioMessage(response.data.saved ? "تم إنشاء العمل وحفظه داخل المكتبة." : "تم إنشاء العمل.", "success");
    } catch (error) {
        setStudioMessage(error.message, "error");
    }
});

studioElements.openAdmin.addEventListener("click", async () => {
    openAdminOverlay();
    await loadAdminSessionIfAny();
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
    tab.addEventListener("click", () => {
        switchAdminTab(tab.dataset.adminTab);
    });
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

(async () => {
    try {
        await loadWorkspace();
    } catch (error) {
        setStudioMessage(error.message, "error");
    }
})();

const libraryState = {
    code: null,
    meta: null,
    works: [],
    activity: [],
    filter: "all"
};

const libraryElements = {
    backToStudio: document.getElementById("back-to-studio"),
    backToStudioTop: document.getElementById("back-to-studio-top"),
    badgeText: document.getElementById("library-badge-text"),
    refresh: document.getElementById("refresh-library"),
    message: document.getElementById("library-message"),
    summary: document.getElementById("library-summary"),
    works: document.getElementById("library-works"),
    activity: document.getElementById("activity-list"),
    filters: [...document.querySelectorAll("[data-filter]")]
};

function setLibraryMessage(text, type = "info") {
    libraryElements.message.textContent = text || "";
    libraryElements.message.className = text ? `message ${type}` : "message";
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

async function libraryApi(url, options = {}) {
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

function renderSummary() {
    const code = libraryState.meta;
    libraryElements.badgeText.textContent = `${code.badgeLabel} | ${code.code}`;
    libraryElements.summary.innerHTML = `
        <div class="summary-headline">
            <div>
                <h3>${escapeHtml(code.name)}</h3>
                <p class="summary-meta">${escapeHtml(code.clientName || "-")} | أولوية ${escapeHtml(code.processingPriority)}</p>
            </div>
            <span class="mini-badge">${escapeHtml(code.status)}</span>
        </div>
        <div class="summary-metrics">
            <div class="metric"><span>الأعمال</span><strong>${libraryState.works.length}</strong></div>
            <div class="metric"><span>الصور المتبقية</span><strong>${code.remainingImages}</strong></div>
            <div class="metric"><span>الفيديوهات المتبقية</span><strong>${code.remainingVideos}</strong></div>
        </div>
    `;
}

function renderWorks() {
    let works = [...libraryState.works];
    if (libraryState.filter !== "all") {
        works = works.filter((work) => work.type === libraryState.filter);
    }

    libraryElements.works.innerHTML = works.length ? works.map((work) => `
        <article class="work-card">
            <img src="${escapeHtml(work.previewUrl)}" alt="${escapeHtml(work.type)}">
            <div class="work-content">
                <div class="work-topline">
                    <span class="mini-badge">${work.type === "video" ? `فيديو ${work.duration || ""} ثانية` : "صورة"}</span>
                    <span class="work-meta">${formatDate(work.createdAt)}</span>
                </div>
                <p class="work-prompt">${escapeHtml(work.prompt)}</p>
                <div class="work-actions">
                    <a class="card-button" href="${escapeHtml(work.fileUrl)}" target="_blank" rel="noreferrer">تحميل / عرض</a>
                </div>
            </div>
        </article>
    `).join("") : `<div class="empty-state">لا توجد عناصر لهذا الفلتر.</div>`;
}

function renderActivity() {
    libraryElements.activity.innerHTML = libraryState.activity.length ? libraryState.activity.map((event) => `
        <article class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <strong>${escapeHtml(event.message)}</strong>
                <p class="work-meta">${escapeHtml(event.action)} | ${formatDate(event.createdAt)}</p>
            </div>
        </article>
    `).join("") : `<div class="empty-state">لا توجد عمليات مسجلة بعد.</div>`;
}

async function loadLibrary() {
    libraryState.code = getCodeFromLocation();
    if (!libraryState.code) {
        window.location.href = "/index.html";
        return;
    }

    sessionStorage.setItem("activeCreditsCode", libraryState.code);
    libraryElements.backToStudio.href = `/studio.html?code=${encodeURIComponent(libraryState.code)}`;
    if (libraryElements.backToStudioTop) {
        libraryElements.backToStudioTop.href = `/studio.html?code=${encodeURIComponent(libraryState.code)}`;
    }
    const [lookupResponse, activityResponse] = await Promise.all([
        libraryApi("/api/codes/lookup", {
            method: "POST",
            body: JSON.stringify({ code: libraryState.code })
        }),
        libraryApi(`/api/codes/${encodeURIComponent(libraryState.code)}/activity`)
    ]);
    libraryState.meta = lookupResponse.data.code;
    libraryState.works = lookupResponse.data.works || [];
    libraryState.activity = activityResponse.data.activity || [];
    renderSummary();
    renderWorks();
    renderActivity();
}

libraryElements.filters.forEach((button) => {
    button.addEventListener("click", () => {
        libraryState.filter = button.dataset.filter;
        libraryElements.filters.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        renderWorks();
    });
});

libraryElements.refresh.addEventListener("click", async () => {
    try {
        await loadLibrary();
        setLibraryMessage("تم تحديث المكتبة والسجل.", "success");
    } catch (error) {
        setLibraryMessage(error.message, "error");
    }
});

(async () => {
    try {
        await loadLibrary();
    } catch (error) {
        setLibraryMessage(error.message, "error");
    }
})();

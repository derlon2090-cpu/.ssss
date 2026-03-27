const adminTokenKey = "creditsAdminToken";
const adminState = {
    token: localStorage.getItem(adminTokenKey) || "",
    codes: []
};

const dashboardElements = {
    sessionLabel: document.getElementById("admin-session-label"),
    logoutButton: document.getElementById("admin-logout"),
    form: document.getElementById("admin-code-form"),
    message: document.getElementById("admin-form-message"),
    codesGrid: document.getElementById("admin-codes-grid"),
    refreshButton: document.getElementById("refresh-admin-codes"),
    activity: document.getElementById("admin-activity")
};

function setDashboardMessage(text, type = "info") {
    dashboardElements.message.textContent = text || "";
    dashboardElements.message.className = text ? `message ${type}` : "message";
}

async function adminApi(url, options = {}) {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminState.token}`,
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

function checkedDurations() {
    return [...document.querySelectorAll('input[name="allowedDurations"]:checked')].map((input) => Number(input.value));
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function renderCodes() {
    if (!adminState.codes.length) {
        dashboardElements.codesGrid.innerHTML = `<div class="empty-state">لا توجد أكواد حتى الآن.</div>`;
        return;
    }

    dashboardElements.codesGrid.innerHTML = adminState.codes.map((code) => `
        <article class="code-card">
            <div class="work-topline">
                <div>
                    <strong>${escapeHtml(code.code)}</strong>
                    <div class="work-meta">${escapeHtml(code.name)}</div>
                </div>
                <span class="mini-badge">${escapeHtml(code.badgeLabel)}</span>
            </div>
            <div class="summary-list">
                <span>العميل: ${escapeHtml(code.clientName || "-")}</span>
                <span>الأولوية: ${escapeHtml(code.processingPriority)}</span>
                <span>صور: ${code.remainingImages} / ${code.maxImages}</span>
                <span>فيديو: ${code.remainingVideos} / ${code.maxVideos}</span>
                <span>الحالة: ${escapeHtml(code.status)}</span>
                <span>المنشئ: ${escapeHtml(code.createdBy || "-")}</span>
            </div>
            <div class="work-actions">
                <button class="card-button" type="button" data-view="${escapeHtml(code.code)}">عرض السجل</button>
                <button class="card-button" type="button" data-copy="${escapeHtml(code.code)}">نسخ الكود</button>
                <button class="card-button" type="button" data-toggle="${escapeHtml(code.code)}" data-active="${code.isActive}">
                    ${code.isActive ? "تعطيل" : "تفعيل"}
                </button>
            </div>
        </article>
    `).join("");
}

function renderActivity(activity) {
    dashboardElements.activity.innerHTML = activity.length ? activity.map((event) => `
        <article class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <strong>${escapeHtml(event.message)}</strong>
                <p class="work-meta">${escapeHtml(event.action)} | ${new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.createdAt))}</p>
            </div>
        </article>
    `).join("") : `<div class="empty-state">لا توجد عمليات مسجلة لهذا الكود.</div>`;
}

async function loadSession() {
    if (!adminState.token) {
        window.location.href = "/admin-login.html";
        return;
    }

    try {
        const response = await adminApi("/api/admin/session");
        dashboardElements.sessionLabel.textContent = `مسجل كـ ${response.data.username}`;
    } catch (error) {
        localStorage.removeItem(adminTokenKey);
        window.location.href = "/admin-login.html";
    }
}

async function loadCodes() {
    const response = await adminApi("/api/admin/codes");
    adminState.codes = response.data.codes;
    renderCodes();
}

dashboardElements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(dashboardElements.form);

    try {
        await adminApi("/api/admin/codes", {
            method: "POST",
            body: JSON.stringify({
                code: formData.get("code"),
                name: formData.get("name"),
                clientName: formData.get("clientName"),
                createdBy: formData.get("createdBy"),
                planType: formData.get("planType"),
                processingPriority: formData.get("processingPriority"),
                maxImages: Number(formData.get("maxImages")),
                maxVideos: Number(formData.get("maxVideos")),
                startsAt: formData.get("startsAt") || null,
                expiresAt: formData.get("expiresAt") || null,
                allowedDurations: checkedDurations(),
                allowRegenerate: formData.get("allowRegenerate") === "on",
                allowSave: formData.get("allowSave") === "on",
                isActive: formData.get("isActive") === "on",
                internalNotes: formData.get("internalNotes")
            })
        });
        setDashboardMessage("تم إنشاء الكود بنجاح.", "success");
        dashboardElements.form.reset();
        await loadCodes();
    } catch (error) {
        setDashboardMessage(error.message, "error");
    }
});

dashboardElements.codesGrid.addEventListener("click", async (event) => {
    const copyButton = event.target.closest("[data-copy]");
    const toggleButton = event.target.closest("[data-toggle]");
    const viewButton = event.target.closest("[data-view]");

    if (copyButton) {
        await navigator.clipboard.writeText(copyButton.dataset.copy);
        setDashboardMessage("تم نسخ الكود.", "success");
        return;
    }

    if (viewButton) {
        try {
            const response = await adminApi(`/api/admin/codes/${viewButton.dataset.view}`);
            renderActivity(response.data.activity || []);
            setDashboardMessage(`تم تحميل سجل الكود ${viewButton.dataset.view}.`, "success");
        } catch (error) {
            setDashboardMessage(error.message, "error");
        }
        return;
    }

    if (toggleButton) {
        try {
            await adminApi(`/api/admin/codes/${toggleButton.dataset.toggle}`, {
                method: "PATCH",
                body: JSON.stringify({
                    isActive: toggleButton.dataset.active !== "true"
                })
            });
            setDashboardMessage("تم تحديث حالة الكود.", "success");
            await loadCodes();
        } catch (error) {
            setDashboardMessage(error.message, "error");
        }
    }
});

dashboardElements.refreshButton.addEventListener("click", async () => {
    try {
        await loadCodes();
    } catch (error) {
        setDashboardMessage(error.message, "error");
    }
});

dashboardElements.logoutButton.addEventListener("click", async () => {
    try {
        await adminApi("/api/admin/logout", {
            method: "POST",
            body: JSON.stringify({})
        });
    } catch (error) {
        // Ignore logout response errors and clear local state anyway.
    }

    localStorage.removeItem(adminTokenKey);
    window.location.href = "/admin-login.html";
});

(async () => {
    await loadSession();
    await loadCodes();
})();

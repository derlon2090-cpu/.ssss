const lookupForm = document.getElementById("lookup-form");
const lookupCode = document.getElementById("lookup-code");
const lookupMessage = document.getElementById("lookup-message");
const startNowButton = document.getElementById("start-now-button");
const lookupSection = document.getElementById("lookup-section");
const openHomeAdmin = document.getElementById("open-home-admin");
const openHomeAdminSecondary = document.getElementById("open-home-admin-secondary");
const closeHomeAdmin = document.getElementById("close-home-admin");
const homeAdminOverlay = document.getElementById("home-admin-overlay");
const homeAdminBackdrop = document.querySelector("[data-close-home-admin='true']");
const homeAdminLogin = document.getElementById("home-admin-login");
const homeAdminMessage = document.getElementById("home-admin-message");
const contactForm = document.getElementById("contact-form");
const contactMessage = document.getElementById("contact-message");

function setLookupMessage(text, type = "info") {
    lookupMessage.textContent = text || "";
    lookupMessage.className = text ? `message ${type}` : "message";
}

function setAdminMessage(text, type = "info") {
    homeAdminMessage.textContent = text || "";
    homeAdminMessage.className = text ? `message ${type}` : "message";
}

function setContactMessage(text, type = "info") {
    contactMessage.textContent = text || "";
    contactMessage.className = text ? `message ${type}` : "message";
}

async function api(url, options = {}) {
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

function openAdminOverlay() {
    homeAdminOverlay.classList.remove("hidden");
}

function closeAdminOverlay() {
    homeAdminOverlay.classList.add("hidden");
}

startNowButton.addEventListener("click", () => {
    lookupSection.scrollIntoView({ behavior: "smooth", block: "start" });
    lookupCode.focus();
});

openHomeAdmin.addEventListener("click", openAdminOverlay);
openHomeAdminSecondary.addEventListener("click", openAdminOverlay);
closeHomeAdmin.addEventListener("click", closeAdminOverlay);
homeAdminBackdrop.addEventListener("click", closeAdminOverlay);

lookupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        const code = lookupCode.value.trim();
        await api("/api/codes/lookup", {
            method: "POST",
            body: JSON.stringify({ code })
        });
        sessionStorage.setItem("activeCreditsCode", code.toUpperCase());
        window.location.href = `/studio?code=${encodeURIComponent(code.toUpperCase())}`;
    } catch (error) {
        setLookupMessage(error.message, "error");
    }
});

homeAdminLogin.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(homeAdminLogin);

    try {
        const response = await api("/api/admin/login", {
            method: "POST",
            body: JSON.stringify({
                username: formData.get("username"),
                password: formData.get("password"),
                securityCode: formData.get("securityCode")
            })
        });
        localStorage.setItem("creditsAdminToken", response.data.token);
        window.location.href = "/admin/dashboard";
    } catch (error) {
        setAdminMessage(error.message, "error");
    }
});

contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(contactForm);

    try {
        await api("/api/contact-submissions", {
            method: "POST",
            body: JSON.stringify({
                name: formData.get("name"),
                email: formData.get("email"),
                message: formData.get("message")
            })
        });
        contactForm.reset();
        setContactMessage("تم إرسال اقتراحك بنجاح، وسيظهر داخل لوحة الأدمن.", "success");
    } catch (error) {
        setContactMessage(error.message, "error");
    }
});

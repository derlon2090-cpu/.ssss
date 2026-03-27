const loginForm = document.getElementById("admin-login-form");
const loginMessage = document.getElementById("login-message");

function setLoginMessage(text, type = "info") {
    loginMessage.textContent = text || "";
    loginMessage.className = text ? `message ${type}` : "message";
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

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);

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
        setLoginMessage(error.message, "error");
    }
});

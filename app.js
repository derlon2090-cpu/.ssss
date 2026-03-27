const lookupForm = document.getElementById("lookup-form");
const lookupCode = document.getElementById("lookup-code");
const lookupMessage = document.getElementById("lookup-message");

function setLookupMessage(text, type = "info") {
    lookupMessage.textContent = text || "";
    lookupMessage.className = text ? `message ${type}` : "message";
}

async function api(url, options = {}) {
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

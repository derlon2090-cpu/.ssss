(function () {
    const KEY = "smart_credits_site_theme";
    const dayTheme = {
        "--bg": "#f2eadf",
        "--bg-deep": "#102a43",
        "--panel": "rgba(255, 250, 244, 0.88)",
        "--panel-border": "rgba(16, 42, 67, 0.12)",
        "--text": "#1c2a3a",
        "--muted": "#5d6d7d",
        "--accent": "#cf6a2c",
        "--accent-strong": "#b84e13",
        "--secondary": "#1f7a8c",
        "--shadow": "0 20px 45px rgba(16, 42, 67, 0.14)"
    };
    const nightTheme = {
        "--bg": "#08111a",
        "--bg-deep": "#eff6ff",
        "--panel": "rgba(10, 22, 34, 0.84)",
        "--panel-border": "rgba(148, 197, 255, 0.12)",
        "--text": "#e7eef7",
        "--muted": "#a7b8ca",
        "--accent": "#f59e0b",
        "--accent-strong": "#d97706",
        "--secondary": "#38bdf8",
        "--shadow": "0 22px 55px rgba(0, 0, 0, 0.34)"
    };

    function getTheme() {
        return localStorage.getItem(KEY) === "night" ? "night" : "day";
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        const tokens = theme === "night" ? nightTheme : dayTheme;
        Object.entries(tokens).forEach(([key, value]) => {
            document.documentElement.style.setProperty(key, value);
        });
        document.body.style.background = theme === "night"
            ? "radial-gradient(circle at top right, rgba(245, 158, 11, 0.12), transparent 28%), radial-gradient(circle at bottom left, rgba(56, 189, 248, 0.12), transparent 30%), linear-gradient(135deg, #07111b 0%, #0e2030 100%)"
            : "radial-gradient(circle at top right, rgba(207, 106, 44, 0.16), transparent 28%), radial-gradient(circle at bottom left, rgba(31, 122, 140, 0.16), transparent 30%), linear-gradient(135deg, #f6efe3 0%, #e5eef2 100%)";
        document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
            const nextTheme = theme === "night" ? "day" : "night";
            button.dataset.themeValue = nextTheme;
            button.textContent = theme === "night" ? "الوضع الشمسي" : "الوضع القمري";
            button.setAttribute("aria-label", theme === "night" ? "تفعيل الوضع الشمسي" : "تفعيل الوضع القمري");
        });
    }

    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-theme-toggle]");
        if (!button) {
            return;
        }

        const nextTheme = button.dataset.themeValue === "night" ? "night" : "day";
        localStorage.setItem(KEY, nextTheme);
        applyTheme(nextTheme);
    });

    applyTheme(getTheme());
})();

// ==========================================================================
// SMART BILLBOARD AI ANALYTICS - GLOBAL APP SCRIPT & THEME SWITCHER
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    initClock();
    initThemeIcon();
});

function initClock() {
    const clockEl = document.getElementById("liveClock");
    if (clockEl) {
        const updateClock = () => {
            const now = new Date();
            clockEl.textContent = now.toUTCString().split(" ")[4] + " UTC";
        };
        updateClock();
        setInterval(updateClock, 1000);
    }
}

function initThemeIcon() {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    updateThemeIcon(currentTheme);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById("themeIcon");
    if (icon) {
        if (theme === "light") {
            icon.className = "fa-solid fa-moon";
            icon.style.color = "#4f46e5";
        } else {
            icon.className = "fa-solid fa-sun";
            icon.style.color = "#f59e0b";
        }
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("billboard-theme", newTheme);
    updateThemeIcon(newTheme);

    // Notify any active charts or 3D canvases to adjust background/text colors
    window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: newTheme } }));
}

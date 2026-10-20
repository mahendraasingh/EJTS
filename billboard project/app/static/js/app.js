// Common global utilities and live clock
document.addEventListener("DOMContentLoaded", () => {
    // Live clock update
    const clockEl = document.getElementById("liveClock");
    if (clockEl) {
        const updateClock = () => {
            const now = new Date();
            clockEl.textContent = now.toUTCString().split(" ")[4] + " UTC";
        };
        updateClock();
        setInterval(updateClock, 1000);
    }
});

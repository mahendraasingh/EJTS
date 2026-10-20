// ==========================================================================
// SMART BILLBOARD AI ANALYTICS - SETTINGS SCRIPT
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    loadSettings();
});

async function loadSettings() {
    try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        const s = data.settings || {};

        setVal("settingCameraIndex", s.camera_index ?? 0);
        setVal("settingWidth", s.frame_width ?? 640);
        setVal("settingHeight", s.frame_height ?? 480);
        setVal("settingConf", s.confidence_threshold ?? 0.45);
        setVal("settingFps", s.inference_fps ?? 10);
        setVal("settingLostTimeout", s.lost_track_timeout ?? 2.5);
        setVal("settingMinSession", s.min_session_duration ?? 1.0);
        setVal("settingAdDuration", s.default_ad_duration ?? 10);

        const demoCheck = document.getElementById("settingDemoMode");
        if (demoCheck) demoCheck.checked = !!s.demonstration_mode;
    } catch (err) {
        console.error("Failed to load settings:", err);
    }
}

async function handleSaveSettings(event) {
    event.preventDefault();
    const btn = document.getElementById("saveSettingsBtn");
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

        const payload = {
            camera_index: parseInt(document.getElementById("settingCameraIndex").value, 10),
            frame_width: parseInt(document.getElementById("settingWidth").value, 10),
            frame_height: parseInt(document.getElementById("settingHeight").value, 10),
            confidence_threshold: parseFloat(document.getElementById("settingConf").value),
            inference_fps: parseInt(document.getElementById("settingFps").value, 10),
            lost_track_timeout: parseFloat(document.getElementById("settingLostTimeout").value),
            min_session_duration: parseFloat(document.getElementById("settingMinSession").value),
            default_ad_duration: parseInt(document.getElementById("settingAdDuration").value, 10),
            demonstration_mode: document.getElementById("settingDemoMode").checked
        };

        const res = await fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("Settings saved and applied successfully!");
        } else {
            const err = await res.json();
            alert(err.error || "Failed to update settings.");
        }
    } catch (e) {
        console.error("Save settings error:", e);
        alert("Failed to save settings. Please check server status.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Settings';
    }
}

async function handleResetDefaults() {
    if (!confirm("Are you sure you want to reset all settings to defaults?")) {
        return;
    }
    try {
        const res = await fetch("/api/settings/reset", { method: "POST" });
        if (res.ok) {
            await loadSettings();
            alert("Settings restored to factory defaults.");
        }
    } catch (e) {
        console.error("Reset settings error:", e);
    }
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

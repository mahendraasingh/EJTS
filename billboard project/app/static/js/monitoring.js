// ==========================================================================
// SMART BILLBOARD AI ANALYTICS - LIVE MONITORING SCRIPT
// ==========================================================================

let monitorPollInterval = null;

document.addEventListener("DOMContentLoaded", () => {
    fetchMonitoringStatus();
    monitorPollInterval = setInterval(fetchMonitoringStatus, 2000);
});

async function fetchMonitoringStatus() {
    try {
        const response = await fetch("/api/monitoring/status");
        const data = await response.json();

        // Update live stats
        setText("liveOccVal", `${data.zone_occupancy || 0} viewers`);
        setText("liveDetVal", `${data.detected_count || 0} people`);

        const cam = data.camera || {};
        setText("liveCamIndexVal", `Index ${cam.camera_index ?? 0}`);
        setText("feedFpsBadge", `${cam.actual_fps || 0.0} FPS`);

        const yolo = data.yolo || {};
        const yoloVal = document.getElementById("liveYoloVal");
        if (yoloVal) {
            yoloVal.textContent = yolo.is_loaded ? "YOLOv8n (CPU)" : "Ready / Standby";
            yoloVal.className = yolo.is_loaded ? "badge badge-success" : "badge badge-warning";
        }

        // Toggle start/stop button states
        const startBtn = document.getElementById("startPipelineBtn");
        const stopBtn = document.getElementById("stopPipelineBtn");
        if (startBtn && stopBtn) {
            startBtn.disabled = !!data.pipeline_active;
            stopBtn.disabled = !data.pipeline_active;
            startBtn.style.opacity = data.pipeline_active ? "0.5" : "1";
            stopBtn.style.opacity = !data.pipeline_active ? "0.5" : "1";
        }
    } catch (err) {
        console.warn("Failed to poll monitoring status:", err);
    }
}

async function startPipeline() {
    try {
        const btn = document.getElementById("startPipelineBtn");
        if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Starting...';
        
        const res = await fetch("/api/monitoring/start", { method: "POST" });
        if (res.ok) {
            refreshStream();
            await fetchMonitoringStatus();
        }
    } catch (e) {
        console.error("Start pipeline error:", e);
    } finally {
        const btn = document.getElementById("startPipelineBtn");
        if (btn) btn.innerHTML = '<i class="fa-solid fa-play"></i> Start Vision Pipeline';
    }
}

async function stopPipeline() {
    try {
        const res = await fetch("/api/monitoring/stop", { method: "POST" });
        if (res.ok) {
            await fetchMonitoringStatus();
        }
    } catch (e) {
        console.error("Stop pipeline error:", e);
    }
}

async function handleUpdateZone(event) {
    event.preventDefault();
    const zone = {
        x1: parseFloat(document.getElementById("zoneX1").value),
        y1: parseFloat(document.getElementById("zoneY1").value),
        x2: parseFloat(document.getElementById("zoneX2").value),
        y2: parseFloat(document.getElementById("zoneY2").value)
    };

    try {
        const res = await fetch("/api/monitoring/zone", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ zone })
        });
        const result = await res.json();
        if (res.ok) {
            alert("Monitoring zone ROI updated successfully!");
        } else {
            alert(result.error || "Failed to update zone.");
        }
    } catch (e) {
        console.error("Zone update error:", e);
        alert("Network error updating monitoring zone.");
    }
}

function resetDefaultZone() {
    document.getElementById("zoneX1").value = 0.20;
    document.getElementById("zoneY1").value = 0.15;
    document.getElementById("zoneX2").value = 0.80;
    document.getElementById("zoneY2").value = 0.90;
    document.querySelector("form").dispatchEvent(new Event("submit"));
}

function refreshStream() {
    const feed = document.getElementById("liveVideoFeed");
    if (feed) {
        feed.src = `/video_feed?t=${Date.now()}`;
    }
}

function toggleFeedFullscreen() {
    const wrapper = document.getElementById("videoFeedWrapper");
    if (!wrapper) return;

    if (!document.fullscreenElement) {
        wrapper.requestFullscreen().catch(err => {
            console.warn("Fullscreen request error:", err);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

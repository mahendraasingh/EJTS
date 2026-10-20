// ==========================================================================
// SMART BILLBOARD AI ANALYTICS - LIVE MONITORING SCRIPT
// ==========================================================================

let monitorPollInterval = null;
let currentSourceMode = "webcam";

document.addEventListener("DOMContentLoaded", () => {
    fetchMonitoringStatus();
    fetchSourceInfo();
    monitorPollInterval = setInterval(() => {
        fetchMonitoringStatus();
        fetchSourceInfo();
    }, 2000);
});

async function fetchSourceInfo() {
    try {
        const res = await fetch("/api/monitoring/source");
        const data = await res.json();
        currentSourceMode = data.source_mode || "webcam";

        const badge = document.getElementById("feedSourceBadge");
        const btnCam = document.getElementById("btnSourceWebcam");
        const btnFile = document.getElementById("btnSourceFile");
        const uploadSec = document.getElementById("videoUploadSection");
        const label = document.getElementById("cachedVideoLabel");

        if (currentSourceMode === "video_file") {
            if (badge) {
                badge.textContent = `Source: Video (${data.video_filename || 'cached'})`;
                badge.className = "badge badge-warning";
            }
            if (btnCam) btnCam.classList.remove("active");
            if (btnFile) btnFile.classList.add("active");
            if (uploadSec) uploadSec.style.display = "block";
            if (label && data.video_filename) {
                label.textContent = `Active cached video: ${data.video_filename}`;
            }
        } else {
            if (badge) {
                badge.textContent = "Source: Physical Webcam";
                badge.className = "badge badge-success";
            }
            if (btnCam) btnCam.classList.add("active");
            if (btnFile) btnFile.classList.remove("active");
            if (uploadSec) uploadSec.style.display = "none";
        }
    } catch (e) {
        console.warn("Failed to fetch source info:", e);
    }
}

async function switchVideoSource(mode) {
    try {
        const res = await fetch("/api/monitoring/source", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source_mode: mode })
        });
        if (res.ok) {
            refreshStream();
            await fetchSourceInfo();
        }
    } catch (e) {
        console.error("Switch source error:", e);
    }
}

async function uploadVideoSource() {
    const input = document.getElementById("videoSourceInput");
    if (!input || !input.files || input.files.length === 0) {
        alert("Please select a video file first (mp4, webm).");
        return;
    }

    const formData = new FormData();
    formData.append("video", input.files[0]);

    try {
        const label = document.getElementById("cachedVideoLabel");
        if (label) label.textContent = "Uploading video to cache & compiling inference loop...";

        const res = await fetch("/api/monitoring/upload_video_source", {
            method: "POST",
            body: formData
        });
        const result = await res.json();
        if (res.ok) {
            alert(`Video '${result.filename}' cached! AI is now running live on this video.`);
            refreshStream();
            await fetchSourceInfo();
            await fetchMonitoringStatus();
        } else {
            alert(result.error || "Failed to upload video source.");
        }
    } catch (e) {
        console.error("Upload video source error:", e);
        alert("Error uploading video file to cache.");
    }
}

async function fetchMonitoringStatus() {
    try {
        const response = await fetch("/api/monitoring/status");
        const data = await response.json();

        setText("liveOccVal", `${data.zone_occupancy || 0} viewers`);
        setText("liveDetVal", `${data.detected_count || 0} people`);

        const cam = data.camera || {};
        setText("feedFpsBadge", `${cam.actual_fps || 0.0} FPS`);

        const yolo = data.yolo || {};
        const yoloVal = document.getElementById("liveYoloVal");
        if (yoloVal) {
            yoloVal.textContent = yolo.is_loaded ? "YOLOv8n (CPU)" : "Ready / Standby";
            yoloVal.className = yolo.is_loaded ? "badge badge-success" : "badge badge-warning";
        }

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

// ==========================================================================
// SMART BILLBOARD AI ANALYTICS - LIVE DUAL STUDIO MONITOR SCRIPT
// ==========================================================================

let monitorPollInterval = null;
let currentSourceMode = "webcam";
let videoPlayerInitialized = false;

document.addEventListener("DOMContentLoaded", () => {
    initUploadedVideoPlayer();
    fetchMonitoringStatus();
    fetchSourceInfo();
    
    // Auto-refresh stream once on load
    refreshStream();

    // Polling interval for live HUD telemetry
    monitorPollInterval = setInterval(() => {
        fetchMonitoringStatus();
        fetchSourceInfo();
    }, 1500);
});

// --------------------------------------------------------------------------
// HTML5 1-Time Uploaded Video Player & Rewatch Controller
// --------------------------------------------------------------------------
function initUploadedVideoPlayer() {
    const player = document.getElementById("uploadedVideoPlayer");
    const overlay = document.getElementById("videoFinishedOverlay");
    const placeholder = document.getElementById("noVideoPlaceholder");
    const seekBar = document.getElementById("videoSeekBar");
    const timeText = document.getElementById("videoTimeText");
    const badge = document.getElementById("videoPlayStatusBadge");
    const playIcon = document.getElementById("playPauseIcon");

    if (!player) return;

    // Strict 1-time playback setting: no auto-loop
    player.loop = false;

    // Update progress scrubber and time display
    player.addEventListener("timeupdate", () => {
        if (!isNaN(player.duration) && player.duration > 0) {
            const pct = (player.currentTime / player.duration) * 100;
            if (seekBar) seekBar.value = pct;
            if (timeText) {
                timeText.textContent = `${formatTime(player.currentTime)} / ${formatTime(player.duration)}`;
            }
        }
    });

    // Handle video ended event: 1-time play complete!
    player.addEventListener("ended", () => {
        if (overlay) overlay.style.display = "flex";
        if (badge) {
            badge.textContent = "Completed (1/1)";
            badge.className = "badge badge-warning";
        }
        if (playIcon) {
            playIcon.className = "fa-solid fa-rotate-left";
        }
    });

    // Handle video play
    player.addEventListener("play", () => {
        if (overlay) overlay.style.display = "none";
        if (badge) {
            badge.textContent = "Playing (1-Time)";
            badge.className = "badge badge-success";
        }
        if (playIcon) {
            playIcon.className = "fa-solid fa-pause";
        }
    });

    // Handle video pause
    player.addEventListener("pause", () => {
        if (!player.ended && playIcon) {
            playIcon.className = "fa-solid fa-play";
        }
    });

    // Load cached video if available
    loadCachedVideoIntoPlayer();
}

async function loadCachedVideoIntoPlayer() {
    const player = document.getElementById("uploadedVideoPlayer");
    const placeholder = document.getElementById("noVideoPlaceholder");
    const nameLabel = document.getElementById("cachedFileNameLabel");
    if (!player) return;

    try {
        const res = await fetch("/api/monitoring/source");
        const data = await res.json();
        
        if (data.video_path || data.video_filename) {
            if (placeholder) placeholder.style.display = "none";
            player.src = `/api/monitoring/cached_video_file?t=${Date.now()}`;
            player.load();
            if (nameLabel) {
                nameLabel.innerHTML = `<i class="fa-solid fa-file-video"></i> ${data.video_filename || "Cached video"}`;
            }
        } else {
            // Check if backend has any cached video files in store
            const testRes = await fetch("/api/monitoring/cached_video_file", { method: "HEAD" });
            if (testRes.ok) {
                if (placeholder) placeholder.style.display = "none";
                player.src = `/api/monitoring/cached_video_file?t=${Date.now()}`;
                player.load();
                if (nameLabel) {
                    nameLabel.innerHTML = `<i class="fa-solid fa-file-video"></i> Cached Video Stream`;
                }
            } else {
                if (placeholder) placeholder.style.display = "flex";
            }
        }
    } catch (e) {
        console.warn("Could not check cached video for player:", e);
    }
}

function togglePlayPauseVideo() {
    const player = document.getElementById("uploadedVideoPlayer");
    const overlay = document.getElementById("videoFinishedOverlay");
    if (!player) return;

    if (player.ended) {
        rewatchUploadedVideo();
    } else if (player.paused) {
        player.play().catch(e => console.warn("Play error:", e));
        if (overlay) overlay.style.display = "none";
    } else {
        player.pause();
    }
}

async function rewatchUploadedVideo() {
    const player = document.getElementById("uploadedVideoPlayer");
    const overlay = document.getElementById("videoFinishedOverlay");
    const badge = document.getElementById("videoPlayStatusBadge");
    const playIcon = document.getElementById("playPauseIcon");

    if (overlay) overlay.style.display = "none";

    // Rewind HTML5 video player to start and play
    if (player) {
        player.currentTime = 0;
        player.play().catch(e => {
            console.warn("Browser autoplay policy prevented direct unmuted play, trying muted:", e);
            player.muted = true;
            player.play();
        });
    }

    if (badge) {
        badge.textContent = "Playing (1-Time)";
        badge.className = "badge badge-success";
    }
    if (playIcon) {
        playIcon.className = "fa-solid fa-pause";
    }

    // Simultaneously notify backend OpenCV pipeline to rewind to frame 0
    try {
        const res = await fetch("/api/monitoring/replay_video", { method: "POST" });
        if (res.ok) {
            refreshStream();
            await fetchMonitoringStatus();
        }
    } catch (e) {
        console.warn("Failed to notify backend replay:", e);
    }
}

function onSeekVideo(percent) {
    const player = document.getElementById("uploadedVideoPlayer");
    if (player && !isNaN(player.duration) && player.duration > 0) {
        player.currentTime = (parseFloat(percent) / 100) * player.duration;
    }
}

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// --------------------------------------------------------------------------
// Video Upload Handling (Modal + File Input)
// --------------------------------------------------------------------------
function triggerVideoUploadModal() {
    const hiddenInput = document.getElementById("hiddenVideoFileInput");
    if (hiddenInput) {
        hiddenInput.click();
    }
}

function handleFileInputChange(input) {
    if (input && input.files && input.files[0]) {
        uploadVideoFileObject(input.files[0]);
    }
}

async function uploadVideoSource() {
    const input = document.getElementById("videoSourceInput");
    if (!input || !input.files || input.files.length === 0) {
        alert("Please select a video file first (mp4, webm, avi).");
        return;
    }
    await uploadVideoFileObject(input.files[0]);
}

async function uploadVideoFileObject(file) {
    const formData = new FormData();
    formData.append("video", file);

    const label = document.getElementById("cachedVideoLabel");
    const nameLabel = document.getElementById("cachedFileNameLabel");
    const placeholder = document.getElementById("noVideoPlaceholder");
    const overlay = document.getElementById("videoFinishedOverlay");

    if (label) label.textContent = `Uploading and caching '${file.name}'...`;

    try {
        const res = await fetch("/api/monitoring/upload_video_source", {
            method: "POST",
            body: formData
        });
        const result = await res.json();

        if (res.ok) {
            if (label) label.textContent = `Active cached video: ${result.filename}`;
            if (nameLabel) nameLabel.innerHTML = `<i class="fa-solid fa-file-video"></i> ${result.filename}`;
            if (placeholder) placeholder.style.display = "none";
            if (overlay) overlay.style.display = "none";

            // Load into HTML5 player and auto-play 1 time
            const player = document.getElementById("uploadedVideoPlayer");
            if (player) {
                player.src = `/api/monitoring/cached_video_file?t=${Date.now()}`;
                player.load();
                player.play().catch(e => {
                    console.log("Auto-play unmuted blocked, playing muted:", e);
                    player.muted = true;
                    player.play();
                });
            }

            // Refresh camera feed stream & source telemetry
            refreshStream();
            await fetchSourceInfo();
            await fetchMonitoringStatus();
        } else {
            alert(result.error || "Failed to upload video source.");
        }
    } catch (e) {
        console.error("Upload error:", e);
        alert("Error uploading video file to cache.");
    }
}

// --------------------------------------------------------------------------
// Source Switching & Live Camera Tracking Telemetry
// --------------------------------------------------------------------------
async function fetchSourceInfo() {
    try {
        const res = await fetch("/api/monitoring/source");
        const data = await res.json();
        currentSourceMode = data.source_mode || "webcam";

        const badge = document.getElementById("feedSourceBadge");
        const btnCam = document.getElementById("btnSourceWebcam");
        const btnFile = document.getElementById("btnSourceFile");
        const label = document.getElementById("cachedVideoLabel");
        const nameLabel = document.getElementById("cachedFileNameLabel");

        if (currentSourceMode === "video_file") {
            if (badge) {
                badge.innerHTML = `<i class="fa-solid fa-film"></i> Source: Video (${data.video_filename || 'cached'})`;
                badge.className = "badge badge-warning";
            }
            if (btnCam) btnCam.classList.remove("active");
            if (btnFile) btnFile.classList.add("active");
            if (label && data.video_filename) {
                label.textContent = `Active cached video: ${data.video_filename}`;
            }
            if (nameLabel && data.video_filename) {
                nameLabel.innerHTML = `<i class="fa-solid fa-file-video"></i> ${data.video_filename}`;
            }
        } else {
            if (badge) {
                badge.innerHTML = `<i class="fa-solid fa-camera"></i> Source: Live Hardware Camera`;
                badge.className = "badge badge-success";
            }
            if (btnCam) btnCam.classList.add("active");
            if (btnFile) btnFile.classList.remove("active");
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
            await fetchMonitoringStatus();
        }
    } catch (e) {
        console.error("Switch source error:", e);
    }
}

async function fetchMonitoringStatus() {
    try {
        const response = await fetch("/api/monitoring/status");
        const data = await response.json();

        // Update real-time HUD elements
        setText("hudZoneOcc", data.zone_occupancy || 0);
        setText("hudFovDet", data.detected_count || 0);

        // Update bottom/card badges
        setText("liveOccVal", `${data.zone_occupancy || 0} viewers`);
        setText("liveDetVal", `${data.detected_count || 0} people`);

        const cam = data.camera || {};
        setText("feedFpsBadge", `${cam.actual_fps || 0.0} FPS`);

        const yolo = data.yolo || {};
        const yoloVal = document.getElementById("liveYoloVal");
        if (yoloVal) {
            yoloVal.textContent = yolo.is_loaded ? "YOLOv8n Neural Net (CPU)" : "Ready / Standby";
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

// --------------------------------------------------------------------------
// ROI Zone Calibration Form Handler
// --------------------------------------------------------------------------
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

function togglePlayerFullscreen(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!document.fullscreenElement) {
        el.requestFullscreen().catch(err => console.warn("Fullscreen error:", err));
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}

function toggleFeedFullscreen() {
    togglePlayerFullscreen("videoFeedWrapper");
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

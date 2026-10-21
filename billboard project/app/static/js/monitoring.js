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
    fetchLivePersonTelemetry();
    
    // Auto-refresh stream once on load
    refreshStream();

    // Polling interval for live HUD & person behavioral telemetry
    monitorPollInterval = setInterval(() => {
        fetchMonitoringStatus();
        fetchSourceInfo();
        fetchLivePersonTelemetry();
    }, 1000);
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

// --------------------------------------------------------------------------
// Live Person Behavioral Dashboard & Event Recorder (Real-time reading)
// --------------------------------------------------------------------------
let isLogPaused = false;

async function fetchLivePersonTelemetry() {
    try {
        const res = await fetch("/api/monitoring/live_person_telemetry");
        if (!res.ok) return;
        const data = await res.json();

        const metrics = data.metrics || {};
        const persons = data.active_persons || [];
        const logs = data.activity_log || [];

        // Update Top Summary KPI Cards
        setText("kpiActivePersons", metrics.detected_count || 0);
        setText("kpiZoneViewers", metrics.zone_occupancy || 0);
        setText("kpiAvgDwell", `${metrics.avg_dwell_sec || 0.0}s`);
        setText("kpiAttentionIndex", `${metrics.avg_engagement_pct || 0}%`);
        setText("kpiDominantAction", metrics.dominant_action || "Awaiting camera subject...");
        setText("activeCountBadge", `${metrics.detected_count || 0} Active`);

        // Render Individual Person Cards
        renderLivePersonCards(persons);

        // Render Real-Time Activity Log Feed
        if (!isLogPaused) {
            renderLiveActivityLog(logs);
        }
    } catch (e) {
        console.warn("Failed to fetch live person telemetry:", e);
    }
}

function renderLivePersonCards(persons) {
    const container = document.getElementById("livePersonCardsContainer");
    if (!container) return;

    if (!persons || persons.length === 0) {
        container.innerHTML = `
            <div class="empty-telemetry-box" style="text-align: center; padding: 36px 20px; color: var(--text-dim); font-size: 12px; border: 1px dashed var(--border-subtle); border-radius: 6px;">
                <i class="fa-solid fa-user-slash" style="font-size: 28px; margin-bottom: 8px; color: var(--text-dim); opacity: 0.6;"></i>
                <p style="margin: 0; font-weight: 500;">No subjects currently in camera view</p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: var(--text-muted);">Stand in front of the camera or upload a crowd video to view live behavioral telemetry.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = persons.map(p => {
        const inZone = !!p.in_zone;
        const avatarBg = inZone ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)";
        const avatarColor = inZone ? "#10b981" : "#f59e0b";
        const zoneBadge = inZone
            ? `<span class="badge badge-success" style="font-size: 10.5px;"><i class="fa-solid fa-circle-check"></i> Audience ROI Zone</span>`
            : `<span class="badge badge-warning" style="font-size: 10.5px;"><i class="fa-solid fa-person-walking"></i> Passerby in FOV</span>`;

        let actionIcon = "fa-person-running";
        if (p.action.includes("Dwelling") || p.action.includes("High Attention")) actionIcon = "fa-star";
        else if (p.action.includes("Looking") || p.action.includes("Engaged")) actionIcon = "fa-eye";
        else if (p.action.includes("Approaching")) actionIcon = "fa-arrow-down-long";
        else if (p.action.includes("Passerby")) actionIcon = "fa-person-walking";

        let scoreColor = "#f59e0b";
        if (p.engagement_score >= 70) scoreColor = "#10b981";
        else if (p.engagement_score >= 40) scoreColor = "#38bdf8";

        return `
            <div class="person-card" style="background: rgba(255, 255, 255, 0.025); border: 1px solid var(--border-subtle); border-left: 3px solid ${avatarColor}; border-radius: 6px; padding: 12px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 28px; height: 28px; border-radius: 50%; background: ${avatarBg}; color: ${avatarColor}; display: flex; align-items: center; justify-content: center; font-size: 13px;">
                            <i class="fa-solid fa-user"></i>
                        </div>
                        <span style="font-size: 13px; font-weight: 700; color: #fff;">Person #${p.tracking_id}</span>
                        ${zoneBadge}
                    </div>
                    <span class="badge badge-secondary" style="font-size: 10px;">
                        <i class="fa-solid fa-ruler-horizontal"></i> ${p.proximity}
                    </span>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;">
                    <span style="font-size: 11.5px; font-weight: 600; color: #38bdf8; display: inline-flex; align-items: center; gap: 5px;">
                        <i class="fa-solid ${actionIcon}"></i> ${p.action}
                    </span>
                    <span style="font-family: monospace; font-size: 11px; color: var(--text-dim);">
                        Dwell: <strong style="color: #fff;">${p.dwell_seconds}s</strong> (Total: ${p.total_seconds}s)
                    </span>
                </div>

                <!-- Engagement meter & speed -->
                <div style="display: flex; align-items: center; gap: 10px; font-size: 11px;">
                    <span style="color: var(--text-dim); min-width: 60px;">Attention:</span>
                    <div style="flex: 1; height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; width: ${p.engagement_score}%; background: ${scoreColor}; transition: width 0.3s ease;"></div>
                    </div>
                    <span style="font-weight: 700; color: ${scoreColor}; min-width: 35px; text-align: right;">${p.engagement_score}%</span>
                    <span style="color: var(--text-muted); font-size: 10.5px; margin-left: 6px;">
                        <i class="fa-solid fa-gauge"></i> ${p.speed_px_per_sec} px/s
                    </span>
                </div>
            </div>
        `;
    }).join("");
}

function renderLiveActivityLog(logs) {
    const feed = document.getElementById("liveActivityLogFeed");
    if (!feed) return;

    if (!logs || logs.length === 0) {
        feed.innerHTML = `
            <div style="color: var(--text-dim); padding: 8px; text-align: center; font-style: italic;">
                Recording initialized. Activity logs will appear here in real time...
            </div>
        `;
        return;
    }

    feed.innerHTML = logs.map(item => {
        let badgeColor = "#38bdf8";
        let badgeBg = "rgba(56, 189, 248, 0.15)";
        if (item.badge === "success") {
            badgeColor = "#10b981";
            badgeBg = "rgba(16, 185, 129, 0.15)";
        } else if (item.badge === "warning") {
            badgeColor = "#f59e0b";
            badgeBg = "rgba(245, 158, 11, 0.15)";
        } else if (item.badge === "primary") {
            badgeColor = "#a855f7";
            badgeBg = "rgba(168, 85, 247, 0.15)";
        } else if (item.badge === "secondary") {
            badgeColor = "#94a3b8";
            badgeBg = "rgba(148, 163, 184, 0.15)";
        }

        return `
            <div style="display: flex; align-items: flex-start; gap: 8px; padding: 4px 6px; border-radius: 4px; background: rgba(255,255,255,0.015);">
                <span style="color: var(--text-dim); font-size: 10px; min-width: 52px;">[${item.time_str}]</span>
                <span style="font-size: 9.5px; padding: 1px 5px; border-radius: 3px; background: ${badgeBg}; color: ${badgeColor}; text-transform: uppercase; font-weight: 600;">
                    ${item.event_type}
                </span>
                <span style="color: #e2e8f0; flex: 1; word-break: break-word;">${item.message}</span>
            </div>
        `;
    }).join("");
}

function clearLiveActivityLog() {
    const feed = document.getElementById("liveActivityLogFeed");
    if (feed) {
        feed.innerHTML = `
            <div style="color: var(--text-dim); padding: 8px; text-align: center; font-style: italic;">
                Log cleared by user. New camera activities will be recorded below...
            </div>
        `;
    }
}

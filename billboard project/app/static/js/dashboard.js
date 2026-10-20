// ==========================================================================
// SMART BILLBOARD AI ANALYTICS - DASHBOARD SCRIPT
// ==========================================================================

let currentPreset = "today";
let activityChart = null;
let shareChart = null;
let pollTimer = null;
let billboard3DInstance = null;
let lastKnownAdName = "Smart Billboard AI";

document.addEventListener("DOMContentLoaded", () => {
    init3DExperience();
    initCharts();
    loadDashboardData();
    // Poll every 3 seconds for live telemetry & audience updates
    pollTimer = setInterval(loadDashboardData, 3000);
});

function init3DExperience() {
    try {
        if (typeof window.Billboard3D !== "undefined" && document.getElementById("billboard3DContainer")) {
            billboard3DInstance = new window.Billboard3D("billboard3DContainer");
        }
    } catch (e) {
        console.warn("3D Experience initialization skipped:", e);
    }
}

function reset3DView() {
    if (billboard3DInstance) {
        billboard3DInstance.resetAngle();
    }
}

function changePreset(preset) {
    currentPreset = preset;
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-preset") === preset);
    });
    loadDashboardData();
}

async function loadDashboardData() {
    try {
        await Promise.all([
            fetchOverview(),
            fetchChartsData(),
            fetchRecentSessions(),
            fetchCurrentAd()
        ]);
    } catch (err) {
        console.warn("Dashboard polling warning:", err);
    }
}

async function fetchOverview() {
    try {
        const res = await fetch(`/api/analytics/overview?preset=${currentPreset}`);
        const data = await res.json();

        // Update KPIs
        setText("metricTotalSessions", data.total_sessions || 0);
        setText("metricCompletedSessions", data.completed_sessions || 0);
        setText("metricAvgDuration", `${data.avg_duration_seconds || 0.0}s`);
        setText("metricTotalDuration", formatDuration(data.total_duration_seconds || 0));

        // Update Live Telemetry
        const live = data.live_telemetry || {};
        const occupancy = live.current_zone_occupancy || 0;
        setText("metricLiveOccupancy", occupancy);
        setText("metricLiveDetected", live.current_detected_people || 0);

        if (billboard3DInstance) {
            billboard3DInstance.updateTelemetry(occupancy, lastKnownAdName);
        }

        const hudCam = document.getElementById("hudCameraStatus");
        if (hudCam) {
            hudCam.textContent = live.camera_available ? "Hardware Active (Ready)" : "Standby / Virtual Frame";
            hudCam.style.color = live.camera_available ? "#10b981" : "#f59e0b";
        }
    } catch (e) {
        console.error("Overview fetch error:", e);
    }
}

async function fetchCurrentAd() {
    try {
        const res = await fetch("/api/billboard/current");
        const data = await res.json();
        const hudAd = document.getElementById("hudCurrentAd");
        if (hudAd && data.name) {
            hudAd.textContent = data.name;
        }
        if (data.name) {
            lastKnownAdName = data.name;
            if (billboard3DInstance) {
                billboard3DInstance.updateTelemetry(undefined, lastKnownAdName);
            }
        }
    } catch (e) {
        console.error("Current ad fetch error:", e);
    }
}

async function fetchChartsData() {
    try {
        // Fetch timeseries & ad breakdown in parallel
        const [tsRes, adsRes] = await Promise.all([
            fetch(`/api/analytics/timeseries?preset=${currentPreset}`),
            fetch(`/api/analytics/advertisements?preset=${currentPreset}`)
        ]);
        const tsData = await tsRes.json();
        const adsData = await adsRes.json();

        updateActivityChart(tsData);
        updateShareChart(adsData.campaigns || []);
    } catch (e) {
        console.error("Charts fetch error:", e);
    }
}

function initCharts() {
    // 1. Activity Line Chart
    const actCanvas = document.getElementById("activityChart");
    if (actCanvas) {
        const ctx = actCanvas.getContext("2d");
        activityChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: [],
                datasets: [
                    {
                        label: "Viewer Sessions",
                        data: [],
                        borderColor: "#6366f1",
                        backgroundColor: "rgba(99, 102, 241, 0.15)",
                        fill: true,
                        tension: 0.35,
                        borderWidth: 2,
                        yAxisID: "y"
                    },
                    {
                        label: "Avg Duration (s)",
                        data: [],
                        borderColor: "#10b981",
                        borderDash: [4, 4],
                        tension: 0.35,
                        borderWidth: 2,
                        yAxisID: "y1"
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: "#94a3b8", font: { size: 11 } } }
                },
                scales: {
                    x: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#64748b" } },
                    y: {
                        position: "left",
                        grid: { color: "rgba(255, 255, 255, 0.05)" },
                        ticks: { color: "#64748b", stepSize: 1 },
                        title: { display: true, text: "Sessions", color: "#6366f1", font: { size: 10 } }
                    },
                    y1: {
                        position: "right",
                        grid: { drawOnChartArea: false },
                        ticks: { color: "#64748b" },
                        title: { display: true, text: "Duration (s)", color: "#10b981", font: { size: 10 } }
                    }
                }
            }
        });
    }

    // 2. Share Doughnut Chart
    const shareCanvas = document.getElementById("shareChart");
    if (shareCanvas) {
        const ctx = shareCanvas.getContext("2d");
        shareChart = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: ["No Campaigns Recorded"],
                datasets: [{
                    data: [1],
                    backgroundColor: ["#161616"],
                    borderColor: "#0a0a0a",
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "70%",
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: { color: "#94a3b8", boxWidth: 12, font: { size: 11 } }
                    }
                }
            }
        });
    }
}

function updateActivityChart(tsData) {
    if (!activityChart) return;
    activityChart.data.labels = tsData.labels || [];
    activityChart.data.datasets[0].data = tsData.sessions || [];
    activityChart.data.datasets[1].data = tsData.avg_duration || [];
    activityChart.update("none");
}

function updateShareChart(campaigns) {
    if (!shareChart) return;
    const activeWithSessions = campaigns.filter(c => c.total_sessions > 0);

    if (activeWithSessions.length === 0) {
        shareChart.data.labels = ["No Sessions Yet"];
        shareChart.data.datasets[0].data = [1];
        shareChart.data.datasets[0].backgroundColor = ["#161616"];
    } else {
        const palette = ["#6366f1", "#10b981", "#06b6d4", "#f59e0b", "#ec4899", "#8b5cf6"];
        shareChart.data.labels = activeWithSessions.map(c => c.name);
        shareChart.data.datasets[0].data = activeWithSessions.map(c => c.total_sessions);
        shareChart.data.datasets[0].backgroundColor = activeWithSessions.map((_, i) => palette[i % palette.length]);
    }
    shareChart.update("none");
}

async function fetchRecentSessions() {
    try {
        const res = await fetch("/api/analytics/sessions?limit=8");
        const data = await res.json();
        const tbody = document.getElementById("recentSessionsTableBody");
        if (!tbody) return;

        const sessions = data.sessions || [];
        if (sessions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; color:var(--text-dim); padding:32px;">
                        No viewer sessions recorded yet. Stand in front of the camera or launch billboard.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = sessions.map(s => {
            const startStr = s.start_time ? new Date(s.start_time).toLocaleTimeString() : "--";
            const endStr = s.end_time ? new Date(s.end_time).toLocaleTimeString() : "Active...";
            const badgeClass = s.status === "completed" ? "badge-success" : (s.status === "active" ? "badge-info" : "badge-warning");

            return `
                <tr>
                    <td><strong style="color:#6366f1;">#${s.tracking_id}</strong></td>
                    <td style="font-weight:500; color:#fff;">${escapeHtml(s.advertisement_name)}</td>
                    <td style="color:var(--text-muted); font-size:12px;">${startStr}</td>
                    <td style="color:var(--text-muted); font-size:12px;">${endStr}</td>
                    <td><strong>${s.estimated_duration.toFixed(1)}s</strong></td>
                    <td><span class="badge ${badgeClass}">${s.status}</span></td>
                    <td style="color:var(--text-dim); font-size:12px;">${s.exit_reason || "in_zone"}</td>
                </tr>
            `;
        }).join("");
    } catch (e) {
        console.error("Recent sessions fetch error:", e);
    }
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return "0s";
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

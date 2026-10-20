// ==========================================================================
// SMART BILLBOARD AI ANALYTICS - DEEP ANALYTICS SCRIPT
// ==========================================================================

let analyticsPreset = "7d";
let deepActivityChart = null;
let deepShareChart = null;
let sessionOffset = 0;
const sessionLimit = 20;
let totalSessionsCount = 0;

document.addEventListener("DOMContentLoaded", () => {
    initAnalyticsCharts();
    loadAnalyticsData();
});

function changeAnalyticsPreset(preset) {
    analyticsPreset = preset;
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-preset") === preset);
    });
    sessionOffset = 0;
    loadAnalyticsData();
}

async function loadAnalyticsData() {
    await Promise.all([
        fetchCampaignPerformance(),
        fetchAnalyticsCharts(),
        fetchHistoricalSessions()
    ]);
}

async function fetchCampaignPerformance() {
    try {
        const res = await fetch(`/api/analytics/advertisements?preset=${analyticsPreset}`);
        const data = await res.json();
        const campaigns = data.campaigns || [];
        const tbody = document.getElementById("campaignPerformanceBody");
        if (!tbody) return;

        if (campaigns.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; color: var(--text-dim); padding: 36px;">
                        No campaign records found for this timeframe.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = campaigns.map(c => {
            const isVideo = c.media_type === "video";
            return `
                <tr>
                    <td><strong style="color: #fff;">${escapeHtml(c.name)}</strong></td>
                    <td><span class="badge badge-info">${escapeHtml(c.category)}</span></td>
                    <td><span class="badge ${isVideo ? 'badge-warning' : 'badge-success'}">${isVideo ? 'Video' : 'Image'}</span></td>
                    <td><strong style="color: #6366f1;">${c.total_sessions}</strong></td>
                    <td>${c.completed_sessions}</td>
                    <td>${formatDuration(c.total_duration)}</td>
                    <td><strong>${c.avg_duration.toFixed(1)}s</strong></td>
                    <td>${c.max_duration.toFixed(1)}s</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="flex-grow: 1; height: 6px; background: #1a1a1a; border-radius: 3px; overflow: hidden; width: 60px;">
                                <div style="height: 100%; width: ${c.session_share_percent}%; background: #10b981;"></div>
                            </div>
                            <span style="font-size: 11px; font-weight: 600;">${c.session_share_percent}%</span>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    } catch (e) {
        console.error("Campaign performance fetch error:", e);
    }
}

async function fetchAnalyticsCharts() {
    try {
        const [tsRes, adsRes] = await Promise.all([
            fetch(`/api/analytics/timeseries?preset=${analyticsPreset}`),
            fetch(`/api/analytics/advertisements?preset=${analyticsPreset}`)
        ]);
        const tsData = await tsRes.json();
        const adsData = await adsRes.json();

        // Update charts
        if (deepActivityChart) {
            deepActivityChart.data.labels = tsData.labels || [];
            deepActivityChart.data.datasets[0].data = tsData.sessions || [];
            deepActivityChart.data.datasets[1].data = tsData.avg_duration || [];
            deepActivityChart.update();
        }

        if (deepShareChart) {
            const camps = adsData.campaigns || [];
            const active = camps.filter(c => c.total_sessions > 0);
            if (active.length === 0) {
                deepShareChart.data.labels = ["No Data in Window"];
                deepShareChart.data.datasets[0].data = [1];
                deepShareChart.data.datasets[0].backgroundColor = ["#161616"];
            } else {
                const palette = ["#6366f1", "#10b981", "#06b6d4", "#f59e0b", "#ec4899", "#8b5cf6"];
                deepShareChart.data.labels = active.map(c => c.name);
                deepShareChart.data.datasets[0].data = active.map(c => c.total_sessions);
                deepShareChart.data.datasets[0].backgroundColor = active.map((_, i) => palette[i % palette.length]);
            }
            deepShareChart.update();
        }
    } catch (e) {
        console.error("Charts fetch error:", e);
    }
}

async function fetchHistoricalSessions() {
    try {
        const res = await fetch(`/api/analytics/sessions?limit=${sessionLimit}&offset=${sessionOffset}`);
        const data = await res.json();
        const sessions = data.sessions || [];
        totalSessionsCount = data.total || 0;

        const tbody = document.getElementById("fullSessionsTableBody");
        if (!tbody) return;

        if (sessions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 36px;">No historical session logs recorded yet.</td></tr>`;
            updatePaginationUI();
            return;
        }

        tbody.innerHTML = sessions.map(s => {
            const startStr = s.start_time ? new Date(s.start_time).toLocaleString() : "--";
            const endStr = s.end_time ? new Date(s.end_time).toLocaleString() : "Active Episode";
            const badgeClass = s.status === "completed" ? "badge-success" : (s.status === "active" ? "badge-info" : "badge-warning");

            return `
                <tr>
                    <td style="font-family: monospace; font-size: 11px; color: var(--text-dim);">${s.session_uuid.slice(0, 8)}...</td>
                    <td><strong style="color: #6366f1;">#${s.tracking_id}</strong></td>
                    <td style="font-weight: 500; color: #fff;">${escapeHtml(s.advertisement_name)}</td>
                    <td style="color: var(--text-muted); font-size: 12px;">${startStr}</td>
                    <td style="color: var(--text-muted); font-size: 12px;">${endStr}</td>
                    <td><strong>${s.estimated_duration.toFixed(1)}s</strong></td>
                    <td><span class="badge ${badgeClass}">${s.status}</span></td>
                    <td style="color: var(--text-dim); font-size: 12px;">${s.exit_reason || "in_zone"}</td>
                </tr>
            `;
        }).join("");

        updatePaginationUI();
    } catch (e) {
        console.error("Historical sessions fetch error:", e);
    }
}

function updatePaginationUI() {
    const info = document.getElementById("paginationInfo");
    const prevBtn = document.getElementById("prevPageBtn");
    const nextBtn = document.getElementById("nextPageBtn");

    const start = totalSessionsCount === 0 ? 0 : sessionOffset + 1;
    const end = Math.min(sessionOffset + sessionLimit, totalSessionsCount);
    if (info) info.textContent = `Showing ${start}-${end} of ${totalSessionsCount} sessions`;

    if (prevBtn) prevBtn.disabled = sessionOffset === 0;
    if (nextBtn) nextBtn.disabled = sessionOffset + sessionLimit >= totalSessionsCount;
}

function nextPage() {
    if (sessionOffset + sessionLimit < totalSessionsCount) {
        sessionOffset += sessionLimit;
        fetchHistoricalSessions();
    }
}

function prevPage() {
    if (sessionOffset > 0) {
        sessionOffset = Math.max(0, sessionOffset - sessionLimit);
        fetchHistoricalSessions();
    }
}

function downloadCSV() {
    window.location.href = `/api/analytics/export/csv?preset=${analyticsPreset}`;
}

function initAnalyticsCharts() {
    const actCanvas = document.getElementById("deepActivityChart");
    if (actCanvas) {
        deepActivityChart = new Chart(actCanvas.getContext("2d"), {
            type: "bar",
            data: {
                labels: [],
                datasets: [
                    {
                        type: "bar",
                        label: "Viewer Sessions",
                        data: [],
                        backgroundColor: "rgba(99, 102, 241, 0.4)",
                        borderColor: "#6366f1",
                        borderWidth: 1,
                        yAxisID: "y"
                    },
                    {
                        type: "line",
                        label: "Avg Presence Duration (s)",
                        data: [],
                        borderColor: "#10b981",
                        borderWidth: 2,
                        tension: 0.35,
                        yAxisID: "y1"
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: "#94a3b8" } } },
                scales: {
                    x: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#64748b" } },
                    y: { position: "left", ticks: { color: "#64748b", stepSize: 1 }, grid: { color: "rgba(255, 255, 255, 0.05)" } },
                    y1: { position: "right", grid: { drawOnChartArea: false }, ticks: { color: "#64748b" } }
                }
            }
        });
    }

    const shareCanvas = document.getElementById("deepShareChart");
    if (shareCanvas) {
        deepShareChart = new Chart(shareCanvas.getContext("2d"), {
            type: "doughnut",
            data: {
                labels: [],
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
                cutout: "65%",
                plugins: { legend: { position: "bottom", labels: { color: "#94a3b8", boxWidth: 12 } } }
            }
        });
    }
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

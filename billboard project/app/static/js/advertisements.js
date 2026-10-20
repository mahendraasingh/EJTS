// ==========================================================================
// SMART BILLBOARD AI ANALYTICS - ADVERTISEMENT MANAGEMENT
// ==========================================================================

let allAds = [];

document.addEventListener("DOMContentLoaded", () => {
    loadAdvertisements();

    // Search and filter listeners
    const searchInput = document.getElementById("adSearchInput");
    const categoryFilter = document.getElementById("adCategoryFilter");

    if (searchInput) {
        searchInput.addEventListener("input", filterAndRenderAds);
    }
    if (categoryFilter) {
        categoryFilter.addEventListener("change", filterAndRenderAds);
    }
});

async function loadAdvertisements() {
    try {
        const response = await fetch("/api/advertisements?include_archived=false");
        const data = await response.json();
        allAds = data.advertisements || [];
        updateAdMetrics(allAds);
        populateCategoryFilter(allAds);
        filterAndRenderAds();
    } catch (err) {
        console.error("Failed to fetch advertisements:", err);
        const tbody = document.getElementById("adsTableBody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#f43f5e; padding:30px;">
                <i class="fa-solid fa-triangle-exclamation"></i> Error loading campaigns. Check server connection.</td></tr>`;
        }
    }
}

function updateAdMetrics(ads) {
    const activeAds = ads.filter(a => a.is_active);
    const totalCycle = activeAds.reduce((sum, a) => sum + (a.duration || 10), 0);
    const categories = new Set(ads.map(a => a.category).filter(Boolean));

    const elActive = document.getElementById("metricActiveAds");
    const elTotal = document.getElementById("metricTotalAds");
    const elCycle = document.getElementById("metricCycleDuration");
    const elCats = document.getElementById("metricCategoryCount");

    if (elActive) elActive.textContent = activeAds.length;
    if (elTotal) elTotal.textContent = ads.length;
    if (elCycle) elCycle.textContent = totalCycle + "s";
    if (elCats) elCats.textContent = categories.size;
}

function populateCategoryFilter(ads) {
    const filter = document.getElementById("adCategoryFilter");
    if (!filter) return;
    const currentVal = filter.value;
    const categories = Array.from(new Set(ads.map(a => a.category).filter(Boolean))).sort();
    
    filter.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        if (cat === currentVal) opt.selected = true;
        filter.appendChild(opt);
    });
}

function filterAndRenderAds() {
    const query = (document.getElementById("adSearchInput")?.value || "").toLowerCase().trim();
    const selectedCategory = document.getElementById("adCategoryFilter")?.value || "";

    const filtered = allAds.filter(ad => {
        const matchesQuery = !query || 
            ad.name.toLowerCase().includes(query) || 
            (ad.description && ad.description.toLowerCase().includes(query)) ||
            (ad.category && ad.category.toLowerCase().includes(query));
        const matchesCat = !selectedCategory || ad.category === selectedCategory;
        return matchesQuery && matchesCat;
    });

    renderAdsTable(filtered);
}

function renderAdsTable(ads) {
    const tbody = document.getElementById("adsTableBody");
    if (!tbody) return;

    if (ads.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: var(--text-dim); padding: 48px;">
                    <i class="fa-solid fa-rectangle-ad" style="font-size: 36px; margin-bottom: 12px; display:block;"></i>
                    No advertisement campaigns found. Click <strong>New Campaign</strong> to upload one.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = ads.map((ad, idx) => {
        const mediaUrl = `/media/advertisements/${ad.media_filename}`;
        const isVideo = ad.media_type === "video";
        const thumbHtml = isVideo
            ? `<div style="width:64px; height:42px; background:#1e293b; border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="openPreview('${escapeHtml(ad.name)}', '${ad.media_filename}', 'video')"><i class="fa-solid fa-play" style="color:var(--info);"></i></div>`
            : `<img src="${mediaUrl}" style="width:64px; height:42px; object-fit:cover; border-radius:4px; cursor:pointer;" onclick="openPreview('${escapeHtml(ad.name)}', '${ad.media_filename}', 'image')">`;

        const statusBadge = ad.is_active
            ? `<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Active</span>`
            : `<span class="badge badge-warning"><i class="fa-solid fa-pause"></i> Inactive</span>`;

        return `
            <tr>
                <td style="color:var(--text-dim); font-weight:600;">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <button class="btn btn-secondary" style="padding:2px 6px; font-size:10px;" onclick="reorderAd(${ad.id}, -1)" ${idx === 0 ? 'disabled' : ''}>▲</button>
                        <button class="btn btn-secondary" style="padding:2px 6px; font-size:10px;" onclick="reorderAd(${ad.id}, 1)" ${idx === ads.length - 1 ? 'disabled' : ''}>▼</button>
                    </div>
                </td>
                <td>${thumbHtml}</td>
                <td>
                    <div style="font-weight:600; color:#fff;">${escapeHtml(ad.name)}</div>
                    <div style="font-size:11px; color:var(--text-dim);">${escapeHtml(ad.description || "No description")}</div>
                </td>
                <td><span class="badge badge-info">${escapeHtml(ad.category)}</span></td>
                <td><span class="badge ${isVideo ? 'badge-warning' : 'badge-success'}">${isVideo ? '<i class="fa-solid fa-film"></i> Video' : '<i class="fa-solid fa-image"></i> Image'}</span></td>
                <td><strong>${ad.duration}s</strong></td>
                <td style="font-size:12px; color:var(--text-muted);">${formatCampaignDates(ad.campaign_start, ad.campaign_end)}</td>
                <td>${statusBadge}</td>
                <td style="text-align: right;">
                    <div style="display:flex; justify-content:flex-end; gap:6px;">
                        <button class="btn btn-secondary" style="padding:6px 10px;" onclick="toggleAd(${ad.id})" title="${ad.is_active ? 'Deactivate' : 'Activate'}">
                            <i class="fa-solid ${ad.is_active ? 'fa-pause' : 'fa-play'}"></i>
                        </button>
                        <button class="btn btn-secondary" style="padding:6px 10px;" onclick="openEditModal(${ad.id})" title="Edit Metadata">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn btn-danger" style="padding:6px 10px;" onclick="archiveAd(${ad.id}, '${escapeHtml(ad.name)}')" title="Archive Campaign">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function formatCampaignDates(start, end) {
    if (!start && !end) return "Always Active";
    if (start && !end) return `From ${new Date(start).toLocaleDateString()}`;
    if (!start && end) return `Until ${new Date(end).toLocaleDateString()}`;
    return `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`;
}

async function handleCreateAd(event) {
    event.preventDefault();
    const form = document.getElementById("newAdForm");
    const formData = new FormData(form);
    const saveBtn = document.getElementById("saveAdBtn");

    try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';

        const response = await fetch("/api/advertisements", {
            method: "POST",
            body: formData
        });
        const result = await response.json();

        if (response.ok) {
            closeModal("newAdModal");
            form.reset();
            const previewBox = document.getElementById("uploadPreviewBox");
            if (previewBox) previewBox.style.display = "none";
            await loadAdvertisements();
        } else {
            alert(result.error || "Failed to create advertisement.");
        }
    } catch (err) {
        console.error(err);
        alert("Upload failed. Ensure server is active and file size is within limits.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Upload & Create';
    }
}

async function handleUpdateAd(event) {
    event.preventDefault();
    const adId = document.getElementById("editAdId").value;
    const payload = {
        name: document.getElementById("editAdName").value,
        category: document.getElementById("editAdCategory").value,
        duration: parseInt(document.getElementById("editAdDuration").value, 10),
        description: document.getElementById("editAdDescription").value,
        is_active: document.getElementById("editAdIsActive").checked
    };

    try {
        const response = await fetch(`/api/advertisements/${adId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            closeModal("editAdModal");
            await loadAdvertisements();
        } else {
            const err = await response.json();
            alert(err.error || "Failed to update advertisement.");
        }
    } catch (err) {
        console.error(err);
        alert("Update failed.");
    }
}

async function toggleAd(adId) {
    try {
        const response = await fetch(`/api/advertisements/${adId}/activate`, { method: "POST" });
        if (response.ok) {
            await loadAdvertisements();
        }
    } catch (err) {
        console.error("Toggle ad failed:", err);
    }
}

async function archiveAd(adId, name) {
    if (!confirm(`Are you sure you want to archive campaign "${name}"?\nHistorical analytics will be preserved.`)) {
        return;
    }
    try {
        const response = await fetch(`/api/advertisements/${adId}`, { method: "DELETE" });
        if (response.ok) {
            await loadAdvertisements();
        }
    } catch (err) {
        console.error("Archive ad failed:", err);
    }
}

async function reorderAd(adId, direction) {
    const idx = allAds.findIndex(a => a.id === adId);
    if (idx < 0) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= allAds.length) return;

    // Swap order indices
    const currentAd = allAds[idx];
    const targetAd = allAds[targetIdx];

    const payload = {
        order: [
            { id: currentAd.id, order_index: targetIdx },
            { id: targetAd.id, order_index: idx }
        ]
    };

    try {
        const response = await fetch("/api/advertisements/reorder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            await loadAdvertisements();
        }
    } catch (err) {
        console.error("Reorder failed:", err);
    }
}

function openNewAdModal() {
    const modal = document.getElementById("newAdModal");
    if (modal) modal.classList.add("active");
}

function openEditModal(adId) {
    const ad = allAds.find(a => a.id === adId);
    if (!ad) return;

    document.getElementById("editAdId").value = ad.id;
    document.getElementById("editAdName").value = ad.name;
    document.getElementById("editAdCategory").value = ad.category || "General";
    document.getElementById("editAdDuration").value = ad.duration || 10;
    document.getElementById("editAdDescription").value = ad.description || "";
    document.getElementById("editAdIsActive").checked = !!ad.is_active;

    const modal = document.getElementById("editAdModal");
    if (modal) modal.classList.add("active");
}

function openPreview(name, filename, type) {
    const modal = document.getElementById("mediaPreviewModal");
    const title = document.getElementById("previewModalTitle");
    const container = document.getElementById("mediaPreviewContainer");
    if (!modal || !container) return;

    title.textContent = name;
    const mediaUrl = `/media/advertisements/${filename}`;

    if (type === "video") {
        container.innerHTML = `<video src="${mediaUrl}" controls autoplay style="max-width:100%; max-height:450px; border-radius:8px;"></video>`;
    } else {
        container.innerHTML = `<img src="${mediaUrl}" style="max-width:100%; max-height:450px; object-fit:contain; border-radius:8px;">`;
    }
    modal.classList.add("active");
}

function previewUploadFile(event) {
    const file = event.target.files[0];
    const box = document.getElementById("uploadPreviewBox");
    if (!file || !box) return;

    const isVideo = file.type.startsWith("video/");
    const url = URL.createObjectURL(file);
    box.style.display = "block";

    if (isVideo) {
        box.innerHTML = `<video src="${url}" controls style="max-height:120px; border-radius:4px;"></video><div style="font-size:11px; color:#94a3b8; margin-top:4px;">${file.name} (${(file.size / (1024*1024)).toFixed(1)}MB)</div>`;
    } else {
        box.innerHTML = `<img src="${url}" style="max-height:120px; border-radius:4px;"><div style="font-size:11px; color:#94a3b8; margin-top:4px;">${file.name} (${(file.size / (1024*1024)).toFixed(1)}MB)</div>`;
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("active");
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

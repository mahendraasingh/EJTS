// ==========================================================================
// SMART BILLBOARD AI ANALYTICS - FULLSCREEN BILLBOARD PLAYER
// ==========================================================================

let playlist = [];
let currentIndex = 0;
let playbackTimer = null;
let countdownInterval = null;
let secondsRemaining = 0;

document.addEventListener("DOMContentLoaded", () => {
    initBillboard();

    // Keyboard controls
    document.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === " ") {
            e.preventDefault();
            nextAd();
        } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            prevAd();
        } else if (e.key.toLowerCase() === "f") {
            toggleFullscreen();
        }
    });

    // Refresh playlist every 45 seconds to fetch newly added ads
    setInterval(refreshPlaylist, 45000);
});

async function initBillboard() {
    await refreshPlaylist();
    if (playlist.length > 0) {
        showAd(0);
    }
}

async function refreshPlaylist() {
    try {
        const response = await fetch("/api/billboard/playlist");
        const data = await response.json();
        if (data.playlist && data.playlist.length > 0) {
            playlist = data.playlist;
        }
    } catch (err) {
        console.error("Failed to load billboard playlist:", err);
    }
}

function showAd(index) {
    if (playlist.length === 0) return;
    
    // Clear any existing timers
    clearTimeout(playbackTimer);
    clearInterval(countdownInterval);

    currentIndex = (index + playlist.length) % playlist.length;
    const ad = playlist[currentIndex];

    const container = document.getElementById("adMediaContainer");
    const titleEl = document.getElementById("currentAdTitle");
    const countdownEl = document.getElementById("adDurationCountdown");

    if (titleEl) titleEl.textContent = ad.name;

    // Notify backend about active advertisement
    notifyBackendTransition(ad.id);

    const mediaUrl = `/media/advertisements/${ad.media_filename}`;
    const isVideo = ad.media_type === "video";
    const duration = ad.duration || 10;
    secondsRemaining = duration;

    if (countdownEl) countdownEl.textContent = `${secondsRemaining}s`;

    if (isVideo) {
        container.innerHTML = `
            <video id="billboardVideo" src="${mediaUrl}" autoplay muted playsinline style="max-width:100%; max-height:100%; object-fit:contain;">
            </video>
        `;
        const video = document.getElementById("billboardVideo");
        
        video.onloadedmetadata = () => {
            if (video.duration && !isNaN(video.duration)) {
                secondsRemaining = Math.ceil(video.duration);
                if (countdownEl) countdownEl.textContent = `${secondsRemaining}s`;
            }
        };

        // Progress countdown
        countdownInterval = setInterval(() => {
            secondsRemaining = Math.max(0, secondsRemaining - 1);
            if (countdownEl) countdownEl.textContent = `${secondsRemaining}s`;
        }, 1000);

        video.onended = () => {
            nextAd();
        };

        video.onerror = () => {
            console.warn("Video failed to play, advancing to next ad.");
            playbackTimer = setTimeout(nextAd, 4000);
        };

        // Safety fallback in case video stalls
        playbackTimer = setTimeout(() => {
            nextAd();
        }, (duration + 5) * 1000);

    } else {
        // Static image ad
        container.innerHTML = `
            <img id="billboardImage" src="${mediaUrl}" style="opacity: 0; max-width: 100%; max-height: 100%; object-fit: contain;">
        `;
        const img = document.getElementById("billboardImage");
        img.onload = () => {
            img.style.transition = "opacity 0.6s ease-in-out";
            img.style.opacity = "1";
        };
        img.onerror = () => {
            console.warn("Image failed to load, trying default fallback.");
            img.src = "/media/advertisements/default_ad.jpg";
            img.style.opacity = "1";
        };

        countdownInterval = setInterval(() => {
            secondsRemaining = Math.max(0, secondsRemaining - 1);
            if (countdownEl) countdownEl.textContent = `${secondsRemaining}s`;
        }, 1000);

        playbackTimer = setTimeout(() => {
            nextAd();
        }, duration * 1000);
    }
}

function nextAd() {
    showAd(currentIndex + 1);
}

function prevAd() {
    showAd(currentIndex - 1);
}

async function notifyBackendTransition(adId) {
    try {
        await fetch("/api/billboard/transition", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ad_id: adId })
        });
    } catch (err) {
        console.warn("Could not sync ad transition with backend:", err);
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn("Fullscreen request error:", err);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

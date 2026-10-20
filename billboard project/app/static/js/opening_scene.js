// ==========================================================================
// SMART BILLBOARD AI ANALYTICS - CINEMATIC OPENING SCENE SCRIPT
// ==========================================================================

(function() {
    let audioEnabled = true;
    let audioCtx = null;
    let sceneTimer = null;
    let countdownTimer = null;

    // Web Audio Synthesizer for futuristic sci-fi sound FX
    function getAudioContext() {
        if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
            try {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                audioCtx = new AudioContextClass();
            } catch (e) {
                audioCtx = null;
            }
        }
        if (audioCtx && audioCtx.state === "suspended") {
            audioCtx.resume().catch(() => {});
        }
        return audioCtx;
    }

    function playTechChirp(freq = 880, type = "sine", duration = 0.06) {
        if (!audioEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + duration);

            gain.gain.setValueAtTime(0.04, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            // Audio policy fallback
        }
    }

    function playPowerUpChord() {
        if (!audioEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const chords = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            chords.forEach((freq, idx) => {
                setTimeout(() => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "triangle";
                    osc.frequency.setValueAtTime(freq, ctx.currentTime);
                    gain.gain.setValueAtTime(0.05, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.4);
                }, idx * 70);
            });
        } catch (e) {
            // Audio policy fallback
        }
    }

    function toggleAudio() {
        audioEnabled = !audioEnabled;
        const btn = document.getElementById("introAudioToggle");
        if (btn) {
            btn.innerHTML = audioEnabled 
                ? '<i class="fa-solid fa-volume-high"></i> Audio: FX Active'
                : '<i class="fa-solid fa-volume-xmark"></i> Audio: Muted';
        }
    }

    function launchOpeningScene() {
        const overlay = document.getElementById("openingSceneOverlay");
        if (!overlay) return;

        overlay.classList.remove("scene-hidden", "scene-dismissing");
        resetSceneUI();

        const items = document.querySelectorAll(".diag-item");
        const progressFill = document.getElementById("sceneProgressFill");
        const progressPct = document.getElementById("sceneProgressPct");
        const enterBtn = document.getElementById("sceneEnterBtn");

        const steps = [
            { time: 350, pct: 20, itemIdx: 0, freq: 580 },
            { time: 750, pct: 38, itemIdx: 1, freq: 660 },
            { time: 1150, pct: 55, itemIdx: 2, freq: 740 },
            { time: 1550, pct: 72, itemIdx: 3, freq: 820 },
            { time: 1950, pct: 88, itemIdx: 4, freq: 920 },
            { time: 2350, pct: 100, itemIdx: 5, freq: 1040 }
        ];

        steps.forEach(step => {
            setTimeout(() => {
                if (progressFill) progressFill.style.width = `${step.pct}%`;
                if (progressPct) progressPct.textContent = `${step.pct}%`;
                if (items[step.itemIdx]) {
                    items[step.itemIdx].classList.add("active");
                }
                playTechChirp(step.freq, "sine", 0.05);

                if (step.pct === 100) {
                    playPowerUpChord();
                    const statusText = document.getElementById("sceneStatusLabel");
                    if (statusText) {
                        statusText.textContent = "SYSTEMS FULLY OPERATIONAL";
                        statusText.style.color = "#34d399";
                    }
                    if (enterBtn) {
                        enterBtn.style.boxShadow = "0 0 30px rgba(16, 185, 129, 0.7)";
                    }
                    startAutoDismissCountdown();
                }
            }, step.time);
        });
    }

    function resetSceneUI() {
        document.querySelectorAll(".diag-item").forEach(item => item.classList.remove("active"));
        const progressFill = document.getElementById("sceneProgressFill");
        const progressPct = document.getElementById("sceneProgressPct");
        const statusText = document.getElementById("sceneStatusLabel");
        const enterBtn = document.getElementById("sceneEnterBtn");

        if (progressFill) progressFill.style.width = "0%";
        if (progressPct) progressPct.textContent = "0%";
        if (statusText) {
            statusText.textContent = "INITIALIZING CORE SUBSYSTEMS...";
            statusText.style.color = "#38bdf8";
        }
        if (enterBtn) {
            enterBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> Enter Command Center';
            enterBtn.style.boxShadow = "0 4px 20px rgba(99, 102, 241, 0.4)";
        }
        if (countdownTimer) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }
    }

    function startAutoDismissCountdown() {
        let remaining = 3;
        const enterBtn = document.getElementById("sceneEnterBtn");
        if (countdownTimer) clearInterval(countdownTimer);

        countdownTimer = setInterval(() => {
            remaining--;
            if (enterBtn) {
                enterBtn.innerHTML = `<i class="fa-solid fa-arrow-right"></i> Enter Command Center (${remaining}s)`;
            }
            if (remaining <= 0) {
                clearInterval(countdownTimer);
                countdownTimer = null;
                dismissOpeningScene();
            }
        }, 1000);
    }

    function dismissOpeningScene() {
        if (countdownTimer) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }
        const overlay = document.getElementById("openingSceneOverlay");
        if (!overlay) return;

        overlay.classList.add("scene-dismissing");
        sessionStorage.setItem("smart_billboard_opened", "1");

        setTimeout(() => {
            overlay.classList.add("scene-hidden");
            overlay.classList.remove("scene-dismissing");
        }, 650);
    }

    // Expose helpers globally
    window.replayOpeningScene = function() {
        sessionStorage.removeItem("smart_billboard_opened");
        launchOpeningScene();
    };

    window.dismissOpeningScene = dismissOpeningScene;
    window.toggleIntroAudio = toggleAudio;

    document.addEventListener("DOMContentLoaded", () => {
        // Automatically trigger on first visit in the session or with ?intro=1 in URL
        const hasOpened = sessionStorage.getItem("smart_billboard_opened");
        const forceIntro = window.location.search.includes("intro=1");

        if (!hasOpened || forceIntro) {
            launchOpeningScene();
        } else {
            const overlay = document.getElementById("openingSceneOverlay");
            if (overlay) overlay.classList.add("scene-hidden");
        }
    });
})();

// ==========================================================================
// SMART BILLBOARD AI ANALYTICS - ADVANCED INTERACTIVE 3D WEB EXPERIENCE
// Built with Three.js WebGL Engine, Kinetic Lighting & Spatial Digital Twin
// ==========================================================================

class Billboard3DExperience {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.options = Object.assign({
            onTelemetryUpdate: null,
            initialTheme: "neon",
            autoSpin: true
        }, options);

        // Core Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // Meshes and groups
        this.billboardGroup = null;
        this.frameMesh = null;
        this.wireframeMesh = null;
        this.screenMesh = null;
        this.particles = null;
        this.particleGeo = null;
        this.pulseRings = [];

        // Lighting
        this.primaryLight = null;
        this.accentLight = null;
        this.ambientLight = null;

        // Screen texture canvas
        this.dynCanvas = null;
        this.dynCtx = null;
        this.canvasTexture = null;
        this.scanlineY = 0;
        this.audioBars = new Array(24).fill(0).map(() => Math.random());

        // Interaction state
        this.isDragging = false;
        this.prevMousePos = { x: 0, y: 0 };
        this.dragDistance = 0;

        this.rotY = 0.25;
        this.rotX = 0.12;
        this.targetRotY = 0.25;
        this.targetRotX = 0.12;
        this.velocityRotY = 0;
        this.velocityRotX = 0;

        this.cameraZ = 7.2;
        this.targetCameraZ = 7.2;

        this.autoSpin = this.options.autoSpin;
        this.autoSpinSpeed = 0.003;
        this.isWireframeMode = false;
        this.currentTheme = this.options.initialTheme;

        // Telemetry state
        this.occupancy = 0;
        this.currentAdName = "Smart Billboard AI";
        this.fps = 60;
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.fpsTimer = performance.now();

        // Theme palette definitions
        this.themes = {
            neon: {
                primary: 0x6366f1,
                accent: 0x06b6d4,
                glowLine: 0x818cf8,
                ambient: 0x14142b,
                screenAccent: "#6366f1",
                hudAccent: "#38bdf8"
            },
            emerald: {
                primary: 0x10b981,
                accent: 0x34d399,
                glowLine: 0x059669,
                ambient: 0x042017,
                screenAccent: "#10b981",
                hudAccent: "#34d399"
            },
            sunset: {
                primary: 0xf59e0b,
                accent: 0xf43f5e,
                glowLine: 0xfbbf24,
                ambient: 0x271406,
                screenAccent: "#f59e0b",
                hudAccent: "#f43f5e"
            },
            cyber: {
                primary: 0xec4899,
                accent: 0x8b5cf6,
                glowLine: 0xd946ef,
                ambient: 0x230728,
                screenAccent: "#ec4899",
                hudAccent: "#a855f7"
            }
        };

        this.init();
    }

    isWebGLAvailable() {
        try {
            const canvas = document.createElement("canvas");
            return !!(window.WebGLRenderingContext && 
                (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
        } catch (e) {
            return false;
        }
    }

    init() {
        if (!this.isWebGLAvailable() || typeof THREE === "undefined") {
            this.container.innerHTML = `
                <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--text-dim); text-align:center; padding:20px;">
                    <i class="fa-solid fa-cube" style="font-size:36px; margin-bottom:8px; color:var(--primary);"></i>
                    <p style="font-size:12px;">3D WebGL preview unavailable or disabled in browser.</p>
                </div>
            `;
            return;
        }

        const width = this.container.clientWidth || 400;
        const height = this.container.clientHeight || 320;

        // 1. Scene & Camera
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        this.camera.position.set(0, 0, this.cameraZ);

        // 2. High-Performance WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.25;
        this.container.innerHTML = "";
        this.container.appendChild(this.renderer.domElement);
        this.renderer.domElement.style.outline = "none";
        this.renderer.domElement.style.cursor = "grab";

        // 3. Dynamic Lighting System
        const currentTh = this.themes[this.currentTheme] || this.themes.neon;
        this.ambientLight = new THREE.AmbientLight(currentTh.ambient, 1.8);
        this.scene.add(this.ambientLight);

        this.primaryLight = new THREE.PointLight(currentTh.primary, 3.2, 25);
        this.primaryLight.position.set(4, 5, 5);
        this.scene.add(this.primaryLight);

        this.accentLight = new THREE.PointLight(currentTh.accent, 2.5, 20);
        this.accentLight.position.set(-4, -3, 4);
        this.scene.add(this.accentLight);

        // Subtle rear rim light for silhouette separation
        this.rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
        this.rimLight.position.set(0, 6, -5);
        this.scene.add(this.rimLight);

        // 4. Create Screen Texture & Procedural Canvas
        this.createDynamicScreen();

        // 5. Build 3D Billboard Model
        this.buildBillboardModel();

        // 6. Build Particle Cloud & Cyber Floor Grid
        this.buildParticleField();
        this.buildGroundReflectiveGrid();

        // 7. Interactive Event Listeners (Drag, Wheel, Touch, Click)
        this.bindInteractionEvents();

        // 8. Start High-Performance Animation Loop
        this.animate();
    }

    createDynamicScreen() {
        this.dynCanvas = document.createElement("canvas");
        this.dynCanvas.width = 512;
        this.dynCanvas.height = 320;
        this.dynCtx = this.dynCanvas.getContext("2d");
        this.updateScreenCanvas();
        this.canvasTexture = new THREE.CanvasTexture(this.dynCanvas);
        this.canvasTexture.minFilter = THREE.LinearFilter;
        this.canvasTexture.magFilter = THREE.LinearFilter;
    }

    updateScreenCanvas() {
        const ctx = this.dynCtx;
        if (!ctx) return;

        const th = this.themes[this.currentTheme] || this.themes.neon;

        // 1. Deep OLED dark gradient background
        const grad = ctx.createLinearGradient(0, 0, 512, 320);
        grad.addColorStop(0, "#030305");
        grad.addColorStop(0.5, "#090912");
        grad.addColorStop(1, "#030306");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 320);

        // 2. Cyber background grid
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;
        for (let x = 0; x < 512; x += 32) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 320);
            ctx.stroke();
        }
        for (let y = 0; y < 320; y += 32) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(512, y);
            ctx.stroke();
        }

        // 3. Cyber glowing corner brackets
        ctx.strokeStyle = th.screenAccent;
        ctx.lineWidth = 3;
        const bSize = 22;
        // Top-Left
        ctx.beginPath(); ctx.moveTo(14, 14 + bSize); ctx.lineTo(14, 14); ctx.lineTo(14 + bSize, 14); ctx.stroke();
        // Top-Right
        ctx.beginPath(); ctx.moveTo(498 - bSize, 14); ctx.lineTo(498, 14); ctx.lineTo(498, 14 + bSize); ctx.stroke();
        // Bottom-Left
        ctx.beginPath(); ctx.moveTo(14, 306 - bSize); ctx.lineTo(14, 306); ctx.lineTo(14 + bSize, 306); ctx.stroke();
        // Bottom-Right
        ctx.beginPath(); ctx.moveTo(498 - bSize, 306); ctx.lineTo(498, 306); ctx.lineTo(498, 306 - bSize); ctx.stroke();

        // 4. Header HUD with live time
        ctx.fillStyle = th.hudAccent;
        ctx.font = "bold 20px -apple-system, monospace";
        ctx.fillText("SMART BILLBOARD AI // DOOH CORE", 28, 48);

        const timeStr = new Date().toISOString().slice(11, 19) + " UTC";
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "12px monospace";
        ctx.fillText(timeStr, 360, 48);

        // 5. Active Campaign Title
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 19px -apple-system, sans-serif";
        const adDisplay = this.currentAdName.length > 24 ? this.currentAdName.slice(0, 24) + "..." : this.currentAdName;
        ctx.fillText(`CAMPAIGN: ${adDisplay}`, 28, 96);

        // 6. Live Audience Telemetry Status Box
        const isOccupied = this.occupancy > 0;
        const boxBg = isOccupied ? "rgba(16, 185, 129, 0.2)" : "rgba(99, 102, 241, 0.15)";
        const boxBorder = isOccupied ? "#10b981" : th.screenAccent;
        const textCol = isOccupied ? "#34d399" : "#a5b4fc";

        ctx.fillStyle = boxBg;
        ctx.fillRect(28, 120, 456, 88);
        ctx.strokeStyle = boxBorder;
        ctx.lineWidth = 2;
        ctx.strokeRect(28, 120, 456, 88);

        ctx.fillStyle = textCol;
        ctx.font = "bold 22px monospace";
        const occText = isOccupied ? `ZONE OCCUPANCY: ${this.occupancy} VIEWERS DETECTED` : `ZONE STANDBY // WAITING FOR VIEWERS`;
        ctx.fillText(occText, 44, 160);

        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.font = "12px monospace";
        ctx.fillText("CENTROID TRACKER: ARMED • KINEMATIC DWELL ESTIMATOR ACTIVE", 44, 188);

        // 7. Kinetic Audio / Frequency Waveform Visualizer
        const nowSec = Date.now() * 0.003;
        const barStartX = 28;
        const barY = 285;
        const barCount = 28;
        const barWidth = 12;
        const barGap = 4;

        for (let i = 0; i < barCount; i++) {
            const h = Math.abs(Math.sin(nowSec + i * 0.35)) * 40 + (isOccupied ? 15 : 6);
            const bx = barStartX + i * (barWidth + barGap);
            const by = barY - h;

            const barGrad = ctx.createLinearGradient(bx, by, bx, barY);
            barGrad.addColorStop(0, th.screenAccent);
            barGrad.addColorStop(1, th.hudAccent);
            ctx.fillStyle = barGrad;
            ctx.fillRect(bx, by, barWidth, h);
        }

        // 8. Animated Holographic Scanline
        this.scanlineY = (this.scanlineY + 3.5) % 320;
        const scanGrad = ctx.createLinearGradient(0, this.scanlineY - 12, 0, this.scanlineY + 12);
        scanGrad.addColorStop(0, "rgba(56, 189, 248, 0)");
        scanGrad.addColorStop(0.5, "rgba(56, 189, 248, 0.22)");
        scanGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
        ctx.fillStyle = scanGrad;
        ctx.fillRect(0, this.scanlineY - 12, 512, 24);

        if (this.canvasTexture) {
            this.canvasTexture.needsUpdate = true;
        }
    }

    buildBillboardModel() {
        this.billboardGroup = new THREE.Group();

        const currentTh = this.themes[this.currentTheme] || this.themes.neon;

        // Frame / Chassis - Anodized Aluminum with Beveled Edges
        const frameGeo = new THREE.BoxGeometry(4.3, 2.7, 0.26);
        this.frameMat = new THREE.MeshStandardMaterial({
            color: 0x111116,
            metalness: 0.92,
            roughness: 0.25,
            wireframe: false
        });
        this.frameMesh = new THREE.Mesh(frameGeo, this.frameMat);
        this.billboardGroup.add(this.frameMesh);

        // Glowing Structural Accent Edges
        const edges = new THREE.EdgesGeometry(frameGeo);
        this.wireframeMat = new THREE.LineBasicMaterial({
            color: currentTh.glowLine,
            linewidth: 2,
            transparent: true,
            opacity: 0.9
        });
        this.wireframeMesh = new THREE.LineSegments(edges, this.wireframeMat);
        this.billboardGroup.add(this.wireframeMesh);

        // High-Resolution Curved Bezel Screen Mesh
        const screenGeo = new THREE.PlaneGeometry(4.0, 2.42);
        this.screenMat = new THREE.MeshBasicMaterial({
            map: this.canvasTexture
        });
        this.screenMesh = new THREE.Mesh(screenGeo, this.screenMat);
        this.screenMesh.position.z = 0.136;
        this.billboardGroup.add(this.screenMesh);

        // Rig Mounting Pole & Neck
        const poleGeo = new THREE.CylinderGeometry(0.14, 0.14, 2.4, 24);
        const poleMat = new THREE.MeshStandardMaterial({
            color: 0x08080a,
            metalness: 0.95,
            roughness: 0.15
        });
        const poleMesh = new THREE.Mesh(poleGeo, poleMat);
        poleMesh.position.y = -2.3;
        this.billboardGroup.add(poleMesh);

        // Sleek Heavy Pedestal Stand
        const baseGeo = new THREE.CylinderGeometry(0.9, 1.25, 0.18, 36);
        const baseMesh = new THREE.Mesh(baseGeo, poleMat);
        baseMesh.position.y = -3.5;
        this.billboardGroup.add(baseMesh);

        // Glowing Pedestal Ring
        const ringGeo = new THREE.TorusGeometry(1.0, 0.02, 16, 64);
        const ringMat = new THREE.MeshBasicMaterial({
            color: currentTh.primary,
            transparent: true,
            opacity: 0.8
        });
        this.pedestalRing = new THREE.Mesh(ringGeo, ringMat);
        this.pedestalRing.rotation.x = Math.PI / 2;
        this.pedestalRing.position.y = -3.42;
        this.billboardGroup.add(this.pedestalRing);

        this.scene.add(this.billboardGroup);
    }

    buildGroundReflectiveGrid() {
        const gridHelper = new THREE.GridHelper(16, 24, 0x6366f1, 0x1e1e2d);
        gridHelper.position.y = -3.55;
        gridHelper.material.opacity = 0.25;
        gridHelper.material.transparent = true;
        this.gridHelper = gridHelper;
        this.scene.add(gridHelper);
    }

    buildParticleField() {
        const particleCount = 260;
        this.particleGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        const currentTh = this.themes[this.currentTheme] || this.themes.neon;
        const color1 = new THREE.Color(currentTh.primary);
        const color2 = new THREE.Color(currentTh.accent);

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 14;
            positions[i + 1] = (Math.random() - 0.5) * 10;
            positions[i + 2] = (Math.random() - 0.5) * 10;

            velocities[i] = (Math.random() - 0.5) * 0.005;
            velocities[i + 1] = (Math.random() - 0.5) * 0.005;
            velocities[i + 2] = (Math.random() - 0.5) * 0.005;

            const c = Math.random() > 0.5 ? color1 : color2;
            colors[i] = c.r;
            colors[i + 1] = c.g;
            colors[i + 2] = c.b;
        }

        this.particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        this.particleGeo.setAttribute("velocity", new THREE.BufferAttribute(velocities, 3));
        this.particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.09,
            vertexColors: true,
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(this.particleGeo, material);
        this.scene.add(this.particles);
    }

    bindInteractionEvents() {
        const el = this.renderer.domElement;

        // Pointer Down (Drag Start)
        el.addEventListener("mousedown", (e) => {
            this.isDragging = true;
            this.dragDistance = 0;
            this.prevMousePos = { x: e.clientX, y: e.clientY };
            el.style.cursor = "grabbing";
        });

        // Pointer Move (360° Free Orbit Drag)
        window.addEventListener("mousemove", (e) => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.prevMousePos.x;
                const deltaY = e.clientY - this.prevMousePos.y;
                this.dragDistance += Math.abs(deltaX) + Math.abs(deltaY);

                this.velocityRotY = deltaX * 0.005;
                this.velocityRotX = deltaY * 0.005;

                this.targetRotY += this.velocityRotY;
                this.targetRotX += this.velocityRotX;

                // Restrict X tilt within -75° to +75° for natural ergonomics
                this.targetRotX = Math.max(-1.3, Math.min(1.3, this.targetRotX));

                this.prevMousePos = { x: e.clientX, y: e.clientY };
            }
        });

        // Pointer Up (Drag End & Click-to-Pulse)
        window.addEventListener("mouseup", () => {
            if (this.isDragging) {
                this.isDragging = false;
                el.style.cursor = "grab";
                // If it was a clean click without significant drag (< 6px), trigger interactive pulse wave
                if (this.dragDistance < 6) {
                    this.triggerPulse();
                }
            }
        });

        // Wheel Zoom
        el.addEventListener("wheel", (e) => {
            e.preventDefault();
            const zoomDelta = e.deltaY * 0.005;
            this.targetCameraZ = Math.max(3.8, Math.min(11.0, this.targetCameraZ + zoomDelta));
        }, { passive: false });

        // Touch Support for Mobile & Tablets
        el.addEventListener("touchstart", (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.dragDistance = 0;
                this.prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        });

        window.addEventListener("touchmove", (e) => {
            if (this.isDragging && e.touches.length === 1) {
                const deltaX = e.touches[0].clientX - this.prevMousePos.x;
                const deltaY = e.touches[0].clientY - this.prevMousePos.y;
                this.dragDistance += Math.abs(deltaX) + Math.abs(deltaY);

                this.targetRotY += deltaX * 0.006;
                this.targetRotX += deltaY * 0.006;
                this.targetRotX = Math.max(-1.3, Math.min(1.3, this.targetRotX));

                this.prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        });

        window.addEventListener("touchend", () => {
            if (this.isDragging) {
                this.isDragging = false;
                if (this.dragDistance < 8) {
                    this.triggerPulse();
                }
            }
        });

        window.addEventListener("resize", () => this.onWindowResize());
    }

    triggerPulse() {
        // Create an expanding kinetic shockwave ring
        const currentTh = this.themes[this.currentTheme] || this.themes.neon;
        const ringGeo = new THREE.RingGeometry(0.2, 0.35, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: currentTh.accent,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95
        });
        const pulseMesh = new THREE.Mesh(ringGeo, ringMat);
        pulseMesh.position.set(0, 0, 0.16);
        this.billboardGroup.add(pulseMesh);

        this.pulseRings.push({
            mesh: pulseMesh,
            scale: 1.0,
            opacity: 0.95
        });

        // Flash screen canvas momentarily
        if (this.dynCtx) {
            this.dynCtx.fillStyle = "rgba(255, 255, 255, 0.25)";
            this.dynCtx.fillRect(0, 0, 512, 320);
            if (this.canvasTexture) this.canvasTexture.needsUpdate = true;
        }
    }

    setTheme(themeName) {
        if (!this.themes[themeName]) return;
        this.currentTheme = themeName;
        const th = this.themes[themeName];

        if (this.primaryLight) this.primaryLight.color.setHex(th.primary);
        if (this.accentLight) this.accentLight.color.setHex(th.accent);
        if (this.ambientLight) this.ambientLight.color.setHex(th.ambient);
        if (this.wireframeMat) this.wireframeMat.color.setHex(th.glowLine);
        if (this.pedestalRing) this.pedestalRing.material.color.setHex(th.primary);
        if (this.gridHelper) this.gridHelper.material.color.setHex(th.primary);

        // Update particle colors
        if (this.particleGeo) {
            const colors = this.particleGeo.attributes.color.array;
            const c1 = new THREE.Color(th.primary);
            const c2 = new THREE.Color(th.accent);
            for (let i = 0; i < colors.length; i += 3) {
                const c = Math.random() > 0.5 ? c1 : c2;
                colors[i] = c.r;
                colors[i + 1] = c.g;
                colors[i + 2] = c.b;
            }
            this.particleGeo.attributes.color.needsUpdate = true;
        }

        this.updateScreenCanvas();
    }

    setViewPreset(preset) {
        switch (preset) {
            case "front":
                this.targetRotX = 0.0;
                this.targetRotY = 0.0;
                this.targetCameraZ = 5.8;
                break;
            case "isometric":
                this.targetRotX = 0.45;
                this.targetRotY = 0.72;
                this.targetCameraZ = 8.2;
                break;
            case "top":
                this.targetRotX = 1.15;
                this.targetRotY = 0.0;
                this.targetCameraZ = 7.8;
                break;
            case "perspective":
            default:
                this.targetRotX = 0.12;
                this.targetRotY = 0.32;
                this.targetCameraZ = 7.2;
                break;
        }
    }

    toggleAutoSpin() {
        this.autoSpin = !this.autoSpin;
        return this.autoSpin;
    }

    toggleWireframe() {
        this.isWireframeMode = !this.isWireframeMode;
        if (this.frameMat) {
            this.frameMat.wireframe = this.isWireframeMode;
            this.frameMat.color.setHex(this.isWireframeMode ? 0x222238 : 0x111116);
            this.frameMat.needsUpdate = true;
        }
        return this.isWireframeMode;
    }

    zoomIn() {
        this.targetCameraZ = Math.max(3.8, this.targetCameraZ - 0.8);
    }

    zoomOut() {
        this.targetCameraZ = Math.min(11.0, this.targetCameraZ + 0.8);
    }

    resetAngle() {
        this.targetRotX = 0.12;
        this.targetRotY = 0.25;
        this.targetCameraZ = 7.2;
        this.velocityRotX = 0;
        this.velocityRotY = 0;
    }

    updateTelemetry(occupancy, adName) {
        let changed = false;
        if (occupancy !== undefined && occupancy !== this.occupancy) {
            this.occupancy = occupancy;
            changed = true;
        }
        if (adName && adName !== this.currentAdName) {
            this.currentAdName = adName;
            changed = true;
        }
        if (changed) {
            this.updateScreenCanvas();
        }
    }

    onWindowResize() {
        if (!this.container || !this.renderer || !this.camera) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width === 0 || height === 0) return;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // FPS calculation
        this.frameCount++;
        const now = performance.now();
        if (now - this.fpsTimer >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.fpsTimer));
            this.frameCount = 0;
            this.fpsTimer = now;
        }

        // Auto-orbit when enabled and not actively dragging
        if (this.autoSpin && !this.isDragging) {
            this.targetRotY += this.autoSpinSpeed;
        }

        // Smooth damping interpolation
        this.rotY += (this.targetRotY - this.rotY) * 0.08;
        this.rotX += (this.targetRotX - this.rotX) * 0.08;
        this.cameraZ += (this.targetCameraZ - this.cameraZ) * 0.1;

        if (this.billboardGroup) {
            this.billboardGroup.rotation.y = this.rotY;
            this.billboardGroup.rotation.x = this.rotX;

            // Idle organic vertical float
            const floatTime = now * 0.0016;
            this.billboardGroup.position.y = Math.sin(floatTime) * 0.08;
        }

        if (this.camera) {
            this.camera.position.z = this.cameraZ;
        }

        // Particle cloud dynamics
        if (this.particles) {
            this.particles.rotation.y += 0.0008 + (this.occupancy * 0.001);
            this.particles.rotation.x += 0.0004;
        }

        // Shockwave rings expansion
        for (let i = this.pulseRings.length - 1; i >= 0; i--) {
            const p = this.pulseRings[i];
            p.scale += 0.12;
            p.opacity -= 0.025;
            p.mesh.scale.set(p.scale, p.scale, 1);
            p.mesh.material.opacity = Math.max(0, p.opacity);

            if (p.opacity <= 0) {
                this.billboardGroup.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.pulseRings.splice(i, 1);
            }
        }

        // Continuous procedural screen refresh (scanline, audio bars, clock)
        this.updateScreenCanvas();

        // Render WebGL frame
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }

        // Emit telemetry state to callback
        if (typeof this.options.onTelemetryUpdate === "function") {
            this.options.onTelemetryUpdate({
                rotX: (this.rotX * (180 / Math.PI)).toFixed(1),
                rotY: (this.rotY * (180 / Math.PI)).toFixed(1),
                distance: this.cameraZ.toFixed(1),
                fps: this.fps,
                theme: this.currentTheme,
                isWireframe: this.isWireframeMode,
                autoSpin: this.autoSpin
            });
        }
    }
}

// Global window registration
window.Billboard3D = Billboard3DExperience;

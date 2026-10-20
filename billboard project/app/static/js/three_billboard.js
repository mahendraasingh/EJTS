// ==========================================================================
// SMART BILLBOARD AI ANALYTICS - 3D THREE.JS WEB EXPERIENCE
// ==========================================================================

class Billboard3DExperience {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.billboardMesh = null;
        this.screenMesh = null;
        this.particles = null;
        this.canvasTexture = null;
        this.dynCanvas = null;
        this.dynCtx = null;

        this.mouseX = 0;
        this.mouseY = 0;
        this.targetRotY = 0;
        this.targetRotX = 0;

        this.occupancy = 0;
        this.currentAdName = "Smart Billboard AI";

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
        const height = this.container.clientHeight || 280;

        // 1. Scene & Camera
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        this.camera.position.set(0, 0, 7.5);

        // 2. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.innerHTML = "";
        this.container.appendChild(this.renderer.domElement);

        // 3. Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0x6366f1, 2.5, 20);
        pointLight.position.set(3, 4, 5);
        this.scene.add(pointLight);

        const accentLight = new THREE.PointLight(0x10b981, 2.0, 15);
        accentLight.position.set(-3, -2, 4);
        this.scene.add(accentLight);

        // 4. Create Dynamic Screen Texture
        this.createDynamicScreen();

        // 5. Build 3D Billboard Model
        this.buildBillboardModel();

        // 6. Build Ambient Particle Field
        this.buildParticleField();

        // 7. Event Listeners
        this.container.addEventListener("mousemove", (e) => this.onMouseMove(e));
        window.addEventListener("resize", () => this.onWindowResize());

        // 8. Start Render Loop
        this.animate();
    }

    createDynamicScreen() {
        this.dynCanvas = document.createElement("canvas");
        this.dynCanvas.width = 512;
        this.dynCanvas.height = 320;
        this.dynCtx = this.dynCanvas.getContext("2d");
        this.updateScreenCanvas();
        this.canvasTexture = new THREE.CanvasTexture(this.dynCanvas);
    }

    updateScreenCanvas() {
        const ctx = this.dynCtx;
        if (!ctx) return;

        // Dark gradient background
        const grad = ctx.createLinearGradient(0, 0, 512, 320);
        grad.addColorStop(0, "#090d16");
        grad.addColorStop(1, "#1e1b4b");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 320);

        // Cyber grid lines
        ctx.strokeStyle = "rgba(99, 102, 241, 0.25)";
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

        // Screen border
        ctx.strokeStyle = "#6366f1";
        ctx.lineWidth = 4;
        ctx.strokeRect(10, 10, 492, 300);

        // Holographic HUD text
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 24px -apple-system, sans-serif";
        ctx.fillText("SMART BILLBOARD AI", 24, 50);

        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 18px -apple-system, sans-serif";
        ctx.fillText(`CAMPAIGN: ${this.currentAdName.slice(0, 26)}`, 24, 110);

        // Live audience metric box
        ctx.fillStyle = "rgba(16, 185, 129, 0.2)";
        ctx.fillRect(24, 140, 464, 80);
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2;
        ctx.strokeRect(24, 140, 464, 80);

        ctx.fillStyle = "#34d399";
        ctx.font = "bold 20px monospace";
        ctx.fillText(`ZONE OCCUPANCY: ${this.occupancy} VIEWERS`, 40, 188);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "14px monospace";
        ctx.fillText("EDGE COMPUTER VISION // YOLOV8 ONLINE", 24, 280);

        if (this.canvasTexture) {
            this.canvasTexture.needsUpdate = true;
        }
    }

    buildBillboardModel() {
        this.billboardGroup = new THREE.Group();

        // Frame / Enclosure
        const frameGeo = new THREE.BoxGeometry(4.2, 2.6, 0.25);
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            metalness: 0.8,
            roughness: 0.2
        });
        const frameMesh = new THREE.Mesh(frameGeo, frameMat);
        this.billboardGroup.add(frameMesh);

        // Outer Glowing Edge
        const edges = new THREE.EdgesGeometry(frameGeo);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x6366f1, linewidth: 2 });
        const wireframe = new THREE.LineSegments(edges, lineMat);
        this.billboardGroup.add(wireframe);

        // Screen Surface
        const screenGeo = new THREE.PlaneGeometry(3.9, 2.3);
        const screenMat = new THREE.MeshBasicMaterial({
            map: this.canvasTexture
        });
        this.screenMesh = new THREE.Mesh(screenGeo, screenMat);
        this.screenMesh.position.z = 0.13;
        this.billboardGroup.add(this.screenMesh);

        // Stand / Pole
        const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.0, 16);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 });
        const poleMesh = new THREE.Mesh(poleGeo, poleMat);
        poleMesh.position.y = -2.1;
        this.billboardGroup.add(poleMesh);

        // Base Pedestal
        const baseGeo = new THREE.CylinderGeometry(0.8, 1.0, 0.15, 32);
        const baseMesh = new THREE.Mesh(baseGeo, poleMat);
        baseMesh.position.y = -3.1;
        this.billboardGroup.add(baseMesh);

        this.scene.add(this.billboardGroup);
    }

    buildParticleField() {
        const particleCount = 200;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        const color1 = new THREE.Color(0x6366f1);
        const color2 = new THREE.Color(0x10b981);

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 12;
            positions[i + 1] = (Math.random() - 0.5) * 8;
            positions[i + 2] = (Math.random() - 0.5) * 8;

            const c = Math.random() > 0.5 ? color1 : color2;
            colors[i] = c.r;
            colors[i + 1] = c.g;
            colors[i + 2] = c.b;
        }

        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.08,
            vertexColors: true,
            transparent: true,
            opacity: 0.65
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    onMouseMove(event) {
        const rect = this.container.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        this.targetRotY = x * 0.8;
        this.targetRotX = -y * 0.5;
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

    resetAngle() {
        this.targetRotY = 0;
        this.targetRotX = 0;
        if (this.billboardGroup) {
            this.billboardGroup.rotation.y = 0;
            this.billboardGroup.rotation.x = 0;
        }
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

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.billboardGroup) {
            // Smooth damping toward mouse orientation
            this.billboardGroup.rotation.y += (this.targetRotY - this.billboardGroup.rotation.y) * 0.05;
            this.billboardGroup.rotation.x += (this.targetRotX - this.billboardGroup.rotation.x) * 0.05;

            // Idle floating animation
            const time = Date.now() * 0.0015;
            this.billboardGroup.position.y = Math.sin(time) * 0.1;
        }

        if (this.particles) {
            this.particles.rotation.y += 0.001 + (this.occupancy * 0.001);
            this.particles.rotation.x += 0.0005;
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// Global 3D Experience instance
window.Billboard3D = Billboard3DExperience;

/**
 * Games module — hub 3 world 3D (Taman, Server, Kota) berbasis Three.js.
 * Kontrol: keyboard+mouse (desktop) / analog+touch (mobile portrait).
 * Gaya menu: Material Design 3, tema vibrant.
 */
import { toast } from "../components/ui.js";

/** Definisi world yang tersedia di hub Games. */
export const gameWorlds = [
    {
        id: "park",
        name: "Keliling Taman",
        icon: "🌳",
        tagline: "Jalan santai di taman bunga & air mancur",
        chips: ["Open air", "Santai", "Portrait OK"],
        colors: { primary: "#2E7D32", secondary: "#66BB6A", surface: "#E8F5E9", on: "#1B5E20" }
    },
    {
        id: "server",
        name: "Area Server",
        icon: "🖥️",
        tagline: "Ruang data center neon & rak server berkedip",
        chips: ["Tech", "Glow", "Immersive"],
        colors: { primary: "#00897B", secondary: "#1DE9B6", surface: "#E0F2F1", on: "#004D40" }
    },
    {
        id: "city",
        name: "Keliling Kota",
        icon: "🏙️",
        tagline: "Kota malam vibrant dengan lampu jalan",
        chips: ["Night", "Skyline", "Walk"],
        colors: { primary: "#7C4DFF", secondary: "#B388FF", surface: "#EDE7F6", on: "#311B92" }
    }
];

/** @type {{cleanup:Function}|null} Session 3D aktif. */
let activeSession = null;

/**
 * True bila perangkat cenderung touch (HP/tablet).
 *
 * @returns {boolean}
 */
export function isTouchDevice() {
    return window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
}

/**
 * Render halaman hub Games (MD3).
 *
 * @param {HTMLElement} container - Page content.
 */
export function renderGamesPage(container) {
    container.innerHTML = `
        <div class="page-enter games-md3">
            <header class="games-hero">
                <div class="games-hero-bg" aria-hidden="true"></div>
                <div class="games-hero-content">
                    <span class="games-eyebrow">Material · Three.js · No game over</span>
                    <h1>Games</h1>
                    <p>Jelajahi 3 dunia 3D sambil jalan-jalan — ketemu banyak NPC. Kontrol ${isTouchDevice() ? "analog di layar" : "WASD + mouse"}.</p>
                </div>
            </header>

            <div class="games-controls-hint" role="note">
                ${
                isTouchDevice()
                    ? `<span class="chip-pill">📱 Analog kiri: jalan</span><span class="chip-pill">👆 Geser layar: lihat</span><span class="chip-pill">🚀 Tombol: lari</span><span class="chip-pill">🚶 Banyak NPC</span>`
                    : `<span class="chip-pill">⌨️ WASD / Panah: jalan</span><span class="chip-pill">🖱️ Drag / klik: lihat</span><span class="chip-pill">⇧ Shift: lari</span><span class="chip-pill">🚶 Banyak NPC</span>`
                }
            </div>

            <div class="games-grid">
                ${gameWorlds
                    .map(
                        (w, i) => `
                    <article class="world-card" style="--wc-primary:${w.colors.primary};--wc-secondary:${w.colors.secondary};--wc-surface:${w.colors.surface};--wc-on:${w.colors.on};animation-delay:${i * 0.06}s">
                        <div class="world-card-media" aria-hidden="true">
                            <div class="world-orb"></div>
                            <span class="world-icon">${w.icon}</span>
                        </div>
                        <div class="world-card-body">
                            <h2>${w.name}</h2>
                            <p>${w.tagline}</p>
                            <div class="world-chips">
                                ${w.chips.map((c) => `<span class="world-chip">${c}</span>`).join("")}
                            </div>
                            <button type="button" class="md3-btn filled world-play" data-world="${w.id}">
                                <span class="md3-btn-icon">▶</span>
                                Masuk dunia
                            </button>
                        </div>
                    </article>
                `
                    )
                    .join("")}
            </div>
        </div>
    `;

    container.querySelectorAll(".world-play").forEach((btn) => {
        btn.addEventListener("click", () => enterWorld(btn.dataset.world));
    });
}

/**
 * Buka overlay world 3D full-screen.
 *
 * @param {string} worldId - "park" | "server" | "city".
 */
export function enterWorld(worldId) {
    const meta = gameWorlds.find((w) => w.id === worldId);
    if (!meta) {
        toast("World tidak ditemukan.", "error");
        return;
    }
    if (activeSession) activeSession.cleanup();

    loadThree()
        .then((THREE) => {
            activeSession = startWorldSession(THREE, meta);
        })
        .catch((error) => {
            console.error("Three.js gagal dimuat:", error);
            toast("Gagal memuat Three.js. Cek koneksi internet.", "error");
        });
}

/**
 * Lazy-load THREE dari CDN (pakai window.THREE bila sudah ada).
 *
 * @returns {Promise<Object>} Namespace THREE.
 */
function loadThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js";
        s.onload = () => (window.THREE ? resolve(window.THREE) : reject(new Error("THREE missing")));
        s.onerror = () => reject(new Error("script load failed"));
        document.head.appendChild(s);
    });
}

/* =========================================================
   World session — scene, controls, loop, cleanup
   ========================================================= */

/**
 * Jalankan sesi 3D full-screen untuk satu world.
 *
 * @param {Object} THREE
 * @param {Object} meta - Entry dari gameWorlds.
 * @returns {{cleanup:Function}}
 */
function startWorldSession(THREE, meta) {
    const overlay = document.createElement("div");
    overlay.className = "world-overlay";
    overlay.innerHTML = `
        <div class="world-hud">
            <div class="world-hud-left">
                <button type="button" class="md3-btn tonal world-exit" aria-label="Keluar dunia">← Keluar</button>
                <div class="world-title-pill">
                    <span>${meta.icon}</span>
                    <strong>${meta.name}</strong>
                </div>
            </div>
            <div class="world-hud-right">
                <span class="world-coords" id="world-coords">0, 0</span>
                <button type="button" class="md3-btn tonal world-run-toggle" id="world-run" aria-pressed="false">Lari: OFF</button>
            </div>
        </div>
        <div class="world-hint" id="world-hint">${
            isTouchDevice()
                ? "Analog kiri untuk jalan · geser area kanan untuk melihat · tombol 🚀 lari"
                : "Klik canvas untuk fokus · WASD jalan · Shift lari · Esc lepas mouse"
        }</div>
        <div class="world-joystick" id="world-joystick" hidden>
            <div class="joy-base"><div class="joy-knob" id="joy-knob"></div></div>
        </div>
        <button type="button" class="world-sprint" id="world-sprint" hidden aria-label="Lari">🚀</button>
        <canvas class="world-canvas" id="world-canvas"></canvas>
    `;
    document.body.appendChild(overlay);
    document.body.classList.add("world-open");

    const canvas = overlay.querySelector("#world-canvas");
    const coordsEl = overlay.querySelector("#world-coords");
    const hintEl = overlay.querySelector("#world-hint");
    const runBtn = overlay.querySelector("#world-run");
    const exitBtn = overlay.querySelector(".world-exit");
    const joy = overlay.querySelector("#world-joystick");
    const knob = overlay.querySelector("#joy-knob");
    const sprintBtn = overlay.querySelector("#world-sprint");

    const touch = isTouchDevice();
    if (touch) {
        joy.hidden = false;
        sprintBtn.hidden = false;
    }

    /* ---------- Three setup ---------- */
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 400);

    const built = buildWorld(THREE, scene, meta.id);
    scene.fog = built.fog;
    scene.background = new THREE.Color(built.bg);

    /* ---------- Player / camera state ---------- */
    const player = {
        pos: new THREE.Vector3(built.spawn[0], 1.65, built.spawn[2]),
        yaw: built.spawn[3] || 0,
        pitch: -0.08,
        vel: new THREE.Vector3(),
        eye: 1.65
    };
    const keys = Object.create(null);
    const joyState = { active: false, x: 0, y: 0, id: null };
    const lookState = { dragging: false, lastX: 0, lastY: 0, id: null };
    let runToggle = false;
    let bobT = 0;
    let disposed = false;
    let raf = 0;

    /* ---------- Resize ---------- */
    const resize = () => {
        const w = overlay.clientWidth || window.innerWidth;
        const h = overlay.clientHeight || window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    /* ---------- Keyboard ---------- */
    const isTypingTarget = (t) =>
        !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);

    const onKeyDown = (e) => {
        if (isTypingTarget(e.target)) return;
        keys[e.code] = true;
        if (e.code === "Escape") exit();
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    };
    const onKeyUp = (e) => {
        keys[e.code] = false;
    };
    const clearAllKeys = () => {
        for (const k of Object.keys(keys)) keys[k] = false;
        lookState.dragging = false;
        joyEnd();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearAllKeys);

    /* ---------- Mouse look (drag / pointer lock) ---------- */
    const onMouseDown = (e) => {
        if (e.button !== 0) return;
        if (document.pointerLockElement === canvas) return;
        lookState.dragging = true;
        lookState.lastX = e.clientX;
        lookState.lastY = e.clientY;
    };
    const onMouseMove = (e) => {
        if (document.pointerLockElement === canvas) {
            applyLook(e.movementX, e.movementY);
            return;
        }
        if (!lookState.dragging) return;
        applyLook(e.clientX - lookState.lastX, e.clientY - lookState.lastY);
        lookState.lastX = e.clientX;
        lookState.lastY = e.clientY;
    };
    const onMouseUp = () => {
        lookState.dragging = false;
    };
    const onCanvasClick = () => {
        if (touch) return;
        canvas.requestPointerLock?.();
    };
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("click", onCanvasClick);

    function applyLook(dx, dy) {
        player.yaw -= dx * 0.0035;
        player.pitch -= dy * 0.003;
        player.pitch = Math.max(-1.2, Math.min(1.1, player.pitch));
        // Normalisasi yaw agar tidak drift tak terbatas
        if (player.yaw > Math.PI * 2 || player.yaw < -Math.PI * 2) {
            player.yaw = Math.atan2(Math.sin(player.yaw), Math.cos(player.yaw));
        }
    }

    /* ---------- Touch: joystick + look ---------- */
    const joyBase = joy.querySelector(".joy-base");
    const JOY_DEADZONE = 0.16;

    /** Terapkan deadzone + response curve halus untuk analog. */
    const applyJoyAxis = (v) => {
        const a = Math.abs(v);
        if (a < JOY_DEADZONE) return 0;
        const n = (a - JOY_DEADZONE) / (1 - JOY_DEADZONE);
        const curved = n * n * (3 - 2 * n);
        return Math.sign(v) * curved;
    };

    const joyStart = (e) => {
        const t = e.changedTouches ? e.changedTouches[0] : e;
        joyState.active = true;
        joyState.id = t.identifier ?? "mouse";
        joyMove(e);
        e.preventDefault();
    };
    const joyMove = (e) => {
        if (!joyState.active) return;
        let t = null;
        if (e.changedTouches) {
            for (const c of e.changedTouches) {
                if (c.identifier === joyState.id) t = c;
            }
            if (!t) return;
        } else t = e;

        const rect = joyBase.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        let dx = t.clientX - cx;
        let dy = t.clientY - cy;
        const max = rect.width * 0.36;
        const len = Math.hypot(dx, dy) || 1;
        if (len > max) {
            dx = (dx / len) * max;
            dy = (dy / len) * max;
        }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        joyState.x = applyJoyAxis(dx / max);
        joyState.y = applyJoyAxis(dy / max);
    };
    const joyEnd = () => {
        joyState.active = false;
        joyState.x = 0;
        joyState.y = 0;
        knob.style.transform = "translate(0,0)";
    };

    joy.addEventListener("touchstart", joyStart, { passive: false });
    joy.addEventListener("touchmove", joyMove, { passive: false });
    joy.addEventListener("touchend", joyEnd);
    joy.addEventListener("touchcancel", joyEnd);
    joy.addEventListener("mousedown", joyStart);
    window.addEventListener("mousemove", joyMove);
    window.addEventListener("mouseup", joyEnd);

    // Look: geser di canvas (bukan joystick)
    const onTouchStart = (e) => {
        for (const t of e.changedTouches) {
            if (lookState.id !== null) continue;
            if (joy.contains(t.target)) continue;
            lookState.id = t.identifier;
            lookState.lastX = t.clientX;
            lookState.lastY = t.clientY;
        }
    };
    const onTouchMove = (e) => {
        for (const t of e.changedTouches) {
            if (t.identifier !== lookState.id) continue;
            applyLook((t.clientX - lookState.lastX) * 1.2, (t.clientY - lookState.lastY) * 1.2);
            lookState.lastX = t.clientX;
            lookState.lastY = t.clientY;
        }
    };
    const onTouchEnd = (e) => {
        for (const t of e.changedTouches) {
            if (t.identifier === lookState.id) lookState.id = null;
        }
    };
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("touchcancel", onTouchEnd);

    sprintBtn.addEventListener("click", () => {
        runToggle = !runToggle;
        syncRunUi();
    });
    runBtn.addEventListener("click", () => {
        runToggle = !runToggle;
        syncRunUi();
    });

    function syncRunUi() {
        runBtn.textContent = `Lari: ${runToggle ? "ON" : "OFF"}`;
        runBtn.setAttribute("aria-pressed", String(runToggle));
        sprintBtn.classList.toggle("on", runToggle);
    }

    exitBtn.addEventListener("click", exit);

    function exit() {
        if (disposed) return;
        disposed = true;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        window.removeEventListener("blur", clearAllKeys);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        window.removeEventListener("mousemove", joyMove);
        window.removeEventListener("mouseup", joyEnd);
        if (document.pointerLockElement === canvas) document.exitPointerLock?.();
        built.dispose?.(THREE, scene);
        // dispose geometries/materials
        scene.traverse((obj) => {
            if (obj.geometry) obj.geometry.dispose?.();
            if (obj.material) {
                const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                mats.forEach((m) => {
                    if (m.map) m.map.dispose?.();
                    m.dispose?.();
                });
            }
        });
        renderer.dispose();
        overlay.remove();
        document.body.classList.remove("world-open");
        activeSession = null;
        hintTimer && clearInterval(hintTimer);
    }

    let hintTimer = setTimeout(() => {
        if (hintEl) hintEl.classList.add("fade");
    }, 6000);

    /* ---------- Movement ---------- */
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const wish = new THREE.Vector3();
    let lastTickTime = performance.now();

    /**
     * Baca input keyboard → (ix, iz) dalam rentang -1..1.
     * W/↑ maju (iz-), S/↓ mundur (iz+), A/← kiri (ix-), D/→ kanan (ix+).
     *
     * @returns {{ix:number, iz:number}}
     */
    const readKeyboardAxis = () => {
        let ix = 0;
        let iz = 0;
        if (keys.KeyW || keys.ArrowUp) iz -= 1;
        if (keys.KeyS || keys.ArrowDown) iz += 1;
        if (keys.KeyA || keys.ArrowLeft) ix -= 1;
        if (keys.KeyD || keys.ArrowRight) ix += 1;
        return { ix, iz };
    };

    const tick = () => {
        if (disposed) return;
        raf = requestAnimationFrame(tick);

        const now = performance.now();
        const dt = Math.min(0.05, Math.max(0.001, (now - lastTickTime) / 1000));
        lastTickTime = now;

        // Input keyboard (prioritas penuh 1.0) + analog (sudah deadzone & curve)
        const kb = readKeyboardAxis();
        let ix = kb.ix;
        let iz = kb.iz;
        if (joyState.active) {
            ix += joyState.x;
            iz += joyState.y;
        }
        const mag = Math.hypot(ix, iz);
        if (mag > 1) {
            ix /= mag;
            iz /= mag;
        }

        const running = runToggle || keys.ShiftLeft || keys.ShiftRight;
        const speed = running ? 7.2 : 3.6;

        // WASD relatif kamera: forward = arah pandang horizontal, right = 90° kanan
        forward.set(Math.sin(player.yaw), 0, Math.cos(player.yaw));
        right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
        wish.set(0, 0, 0);
        // iz- (W) → maju, iz+ (S) → mundur; ix- (A) → kiri, ix+ (D) → kanan
        wish.addScaledVector(forward, -iz);
        wish.addScaledVector(right, ix);
        if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed);

        // Smooth velocity berbasis dt (frame-rate independent)
        const smooth = 1 - Math.exp(-14 * dt);
        player.vel.lerp(wish, smooth);
        player.pos.x += player.vel.x * dt;
        player.pos.z += player.vel.z * dt;

        // Bounds
        const b = built.bounds;
        player.pos.x = Math.max(b.minX, Math.min(b.maxX, player.pos.x));
        player.pos.z = Math.max(b.minZ, Math.min(b.maxZ, player.pos.z));

        // Head bob
        const moving = wish.lengthSq() > 0.2;
        if (moving) bobT += 8.5 * dt * (running ? 1.4 : 1);
        const bob = moving ? Math.sin(bobT) * 0.035 : 0;

        camera.position.set(player.pos.x, player.eye + bob, player.pos.z);
        const look = new THREE.Vector3(
            Math.sin(player.yaw) * Math.cos(player.pitch),
            Math.sin(player.pitch),
            Math.cos(player.yaw) * Math.cos(player.pitch)
        );
        camera.lookAt(camera.position.clone().add(look));

        if (built.tick) built.tick(THREE, scene, now, dt);

        if (coordsEl) {
            coordsEl.textContent = `${player.pos.x.toFixed(1)}, ${player.pos.z.toFixed(1)}`;
        }

        renderer.render(scene, camera);
    };
    tick();

    return { cleanup: exit };
}

/* =========================================================
   World builders — park / server / city
   ========================================================= */

/**
 * Bangun scene sesuai world id.
 *
 * @param {Object} THREE
 * @param {Object} scene - THREE.Scene.
 * @param {string} id - World id.
 * @returns {{bg:number, fog:Object, spawn:number[], bounds:Object, tick?:Function}}
 */
function buildWorld(THREE, scene, id) {
    if (id === "server") return buildServerWorld(THREE, scene);
    if (id === "city") return buildCityWorld(THREE, scene);
    return buildParkWorld(THREE, scene);
}

function addLights(THREE, scene, opts) {
    const hemi = new THREE.HemisphereLight(opts.sky, opts.ground, opts.hemi ?? 0.85);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(opts.sun, opts.sunI ?? 1.0);
    sun.position.set(opts.sunPos?.[0] ?? 30, opts.sunPos?.[1] ?? 50, opts.sunPos?.[2] ?? 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 120;
    const s = 40;
    sun.shadow.camera.left = -s;
    sun.shadow.camera.right = s;
    sun.shadow.camera.top = s;
    sun.shadow.camera.bottom = -s;
    scene.add(sun);
    return sun;
}

function groundPlane(THREE, scene, color, size = 80) {
    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.05 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
}

/* =========================================================
   NPCs — pejalan kaki sederhana dengan animasi kaki/lengan
   ========================================================= */

/** @type {Array<{group:Object, parts:Object, state:Object}>} NPC aktif per world. */
const activeNpcs = [];

/**
 * Buat satu NPC humanoid sederhana.
 *
 * @param {Object} THREE
 * @param {{x:number, z:number, shirt?:string, pants?:string, skin?:string, hair?:string, scale?:number}} opts
 * @returns {{group:Object, parts:Object, state:Object}}
 */
function makeNpc(THREE, opts) {
    const scale = opts.scale ?? 1;
    const shirt = opts.shirt ?? "#EC407A";
    const pants = opts.pants ?? "#37474F";
    const skin = opts.skin ?? "#FFCC80";
    const hair = opts.hair ?? "#3E2723";

    const g = new THREE.Group();
    const mat = (c, rough = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: rough });

    // Legs (pivot di pinggul agar bisa diayun)
    const legGeo = new THREE.BoxGeometry(0.18 * scale, 0.55 * scale, 0.18 * scale);
    const legL = new THREE.Mesh(legGeo, mat(pants));
    legL.position.set(-0.11 * scale, 0.55 * scale, 0);
    legL.geometry.translate(0, -0.275 * scale, 0);
    legL.position.y = 0.55 * scale;
    const legR = legL.clone();
    legR.position.x = 0.11 * scale;
    legL.castShadow = legR.castShadow = true;

    // Body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.48 * scale, 0.55 * scale, 0.28 * scale),
        mat(shirt)
    );
    body.position.y = 0.95 * scale;
    body.castShadow = true;

    // Arms (pivot di bahu)
    const armGeo = new THREE.BoxGeometry(0.14 * scale, 0.48 * scale, 0.14 * scale);
    armGeo.translate(0, -0.2 * scale, 0);
    const armL = new THREE.Mesh(armGeo, mat(shirt));
    armL.position.set(-0.32 * scale, 1.15 * scale, 0);
    const armR = new THREE.Mesh(armGeo.clone(), mat(shirt));
    armR.position.set(0.32 * scale, 1.15 * scale, 0);
    armL.castShadow = armR.castShadow = true;

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2 * scale, 12, 10), mat(skin, 0.7));
    head.position.y = 1.42 * scale;
    head.castShadow = true;

    // Hair cap
    const hairMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.21 * scale, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
        mat(hair)
    );
    hairMesh.position.y = 1.45 * scale;

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.03 * scale, 6, 6);
    const eyeMat = new THREE.MeshStandardMaterial({ color: "#212121" });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.07 * scale, 1.44 * scale, 0.17 * scale);
    const eyeR = new THREE.Mesh(eyeGeo.clone(), eyeMat);
    eyeR.position.set(0.07 * scale, 1.44 * scale, 0.17 * scale);

    g.add(legL, legR, body, armL, armR, head, hairMesh, eyeL, eyeR);
    g.position.set(opts.x, 0, opts.z);

    const state = {
        homeX: opts.x,
        homeZ: opts.z,
        targetX: opts.x,
        targetZ: opts.z,
        speed: 0.7 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        waitT: Math.random() * 3,
        wanderR: 6 + Math.random() * 10
    };

    return { group: g, parts: { legL, legR, armL, armR, head }, state };
}

/**
 * Spawn banyak NPC tersebar di area world.
 *
 * @param {Object} THREE
 * @param {Object} scene
 * @param {{count:number, bounds:{minX:number,maxX:number,minZ:number,maxZ:number}, palette:Array, avoid?:{x:number,z:number,r:number}}} opts
 * @returns {Array} Daftar NPC.
 */
function spawnNpcs(THREE, scene, opts) {
    const list = [];
    const palette = opts.palette || [
        { shirt: "#EC407A", pants: "#37474F" },
        { shirt: "#42A5F5", pants: "#263238" },
        { shirt: "#66BB6A", pants: "#4E342E" },
        { shirt: "#FFA726", pants: "#37474F" },
        { shirt: "#AB47BC", pants: "#263238" },
        { shirt: "#26C6DA", pants: "#4E342E" },
        { shirt: "#EF5350", pants: "#37474F" },
        { shirt: "#D4E157", pants: "#263238" }
    ];
    const skins = ["#FFCC80", "#FFB74D", "#FFE0B2", "#D7A86E"];
    const hairs = ["#3E2723", "#212121", "#5D4037", "#4E342E", "#B71C1C"];

    for (let i = 0; i < opts.count; i++) {
        let x = 0;
        let z = 0;
        let ok = false;
        for (let tries = 0; tries < 20 && !ok; tries++) {
            x = opts.bounds.minX + Math.random() * (opts.bounds.maxX - opts.bounds.minX);
            z = opts.bounds.minZ + Math.random() * (opts.bounds.maxZ - opts.bounds.minZ);
            if (opts.avoid) {
                const d = Math.hypot(x - opts.avoid.x, z - opts.avoid.z);
                ok = d > opts.avoid.r;
            } else ok = true;
            // Jangan terlalu dekat NPC lain
            if (ok) {
                for (const n of list) {
                    if (Math.hypot(x - n.state.homeX, z - n.state.homeZ) < 3) {
                        ok = false;
                        break;
                    }
                }
            }
        }
        const c = palette[i % palette.length];
        const npc = makeNpc(THREE, {
            x,
            z,
            shirt: c.shirt,
            pants: c.pants,
            skin: skins[i % skins.length],
            hair: hairs[i % hairs.length],
            scale: 0.9 + Math.random() * 0.2
        });
        npc.state.targetX = x;
        npc.state.targetZ = z;
        scene.add(npc.group);
        list.push(npc);
        activeNpcs.push(npc);
    }
    return list;
}

/**
 * Update pergerakan + animasi NPC setiap frame.
 *
 * @param {Array} npcs - Daftar NPC.
 * @param {number} dt - Delta time detik.
 * @param {Object} [bounds] - Batas world opsional.
 */
function tickNpcs(npcs, dt, bounds) {
    for (const n of npcs) {
        const s = n.state;
        const p = n.group.position;

        if (s.waitT > 0) {
            s.waitT -= dt;
        } else {
            const dx = s.targetX - p.x;
            const dz = s.targetZ - p.z;
            const dist = Math.hypot(dx, dz);

            if (dist < 0.35) {
                // Pilih target baru di sekitar home
                const ang = Math.random() * Math.PI * 2;
                const r = Math.random() * s.wanderR;
                s.targetX = s.homeX + Math.cos(ang) * r;
                s.targetZ = s.homeZ + Math.sin(ang) * r;
                if (bounds) {
                    s.targetX = Math.max(bounds.minX + 1, Math.min(bounds.maxX - 1, s.targetX));
                    s.targetZ = Math.max(bounds.minZ + 1, Math.min(bounds.maxZ - 1, s.targetZ));
                }
                s.waitT = 1 + Math.random() * 4;
            } else {
                const step = Math.min(dist, s.speed * dt);
                p.x += (dx / dist) * step;
                p.z += (dz / dist) * step;
                // Hadap arah jalan
                n.group.rotation.y = Math.atan2(dx, dz);
                // Ayun kaki & lengan
                s.phase += dt * s.speed * 6;
                const swing = Math.sin(s.phase) * 0.55;
                n.parts.legL.rotation.x = swing;
                n.parts.legR.rotation.x = -swing;
                n.parts.armL.rotation.x = -swing * 0.7;
                n.parts.armR.rotation.x = swing * 0.7;
            }
        }

        // Idle bob ringan saat berhenti
        if (s.waitT > 0) {
            n.parts.legL.rotation.x *= 0.9;
            n.parts.legR.rotation.x *= 0.9;
            n.parts.armL.rotation.x *= 0.9;
            n.parts.armR.rotation.x *= 0.9;
            n.parts.head.position.y = (n.parts.head.userData.baseY ?? n.parts.head.position.y);
        }
    }
}

/**
 * Bersihkan NPC dari scene (saat ganti/exit world).
 *
 * @param {Object} THREE
 * @param {Object} scene
 * @param {Array} npcs
 */
function clearNpcs(THREE, scene, npcs) {
    for (const n of npcs) {
        scene.remove(n.group);
        n.group.traverse((obj) => {
            if (obj.geometry) obj.geometry.dispose?.();
            if (obj.material) {
                const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                mats.forEach((m) => m.dispose?.());
            }
        });
        const idx = activeNpcs.indexOf(n);
        if (idx >= 0) activeNpcs.splice(idx, 1);
    }
}

function makeTree(THREE, x, z, scale = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22 * scale, 0.3 * scale, 1.6 * scale, 8),
        new THREE.MeshStandardMaterial({ color: "#6d4c41", roughness: 1 })
    );
    trunk.position.y = 0.8 * scale;
    trunk.castShadow = true;
    const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(1.3 * scale, 2.4 * scale, 10),
        new THREE.MeshStandardMaterial({ color: "#43A047", roughness: 0.85 })
    );
    leaves.position.y = 2.5 * scale;
    leaves.castShadow = true;
    const leaves2 = new THREE.Mesh(
        new THREE.ConeGeometry(1.0 * scale, 1.8 * scale, 10),
        new THREE.MeshStandardMaterial({ color: "#66BB6A", roughness: 0.85 })
    );
    leaves2.position.y = 3.4 * scale;
    leaves2.castShadow = true;
    g.add(trunk, leaves, leaves2);
    g.position.set(x, 0, z);
    return g;
}

function makeFlower(THREE, x, z, color) {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.35, 6),
        new THREE.MeshStandardMaterial({ color: "#2E7D32" })
    );
    stem.position.y = 0.17;
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.15 })
    );
    head.position.y = 0.38;
    g.add(stem, head);
    g.position.set(x, 0, z);
    return g;
}

function buildParkWorld(THREE, scene) {
    const bg = 0x87CEEB;
    scene.fog = new THREE.Fog(bg, 40, 95);
    addLights(THREE, scene, { sky: 0xbfe7ff, ground: 0x556b2f, sun: 0xfff2c2, sunI: 1.15 });

    groundPlane(THREE, scene, "#7CB342", 90);

    // Path cross
    const pathMat = new THREE.MeshStandardMaterial({ color: "#D7CCC8", roughness: 1 });
    const pathH = new THREE.Mesh(new THREE.BoxGeometry(70, 0.06, 5), pathMat);
    pathH.position.y = 0.03;
    pathH.receiveShadow = true;
    const pathV = new THREE.Mesh(new THREE.BoxGeometry(5, 0.06, 70), pathMat);
    pathV.position.y = 0.03;
    pathV.receiveShadow = true;
    scene.add(pathH, pathV);

    // Fountain
    const fountain = new THREE.Group();
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(3.2, 3.4, 0.5, 24),
        new THREE.MeshStandardMaterial({ color: "#90A4AE", roughness: 0.7 })
    );
    base.position.y = 0.25;
    base.castShadow = true;
    const water = new THREE.Mesh(
        new THREE.CylinderGeometry(2.8, 2.8, 0.35, 24),
        new THREE.MeshStandardMaterial({
            color: "#29B6F6",
            transparent: true,
            opacity: 0.75,
            emissive: "#0288D1",
            emissiveIntensity: 0.2
        })
    );
    water.position.y = 0.55;
    const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.5, 2.2, 12),
        new THREE.MeshStandardMaterial({ color: "#B0BEC5" })
    );
    pillar.position.y = 1.4;
    const bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 0.7, 0.35, 16),
        new THREE.MeshStandardMaterial({ color: "#CFD8DC" })
    );
    bowl.position.y = 2.5;
    fountain.add(base, water, pillar, bowl);
    fountain.position.set(0, 0, 0);
    scene.add(fountain);

    // Water sparkle particles
    const dropGeo = new THREE.BufferGeometry();
    const N = 40;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        arr[i * 3] = Math.cos(a) * 0.6;
        arr[i * 3 + 1] = 2.6 + Math.random() * 0.8;
        arr[i * 3 + 2] = Math.sin(a) * 0.6;
    }
    dropGeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const drops = new THREE.Points(
        dropGeo,
        new THREE.PointsMaterial({ color: "#E1F5FE", size: 0.12, transparent: true, opacity: 0.9 })
    );
    scene.add(drops);

    // Trees ring
    const treePts = [];
    for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const r = 18 + (i % 3) * 4;
        treePts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    treePts.push([-28, -22], [26, 24], [-30, 20], [28, -26]);
    treePts.forEach(([x, z], i) => scene.add(makeTree(THREE, x, z, 0.9 + (i % 4) * 0.15)));

    // Flowers
    const fcolors = ["#EC407A", "#FFCA28", "#AB47BC", "#FF7043", "#29B6F6"];
    for (let i = 0; i < 40; i++) {
        const x = (Math.random() - 0.5) * 60;
        const z = (Math.random() - 0.5) * 60;
        if (Math.abs(x) < 4 || Math.abs(z) < 4) continue;
        scene.add(makeFlower(THREE, x, z, fcolors[i % fcolors.length]));
    }

    // Benches
    const benchMat = new THREE.MeshStandardMaterial({ color: "#8D6E63", roughness: 0.9 });
    [
        [6, 4, 0],
        [-6, 4, Math.PI],
        [6, -4, 0],
        [-6, -4, Math.PI]
    ].forEach(([x, z, ry]) => {
        const b = new THREE.Group();
        const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 0.7), benchMat);
        seat.position.y = 0.55;
        const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 0.12), benchMat);
        back.position.set(0, 0.95, -0.3);
        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.55), benchMat);
        legL.position.set(-0.9, 0.27, 0);
        const legR = legL.clone();
        legR.position.x = 0.9;
        b.add(seat, back, legL, legR);
        b.position.set(x, 0, z);
        b.rotation.y = ry;
        b.castShadow = true;
        scene.add(b);
    });

    // Birds (simple points orbit)
    const birdGeo = new THREE.BufferGeometry();
    const birdN = 12;
    const birdArr = new Float32Array(birdN * 3);
    birdGeo.setAttribute("position", new THREE.BufferAttribute(birdArr, 3));
    const birds = new THREE.Points(
        birdGeo,
        new THREE.PointsMaterial({ color: "#37474F", size: 0.25 })
    );
    scene.add(birds);

    // NPCs — pejalan taman
    const npcs = spawnNpcs(THREE, scene, {
        count: 16,
        bounds: { minX: -38, maxX: 38, minZ: -38, maxZ: 38 },
        avoid: { x: 0, z: 0, r: 5 },
        palette: [
            { shirt: "#EC407A", pants: "#37474F" },
            { shirt: "#42A5F5", pants: "#263238" },
            { shirt: "#66BB6A", pants: "#4E342E" },
            { shirt: "#FFA726", pants: "#37474F" },
            { shirt: "#AB47BC", pants: "#263238" },
            { shirt: "#26C6DA", pants: "#4E342E" },
            { shirt: "#EF5350", pants: "#37474F" },
            { shirt: "#D4E157", pants: "#263238" }
        ]
    });

    return {
        bg,
        fog: scene.fog,
        spawn: [0, 0, 12, Math.PI],
        bounds: { minX: -42, maxX: 42, minZ: -42, maxZ: 42 },
        tick(THREE, scene, t, dt = 0.016) {
            const p = drops.geometry.attributes.position;
            for (let i = 0; i < N; i++) {
                let y = p.getY(i) - 0.04;
                if (y < 0.7) y = 2.6 + Math.random() * 0.6;
                p.setY(i, y);
            }
            p.needsUpdate = true;

            const bp = birds.geometry.attributes.position;
            const tt = t * 0.0004;
            for (let i = 0; i < birdN; i++) {
                const a = tt + (i / birdN) * Math.PI * 2;
                const r = 16 + (i % 3) * 3;
                bp.setXYZ(i, Math.cos(a) * r, 14 + Math.sin(a * 2 + i) * 2, Math.sin(a) * r);
            }
            bp.needsUpdate = true;

            tickNpcs(npcs, dt, { minX: -38, maxX: 38, minZ: -38, maxZ: 38 });
        },
        dispose(THREE, scene) {
            clearNpcs(THREE, scene, npcs);
        }
    };
}

function buildServerWorld(THREE, scene) {
    const bg = 0x0a0f1a;
    scene.fog = new THREE.Fog(bg, 25, 70);
    addLights(THREE, scene, {
        sky: 0x1a237e,
        ground: 0x004d40,
        sun: 0x80d8ff,
        sunI: 0.35,
        hemi: 0.45,
        sunPos: [10, 30, 10]
    });

    // Floor grid
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(70, 70),
        new THREE.MeshStandardMaterial({
            color: "#0d1b2a",
            roughness: 0.4,
            metalness: 0.6,
            emissive: "#00695C",
            emissiveIntensity: 0.08
        })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(70, 35, 0x1DE9B6, 0x004d40);
    grid.position.y = 0.02;
    scene.add(grid);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({
        color: "#102a43",
        roughness: 0.7,
        metalness: 0.3,
        side: THREE.DoubleSide
    });
    const mkWall = (w, h, d, x, y, z) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
        m.position.set(x, y, z);
        m.receiveShadow = true;
        scene.add(m);
    };
    mkWall(70, 8, 0.4, 0, 4, -35);
    mkWall(70, 8, 0.4, 0, 4, 35);
    mkWall(0.4, 8, 70, -35, 4, 0);
    mkWall(0.4, 8, 70, 35, 4, 0);

    // Ceiling strip lights
    const stripMat = new THREE.MeshStandardMaterial({
        color: "#E0F7FA",
        emissive: "#1DE9B6",
        emissiveIntensity: 1.4
    });
    for (let i = -3; i <= 3; i++) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(50, 0.1, 0.35), stripMat);
        strip.position.set(0, 7.5, i * 8);
        scene.add(strip);
    }

    // Server racks with blinking LEDs
    const leds = [];
    const rackBody = new THREE.MeshStandardMaterial({ color: "#1b263b", roughness: 0.5, metalness: 0.7 });
    const positions = [];
    for (let col = -2; col <= 2; col++) {
        for (let row = -2; row <= 2; row++) {
            if (col === 0 && row === 0) continue;
            positions.push([col * 8, row * 10]);
        }
    }
    positions.forEach(([x, z], idx) => {
        const rack = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 1.4), rackBody);
        body.position.y = 1.6;
        body.castShadow = true;
        body.receiveShadow = true;
        rack.add(body);
        for (let u = 0; u < 6; u++) {
            const panel = new THREE.Mesh(
                new THREE.BoxGeometry(2.2, 0.35, 0.08),
                new THREE.MeshStandardMaterial({ color: "#263238", emissive: "#004d40", emissiveIntensity: 0.3 })
            );
            panel.position.set(0, 0.5 + u * 0.45, 0.72);
            rack.add(panel);
            const led = new THREE.Mesh(
                new THREE.SphereGeometry(0.06, 6, 6),
                new THREE.MeshStandardMaterial({
                    color: "#76FF03",
                    emissive: "#76FF03",
                    emissiveIntensity: 2
                })
            );
            led.position.set(0.9, 0.5 + u * 0.45, 0.78);
            rack.add(led);
            leds.push({ mesh: led, phase: (idx * 7 + u * 3) % 20 });
        }
        const glow = new THREE.PointLight(0x1de9b6, 0.4, 8);
        glow.position.set(0, 2.5, 1);
        rack.add(glow);
        rack.position.set(x, 0, z);
        scene.add(rack);
    });

    // Central console
    const consoleG = new THREE.Group();
    const desk = new THREE.Mesh(
        new THREE.BoxGeometry(4, 1, 2),
        new THREE.MeshStandardMaterial({ color: "#37474F", metalness: 0.5, roughness: 0.4 })
    );
    desk.position.y = 0.5;
    const screen = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 1.6, 0.1),
        new THREE.MeshStandardMaterial({
            color: "#00E5FF",
            emissive: "#00BCD4",
            emissiveIntensity: 1.2
        })
    );
    screen.position.set(0, 1.8, -0.3);
    screen.rotation.x = -0.2;
    consoleG.add(desk, screen);
    scene.add(consoleG);

    const scanLight = new THREE.PointLight(0x00e5ff, 1.2, 20);
    scanLight.position.set(0, 5, 0);
    scene.add(scanLight);

    // NPCs — teknisi / pengunjung data center
    const npcs = spawnNpcs(THREE, scene, {
        count: 14,
        bounds: { minX: -30, maxX: 30, minZ: -30, maxZ: 30 },
        avoid: { x: 0, z: 0, r: 4 },
        palette: [
            { shirt: "#00ACC1", pants: "#263238" },
            { shirt: "#26C6DA", pants: "#1b263b" },
            { shirt: "#1DE9B6", pants: "#263238" },
            { shirt: "#78909C", pants: "#1b263b" },
            { shirt: "#4FC3F7", pants: "#263238" },
            { shirt: "#80CBC4", pants: "#1b263b" },
            { shirt: "#B2EBF2", pants: "#263238" },
            { shirt: "#4DD0E1", pants: "#1b263b" }
        ]
    });

    return {
        bg,
        fog: scene.fog,
        spawn: [0, 0, 28, Math.PI],
        bounds: { minX: -32, maxX: 32, minZ: -32, maxZ: 32 },
        tick(THREE, scene, t, dt = 0.016) {
            leds.forEach((l, i) => {
                const on = Math.sin(t * 0.004 + l.phase + i) > -0.2;
                l.mesh.material.emissiveIntensity = on ? 2.2 : 0.15;
                l.mesh.material.emissive.set(on ? 0x76ff03 : 0xff1744);
                l.mesh.material.color.set(on ? 0x76ff03 : 0xff1744);
            });
            scanLight.intensity = 1.0 + Math.sin(t * 0.003) * 0.4;
            tickNpcs(npcs, dt, { minX: -30, maxX: 30, minZ: -30, maxZ: 30 });
        },
        dispose(THREE, scene) {
            clearNpcs(THREE, scene, npcs);
        }
    };
}

function buildCityWorld(THREE, scene) {
    const bg = 0x1a1440;
    scene.fog = new THREE.Fog(bg, 35, 110);
    addLights(THREE, scene, {
        sky: 0x7c4dff,
        ground: 0x263238,
        sun: 0xffab91,
        sunI: 0.55,
        hemi: 0.55,
        sunPos: [-20, 40, 15]
    });

    // Ambient sky glow
    const skyDome = new THREE.Mesh(
        new THREE.SphereGeometry(180, 24, 16),
        new THREE.MeshBasicMaterial({
            color: 0x2a1b5e,
            side: THREE.BackSide
        })
    );
    scene.add(skyDome);

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starN = 200;
    const starArr = new Float32Array(starN * 3);
    for (let i = 0; i < starN; i++) {
        starArr[i * 3] = (Math.random() - 0.5) * 300;
        starArr[i * 3 + 1] = 40 + Math.random() * 80;
        starArr[i * 3 + 2] = (Math.random() - 0.5) * 300;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starArr, 3));
    scene.add(
        new THREE.Points(
            starGeo,
            new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, transparent: true, opacity: 0.85 })
        )
    );

    // Ground + roads
    groundPlane(THREE, scene, "#37474F", 100);
    const roadMat = new THREE.MeshStandardMaterial({ color: "#212121", roughness: 0.9 });
    const roadH = new THREE.Mesh(new THREE.BoxGeometry(90, 0.05, 8), roadMat);
    roadH.position.y = 0.03;
    const roadV = new THREE.Mesh(new THREE.BoxGeometry(8, 0.05, 90), roadMat);
    roadV.position.y = 0.03;
    scene.add(roadH, roadV);

    // Lane marks
    const markMat = new THREE.MeshStandardMaterial({ color: "#FFD54F", emissive: "#FFB300", emissiveIntensity: 0.4 });
    for (let i = -8; i <= 8; i++) {
        const mh = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.02, 0.25), markMat);
        mh.position.set(i * 5, 0.06, 0);
        scene.add(mh);
        const mv = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.02, 2.5), markMat);
        mv.position.set(0, 0.06, i * 5);
        scene.add(mv);
    }

    // Buildings
    const winColors = [0xff69b4, 0x4da6ff, 0xffd54f, 0x69f0ae, 0xb388ff, 0xff8a65];
    const buildings = [];
    const spots = [];
    for (let gx = -3; gx <= 3; gx++) {
        for (let gz = -3; gz <= 3; gz++) {
            if (Math.abs(gx) <= 0 || Math.abs(gz) <= 0) continue;
            if (gx === 0 && gz === 0) continue;
            spots.push([gx * 12, gz * 12]);
        }
    }
    // denser outer ring
    for (let gx = -4; gx <= 4; gx++) {
        for (let gz = -4; gz <= 4; gz++) {
            if (Math.abs(gx) < 1 || Math.abs(gz) < 1) continue;
            if (Math.abs(gx) === 1 || Math.abs(gz) === 1) continue;
            spots.push([gx * 11, gz * 11]);
        }
    }

    spots.forEach(([x, z], i) => {
        const w = 5 + (i % 3) * 2;
        const d = 5 + ((i + 1) % 3) * 2;
        const h = 8 + ((i * 7) % 18);
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshStandardMaterial({
                color: i % 2 === 0 ? "#455A64" : "#37474F",
                roughness: 0.75,
                metalness: 0.25
            })
        );
        body.position.set(x, h / 2, z);
        body.castShadow = true;
        body.receiveShadow = true;
        scene.add(body);
        buildings.push(body);

        // Window band
        const winColor = winColors[i % winColors.length];
        const win = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.85, h * 0.7, d * 0.85),
            new THREE.MeshStandardMaterial({
                color: winColor,
                emissive: winColor,
                emissiveIntensity: 0.35,
                transparent: true,
                opacity: 0.35
            })
        );
        win.position.set(x, h / 2, z);
        scene.add(win);
        buildings.push(win);
    });

    // Street lamps
    const lampMats = [];
    for (let i = -3; i <= 3; i++) {
        [
            [i * 10, 5.5],
            [i * 10, -5.5],
            [5.5, i * 10],
            [-5.5, i * 10]
        ].forEach(([x, z], j) => {
            if (Math.abs(x) < 3 && Math.abs(z) < 3) return;
            const pole = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12, 0.15, 5, 8),
                new THREE.MeshStandardMaterial({ color: "#78909C", metalness: 0.6, roughness: 0.4 })
            );
            pole.position.set(x, 2.5, z);
            pole.castShadow = true;
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.35, 10, 10),
                new THREE.MeshStandardMaterial({
                    color: "#FFF59D",
                    emissive: "#FFEE58",
                    emissiveIntensity: 1.6
                })
            );
            head.position.set(x, 5.1, z);
            const light = new THREE.PointLight(0xffee58, 0.85, 14);
            light.position.set(x, 5, z);
            scene.add(pole, head, light);
            lampMats.push(head.material);
        });
    }

    // Neon signs (floating planes)
    const neons = [];
    const neonTexts = ["OPEN", "NEON", "CITY", "WALK"];
    neonTexts.forEach((_, i) => {
        const c = winColors[i % winColors.length];
        const sign = new THREE.Mesh(
            new THREE.BoxGeometry(4, 1.2, 0.15),
            new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.5 })
        );
        const side = i % 2 === 0 ? 1 : -1;
        sign.position.set(side * (8 + i * 3), 6 + (i % 3), side * 8);
        sign.rotation.y = side > 0 ? -0.4 : 0.4;
        scene.add(sign);
        neons.push(sign);
    });

    // Moon
    const moon = new THREE.Mesh(
        new THREE.SphereGeometry(5, 20, 20),
        new THREE.MeshStandardMaterial({ color: "#FFF8E1", emissive: "#FFE082", emissiveIntensity: 0.9 })
    );
    moon.position.set(40, 55, -60);
    scene.add(moon);

    // NPCs — pejalan kota malam
    const npcs = spawnNpcs(THREE, scene, {
        count: 20,
        bounds: { minX: -44, maxX: 44, minZ: -44, maxZ: 44 },
        avoid: { x: 0, z: 0, r: 4 },
        palette: [
            { shirt: "#FF69B4", pants: "#212121" },
            { shirt: "#B388FF", pants: "#263238" },
            { shirt: "#40C4FF", pants: "#212121" },
            { shirt: "#69F0AE", pants: "#263238" },
            { shirt: "#FFD740", pants: "#212121" },
            { shirt: "#FF8A65", pants: "#263238" },
            { shirt: "#E040FB", pants: "#212121" },
            { shirt: "#18FFFF", pants: "#263238" },
            { shirt: "#FF5252", pants: "#212121" },
            { shirt: "#7C4DFF", pants: "#263238" }
        ]
    });

    return {
        bg,
        fog: scene.fog,
        spawn: [0, 0, 20, Math.PI],
        bounds: { minX: -48, maxX: 48, minZ: -48, maxZ: 48 },
        tick(THREE, scene, t, dt = 0.016) {
            neons.forEach((n, i) => {
                n.material.emissiveIntensity = 1.1 + Math.sin(t * 0.004 + i) * 0.5;
            });
            lampMats.forEach((m, i) => {
                m.emissiveIntensity = 1.4 + Math.sin(t * 0.002 + i) * 0.15;
            });
            tickNpcs(npcs, dt, { minX: -44, maxX: 44, minZ: -44, maxZ: 44 });
        },
        dispose(THREE, scene) {
            clearNpcs(THREE, scene, npcs);
        }
    };
}

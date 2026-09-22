/**
 * App bootstrap — inisialisasi router, theme, state, layout, PWA, Three.js.
 */
import { appConfig, navigationConfig, hydrationConfig } from "./config.js";
import { loadState, getState, subscribe, getHydration, addWater } from "./store.js";
import { initRouter, registerRoute, navigate, bindLinkInterception, getCurrentPath } from "./router.js";
import { applyThemeByUser } from "./theme.js";
import { renderSidebar, closeSidebar } from "./components/sidebar.js";
import { renderNavbar } from "./components/navbar.js";
import { renderBottomNav } from "./components/bottomNav.js";
import { initFab, toggleQuickMenu, setFabVisible, openMoreMenu } from "./components/fab.js";
import { showAuthIfNeeded, hideAuth } from "./modules/auth.js";
import { renderDashboard } from "./modules/dashboard.js";
import { renderTodoPage, openTodoModal } from "./modules/todo.js";
import { renderSchedulePage, openScheduleModal } from "./modules/schedule.js";
import { renderCalendarPage } from "./modules/calendar.js";
import { renderActivityPage, openCategoryModal } from "./modules/activity.js";
import { renderHydrationPage } from "./modules/hydration.js";
import { renderStatisticsPage } from "./modules/statistics.js";
import { renderQuotesPage } from "./modules/quote.js";
import { renderSettingsPage } from "./modules/settings.js";
import { toast } from "./components/ui.js";
import { toISODate, escapeHtml } from "./helpers.js";
import { storage } from "./storage.js";

const pageContent = () => document.getElementById("page-content");

/**
 * Render shell chrome (sidebar/navbar/bottomnav) sesuai auth state.
 */
function renderChrome() {
    const state = getState();
    const loggedIn = Boolean(state.currentUser);

    setFabVisible(loggedIn);

    const sidebar = document.getElementById("sidebar");
    const navbar = document.getElementById("navbar");
    const bottomNav = document.getElementById("bottom-navigation");

    if (!loggedIn) {
        if (sidebar) {
            sidebar.hidden = true;
            sidebar.classList.remove("open");
            sidebar.style.display = "none";
        }
        if (navbar) navbar.hidden = true;
        if (bottomNav) bottomNav.hidden = true;
        pageContent()?.setAttribute("hidden", "");
        return;
    }

    if (sidebar) {
        sidebar.hidden = false;
        sidebar.style.display = "";
    }
    if (navbar) navbar.hidden = false;
    if (bottomNav) bottomNav.hidden = false;
    pageContent()?.removeAttribute("hidden");

    renderSidebar();
    renderNavbar();
    renderBottomNav(handleBottomNavAction);

    const content = pageContent();
    if (content) content.classList.toggle("no-bottom-nav", window.innerWidth >= 1024);
}

/**
 * Handler aksi bottom navigation mobile.
 *
 * @param {string} action - "quick-add" | "more-menu".
 */
function handleBottomNavAction(action) {
    if (action === "quick-add") {
        toggleQuickMenu(true);
    } else if (action === "more-menu") {
        openMoreMenu(() => renderBottomNav(handleBottomNavAction));
    }
}

/**
 * Handle aksi FAB quick menu.
 *
 * @param {string} kind - "todo" | "schedule" | "category" | "water".
 */
function handleQuickAdd(kind) {
    switch (kind) {
        case "todo":
            openTodoModal();
            break;
        case "schedule":
            openScheduleModal(null, toISODate());
            break;
        case "category":
            openCategoryModal();
            break;
        case "water": {
            const h = addWater();
            toast(`💧 ${h.count}/${h.goal} gelas`, "success", 1500);
            break;
        }
        default:
            break;
    }
}

/**
 * 404 page handler.
 *
 * @param {HTMLElement} container - Page content.
 */
function renderNotFound(container) {
    container.innerHTML = `
        <div class="notfound page-enter">
            <div class="code">404</div>
            <h1>Oops! This page went on vacation 🏖️</h1>
            <p>Halaman yang kamu cari tidak ada atau sudah dipindah.</p>
            <button type="button" class="btn btn-primary" id="back-dash">🏠 Back to Dashboard</button>
        </div>
    `;
    container.querySelector("#back-dash")?.addEventListener("click", () => navigate("/dashboard"));
}

/**
 * Register seluruh route dari navigationConfig + 404.
 */
function setupRoutes() {
    const pageMap = {
        dashboard: (c) => renderDashboard(c),
        todo: (c) => renderTodoPage(c),
        schedule: (c) => renderSchedulePage(c),
        calendar: (c) => renderCalendarPage(c),
        activity: (c) => renderActivityPage(c),
        hydration: (c) => renderHydrationPage(c),
        statistics: (c) => renderStatisticsPage(c),
        quotes: (c) => renderQuotesPage(c),
        settings: (c) => renderSettingsPage(c)
    };

    navigationConfig.forEach((item) => {
        const fn = pageMap[item.id];
        if (fn) {
            registerRoute(item.route, async () => {
                const c = pageContent();
                if (!c) return;
                try {
                    await fn(c);
                } catch (error) {
                    console.error(`Render ${item.route} gagal:`, error);
                    c.innerHTML = `
                        <div class="empty-state page-enter">
                            <div class="empty-icon">💥</div>
                            <h3>Gagal memuat halaman</h3>
                            <p>${escapeHtml(error.message)}</p>
                            <button type="button" class="btn btn-primary" onclick="location.reload()">Reload</button>
                        </div>
                    `;
                }
            });
        }
    });

    registerRoute("/", async () => navigate("/dashboard", { replace: true }));
    registerRoute("/404", async () => {
        const c = pageContent();
        if (c) renderNotFound(c);
    });
}

/**
 * Init Three.js decorative background (optional, with fallback).
 */
async function initThreeBackground() {
    if (!appConfig.features.threeJs) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.body.classList.contains("reduce-motion")) return;

    const canvas = document.getElementById("bg-canvas");
    if (!canvas || !canvas.getContext) return;

    let THREE;
    try {
        if (!window.THREE) {
            await new Promise((resolve, reject) => {
                const s = document.createElement("script");
                s.src = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js";
                s.onload = resolve;
                s.onerror = () => reject(new Error("three"));
                document.head.appendChild(s);
            });
        }
        THREE = window.THREE;
    } catch {
        canvas.style.display = "none";
        return;
    }

    try {
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
        camera.position.z = 18;

        const count = 60;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i++) positions[i] = (Math.random() - 0.5) * 40;
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

        const themeColor = document.documentElement.getAttribute("data-theme") === "blue" ? 0x4da6ff : 0xff69b4;
        const mat = new THREE.PointsMaterial({
            color: themeColor,
            size: 0.35,
            transparent: true,
            opacity: 0.7
        });
        const points = new THREE.Points(geo, mat);
        scene.add(points);

        function resize() {
            const w = window.innerWidth;
            const h = window.innerHeight;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }
        resize();
        window.addEventListener("resize", resize);

        let raf;
        function animate() {
            raf = requestAnimationFrame(animate);
            if (document.body.classList.contains("reduce-motion")) {
                cancelAnimationFrame(raf);
                return;
            }
            points.rotation.y += 0.0012;
            points.rotation.x += 0.0005;
            renderer.render(scene, camera);
        }
        animate();

        document.addEventListener("visibilitychange", () => {
            if (document.hidden) cancelAnimationFrame(raf);
            else animate();
        });
    } catch (error) {
        console.warn("Three.js fallback:", error);
        canvas.style.display = "none";
    }
}

/**
 * Schedule reminder hydration sederhana via Notification API.
 */
function startHydrationReminders() {
    if (!appConfig.features.notifications) return;
    if (!("Notification" in window)) return;
    if (!getState().settings.notifications) return;

    const check = () => {
        if (!getState().settings.notifications) return;
        if (Notification.permission !== "granted") return;

        const now = new Date();
        const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const h = getHydration();
        const idx = hydrationConfig.reminders.indexOf(hm);
        if (idx !== -1 && h.count <= idx) {
            new Notification("💧 PinkyPlan", { body: "Time to drink water!" });
        }
    };

    setInterval(check, 60000);
}

/**
 * Register service worker (PWA).
 */
async function registerSW() {
    if (!appConfig.features.pwa) return;
    if (!("serviceWorker" in navigator)) return;
    try {
        // Buang SW lama yang mungkin cache versi rusak
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
            await reg.unregister();
        }
        await navigator.serviceWorker.register("./sw.js");
    } catch (error) {
        console.warn("SW gagal register:", error);
    }
}

/**
 * Apply settings tersimpan ke DOM (motion class, dll).
 */
function applyStoredSettings() {
    const settings = getState().settings;
    if (settings.animation === false) document.body.classList.add("reduce-motion");
}

/**
 * Bootstrap aplikasi.
 */
async function main() {
    console.info(`🎀 ${appConfig.appName} v${appConfig.version} — ${appConfig.tagline}`);

    // Sembunyikan fallback loading setelah DOM siap diproses
    const boot = document.getElementById("boot-fallback");
    if (boot) boot.hidden = true;

    loadState();
    applyStoredSettings();
    applyThemeByUser(getState().currentUser?.id || null);

    initRouter();
    bindLinkInterception();
    setupRoutes();

    const loggedIn = Boolean(getState().currentUser);
    if (loggedIn) hideAuth();
    const showingAuth = showAuthIfNeeded();

    renderChrome();
    initFab(handleQuickAdd);

    // Re-render chrome (bukan full chrome rebuild yang menimpa auth) saat state berubah
    subscribe(() => {
        renderChrome();
    });

    if (showingAuth) {
        // Layar login sudah tampil — pastikan shell lain tidak menutupi
        const content = pageContent();
        if (content) content.setAttribute("hidden", "");
    } else {
        const path = getCurrentPath();
        navigate(path === "/" ? "/dashboard" : path, { replace: true });
    }

    // Poll sampai user login → tampilkan app
    const checkAuth = setInterval(() => {
        if (!getState().currentUser) return;
        clearInterval(checkAuth);
        hideAuth();
        renderChrome();
        const path = getCurrentPath();
        navigate(path === "/" || path === "/404" ? "/dashboard" : path, { replace: true });
    }, 200);

    // Close sidebar saat klik konten di tablet
    document.addEventListener("click", (e) => {
        const sidebar = document.getElementById("sidebar");
        if (!sidebar?.classList.contains("open")) return;
        if (!sidebar.contains(e.target) && !e.target.closest("#menu-btn")) closeSidebar();
    });

    // Refresh chrome saat resize (bottom nav visibility)
    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const content = pageContent();
            if (content) content.classList.toggle("no-bottom-nav", window.innerWidth >= 1024);
        }, 150);
    });

    initThreeBackground();
    startHydrationReminders();
    registerSW();
}

/**
 * Refresh halaman aktif setelah perubahan data dari modal.
 */
export function refreshCurrentPage() {
    const path = getCurrentPath();
    import("./router.js").then((r) => r.resolve(path));
}

main().catch((error) => {
    console.error("Bootstrap gagal:", error);
    const boot = document.getElementById("boot-fallback");
    if (boot) {
        boot.hidden = false;
        boot.innerHTML = `
            <div class="empty-icon">💥</div>
            <h3>Aplikasi gagal dimuat</h3>
            <p>${escapeHtml(error.message)}</p>
            <button type="button" class="btn btn-primary" onclick="location.reload()">Reload</button>
        `;
    } else {
        document.body.innerHTML = `
            <div style="padding:2rem;text-align:center;font-family:sans-serif">
                <h1>💥 Aplikasi gagal dimuat</h1>
                <p>${escapeHtml(error.message)}</p>
                <button onclick="location.reload()" style="padding:.7rem 1.2rem;margin-top:1rem;cursor:pointer">Reload</button>
            </div>
        `;
    }
});

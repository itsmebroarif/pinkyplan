/**
 * SPA Router.
 *
 * Mode:
 * - "hash" (default): URL seperti `/#/dashboard` — aman untuk static server
 *   apa pun (python http.server, express, live-server) tanpa SPA rewrite.
 * - "history": URL seperti `/dashboard` — dipakai HANYA jika server sudah
 *   membuktikan bisa serve SPA (halaman deep-link berhasil dimuat).
 *
 * Ini mencegah error "Cannot GET /dashboard" saat refresh / buka URL langsung.
 */
import { navigationConfig } from "./config.js";
import { setCurrentRoute, getState } from "./store.js";

const routes = new Map();
let renderHandler = null;
let mode = "hash"; // "history" | "hash"

/**
 * Daftarkan handler render untuk sebuah route.
 *
 * @param {string} path - Path route, contoh "/todo".
 * @param {Function} handler - async (params) => void, me-render halaman.
 */
export function registerRoute(path, handler) {
    routes.set(normalize(path), handler);
}

/**
 * Daftarkan banyak route sekaligus dari navigationConfig.
 *
 * @param {Object<string, Function>} map - { "/todo": handlerFn }.
 */
export function registerRoutes(map) {
    Object.entries(map).forEach(([path, handler]) => registerRoute(path, handler));
}

/**
 * Set handler render global (dipanggil sebelum resolve).
 *
 * @param {Function} fn - fn(routeInfo).
 */
export function onRender(fn) {
    renderHandler = fn;
}

/**
 * Deteksi mode routing saat startup.
 *
 * Jika pathname sudah deep-link (mis. /dashboard) dan sampai ke sini,
 * berarti server punya SPA rewrite → pakai History API.
 * Selain itu (termasuk file:// dan static server biasa) → pakai hash.
 */
export function initRouter() {
    const path = location.pathname;
    const isDeepLink =
        path !== "/" &&
        path !== "/index.html" &&
        !path.endsWith("/index.html") &&
        location.protocol !== "file:";

    mode = isDeepLink ? "history" : "hash";

    // Migrasi: URL lama /dashboard dibuka ulang tanpa hash → redirect aman
    if (mode === "history") {
        // biarkan — server sudah mendukung deep link
    } else if (!location.hash && path !== "/" && path !== "/index.html") {
        // pathname aneh tapi server tetap serve index → paksa hash
        history.replaceState({}, "", "/");
        mode = "hash";
    }

    window.addEventListener("popstate", () => resolve());
    window.addEventListener("hashchange", () => {
        if (mode === "hash") resolve();
    });
}

/**
 * Mode routing aktif.
 *
 * @returns {"hash"|"history"}
 */
export function getRouterMode() {
    return mode;
}

/**
 * Normalize path — buang trailing slash kecuali root.
 *
 * @param {string} path - Path mentah.
 * @returns {string} Path bersih.
 */
function normalize(path) {
    if (!path || path === "/") return "/";
    return path.replace(/\/+$/, "") || "/";
}

/**
 * Dapatkan path aktif sesuai mode routing.
 *
 * @returns {string} Path.
 */
export function getCurrentPath() {
    if (mode === "hash") {
        const hash = location.hash.replace(/^#/, "");
        return normalize(hash || "/dashboard");
    }
    return normalize(location.pathname || "/");
}

/**
 * Navigasi ke route tertentu tanpa full reload.
 * Selalu aman untuk static server (tidak pernah request path ke server).
 *
 * @param {string} path - Path tujuan.
 * @param {{replace?:boolean}} [opts] - Opsi history.
 */
export function navigate(path, opts = {}) {
    const target = normalize(path);

    if (mode === "hash") {
        const next = `#${target}`;
        if (location.hash !== next) {
            if (opts.replace) {
                history.replaceState(null, "", next);
                resolve();
            } else {
                // location.hash memicu hashchange → resolve
                location.hash = next;
            }
        } else {
            resolve();
        }
        return;
    }

    const url = target === "/" ? "/" : target;
    if (opts.replace) history.replaceState({}, "", url);
    else history.pushState({}, "", url);
    resolve();
}

/**
 * Resolve route aktif → jalankan handler render.
 *
 * @param {string} [path] - Path override.
 * @returns {Promise<void>}
 */
export async function resolve(path) {
    const current = normalize(path || getCurrentPath());
    const knownRoutes = [...routes.keys()];
    let handler = routes.get(current);
    let matchedPath = current;

    if (!handler) {
        const nav = navigationConfig.find((n) => normalize(n.route) === current);
        if (nav) {
            matchedPath = normalize(nav.route);
            handler = routes.get(matchedPath);
        }
    }

    if (!handler) {
        matchedPath = "/404";
        handler = routes.get("/404");
    }

    setCurrentRoute(matchedPath === "/404" ? current : matchedPath);

    if (renderHandler) {
        await renderHandler({ path: matchedPath, requested: current, knownRoutes });
    }
    if (handler) {
        await handler({});
    }

    const content = document.getElementById("page-content");
    if (content) content.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

/**
 * Intercept klik <a href="/route"> agar navigasi SPA
 * (tidak pernah mengirim request path ke server).
 */
export function bindLinkInterception() {
    document.addEventListener("click", (event) => {
        const anchor = event.target.closest("a[href]");
        if (!anchor) return;
        const href = anchor.getAttribute("href");
        if (!href || href.startsWith("http") || href.startsWith("mailto:") || anchor.target === "_blank") return;
        if (anchor.hasAttribute("download")) return;

        // Hash link murni di luar SPA (mis. #section) — biarkan browser
        if (href.startsWith("#") && !href.startsWith("#/")) return;

        event.preventDefault();
        let path = href;
        if (href.startsWith("#")) path = href.slice(1);
        navigate(path);
    });
}

/**
 * Path aktif dari store (untuk highlight menu).
 *
 * @returns {string} Path sekarang.
 */
export function activeRoute() {
    return getState().currentRoute;
}

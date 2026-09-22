/**
 * Top navbar component.
 * Tanpa tombol hamburger — profil di kanan bisa dibuka untuk logout.
 */
import { getState } from "../store.js";
import { navigationConfig, appConfig } from "../config.js";
import { el, formatDateLong, escapeHtml } from "../helpers.js";
import { openModal, closeModal } from "./modal.js";

/**
 * Render navbar atas.
 * Judul route + user chip (klik → menu profil / logout).
 */
export function renderNavbar() {
    const root = document.getElementById("navbar");
    if (!root) return;

    const state = getState();
    const user = state.currentUser;
    const route = state.currentRoute;
    const nav = navigationConfig.find((n) => n.route === route);
    const title = nav ? nav.label : route === "/404" ? "Not Found" : appConfig.appName;

    root.innerHTML = "";

    const left = el(`
        <div class="navbar-left">
            <div class="navbar-title-wrap">
                <div class="navbar-title">${escapeHtml(title)} ${nav ? nav.icon : ""}</div>
                <div class="navbar-subtitle">${formatDateLong()}</div>
            </div>
        </div>
    `);

    const right = el(`
        <div class="navbar-right">
            <button type="button" class="navbar-btn" id="notif-btn" aria-label="Notifikasi" title="Notifikasi">
                🔔<span class="dot" hidden></span>
            </button>
            <button type="button" class="user-chip" id="user-chip"
                title="${user ? escapeHtml(user.name) : ""}"
                aria-label="Buka menu profil" aria-haspopup="dialog">
                <span class="avatar" aria-hidden="true">${user ? user.icon : "👤"}</span>
                <span class="u-name">${user ? escapeHtml(user.name) : "Guest"}</span>
                <span class="chip-caret" aria-hidden="true">▾</span>
            </button>
        </div>
    `);

    right.querySelector("#notif-btn")?.addEventListener("click", async () => {
        const { toast } = await import("./ui.js");
        toast("Tidak ada notifikasi baru 💤", "info");
    });

    right.querySelector("#user-chip")?.addEventListener("click", openProfileMenu);

    root.appendChild(left);
    root.appendChild(right);
}

/**
 * Menu profil saat user chip diklik — opsi Settings & Logout.
 */
function openProfileMenu() {
    const user = getState().currentUser;
    if (!user) return;

    openModal(`${user.icon} ${escapeHtml(user.name)}`, `
        <p class="text-muted" style="font-weight:700;font-size:0.9rem;margin-bottom:1rem">
            ${user.id === "arif" ? "💙 Theme biru" : "💗 Theme pink"} · profile kamu
        </p>
        <div style="display:grid;gap:0.7rem">
            <button type="button" class="btn btn-block" id="profile-settings">⚙️ Buka Settings</button>
            <button type="button" class="btn btn-danger btn-block" id="profile-logout">🚪 Logout</button>
        </div>
    `, {
        actions: [{ label: "Tutup" }]
    });

    document.getElementById("profile-settings")?.addEventListener("click", async () => {
        closeModal();
        const { navigate } = await import("../router.js");
        navigate("/settings");
    });

    document.getElementById("profile-logout")?.addEventListener("click", async () => {
        closeModal();
        const { confirmDialog } = await import("./modal.js");
        const { logout } = await import("../modules/auth.js");
        const { navigate } = await import("../router.js");
        const ok = await confirmDialog("Logout dari akun ini?", {
            title: "🚪 Logout",
            confirmLabel: "Ya, logout",
            danger: true
        });
        if (ok) {
            logout();
            navigate("/dashboard", { replace: true });
        }
    });
}

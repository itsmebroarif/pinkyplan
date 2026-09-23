/**
 * Top navbar component.
 * Tanpa tombol hamburger — profil di kanan bisa dibuka untuk logout.
 */
import { getState } from "../store.js";
import { navigationConfig, appConfig } from "../config.js";
import { el, formatDateLong, escapeHtml } from "../helpers.js";
import { openModal, closeModal, confirmDialog } from "./modal.js";
import { logout } from "../modules/auth.js";
import { navigate } from "../router.js";
import { toast } from "./ui.js";
import { togglePomodoro } from "./pomodoro.js";
import { toggle as toggleMusic, getMusicState } from "../modules/music.js";

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

    const musicState = getMusicState();
    const right = el(`
        <div class="navbar-right">
            <button type="button" class="navbar-btn music-nav-btn ${musicState.playing ? "music-playing" : ""}" id="music-nav-btn"
                aria-label="Toggle backsound" aria-pressed="${musicState.playing}"
                title="${musicState.playing ? "Musik: " + (musicState.track?.title || "") + " (klik pause)" : "Nyalakan backsound"}">
                ${musicState.playing ? "🎵" : "🔇"}
            </button>
            <button type="button" class="navbar-btn pomodoro-nav-btn" id="pomodoro-nav-btn" aria-label="Toggle Pomodoro Timer" title="Pomodoro Focus Timer">
                🍅
            </button>
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

    right.querySelector("#music-nav-btn")?.addEventListener("click", async () => {
        const playing = await toggleMusic();
        toast(playing ? "🎵 Backsound on" : "🔇 Backsound off", playing ? "success" : "info", 1500);
    });

    right.querySelector("#pomodoro-nav-btn")?.addEventListener("click", () => {
        togglePomodoro();
    });

    right.querySelector("#notif-btn")?.addEventListener("click", () => {
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

    document.getElementById("profile-settings")?.addEventListener("click", () => {
        closeModal();
        navigate("/settings");
    });

    document.getElementById("profile-logout")?.addEventListener("click", async () => {
        closeModal();
        const ok = await confirmDialog("Logout dari akun ini?", {
            title: "🚪 Logout",
            confirmLabel: "Ya, logout",
            danger: true
        });
        if (ok) {
            logout();
            navigate("/dashboard", { replace: true });
            toast("Berhasil logout 👋", "info");
        }
    });
}

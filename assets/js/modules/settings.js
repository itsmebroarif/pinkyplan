/**
 * Settings module — profile, theme, hydration goal, import/export,
 * support (Trakteer), reset data, about.
 */
import { getState, updateSettings, exportData, importData, resetAllData, setHydrationGoal, setCurrentUser } from "../store.js";
import { appConfig, supportConfig, userConfig, hydrationConfig } from "../config.js";
import { storage } from "../storage.js";
import { setTheme, applyThemeByUser, getCurrentTheme } from "../theme.js";
import { openModal, closeModal, confirmDialog } from "../components/modal.js";
import { toast } from "../components/ui.js";
import { escapeHtml, formatDateLong } from "../helpers.js";
import { logout } from "./auth.js";
import { navigate } from "../router.js";
import { reportButtonHtml, bindReportButton } from "./report.js";
import { musicSettingsHtml, bindMusicSettings } from "./music.js";
import { appConfig as appCfg } from "../config.js";

/**
 * Render halaman Settings (termasuk Support / Trakteer).
 *
 * @param {HTMLElement} container - Page content.
 */
export function renderSettingsPage(container) {
    const state = getState();
    const user = state.currentUser;
    const settings = state.settings;
    const theme = getCurrentTheme();

    container.innerHTML = `
        <div class="page-enter">
            <div class="page-header">
                <div>
                    <h1>⚙️ Settings</h1>
                    <p class="page-desc">Profil, theme, data & support</p>
                </div>
            </div>

            <!-- Profile -->
            <section class="settings-section card soft">
                <h2>👤 Profile</h2>
                <div class="settings-row">
                    <div class="row-info">
                        <div class="row-title">${user ? user.icon + " " + escapeHtml(user.name) : "Guest"}</div>
                        <div class="row-desc">${user && user.id === "arif" ? "Login dengan PIN · theme biru 💙" : user && user.id === "arum" ? "Tanpa PIN · theme pink 💗" : "Belum login"}</div>
                    </div>
                    <button type="button" class="btn btn-sm btn-secondary" id="switch-user">🔄 Ganti User</button>
                </div>
                <div class="settings-row">
                    <div class="row-info">
                        <div class="row-title">Logout</div>
                        <div class="row-desc">Kembali ke layar pilih user</div>
                    </div>
                    <button type="button" class="btn btn-sm btn-danger" id="logout-btn">Keluar</button>
                </div>
            </section>

            <!-- Theme -->
            <section class="settings-section card soft">
                <h2>🎨 Theme</h2>
                <div class="settings-row">
                    <div class="row-info">
                        <div class="row-title">Warna aplikasi</div>
                        <div class="row-desc">Arif = biru 💙 · Arum = pink 💗 (otomatis saat login)</div>
                    </div>
                    <div class="chip-row">
                        <button type="button" class="filter-chip ${theme === "pink" ? "active" : ""}" data-theme-set="pink"
                            style="${theme === "pink" ? "background:#FF69B4;color:#fff" : "background:#FFE4F1"}">💗 Pink</button>
                        <button type="button" class="filter-chip ${theme === "blue" ? "active" : ""}" data-theme-set="blue"
                            style="${theme === "blue" ? "background:#4DA6FF;color:#fff" : "background:#E3F2FF"}">💙 Blue</button>
                    </div>
                </div>
                <div class="settings-row">
                    <div class="row-info">
                        <div class="row-title">Animation</div>
                        <div class="row-desc">Aktifkan micro-animation & transisi</div>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" id="toggle-anim" ${settings.animation !== false ? "checked" : ""}>
                        <span class="track"></span><span class="thumb"></span>
                    </label>
                </div>
                <div class="settings-row">
                    <div class="row-info">
                        <div class="row-title">Notifications</div>
                        <div class="row-desc">Izinkan pengingat hydration (optional)</div>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" id="toggle-notif" ${settings.notifications ? "checked" : ""}>
                        <span class="track"></span><span class="thumb"></span>
                    </label>
                </div>
            </section>

            <!-- Hydration -->
            <section class="settings-section card soft">
                <h2>💧 Hydration Goal</h2>
                <div class="settings-row">
                    <div class="row-info">
                        <div class="row-title">Target harian</div>
                        <div class="row-desc">Default ${hydrationConfig.dailyGoal} gelas · ${hydrationConfig.glassSize}${hydrationConfig.unit}</div>
                    </div>
                    <div style="display:flex;gap:0.4rem;align-items:center">
                        <input class="input" type="number" id="goal-input" min="1" max="24"
                            value="${settings.hydrationGoal || hydrationConfig.dailyGoal}" style="width:80px;min-height:40px">
                        <button type="button" class="btn btn-sm btn-primary" id="save-goal">Simpan</button>
                    </div>
                </div>
            </section>

            <!-- Data -->
            <section class="settings-section card soft">
                <h2>📦 Data (JSON)</h2>
                <div class="settings-row">
                    <div class="row-info">
                        <div class="row-title">Export Data</div>
                        <div class="row-desc">Download backup pinkyplan-backup-YYYY-MM-DD.json</div>
                    </div>
                    <button type="button" class="btn btn-sm btn-primary" id="export-btn">⬇️ Export</button>
                </div>
                <div class="settings-row">
                    <div class="row-info">
                        <div class="row-title">Import Data</div>
                        <div class="row-desc">Restore dari file JSON backup (dengan validasi)</div>
                    </div>
                    <button type="button" class="btn btn-sm btn-secondary" id="import-btn">⬆️ Import</button>
                    <input type="file" id="import-file" accept="application/json,.json" hidden>
                </div>
                <div class="settings-row">
                    <div class="row-info">
                        <div class="row-title">Reset Data</div>
                        <div class="row-desc">Hapus seluruh todo, schedule & statistik</div>
                    </div>
                    <button type="button" class="btn btn-sm btn-danger" id="reset-btn">🗑️ Reset</button>
                </div>
            </section>

            <!-- Music / Backsound -->
            ${appCfg.features.music ? `
            <section class="settings-section card soft">
                <h2>🎵 Music (Backsound)</h2>
                <p style="margin:-0.4rem 0 0.8rem;font-size:0.85rem;opacity:0.8">
                    Auto-detect MP3 dari <code>assets/music/</code> — lihat
                    <a href="./assets/music/README.md" target="_blank" rel="noopener">dokumentasi</a>
                </p>
                ${musicSettingsHtml()}
            </section>
            ` : ""}

            <!-- Summary Report -->
            <section class="settings-section card soft">
                <h2>📤 Summary Report</h2>
                <div class="settings-row">
                    <div class="row-info">
                        <div class="row-title">Kirim ringkasan via WhatsApp</div>
                        <div class="row-desc">Todo, schedule, hydration, habits & meals hari ini — otomatis ke nomor user login</div>
                    </div>
                    <div style="text-align:right">
                        ${reportButtonHtml({ className: "btn btn-sm btn-primary" })}
                    </div>
                </div>
            </section>

            <!-- Support -->
            <section class="settings-section">
                <h2 style="display:flex;align-items:center;gap:0.45rem;font-size:1.05rem;margin-bottom:0.75rem">💛 Support</h2>
                <div class="support-card">
                    <h3>SUPPORT PINKYPLAN</h3>
                    <p>
                        Kalau aplikasi ini membantu harimu, traktir Arif secangkir kopi ya ☕<br>
                        dukunganmu bikin project ini terus update ✨
                    </p>
                    <a class="btn" href="${supportConfig.trakteerUrl}" target="_blank" rel="noopener noreferrer">
                        ☕ ${escapeHtml(supportConfig.trakteerLabel)}
                    </a>
                    <p style="margin-top:0.9rem;margin-bottom:0;font-size:0.78rem;opacity:0.9;word-break:break-all">
                        ${escapeHtml(supportConfig.trakteerUrl)}
                    </p>
                </div>
            </section>

            <!-- About -->
            <section class="settings-section card soft">
                <h2>ℹ️ About</h2>
                <ul style="font-weight:700;display:grid;gap:0.4rem;font-size:0.92rem">
                    <li>🎀 <strong>${appConfig.appName}</strong> v${appConfig.version}</li>
                    <li>"${escapeHtml(appConfig.tagline)}"</li>
                    <li>Static SPA · Vanilla JS · LocalStorage · Netlify ready</li>
                    <li>📅 ${formatDateLong()}</li>
                </ul>
            </section>
        </div>
    `;

    bindSettingsEvents(container);
}

/**
 * Pasang event handler halaman settings.
 *
 * @param {HTMLElement} container - Page content.
 */
function bindSettingsEvents(container) {
    bindReportButton(container);
    bindMusicSettings(container);

    // Theme switch manual
    container.querySelectorAll("[data-theme-set]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const t = btn.dataset.themeSet;
            setTheme(t);
            toast(`Theme ${t === "blue" ? "Blue 💙" : "Pink 💗"} diterapkan`, "success");
            renderSettingsPage(container);
        });
    });

    // Animation toggle
    container.querySelector("#toggle-anim")?.addEventListener("change", (e) => {
        updateSettings({ animation: e.target.checked });
        document.body.classList.toggle("reduce-motion", !e.target.checked);
        toast(e.target.checked ? "Animation aktif ✨" : "Animation dimatikan", "info");
    });

    // Notifications toggle
    container.querySelector("#toggle-notif")?.addEventListener("change", async (e) => {
        if (e.target.checked && "Notification" in window) {
            try {
                const perm = await Notification.requestPermission();
                if (perm !== "granted") {
                    e.target.checked = false;
                    updateSettings({ notifications: false });
                    toast("Izin notifikasi ditolak", "error");
                    return;
                }
            } catch {
                e.target.checked = false;
                updateSettings({ notifications: false });
                return;
            }
        }
        updateSettings({ notifications: e.target.checked });
        toast(e.target.checked ? "Notifikasi aktif 🔔" : "Notifikasi mati", "info");
    });

    // Hydration goal
    container.querySelector("#save-goal")?.addEventListener("click", () => {
        const val = parseInt(container.querySelector("#goal-input").value, 10);
        if (!val || val < 1 || val > 24) return toast("Goal antara 1–24!", "error");
        setHydrationGoal(val);
        toast("Goal tersimpan 💧", "success");
    });

    // Export
    container.querySelector("#export-btn")?.addEventListener("click", handleExport);

    // Import
    const fileInput = container.querySelector("#import-file");
    container.querySelector("#import-btn")?.addEventListener("click", () => fileInput?.click());
    fileInput?.addEventListener("change", handleImport);

    // Reset
    container.querySelector("#reset-btn")?.addEventListener("click", async () => {
        const ok = await confirmDialog(
            "Yakin reset SELURUHP data? Tindakan ini tidak bisa dibatalkan.",
            { danger: true, confirmLabel: "Reset Semua", title: "⚠️ Reset Data" }
        );
        if (ok) {
            resetAllData();
            toast("Data direset 🗑️", "info");
            navigate("/dashboard");
            renderSettingsPage(container);
        }
    });

    // Switch user / logout
    container.querySelector("#switch-user")?.addEventListener("click", () => {
        logout();
        navigate("/dashboard");
    });
    container.querySelector("#logout-btn")?.addEventListener("click", () => {
        logout();
        navigate("/dashboard");
    });
}

/**
 * Export data ke file JSON.
 */
function handleExport() {
    try {
        const payload = exportData();
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `pinkyplan-backup-${date}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast("Export berhasil 📦", "success");
    } catch (error) {
        toast(`Export gagal: ${error.message}`, "error");
    }
}

/**
 * Import data dari file JSON — validasi + konfirmasi.
 *
 * @param {Event} event - Change event input file.
 */
function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const payload = JSON.parse(reader.result);

            if (!payload.app || payload.app.name !== "PinkyPlan") {
                toast("File bukan backup PinkyPlan!", "error");
                return;
            }
            if (!Array.isArray(payload.todos) || !Array.isArray(payload.schedules)) {
                toast("Struktur JSON tidak valid!", "error");
                return;
            }

            const ok = await confirmDialog(
                `Import ${payload.todos.length} todos & ${payload.schedules.length} schedules? Data saat ini akan ditimpa.`,
                { title: "📦 Konfirmasi Import", confirmLabel: "Ya, import" }
            );
            if (!ok) return;

            importData(payload);
            toast("Import berhasil! 🎉", "success");
            const page = document.getElementById("page-content");
            if (page) renderSettingsPage(page);
        } catch (error) {
            toast(`JSON tidak valid: ${error.message}`, "error");
        } finally {
            event.target.value = "";
        }
    };
    reader.onerror = () => toast("Gagal membaca file", "error");
    reader.readAsText(file);
}

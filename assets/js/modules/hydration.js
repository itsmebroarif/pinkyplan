/**
 * Hydration module — tracker minum air + reminder schedule.
 */
import { getHydration, addWater, removeWater, resetWater, setHydrationGoal, updateSettings, getState } from "../store.js";
import { hydrationConfig } from "../config.js";
import { toast } from "../components/ui.js";
import { openModal, closeModal, confirmDialog } from "../components/modal.js";

/**
 * Render halaman Hydration.
 *
 * @param {HTMLElement} container - Page content.
 */
export function renderHydrationPage(container) {
    container.innerHTML = `
        <div class="page-enter">
            <div class="page-header">
                <div>
                    <h1>💧 Daily Hydration</h1>
                    <p class="page-desc">Target ${hydrationConfig.dailyGoal} gelas · ${hydrationConfig.glassSize}ml per gelas</p>
                </div>
                <button type="button" class="btn btn-secondary" id="hydro-goal-btn">⚙️ Goal</button>
            </div>

            <div class="card hoverable" style="text-align:center">
                <div class="card-title" style="justify-content:center;margin-bottom:0.5rem">💧 Hydration Progress</div>
                <p class="hydro-stat" id="hydro-count">0 / ${hydrationConfig.dailyGoal}</p>
                <div class="progress" style="max-width:420px;margin-inline:auto">
                    <div class="progress-bar" id="hydro-bar" style="width:0%"></div>
                </div>
                <div class="progress-meta" style="max-width:420px;margin-inline:auto">
                    <span id="hydro-ml">0 ml</span>
                    <span id="hydro-pct">0%</span>
                </div>

                <div class="glass-row" id="glass-row"></div>

                <div style="display:flex;gap:0.6rem;justify-content:center;flex-wrap:wrap">
                    <button type="button" class="btn btn-primary" id="hydro-add">💧 + Water</button>
                    <button type="button" class="btn btn-secondary" id="hydro-remove">− Water</button>
                    <button type="button" class="btn btn-ghost" id="hydro-reset">🔄 Reset</button>
                </div>
            </div>

            <div class="card hoverable" style="margin-top:1.1rem">
                <div class="card-header">
                    <div class="card-title">⏰ Hydration Schedule</div>
                    <span class="badge blue">${hydrationConfig.reminders.length} reminders</span>
                </div>
                <div class="reminder-list" id="reminder-list"></div>
                <p class="text-muted" style="font-size:0.8rem;margin-top:0.8rem">
                    ${
                    getState().settings.notifications
                        ? "🔔 Notifikasi aktif (jika browser mendukung)."
                        : "Aktifkan notifikasi di Settings → Notifications."
                }
                </p>
            </div>
        </div>
    `;

    paintHydration(container);

    container.querySelector("#hydro-add")?.addEventListener("click", () => {
        const h = addWater();
        paintHydration(container);
        if (h.count >= h.goal) toast("🎉 Target tercapai! Amazing!", "success");
        else toast(`💧 ${h.count}/${h.goal} — keep hydrated!`, "success", 1500);
    });

    container.querySelector("#hydro-remove")?.addEventListener("click", () => {
        removeWater();
        paintHydration(container);
    });

    container.querySelector("#hydro-reset")?.addEventListener("click", async () => {
        const ok = await confirmDialog("Reset hitungan air hari ini?", { danger: true, confirmLabel: "Reset" });
        if (ok) {
            resetWater();
            paintHydration(container);
            toast("Hydration direset 🔄", "info");
        }
    });

    container.querySelector("#hydro-goal-btn")?.addEventListener("click", () => openGoalModal(container));
}

/**
 * Paint state hydration: count, bar, glass grid, reminders.
 *
 * @param {HTMLElement} container - Page content.
 */
export function paintHydration(container) {
    const h = getHydration();
    const goal = h.goal || hydrationConfig.dailyGoal;

    const countEl = container.querySelector("#hydro-count");
    if (countEl) countEl.textContent = `${h.count} / ${goal}`;

    const bar = container.querySelector("#hydro-bar");
    if (bar) bar.style.width = `${Math.min(100, Math.round((h.count / goal) * 100))}%`;

    const ml = container.querySelector("#hydro-ml");
    if (ml) ml.textContent = `${h.count * hydrationConfig.glassSize} ml`;

    const pct = container.querySelector("#hydro-pct");
    if (pct) pct.textContent = `${Math.min(100, Math.round((h.count / goal) * 100))}%`;

    const row = container.querySelector("#glass-row");
    if (row) {
        row.innerHTML = "";
        for (let i = 0; i < goal; i++) {
            const filled = i < h.count;
            const glass = document.createElement("button");
            glass.type = "button";
            glass.className = "glass" + (filled ? " filled" : "");
            glass.setAttribute("aria-label", `Gelas ${i + 1}${filled ? " terisi" : ""}`);
            if (!filled) glass.textContent = "○";
            glass.addEventListener("click", () => {
                if (filled) removeWater();
                else addWater();
                paintHydration(container);
            });
            row.appendChild(glass);
        }
    }

    const reminders = container.querySelector("#reminder-list");
    if (reminders) {
        const now = new Date();
        const nowHM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        reminders.innerHTML = hydrationConfig.reminders
            .map((time) => {
                const done = time <= nowHM && hydrationConfig.reminders.indexOf(time) < h.count;
                return `<span class="reminder-item ${done ? "done" : ""}">${done ? "☑" : "☐"} ${time}</span>`;
            })
            .join("");
    }
}

/**
 * Modal konfigurasi goal harian.
 *
 * @param {HTMLElement} container - Page content.
 */
function openGoalModal(container) {
    const h = getHydration();

    openModal("⚙️ Hydration Goal", `
        <div class="field">
            <label for="goal-input">Target gelas per hari</label>
            <input class="input" type="number" id="goal-input" min="1" max="24" value="${h.goal || hydrationConfig.dailyGoal}">
            <span class="hint">Default: ${hydrationConfig.dailyGoal} gelas · ${hydrationConfig.glassSize}${hydrationConfig.unit}/gelas</span>
        </div>
    `, {
        actions: [
            { label: "Batal" },
            {
                label: "Simpan",
                class: "btn-primary",
                close: false,
                onClick: () => {
                    const val = parseInt(document.getElementById("goal-input").value, 10);
                    if (!val || val < 1 || val > 24) return toast("Goal antara 1–24!", "error");
                    setHydrationGoal(val);
                    closeModal();
                    paintHydration(container);
                    toast("Goal diperbarui ⚙️", "success");
                }
            }
        ]
    });
}

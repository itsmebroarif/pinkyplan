/**
 * Meal module — tracker makan minimal 3×/hari (boleh lebih),
 * download daftar makan hari ini (PNG), warning jam 20:00 bila < 3×.
 */
import { getMealsByDate, addMeal, removeMeal, getState } from "../store.js";
import { mealConfig } from "../config.js";
import { toISODate, escapeHtml, formatDateLong, formatDateShort } from "../helpers.js";
import { toast } from "../components/ui.js";
import { openModal, closeModal, confirmDialog } from "../components/modal.js";
import { storage } from "../storage.js";

/**
 * Jumlah meal hari ini.
 *
 * @returns {number}
 */
export function getTodayMealCount() {
    return getMealsByDate(toISODate()).length;
}

/**
 * True bila sudah lewat jam warning dan masih kurang dari target.
 *
 * @param {Date} [now=new Date()]
 * @returns {boolean}
 */
export function shouldWarnMeals(now = new Date()) {
    return now.getHours() >= mealConfig.warnHour && getTodayMealCount() < mealConfig.dailyMin;
}

/**
 * Tampilkan warning sekali per tanggal (jangan spam).
 * Panggil saat app boot + interval.
 */
export function checkMealWarning() {
    if (!shouldWarnMeals()) return;
    const today = toISODate();
    if (storage.get("mealWarnedDate", null) === today) return;
    storage.set("mealWarnedDate", today);
    const count = getTodayMealCount();
    toast(
        `🍽️ Baru ${count}× makan hari ini — minimal ${mealConfig.dailyMin}× ya!`,
        "error",
        5000
    );
}

/**
 * Render halaman Meal.
 *
 * @param {HTMLElement} container - Page content.
 */
export function renderMealPage(container) {
    container.innerHTML = `
        <div class="page-enter">
            <div class="page-header">
                <div>
                    <h1>🍽️ Meal Tracker</h1>
                    <p class="page-desc">Minimal ${mealConfig.dailyMin}× per hari · ${formatDateLong()}</p>
                </div>
                <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
                    <button type="button" class="btn btn-secondary" id="meal-download">📥 Download</button>
                    <button type="button" class="btn btn-primary" id="meal-add">＋ Tambah</button>
                </div>
            </div>

            <div id="meal-warning-slot"></div>

            <div class="card hoverable" style="text-align:center">
                <div class="card-title" style="justify-content:center;margin-bottom:0.5rem">🍴 Hari Ini</div>
                <p class="hydro-stat" id="meal-count">0 / ${mealConfig.dailyMin}</p>
                <div class="progress" style="max-width:420px;margin-inline:auto">
                    <div class="progress-bar" id="meal-bar" style="width:0%"></div>
                </div>
                <div class="progress-meta" style="max-width:420px;margin-inline:auto">
                    <span id="meal-status">Belum cukup</span>
                    <span id="meal-pct">0%</span>
                </div>
            </div>

            <div class="card hoverable" style="margin-top:1.1rem">
                <div class="card-header">
                    <div class="card-title">📋 Daftar Makan Hari Ini</div>
                    <span class="badge pink" id="meal-badge">0</span>
                </div>
                <div id="meal-list" class="meal-list"></div>
            </div>
        </div>
    `;

    paintMeals(container);

    container.querySelector("#meal-add")?.addEventListener("click", () => openMealModal(() => paintMeals(container)));
    container.querySelector("#meal-download")?.addEventListener("click", () => downloadMealsPng());
}

/**
 * Paint progress + daftar meal hari ini.
 *
 * @param {HTMLElement} container - Page content.
 */
export function paintMeals(container) {
    const meals = getMealsByDate(toISODate());
    const count = meals.length;
    const min = mealConfig.dailyMin;
    const pct = Math.min(100, Math.round((count / min) * 100));

    const countEl = container.querySelector("#meal-count");
    if (countEl) countEl.textContent = `${count} / ${min}`;

    const bar = container.querySelector("#meal-bar");
    if (bar) bar.style.width = `${pct}%`;

    const status = container.querySelector("#meal-status");
    if (status) status.textContent = count >= min ? "Target tercapai! 🎉" : `Kurang ${min - count}× lagi`;

    const pctEl = container.querySelector("#meal-pct");
    if (pctEl) pctEl.textContent = `${pct}%`;

    const badge = container.querySelector("#meal-badge");
    if (badge) badge.textContent = String(count);

    const list = container.querySelector("#meal-list");
    if (list) {
        if (!count) {
            list.innerHTML = `
                <div class="empty-state" style="padding:1.2rem">
                    <div class="empty-icon" style="font-size:2rem">🍽️</div>
                    <p>Belum ada makanan tercatat hari ini.</p>
                </div>
            `;
        } else {
            list.innerHTML = meals
                .map(
                    (m, i) => `
                <div class="meal-item" style="animation-delay:${i * 0.04}s">
                    <span class="meal-time pixel-font">${escapeHtml(m.time || "--:--")}</span>
                    <div class="meal-body">
                        <div class="meal-name">${escapeHtml(m.name)}</div>
                        ${m.note ? `<div class="meal-note">${escapeHtml(m.note)}</div>` : ""}
                    </div>
                    <button type="button" class="btn btn-sm btn-ghost meal-del" data-meal-del="${m.id}" aria-label="Hapus">🗑️</button>
                </div>
            `
                )
                .join("");

            list.querySelectorAll("[data-meal-del]").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    const ok = await confirmDialog("Hapus catatan makan ini?", {
                        danger: true,
                        confirmLabel: "Hapus"
                    });
                    if (!ok) return;
                    removeMeal(btn.dataset.mealDel);
                    paintMeals(container);
                    toast("Meal dihapus 🗑️", "info", 1500);
                });
            });
        }
    }

    paintMealWarning(container);
}

/**
 * Banner warning bila < min dan sudah lewat jam 20:00.
 *
 * @param {HTMLElement} container - Page content.
 */
function paintMealWarning(container) {
    const slot = container.querySelector("#meal-warning-slot");
    if (!slot) return;
    if (!shouldWarnMeals()) {
        slot.innerHTML = "";
        return;
    }
    const count = getTodayMealCount();
    slot.innerHTML = `
        <div class="meal-warning" role="alert">
            <span class="mw-icon" aria-hidden="true">⚠️</span>
            <div>
                <strong>Sudah lewat ${String(mealConfig.warnHour).padStart(2, "0")}:00</strong>
                <p>Kamu baru makan ${count}× hari ini (minimal ${mealConfig.dailyMin}×). Jangan lupa makan ya! 💗</p>
            </div>
            <button type="button" class="btn btn-sm btn-primary" id="meal-warn-add">＋ Makan</button>
        </div>
    `;
    slot.querySelector("#meal-warn-add")?.addEventListener("click", () => openMealModal(() => paintMeals(container)));
}

/**
 * Modal tambah meal.
 *
 * @param {Function} [onSaved] - Callback setelah simpan.
 */
export function openMealModal(onSaved) {
    const now = new Date();
    const defTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const presets = mealConfig.presets
        .map((p) => `<button type="button" class="filter-chip meal-preset" data-preset="${escapeHtml(p)}">${escapeHtml(p)}</button>`)
        .join("");

    openModal("🍽️ Tambah Makan", `
        <div class="field">
            <label for="meal-name">Makanan / minuman</label>
            <input class="input" id="meal-name" placeholder="cth: Nasi goreng" maxlength="120" autocomplete="off">
            <div class="meal-presets">${presets}</div>
        </div>
        <div class="field">
            <label for="meal-time">Jam</label>
            <input class="input" id="meal-time" type="time" value="${defTime}">
        </div>
        <div class="field">
            <label for="meal-note">Catatan (opsional)</label>
            <input class="input" id="meal-note" placeholder="cth: bareng Arum 💗" maxlength="160">
        </div>
    `, {
        actions: [
            { label: "Batal" },
            {
                label: "Simpan",
                class: "btn-primary",
                close: false,
                onClick: () => {
                    const name = document.getElementById("meal-name").value.trim();
                    if (!name) return toast("Nama makanan wajib diisi!", "error");
                    const time = document.getElementById("meal-time").value || defTime;
                    const note = document.getElementById("meal-note").value.trim();
                    addMeal({ name, time, note });
                    closeModal();
                    const count = getTodayMealCount();
                    toast(`🍽️ Makan dicatat (${count}/${mealConfig.dailyMin})`, "success");
                    if (onSaved) onSaved();
                }
            }
        ]
    });

    document.querySelectorAll(".meal-preset").forEach((chip) => {
        chip.addEventListener("click", () => {
            const input = document.getElementById("meal-name");
            if (input) {
                input.value = chip.dataset.preset || "";
                input.focus();
            }
        });
    });
}

/**
 * Download daftar makan hari ini sebagai PNG (canvas).
 */
export function downloadMealsPng() {
    const meals = getMealsByDate(toISODate());
    if (!meals.length) {
        toast("Belum ada makan untuk di-download.", "info");
        return;
    }

    const theme = document.documentElement.getAttribute("data-theme") === "blue" ? "#4DA6FF" : "#FF69B4";
    const ink = "#1a1025";
    const surface = "#ffffff";
    const muted = "#5a4a6a";

    const w = 720;
    const pad = 36;
    const headerH = 150;
    const rowH = 58;
    const footerH = 70;
    const h = headerH + meals.length * rowH + footerH;

    const canvas = document.createElement("canvas");
    const dpr = 2;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#fff7fb";
    ctx.fillRect(0, 0, w, h);

    // Border frame
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    // Header band
    ctx.fillStyle = theme;
    ctx.fillRect(8, 8, w - 16, headerH - 8);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 34px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("🍽️ Meal Tracker", pad, 62);
    ctx.font = "600 18px sans-serif";
    ctx.fillText(formatDateShort(), pad, 96);
    ctx.font = "bold 20px sans-serif";
    const status =
        meals.length >= mealConfig.dailyMin
            ? `✅ ${meals.length} makan — target tercapai!`
            : `⚠️ ${meals.length}/${mealConfig.dailyMin} makan — kurang!`;
    ctx.fillText(status, pad, 132);

    // Rows
    let y = headerH + 8;
    meals.forEach((m, i) => {
        ctx.fillStyle = i % 2 === 0 ? surface : "#ffeef6";
        ctx.fillRect(pad - 8, y, w - (pad - 8) * 2, rowH - 6);

        ctx.fillStyle = theme;
        ctx.font = "bold 18px monospace";
        ctx.textAlign = "left";
        ctx.fillText(m.time || "--:--", pad, y + 36);

        ctx.fillStyle = ink;
        ctx.font = "bold 20px sans-serif";
        const nameMax = w - pad * 2 - 90;
        ctx.fillText(fitText(ctx, m.name, nameMax), pad + 90, y + 36);

        if (m.note) {
            ctx.fillStyle = muted;
            ctx.font = "14px sans-serif";
            ctx.fillText(fitText(ctx, m.note, nameMax), pad + 90, y + 52);
            y += rowH + 8;
        } else {
            y += rowH;
        }
    });

    // Footer
    ctx.fillStyle = muted;
    ctx.font = "600 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PinkyPlan · pacaran sehat 💗", w / 2, h - 28);

    const user = getState().currentUser;
    if (user) {
        ctx.textAlign = "right";
        ctx.fillText(user.name, w - pad, h - 28);
    }

    canvas.toBlob((blob) => {
        if (!blob) {
            toast("Gagal membuat gambar.", "error");
            return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `meals-${toISODate()}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        toast("📥 Meal list di-download!", "success");
    }, "image/png");
}

/**
 * Potong teks agar muat di lebar max.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @returns {string}
 */
function fitText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) {
        t = t.slice(0, -1);
    }
    return `${t}…`;
}

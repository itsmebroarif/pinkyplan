/**
 * Habits module — Daily Habit Tracking dengan marking per hari, visualisasi konsistensi, & streak counter.
 */
import {
    getHabits,
    addHabit,
    updateHabit,
    removeHabit,
    toggleHabitDate,
    calculateHabitStreak
} from "../store.js";
import { escapeHtml, toISODate, formatDateShort, formatDateLong } from "../helpers.js";
import { openModal, closeModal, confirmDialog } from "../components/modal.js";
import { toast } from "../components/ui.js";

/** Offset minggu aktif (0 = minggu ini, -1 = minggu lalu, dsb) */
let weekOffset = 0;

/** Mode tampilan: 'cards' (optimal untuk mobile) atau 'table' */
let habitViewMode = localStorage.getItem("pinkyplan_habit_view") || (window.innerWidth < 768 ? "cards" : "table");

/**
 * Hitung 7 hari dari minggu yang sedang dilihat berdasarkan offset.
 *
 * @param {number} offset
 * @returns {Array<{dateStr: string, dayName: string, dayNum: number, isToday: boolean}>}
 */
function getWeekDays(offset = 0) {
    const now = new Date();
    const todayStr = toISODate(now);

    // Dapatkan hari Senin dari minggu target
    const currentDay = now.getDay(); // 0 is Sunday
    const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday + offset * 7);

    const dayLabels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
    const days = [];

    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const iso = toISODate(d);
        days.push({
            dateStr: iso,
            dayName: dayLabels[i],
            dayNum: d.getDate(),
            isToday: iso === todayStr
        });
    }

    return days;
}

/**
 * Render halaman Daily Habits.
 *
 * @param {HTMLElement} container - Page content.
 */
export function renderHabitsPage(container) {
    container.innerHTML = `
        <div class="page-enter">
            <div class="page-header habit-page-header">
                <div>
                    <h1>🌱 Daily Habit Tracker</h1>
                    <p class="page-desc">Bangun konsistensi harian, catat rutinitas, dan raih streak terbaikmu</p>
                </div>
                <button type="button" class="btn btn-primary" id="add-habit-btn">＋ Add Habit</button>
            </div>

            <!-- Stats Overview Cards (2x2 di Mobile, 4-col di Desktop) -->
            <div class="stat-grid habit-stats-grid" id="habit-stats-overview"></div>

            <!-- Week Navigator & Consistency Tracker -->
            <div class="card soft habit-matrix-card" style="margin-bottom:1.5rem;padding:1.1rem">
                <div class="habit-matrix-header">
                    <div class="habit-week-header-row">
                        <div class="habit-week-title" id="habit-week-label">
                            🗓️ Memuat minggu…
                        </div>
                        <div class="habit-view-switch" id="habit-view-switcher">
                            <button type="button" class="view-pill ${habitViewMode === "cards" ? "active" : ""}" data-view="cards" title="Tampilan Kartu (Optimal Mobile)">🗂️ Kartu</button>
                            <button type="button" class="view-pill ${habitViewMode === "table" ? "active" : ""}" data-view="table" title="Tampilan Tabel Mingguan">📊 Tabel</button>
                        </div>
                    </div>
                    <div class="habit-controls-row">
                        <div class="habit-week-nav">
                            <button type="button" class="btn btn-sm btn-secondary" id="habit-prev-week" title="Minggu Sebelumnya" aria-label="Minggu Sebelumnya">◀</button>
                            <button type="button" class="btn btn-sm btn-ghost" id="habit-current-week">Hari Ini</button>
                            <button type="button" class="btn btn-sm btn-secondary" id="habit-next-week" title="Minggu Berikutnya" aria-label="Minggu Berikutnya">▶</button>
                        </div>
                    </div>
                </div>

                <div class="habit-table-container" id="habit-table-container"></div>
            </div>

            <!-- 30-Day Consistency Heatmaps -->
            <div class="card soft" style="margin-bottom:1.5rem;padding:1.1rem">
                <div class="heat-section-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.9rem">
                    <div style="font-weight:900;font-size:1.05rem;color:var(--text-color)">
                        📈 Peta Konsistensi (30 Hari Terakhir)
                    </div>
                    <span class="text-muted" style="font-size:0.78rem;font-weight:700">
                        Kotak berwarna = kebiasaan selesai
                    </span>
                </div>
                <div class="habit-heatmaps-list" id="habit-heatmaps-list"></div>
            </div>
        </div>
    `;

    container.querySelector("#add-habit-btn")?.addEventListener("click", () => openHabitModal());

    container.querySelector("#habit-prev-week")?.addEventListener("click", () => {
        weekOffset--;
        paintHabitsView(container);
    });

    container.querySelector("#habit-next-week")?.addEventListener("click", () => {
        weekOffset++;
        paintHabitsView(container);
    });

    container.querySelector("#habit-current-week")?.addEventListener("click", () => {
        weekOffset = 0;
        paintHabitsView(container);
    });

    container.querySelectorAll("#habit-view-switcher .view-pill").forEach((btn) => {
        btn.addEventListener("click", () => {
            habitViewMode = btn.dataset.view;
            localStorage.setItem("pinkyplan_habit_view", habitViewMode);
            container.querySelectorAll("#habit-view-switcher .view-pill").forEach((b) => b.classList.toggle("active", b.dataset.view === habitViewMode));
            paintHabitsView(container);
        });
    });

    paintHabitsView(container);
}

/**
 * Paint seluruh konten data habits: statistik, tracker mingguan, dan heatmap 30 hari.
 *
 * @param {HTMLElement} container
 */
export function paintHabitsView(container) {
    const habits = getHabits();
    const weekDays = getWeekDays(weekOffset);
    const todayStr = toISODate();

    // 1. Update stats overview
    const statsContainer = container.querySelector("#habit-stats-overview");
    if (statsContainer) {
        let bestStreakAll = 0;
        let todayDone = 0;
        let totalCompletionsAll = 0;

        habits.forEach((h) => {
            if (h.bestStreak > bestStreakAll) bestStreakAll = h.bestStreak;
            if (h.isCompletedToday) todayDone++;
            totalCompletionsAll += (h.completedDates || []).length;
        });

        const todayPct = habits.length ? Math.round((todayDone / habits.length) * 100) : 0;

        statsContainer.innerHTML = `
            <div class="stat-box">
                <div class="stat-icon">🌱</div>
                <div class="stat-value">${habits.length}</div>
                <div class="stat-label">Total Habit</div>
            </div>
            <div class="stat-box">
                <div class="stat-icon">🔥</div>
                <div class="stat-value">${bestStreakAll} Hari</div>
                <div class="stat-label">Best Streak</div>
            </div>
            <div class="stat-box">
                <div class="stat-icon">✨</div>
                <div class="stat-value">${todayDone}/${habits.length}</div>
                <div class="stat-label">Hari Ini (${todayPct}%)</div>
            </div>
            <div class="stat-box">
                <div class="stat-icon">🏆</div>
                <div class="stat-value">${totalCompletionsAll}</div>
                <div class="stat-label">Total Ceklis</div>
            </div>
        `;
    }

    // 2. Update Week Label
    const weekLabel = container.querySelector("#habit-week-label");
    if (weekLabel) {
        const firstDay = weekDays[0];
        const lastDay = weekDays[6];
        const statusText = weekOffset === 0 ? " (Minggu Ini)" : weekOffset === -1 ? " (Minggu Lalu)" : "";
        weekLabel.innerHTML = `<span>🗓️ ${formatDateShort(firstDay.dateStr)} — ${formatDateShort(lastDay.dateStr)} ${statusText}</span>`;
    }

    // 3. Render Tracker (Cards View vs Table View)
    const tableContainer = container.querySelector("#habit-table-container");
    if (tableContainer) {
        if (!habits.length) {
            tableContainer.innerHTML = `
                <div class="empty-state" style="padding:2rem 1rem">
                    <div class="empty-icon">🌱</div>
                    <h3>Belum ada Habit harian</h3>
                    <p>Mulai bangun kebiasaan baik dengan menambahkan Habit pertamamu!</p>
                    <button type="button" class="btn btn-primary" id="empty-add-habit">＋ Tambah Habit Baru</button>
                </div>
            `;
            tableContainer.querySelector("#empty-add-habit")?.addEventListener("click", () => openHabitModal());
        } else if (habitViewMode === "cards") {
            // ==================== TAMPILAN KARTU (MOBILE-FIRST) ====================
            let cardsHtml = `<div class="habit-mobile-cards">`;

            habits.forEach((h) => {
                const compSet = new Set(h.completedDates || []);
                const isTodayDone = compSet.has(todayStr);

                cardsHtml += `
                    <div class="habit-mobile-card" data-habit-id="${h.id}" style="border-left-color: ${h.color};">
                        <div class="hmc-top">
                            <div class="hmc-identity">
                                <span class="habit-icon" style="background:${h.color}22">${h.icon}</span>
                                <div class="hmc-info">
                                    <div class="habit-name">${escapeHtml(h.name)}</div>
                                    <div class="hmc-streak-meta">
                                        <span class="hmc-streak-badge ${h.currentStreak > 0 ? "active" : ""}">
                                            🔥 ${h.currentStreak} hari
                                        </span>
                                        <span class="hmc-best-badge">Best: ${h.bestStreak} hr</span>
                                    </div>
                                </div>
                            </div>
                            <div class="hmc-actions">
                                <button type="button" class="icon-btn" data-edit-habit="${h.id}" title="Edit Habit" aria-label="Edit">✏️</button>
                                <button type="button" class="icon-btn danger" data-del-habit="${h.id}" title="Hapus Habit" aria-label="Hapus">🗑️</button>
                            </div>
                        </div>

                        ${h.description ? `<p class="hmc-desc">${escapeHtml(h.description)}</p>` : ""}

                        <!-- Tombol Ceklis Cepat Hari Ini -->
                        <div class="hmc-today-banner ${isTodayDone ? "done" : ""}">
                            <div class="hmc-today-info">
                                <span class="hmc-today-title">Hari Ini (${formatDateShort(todayStr)}):</span>
                                <span class="hmc-today-status ${isTodayDone ? "done" : ""}">${isTodayDone ? "✓ Selesai Tercapai" : "Belum ditandai"}</span>
                            </div>
                            <button type="button" class="btn btn-sm ${isTodayDone ? "btn-secondary" : "btn-primary"} hmc-today-btn habit-check-btn ${isTodayDone ? "checked" : ""}"
                                data-habit-id="${h.id}"
                                data-date="${todayStr}"
                                style="${isTodayDone ? `background:${h.color};border-color:${h.color};color:#fff;` : ""}"
                                aria-label="Tandai ${h.name} untuk hari ini">
                                ${isTodayDone ? "✓ Selesai" : "＋ Tandai Hari Ini"}
                            </button>
                        </div>

                        <!-- Baris 7 Hari Kalender Mingguan (Rapi 100% Pas Lebar Layar Mobile) -->
                        <div class="hmc-week-strip">
                            ${weekDays
                                .map((d) => {
                                    const isDone = compSet.has(d.dateStr);
                                    return `
                                    <div class="hmc-day-cell ${d.isToday ? "today-cell" : ""}">
                                        <div class="hmc-day-name">${d.dayName}</div>
                                        <button type="button" class="habit-check-btn ${isDone ? "checked" : ""}"
                                            data-habit-id="${h.id}"
                                            data-date="${d.dateStr}"
                                            style="${isDone ? `background:${h.color};border-color:${h.color};` : ""}"
                                            aria-label="${h.name}, ${d.dayName} ${d.dayNum} ${isDone ? "Selesai" : "Belum"}"
                                            title="${d.dayName}, ${formatDateShort(d.dateStr)} (${isDone ? "Selesai ✓" : "Klik untuk menandai"})">
                                            ${isDone ? "✓" : d.dayNum}
                                        </button>
                                    </div>
                                `;
                                })
                                .join("")}
                        </div>
                    </div>
                `;
            });

            cardsHtml += `</div>`;
            tableContainer.innerHTML = cardsHtml;
        } else {
            // ==================== TAMPILAN TABEL ====================
            let html = `
                <div class="habit-table-wrapper">
                    <table class="habit-table">
                        <thead>
                            <tr>
                                <th class="th-habit-name">Nama Habit</th>
                                <th class="th-streak">Streak 🔥</th>
                                ${weekDays
                                    .map(
                                        (d) => `
                                    <th class="th-day ${d.isToday ? "today-col" : ""}">
                                        <div class="day-th-name">${d.dayName}</div>
                                        <div class="day-th-num">${d.dayNum}</div>
                                    </th>
                                `
                                    )
                                    .join("")}
                                <th class="th-actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            habits.forEach((h) => {
                const compSet = new Set(h.completedDates || []);

                html += `
                    <tr class="habit-row" data-habit-id="${h.id}">
                        <td class="td-habit-info">
                            <div class="habit-identity">
                                <span class="habit-icon" style="background:${h.color}22">${h.icon}</span>
                                <div>
                                    <div class="habit-name">${escapeHtml(h.name)}</div>
                                    ${h.description ? `<div class="habit-desc">${escapeHtml(h.description)}</div>` : ""}
                                </div>
                            </div>
                        </td>

                        <td class="td-streak">
                            <div class="streak-pill ${h.currentStreak > 0 ? "active" : ""}">
                                <span class="s-flame">🔥</span>
                                <span class="s-count">${h.currentStreak} hr</span>
                            </div>
                            <div class="best-streak-sub">Best: ${h.bestStreak} hr</div>
                        </td>

                        ${weekDays
                            .map((d) => {
                                const isDone = compSet.has(d.dateStr);
                                return `
                                <td class="td-day-check ${d.isToday ? "today-cell" : ""}">
                                    <button type="button" class="habit-check-btn ${isDone ? "checked" : ""}"
                                        data-habit-id="${h.id}"
                                        data-date="${d.dateStr}"
                                        style="${isDone ? `background:${h.color};border-color:${h.color}` : ""}"
                                        aria-label="${h.name}, ${d.dayName} ${d.dayNum} ${isDone ? "Selesai" : "Belum"}"
                                        title="${h.name} — ${d.dateStr} (${isDone ? "Sudah Selesai ✓" : "Klik untuk menandai"})">
                                        ${isDone ? "✓" : ""}
                                    </button>
                                </td>
                            `;
                            })
                            .join("")}

                        <td class="td-actions">
                            <div style="display:flex;gap:0.3rem;justify-content:center">
                                <button type="button" class="icon-btn" data-edit-habit="${h.id}" title="Edit Habit">✏️</button>
                                <button type="button" class="icon-btn danger" data-del-habit="${h.id}" title="Hapus Habit">🗑️</button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;

            tableContainer.innerHTML = html;
        }

        // Bind toggle habit button clicks (berlaku baik untuk card view maupun table view)
        tableContainer.querySelectorAll(".habit-check-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const habitId = btn.dataset.habitId;
                const dateStr = btn.dataset.date;
                const { completed, streak } = toggleHabitDate(habitId, dateStr);

                if (completed) {
                    btn.classList.add("checked");
                    btn.textContent = "✓";
                    const h = habits.find((x) => x.id === habitId);
                    if (h) {
                        btn.style.background = h.color;
                        btn.style.borderColor = h.color;
                    }
                    toast(`🔥 Habit selesai! Streak: ${streak.currentStreak} hari`, "success", 1600);
                } else {
                    btn.classList.remove("checked");
                    btn.textContent = btn.classList.contains("hmc-today-btn") ? "＋ Tandai Hari Ini" : "";
                    btn.style.background = "";
                    btn.style.borderColor = "";
                    toast("Dibatalkan", "info", 1000);
                }

                // Refresh tampilan setelah jeda singkat
                setTimeout(() => paintHabitsView(container), 250);
            });
        });

        // Bind edit & delete buttons
        tableContainer.querySelectorAll("[data-edit-habit]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const h = habits.find((x) => x.id === btn.dataset.editHabit);
                if (h) openHabitModal(h);
            });
        });

        tableContainer.querySelectorAll("[data-del-habit]").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const ok = await confirmDialog("Hapus kebiasaan ini beserta riwayat streak-nya?", {
                    danger: true,
                    confirmLabel: "Hapus Habit"
                });
                if (ok) {
                    removeHabit(btn.dataset.delHabit);
                    toast("Habit dihapus 🗑️", "info");
                    paintHabitsView(container);
                }
            });
        });
    }

    // 4. Render 30-Day Consistency Heatmaps
    const heatmapList = container.querySelector("#habit-heatmaps-list");
    if (heatmapList) {
        if (!habits.length) {
            heatmapList.innerHTML = `<p class="text-muted" style="font-weight:700">Tambahkan habit untuk melihat peta konsistensi.</p>`;
        } else {
            // Hitung 30 hari ke belakang
            const last30Days = [];
            const d = new Date();
            for (let i = 29; i >= 0; i--) {
                const target = new Date();
                target.setDate(d.getDate() - i);
                last30Days.push(toISODate(target));
            }

            let heatHtml = "";
            habits.forEach((h) => {
                const compSet = new Set(h.completedDates || []);
                const completedIn30 = last30Days.filter((dt) => compSet.has(dt)).length;
                const pct = Math.round((completedIn30 / 30) * 100);

                heatHtml += `
                    <div class="habit-heatmap-item">
                        <div class="heat-item-header">
                            <div class="heat-item-title">
                                <span class="heat-icon">${h.icon}</span>
                                <span class="heat-name">${escapeHtml(h.name)}</span>
                            </div>
                            <div class="heat-badges">
                                <span class="badge ${pct >= 70 ? "success" : "purple"}" style="font-size:0.7rem">
                                    ${completedIn30}/30 Hari (${pct}%)
                                </span>
                                <span class="badge pink" style="font-size:0.7rem">
                                    🔥 ${h.currentStreak} hr
                                </span>
                            </div>
                        </div>

                        <div class="heat-grid-wrap">
                            <div class="heat-grid">
                                ${last30Days
                                    .map((dt) => {
                                        const isDone = compSet.has(dt);
                                        const isToday = dt === todayStr;
                                        return `
                                        <div class="heat-dot ${isDone ? "done" : ""} ${isToday ? "today" : ""}"
                                            style="${isDone ? `background:${h.color};border-color:${h.color};` : ""}"
                                            data-date="${dt}"
                                            data-habit="${escapeHtml(h.name)}"
                                            data-status="${isDone ? "Selesai ✓" : "Belum selesai"}"
                                            title="${formatDateShort(dt)}: ${isDone ? "Selesai ✓" : "Belum selesai"}">
                                        </div>
                                    `;
                                    })
                                    .join("")}
                            </div>
                            <div class="heat-legend">
                                <span>30 hari lalu (${formatDateShort(last30Days[0])})</span>
                                <span>Hari ini (${formatDateShort(todayStr)})</span>
                            </div>
                        </div>
                    </div>
                `;
            });

            heatmapList.innerHTML = heatHtml;

            // Tap pada dot heatmap untuk info tooltip mobile yang interaktif
            heatmapList.querySelectorAll(".heat-dot").forEach((dot) => {
                dot.addEventListener("click", () => {
                    const dt = dot.dataset.date;
                    const name = dot.dataset.habit;
                    const st = dot.dataset.status;
                    toast(`${name} · ${formatDateShort(dt)}: ${st}`, "info", 1500);
                });
            });
        }
    }
}

/**
 * Modal create / edit Habit.
 *
 * @param {Object|null} [habit=null]
 */
export function openHabitModal(habit = null) {
    const editing = Boolean(habit);
    const icons = ["🌱", "💧", "🏃", "📚", "🧘", "🌙", "🎨", "🍵", "🧹", "🍎", "💊", "💪", "💡", "📝", "🚶"];
    const colors = ["#FF69B4", "#4DA6FF", "#9B5DE5", "#10B981", "#F59E0B", "#E94E9A", "#6C3BB5", "#F472B6"];

    const initialIcon = editing ? habit.icon : "🌱";
    const initialColor = editing ? habit.color : "#FF69B4";

    const body = `
        <form id="habit-form">
            <div class="field">
                <label for="habit-name">Nama Kebiasaan *</label>
                <input class="input" id="habit-name" required maxlength="100"
                    placeholder="Mis. Minum 2L Air / Belajar 15 Menit"
                    value="${editing ? escapeHtml(habit.name) : ""}">
            </div>

            <div class="field">
                <label for="habit-desc">Catatan / Target (Opsional)</label>
                <textarea class="textarea" id="habit-desc" maxlength="300"
                    placeholder="Mis. Setiap pagi setelah bangun tidur…">${editing ? escapeHtml(habit.description || "") : ""}</textarea>
            </div>

            <div class="field">
                <label>Pilih Icon</label>
                <div class="icon-selector" id="habit-icon-picker" style="display:flex;gap:0.4rem;flex-wrap:wrap">
                    ${icons
                        .map(
                            (ic) => `
                        <button type="button" class="icon-choice ${ic === initialIcon ? "selected" : ""}" data-icon="${ic}"
                            style="width:38px;height:38px;font-size:1.25rem;border:2px solid var(--border-color,#ffd1dc);border-radius:8px;background:var(--surface);cursor:pointer">
                            ${ic}
                        </button>
                    `
                        )
                        .join("")}
                </div>
                <input type="hidden" id="habit-icon-val" value="${initialIcon}">
            </div>

            <div class="field">
                <label>Pilih Warna Penanda</label>
                <div class="color-selector" id="habit-color-picker" style="display:flex;gap:0.5rem;flex-wrap:wrap">
                    ${colors
                        .map(
                            (c) => `
                        <button type="button" class="color-choice ${c === initialColor ? "selected" : ""}" data-color="${c}"
                            style="width:32px;height:32px;border-radius:50%;background:${c};border:3px solid ${c === initialColor ? "var(--ink,#333)" : "transparent"};cursor:pointer">
                        </button>
                    `
                        )
                        .join("")}
                </div>
                <input type="hidden" id="habit-color-val" value="${initialColor}">
            </div>
        </form>
    `;

    openModal(editing ? "✏️ Edit Habit" : "🌱 Tambah Habit Baru", body, {
        actions: [
            { label: "Batal" },
            {
                label: editing ? "Simpan Perubahan" : "Tambah Habit",
                class: "btn-primary",
                close: false,
                onClick: () => {
                    const name = document.getElementById("habit-name")?.value.trim();
                    if (!name) return toast("Nama kebiasaan wajib diisi!", "error");

                    const icon = document.getElementById("habit-icon-val")?.value || "🌱";
                    const color = document.getElementById("habit-color-val")?.value || "#FF69B4";
                    const description = document.getElementById("habit-desc")?.value.trim() || "";

                    if (editing) {
                        updateHabit(habit.id, { name, icon, color, description });
                        toast("Habit diperbarui ✏️", "success");
                    } else {
                        addHabit({ name, icon, color, description });
                        toast("Habit baru ditambahkan 🌱", "success");
                    }

                    closeModal();

                    const page = document.getElementById("page-content");
                    if (page && page.querySelector("#habit-table-container")) {
                        paintHabitsView(page);
                    } else {
                        import("../app.js").then((m) => m.refreshCurrentPage?.());
                    }
                }
            }
        ]
    });

    // Icon picker selection
    setTimeout(() => {
        document.querySelectorAll("#habit-icon-picker .icon-choice").forEach((btn) => {
            btn.addEventListener("click", () => {
                document.querySelectorAll("#habit-icon-picker .icon-choice").forEach((b) => b.classList.remove("selected"));
                btn.classList.add("selected");
                const hidden = document.getElementById("habit-icon-val");
                if (hidden) hidden.value = btn.dataset.icon;
            });
        });

        document.querySelectorAll("#habit-color-picker .color-choice").forEach((btn) => {
            btn.addEventListener("click", () => {
                document.querySelectorAll("#habit-color-picker .color-choice").forEach((b) => {
                    b.classList.remove("selected");
                    b.style.borderColor = "transparent";
                });
                btn.classList.add("selected");
                btn.style.borderColor = "var(--ink, #333)";
                const hidden = document.getElementById("habit-color-val");
                if (hidden) hidden.value = btn.dataset.color;
            });
        });
    }, 50);
}

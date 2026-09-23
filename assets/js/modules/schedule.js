/**
 * Schedule module — halaman schedule + rentang tanggal + group + nested todo.
 */
import {
    getSchedules,
    addSchedule,
    updateSchedule,
    removeSchedule,
    getSchedulesByDate,
    getSchedulesByRange,
    addGroup,
    removeGroup,
    addTodo,
    toggleTodo,
    removeTodo,
    getCategories,
    getCategory,
    filterTodos,
    getTodos
} from "../store.js";
import { escapeHtml, toISODate, uid, calcProgress, formatDateShort, formatDateLong } from "../helpers.js";
import { openModal, closeModal, confirmDialog } from "../components/modal.js";
import { toast } from "../components/ui.js";
import { priorityConfig } from "../config.js";
import { startPomodoroForTask } from "../components/pomodoro.js";

/** State aktif untuk view rentang tanggal di halaman schedule */
let scheduleRange = {
    preset: "today",
    startDate: toISODate(),
    endDate: toISODate()
};

/**
 * Helper untuk menghitung tanggal rentang preset.
 *
 * @param {string} preset - "today" | "tomorrow" | "7days" | "thisweek" | "thismonth"
 * @returns {{start: string, end: string}}
 */
function calculatePresetRange(preset) {
    const now = new Date();
    const todayStr = toISODate(now);

    if (preset === "today") {
        return { start: todayStr, end: todayStr };
    }
    if (preset === "tomorrow") {
        const tom = new Date(now.getTime() + 86400000);
        const tomStr = toISODate(tom);
        return { start: tomStr, end: tomStr };
    }
    if (preset === "7days") {
        const end = new Date(now.getTime() + 6 * 86400000);
        return { start: todayStr, end: toISODate(end) };
    }
    if (preset === "thisweek") {
        const day = now.getDay(); // 0 is Sunday
        const diffToMon = (day === 0 ? -6 : 1) - day;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMon);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return { start: toISODate(monday), end: toISODate(sunday) };
    }
    if (preset === "thismonth") {
        const y = now.getFullYear();
        const m = now.getMonth();
        const first = new Date(y, m, 1);
        const last = new Date(y, m + 1, 0);
        return { start: toISODate(first), end: toISODate(last) };
    }

    return { start: todayStr, end: todayStr };
}

/**
 * Render halaman Schedule dengan kontrol pemilihan Rentang Tanggal (Select Range).
 *
 * @param {HTMLElement} container - Page content.
 * @param {{date?:string, startDate?:string, endDate?:string}} [params] - Params route opsional.
 */
export function renderSchedulePage(container, params = {}) {
    if (params.date) {
        scheduleRange.startDate = params.date;
        scheduleRange.endDate = params.date;
        scheduleRange.preset = params.date === toISODate() ? "today" : "custom";
    } else if (params.startDate) {
        scheduleRange.startDate = params.startDate;
        scheduleRange.endDate = params.endDate || params.startDate;
        scheduleRange.preset = "custom";
    }

    container.innerHTML = `
        <div class="page-enter">
            <div class="page-header">
                <div>
                    <h1>📅 Schedule Planner</h1>
                    <p class="page-desc">Pilih rentang tanggal, kelola jadwal & tugas terstruktur</p>
                </div>
                <button type="button" class="btn btn-primary" id="add-schedule-btn">＋ Add Schedule</button>
            </div>

            <!-- Range Filter Bar -->
            <div class="sched-range-card card soft" style="margin-bottom:1.2rem;padding:1rem">
                <div class="sched-range-presets" id="sched-range-presets" style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.9rem">
                    <button type="button" class="filter-chip ${scheduleRange.preset === "today" ? "active" : ""}" data-preset="today">Hari Ini</button>
                    <button type="button" class="filter-chip ${scheduleRange.preset === "tomorrow" ? "active" : ""}" data-preset="tomorrow">Besok</button>
                    <button type="button" class="filter-chip ${scheduleRange.preset === "7days" ? "active" : ""}" data-preset="7days">7 Hari</button>
                    <button type="button" class="filter-chip ${scheduleRange.preset === "thisweek" ? "active" : ""}" data-preset="thisweek">Minggu Ini</button>
                    <button type="button" class="filter-chip ${scheduleRange.preset === "thismonth" ? "active" : ""}" data-preset="thismonth">Bulan Ini</button>
                    <button type="button" class="filter-chip ${scheduleRange.preset === "custom" ? "active" : ""}" data-preset="custom">Custom Range</button>
                </div>

                <div class="sched-range-inputs" style="display:flex;align-items:flex-end;gap:0.75rem;flex-wrap:wrap">
                    <div class="field" style="margin-bottom:0;flex:1;min-width:140px">
                        <label for="sched-start-date" style="font-size:0.78rem">Dari Tanggal</label>
                        <input class="input" type="date" id="sched-start-date" value="${scheduleRange.startDate}">
                    </div>
                    <div class="field" style="margin-bottom:0;flex:1;min-width:140px">
                        <label for="sched-end-date" style="font-size:0.78rem">Sampai Tanggal</label>
                        <input class="input" type="date" id="sched-end-date" value="${scheduleRange.endDate}">
                    </div>
                    <button type="button" class="btn btn-secondary btn-sm" id="sched-apply-range" style="height:42px">
                        Terapkan
                    </button>
                </div>

                <div class="sched-range-summary" id="sched-range-summary" style="margin-top:0.8rem;padding-top:0.65rem;border-top:1px dashed var(--border-color,#ffd1dc);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem">
                    <div id="sched-range-label" style="font-weight:800;font-size:0.88rem;color:var(--text-color)">
                        🗓️ Memuat rentang…
                    </div>
                    <div id="sched-range-stats" style="display:flex;gap:0.4rem;align-items:center">
                        <span class="badge pink" id="sched-total-badge">0 Jadwal</span>
                        <span class="badge purple" id="sched-todos-badge">0 Todos</span>
                    </div>
                </div>
            </div>

            <div class="schedule-list stagger" id="schedule-list"></div>
        </div>
    `;

    // Event listener untuk tombol Add Schedule
    container.querySelector("#add-schedule-btn")?.addEventListener("click", () => {
        openScheduleModal(null, scheduleRange.startDate, scheduleRange.endDate);
    });

    // Preset chip clicks
    container.querySelectorAll("#sched-range-presets .filter-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
            const preset = chip.dataset.preset;
            scheduleRange.preset = preset;
            container.querySelectorAll("#sched-range-presets .filter-chip").forEach((c) => c.classList.remove("active"));
            chip.classList.add("active");

            if (preset !== "custom") {
                const range = calculatePresetRange(preset);
                scheduleRange.startDate = range.start;
                scheduleRange.endDate = range.end;

                const startInput = container.querySelector("#sched-start-date");
                const endInput = container.querySelector("#sched-end-date");
                if (startInput) startInput.value = range.start;
                if (endInput) endInput.value = range.end;

                paintScheduleList(container, scheduleRange.startDate, scheduleRange.endDate);
            }
        });
    });

    // Inputs change & Apply button
    const applyRange = () => {
        const startInput = container.querySelector("#sched-start-date");
        const endInput = container.querySelector("#sched-end-date");
        let start = startInput ? startInput.value : scheduleRange.startDate;
        let end = endInput ? endInput.value : scheduleRange.endDate;

        if (start && end && start > end) {
            end = start;
            if (endInput) endInput.value = start;
        }

        scheduleRange.startDate = start || toISODate();
        scheduleRange.endDate = end || scheduleRange.startDate;
        scheduleRange.preset = "custom";

        container.querySelectorAll("#sched-range-presets .filter-chip").forEach((c) => {
            c.classList.toggle("active", c.dataset.preset === "custom");
        });

        paintScheduleList(container, scheduleRange.startDate, scheduleRange.endDate);
    };

    container.querySelector("#sched-apply-range")?.addEventListener("click", applyRange);
    container.querySelector("#sched-start-date")?.addEventListener("change", applyRange);
    container.querySelector("#sched-end-date")?.addEventListener("change", applyRange);

    paintScheduleList(container, scheduleRange.startDate, scheduleRange.endDate);
}

/**
 * Paint list schedule + nested groups/todos dalam single date atau date range.
 *
 * @param {HTMLElement|Object} container - Page content atau adapter.
 * @param {string} startDate - ISO date awal.
 * @param {string} [endDate] - ISO date akhir (opsional, default startDate).
 */
export function paintScheduleList(container, startDate, endDate) {
    const listEl = container.querySelector("#schedule-list");
    if (!listEl) return;

    const actualEnd = endDate || startDate;
    const isSingleDay = startDate === actualEnd;

    // Ambil schedules dalam rentang
    const schedules = isSingleDay
        ? getSchedulesByDate(startDate)
        : getSchedulesByRange(startDate, actualEnd);

    // Update range summary labels jika elemennya ada di halaman
    const labelEl = document.getElementById("sched-range-label");
    const totalBadge = document.getElementById("sched-total-badge");
    const todosBadge = document.getElementById("sched-todos-badge");

    if (labelEl) {
        if (isSingleDay) {
            labelEl.textContent = `📅 ${formatDateLong(startDate)}`;
        } else {
            labelEl.textContent = `🗓️ ${formatDateShort(startDate)} — ${formatDateShort(actualEnd)}`;
        }
    }

    // Hitung seluruh todo dalam jadwal ini
    let allTodosCount = 0;
    let doneTodosCount = 0;
    schedules.forEach((s) => {
        (s.groups || []).forEach((g) => {
            const todos = filterTodos({ groupId: g.id });
            allTodosCount += todos.length;
            doneTodosCount += todos.filter((t) => t.status === "done").length;
        });
    });

    if (totalBadge) totalBadge.textContent = `${schedules.length} Jadwal`;
    if (todosBadge) {
        todosBadge.textContent = allTodosCount > 0
            ? `${doneTodosCount}/${allTodosCount} Todos Done`
            : "0 Todos";
    }

    if (!schedules.length) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <h3>Tidak ada schedule</h3>
                <p>${isSingleDay ? `Belum ada jadwal untuk ${formatPretty(startDate)}.` : `Tidak ada jadwal pada rentang ${formatDateShort(startDate)} sampai ${formatDateShort(actualEnd)}.`}</p>
                <button type="button" class="btn btn-primary" id="empty-add-sched">＋ Add Schedule</button>
            </div>
        `;
        listEl.querySelector("#empty-add-sched")?.addEventListener("click", () => {
            openScheduleModal(null, startDate, isSingleDay ? null : actualEnd);
        });
        return;
    }

    if (isSingleDay) {
        // Tampilkan langsung kartu-kartu schedule untuk hari tersebut
        listEl.innerHTML = schedules.map((s, i) => scheduleCardHtml(s, i)).join("");
    } else {
        // Rentang beberapa hari: kelompokkan berdasarkan tanggal untuk keteraturan
        const dateMap = new Map();
        schedules.forEach((s) => {
            const d = s.date;
            if (!dateMap.has(d)) dateMap.set(d, []);
            dateMap.get(d).push(s);
        });

        // Urutkan tanggal
        const sortedDates = Array.from(dateMap.keys()).sort();

        let html = "";
        sortedDates.forEach((dateKey) => {
            const daySchedules = dateMap.get(dateKey);
            html += `
                <div class="sched-date-group" style="margin-bottom:1.5rem">
                    <div class="sched-date-group-header" style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;padding:0.4rem 0.6rem;background:var(--surface-2);border-radius:var(--radius-sm);border-left:4px solid var(--primary);margin-bottom:0.75rem">
                        <span style="font-weight:900;font-size:0.95rem;color:var(--text-color)">
                            📌 ${formatDateLong(dateKey)}
                        </span>
                        <span class="badge pink">${daySchedules.length} jadwal</span>
                    </div>
                    <div class="schedule-sublist" style="display:flex;flex-direction:column;gap:0.75rem">
                        ${daySchedules.map((s, i) => scheduleCardHtml(s, i)).join("")}
                    </div>
                </div>
            `;
        });
        listEl.innerHTML = html;
    }

    bindScheduleActionListeners(listEl, container, startDate, actualEnd);
}

/**
 * Bind seluruh event listener pada kartu-kartu schedule (edit, delete, add group, dll).
 */
function bindScheduleActionListeners(listEl, container, startDate, endDate) {
    const refreshView = () => {
        paintScheduleList(container, startDate, endDate);
    };

    listEl.querySelectorAll("[data-pomo-sched]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const s = getSchedules().find((x) => x.id === btn.dataset.pomoSched);
            if (s) {
                startPomodoroForTask({
                    id: s.id,
                    title: s.title,
                    type: "schedule"
                });
            }
        });
    });

    listEl.querySelectorAll("[data-pomo-todo]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const t = getTodos().find((x) => x.id === btn.dataset.pomoTodo);
            if (t) {
                startPomodoroForTask({
                    id: t.id,
                    title: t.title,
                    type: "todo"
                });
            }
        });
    });

    listEl.querySelectorAll("[data-edit-sched]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const s = getSchedules().find((x) => x.id === btn.dataset.editSched);
            if (s) openScheduleModal(s, startDate, endDate);
        });
    });

    listEl.querySelectorAll("[data-del-sched]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const ok = await confirmDialog(
                "Hapus schedule beserta group & todo di dalamnya?",
                { danger: true, confirmLabel: "Hapus" }
            );
            if (ok) {
                removeSchedule(btn.dataset.delSched);
                toast("Schedule dihapus 🗑️", "info");
                refreshView();
            }
        });
    });

    listEl.querySelectorAll("[data-add-group]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const scheduleId = btn.dataset.addGroup;
            openModal("＋ Add Group", `
                <form id="group-form">
                    <div class="field">
                        <label for="group-title">Nama group *</label>
                        <input class="input" id="group-title" required placeholder="Mis. Preparation, Tasks, dll">
                    </div>
                </form>
            `, {
                actions: [
                    { label: "Batal" },
                    {
                        label: "Tambah",
                        class: "btn-primary",
                        close: false,
                        onClick: () => {
                            const title = document.getElementById("group-title")?.value.trim();
                            if (!title) return toast("Nama group wajib!", "error");
                            addGroup(scheduleId, title);
                            closeModal();
                            toast("Group ditambahkan 📂", "success");
                            refreshView();
                        }
                    }
                ]
            });
        });
    });

    listEl.querySelectorAll("[data-del-group]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const ok = await confirmDialog("Hapus group ini + todos di dalamnya?", { danger: true });
            if (ok) {
                removeGroup(btn.dataset.schedId, btn.dataset.delGroup);
                toast("Group dihapus", "info");
                refreshView();
            }
        });
    });

    listEl.querySelectorAll("[data-add-todo-group]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const scheduleId = btn.dataset.scheduleId || btn.dataset.schedId;
            const groupId = btn.dataset.addTodoGroup;
            const itemDate = btn.dataset.date || startDate;
            if (scheduleId && groupId) {
                openGroupTodoModal(scheduleId, groupId, itemDate, () => refreshView());
            }
        });
    });

    listEl.querySelectorAll("[data-toggle]").forEach((cb) => {
        cb.addEventListener("change", () => {
            toggleTodo(cb.dataset.toggle);
            setTimeout(refreshView, 250);
        });
    });

    listEl.querySelectorAll("[data-del-todo]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const ok = await confirmDialog("Hapus todo ini?", { danger: true, confirmLabel: "Hapus" });
            if (ok) {
                removeTodo(btn.dataset.delTodo);
                refreshView();
            }
        });
    });
}

function formatPretty(date) {
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(
        new Date(date + "T00:00:00")
    );
}

/**
 * Render template kartu Schedule.
 */
function scheduleCardHtml(s, index) {
    const cat = s.categoryId ? getCategory(s.categoryId) : null;
    const groups = s.groups || [];
    const groupTodos = (gid) => filterTodos({ groupId: gid });
    const hasRange = s.endDate && s.endDate !== s.date;

    const groupsHtml = groups.length
        ? groups
            .map((g) => {
                const todos = groupTodos(g.id);
                const prog = calcProgress(todos);
                return `
                <div class="sched-group">
                    <div class="sched-group-head">
                        <span class="sched-group-title">📂 ${escapeHtml(g.title)}</span>
                        <span class="badge ${prog.percent === 100 && prog.total > 0 ? "success" : "purple"}">
                            ${prog.done}/${prog.total}
                        </span>
                        <span style="display:flex;gap:0.25rem">
                            <button type="button" class="icon-btn"
                                data-add-todo-group="${g.id}"
                                data-schedule-id="${s.id}"
                                data-date="${s.date}"
                                aria-label="Tambah todo" title="Add todo">＋</button>
                            <button type="button" class="icon-btn danger"
                                data-del-group="${g.id}"
                                data-sched-id="${s.id}"
                                aria-label="Hapus group">🗑️</button>
                        </span>
                    </div>
                    <div class="sched-todos">
                        ${
                    todos.length
                        ? todos
                            .map(
                                (t) => `
                            <div class="todo-item ${t.status === "done" ? "done" : ""}" style="box-shadow:none">
                                <input type="checkbox" class="todo-check" ${t.status === "done" ? "checked" : ""}
                                    data-toggle="${t.id}" aria-label="${escapeHtml(t.title)}">
                                <div class="todo-body">
                                    <div class="todo-title" style="font-size:0.9rem">${escapeHtml(t.title)}</div>
                                    <div class="todo-meta">
                                        <span class="priority-dot" style="background:${(priorityConfig.find((p) => p.id === t.priority) || {}).color || "#ccc"}"></span>
                                        ${t.date ? `<span>📅 ${formatDateShort(t.date)}</span>` : ""}
                                    </div>
                                </div>
                                <span style="display:flex;gap:0.2rem">
                                    <button type="button" class="icon-btn" data-pomo-todo="${t.id}" title="Mulai Pomodoro untuk tugas ini">🍅</button>
                                    <button type="button" class="icon-btn danger" data-del-todo="${t.id}" aria-label="Hapus">✕</button>
                                </span>
                            </div>
                        `
                            )
                            .join("")
                        : `<p class="text-muted" style="font-size:0.82rem;font-weight:700">Belum ada todo di group ini.</p>`
                }
                    </div>
                    <button type="button" class="btn btn-sm btn-ghost" style="margin-top:0.5rem;width:100%"
                        data-add-todo-group="${g.id}" data-schedule-id="${s.id}" data-date="${s.date}">
                        ＋ Add todo to group
                    </button>
                </div>
            `;
            })
            .join("")
        : `<p class="text-muted" style="font-weight:700;font-size:0.9rem">Belum ada group. Tambahkan group dulu 👇</p>`;

    return `
        <div class="schedule-card" style="animation-delay:${index * 0.05}s">
            <div class="schedule-card-head">
                <div class="s-icon">${s.icon || "📅"}</div>
                <div class="s-info">
                    <div class="s-title">${escapeHtml(s.title)}</div>
                    <div class="s-time">🕐 ${s.startTime} — ${s.endTime}</div>
                    <div style="display:flex;gap:0.35rem;flex-wrap:wrap;margin-top:0.3rem">
                        ${hasRange ? `<span class="badge pink">📆 ${formatDateShort(s.date)} — ${formatDateShort(s.endDate)}</span>` : `<span class="badge" style="background:rgba(0,0,0,0.06)">📅 ${formatDateShort(s.date)}</span>`}
                        ${cat ? `<span class="badge" style="background:${cat.color}33">${cat.icon} ${escapeHtml(cat.name)}</span>` : ""}
                    </div>
                </div>
                <span style="display:flex;gap:0.3rem">
                    <button type="button" class="icon-btn" data-pomo-sched="${s.id}" title="Fokus Pomodoro untuk jadwal ini" aria-label="Mulai Pomodoro">🍅</button>
                    <button type="button" class="icon-btn" data-edit-sched="${s.id}" aria-label="Edit">✏️</button>
                    <button type="button" class="icon-btn danger" data-del-sched="${s.id}" aria-label="Hapus">🗑️</button>
                </span>
            </div>
            <div class="schedule-card-body">
                ${s.description ? `<p class="text-muted" style="font-size:0.88rem;margin-bottom:0.7rem">${escapeHtml(s.description)}</p>` : ""}
                ${groupsHtml}
                <button type="button" class="btn btn-sm btn-secondary btn-block" data-add-group="${s.id}">
                    ＋ Add Group
                </button>
            </div>
        </div>
    `;
}

/**
 * Modal create/edit schedule dengan dukungan Rentang Tanggal (Start Date & End Date).
 *
 * @param {Object|null} schedule - Schedule diedit.
 * @param {string} [defaultStartDate] - Tanggal mulai default.
 * @param {string} [defaultEndDate] - Tanggal akhir default.
 */
export function openScheduleModal(schedule = null, defaultStartDate, defaultEndDate) {
    const categories = getCategories();
    const editing = Boolean(schedule);
    const icons = ["📅", "🏃", "📚", "💼", "🎮", "🧹", "🏖️", "💡", "🛒", "🎀", "🎯", "🍵"];
    const initialStart = editing ? schedule.date : defaultStartDate || toISODate();
    const initialEnd = editing && schedule.endDate ? schedule.endDate : (defaultEndDate || "");

    const body = `
        <form id="schedule-form">
            <div class="field">
                <label for="sched-title">Judul *</label>
                <input class="input" id="sched-title" required maxlength="120"
                    placeholder="Mis. Morning Workout / Liburan Weekend"
                    value="${editing ? escapeHtml(schedule.title) : ""}">
            </div>
            <div class="field">
                <label for="sched-desc">Deskripsi</label>
                <textarea class="textarea" id="sched-desc" maxlength="500" placeholder="Detail catatan jadwal…">${editing ? escapeHtml(schedule.description || "") : ""}</textarea>
            </div>
            
            <div class="form-row">
                <div class="field">
                    <label for="sched-d">Tanggal Mulai *</label>
                    <input class="input" type="date" id="sched-d" required value="${initialStart}">
                </div>
                <div class="field">
                    <label for="sched-end-d">Sampai Tanggal (Opsional Rentang)</label>
                    <input class="input" type="date" id="sched-end-d" value="${initialEnd}" placeholder="Sama dengan tanggal mulai jika 1 hari">
                </div>
            </div>

            <div class="form-row">
                <div class="field">
                    <label for="sched-icon">Icon</label>
                    <select class="select" id="sched-icon">
                        ${icons.map((ic) => `<option value="${ic}" ${editing && schedule.icon === ic ? "selected" : ""}>${ic}</option>`).join("")}
                    </select>
                </div>
                <div class="field">
                    <label for="sched-cat">Category</label>
                    <select class="select" id="sched-cat">
                        <option value="">— None —</option>
                        ${categories
                        .map(
                            (c) =>
                                `<option value="${c.id}" ${editing && schedule.categoryId === c.id ? "selected" : ""}>${c.icon} ${escapeHtml(c.name)}</option>`
                        )
                        .join("")}
                    </select>
                </div>
            </div>

            <div class="form-row">
                <div class="field">
                    <label for="sched-start">Jam Mulai</label>
                    <input class="input" type="time" id="sched-start"
                        value="${editing ? schedule.startTime : "09:00"}">
                </div>
                <div class="field">
                    <label for="sched-end">Jam Selesai</label>
                    <input class="input" type="time" id="sched-end"
                        value="${editing ? schedule.endTime : "10:00"}">
                </div>
            </div>
        </form>
    `;

    openModal(editing ? "✏️ Edit Schedule" : "＋ Add Schedule", body, {
        actions: [
            { label: "Batal" },
            {
                label: editing ? "Simpan" : "Tambah",
                class: "btn-primary",
                close: false,
                onClick: () => {
                    const title = document.getElementById("sched-title")?.value.trim();
                    if (!title) return toast("Judul wajib diisi!", "error");

                    const startDateVal = document.getElementById("sched-d")?.value || toISODate();
                    let endDateVal = document.getElementById("sched-end-d")?.value || null;

                    if (endDateVal && endDateVal < startDateVal) {
                        endDateVal = startDateVal;
                    }

                    const payload = {
                        title,
                        description: document.getElementById("sched-desc")?.value.trim() || "",
                        date: startDateVal,
                        endDate: endDateVal && endDateVal !== startDateVal ? endDateVal : null,
                        startTime: document.getElementById("sched-start")?.value || "09:00",
                        endTime: document.getElementById("sched-end")?.value || "10:00",
                        icon: document.getElementById("sched-icon")?.value || "📅",
                        categoryId: document.getElementById("sched-cat")?.value || null
                    };

                    if (editing) {
                        updateSchedule(schedule.id, payload);
                        toast("Schedule diperbarui ✏️", "success");
                    } else {
                        addSchedule(payload);
                        toast("Schedule ditambahkan 📅", "success");
                    }
                    closeModal();

                    const page = document.getElementById("page-content");
                    if (page && page.querySelector("#schedule-list")) {
                        paintScheduleList(page, scheduleRange.startDate, scheduleRange.endDate);
                    } else {
                        import("../app.js").then((m) => m.refreshCurrentPage?.());
                    }
                }
            }
        ]
    });
}

/**
 * Modal tambah todo di dalam group schedule.
 *
 * @param {string} scheduleId - ID schedule.
 * @param {string} groupId - ID group.
 * @param {string} date - Tanggal item todo.
 * @param {Function} [onDone] - Callback setelah selesai.
 */
function openGroupTodoModal(scheduleId, groupId, date, onDone) {
    const categories = getCategories();

    openModal("＋ Todo di Group", `
        <form id="gtd-form">
            <div class="field">
                <label for="gtd-title">Judul *</label>
                <input class="input" id="gtd-title" required placeholder="Mis. Siapkan perlengkapan">
            </div>
            <div class="form-row">
                <div class="field">
                    <label for="gtd-prio">Priority</label>
                    <select class="select" id="gtd-prio">
                        ${priorityConfig.map((p) => `<option value="${p.id}">${p.label}</option>`).join("")}
                    </select>
                </div>
                <div class="field">
                    <label for="gtd-cat">Category</label>
                    <select class="select" id="gtd-cat">
                        <option value="">— None —</option>
                        ${categories.map((c) => `<option value="${c.id}">${c.icon} ${escapeHtml(c.name)}</option>`).join("")}
                    </select>
                </div>
            </div>
        </form>
    `, {
        actions: [
            { label: "Batal" },
            {
                label: "Tambah",
                class: "btn-primary",
                close: false,
                onClick: () => {
                    const title = document.getElementById("gtd-title")?.value.trim();
                    if (!title) return toast("Judul wajib!", "error");
                    addTodo({
                        title,
                        date,
                        priority: document.getElementById("gtd-prio")?.value || "medium",
                        categoryId: document.getElementById("gtd-cat")?.value || null,
                        scheduleId,
                        groupId
                    });
                    closeModal();
                    toast("Todo masuk group 📌", "success");
                    if (onDone) onDone();
                }
            }
        ]
    });
}

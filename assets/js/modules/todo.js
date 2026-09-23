/**
 * Todo module — halaman + CRUD todo dengan pengelompokan & filter kategori dan schedule.
 */
import {
    getTodos,
    addTodo,
    updateTodo,
    toggleTodo,
    removeTodo,
    getCategories,
    getCategory,
    getSchedules
} from "../store.js";
import { escapeHtml, toISODate, formatDateShort, calcProgress } from "../helpers.js";
import { openModal, closeModal, confirmDialog } from "../components/modal.js";
import { toast } from "../components/ui.js";
import { priorityConfig } from "../config.js";

let activeStatusFilter = "all";
let activeCategoryFilter = "";
let activeScheduleFilter = "";
let activeGroupBy = "none"; // "none" | "category" | "schedule"

/**
 * Render halaman Todo dengan filter dan pengaturan Kategori & Schedule.
 *
 * @param {HTMLElement} container - Page content.
 */
export function renderTodoPage(container) {
    const categories = getCategories();
    const schedules = getSchedules();

    container.innerHTML = `
        <div class="page-enter">
            <div class="page-header">
                <div>
                    <h1>📋 My Todos</h1>
                    <p class="page-desc">Kelola tugas berdasarkan kategori, schedule, dan prioritas</p>
                </div>
                <button type="button" class="btn btn-primary" id="add-todo-btn">＋ Add Todo</button>
            </div>

            <!-- Status filter bar -->
            <div class="filter-bar" id="todo-filters" style="margin-bottom:0.75rem">
                <button type="button" class="filter-chip ${activeStatusFilter === "all" ? "active" : ""}" data-filter="all">All</button>
                <button type="button" class="filter-chip ${activeStatusFilter === "pending" ? "active" : ""}" data-filter="pending">Pending</button>
                <button type="button" class="filter-chip ${activeStatusFilter === "done" ? "active" : ""}" data-filter="done">Done</button>
                <button type="button" class="filter-chip ${activeStatusFilter === "today" ? "active" : ""}" data-filter="today">Today</button>
                <button type="button" class="filter-chip ${activeStatusFilter === "high" ? "active" : ""}" data-filter="high">High priority</button>
            </div>

            <!-- Secondary filter bar: Kategori, Schedule, dan Group By -->
            <div class="card soft" style="margin-bottom:1rem;padding:0.85rem">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.6rem">
                    <span style="font-weight:900;font-size:0.85rem;color:var(--text-color)">
                        🔍 Filter & Kelompokkan:
                    </span>
                    <button type="button" class="btn btn-ghost btn-sm" id="todo-reset-filters" style="font-size:0.75rem;padding:0.2rem 0.5rem">
                        ↺ Reset Filter
                    </button>
                </div>

                <div class="form-row" style="margin-bottom:0">
                    <div class="field" style="margin-bottom:0">
                        <label for="todo-filter-cat" style="font-size:0.78rem">Filter Kategori</label>
                        <select class="select" id="todo-filter-cat">
                            <option value="">🏷️ Semua Kategori</option>
                            <option value="none" ${activeCategoryFilter === "none" ? "selected" : ""}>— Tanpa Kategori —</option>
                            ${categories.map((c) => `<option value="${c.id}" ${activeCategoryFilter === c.id ? "selected" : ""}>${c.icon} ${escapeHtml(c.name)}</option>`).join("")}
                        </select>
                    </div>

                    <div class="field" style="margin-bottom:0">
                        <label for="todo-filter-sched" style="font-size:0.78rem">Filter Schedule</label>
                        <select class="select" id="todo-filter-sched">
                            <option value="">🗓️ Semua Schedule</option>
                            <option value="none" ${activeScheduleFilter === "none" ? "selected" : ""}>— Tanpa Schedule —</option>
                            ${schedules.map((s) => `<option value="${s.id}" ${activeScheduleFilter === s.id ? "selected" : ""}>${s.icon || "📅"} ${escapeHtml(s.title)} (${formatDateShort(s.date)})</option>`).join("")}
                        </select>
                    </div>

                    <div class="field" style="margin-bottom:0">
                        <label for="todo-group-by" style="font-size:0.78rem">Tampilan Pengelompokan</label>
                        <select class="select" id="todo-group-by">
                            <option value="none" ${activeGroupBy === "none" ? "selected" : ""}>📄 Standar (Semua Todo)</option>
                            <option value="category" ${activeGroupBy === "category" ? "selected" : ""}>📂 Kelompokkan per Kategori</option>
                            <option value="schedule" ${activeGroupBy === "schedule" ? "selected" : ""}>🗓️ Kelompokkan per Schedule</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Progress Card -->
            <div class="card soft" style="margin-bottom:1rem">
                <div class="progress" role="progressbar" aria-valuenow="0">
                    <div class="progress-bar" id="todo-progress" style="width:0%"></div>
                </div>
                <div class="progress-meta">
                    <span id="todo-progress-text">0 / 0 completed</span>
                    <span id="todo-progress-pct">0%</span>
                </div>
            </div>

            <!-- List Container -->
            <div class="todo-stack stagger" id="todo-list"></div>
        </div>
    `;

    // Add button
    container.querySelector("#add-todo-btn")?.addEventListener("click", () => {
        const defaultCat = activeCategoryFilter && activeCategoryFilter !== "none" ? activeCategoryFilter : null;
        const defaultSched = activeScheduleFilter && activeScheduleFilter !== "none" ? activeScheduleFilter : null;
        openTodoModal(null, { categoryId: defaultCat, scheduleId: defaultSched });
    });

    // Status filter chips
    container.querySelectorAll("#todo-filters .filter-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
            container.querySelectorAll("#todo-filters .filter-chip").forEach((c) => c.classList.remove("active"));
            chip.classList.add("active");
            activeStatusFilter = chip.dataset.filter;
            paintTodoList(container);
        });
    });

    // Category filter change
    container.querySelector("#todo-filter-cat")?.addEventListener("change", (e) => {
        activeCategoryFilter = e.target.value;
        paintTodoList(container);
    });

    // Schedule filter change
    container.querySelector("#todo-filter-sched")?.addEventListener("change", (e) => {
        activeScheduleFilter = e.target.value;
        paintTodoList(container);
    });

    // Group By change
    container.querySelector("#todo-group-by")?.addEventListener("change", (e) => {
        activeGroupBy = e.target.value;
        paintTodoList(container);
    });

    // Reset filters
    container.querySelector("#todo-reset-filters")?.addEventListener("click", () => {
        activeStatusFilter = "all";
        activeCategoryFilter = "";
        activeScheduleFilter = "";
        activeGroupBy = "none";
        renderTodoPage(container);
    });

    paintTodoList(container);
}

/**
 * Filter todo sesuai filter chip, kategori, dan schedule aktif.
 *
 * @returns {Array} Todo terfilter.
 */
function getFilteredTodos() {
    const today = toISODate();
    let list = getTodos().slice().sort((a, b) => {
        if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
        return (b.createdAt || "").localeCompare(a.createdAt || "");
    });

    // Status filter
    switch (activeStatusFilter) {
        case "pending":
            list = list.filter((t) => t.status === "pending");
            break;
        case "done":
            list = list.filter((t) => t.status === "done");
            break;
        case "today":
            list = list.filter((t) => t.date === today);
            break;
        case "high":
            list = list.filter((t) => t.priority === "high");
            break;
    }

    // Category filter
    if (activeCategoryFilter === "none") {
        list = list.filter((t) => !t.categoryId);
    } else if (activeCategoryFilter) {
        list = list.filter((t) => t.categoryId === activeCategoryFilter);
    }

    // Schedule filter
    if (activeScheduleFilter === "none") {
        list = list.filter((t) => !t.scheduleId);
    } else if (activeScheduleFilter) {
        list = list.filter((t) => t.scheduleId === activeScheduleFilter);
    }

    return list;
}

/**
 * Paint ulang list todo + progress bar dengan dukungan grouping.
 *
 * @param {HTMLElement} container - Page content.
 */
export function paintTodoList(container) {
    const listEl = container.querySelector("#todo-list");
    if (!listEl) return;

    const filtered = getFilteredTodos();
    const all = getTodos();

    const prog = calcProgress(all);
    const bar = container.querySelector("#todo-progress");
    if (bar) bar.style.width = `${prog.percent}%`;
    const pText = container.querySelector("#todo-progress-text");
    if (pText) pText.textContent = `${prog.done} / ${prog.total} completed`;
    const pPct = container.querySelector("#todo-progress-pct");
    if (pPct) pPct.textContent = `${prog.percent}%`;

    if (!filtered.length) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🌱</div>
                <h3>Belum ada todo yang sesuai</h3>
                <p>Coba sesuaikan filter atau tambahkan tugas baru!</p>
                <button type="button" class="btn btn-primary" data-empty-add>＋ Add Todo</button>
            </div>
        `;
        listEl.querySelector("[data-empty-add]")?.addEventListener("click", () => {
            const defaultCat = activeCategoryFilter && activeCategoryFilter !== "none" ? activeCategoryFilter : null;
            const defaultSched = activeScheduleFilter && activeScheduleFilter !== "none" ? activeScheduleFilter : null;
            openTodoModal(null, { categoryId: defaultCat, scheduleId: defaultSched });
        });
        return;
    }

    if (activeGroupBy === "category") {
        paintGroupedByCategory(listEl, filtered, container);
    } else if (activeGroupBy === "schedule") {
        paintGroupedBySchedule(listEl, filtered, container);
    } else {
        listEl.innerHTML = filtered.map((t) => todoItemHtml(t)).join("");
        bindTodoItemEvents(listEl, container);
    }
}

/**
 * Render Todos dikelompokkan berdasarkan Kategori.
 */
function paintGroupedByCategory(listEl, todos, container) {
    const categories = getCategories();
    const catMap = new Map();

    // Inisialisasi setiap kategori
    categories.forEach((c) => catMap.set(c.id, []));
    const noCatTodos = [];

    todos.forEach((t) => {
        if (t.categoryId && catMap.has(t.categoryId)) {
            catMap.get(t.categoryId).push(t);
        } else {
            noCatTodos.push(t);
        }
    });

    let html = "";

    // Kategori terdaftar
    categories.forEach((c) => {
        const catTodos = catMap.get(c.id) || [];
        if (catTodos.length === 0 && activeCategoryFilter && activeCategoryFilter !== c.id) return;
        
        const prog = calcProgress(catTodos);
        html += `
            <div class="card soft todo-group-section" style="margin-bottom:1.25rem;border-left:5px solid ${c.color}">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;padding-bottom:0.5rem;border-bottom:1px dashed var(--border-color,#ffd1dc)">
                    <div style="display:flex;align-items:center;gap:0.5rem">
                        <span style="font-size:1.2rem">${c.icon}</span>
                        <span style="font-weight:900;font-size:1rem;color:var(--text-color)">${escapeHtml(c.name)}</span>
                        <span class="badge ${prog.percent === 100 && prog.total > 0 ? "success" : "pink"}">
                            ${prog.done}/${prog.total}
                        </span>
                    </div>
                    <button type="button" class="btn btn-sm btn-ghost" data-add-to-cat="${c.id}">
                        ＋ Add to ${escapeHtml(c.name)}
                    </button>
                </div>
                <div class="todo-stack" style="gap:0.5rem">
                    ${catTodos.length ? catTodos.map((t) => todoItemHtml(t)).join("") : `<p class="text-muted" style="font-size:0.82rem;font-weight:700">Belum ada todo di kategori ini.</p>`}
                </div>
            </div>
        `;
    });

    // Tanpa Kategori
    if (noCatTodos.length > 0 || activeCategoryFilter === "none") {
        const prog = calcProgress(noCatTodos);
        html += `
            <div class="card soft todo-group-section" style="margin-bottom:1.25rem;border-left:5px solid #a0aec0">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;padding-bottom:0.5rem;border-bottom:1px dashed var(--border-color,#ffd1dc)">
                    <div style="display:flex;align-items:center;gap:0.5rem">
                        <span style="font-size:1.2rem">🏷️</span>
                        <span style="font-weight:900;font-size:1rem;color:var(--text-color)">Tanpa Kategori</span>
                        <span class="badge ${prog.percent === 100 && prog.total > 0 ? "success" : "purple"}">
                            ${prog.done}/${prog.total}
                        </span>
                    </div>
                    <button type="button" class="btn btn-sm btn-ghost" data-add-to-cat="none">
                        ＋ Add Todo
                    </button>
                </div>
                <div class="todo-stack" style="gap:0.5rem">
                    ${noCatTodos.length ? noCatTodos.map((t) => todoItemHtml(t)).join("") : `<p class="text-muted" style="font-size:0.82rem;font-weight:700">Tidak ada todo tanpa kategori.</p>`}
                </div>
            </div>
        `;
    }

    listEl.innerHTML = html;

    listEl.querySelectorAll("[data-add-to-cat]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const catId = btn.dataset.addToCat === "none" ? null : btn.dataset.addToCat;
            openTodoModal(null, { categoryId: catId });
        });
    });

    bindTodoItemEvents(listEl, container);
}

/**
 * Render Todos dikelompokkan berdasarkan Schedule.
 */
function paintGroupedBySchedule(listEl, todos, container) {
    const schedules = getSchedules();
    const schedMap = new Map();

    schedules.forEach((s) => schedMap.set(s.id, []));
    const unassignedTodos = [];

    todos.forEach((t) => {
        if (t.scheduleId && schedMap.has(t.scheduleId)) {
            schedMap.get(t.scheduleId).push(t);
        } else {
            unassignedTodos.push(t);
        }
    });

    let html = "";

    // Schedule yang ada
    schedules.forEach((s) => {
        const schedTodos = schedMap.get(s.id) || [];
        if (schedTodos.length === 0 && activeScheduleFilter && activeScheduleFilter !== s.id) return;

        const prog = calcProgress(schedTodos);
        html += `
            <div class="card soft todo-group-section" style="margin-bottom:1.25rem;border-left:5px solid var(--secondary)">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;padding-bottom:0.5rem;border-bottom:1px dashed var(--border-color,#ffd1dc)">
                    <div>
                        <div style="display:flex;align-items:center;gap:0.4rem">
                            <span style="font-size:1.15rem">${s.icon || "📅"}</span>
                            <span style="font-weight:900;font-size:1rem;color:var(--text-color)">${escapeHtml(s.title)}</span>
                            <span class="badge ${prog.percent === 100 && prog.total > 0 ? "success" : "pink"}">
                                ${prog.done}/${prog.total}
                            </span>
                        </div>
                        <div style="font-size:0.75rem;font-weight:700;color:var(--text-muted);margin-top:0.2rem">
                            📅 ${formatDateShort(s.date)} · 🕐 ${s.startTime} — ${s.endTime}
                        </div>
                    </div>
                    <button type="button" class="btn btn-sm btn-ghost" data-add-to-sched="${s.id}">
                        ＋ Add to Schedule
                    </button>
                </div>
                <div class="todo-stack" style="gap:0.5rem">
                    ${schedTodos.length ? schedTodos.map((t) => todoItemHtml(t)).join("") : `<p class="text-muted" style="font-size:0.82rem;font-weight:700">Belum ada todo yang dihubungkan ke schedule ini.</p>`}
                </div>
            </div>
        `;
    });

    // Unassigned Todos (Tanpa Schedule)
    if (unassignedTodos.length > 0 || activeScheduleFilter === "none") {
        const prog = calcProgress(unassignedTodos);
        html += `
            <div class="card soft todo-group-section" style="margin-bottom:1.25rem;border-left:5px solid #a0aec0">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;padding-bottom:0.5rem;border-bottom:1px dashed var(--border-color,#ffd1dc)">
                    <div style="display:flex;align-items:center;gap:0.5rem">
                        <span style="font-size:1.2rem">📌</span>
                        <span style="font-weight:900;font-size:1rem;color:var(--text-color)">Tugas Umum (Tanpa Schedule)</span>
                        <span class="badge ${prog.percent === 100 && prog.total > 0 ? "success" : "purple"}">
                            ${prog.done}/${prog.total}
                        </span>
                    </div>
                    <button type="button" class="btn btn-sm btn-ghost" data-add-to-sched="none">
                        ＋ Add Todo
                    </button>
                </div>
                <div class="todo-stack" style="gap:0.5rem">
                    ${unassignedTodos.length ? unassignedTodos.map((t) => todoItemHtml(t)).join("") : `<p class="text-muted" style="font-size:0.82rem;font-weight:700">Tidak ada tugas umum.</p>`}
                </div>
            </div>
        `;
    }

    listEl.innerHTML = html;

    listEl.querySelectorAll("[data-add-to-sched]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const schedId = btn.dataset.addToSched === "none" ? null : btn.dataset.addToSched;
            openTodoModal(null, { scheduleId: schedId });
        });
    });

    bindTodoItemEvents(listEl, container);
}

/**
 * Bind event listener untuk checkbox selesai, edit, delete.
 */
function bindTodoItemEvents(listEl, container) {
    listEl.querySelectorAll("[data-toggle]").forEach((cb) => {
        cb.addEventListener("change", () => {
            const id = cb.dataset.toggle;
            toggleTodo(id);
            const item = cb.closest(".todo-item");
            if (item && cb.checked) {
                item.classList.add("done", "just-done");
                toast("Nice work! 🎉", "success", 1600);
            } else if (item) {
                item.classList.remove("done");
            }
            setTimeout(() => paintTodoList(container), 350);
        });
    });

    listEl.querySelectorAll("[data-edit]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const todo = getTodos().find((t) => t.id === btn.dataset.edit);
            if (todo) openTodoModal(todo);
        });
    });

    listEl.querySelectorAll("[data-delete]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const ok = await confirmDialog("Hapus todo ini?", { danger: true, confirmLabel: "Hapus" });
            if (ok) {
                removeTodo(btn.dataset.delete);
                toast("Todo dihapus 🗑️", "info");
                paintTodoList(container);
            }
        });
    });
}

/**
 * HTML untuk satu item todo dengan badge Kategori dan Schedule yang jelas.
 *
 * @param {Object} t - Todo.
 * @returns {string} HTML.
 */
function todoItemHtml(t) {
    const cat = t.categoryId ? getCategory(t.categoryId) : null;
    const prio = priorityConfig.find((p) => p.id === t.priority);
    const isDone = t.status === "done";
    const schedule = t.scheduleId ? getSchedules().find((s) => s.id === t.scheduleId) : null;

    return `
        <div class="todo-item ${isDone ? "done" : ""}">
            <input type="checkbox" class="todo-check" ${isDone ? "checked" : ""}
                data-toggle="${t.id}" aria-label="Selesaikan ${escapeHtml(t.title)}">
            <div class="todo-body">
                <div class="todo-title">${escapeHtml(t.title)}</div>
                <div class="todo-meta">
                    <span title="Priority">
                        <span class="priority-dot" style="background:${prio ? prio.color : "#ccc"}"></span>
                        ${prio ? prio.label : ""}
                    </span>
                    ${t.date ? `<span>📅 ${formatDateShort(t.date)}</span>` : ""}
                    ${cat ? `<span class="badge" style="background:${cat.color}22;color:var(--text-color)" title="Kategori">${cat.icon} ${escapeHtml(cat.name)}</span>` : `<span class="badge" style="background:rgba(0,0,0,0.05)" title="Tanpa Kategori">🏷️ None</span>`}
                    ${schedule ? `<span class="badge" style="background:var(--secondary-light);color:var(--secondary-dark)" title="Terhubung ke Schedule">${schedule.icon || "🗓️"} ${escapeHtml(schedule.title)}</span>` : ""}
                    ${t.description ? `<span>📝 ${escapeHtml(t.description.slice(0, 45))}</span>` : ""}
                </div>
            </div>
            <div class="todo-actions">
                <button type="button" class="icon-btn" data-edit="${t.id}" aria-label="Edit todo" title="Edit Kategori / Schedule / Detail">✏️</button>
                <button type="button" class="icon-btn danger" data-delete="${t.id}" aria-label="Hapus">🗑️</button>
            </div>
        </div>
    `;
}

/**
 * Buka modal create/edit todo dengan pemilihan Kategori, Schedule, dan Group di dalamnya.
 *
 * @param {Object|null} [todo=null] - Todo yang diedit.
 * @param {Object} [defaults={}] - Nilai awal { categoryId, scheduleId, groupId, date }.
 */
export function openTodoModal(todo = null, defaults = {}) {
    const categories = getCategories();
    const schedules = getSchedules();
    const editing = Boolean(todo);

    const initialCat = editing ? todo.categoryId : (defaults.categoryId || "");
    const initialSched = editing ? todo.scheduleId : (defaults.scheduleId || "");
    const initialGroup = editing ? todo.groupId : (defaults.groupId || "");
    const initialDate = editing ? todo.date : (defaults.date || toISODate());

    // Helper untuk render options group dari schedule terpilih
    const getGroupOptionsHtml = (selectedSchedId, currentGroupId) => {
        if (!selectedSchedId) return `<option value="">— Pilih Schedule Dulu —</option>`;
        const sch = schedules.find((s) => s.id === selectedSchedId);
        if (!sch || !sch.groups || !sch.groups.length) {
            return `<option value="">— Tidak ada group khusus —</option>`;
        }
        return [
            `<option value="">— Tanpa Group Khusus —</option>`,
            ...sch.groups.map(
                (g) => `<option value="${g.id}" ${currentGroupId === g.id ? "selected" : ""}>📂 ${escapeHtml(g.title)}</option>`
            )
        ].join("");
    };

    const body = `
        <form id="todo-form">
            <div class="field">
                <label for="todo-title">Judul *</label>
                <input class="input" id="todo-title" required maxlength="120"
                    placeholder="Mis. Belajar JavaScript / Selesaikan Modul" value="${editing ? escapeHtml(todo.title) : ""}">
            </div>

            <div class="field">
                <label for="todo-desc">Deskripsi</label>
                <textarea class="textarea" id="todo-desc" maxlength="500"
                    placeholder="Opsional…">${editing ? escapeHtml(todo.description || "") : ""}</textarea>
            </div>

            <div class="form-row">
                <div class="field">
                    <label for="todo-date">Due date</label>
                    <input class="input" type="date" id="todo-date"
                        value="${initialDate}">
                </div>
                <div class="field">
                    <label for="todo-priority">Priority</label>
                    <select class="select" id="todo-priority">
                        ${priorityConfig
                            .map(
                            (p) =>
                                `<option value="${p.id}" ${editing && todo.priority === p.id ? "selected" : ""}>${p.label}</option>`
                        )
                            .join("")}
                    </select>
                </div>
            </div>

            <!-- Set Kategori -->
            <div class="field">
                <label for="todo-category">🏷️ Kategori</label>
                <select class="select" id="todo-category">
                    <option value="">— Tanpa Kategori (None) —</option>
                    ${categories
                        .map(
                        (c) =>
                            `<option value="${c.id}" ${initialCat === c.id ? "selected" : ""}>${c.icon} ${escapeHtml(c.name)}</option>`
                    )
                        .join("")}
                </select>
            </div>

            <!-- Set Schedule & Group -->
            <div class="form-row">
                <div class="field">
                    <label for="todo-schedule">🗓️ Hubungkan ke Schedule</label>
                    <select class="select" id="todo-schedule">
                        <option value="">— Tanpa Schedule (None) —</option>
                        ${schedules
                            .map(
                            (s) =>
                                `<option value="${s.id}" ${initialSched === s.id ? "selected" : ""}>${s.icon || "📅"} ${escapeHtml(s.title)} (${formatDateShort(s.date)})</option>`
                        )
                            .join("")}
                    </select>
                </div>

                <div class="field">
                    <label for="todo-group">📂 Group dalam Schedule</label>
                    <select class="select" id="todo-group" ${!initialSched ? "disabled" : ""}>
                        ${getGroupOptionsHtml(initialSched, initialGroup)}
                    </select>
                </div>
            </div>
        </form>
    `;

    openModal(editing ? "✏️ Edit Todo" : "＋ Add Todo", body, {
        actions: [
            { label: "Batal" },
            {
                label: editing ? "Simpan" : "Tambah",
                class: "btn-primary",
                close: false,
                onClick: () => {
                    const title = document.getElementById("todo-title")?.value.trim();
                    if (!title) {
                        toast("Judul todo wajib diisi!", "error");
                        return;
                    }

                    const schedVal = document.getElementById("todo-schedule")?.value || null;
                    const groupVal = schedVal ? (document.getElementById("todo-group")?.value || null) : null;

                    const payload = {
                        title,
                        description: document.getElementById("todo-desc")?.value.trim() || "",
                        date: document.getElementById("todo-date")?.value || toISODate(),
                        priority: document.getElementById("todo-priority")?.value || "medium",
                        categoryId: document.getElementById("todo-category")?.value || null,
                        scheduleId: schedVal,
                        groupId: groupVal
                    };

                    if (editing) {
                        updateTodo(todo.id, payload);
                        toast("Todo diperbarui ✏️", "success");
                    } else {
                        addTodo(payload);
                        toast("Todo ditambahkan 🎀", "success");
                    }
                    closeModal();

                    const page = document.getElementById("page-content");
                    if (page && page.querySelector("#todo-list")) {
                        paintTodoList(page);
                    } else {
                        import("../app.js").then((m) => m.refreshCurrentPage?.());
                    }
                }
            }
        ]
    });

    // Dynamic schedule -> group dropdown linkage
    setTimeout(() => {
        const schedSelect = document.getElementById("todo-schedule");
        const groupSelect = document.getElementById("todo-group");
        if (schedSelect && groupSelect) {
            schedSelect.addEventListener("change", (e) => {
                const sId = e.target.value;
                if (!sId) {
                    groupSelect.disabled = true;
                    groupSelect.innerHTML = `<option value="">— Pilih Schedule Dulu —</option>`;
                } else {
                    groupSelect.disabled = false;
                    groupSelect.innerHTML = getGroupOptionsHtml(sId, null);
                }
            });
        }
    }, 50);
}

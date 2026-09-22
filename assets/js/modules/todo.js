/**
 * Todo module — halaman + CRUD todo.
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
import { escapeHtml, toISODate, formatDateShort, calcProgress, uid } from "../helpers.js";
import { openModal, closeModal, confirmDialog } from "../components/modal.js";
import { toast } from "../components/ui.js";
import { priorityConfig } from "../config.js";

let activeFilter = "all";

/**
 * Render halaman Todo.
 *
 * @param {HTMLElement} container - Page content.
 */
export function renderTodoPage(container) {
    container.innerHTML = `
        <div class="page-enter">
            <div class="page-header">
                <div>
                    <h1>📋 My Todos</h1>
                    <p class="page-desc">Kelola semua tugasmu di sini</p>
                </div>
                <button type="button" class="btn btn-primary" id="add-todo-btn">＋ Add Todo</button>
            </div>

            <div class="filter-bar" id="todo-filters">
                <button type="button" class="filter-chip active" data-filter="all">All</button>
                <button type="button" class="filter-chip" data-filter="pending">Pending</button>
                <button type="button" class="filter-chip" data-filter="done">Done</button>
                <button type="button" class="filter-chip" data-filter="today">Today</button>
                <button type="button" class="filter-chip" data-filter="high">High priority</button>
            </div>

            <div class="card soft" style="margin-bottom:1rem">
                <div class="progress" role="progressbar" aria-valuenow="0">
                    <div class="progress-bar" id="todo-progress" style="width:0%"></div>
                </div>
                <div class="progress-meta">
                    <span id="todo-progress-text">0 / 0 completed</span>
                    <span id="todo-progress-pct">0%</span>
                </div>
            </div>

            <div class="todo-stack stagger" id="todo-list"></div>
        </div>
    `;

    container.querySelector("#add-todo-btn")?.addEventListener("click", () => openTodoModal());

    container.querySelectorAll("#todo-filters .filter-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
            container.querySelectorAll("#todo-filters .filter-chip").forEach((c) => c.classList.remove("active"));
            chip.classList.add("active");
            activeFilter = chip.dataset.filter;
            paintTodoList(container);
        });
    });

    paintTodoList(container);
}

/**
 * Filter todo sesuai chip aktif.
 *
 * @returns {Array} Todo terfilter.
 */
function getFilteredTodos() {
    const today = toISODate();
    const todos = getTodos().slice().sort((a, b) => {
        if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
        return (b.createdAt || "").localeCompare(a.createdAt || "");
    });

    switch (activeFilter) {
        case "pending": return todos.filter((t) => t.status === "pending");
        case "done": return todos.filter((t) => t.status === "done");
        case "today": return todos.filter((t) => t.date === today);
        case "high": return todos.filter((t) => t.priority === "high");
        default: return todos;
    }
}

/**
 * Paint ulang list todo + progress bar.
 *
 * @param {HTMLElement} container - Page content.
 */
export function paintTodoList(container) {
    const listEl = container.querySelector("#todo-list");
    if (!listEl) return;

    const todos = getFilteredTodos();
    const all = getTodos();

    const prog = calcProgress(all);
    const bar = container.querySelector("#todo-progress");
    if (bar) bar.style.width = `${prog.percent}%`;
    const pText = container.querySelector("#todo-progress-text");
    if (pText) pText.textContent = `${prog.done} / ${prog.total} completed`;
    const pPct = container.querySelector("#todo-progress-pct");
    if (pPct) pPct.textContent = `${prog.percent}%`;

    if (!todos.length) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🌱</div>
                <h3>Belum ada todo di sini</h3>
                <p>Tambahkan tugasmu pertama kali dengan tombol Add Todo!</p>
                <button type="button" class="btn btn-primary" data-empty-add>＋ Add Todo</button>
            </div>
        `;
        listEl.querySelector("[data-empty-add]")?.addEventListener("click", () => openTodoModal());
        return;
    }

    listEl.innerHTML = todos.map((t) => todoItemHtml(t)).join("");

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
 * HTML untuk satu item todo.
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
                    ${cat ? `<span class="badge" style="background:${cat.color}22">${cat.icon} ${escapeHtml(cat.name)}</span>` : ""}
                    ${schedule ? `<span>🗓️ ${escapeHtml(schedule.title)}</span>` : ""}
                    ${t.description ? `<span>📝 ${escapeHtml(t.description.slice(0, 40))}</span>` : ""}
                </div>
            </div>
            <div class="todo-actions">
                <button type="button" class="icon-btn" data-edit="${t.id}" aria-label="Edit">✏️</button>
                <button type="button" class="icon-btn danger" data-delete="${t.id}" aria-label="Hapus">🗑️</button>
            </div>
        </div>
    `;
}

/**
 * Buka modal create/edit todo.
 *
 * @param {Object|null} [todo=null] - Todo yang diedit.
 */
export function openTodoModal(todo = null) {
    const categories = getCategories();
    const schedules = getSchedules();
    const editing = Boolean(todo);

    const body = `
        <form id="todo-form">
            <div class="field">
                <label for="todo-title">Judul *</label>
                <input class="input" id="todo-title" required maxlength="120"
                    placeholder="Mis. Belajar JavaScript" value="${editing ? escapeHtml(todo.title) : ""}">
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
                        value="${editing ? todo.date : toISODate()}">
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
            <div class="form-row">
                <div class="field">
                    <label for="todo-category">Category</label>
                    <select class="select" id="todo-category">
                        <option value="">— None —</option>
                        ${categories
                            .map(
                            (c) =>
                                `<option value="${c.id}" ${editing && todo.categoryId === c.id ? "selected" : ""}>${c.icon} ${escapeHtml(c.name)}</option>`
                        )
                            .join("")}
                    </select>
                </div>
                <div class="field">
                    <label for="todo-schedule">Schedule</label>
                    <select class="select" id="todo-schedule">
                        <option value="">— None —</option>
                        ${schedules
                            .map(
                            (s) =>
                                `<option value="${s.id}" ${editing && todo.scheduleId === s.id ? "selected" : ""}>${escapeHtml(s.title)}</option>`
                        )
                            .join("")}
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
                    const form = document.getElementById("todo-form");
                    const title = document.getElementById("todo-title").value.trim();
                    if (!title) {
                        toast("Judul todo wajib diisi!", "error");
                        return;
                    }
                    const payload = {
                        title,
                        description: document.getElementById("todo-desc").value.trim(),
                        date: document.getElementById("todo-date").value || toISODate(),
                        priority: document.getElementById("todo-priority").value,
                        categoryId: document.getElementById("todo-category").value || null,
                        scheduleId: document.getElementById("todo-schedule").value || null
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
                    if (page && page.querySelector("#todo-list")) paintTodoList(page);
                    else import("../app.js").then((m) => m.refreshCurrentPage?.());
                }
            }
        ]
    });
}

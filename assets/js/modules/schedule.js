/**
 * Schedule module — halaman schedule + group + nested todo.
 */
import {
    getSchedules,
    addSchedule,
    updateSchedule,
    removeSchedule,
    getSchedulesByDate,
    addGroup,
    removeGroup,
    addTodo,
    toggleTodo,
    removeTodo,
    getCategories,
    getCategory,
    filterTodos
} from "../store.js";
import { escapeHtml, toISODate, uid, calcProgress } from "../helpers.js";
import { openModal, closeModal, confirmDialog } from "../components/modal.js";
import { toast } from "../components/ui.js";
import { priorityConfig } from "../config.js";

/**
 * Render halaman Schedule.
 *
 * @param {HTMLElement} container - Page content.
 * @param {{date?:string}} [params] - Params route opsional.
 */
export function renderSchedulePage(container, params = {}) {
    const selectedDate = params.date || toISODate();

    container.innerHTML = `
        <div class="page-enter">
            <div class="page-header">
                <div>
                    <h1>📅 Today's Schedule</h1>
                    <p class="page-desc">Jadwal, group, dan todo di dalamnya</p>
                </div>
                <button type="button" class="btn btn-primary" id="add-schedule-btn">＋ Add Schedule</button>
            </div>

            <div class="field" style="max-width:260px">
                <label for="sched-date">Lihat tanggal</label>
                <input class="input" type="date" id="sched-date" value="${selectedDate}">
            </div>

            <div class="schedule-list stagger" id="schedule-list"></div>
        </div>
    `;

    container.querySelector("#add-schedule-btn")?.addEventListener("click", () => openScheduleModal(null, selectedDate));
    container.querySelector("#sched-date")?.addEventListener("change", (e) => {
        paintScheduleList(container, e.target.value);
    });

    paintScheduleList(container, selectedDate);
}

/**
 * Paint list schedule + nested groups/todos.
 *
 * @param {HTMLElement} container - Page content.
 * @param {string} date - ISO date.
 */
export function paintScheduleList(container, date) {
    const listEl = container.querySelector("#schedule-list");
    if (!listEl) return;

    const schedules = getSchedulesByDate(date);

    if (!schedules.length) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <h3>Tidak ada schedule</h3>
                <p>Buat jadwal untuk ${formatPretty(date)} dan tambahkan group + todo di dalamnya.</p>
                <button type="button" class="btn btn-primary" id="empty-add-sched">＋ Add Schedule</button>
            </div>
        `;
        listEl.querySelector("#empty-add-sched")?.addEventListener("click", () => openScheduleModal(null, date));
        return;
    }

    listEl.innerHTML = schedules.map((s, i) => scheduleCardHtml(s, i)).join("");

    listEl.querySelectorAll("[data-edit-sched]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const s = getSchedules().find((x) => x.id === btn.dataset.editSched);
            if (s) openScheduleModal(s);
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
                paintScheduleList(container, date);
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
                        <input class="input" id="group-title" required placeholder="Mis. Preparation">
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
                            const title = document.getElementById("group-title").value.trim();
                            if (!title) return toast("Nama group wajib!", "error");
                            addGroup(scheduleId, title);
                            closeModal();
                            toast("Group ditambahkan 📂", "success");
                            paintScheduleList(container, date);
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
                paintScheduleList(container, date);
            }
        });
    });

    listEl.querySelectorAll("[data-add-todo-group]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const scheduleId = btn.dataset.scheduleId || btn.dataset.schedId;
            const groupId = btn.dataset.addTodoGroup;
            if (scheduleId && groupId) openGroupTodoModal(scheduleId, groupId, date, container);
        });
    });

    listEl.querySelectorAll("[data-toggle]").forEach((cb) => {
        cb.addEventListener("change", () => {
            toggleTodo(cb.dataset.toggle);
            setTimeout(() => paintScheduleList(container, date), 300);
        });
    });

    listEl.querySelectorAll("[data-del-todo]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const ok = await confirmDialog("Hapus todo ini?", { danger: true, confirmLabel: "Hapus" });
            if (ok) {
                removeTodo(btn.dataset.delTodo);
                paintScheduleList(container, date);
            }
        });
    });
}

function formatPretty(date) {
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(
        new Date(date + "T00:00:00")
    );
}

function scheduleCardHtml(s, index) {
    const cat = s.categoryId ? getCategory(s.categoryId) : null;
    const groups = s.groups || [];
    const groupTodos = (gid) => filterTodos({ groupId: gid });

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
                                    </div>
                                </div>
                                <button type="button" class="icon-btn danger" data-del-todo="${t.id}" aria-label="Hapus">✕</button>
                            </div>
                        `
                            )
                            .join("")
                        : `<p class="text-muted" style="font-size:0.82rem;font-weight:700">Belum ada todo di group ini.</p>`
                }
                    </div>
                    <button type="button" class="btn btn-sm btn-ghost" style="margin-top:0.5rem;width:100%"
                        data-add-todo-group="${g.id}" data-schedule-id="${s.id}">
                        ＋ Add todo to group
                    </button>
                </div>
            `;
            })
            .join("")
        : `<p class="text-muted" style="font-weight:700;font-size:0.9rem">Belum ada group. Tambahkan group dulu 👇</p>`;

    return `
        <div class="schedule-card" style="animation-delay:${index * 0.06}s">
            <div class="schedule-card-head">
                <div class="s-icon">${s.icon || "📅"}</div>
                <div class="s-info">
                    <div class="s-title">${escapeHtml(s.title)}</div>
                    <div class="s-time">🕐 ${s.startTime} — ${s.endTime}</div>
                    ${cat ? `<span class="badge" style="background:${cat.color}33;margin-top:0.3rem">${cat.icon} ${escapeHtml(cat.name)}</span>` : ""}
                </div>
                <span style="display:flex;gap:0.3rem">
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
 * Modal create/edit schedule.
 *
 * @param {Object|null} schedule - Schedule diedit.
 * @param {string} [defaultDate] - Tanggal default.
 */
export function openScheduleModal(schedule = null, defaultDate) {
    const categories = getCategories();
    const editing = Boolean(schedule);
    const icons = ["📅", "🏃", "📚", "💼", "🎮", "🧹", "🏖️", "💡", "🛒"];

    const body = `
        <form id="schedule-form">
            <div class="field">
                <label for="sched-title">Judul *</label>
                <input class="input" id="sched-title" required maxlength="120"
                    placeholder="Mis. Morning Workout"
                    value="${editing ? escapeHtml(schedule.title) : ""}">
            </div>
            <div class="field">
                <label for="sched-desc">Deskripsi</label>
                <textarea class="textarea" id="sched-desc" maxlength="500">${editing ? escapeHtml(schedule.description || "") : ""}</textarea>
            </div>
            <div class="form-row">
                <div class="field">
                    <label for="sched-d">Tanggal</label>
                    <input class="input" type="date" id="sched-d"
                        value="${editing ? schedule.date : defaultDate || toISODate()}">
                </div>
                <div class="field">
                    <label for="sched-icon">Icon</label>
                    <select class="select" id="sched-icon">
                        ${icons.map((ic) => `<option value="${ic}" ${editing && schedule.icon === ic ? "selected" : ""}>${ic}</option>`).join("")}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="field">
                    <label for="sched-start">Mulai</label>
                    <input class="input" type="time" id="sched-start"
                        value="${editing ? schedule.startTime : "09:00"}">
                </div>
                <div class="field">
                    <label for="sched-end">Selesai</label>
                    <input class="input" type="time" id="sched-end"
                        value="${editing ? schedule.endTime : "10:00"}">
                </div>
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
                    const title = document.getElementById("sched-title").value.trim();
                    if (!title) return toast("Judul wajib diisi!", "error");

                    const payload = {
                        title,
                        description: document.getElementById("sched-desc").value.trim(),
                        date: document.getElementById("sched-d").value || toISODate(),
                        startTime: document.getElementById("sched-start").value || "09:00",
                        endTime: document.getElementById("sched-end").value || "10:00",
                        icon: document.getElementById("sched-icon").value,
                        categoryId: document.getElementById("sched-cat").value || null
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
                        paintScheduleList(page, payload.date);
                    }
                }
            }
        ]
    });
}

/**
 * Modal tambah todo di dalam group.
 *
 * @param {string} scheduleId - ID schedule.
 * @param {string} groupId - ID group.
 * @param {string} date - Tanggal paint ulang.
 * @param {HTMLElement} container - Container paint ulang.
 */
function openGroupTodoModal(scheduleId, groupId, date, container) {
    const categories = getCategories();

    openModal("＋ Todo di Group", `
        <form id="gtd-form">
            <div class="field">
                <label for="gtd-title">Judul *</label>
                <input class="input" id="gtd-title" required placeholder="Mis. Prepare shoes">
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
                    const title = document.getElementById("gtd-title").value.trim();
                    if (!title) return toast("Judul wajib!", "error");
                    addTodo({
                        title,
                        date,
                        priority: document.getElementById("gtd-prio").value,
                        categoryId: document.getElementById("gtd-cat").value || null,
                        scheduleId,
                        groupId
                    });
                    closeModal();
                    toast("Todo masuk group 📌", "success");
                    paintScheduleList(container, date);
                }
            }
        ]
    });
}

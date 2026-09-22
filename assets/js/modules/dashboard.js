/**
 * Dashboard — greeting, quote, progress, schedule, hydration, quick todo.
 */
import { getState, filterTodos, getSchedulesByDate, addTodo, getHydration, addWater } from "../store.js";
import {
    getGreeting,
    formatDateLong,
    toISODate,
    escapeHtml,
    calcProgress,
    getTimePeriod,
    formatClock
} from "../helpers.js";
import { getDailyQuote, loadQuotes, quoteCardHtml } from "./quote.js";
import { openTodoModal, paintTodoList } from "./todo.js";
import { openScheduleModal } from "./schedule.js";
import { openModal, closeModal } from "../components/modal.js";
import { toast } from "../components/ui.js";
import { navigate } from "../router.js";
import { hydrationConfig } from "../config.js";

/** @type {number|null} Interval live clock dashboard. */
let clockTimer = null;

/**
 * Hentikan live clock dashboard.
 */
function stopDashboardClock() {
    if (clockTimer !== null) {
        clearInterval(clockTimer);
        clockTimer = null;
    }
}

/**
 * Mulai live clock: jam HH:MM:SS + label pagi/siang/sore/malam.
 *
 * @param {HTMLElement} container - Page content.
 */
function startDashboardClock(container) {
    stopDashboardClock();

    const tick = () => {
        const now = new Date();
        const period = getTimePeriod(now);
        const timeEl = container.querySelector("#dash-clock-time");
        const periodEl = container.querySelector("#dash-clock-period");
        const greetEl = container.querySelector("#dash-greet-line");
        const user = getState().currentUser;

        if (timeEl) timeEl.textContent = formatClock(now);
        if (periodEl) {
            periodEl.innerHTML = `<span class="period-icon" aria-hidden="true">${period.icon}</span> ${period.label}`;
            periodEl.dataset.period = period.id;
        }
        if (greetEl) {
            greetEl.innerHTML = `${getGreeting(now)}, ${escapeHtml(user ? user.name : "Friend")}! ${user && user.id === "arif" ? "💙" : "💗"}`;
        }

        // Auto stop jika sudah pindah halaman
        if (!container.querySelector("#dash-clock-time")) {
            stopDashboardClock();
        }
    };

    tick();
    clockTimer = setInterval(tick, 1000);
}

/**
 * Render halaman Dashboard.
 *
 * @param {HTMLElement} container - Page content.
 */
export async function renderDashboard(container) {
    const state = getState();
    const user = state.currentUser;
    const today = toISODate();
    const todosToday = filterTodos({ date: today });
    const progress = calcProgress(todosToday);
    const schedules = getSchedulesByDate(today);
    const hydration = getHydration();
    const quote = await getDailyQuote(await loadQuotes());
    const now = new Date();
    const period = getTimePeriod(now);

    container.innerHTML = `
        <div class="page-enter">
            <section class="dash-greeting">
                <div class="g-top">
                    <div class="g-day">${new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now)}</div>
                    <div class="dash-clock" id="dash-clock" aria-live="off">
                        <div class="dash-clock-time pixel-font" id="dash-clock-time">${formatClock(now)}</div>
                        <div class="dash-clock-period" id="dash-clock-period" data-period="${period.id}">
                            <span class="period-icon" aria-hidden="true">${period.icon}</span> ${period.label}
                        </div>
                    </div>
                </div>
                <h1 id="dash-greet-line">${getGreeting(now)}, ${escapeHtml(user ? user.name : "Friend")}! ${user && user.id === "arif" ? "💙" : "💗"}</h1>
                <div class="g-date">${formatDateLong()}</div>
            </section>

            <div class="dash-grid">
                <div class="card hoverable span-full" id="dash-quote-card">
                    <div class="card-header">
                        <div class="card-title">💬 Quote of the Day</div>
                        <button type="button" class="btn btn-sm btn-ghost" id="dash-refresh-quote">🎲</button>
                    </div>
                    ${quoteCardHtml(quote)}
                </div>

                <div class="card hoverable">
                    <div class="card-header">
                        <div class="card-title">📊 Today's Progress</div>
                        <span class="badge ${progress.percent === 100 && progress.total > 0 ? "success" : "pink"}">${progress.percent}%</span>
                    </div>
                    <div class="progress" role="progressbar" aria-valuenow="${progress.percent}">
                        <div class="progress-bar" style="width:${progress.percent}%"></div>
                    </div>
                    <div class="progress-meta">
                        <span>${progress.done} / ${progress.total} tasks</span>
                        <span>${progress.pending} pending</span>
                    </div>

                    <div class="dash-section-title" style="margin-top:1.1rem">
                        <span>📋 Quick Todo</span>
                        <button type="button" class="btn btn-sm btn-primary" id="dash-add-todo">＋</button>
                    </div>
                    <div class="todo-stack" id="dash-todo-list"></div>
                    <form class="quick-add-row" id="dash-quick-form">
                        <input class="input" id="dash-quick-input" placeholder="Quick add todo…" maxlength="120" aria-label="Quick add todo">
                        <button type="submit" class="btn btn-primary">＋</button>
                    </form>
                    <button type="button" class="btn btn-sm btn-ghost btn-block" style="margin-top:0.6rem" data-goto="/todo">
                        Lihat semua todo →
                    </button>
                </div>

                <div class="card hoverable">
                    <div class="card-header">
                        <div class="card-title">📅 Today's Schedule</div>
                        <button type="button" class="btn btn-sm btn-secondary" id="dash-add-sched">＋</button>
                    </div>
                    <div id="dash-schedules">
                        ${
                        schedules.length
                            ? schedules
                                .map(
                                    (s) => `
                                <div class="upcoming-item">
                                    <span class="u-time">${s.startTime}</span>
                                    <span>${s.icon || "📅"} ${escapeHtml(s.title)}</span>
                                </div>
                            `
                                )
                                .join("")
                            : `<div class="empty-state" style="padding:1.2rem">
                                    <div class="empty-icon" style="font-size:2rem">🗓️</div>
                                    <p>Belum ada jadwal hari ini.</p>
                                </div>`
                    }
                    </div>
                    <button type="button" class="btn btn-sm btn-ghost btn-block" style="margin-top:0.5rem" data-goto="/schedule">
                        Kelola schedule →
                    </button>
                </div>

                <div class="card hoverable">
                    <div class="card-header">
                        <div class="card-title">💧 Daily Hydration</div>
                        <span class="badge blue">${hydration.count}/${hydration.goal || hydrationConfig.dailyGoal}</span>
                    </div>
                    <p class="hydro-stat">${hydration.count} / ${hydration.goal || hydrationConfig.dailyGoal} glasses</p>
                    <div class="progress">
                        <div class="progress-bar" style="width:${Math.min(100, Math.round((hydration.count / (hydration.goal || hydrationConfig.dailyGoal)) * 100))}%"></div>
                    </div>
                    <div style="display:flex;gap:0.5rem;margin-top:0.9rem;justify-content:center;flex-wrap:wrap">
                        <button type="button" class="btn btn-primary btn-sm" id="dash-water">💧 + Water</button>
                        <button type="button" class="btn btn-ghost btn-sm" data-goto="/hydration">Buka hydration →</button>
                    </div>
                </div>

                <div class="card hoverable">
                    <div class="card-header">
                        <div class="card-title">📈 Quick Stats</div>
                    </div>
                    <div class="stat-grid">
                        <div class="stat-box" style="animation-delay:.05s">
                            <div class="stat-icon">✅</div>
                            <div class="stat-value">${progress.done}</div>
                            <div class="stat-label">Done</div>
                        </div>
                        <div class="stat-box" style="animation-delay:.1s">
                            <div class="stat-icon">⏳</div>
                            <div class="stat-value">${progress.pending}</div>
                            <div class="stat-label">Pending</div>
                        </div>
                        <div class="stat-box" style="animation-delay:.15s">
                            <div class="stat-icon">📅</div>
                            <div class="stat-value">${schedules.length}</div>
                            <div class="stat-label">Schedules</div>
                        </div>
                        <div class="stat-box" style="animation-delay:.2s">
                            <div class="stat-icon">🎯</div>
                            <div class="stat-value">${state.categories.filter((c) => c.active !== false).length}</div>
                            <div class="stat-label">Activities</div>
                        </div>
                    </div>
                    <button type="button" class="btn btn-sm btn-secondary btn-block" style="margin-top:0.9rem" data-goto="/statistics">
                        📊 Buka statistik lengkap
                    </button>
                </div>
            </div>
        </div>
    `;

    paintDashboardTodos(container);
    startDashboardClock(container);

    container.querySelector("#dash-add-todo")?.addEventListener("click", () => openTodoModal());
    container.querySelector("#dash-add-sched")?.addEventListener("click", () => openScheduleModal(null, today));

    container.querySelector("#dash-quick-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = container.querySelector("#dash-quick-input");
        const title = input.value.trim();
        if (!title) return;
        addTodo({ title, date: today });
        input.value = "";
        toast("Todo ditambahkan 🎀", "success");
        paintDashboardTodos(container);
    });

    container.querySelector("#dash-water")?.addEventListener("click", () => {
        const h = addWater();
        toast(`💧 ${h.count}/${h.goal} gelas — keep going!`, "success", 1500);
        const badge = container.querySelector(".badge.blue");
        if (badge) badge.textContent = `${h.count}/${h.goal}`;
        const stat = container.querySelector(".hydro-stat");
        if (stat) stat.textContent = `${h.count} / ${h.goal} glasses`;
        const bars = container.querySelectorAll(".card .progress-bar");
        if (bars.length) bars[bars.length - 1].style.width = `${Math.min(100, Math.round((h.count / h.goal) * 100))}%`;
    });

    container.querySelector("#dash-refresh-quote")?.addEventListener("click", async () => {
        const list = await loadQuotes();
        const random = list[Math.floor(Math.random() * list.length)];
        const card = container.querySelector("#dash-quote-card .quote-card");
        if (card) {
            card.style.animation = "none";
            void card.offsetWidth;
            card.style.animation = "pop-in .35s ease";
            card.querySelector(".quote-text").textContent = `"${random.text}"`;
            card.querySelector(".quote-author").textContent = `— ${random.author}`;
        }
    });

    container.querySelectorAll("[data-goto]").forEach((btn) => {
        btn.addEventListener("click", () => navigate(btn.dataset.goto));
    });
}

/**
 * Paint daftar todo hari ini di dashboard.
 *
 * @param {HTMLElement} container - Page content.
 */
function paintDashboardTodos(container) {
    const listEl = container.querySelector("#dash-todo-list");
    if (!listEl) return;

    const today = toISODate();
    const todos = filterTodos({ date: today }).slice(0, 6);

    if (!todos.length) {
        listEl.innerHTML = `<p class="text-muted" style="font-size:0.88rem;font-weight:700">Belum ada todo hari ini ✨</p>`;
        return;
    }

    listEl.innerHTML = todos
        .map(
            (t) => `
        <div class="todo-item ${t.status === "done" ? "done" : ""}" style="box-shadow:2px 2px 0 var(--ink)">
            <input type="checkbox" class="todo-check" ${t.status === "done" ? "checked" : ""} data-dash-toggle="${t.id}"
                aria-label="${escapeHtml(t.title)}">
            <div class="todo-body">
                <div class="todo-title" style="font-size:0.92rem">${escapeHtml(t.title)}</div>
            </div>
        </div>
    `
        )
        .join("");

    listEl.querySelectorAll("[data-dash-toggle]").forEach((cb) => {
        cb.addEventListener("change", async () => {
            const { toggleTodo } = await import("../store.js");
            toggleTodo(cb.dataset.dashToggle);
            const item = cb.closest(".todo-item");
            if (item) item.classList.toggle("done", cb.checked);
            if (cb.checked) toast("Completed! 🎉", "success", 1400);
            setTimeout(() => paintDashboardTodos(container), 400);
        });
    });
}

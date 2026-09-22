/**
 * Calendar module — grid bulanan + marking schedule + pilih tanggal.
 */
import { getSchedules, getSchedulesByDate, getCategory } from "../store.js";
import { toISODate, escapeHtml } from "../helpers.js";
import { openScheduleModal, paintScheduleList } from "./schedule.js";
import { navigate } from "../router.js";

const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];
const DOW = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

let viewYear;
let viewMonth;
let selectedDate;

/**
 * Render halaman Calendar.
 *
 * @param {HTMLElement} container - Page content.
 */
export function renderCalendarPage(container) {
    const today = new Date();
    viewYear = today.getFullYear();
    viewMonth = today.getMonth();
    selectedDate = toISODate(today);

    container.innerHTML = `
        <div class="page-enter">
            <div class="page-header">
                <div>
                    <h1>🗓️ Calendar</h1>
                    <p class="page-desc">Klik tanggal untuk lihat / buat schedule</p>
                </div>
                <button type="button" class="btn btn-primary" id="cal-add-sched">＋ Schedule</button>
            </div>

            <div class="calendar" id="calendar"></div>

            <div class="dash-section-title" style="margin-top:1.3rem">
                <span id="cal-selected-label">📅 Jadwal tanggal terpilih</span>
                <span class="badge pink" id="cal-count">0</span>
            </div>
            <div class="schedule-list stagger" id="cal-schedule-list"></div>
        </div>
    `;

    container.querySelector("#cal-add-sched")?.addEventListener("click", () => openScheduleModal(null, selectedDate));
    paintCalendar(container);
    paintSelectedSchedules(container);
}

/**
 * Paint grid calendar + markers.
 *
 * @param {HTMLElement} container - Page content.
 */
export function paintCalendar(container) {
    const cal = container.querySelector("#calendar");
    if (!cal) return;

    const schedules = getSchedules();

    const first = new Date(viewYear, viewMonth, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysPrev = new Date(viewYear, viewMonth, 0).getDate();

    let cells = "";

    // Previous month trailing
    for (let i = startDow - 1; i >= 0; i--) {
        const day = daysPrev - i;
        cells += `<div class="calendar-day other-month" aria-hidden="true">${day}</div>`;
    }

    // Current month
    const todayISO = toISODate();
    for (let d = 1; d <= daysInMonth; d++) {
        const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const daySched = schedules.filter((s) => s.date === iso);
        const markers = daySched
            .slice(0, 3)
            .map((s) => {
                const cat = s.categoryId ? getCategory(s.categoryId) : null;
                const color = cat ? cat.color : "var(--primary)";
                return `<span class="marker" style="background:${color}"></span>`;
            })
            .join("");

        const classes = [
            "calendar-day",
            iso === todayISO ? "today" : "",
            iso === selectedDate ? "selected" : ""
        ]
            .filter(Boolean)
            .join(" ");

        cells += `
            <button type="button" class="${classes}" data-date="${iso}"
                aria-label="${d} ${MONTHS[viewMonth]} ${viewYear}, ${daySched.length} jadwal"
                ${daySched.length ? `title="${daySched.length} jadwal"` : ""}>
                <span>${d}</span>
                <span class="markers">${markers}</span>
                ${daySched.length ? `<span class="count-badge">${daySched.length}</span>` : ""}
            </button>
        `;
    }

    // Next month leading
    const totalCells = startDow + daysInMonth;
    const remainder = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remainder; i++) {
        cells += `<div class="calendar-day other-month" aria-hidden="true">${i}</div>`;
    }

    cal.innerHTML = `
        <div class="calendar-head">
            <button type="button" class="btn btn-sm btn-icon" id="cal-prev" aria-label="Bulan sebelumnya">‹</button>
            <div class="calendar-title">${MONTHS[viewMonth]} ${viewYear}</div>
            <button type="button" class="btn btn-sm btn-icon" id="cal-next" aria-label="Bulan berikutnya">›</button>
        </div>
        <div class="calendar-grid">
            ${DOW.map((d) => `<div class="calendar-dow">${d}</div>`).join("")}
            ${cells}
        </div>
        <div class="chart-legend" style="margin-top:0.8rem">
            <span><i style="background:var(--primary)"></i> Aktivitas</span>
            <span><i style="background:var(--secondary-light)"></i> Hari ini</span>
            <span class="badge danger">angka = jumlah jadwal</span>
        </div>
    `;

    cal.querySelector("#cal-prev")?.addEventListener("click", () => {
        viewMonth--;
        if (viewMonth < 0) { viewMonth = 11; viewYear--; }
        paintCalendar(container);
    });

    cal.querySelector("#cal-next")?.addEventListener("click", () => {
        viewMonth++;
        if (viewMonth > 11) { viewMonth = 0; viewYear++; }
        paintCalendar(container);
    });

    cal.querySelectorAll("[data-date]").forEach((btn) => {
        btn.addEventListener("click", () => {
            selectedDate = btn.dataset.date;
            paintCalendar(container);
            paintSelectedSchedules(container);
        });
    });
}

/**
 * Paint schedule pada tanggal terpilih.
 * Menggunakan adapter agar bisa memakai paintScheduleList milik schedule module.
 *
 * @param {HTMLElement} container - Page content.
 */
function paintSelectedSchedules(container) {
    const listEl = container.querySelector("#cal-schedule-list");
    const label = container.querySelector("#cal-selected-label");
    const count = container.querySelector("#cal-count");
    if (!listEl) return;

    const pretty = new Intl.DateTimeFormat("id-ID", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
    }).format(new Date(selectedDate + "T00:00:00"));

    if (label) label.textContent = `📅 ${pretty}`;
    const schedules = getSchedulesByDate(selectedDate);
    if (count) count.textContent = `${schedules.length} jadwal`;

    listEl.innerHTML = `<div class="schedule-list stagger" id="schedule-list"></div>`;
    const holder = listEl.querySelector("#schedule-list");

    const adapter = {
        querySelector: (sel) => (sel === "#schedule-list" ? holder : null)
    };

    if (!schedules.length) {
        holder.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📆</div>
                <h3>Tidak ada jadwal</h3>
                <p>Buat schedule untuk tanggal ini?</p>
                <button type="button" class="btn btn-primary" id="cal-empty-add">＋ Add Schedule</button>
            </div>
        `;
        holder.querySelector("#cal-empty-add")?.addEventListener("click", () => openScheduleModal(null, selectedDate));
        return;
    }

    paintScheduleList(adapter, selectedDate);
}

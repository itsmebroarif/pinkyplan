/**
 * Calendar module — grid bulanan interaktif + marking schedule + layout rapi di mobile & desktop.
 */
import { getSchedules, getSchedulesByDate, getCategory } from "../store.js";
import { toISODate, escapeHtml, formatDateLong, formatDateShort } from "../helpers.js";
import { openScheduleModal, paintScheduleList } from "./schedule.js";

const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];
const DOW = [
    { label: "Min", full: "Minggu", isWeekend: true },
    { label: "Sen", full: "Senin", isWeekend: false },
    { label: "Sel", full: "Selasa", isWeekend: false },
    { label: "Rab", full: "Rabu", isWeekend: false },
    { label: "Kam", full: "Kamis", isWeekend: false },
    { label: "Jum", full: "Jumat", isWeekend: false },
    { label: "Sab", full: "Sabtu", isWeekend: true }
];

let viewYear;
let viewMonth;
let selectedDate;

/**
 * Render halaman Calendar dengan layout desktop (2 kolom berdampingan) dan mobile (vertikal rapi).
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
            <div class="page-header" style="margin-bottom:1rem">
                <div>
                    <h1>🗓️ Calendar Planner</h1>
                    <p class="page-desc">Kelola dan telusuri agenda harian secara visual</p>
                </div>
                <div style="display:flex;gap:0.5rem;align-items:center">
                    <button type="button" class="btn btn-ghost btn-sm" id="cal-today-btn">
                        📍 Hari Ini
                    </button>
                    <button type="button" class="btn btn-primary" id="cal-add-sched">
                        ＋ Schedule
                    </button>
                </div>
            </div>

            <!-- Responsive 2-column on desktop, single-column on mobile -->
            <div class="calendar-layout" id="calendar-layout">
                <div class="calendar-main-col">
                    <div class="calendar card" id="calendar"></div>
                </div>

                <div class="calendar-agenda-col" id="calendar-agenda-section">
                    <div class="card soft calendar-agenda-card">
                        <div class="agenda-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;padding-bottom:0.75rem;border-bottom:2px dashed var(--border-color,#ffd1dc);margin-bottom:0.85rem">
                            <div>
                                <h3 id="cal-selected-label" style="margin:0;font-size:1.05rem;font-weight:900">
                                    📅 Jadwal Tanggal Terpilih
                                </h3>
                                <div id="cal-sub-label" style="font-size:0.78rem;font-weight:700;color:var(--text-muted);margin-top:0.2rem"></div>
                            </div>
                            <div style="display:flex;align-items:center;gap:0.4rem">
                                <span class="badge pink" id="cal-count">0 jadwal</span>
                                <button type="button" class="btn btn-sm btn-secondary" id="cal-side-add-btn">
                                    ＋ Tambah
                                </button>
                            </div>
                        </div>

                        <div class="schedule-list stagger" id="cal-schedule-list"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.querySelector("#cal-today-btn")?.addEventListener("click", () => {
        const now = new Date();
        viewYear = now.getFullYear();
        viewMonth = now.getMonth();
        selectedDate = toISODate(now);
        paintCalendar(container);
        paintSelectedSchedules(container);
    });

    container.querySelector("#cal-add-sched")?.addEventListener("click", () => {
        openScheduleModal(null, selectedDate);
    });

    container.querySelector("#cal-side-add-btn")?.addEventListener("click", () => {
        openScheduleModal(null, selectedDate);
    });

    paintCalendar(container);
    paintSelectedSchedules(container);
}

/**
 * Paint grid calendar + markers & badges.
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

    // Previous month trailing cells
    for (let i = startDow - 1; i >= 0; i--) {
        const day = daysPrev - i;
        cells += `<div class="calendar-day other-month" aria-hidden="true"><span class="day-num">${day}</span></div>`;
    }

    // Current month cells
    const todayISO = toISODate();
    for (let d = 1; d <= daysInMonth; d++) {
        const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        
        // Cek schedules yang aktif pada hari ini (termasuk multi-day range)
        const daySched = schedules.filter((s) => {
            if (s.date === iso) return true;
            if (s.endDate && s.date <= iso && iso <= s.endDate) return true;
            return false;
        });

        const isToday = iso === todayISO;
        const isSelected = iso === selectedDate;

        const markers = daySched
            .slice(0, 3)
            .map((s) => {
                const cat = s.categoryId ? getCategory(s.categoryId) : null;
                const color = cat ? cat.color : "var(--primary)";
                return `<span class="marker" style="background:${color}" title="${escapeHtml(s.title)}"></span>`;
            })
            .join("");

        const classes = [
            "calendar-day",
            isToday ? "today" : "",
            isSelected ? "selected" : "",
            daySched.length ? "has-events" : ""
        ]
            .filter(Boolean)
            .join(" ");

        cells += `
            <button type="button" class="${classes}" data-date="${iso}"
                aria-label="${d} ${MONTHS[viewMonth]} ${viewYear}, ${daySched.length} jadwal"
                ${daySched.length ? `title="${daySched.length} jadwal pada ${d} ${MONTHS[viewMonth]}"` : ""}>
                <div class="day-header">
                    <span class="day-num">${d}</span>
                    ${daySched.length ? `<span class="day-badge">${daySched.length}</span>` : ""}
                </div>
                ${isToday && !isSelected ? `<span class="today-sparkle" title="Hari ini">✦</span>` : ""}
                <div class="day-markers">${markers}</div>
            </button>
        `;
    }

    // Next month leading cells
    const totalCells = startDow + daysInMonth;
    const remainder = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remainder; i++) {
        cells += `<div class="calendar-day other-month" aria-hidden="true"><span class="day-num">${i}</span></div>`;
    }

    cal.innerHTML = `
        <div class="calendar-head">
            <button type="button" class="btn btn-sm btn-icon" id="cal-prev" aria-label="Bulan sebelumnya">◀</button>
            <div class="calendar-title-wrap">
                <span class="calendar-title">${MONTHS[viewMonth]} ${viewYear}</span>
            </div>
            <button type="button" class="btn btn-sm btn-icon" id="cal-next" aria-label="Bulan berikutnya">▶</button>
        </div>

        <div class="calendar-grid">
            ${DOW.map((d) => `<div class="calendar-dow ${d.isWeekend ? "weekend" : ""}">${d.label}</div>`).join("")}
            ${cells}
        </div>

        <div class="calendar-legend" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-top:1rem;padding-top:0.75rem;border-top:1px dashed var(--border-color,#ffd1dc);font-size:0.75rem">
            <div style="display:flex;gap:0.75rem;align-items:center">
                <span style="display:inline-flex;align-items:center;gap:0.3rem">
                    <span class="legend-swatch today"></span> Hari ini
                </span>
                <span style="display:inline-flex;align-items:center;gap:0.3rem">
                    <span class="legend-swatch selected"></span> Terpilih
                </span>
                <span style="display:inline-flex;align-items:center;gap:0.3rem">
                    <span class="legend-swatch dot"></span> Ada Jadwal
                </span>
            </div>
            <span class="text-muted" style="font-size:0.72rem;font-weight:700">
                Klik tanggal untuk melihat jadwal
            </span>
        </div>
    `;

    cal.querySelector("#cal-prev")?.addEventListener("click", () => {
        viewMonth--;
        if (viewMonth < 0) {
            viewMonth = 11;
            viewYear--;
        }
        paintCalendar(container);
    });

    cal.querySelector("#cal-next")?.addEventListener("click", () => {
        viewMonth++;
        if (viewMonth > 11) {
            viewMonth = 0;
            viewYear++;
        }
        paintCalendar(container);
    });

    cal.querySelectorAll("[data-date]").forEach((btn) => {
        btn.addEventListener("click", () => {
            selectedDate = btn.dataset.date;
            paintCalendar(container);
            paintSelectedSchedules(container);

            // On mobile view, scroll gently to agenda section if off-screen
            if (window.innerWidth < 1024) {
                const agendaSec = container.querySelector("#calendar-agenda-section");
                agendaSec?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
        });
    });
}

/**
 * Paint schedule pada tanggal terpilih di panel agenda calendar.
 *
 * @param {HTMLElement} container - Page content.
 */
function paintSelectedSchedules(container) {
    const listEl = container.querySelector("#cal-schedule-list");
    const label = container.querySelector("#cal-selected-label");
    const subLabel = container.querySelector("#cal-sub-label");
    const count = container.querySelector("#cal-count");
    if (!listEl) return;

    const todayISO = toISODate();
    const isToday = selectedDate === todayISO;
    const dateObj = new Date(selectedDate + "T00:00:00");

    const pretty = new Intl.DateTimeFormat("id-ID", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
    }).format(dateObj);

    if (label) {
        label.innerHTML = `📅 ${pretty} ${isToday ? `<span class="badge" style="background:var(--secondary);color:#fff;font-size:0.65rem;margin-left:0.3rem">Hari Ini ✨</span>` : ""}`;
    }

    const schedules = getSchedulesByDate(selectedDate);
    if (count) count.textContent = `${schedules.length} jadwal`;
    if (subLabel) {
        subLabel.textContent = schedules.length
            ? `${schedules.length} jadwal dijadwalkan pada hari ini`
            : "Tidak ada agenda kegiatan";
    }

    listEl.innerHTML = `<div class="schedule-list stagger" id="schedule-list"></div>`;
    const holder = listEl.querySelector("#schedule-list");

    const adapter = {
        querySelector: (sel) => (sel === "#schedule-list" ? holder : null)
    };

    if (!schedules.length) {
        holder.innerHTML = `
            <div class="empty-state" style="padding:1.5rem 1rem">
                <div class="empty-icon">📆</div>
                <h3>Tidak ada jadwal</h3>
                <p>Belum ada jadwal untuk ${formatDateShort(selectedDate)}. Mau menambahkan kegiatan?</p>
                <button type="button" class="btn btn-primary btn-sm" id="cal-empty-add">＋ Add Schedule</button>
            </div>
        `;
        holder.querySelector("#cal-empty-add")?.addEventListener("click", () => {
            openScheduleModal(null, selectedDate);
        });
        return;
    }

    paintScheduleList(adapter, selectedDate, selectedDate);
}

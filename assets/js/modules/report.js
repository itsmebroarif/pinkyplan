/**
 * Report module — ringkasan produktivitas harian → kirim via WhatsApp.
 * Nomor tujuan mengikuti user login (lihat reportConfig di config.js).
 */
import { getState, filterTodos, getSchedulesByDate, getHydration, getHabits, getMealsByDate, getTodos, getSchedules, getCategories, getStatsHistory, getPomodoroStats } from "../store.js";
import { toISODate, calcProgress, formatDateLong, escapeHtml } from "../helpers.js";
import { reportConfig } from "../config.js";
import { toast } from "../components/ui.js";

/**
 * Normalisasi nomor Indonesia ke format internasional 62…
 *
 * @param {string} phone - Nomor mentah (08… / +62… / 62…).
 * @returns {string} Nomor format wa.me.
 */
export function normalizePhone(phone) {
    let p = String(phone || "").replace(/[^\d+]/g, "");
    if (p.startsWith("+")) p = p.slice(1);
    if (p.startsWith("0")) p = "62" + p.slice(1);
    if (p.startsWith("8")) p = "62" + p;
    return p;
}

/**
 * Ambil konfigurasi nomor tujuan berdasarkan user aktif.
 *
 * @returns {{phone:string, label:string}}
 */
export function getReportTarget() {
    const user = getState().currentUser;
    if (user && user.id === "arum") return reportConfig.arum;
    if (user && user.id === "arif") return reportConfig.arif;
    return reportConfig.default;
}

/**
 * Bangun teks summary report (plain text, aman untuk WhatsApp).
 *
 * @param {Date} [date=new Date()] - Tanggal laporan.
 * @returns {string} Isi laporan.
 */
export function buildSummaryReport(date = new Date()) {
    const iso = toISODate(date);
    const user = getState().currentUser;
    const name = user ? user.name : "Guest";
    const todos = getTodos();
    const todayTodos = filterTodos({ date: iso });
    const progress = calcProgress(todayTodos);
    const overdue = todos.filter((t) => t.status === "pending" && t.date < iso).length;
    const schedules = getSchedulesByDate(iso);
    const hydration = getHydration();
    const habits = getHabits();
    const habitsDone = habits.filter((h) => h.isCompletedToday).length;
    const meals = getMealsByDate(iso);
    const pomo = getPomodoroStats();
    const history = getStatsHistory();
    const todayStat = history[iso] || { completed: 0, water: 0 };
    const categories = getCategories();
    const totalSchedules = getSchedules().length;

    const lines = [
        "📊 *PinkyPlan — Summary Report*",
        "━━━━━━━━━━━━━━━━",
        `👤 User: ${name}`,
        `📅 Tanggal: ${formatDateLong(date)}`,
        `Jam: ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`,
        "",
        "✅ *Todo Hari Ini*",
        `• Total: ${progress.total}`,
        `• Selesai: ${progress.done}`,
        `• Pending: ${progress.pending}`,
        `• Progress: ${progress.percent}%`,
        `• Overdue (semua): ${overdue}`,
        "",
        "📅 *Schedule Hari Ini*",
        schedules.length
            ? schedules.map((s) => `• ${s.icon || "📅"} ${s.startTime}–${s.endTime} ${s.title}`).join("\n")
            : "• Tidak ada jadwal",
        "",
        "💧 *Hydration*",
        `• ${hydration.count}/${hydration.goal} gelas`,
        "",
        "🌱 *Habits*",
        `• Selesai hari ini: ${habitsDone}/${habits.length}`,
        habits.length
            ? habits.map((h) => `• ${h.isCompletedToday ? "✅" : "⬜"} ${h.icon || "🌱"} ${h.name}${h.currentStreak ? ` (streak ${h.currentStreak})` : ""}`).join("\n")
            : "• Belum ada habit",
        "",
        "🍽️ *Meals*",
        meals.length
            ? meals.map((m) => `• ${m.time || "--:--"} ${m.name}`).join("\n")
            : "• Belum ada meal tercatat",
        "",
        "🍅 *Pomodoro*",
        `• Sesi selesai hari ini: ${pomo.completedToday || 0}`,
        "",
        "📦 *Total Data*",
        `• Todos: ${todos.length} · Schedules: ${totalSchedules} · Kategori: ${categories.length}`,
        `• Task selesai (histori hari ini): ${todayStat.completed}`,
        "",
        "━━━━━━━━━━━━━━━━",
        "Dikirim dari PinkyPlan 🎀"
    ];

    return lines.join("\n");
}

/**
 * Buka WhatsApp dengan summary report ke nomor tujuan user login.
 *
 * @param {Date} [date] - Tanggal laporan opsional.
 * @returns {boolean} true bila URL berhasil dibuka.
 */
export function sendSummaryReport(date = new Date()) {
    const target = getReportTarget();
    const text = buildSummaryReport(date);
    const phone = normalizePhone(target.phone);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

    try {
        window.open(url, "_blank", "noopener,noreferrer");
        toast(`Membuka WhatsApp → ${target.label} (${target.phone})`, "success");
        return true;
    } catch {
        toast("Gagal membuka WhatsApp", "error");
        return false;
    }
}

/**
 * HTML tombol Send Summary Report (untuk dipasang di halaman).
 *
 * @param {Object} [opts] - Opsi tampilan.
 * @param {string} [opts.className] - Class tambahan.
 * @param {string} [opts.label] - Label tombol.
 * @returns {string} HTML string.
 */
export function reportButtonHtml(opts = {}) {
    const target = getReportTarget();
    const cls = opts.className || "btn btn-primary";
    const label = opts.label || "📤 Send Summary Report";
    return `
        <button type="button" class="${cls}" id="send-report-btn" title="Kirim ringkasan ke ${escapeHtml(target.label)} (${escapeHtml(target.phone)})">
            ${label}
        </button>
        <span class="text-muted" style="font-size:0.75rem;display:block;margin-top:0.35rem">
            ➜ ${escapeHtml(target.label)} · ${escapeHtml(target.phone)}
        </span>
    `;
}

/**
 * Pasang click handler tombol report pada container.
 *
 * @param {HTMLElement} container - Parent element.
 */
export function bindReportButton(container) {
    const btn = container?.querySelector("#send-report-btn");
    if (!btn) return;
    btn.addEventListener("click", () => sendSummaryReport());
}

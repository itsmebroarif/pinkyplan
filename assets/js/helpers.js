/**
 * Helper functions utilitas — pure function tanpa side effect.
 */

/**
 * Membuat ID unik sederhana.
 *
 * @param {string} [prefix="ID"] - Prefix ID.
 * @returns {string} ID unik.
 */
export function uid(prefix = "ID") {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Escape HTML untuk mencegah XSS saat render innerHTML.
 *
 * @param {string} str - String mentah.
 * @returns {string} String aman.
 */
export function escapeHtml(str = "") {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Format tanggal panjang (Bahasa Indonesia).
 *
 * @param {Date|string} [date=new Date()] - Tanggal.
 * @returns {string} Contoh: "Rabu, 23 September 2026".
 */
export function formatDateLong(date = new Date()) {
    return new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(new Date(date));
}

/**
 * Format tanggal pendek.
 *
 * @param {Date|string} date - Tanggal.
 * @returns {string} Contoh: "23 Sep 2026".
 */
export function formatDateShort(date) {
    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(new Date(date));
}

/**
 * Mendapatkan tanggal ISO (YYYY-MM-DD) — zona lokal.
 *
 * @param {Date} [date=new Date()] - Tanggal.
 * @returns {string} String ISO date.
 */
export function toISODate(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/**
 * Greeting berdasarkan jam.
 *
 * @param {Date} [date=new Date()] - Waktu sekarang.
 * @returns {string} Good Morning/Afternoon/Evening.
 */
export function getGreeting(date = new Date()) {
    const hour = date.getHours();
    if (hour < 11) return "Good Morning";
    if (hour < 15) return "Good Afternoon";
    if (hour < 18) return "Good Evening";
    return "Good Night";
}

/**
 * Nama periode waktu (Bahasa Indonesia) + ikon.
 *
 * pagi 04:00–10:59 · siang 11:00–14:59 · sore 15:00–18:59 · malam 19:00–03:59
 *
 * @param {Date} [date=new Date()] - Waktu sekarang.
 * @returns {{id:string, label:string, icon:string}}
 */
export function getTimePeriod(date = new Date()) {
    const h = date.getHours();
    if (h >= 4 && h < 11) return { id: "pagi", label: "Pagi", icon: "🌅" };
    if (h >= 11 && h < 15) return { id: "siang", label: "Siang", icon: "☀️" };
    if (h >= 15 && h < 19) return { id: "sore", label: "Sore", icon: "🌇" };
    return { id: "malam", label: "Malam", icon: "🌙" };
}

/**
 * Format jam digital HH:MM:SS (lokal id-ID).
 *
 * @param {Date} [date=new Date()] - Waktu sekarang.
 * @returns {string} Contoh: "14:32:05".
 */
export function formatClock(date = new Date()) {
    return new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).format(date);
}

/**
 * Merge target dengan default secara deep sederhana (1 level).
 *
 * @param {Object} defaults - Object default.
 * @param {Object} saved - Object dari storage.
 * @returns {Object} Hasil merge.
 */
export function mergeDefaults(defaults, saved) {
    return { ...defaults, ...(saved || {}) };
}

/**
 * Debounce sederhana.
 *
 * @param {Function} fn - Fungsi yang di-debounce.
 * @param {number} [ms=300] - Delay ms.
 * @returns {Function} Fungsi debounce.
 */
export function debounce(fn, ms = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

/**
 * Membuat elemen DOM dari HTML string.
 *
 * @param {string} html - Markup HTML.
 * @returns {HTMLElement} Elemen.
 */
export function el(html) {
    const tpl = document.createElement("template");
    tpl.innerHTML = html.trim();
    return tpl.content.firstElementChild;
}

/**
 * Hitung progres penyelesaian.
 *
 * @param {Array} todos - Daftar todo.
 * @returns {{total:number, done:number, pending:number, percent:number}}
 */
export function calcProgress(todos = []) {
    const total = todos.length;
    const done = todos.filter((t) => t.status === "done").length;
    const pending = total - done;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, pending, percent };
}

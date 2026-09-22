/**
 * Theme controller — Arif = biru, Arum = pink.
 * Theme diterapkan sebagai atribut data-theme pada <html>.
 */
import { userConfig } from "./config.js";
import { storage } from "./storage.js";

const THEME_COLORS = {
    pink: "#FF69B4",
    blue: "#4DA6FF"
};

/**
 * Terapkan theme berdasarkan user id.
 *
 * @param {string} userId - "arif" | "arum" | null.
 */
export function applyThemeByUser(userId) {
    const user = userConfig[userId];
    const theme = user ? user.theme : storage.get("lastTheme", "pink");
    setTheme(theme);
}

/**
 * Set theme eksplisit.
 *
 * @param {"pink"|"blue"} theme - Nama theme.
 */
export function setTheme(theme) {
    const safe = theme === "blue" ? "blue" : "pink";
    document.documentElement.setAttribute("data-theme", safe);
    storage.set("lastTheme", safe);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[safe]);
}

/**
 * Theme aktif saat ini.
 *
 * @returns {string} "pink" | "blue".
 */
export function getCurrentTheme() {
    return document.documentElement.getAttribute("data-theme") || "pink";
}

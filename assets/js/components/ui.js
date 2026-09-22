/**
 * UI feedback helpers — toast notification.
 */
import { el } from "../helpers.js";

/**
 * Tampilkan toast notifikasi.
 *
 * @param {string} message - Pesan.
 * @param {"success"|"error"|"info"} [type="info"] - Jenis toast.
 * @param {number} [duration=2800] - Durasi ms.
 */
export function toast(message, type = "info", duration = 2800) {
    const root = document.getElementById("toast-root");
    if (!root) return;

    const icons = { success: "✅", error: "⚠️", info: "🎀" };
    const node = el(`<div class="toast ${type}" role="status">${icons[type] || ""} <span>${message}</span></div>`);
    root.appendChild(node);

    setTimeout(() => {
        node.classList.add("out");
        node.addEventListener("animationend", () => node.remove(), { once: true });
    }, duration);
}

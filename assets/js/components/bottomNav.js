/**
 * Bottom navigation (mobile).
 */
import { mobileNavConfig } from "../config.js";
import { getState } from "../store.js";
import { el } from "../helpers.js";

/**
 * Render bottom navigation mobile.
 *
 * @param {Function} onAction - Handler untuk item aksi (quick-add / more-menu).
 */
export function renderBottomNav(onAction) {
    const root = document.getElementById("bottom-navigation");
    if (!root) return;

    const state = getState();
    const active = state.currentRoute;

    root.innerHTML = "";

    mobileNavConfig.forEach((item) => {
        const isAdd = item.action === "quick-add";
        const isActive = item.route && active === item.route;

        const btn = el(`
            <button type="button"
                class="bottom-nav-item ${isAdd ? "add-item" : ""} ${isActive ? "active" : ""}"
                data-nav-id="${item.id}"
                aria-label="${item.label}">
                <span class="b-icon" aria-hidden="true">${item.icon}</span>
                <span class="b-label">${item.label}</span>
            </button>
        `);

        btn.addEventListener("click", () => {
            if (item.action) {
                if (onAction) onAction(item.action, item);
                return;
            }
            import("../router.js").then((r) => r.navigate(item.route));
        });

        root.appendChild(btn);
    });
}

/**
 * FAB + Quick Add menu + More menu (mobile sheet).
 */
import { el } from "../helpers.js";
import { navigationConfig } from "../config.js";

let menuOpen = false;

/**
 * Init FAB — toggle quick menu.
 *
 * @param {Function} onAdd - Callback jenis aksi: "todo" | "schedule" | "category" | "water" | "meal".
 */
export function initFab(onAdd) {
    const fab = document.getElementById("fab");
    const quick = document.getElementById("quick-menu");
    if (!fab || !quick) return;

    const items = [
        { id: "todo", icon: "📋", label: "Add Todo" },
        { id: "schedule", icon: "📅", label: "Add Schedule" },
        { id: "habit", icon: "🌱", label: "Add Habit" },
        { id: "pomodoro", icon: "🍅", label: "Pomodoro" },
        { id: "category", icon: "🎯", label: "Add Activity" },
        { id: "water", icon: "💧", label: "Add Water" },
        { id: "meal", icon: "🍽️", label: "Add Meal" }
    ];

    quick.innerHTML = "";
    items.forEach((item) => {
        const btn = el(`
            <button type="button" class="quick-menu-item">
                <span>${item.icon}</span>
                <span>${item.label}</span>
            </button>
        `);
        btn.addEventListener("click", () => {
            toggleQuickMenu(false);
            onAdd(item.id);
        });
        quick.appendChild(btn);
    });

    fab.addEventListener("click", () => toggleQuickMenu(!menuOpen));
}

/**
 * Buka/tutup quick menu FAB.
 *
 * @param {boolean} open - State menu.
 */
export function toggleQuickMenu(open) {
    const fab = document.getElementById("fab");
    const quick = document.getElementById("quick-menu");
    if (!fab || !quick) return;
    menuOpen = open;
    quick.hidden = !open;
    fab.classList.toggle("open", open);
    fab.setAttribute("aria-expanded", String(open));
}

/**
 * Tampilkan/sembunyikan FAB (hanya setelah login).
 *
 * @param {boolean} show
 */
export function setFabVisible(show) {
    const fab = document.getElementById("fab");
    if (fab) fab.hidden = !show;
}

/**
 * Buka sheet "More" di mobile — daftar seluruh menu.
 *
 * @param {Function} onClose - Callback setelah sheet ditutup.
 */
export function openMoreMenu(onClose) {
    document.querySelector(".more-menu")?.remove();

    const overlay = el(`
        <div class="more-menu" role="dialog" aria-label="Menu lainnya">
            <div class="more-menu-sheet">
                <h3>✨ More Menu</h3>
                <div class="more-grid"></div>
            </div>
        </div>
    `);

    const grid = overlay.querySelector(".more-grid");
    navigationConfig.forEach((item) => {
        const btn = el(`
            <button type="button" class="more-item">
                <span class="m-icon" aria-hidden="true">${item.icon}</span>
                <span>${item.label}</span>
            </button>
        `);
        btn.addEventListener("click", () => {
            overlay.remove();
            import("../router.js").then((r) => r.navigate(item.route));
            if (onClose) onClose();
        });
        grid.appendChild(btn);
    });

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            overlay.remove();
            if (onClose) onClose();
        }
    });

    document.body.appendChild(overlay);
}

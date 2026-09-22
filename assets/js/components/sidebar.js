/**
 * Sidebar component (desktop ≥1024 & drawer tablet).
 */
import { navigationConfig } from "../config.js";
import { getState } from "../store.js";
import { el, escapeHtml } from "../helpers.js";

/**
 * Render sidebar navigation.
 */
export function renderSidebar() {
    const root = document.getElementById("sidebar");
    if (!root) return;

    const state = getState();
    const user = state.currentUser;
    const active = state.currentRoute;

    root.innerHTML = "";

    const brand = el(`
        <div class="sidebar-brand">
            <div class="brand-logo" aria-hidden="true">🎀</div>
            <div>
                <div class="brand-name">PinkyPlan</div>
                <div class="brand-tag">cute · retro · plan</div>
            </div>
        </div>
    `);
    root.appendChild(brand);

    const list = el(`<ul class="nav-list"></ul>`);

    navigationConfig
        .filter((n) => n.desktop !== false)
        .forEach((item) => {
            const li = el(`
                <li>
                    <a href="#${item.route}" class="nav-item ${active === item.route ? "active" : ""}" data-link>
                        <span class="nav-icon" aria-hidden="true">${item.icon}</span>
                        <span>${escapeHtml(item.label)}</span>
                    </a>
                </li>
            `);
            list.appendChild(li);
        });

    root.appendChild(list);

    const footer = el(`
        <div class="sidebar-footer">
            v1.0.0 · ${user ? escapeHtml(user.icon + " " + user.name) : "Guest"}<br>
            Netlify ready 🚀
        </div>
    `);
    root.appendChild(footer);
}

/**
 * Toggle drawer sidebar (tablet).
 */
export function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.toggle("open");
}

/**
 * Tutup drawer sidebar.
 */
export function closeSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.remove("open");
}

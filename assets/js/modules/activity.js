/**
 * Activity / Category module — CRUD category configurable.
 */
import { getCategories, addCategory, updateCategory, removeCategory, getTodos } from "../store.js";
import { escapeHtml, uid } from "../helpers.js";
import { openModal, closeModal, confirmDialog } from "../components/modal.js";
import { toast } from "../components/ui.js";

const PALETTE = ["#FF69B4", "#9B5DE5", "#4DA6FF", "#E94E9A", "#6C3BB5", "#F59E0B", "#10B981", "#F472B6"];
const ICONS = ["🏃", "🏖️", "📚", "💼", "🎮", "🧹", "💡", "🛒", "🎨", "🎵", "✈️", "🍳", "💊", "🐶", "💻", "🌱"];

/**
 * Render halaman Activity.
 *
 * @param {HTMLElement} container - Page content.
 */
export function renderActivityPage(container) {
    container.innerHTML = `
        <div class="page-enter">
            <div class="page-header">
                <div>
                    <h1>🎯 Activity & Categories</h1>
                    <p class="page-desc">Badge & kategori — configurable, tanpa ubah HTML</p>
                </div>
                <button type="button" class="btn btn-primary" id="add-cat-btn">＋ Add Activity</button>
            </div>
            <div class="activity-grid stagger" id="activity-grid"></div>
        </div>
    `;

    container.querySelector("#add-cat-btn")?.addEventListener("click", () => openCategoryModal());
    paintActivityGrid(container);
}

/**
 * Paint grid kategori.
 *
 * @param {HTMLElement} container - Page content.
 */
export function paintActivityGrid(container) {
    const grid = container.querySelector("#activity-grid");
    if (!grid) return;

    const categories = getCategories();

    if (!categories.length) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <div class="empty-icon">🏷️</div>
                <h3>Belum ada kategori</h3>
                <p>Tambahkan activity pertamamu!</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = categories
        .map((c, i) => {
            const count = getTodos().filter((t) => t.categoryId === c.id).length;
            return `
            <div class="card hoverable" style="animation:pop-in .3s ease backwards;animation-delay:${i * 0.04}s;border-top:8px solid ${c.color}">
                <div class="card-header">
                    <div class="card-title">
                        <span style="font-size:1.5rem">${c.icon}</span>
                        <span>${escapeHtml(c.name)}</span>
                    </div>
                    <span class="badge" style="background:${c.color}33">${count} todo</span>
                </div>
                <div class="chip-row">
                    <button type="button" class="btn btn-sm btn-ghost" data-edit-cat="${c.id}">✏️ Edit</button>
                    <button type="button" class="btn btn-sm btn-ghost" data-del-cat="${c.id}">🗑️ Hapus</button>
                </div>
            </div>
        `;
        })
        .join("");

    grid.querySelectorAll("[data-edit-cat]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const cat = getCategories().find((c) => c.id === btn.dataset.editCat);
            if (cat) openCategoryModal(cat);
        });
    });

    grid.querySelectorAll("[data-del-cat]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const ok = await confirmDialog("Hapus kategori ini?", { danger: true, confirmLabel: "Hapus" });
            if (ok) {
                removeCategory(btn.dataset.delCat);
                toast("Kategori dihapus 🗑️", "info");
                paintActivityGrid(container);
            }
        });
    });
}

/**
 * Modal create/edit kategori.
 *
 * @param {Object|null} cat - Kategori diedit.
 */
export function openCategoryModal(cat = null) {
    const editing = Boolean(cat);

    const body = `
        <form id="cat-form">
            <div class="field">
                <label for="cat-name">Nama *</label>
                <input class="input" id="cat-name" required maxlength="40"
                    placeholder="Mis. Coding" value="${editing ? escapeHtml(cat.name) : ""}">
            </div>
            <div class="field">
                <label>Icon</label>
                <div class="chip-row" id="cat-icons">
                    ${ICONS.map(
                    (ic) => `
                        <button type="button" class="filter-chip ${editing && cat.icon === ic ? "active" : ""}"
                            data-icon="${ic}" style="font-size:1.2rem;padding:0.35rem 0.55rem">${ic}</button>
                    `
                ).join("")}
                </div>
            </div>
            <div class="field">
                <label>Warna</label>
                <div class="chip-row" id="cat-colors">
                    ${PALETTE.map(
                    (color) => `
                        <button type="button"
                            class="filter-chip ${editing && cat.color === color ? "active" : ""}"
                            data-color="${color}"
                            style="background:${color};width:36px;height:36px;padding:0;min-height:36px"
                            aria-label="Warna ${color}"></button>
                    `
                ).join("")}
                </div>
            </div>
        </form>
    `;

    openModal(editing ? "✏️ Edit Activity" : "＋ Add Activity", body, {
        actions: [
            { label: "Batal" },
            {
                label: editing ? "Simpan" : "Tambah",
                class: "btn-primary",
                close: false,
                onClick: () => {
                    const name = document.getElementById("cat-name").value.trim();
                    if (!name) return toast("Nama wajib diisi!", "error");

                    const icon = document.querySelector("#cat-icons .active")?.dataset.icon || "🏷️";
                    const color = document.querySelector("#cat-colors .active")?.dataset.color || PALETTE[0];

                    if (editing) {
                        updateCategory(cat.id, { name, icon, color });
                        toast("Kategori diperbarui ✏️", "success");
                    } else {
                        addCategory({ id: uid("CAT"), name, icon, color });
                        toast("Kategori ditambahkan 🎯", "success");
                    }
                    closeModal();

                    const page = document.getElementById("page-content");
                    if (page) paintActivityGrid(page);
                }
            }
        ]
    });

    document.querySelectorAll("#cat-icons [data-icon]").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("#cat-icons [data-icon]").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
        });
    });

    document.querySelectorAll("#cat-colors [data-color]").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("#cat-colors [data-color]").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
        });
    });
}

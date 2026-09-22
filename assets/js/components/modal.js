/**
 * Modal system — render ke #modal-root.
 */
import { el } from "../helpers.js";

let activeOverlay = null;

/**
 * Buka modal.
 *
 * @param {string} title - Judul modal.
 * @param {string|HTMLElement} body - Konten body (HTML string atau elemen).
 * @param {{actions?: Array<{label:string, class?:string, onClick?:Function, close?:boolean}>, onClose?:Function}} [opts]
 * @returns {HTMLElement} Overlay element.
 */
export function openModal(title, body, opts = {}) {
    closeModal();

    const overlay = el(`
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="${title}">
            <div class="modal">
                <div class="modal-title">
                    <span>${title}</span>
                    <button type="button" class="modal-close" aria-label="Tutup">✕</button>
                </div>
                <div class="modal-body"></div>
                <div class="modal-actions"></div>
            </div>
        </div>
    `);

    const bodyEl = overlay.querySelector(".modal-body");
    if (typeof body === "string") bodyEl.innerHTML = body;
    else bodyEl.appendChild(body);

    const actionsEl = overlay.querySelector(".modal-actions");
    const actions = opts.actions || [{ label: "Tutup", class: "btn-primary" }];

    actions.forEach((action) => {
        const btn = el(`<button type="button" class="btn ${action.class || ""}">${action.label}</button>`);
        btn.addEventListener("click", () => {
            if (action.onClick) action.onClick();
            if (action.close !== false) closeModal();
        });
        actionsEl.appendChild(btn);
    });

    overlay.querySelector(".modal-close").addEventListener("click", () => {
        closeModal();
        if (opts.onClose) opts.onClose();
    });

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            closeModal();
            if (opts.onClose) opts.onClose();
        }
    });

    document.addEventListener("keydown", escClose);
    document.getElementById("modal-root").appendChild(overlay);
    activeOverlay = overlay;

    const firstInput = overlay.querySelector("input, select, textarea, button");
    if (firstInput) firstInput.focus();

    return overlay;
}

function escClose(e) {
    if (e.key === "Escape") closeModal();
}

/**
 * Tutup modal aktif.
 */
export function closeModal() {
    if (activeOverlay) {
        activeOverlay.remove();
        activeOverlay = null;
        document.removeEventListener("keydown", escClose);
    }
}

/**
 * Dialog konfirmasi.
 *
 * @param {string} message - Pesan.
 * @param {{title?:string, confirmLabel?:string, danger?:boolean}} [opts]
 * @returns {Promise<boolean>} true jika user memilih confirm.
 */
export function confirmDialog(message, opts = {}) {
    return new Promise((resolve) => {
        let decided = false;
        openModal(opts.title || "Konfirmasi", `<p style="font-weight:700">${message}</p>`, {
            actions: [
                {
                    label: "Batal",
                    onClick: () => {
                        decided = true;
                        resolve(false);
                    }
                },
                {
                    label: opts.confirmLabel || "Ya, lanjut",
                    class: opts.danger ? "btn-danger" : "btn-primary",
                    onClick: () => {
                        decided = true;
                        resolve(true);
                    }
                }
            ],
            onClose: () => {
                if (!decided) resolve(false);
            }
        });
    });
}

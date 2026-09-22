/**
 * Auth module — login flow: pilih Arif/Arum → PIN (Arif only) → dashboard.
 * Login hanya profile selection, bukan security authentication.
 */
import { userConfig } from "../config.js";
import { setCurrentUser, getState } from "../store.js";
import { applyThemeByUser } from "../theme.js";
import { escapeHtml } from "../helpers.js";
import { toast } from "../components/ui.js";

const root = () => document.getElementById("auth-root");

/**
 * Tampilkan layar login jika belum ada user aktif.
 *
 * @returns {boolean} true jika login ditampilkan.
 */
export function showAuthIfNeeded() {
    const state = getState();
    if (state.currentUser) {
        hideAuth();
        return false;
    }
    renderUserPicker();
    return true;
}

/**
 * Sembunyikan layar login.
 */
export function hideAuth() {
    const r = root();
    if (r) {
        r.innerHTML = "";
        r.hidden = true;
    }
}

/**
 * Render pilihan user: Arif / Arum.
 */
function renderUserPicker() {
    const r = root();
    if (!r) return;

    const arif = userConfig.arif;
    const arum = userConfig.arum;

    r.innerHTML = `
        <div class="auth-card">
            <div class="auth-logo" aria-hidden="true">🌸</div>
            <h1>Welcome to PinkyPlan</h1>
            <p class="auth-sub">Organize your day, one cute task at a time ✨</p>
            <p style="font-weight:900; margin-bottom:0.8rem">Who are you?</p>
            <div class="user-pick">
                <button type="button" class="user-pick-btn" data-user="arif">
                    <span class="u-icon">${arif.icon}</span>
                    <span>${escapeHtml(arif.name)}</span>
                    <span class="u-theme">💙 Theme biru</span>
                </button>
                <button type="button" class="user-pick-btn" data-user="arum">
                    <span class="u-icon">${arum.icon}</span>
                    <span>${escapeHtml(arum.name)}</span>
                    <span class="u-theme">💗 Theme pink</span>
                </button>
            </div>
        </div>
    `;

    // hidden dihapus SETELAH konten terisi agar overlay tampil
    r.hidden = false;

    r.querySelectorAll("[data-user]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-user");
            if (id === "arif") renderPinPad();
            else login("arum");
        });
    });
}

/**
 * Render keypad PIN untuk Arif.
 */
function renderPinPad() {
    const r = root();
    if (!r) return;

    let pin = "";
    const maxLen = userConfig.arif.pin.length;

    r.innerHTML = `
        <div class="auth-card">
            <div class="auth-logo" aria-hidden="true">🔐</div>
            <h1>Enter PIN</h1>
            <p class="auth-sub">Hai Arif! Masukkan PIN-mu ya 💙</p>
            <div class="pin-dots" id="pin-dots" aria-label="PIN"></div>
            <div class="pin-pad" id="pin-pad"></div>
            <p class="auth-error" id="pin-error" role="alert"></p>
            <button type="button" class="auth-back" id="pin-back">← Ganti user</button>
        </div>
    `;
    r.hidden = false;

    const dotsEl = r.querySelector("#pin-dots");
    const errorEl = r.querySelector("#pin-error");
    const padEl = r.querySelector("#pin-pad");

    function renderDots(error = false) {
        dotsEl.innerHTML = "";
        for (let i = 0; i < maxLen; i++) {
            const dot = document.createElement("span");
            dot.className = "pin-dot" + (i < pin.length ? " filled" : "") + (error ? " error" : "");
            dotsEl.appendChild(dot);
        }
    }
    renderDots();

    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "hapus", "0", "ok"];
    keys.forEach((k) => {
        const label = k === "hapus" ? "⌫" : k === "ok" ? "OK" : k;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pin-key" + (k === "hapus" || k === "ok" ? " wide" : "");
        btn.textContent = label;
        btn.addEventListener("click", () => handleKey(k));
        padEl.appendChild(btn);
    });

    function handleKey(k) {
        errorEl.textContent = "";

        if (k === "hapus") {
            pin = pin.slice(0, -1);
            renderDots();
            return;
        }

        if (k === "ok") {
            if (pin === userConfig.arif.pin) {
                login("arif");
            } else {
                pin = "";
                renderDots(true);
                errorEl.textContent = "PIN salah, coba lagi! 😿";
                setTimeout(() => renderDots(), 450);
            }
            return;
        }

        if (pin.length < maxLen) {
            pin += k;
            renderDots();
            if (pin.length === maxLen) {
                setTimeout(() => {
                    if (pin === userConfig.arif.pin) {
                        login("arif");
                    } else {
                        pin = "";
                        renderDots(true);
                        errorEl.textContent = "PIN salah, coba lagi! 😿";
                        setTimeout(() => renderDots(), 450);
                    }
                }, 150);
            }
        }
    }

    r.querySelector("#pin-back").addEventListener("click", renderUserPicker);

    function keyHandler(e) {
        if (/^[0-9]$/.test(e.key)) handleKey(e.key);
        else if (e.key === "Backspace") handleKey("hapus");
        else if (e.key === "Enter") handleKey("ok");
        else if (e.key === "Escape") {
            document.removeEventListener("keydown", keyHandler);
            renderUserPicker();
        }
    }
    document.addEventListener("keydown", keyHandler);
}

/**
 * Selesaikan login: set user, terapkan theme, sembunyikan auth.
 *
 * @param {"arif"|"arum"} userId - ID user.
 */
function login(userId) {
    const user = userConfig[userId];
    setCurrentUser({ id: user.id, name: user.name, icon: user.icon });
    applyThemeByUser(user.id);
    hideAuth();
    toast(`Welcome back, ${user.name}! ${user.id === "arif" ? "💙" : "💗"}`, "success");
}

/**
 * Logout — kembali ke layar pilih user.
 */
export function logout() {
    setCurrentUser(null);
    applyThemeByUser(null);
    renderUserPicker();
}

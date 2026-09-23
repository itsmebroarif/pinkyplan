/**
 * Pomodoro Timer component — floating interactive widget, task linking, audio chime, and persistence.
 */
import { getState, getTodos, getSchedules, toggleTodo, recordPomodoroSession, getPomodoroStats } from "../store.js";
import { escapeHtml, toISODate, formatDateShort } from "../helpers.js";
import { toast } from "./ui.js";

const MODES = {
    pomodoro: { label: "🍅 Fokus", duration: 25 * 60, title: "Waktu Fokus" },
    shortBreak: { label: "☕ Istirahat Pendek", duration: 5 * 60, title: "Istirahat Singkat" },
    longBreak: { label: "🌴 Istirahat Panjang", duration: 15 * 60, title: "Istirahat Santai" }
};

let pomodoroState = {
    mode: "pomodoro",
    duration: 25 * 60,
    timeLeft: 25 * 60,
    isRunning: false,
    isOpen: false,
    isMinimized: false,
    soundEnabled: true,
    linkedTask: null // { id, title, type: 'todo'|'schedule', extra: '' }
};

/**
 * Kembalikan state aktif Pomodoro untuk komponen lain (Dashboard, Navbar).
 *
 * @returns {Object}
 */
export function getPomodoroCurrentState() {
    return {
        ...pomodoroState,
        modeInfo: MODES[pomodoroState.mode] || MODES.pomodoro
    };
}

let timerInterval = null;
let audioCtx = null;

/**
 * Mainkan nada retro 8-bit saat timer selesai atau tombol ditekan.
 *
 * @param {"complete"|"tick"|"break"} type
 */
function playSound(type = "complete") {
    if (!pomodoroState.soundEnabled) return;
    try {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) audioCtx = new AudioContext();
        }
        if (!audioCtx) return;
        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === "complete") {
            // Arpeggio manis retro kemenangan
            osc.type = "sine";
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
            osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
            osc.frequency.setValueAtTime(1046.50, now + 0.36); // C6

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc.start(now);
            osc.stop(now + 0.65);
        } else if (type === "break") {
            // Nada rileks
            osc.type = "triangle";
            osc.frequency.setValueAtTime(440, now); // A4
            osc.frequency.setValueAtTime(554.37, now + 0.15); // C#5
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.45);
        }
    } catch {
        // Abaikan jika browser membatasi audio
    }
}

/**
 * Format detik ke format mm:ss
 *
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Inisialisasi widget Pomodoro di DOM.
 */
export function initPomodoro() {
    let container = document.getElementById("pomodoro-widget-root");
    if (!container) {
        container = document.createElement("div");
        container.id = "pomodoro-widget-root";
        document.body.appendChild(container);
    }
    renderWidget();
}

/**
 * Buka/tutup widget Pomodoro.
 *
 * @param {boolean} [forceState]
 */
export function togglePomodoro(forceState) {
    if (typeof forceState === "boolean") {
        pomodoroState.isOpen = forceState;
    } else {
        pomodoroState.isOpen = !pomodoroState.isOpen;
    }
    if (pomodoroState.isOpen) {
        pomodoroState.isMinimized = false;
    }
    renderWidget();
    updateNavbarButton();
}

/**
 * Mulai Pomodoro langsung untuk suatu task (Todo atau Schedule).
 *
 * @param {{id:string, title:string, type:'todo'|'schedule', extra?:string}} task
 */
export function startPomodoroForTask(task) {
    pomodoroState.linkedTask = task;
    setMode("pomodoro");
    pomodoroState.isOpen = true;
    pomodoroState.isMinimized = false;
    startTimer();
    renderWidget();
    updateNavbarButton();
    toast(`🍅 Fokus dimulai: ${task.title.slice(0, 30)}…`, "info", 2000);
}

/**
 * Ganti mode Pomodoro (pomodoro | shortBreak | longBreak).
 *
 * @param {string} mode
 */
function setMode(mode) {
    if (!MODES[mode]) return;
    pauseTimer();
    pomodoroState.mode = mode;
    pomodoroState.duration = MODES[mode].duration;
    pomodoroState.timeLeft = MODES[mode].duration;
    renderWidget();
    updateNavbarButton();
}

/**
 * Start timer interval.
 */
function startTimer() {
    if (pomodoroState.isRunning) return;
    pomodoroState.isRunning = true;

    // Pastikan audio context siap
    try {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) audioCtx = new AudioContext();
        }
    } catch {
        // noop
    }

    timerInterval = setInterval(() => {
        if (pomodoroState.timeLeft > 0) {
            pomodoroState.timeLeft--;
            updateTimerDisplay();
        } else {
            handleTimerComplete();
        }
    }, 1000);

    renderWidget();
    updateNavbarButton();
}

/**
 * Pause timer.
 */
function pauseTimer() {
    if (!pomodoroState.isRunning) return;
    pomodoroState.isRunning = false;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    renderWidget();
    updateNavbarButton();
}

/**
 * Reset timer ke durasi awal mode aktif.
 */
function resetTimer() {
    pauseTimer();
    pomodoroState.timeLeft = pomodoroState.duration;
    renderWidget();
    updateNavbarButton();
}

/**
 * Aksi saat timer menyentuh 00:00.
 */
function handleTimerComplete() {
    pauseTimer();
    const isPomo = pomodoroState.mode === "pomodoro";

    if (isPomo) {
        playSound("complete");
        recordPomodoroSession({
            taskId: pomodoroState.linkedTask ? pomodoroState.linkedTask.id : null,
            taskTitle: pomodoroState.linkedTask ? pomodoroState.linkedTask.title : "Fokus Bebas",
            taskType: pomodoroState.linkedTask ? pomodoroState.linkedTask.type : "general",
            durationMinutes: Math.round(pomodoroState.duration / 60)
        });

        const stats = getPomodoroStats();
        toast(`🎉 Sesi Fokus Selesai! (${stats.completedToday} sesi hari ini) Saatnya istirahat sejenak ☕`, "success", 4000);

        // Jika ada linked todo, tawarkan checklist
        if (pomodoroState.linkedTask && pomodoroState.linkedTask.type === "todo") {
            const todo = getTodos().find((t) => t.id === pomodoroState.linkedTask.id);
            if (todo && todo.status !== "done") {
                toggleTodo(todo.id);
                toast(`✅ Todo "${todo.title}" otomatis ditandai selesai!`, "success", 3000);
            }
        }

        // Beralih ke istirahat
        if (stats.completedToday % 4 === 0) {
            setMode("longBreak");
        } else {
            setMode("shortBreak");
        }
    } else {
        playSound("break");
        toast("🔔 Istirahat selesai! Siap untuk kembali produktif? 🍅", "info", 4000);
        setMode("pomodoro");
    }

    renderWidget();
    updateNavbarButton();
}

/**
 * Update realtime teks timer display tanpa re-render seluruh DOM.
 */
function updateTimerDisplay() {
    const text = formatTime(pomodoroState.timeLeft);
    const clockEl = document.querySelector("#pomo-clock");
    const miniClock = document.querySelector("#pomo-mini-clock");
    const progressEl = document.querySelector("#pomo-progress-bar");

    if (clockEl) clockEl.textContent = text;
    if (miniClock) miniClock.textContent = text;

    if (progressEl) {
        const pct = ((pomodoroState.duration - pomodoroState.timeLeft) / pomodoroState.duration) * 100;
        progressEl.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    }

    updateNavbarButton();
}

/**
 * Update tombol status di navbar atas jika ada.
 */
function updateNavbarButton() {
    const navBtn = document.getElementById("pomodoro-nav-btn");
    if (!navBtn) return;

    if (pomodoroState.isRunning) {
        navBtn.classList.add("running");
        navBtn.innerHTML = `🍅 <span class="nav-pomo-text">${formatTime(pomodoroState.timeLeft)}</span>`;
    } else {
        navBtn.classList.remove("running");
        navBtn.innerHTML = `🍅`;
    }
}

/**
 * Render visual widget Pomodoro (expanded atau minimized atau tersembunyi).
 */
function renderWidget() {
    const root = document.getElementById("pomodoro-widget-root");
    if (!root) return;

    if (!pomodoroState.isOpen) {
        // Jika timer sedang running di background, tampilkan floating pill mini
        if (pomodoroState.isRunning) {
            root.innerHTML = `
                <div class="pomodoro-floating-pill shadow-lg" id="pomo-pill">
                    <span class="p-pulse">🍅</span>
                    <span class="p-time" id="pomo-mini-clock">${formatTime(pomodoroState.timeLeft)}</span>
                    <button type="button" class="p-btn-icon" id="pomo-pill-toggle" title="${pomodoroState.isRunning ? "Pause" : "Play"}">
                        ${pomodoroState.isRunning ? "⏸" : "▶"}
                    </button>
                    <button type="button" class="p-btn-icon" id="pomo-pill-open" title="Buka Panel">↗</button>
                </div>
            `;
            root.querySelector("#pomo-pill-toggle")?.addEventListener("click", () => {
                if (pomodoroState.isRunning) pauseTimer();
                else startTimer();
            });
            root.querySelector("#pomo-pill-open")?.addEventListener("click", () => {
                togglePomodoro(true);
            });
            return;
        }

        root.innerHTML = "";
        return;
    }

    // Jika minimized
    if (pomodoroState.isMinimized) {
        root.innerHTML = `
            <div class="pomodoro-floating-pill shadow-lg" id="pomo-pill">
                <span class="p-pulse">🍅</span>
                <span class="p-time" id="pomo-mini-clock">${formatTime(pomodoroState.timeLeft)}</span>
                <span class="p-task-title">${pomodoroState.linkedTask ? escapeHtml(pomodoroState.linkedTask.title.slice(0, 18)) : MODES[pomodoroState.mode].title}</span>
                <button type="button" class="p-btn-icon" id="pomo-pill-toggle" title="${pomodoroState.isRunning ? "Pause" : "Play"}">
                    ${pomodoroState.isRunning ? "⏸" : "▶"}
                </button>
                <button type="button" class="p-btn-icon" id="pomo-pill-expand" title="Perbesar">↗</button>
                <button type="button" class="p-btn-icon" id="pomo-pill-close" title="Tutup">✕</button>
            </div>
        `;
        root.querySelector("#pomo-pill-toggle")?.addEventListener("click", () => {
            if (pomodoroState.isRunning) pauseTimer();
            else startTimer();
        });
        root.querySelector("#pomo-pill-expand")?.addEventListener("click", () => {
            pomodoroState.isMinimized = false;
            renderWidget();
        });
        root.querySelector("#pomo-pill-close")?.addEventListener("click", () => {
            togglePomodoro(false);
        });
        return;
    }

    // Expanded Card View
    const stats = getPomodoroStats();
    const pct = ((pomodoroState.duration - pomodoroState.timeLeft) / pomodoroState.duration) * 100;
    const todos = getTodos().filter((t) => t.status === "pending");
    const todaySchedules = getSchedules().filter((s) => s.date === toISODate() || (s.endDate && s.date <= toISODate() && toISODate() <= s.endDate));

    root.innerHTML = `
        <div class="pomodoro-backdrop" id="pomo-backdrop"></div>
        <div class="pomodoro-card shadow-lg" id="pomodoro-card">
            <!-- Mobile Grab Handle -->
            <div class="pomo-sheet-handle"></div>

            <!-- Header -->
            <div class="pomo-header">
                <div class="pomo-title">
                    <span class="pomo-icon">🍅</span>
                    <span class="pomo-heading">Pomodoro Focus</span>
                    <span class="badge pink pomo-session-badge">
                        ${stats.completedToday} selesai
                    </span>
                </div>
                <div class="pomo-window-actions">
                    <button type="button" class="icon-btn" id="pomo-sound-toggle" title="${pomodoroState.soundEnabled ? "Suara Aktif" : "Mute"}" aria-label="Toggle Suara">
                        ${pomodoroState.soundEnabled ? "🔊" : "🔇"}
                    </button>
                    <button type="button" class="icon-btn" id="pomo-min-btn" title="Kecilkan (Minimize)" aria-label="Kecilkan">_</button>
                    <button type="button" class="icon-btn" id="pomo-close-btn" title="Tutup" aria-label="Tutup">✕</button>
                </div>
            </div>

            <!-- Mode selector tabs -->
            <div class="pomo-modes">
                <button type="button" class="pomo-mode-btn ${pomodoroState.mode === "pomodoro" ? "active" : ""}" data-mode="pomodoro">
                    🍅 Fokus (25m)
                </button>
                <button type="button" class="pomo-mode-btn ${pomodoroState.mode === "shortBreak" ? "active" : ""}" data-mode="shortBreak">
                    ☕ Break (5m)
                </button>
                <button type="button" class="pomo-mode-btn ${pomodoroState.mode === "longBreak" ? "active" : ""}" data-mode="longBreak">
                    🌴 Santai (15m)
                </button>
            </div>

            <!-- Big Clock Face -->
            <div class="pomo-clock-container">
                <div class="pomo-clock" id="pomo-clock">${formatTime(pomodoroState.timeLeft)}</div>
                <div class="pomo-mode-tag">${MODES[pomodoroState.mode].title}</div>
            </div>

            <!-- Progress Bar -->
            <div class="pomo-progress-track">
                <div class="pomo-progress-fill" id="pomo-progress-bar" style="width:${Math.min(100, Math.max(0, pct))}%"></div>
            </div>

            <!-- Controls row -->
            <div class="pomo-controls">
                <button type="button" class="btn btn-secondary btn-sm pomo-side-btn" id="pomo-reset-btn" title="Reset waktu">
                    ↺ Reset
                </button>
                <button type="button" class="btn btn-primary btn-lg pomo-main-btn" id="pomo-toggle-btn">
                    ${pomodoroState.isRunning ? "⏸ Pause" : "▶ Start"}
                </button>
                <button type="button" class="btn btn-secondary btn-sm pomo-side-btn" id="pomo-skip-btn" title="Lanjut mode berikutnya">
                    ⏭ Skip
                </button>
            </div>

            <!-- Duration adjusters -->
            <div class="pomo-adjust-row">
                <div class="pomo-adjust-group">
                    <button type="button" class="adjust-chip" data-adjust="-300" title="Kurangi 5 menit" aria-label="Kurangi 5 menit">-5m</button>
                    <button type="button" class="adjust-chip" data-adjust="-60" title="Kurangi 1 menit" aria-label="Kurangi 1 menit">-1m</button>
                </div>
                <span class="pomo-adjust-label">Atur Waktu</span>
                <div class="pomo-adjust-group">
                    <button type="button" class="adjust-chip" data-adjust="60" title="Tambah 1 menit" aria-label="Tambah 1 menit">+1m</button>
                    <button type="button" class="adjust-chip" data-adjust="300" title="Tambah 5 menit" aria-label="Tambah 5 menit">+5m</button>
                </div>
            </div>

            <!-- Task Linker Section -->
            <div class="pomo-task-linker">
                <div class="pomo-task-header">
                    <span>🎯 Tugas yang Dikerjakan:</span>
                    ${pomodoroState.linkedTask ? `<button type="button" class="btn btn-link btn-xs" id="pomo-clear-task">Lepas</button>` : ""}
                </div>

                ${
                    pomodoroState.linkedTask
                        ? `
                    <div class="pomo-active-task-box">
                        <div class="pomo-task-info">
                            <span class="pomo-task-badge ${pomodoroState.linkedTask.type}">
                                ${pomodoroState.linkedTask.type === "todo" ? "📋 Todo" : "📅 Jadwal"}
                            </span>
                            <span class="pomo-task-name" title="${escapeHtml(pomodoroState.linkedTask.title)}">${escapeHtml(pomodoroState.linkedTask.title)}</span>
                        </div>
                        ${
                            pomodoroState.linkedTask.type === "todo"
                                ? `<button type="button" class="btn btn-sm btn-secondary" id="pomo-mark-done-btn">✓ Selesai</button>`
                                : ""
                        }
                    </div>
                `
                        : `
                    <select class="select select-sm pomo-task-select" id="pomo-task-picker">
                        <option value="">— Pilih tugas untuk dikaitkan —</option>
                        <optgroup label="📋 Tugas Todo Aktif">
                            ${todos.map((t) => `<option value="todo:${t.id}">${escapeHtml(t.title)} (${formatDateShort(t.date || toISODate())})</option>`).join("")}
                        </optgroup>
                        <optgroup label="📅 Jadwal Hari Ini">
                            ${todaySchedules.map((s) => `<option value="schedule:${s.id}">${s.icon || "📅"} ${escapeHtml(s.title)} (${s.startTime} - ${s.endTime})</option>`).join("")}
                        </optgroup>
                    </select>
                `
                }
            </div>
        </div>
    `;

    // Event Bindings
    root.querySelector("#pomo-backdrop")?.addEventListener("click", () => {
        pomodoroState.isMinimized = true;
        renderWidget();
    });

    root.querySelector("#pomo-close-btn")?.addEventListener("click", () => togglePomodoro(false));
    root.querySelector("#pomo-min-btn")?.addEventListener("click", () => {
        pomodoroState.isMinimized = true;
        renderWidget();
    });

    root.querySelector("#pomo-sound-toggle")?.addEventListener("click", () => {
        pomodoroState.soundEnabled = !pomodoroState.soundEnabled;
        renderWidget();
        toast(pomodoroState.soundEnabled ? "🔊 Suara aktif" : "🔇 Suara dimatikan", "info", 1000);
    });

    root.querySelectorAll(".pomo-mode-btn").forEach((btn) => {
        btn.addEventListener("click", () => setMode(btn.dataset.mode));
    });

    root.querySelector("#pomo-toggle-btn")?.addEventListener("click", () => {
        if (pomodoroState.isRunning) pauseTimer();
        else startTimer();
    });

    root.querySelector("#pomo-reset-btn")?.addEventListener("click", resetTimer);

    root.querySelector("#pomo-skip-btn")?.addEventListener("click", () => {
        if (pomodoroState.mode === "pomodoro") setMode("shortBreak");
        else setMode("pomodoro");
    });

    root.querySelectorAll("[data-adjust]").forEach((chip) => {
        chip.addEventListener("click", () => {
            const delta = parseInt(chip.dataset.adjust, 10);
            const newTime = Math.max(60, pomodoroState.timeLeft + delta);
            pomodoroState.timeLeft = newTime;
            if (!pomodoroState.isRunning) {
                pomodoroState.duration = newTime;
            }
            updateTimerDisplay();
        });
    });

    root.querySelector("#pomo-task-picker")?.addEventListener("change", (e) => {
        const val = e.target.value;
        if (!val) return;
        const [type, id] = val.split(":");
        if (type === "todo") {
            const t = getTodos().find((x) => x.id === id);
            if (t) pomodoroState.linkedTask = { id: t.id, title: t.title, type: "todo" };
        } else if (type === "schedule") {
            const s = getSchedules().find((x) => x.id === id);
            if (s) pomodoroState.linkedTask = { id: s.id, title: s.title, type: "schedule" };
        }
        renderWidget();
    });

    root.querySelector("#pomo-clear-task")?.addEventListener("click", () => {
        pomodoroState.linkedTask = null;
        renderWidget();
    });

    root.querySelector("#pomo-mark-done-btn")?.addEventListener("click", () => {
        if (pomodoroState.linkedTask && pomodoroState.linkedTask.type === "todo") {
            toggleTodo(pomodoroState.linkedTask.id);
            toast("✅ Tugas berhasil diselesaikan!", "success");
            pomodoroState.linkedTask = null;
            renderWidget();
        }
    });
}

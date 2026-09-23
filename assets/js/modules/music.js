/**
 * Music module — background music (backsound) dengan auto-detect folder MP3.
 *
 * Sumber track (urut prioritas):
 * 1. GET /api/music          → local dev (Express scan assets/music/)
 * 2. assets/music/manifest.json → static hosting (npm run music:scan)
 *
 * Dokumentasi folder: assets/music/README.md
 */
import { musicConfig, appConfig } from "../config.js";
import { getState, updateSettings } from "../store.js";
import { storage } from "../storage.js";
import { toast } from "../components/ui.js";
import { escapeHtml } from "../helpers.js";

/** @type {HTMLAudioElement|null} Audio element backsound. */
let audio = null;

/** @type {Array<{file:string, title:string, url:string}>} Playlist. */
let tracks = [];

/** @type {number} Index track aktif. */
let index = 0;

/** @type {boolean} True bila playlist sudah dimuat. */
let loaded = false;

/** @type {boolean} Menunggu gesture user untuk unlock autoplay. */
let awaitingGesture = false;

/** @type {Function|null} Unsubscribe store. */
let unsub = null;

/** @type {boolean} Init sudah dijalankan (cegah double-init). */
let booted = false;

/**
 * Normalisasi satu entry track dari API/manifest.
 *
 * @param {Object|string} entry - Entry mentah.
 * @returns {{file:string, title:string, url:string}|null}
 */
function normalizeTrack(entry) {
    if (!entry) return null;
    if (typeof entry === "string") {
        const file = entry.trim();
        if (!file) return null;
        return {
            file,
            title: titleFromFilename(file),
            url: `${musicConfig.folder}/${encodeURIComponent(file)}`
        };
    }
    const file = String(entry.file || entry.name || entry.url || "").trim();
    if (!file) return null;
    // Sudah path penuh?
    const url = /^(https?:)?\//.test(file) || file.startsWith(musicConfig.folder)
        ? file
        : `${musicConfig.folder}/${encodeURIComponent(file)}`;
    return {
        file: file.replace(/^.*\//, ""),
        title: (entry.title || entry.name || titleFromFilename(file)).trim(),
        url
    };
}

/**
 * Judul human-readable dari nama file.
 *
 * @param {string} filename - Nama file.
 * @returns {string}
 */
function titleFromFilename(filename) {
    return filename
        .replace(/\.[^.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Fetch JSON dengan toleransi content-type (SPA fallback bisa balikin HTML).
 *
 * @param {string} url
 * @returns {Promise<*|null>}
 */
async function fetchJsonSafe(url) {
    try {
        const res = await fetch(url, { cache: "no-cache" });
        if (!res.ok) return null;
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("json")) {
            // Netlify SPA rewrite bisa mengembalikan index.html — bukan JSON
            const text = await res.text();
            if (!text.trim().startsWith("{") && !text.trim().startsWith("[")) return null;
            return JSON.parse(text);
        }
        return await res.json();
    } catch {
        return null;
    }
}

/**
 * Ambil daftar lagu: API dulu, lalu manifest.json.
 *
 * @returns {Promise<Array<{file:string, title:string, url:string}>>}
 */
export async function loadPlaylist() {
    if (!appConfig.features.music) return [];

    // 1) Local API (Express) — auto-scan folder
    const apiData = await fetchJsonSafe(musicConfig.apiEndpoint);
    if (apiData && Array.isArray(apiData.tracks) && apiData.tracks.length) {
        tracks = apiData.tracks.map(normalizeTrack).filter(Boolean);
        if (tracks.length) {
            loaded = true;
            return tracks;
        }
    }

    // 2) Manifest static hosting
    const manifest = await fetchJsonSafe(musicConfig.manifestUrl);
    if (manifest && Array.isArray(manifest.tracks)) {
        tracks = manifest.tracks.map(normalizeTrack).filter(Boolean);
    } else if (Array.isArray(manifest)) {
        tracks = manifest.map(normalizeTrack).filter(Boolean);
    } else {
        tracks = [];
    }

    loaded = true;
    return tracks;
}

/**
 * @returns {Array} Playlist saat ini.
 */
export function getPlaylist() {
    return tracks.slice();
}

/**
 * @returns {{index:number, track:Object|null, playing:boolean, volume:number, enabled:boolean}}
 */
export function getMusicState() {
    const settings = getState().settings;
    const track = tracks[index] || null;
    return {
        index,
        total: tracks.length,
        track,
        playing: Boolean(audio && !audio.paused),
        volume: audio ? audio.volume : (settings.musicVolume ?? musicConfig.defaultVolume),
        enabled: settings.musicEnabled !== false,
        autoplay: settings.musicAutoplay !== false
    };
}

/**
 * Pastikan audio element sudah dibuat.
 *
 * @returns {HTMLAudioElement}
 */
function ensureAudio() {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = "none";
    audio.loop = musicConfig.loop;
    const settings = getState().settings;
    audio.volume = clampVolume(settings.musicVolume ?? musicConfig.defaultVolume);

    audio.addEventListener("ended", () => {
        if (tracks.length <= 1) {
            if (musicConfig.loop && getState().settings.musicEnabled !== false) {
                audio.currentTime = 0;
                audio.play().catch(() => unlockOnGesture());
            }
            return;
        }
        nextTrack(true);
    });

    audio.addEventListener("error", () => {
        if (tracks.length > 1) {
            // File rusak / tidak ada — lompat ke lagu berikutnya
            nextTrack(true);
        }
    });

    return audio;
}

/**
 * @param {number} v
 * @returns {number}
 */
function clampVolume(v) {
    const n = Number(v);
    if (Number.isNaN(n)) return musicConfig.defaultVolume;
    return Math.max(0, Math.min(1, n));
}

/**
 * Load & apply track ke index tertentu.
 *
 * @param {number} i - Index track.
 * @param {boolean} [autoplay=true] - Langsung play.
 * @returns {boolean}
 */
export function playTrack(i, autoplay = true) {
    if (!tracks.length) return false;
    index = ((i % tracks.length) + tracks.length) % tracks.length;
    const el = ensureAudio();
    const t = tracks[index];
    el.src = t.url;
    el.load();
    updateSettings({ musicTrackIndex: index });
    if (autoplay && getState().settings.musicEnabled !== false) {
        el.play().catch(() => unlockOnGesture());
    }
    emitUi();
    return true;
}

/**
 * Play backsound (index tersimpan / saat ini).
 *
 * @returns {Promise<boolean>}
 */
export async function play() {
    if (!appConfig.features.music) return false;
    if (!loaded) await loadPlaylist();
    if (!tracks.length) return false;

    updateSettings({ musicEnabled: true });
    const el = ensureAudio();
    if (!el.src) {
        const saved = getState().settings.musicTrackIndex ?? 0;
        return playTrack(saved, true);
    }
    try {
        await el.play();
        awaitingGesture = false;
        emitUi();
        return true;
    } catch {
        unlockOnGesture();
        emitUi();
        return false;
    }
}

/**
 * Pause backsound.
 */
export function pause() {
    if (audio) audio.pause();
    updateSettings({ musicEnabled: false });
    awaitingGesture = false;
    emitUi();
}

/**
 * Toggle play/pause.
 *
 * @returns {Promise<boolean>} True bila sedang play setelah toggle.
 */
export async function toggle() {
    const s = getMusicState();
    if (s.playing) {
        pause();
        return false;
    }
    return play();
}

/**
 * Track berikutnya.
 *
 * @param {boolean} [auto=false] - Dipanggil otomatis saat ended.
 */
export function nextTrack(auto = false) {
    if (!tracks.length) return;
    playTrack(index + 1, auto || getState().settings.musicEnabled !== false);
}

/**
 * Track sebelumnya.
 */
export function prevTrack() {
    if (!tracks.length) return;
    playTrack(index - 1, getState().settings.musicEnabled !== false);
}

/**
 * Set volume 0..1 + persist.
 *
 * @param {number} v
 */
export function setVolume(v) {
    const vol = clampVolume(v);
    updateSettings({ musicVolume: vol });
    if (audio) audio.volume = vol;
    emitUi();
}

/**
 * Toggle autoplay setting.
 *
 * @param {boolean} on
 */
export function setAutoplay(on) {
    updateSettings({ musicAutoplay: Boolean(on) });
}

/**
 * Rescan playlist (refresh tombol di Settings).
 *
 * @returns {Promise<number>} Jumlah track.
 */
export async function refreshPlaylist() {
    const currentFile = tracks[index]?.file;
    await loadPlaylist();
    if (tracks.length) {
        const keep = tracks.findIndex((t) => t.file === currentFile);
        index = keep >= 0 ? keep : Math.min(index, tracks.length - 1);
        const el = ensureAudio();
        if (el.src) {
            // Jangan autoplay paksa saat refresh — cukup update src bila file hilang
            if (!tracks.find((t) => t.url === el.src.replace(location.origin, "").replace(/^\//, "") || tracks[index]?.url === el.src || el.src.endsWith(tracks[index]?.file || "\u0000"))) {
                el.src = tracks[index].url;
            }
        }
    } else if (audio) {
        audio.pause();
        audio.removeAttribute("src");
    }
    emitUi();
    return tracks.length;
}

/**
 * Unlock autoplay pada gesture user pertama (kebijakan browser).
 */
function unlockOnGesture() {
    if (awaitingGesture) return;
    if (getState().settings.musicEnabled === false) return;
    awaitingGesture = true;

    const handler = async () => {
        window.removeEventListener("pointerdown", handler);
        window.removeEventListener("keydown", handler);
        awaitingGesture = false;
        if (getState().settings.musicEnabled === false) return;
        if (!audio || audio.paused) {
            try {
                if (!audio?.src && tracks.length) {
                    playTrack(getState().settings.musicTrackIndex ?? 0, true);
                } else {
                    await audio?.play();
                }
            } catch {
                /* masih diblokir — biarkan */
            }
            emitUi();
        }
    };

    window.addEventListener("pointerdown", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
}

/** Listener UI mini-player. @type {Set<Function>} */
const uiListeners = new Set();

/**
 * Subscribe perubahan state music untuk UI.
 *
 * @param {Function} cb
 * @returns {Function} Unsubscribe.
 */
export function onMusicChange(cb) {
    uiListeners.add(cb);
    return () => uiListeners.delete(cb);
}

function emitUi() {
    const s = getMusicState();
    uiListeners.forEach((cb) => {
        try {
            cb(s);
        } catch (e) {
            console.warn("music ui listener:", e);
        }
    });
    updateNavbarBtn(s);
}

/**
 * Sinkron ikon tombol navbar (jika ada).
 *
 * @param {ReturnType<typeof getMusicState>} s
 */
function updateNavbarBtn(s) {
    const btn = document.getElementById("music-nav-btn");
    if (!btn) return;
    btn.textContent = s.playing ? "🎵" : "🔇";
    btn.classList.toggle("music-playing", s.playing);
    btn.title = s.playing
        ? `Musik: ${s.track?.title || "-"} (klik untuk pause)`
        : "Nyalakan backsound";
    btn.setAttribute("aria-pressed", String(s.playing));
    const nowPlaying = btn.querySelector(".music-eq");
    if (nowPlaying) nowPlaying.hidden = !s.playing;
}

/**
 * Init background music — load playlist + coba autoplay.
 * Dipanggil dari app.js setelah login / bootstrap.
 *
 * @returns {Promise<void>}
 */
export async function initMusic() {
    if (!appConfig.features.music) return;
    if (booted) return;
    booted = true;

    const settings = getState().settings;
    audio = ensureAudio();
    audio.volume = clampVolume(settings.musicVolume ?? musicConfig.defaultVolume);

    await loadPlaylist();

    if (!tracks.length) {
        console.info("🎵 Music: folder assets/music masih kosong — lihat assets/music/README.md");
        emitUi();
        return;
    }

    const saved = Math.min(Math.max(0, settings.musicTrackIndex ?? 0), tracks.length - 1);
    index = saved;
    audio.src = tracks[index].url;

    // Persist defaults
    if (settings.musicVolume == null) updateSettings({ musicVolume: musicConfig.defaultVolume });

    if (settings.musicEnabled !== false && settings.musicAutoplay !== false) {
        // Coba autoplay; jika ditolak → unlock pada gesture pertama
        try {
            await audio.play();
        } catch {
            unlockOnGesture();
        }
    }

    emitUi();
    console.info(`🎵 Music ready — ${tracks.length} lagu · "${tracks[index]?.title}"`);
}

/**
 * Cleanup (opsional, saat logout penuh).
 */
export function stopMusic() {
    if (audio) {
        audio.pause();
        audio.removeAttribute("src");
    }
    awaitingGesture = false;
    emitUi();
}

/**
 * HTML mini status untuk Settings.
 *
 * @returns {string}
 */
export function musicSettingsHtml() {
    const s = getMusicState();
    const trackOptions = tracks.length
        ? tracks
              .map(
                  (t, i) =>
                      `<option value="${i}" ${i === s.index ? "selected" : ""}>${escapeHtml(t.title)}</option>`
              )
              .join("")
        : `<option value="-1" disabled selected>Belum ada lagu di assets/music/</option>`;

    return `
        <div class="music-settings" id="music-settings">
            <div class="settings-row">
                <div class="row-info">
                    <div class="row-title">Background music</div>
                    <div class="row-desc">Backsound aplikasi (folder assets/music/)</div>
                </div>
                <label class="toggle">
                    <input type="checkbox" id="toggle-music" ${s.enabled ? "checked" : ""}>
                    <span class="track"></span><span class="thumb"></span>
                </label>
            </div>
            <div class="settings-row">
                <div class="row-info">
                    <div class="row-title">Autoplay</div>
                    <div class="row-desc">Putar otomatis saat buka app (butuh klik pertama di mobile)</div>
                </div>
                <label class="toggle">
                    <input type="checkbox" id="toggle-music-autoplay" ${s.autoplay ? "checked" : ""}>
                    <span class="track"></span><span class="thumb"></span>
                </label>
            </div>
            <div class="settings-row">
                <div class="row-info">
                    <div class="row-title">Volume</div>
                    <div class="row-desc"><span id="music-volume-label">${Math.round(s.volume * 100)}%</span></div>
                </div>
                <input type="range" id="music-volume" min="0" max="100" value="${Math.round(s.volume * 100)}"
                    style="width:140px;accent-color:var(--primary)" aria-label="Volume musik">
            </div>
            <div class="settings-row">
                <div class="row-info">
                    <div class="row-title">Playlist</div>
                    <div class="row-desc">${tracks.length} lagu terdeteksi · ${s.playing ? "▶ playing" : "⏸ stopped"}</div>
                </div>
                <div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;justify-content:flex-end">
                    <select id="music-track-select" class="input" style="min-height:40px;max-width:180px">${trackOptions}</select>
                    <button type="button" class="btn btn-sm btn-secondary" id="music-refresh" title="Rescan folder">🔄</button>
                </div>
            </div>
            <div class="settings-row">
                <div class="row-info">
                    <div class="row-title">Kontrol</div>
                    <div class="row-desc">${s.track ? escapeHtml(s.track.title) : "—"}</div>
                </div>
                <div style="display:flex;gap:0.4rem">
                    <button type="button" class="btn btn-sm" id="music-prev" aria-label="Sebelumnya">⏮</button>
                    <button type="button" class="btn btn-sm btn-primary" id="music-play-toggle">${s.playing ? "⏸ Pause" : "▶ Play"}</button>
                    <button type="button" class="btn btn-sm" id="music-next" aria-label="Berikutnya">⏭</button>
                </div>
            </div>
            <p style="margin:0.2rem 0 0;font-size:0.78rem;opacity:0.75;line-height:1.5">
                Taruh MP3 di <code>assets/music/</code> · auto-detect via <code>/api/music</code> (dev)
                atau <code>npm run music:scan</code> (deploy) ·
                <a href="./assets/music/README.md" target="_blank" rel="noopener">dokumentasi</a>
            </p>
        </div>
    `;
}

/**
 * Bind handler Settings music setelah HTML di-insert.
 *
 * @param {HTMLElement} container
 */
export function bindMusicSettings(container) {
    const root = container.querySelector("#music-settings");
    if (!root) return;

    root.querySelector("#toggle-music")?.addEventListener("change", async (e) => {
        if (e.target.checked) {
            const ok = await play();
            if (!ok && !tracks.length) toast("Belum ada MP3 di assets/music/", "error");
            else if (!ok) toast("Klik sekali di halaman untuk mulai musik", "info");
            else toast("🎵 Backsound menyala", "success", 1600);
        } else {
            pause();
            toast("🔇 Backsound off", "info", 1400);
        }
        // Refresh label playing
        const desc = root.querySelector(".settings-row:nth-child(4) .row-desc");
        if (desc) {
            const s = getMusicState();
            desc.textContent = `${s.total} lagu terdeteksi · ${s.playing ? "▶ playing" : "⏸ stopped"}`;
        }
        const btn = root.querySelector("#music-play-toggle");
        if (btn) btn.textContent = getMusicState().playing ? "⏸ Pause" : "▶ Play";
    });

    root.querySelector("#toggle-music-autoplay")?.addEventListener("change", (e) => {
        setAutoplay(e.target.checked);
        toast(e.target.checked ? "Autoplay ON" : "Autoplay OFF", "info", 1400);
    });

    root.querySelector("#music-volume")?.addEventListener("input", (e) => {
        const v = Number(e.target.value) / 100;
        setVolume(v);
        const label = root.querySelector("#music-volume-label");
        if (label) label.textContent = `${Math.round(v * 100)}%`;
    });

    root.querySelector("#music-track-select")?.addEventListener("change", (e) => {
        const i = Number(e.target.value);
        if (i >= 0) {
            updateSettings({ musicEnabled: true });
            playTrack(i, true);
            const btn = root.querySelector("#music-play-toggle");
            if (btn) btn.textContent = "⏸ Pause";
        }
    });

    root.querySelector("#music-refresh")?.addEventListener("click", async () => {
        const n = await refreshPlaylist();
        toast(`🔄 ${n} lagu terdeteksi`, n ? "success" : "info");
        const page = document.getElementById("page-content");
        if (page) {
            // Re-render hanya section settings agar state UI sinkron
            const { renderSettingsPage } = await import("./settings.js");
            renderSettingsPage(page);
        }
    });

    root.querySelector("#music-play-toggle")?.addEventListener("click", async () => {
        const playing = await toggle();
        const btn = root.querySelector("#music-play-toggle");
        if (btn) btn.textContent = playing ? "⏸ Pause" : "▶ Play";
        if (!playing && tracks.length) {
            // mungkin butuh gesture
        }
    });

    root.querySelector("#music-prev")?.addEventListener("click", () => {
        prevTrack();
        const btn = root.querySelector("#music-play-toggle");
        if (btn) btn.textContent = "⏸ Pause";
        const sel = root.querySelector("#music-track-select");
        if (sel) sel.value = String(index);
    });

    root.querySelector("#music-next")?.addEventListener("click", () => {
        nextTrack();
        const btn = root.querySelector("#music-play-toggle");
        if (btn) btn.textContent = "⏸ Pause";
        const sel = root.querySelector("#music-track-select");
        if (sel) sel.value = String(index);
    });

    // Live update saat play/pause dari navbar
    if (unsub) unsub();
    unsub = onMusicChange((s) => {
        if (!root.isConnected) {
            unsub?.();
            unsub = null;
            return;
        }
        const btn = root.querySelector("#music-play-toggle");
        if (btn) btn.textContent = s.playing ? "⏸ Pause" : "▶ Play";
        const sel = root.querySelector("#music-track-select");
        if (sel && Number(sel.value) !== s.index) sel.value = String(s.index);
        const toggleMusic = root.querySelector("#toggle-music");
        if (toggleMusic) toggleMusic.checked = s.enabled;
    });
}

// Pastikan storage key lama tidak konflik — settings sudah di-merge di loadState.
void storage;

/**
 * Abstraction layer untuk LocalStorage.
 * Seluruh akses LocalStorage di aplikasi harus melalui modul ini.
 */
import { appConfig } from "./config.js";

const PREFIX = `${appConfig.storagePrefix}_`;

/**
 * Menyimpan value ke LocalStorage (di-serialize ke JSON).
 *
 * @param {string} key - Key tanpa prefix.
 * @param {*} value - Value yang akan disimpan.
 * @returns {boolean} true jika berhasil.
 */
export function set(key, value) {
    try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error("storage.set gagal:", error);
        return false;
    }
}

/**
 * Membaca value dari LocalStorage.
 *
 * @param {string} key - Key tanpa prefix.
 * @param {*} [fallback=null] - Nilai default jika key tidak ada / korup.
 * @returns {*} Value tersimpan atau fallback.
 */
export function get(key, fallback = null) {
    try {
        const raw = localStorage.getItem(PREFIX + key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
    } catch (error) {
        console.warn(`storage.get korup untuk key "${key}", direset:`, error);
        remove(key);
        return fallback;
    }
}

/**
 * Menghapus satu key.
 *
 * @param {string} key - Key tanpa prefix.
 */
export function remove(key) {
    localStorage.removeItem(PREFIX + key);
}

/**
 * Menghapus seluruh data aplikasi (kecuali session login opsional).
 */
export function clear() {
    Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
}

/**
 * Mengecek apakah key tersedia.
 *
 * @param {string} key - Key tanpa prefix.
 * @returns {boolean}
 */
export function has(key) {
    return localStorage.getItem(PREFIX + key) !== null;
}

export const storage = { set, get, remove, clear, has };

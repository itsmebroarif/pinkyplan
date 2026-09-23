#!/usr/bin/env node
/**
 * Scan folder assets/music → tulis assets/music/manifest.json.
 * Dipakai untuk static hosting (Netlify/Vercel) agar MP3 baru ter-detect.
 *
 * Usage: npm run music:scan
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const musicDir = path.join(root, "assets", "music");
const manifestPath = path.join(musicDir, "manifest.json");

const AUDIO_EXT = new Set([".mp3", ".m4a", ".ogg", ".wav", ".aac", ".flac"]);

/** Format judul dari nama file: "lofi-chill.mp3" → "Lofi Chill". */
function titleFromFile(name) {
    return name
        .replace(/\.[^.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function scan() {
    if (!fs.existsSync(musicDir)) {
        fs.mkdirSync(musicDir, { recursive: true });
    }

    const files = fs
        .readdirSync(musicDir)
        .filter((f) => {
            const ext = path.extname(f).toLowerCase();
            return AUDIO_EXT.has(ext) && !f.startsWith(".");
        })
        .sort((a, b) => a.localeCompare(b, "id"));

    // Pertahankan title manual dari manifest lama bila file masih ada
    let oldTracks = [];
    try {
        const old = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        if (Array.isArray(old?.tracks)) oldTracks = old.tracks;
    } catch {
        /* manifest belum ada / korup — abaikan */
    }
    const oldTitleByFile = new Map(
        oldTracks
            .filter((t) => t && t.file && t.title)
            .map((t) => [t.file, t.title])
    );

    const tracks = files.map((file) => ({
        file,
        title: oldTitleByFile.get(file) || titleFromFile(file)
    }));

    const manifest = {
        version: 1,
        updatedAt: new Date().toISOString(),
        tracks
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + "\n", "utf8");

    console.log(`✅ music:scan — ${tracks.length} lagu di assets/music/`);
    tracks.forEach((t) => console.log(`   • ${t.file} → "${t.title}"`));
    if (tracks.length === 0) {
        console.log("   (folder kosong — taruh file .mp3 lalu jalankan lagi)");
    }
}

scan();

# 🎵 Folder Music (Background / Backsound)

Taruh file **MP3** kamu di folder ini. Aplikasi akan **auto-detect** dan memakainya sebagai backsound.

## Cara pakai

1. Copy file `.mp3` ke folder ini, contoh:

   ```text
   assets/music/
   ├── lofi-chill.mp3
   ├── rainy-window.mp3
   └── morning-coffee.mp3
   ```

2. Muat ulang aplikasi (atau klik **🔄 Refresh** di Settings → Music).
3. Musik akan muncul di playlist & bisa autoplay sebagai backsound.

## Format yang didukung

| Format | Status |
|--------|--------|
| `.mp3` | ✅ Utama (disarankan) |
| `.m4a` | ✅ (opsional, ikut ter-scan) |
| `.ogg` | ✅ (opsional, ikut ter-scan) |
| `.wav` | ⚠️ Bisa, tapi file besar |

**Rekomendasi:** MP3 bitrate 128–192 kbps, mono/stereo, durasi bebas.

## Auto-detect — cara kerja

Aplikasi mencari daftar lagu dengan **2 cara** (urut):

### 1. Local development (`npm run dev`)

```text
GET /api/music
```

Server Express membaca isi folder `assets/music/` secara langsung → **langsung terdeteksi** tanpa langkah tambahan.

### 2. Static hosting (Netlify / Vercel / GitHub Pages)

Tidak ada endpoint server, jadi aplikasi membaca:

```text
assets/music/manifest.json
```

Update manifest agar MP3 baru terdeteksi:

```bash
npm run music:scan
```

Atau edit manual `manifest.json`:

```json
{
    "version": 1,
    "tracks": [
        { "file": "lofi-chill.mp3", "title": "Lofi Chill" }
    ]
}
```

> `title` boleh dihapus — otomatis diambil dari nama file.

## Settings di aplikasi

Buka **Settings → 🎵 Music**:

- Toggle backsound on/off
- Autoplay on/off
- Volume slider
- Pilih lagu / next / prev
- Tombol **Refresh playlist** (rescan folder)

## Catatan autoplay browser

Browser memblokir autoplay sampai user **interaksi pertama** (klik/ketuk).

PinkyPlan otomatis:

1. Coba play saat app dibuka / user login.
2. Jika diblokir → play pada **klik pertama** di aplikasi.

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Lagu tidak muncul | Cek ekstensi `.mp3` (bukan `.MP3` aneh / `.mp3.exe`) |
| Local OK, deploy tidak | Jalankan `npm run music:scan` lalu commit `manifest.json` |
| Autoplay diam | Klik sekali di halaman (kebijakan browser) |
| Salah judul | Edit `title` di `manifest.json` atau rename file |

## Struktur manifest

```json
{
    "version": 1,
    "updatedAt": "2026-09-23T12:00:00.000Z",
    "tracks": [
        { "file": "nama-file.mp3", "title": "Judul Tampilan" }
    ]
}
```

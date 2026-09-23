import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const MUSIC_DIR = path.join(__dirname, 'assets', 'music');
const AUDIO_EXT = new Set(['.mp3', '.m4a', '.ogg', '.wav', '.aac', '.flac']);

/**
 * Judul human-readable dari nama file lagu.
 * "lofi-chill.mp3" → "Lofi Chill"
 */
function titleFromFile(name) {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * GET /api/music — auto-scan folder assets/music untuk backsound.
 * Response: { updatedAt, tracks: [{ file, title }] }
 */
app.get('/api/music', (req, res) => {
  try {
    if (!fs.existsSync(MUSIC_DIR)) {
      fs.mkdirSync(MUSIC_DIR, { recursive: true });
    }

    // Merge title manual dari manifest.json bila ada
    const titleMap = new Map();
    try {
      const manifest = JSON.parse(fs.readFileSync(path.join(MUSIC_DIR, 'manifest.json'), 'utf8'));
      for (const t of manifest.tracks || []) {
        if (t && t.file && t.title) titleMap.set(t.file, t.title);
      }
    } catch {
      /* manifest optional */
    }

    const files = fs
      .readdirSync(MUSIC_DIR)
      .filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return AUDIO_EXT.has(ext) && !f.startsWith('.');
      })
      .sort((a, b) => a.localeCompare(b, 'id'));

    const tracks = files.map((file) => ({
      file,
      title: titleMap.get(file) || titleFromFile(file)
    }));

    res.set('Cache-Control', 'no-store');
    res.json({
      folder: 'assets/music',
      updatedAt: new Date().toISOString(),
      count: tracks.length,
      tracks
    });
  } catch (error) {
    console.error('/api/music error:', error);
    res.status(500).json({ error: 'Gagal scan folder music', tracks: [] });
  }
});

// Serve static files from root directory
app.use(express.static(__dirname, {
  extensions: ['html']
}));

// SPA Fallback: serve index.html for non-asset GET requests
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`PinkyPlan server running on http://${HOST}:${PORT}`);
  console.log(`🎵 Music API: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api/music`);
  console.log(`📁 Music folder: ${MUSIC_DIR}`);
});

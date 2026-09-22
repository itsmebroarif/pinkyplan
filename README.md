# 🩷 PinkyPlan

> Cute Retro Personal Productivity Planner

PinkyPlan adalah aplikasi **personal productivity planner berbasis Static SPA** yang dibuat menggunakan **HTML, CSS, dan Vanilla JavaScript**.

Aplikasi ini dirancang untuk mengelola:

* 📋 Todo List
* 📅 Today's Schedule
* 🗂 Schedule Group
* 🗓 Calendar
* 🎯 Activity / Category
* 💧 Hydration
* 🍽️ Meal Tracker (min 3×/hari, warning jam 20:00, download PNG)
* 🎮 Games — 3 world 3D (Taman, Server, Kota) via Three.js
* 💬 Daily Quote
* 📊 Productivity Statistics
* 📦 JSON Import / Export

Project tidak membutuhkan:

* Backend
* Database
* REST API
* PHP
* Node.js server

Data disimpan menggunakan **LocalStorage** dan dapat dipindahkan menggunakan file **JSON**.

---

# ✨ Features

## 🏠 Dashboard

Dashboard menampilkan:

* Greeting
* Current date
* Daily quote
* Today's progress
* Today's schedule
* Hydration
* Upcoming activity

---

## 📋 Todo

Todo mendukung:

* Create
* Read
* Update
* Delete
* Complete
* Priority
* Category
* Due date
* Schedule relation
* Group relation

---

## 📅 Schedule

Schedule dapat memiliki:

```text
Schedule
└── Group
    └── Todo
```

Contoh:

```text
📚 Learn JavaScript

Preparation
├── Read documentation
├── Prepare notes
└── Setup editor

Practice
├── Array exercise
├── Object exercise
└── Build mini project
```

---

# 🗓 Calendar

Calendar menampilkan Schedule berdasarkan tanggal.

Tanggal yang memiliki aktivitas akan mendapatkan marking.

Contoh:

```text
23
● ● ●
```

User dapat:

* membuka tanggal
* melihat schedule
* membuat schedule
* mengedit schedule
* menghapus schedule

---

# 🎯 Categories

Category bersifat configurable.

Contoh:

```text
🏃 Olahraga
📚 Belajar
🏖️ Liburan
💼 Kerja
🎮 Hiburan
```

Category tidak boleh di-hardcode pada HTML.

Gunakan:

```text
data/categories.json
```

atau konfigurasi JavaScript.

Contoh:

```javascript
{
    id: "coding",
    label: "Coding",
    icon: "💻"
}
```

Menambahkan category baru tidak membutuhkan perubahan HTML.

---

# 💧 Hydration

PinkyPlan memiliki hydration tracker.

Default:

```text
8 glasses / day
```

Contoh:

```text
💧 💧 💧 💧 💧 ○ ○ ○
```

Hydration goal dapat dikonfigurasi.

---

# 💬 Daily Quote

Quote disimpan pada:

```text
data/quotes.json
```

Quote dipilih secara deterministic berdasarkan tanggal sehingga refresh halaman tidak mengubah quote secara acak.

---

# 📊 Statistics

D3.js digunakan untuk:

* Productivity chart
* Completion chart
* Category distribution
* Hydration statistics

Chart harus responsive.

---

# 🌌 Three.js

Three.js digunakan untuk visual enhancement:

* floating particles
* decorative animation
* cute mascot
* ambient background
* **mini-games 3D** (Taman / Server / Kota) di menu **Games**

Three.js tidak digunakan sebagai dependency utama aplikasi.

Aplikasi tetap harus berjalan tanpa WebGL (background &amp; games fallback aman).

---

# 🎨 Design

PinkyPlan menggabungkan:

```text
Material Design
+
Neo-Brutalism
+
Retro 8-bit
+
Pixel Art
+
Cute UI
```

Primary colors:

```text
Pink
#FF69B4

Purple
#9B5DE5

Dark Purple
#6C3BB5
```

Design harus:

* Mobile First
* Responsive
* Accessible
* Touch Friendly
* Readable
* Consistent

---

# 📱 Responsive Layout

## Desktop

```text
Sidebar
+
Navbar
+
Main Content
```

## Mobile

```text
Top Navbar
+
Main Content
+
Bottom Navigation
```

Tidak boleh ada horizontal overflow.

---

# 🧱 Project Architecture

```text
assets/
├── css/
├── js/
│   ├── components/
│   ├── modules/
│   └── charts/
│
components/
pages/
data/
```

Application entry point:

```text
index.html
```

Application bootstrapping:

```text
assets/js/app.js
```

---

# ⚙️ Configuration Driven

Sebisa mungkin seluruh hal yang bersifat configurable disimpan di configuration.

Contoh:

```javascript
navigationConfig
categoryConfig
appConfig
featureConfig
```

Contoh navigation:

```javascript
{
    id: "todo",
    label: "Todo",
    icon: "check_box",
    route: "/todo"
}
```

Menambahkan menu tidak boleh membutuhkan perubahan HTML.

---

# 🛣️ SPA Routing

Aplikasi menggunakan **hash routing** secara default agar aman di static server mana pun:

```text
/#/dashboard
/#/todo
/#/schedule
/#/calendar
/#/activity
/#/hydration
/#/meal
/#/statistics
/#/quotes
/#/games
/#/settings
```

Dengan hash routing:

* refresh halaman tetap aman
* tidak perlu SPA rewrite di server
* tidak akan muncul error `Cannot GET /dashboard`
* tetap menggunakan `index.html` sebagai shell

Jika dibuka lewat deep-link yang sudah didukung server (mis. Netlify dengan redirect), router otomatis memakai History API (`/dashboard` tanpa hash).

Netlify fallback tetap disediakan:

```text
/* /index.html 200
```

---

# 💾 Data Storage

Persistence menggunakan:

```text
LocalStorage
```

Contoh key:

```text
pinkyplan_user
pinkyplan_settings
pinkyplan_schedules
pinkyplan_todos
pinkyplan_categories
pinkyplan_hydration
```

Jangan melakukan direct LocalStorage access secara acak di seluruh aplikasi.

Gunakan:

```text
storage.js
```

sebagai abstraction layer.

---

# 📦 JSON Import / Export

PinkyPlan dapat mengekspor semua data menjadi:

```text
pinkyplan-backup-YYYY-MM-DD.json
```

Import JSON harus melakukan:

1. Parse
2. Validation
3. Version check
4. Confirmation
5. Save

Jangan overwrite data tanpa konfirmasi user.

---

# 👤 User Profile

Initial user:

```text
Arif
Arum
```

Arif:

```text
PIN: 181203
Theme: Blue 💙
```

Arum:

```text
No PIN
Theme: Pink 💗
```

Authentication hanya bersifat local profile selection.

Tidak digunakan untuk keamanan server.

## 🎨 Dual Theme per User

Tema warna otomatis mengikuti user yang login:

| User | Theme | Warna utama |
|------|-------|-------------|
| Arif | `blue` | `#4DA6FF` |
| Arum | `pink` | `#FF69B4` |

Theme dapat juga diganti manual di **Settings → Theme**.

---

# 💛 Support / Trakteer

Dukung pengembangan PinkyPlan melalui:

```text
https://trakteer.id/itsmebroarif/tip?open=true
```

Tautan tersedia di **Settings → Support**.

---

# 📦 Dependencies

Gunakan dependency seminimal mungkin.

Core:

```text
HTML5
CSS3
JavaScript ES Modules
```

Additional:

```text
Material UI
D3.js
Three.js
```

Jangan menambahkan library hanya untuk hal yang dapat dilakukan menggunakan native browser API.

---

# 🧑‍💻 Development Principles

Ikuti prinsip:

```text
Single Responsibility
Separation of Concerns
DRY
Reusable Components
Centralized State
Centralized Storage
Configuration Driven
Mobile First
Progressive Enhancement
```

Hindari:

```text
Huge app.js
Huge index.html
Global variables
Duplicated logic
Inline JavaScript
Hardcoded navigation
Hardcoded categories
```

---

# 📝 Code Documentation

Function penting harus memiliki JSDoc.

Contoh:

```javascript
/**
 * Mengambil daftar Todo dari application state.
 *
 * @returns {Array} Daftar Todo.
 */
export function getTodos() {
    // ...
}
```

Komentar harus menjelaskan:

* tujuan function
* parameter
* return value
* side effect

Jangan memberi komentar pada setiap baris kode tanpa alasan.

---

# 🚀 Local Development

Karena project menggunakan ES Modules dan `fetch()`, jalankan menggunakan local HTTP server.

Contoh:

```bash
python -m http.server 8080
```

Kemudian buka:

```text
http://localhost:8080
```

Jangan membuka project melalui:

```text
file://
```

karena browser dapat membatasi module loading dan `fetch()`.

---

# 🌐 Netlify Deployment

Project ini dirancang untuk static deployment.

Pastikan tersedia:

```text
netlify.toml
```

dengan fallback:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Setelah deployment:

```text
https://your-project.netlify.app
```

Seluruh SPA route harus tetap dapat dibuka langsung.

---

# 📱 PWA

Project dapat menggunakan:

```text
manifest.json
service-worker.js
```

Tujuannya:

* installable
* offline-friendly
* standalone mode
* cached assets

---

# 🧪 Testing Checklist

Sebelum deployment, pastikan:

```text
[ ] Login Arif bekerja
[ ] PIN Arif bekerja
[ ] Login Arum bekerja
[ ] Dashboard tampil
[ ] Todo CRUD bekerja
[ ] Schedule CRUD bekerja
[ ] Group bekerja
[ ] Nested Todo bekerja
[ ] Calendar bekerja
[ ] Calendar marking bekerja
[ ] Category bekerja
[ ] Dynamic navigation bekerja
[ ] Hydration bekerja
[ ] Quote bekerja
[ ] D3 chart bekerja
[ ] Three.js fallback bekerja
[ ] Import JSON bekerja
[ ] Export JSON bekerja
[ ] LocalStorage bekerja
[ ] SPA routing bekerja
[ ] Browser refresh pada route tidak error
[ ] Mobile layout bekerja
[ ] Desktop layout bekerja
[ ] Tidak ada horizontal overflow
[ ] PWA bekerja
[ ] Netlify deployment bekerja
```

---

# 🧠 Maintenance

Ketika ingin menambahkan fitur:

### Menu

Ubah:

```text
navigationConfig
```

### Category / Badge

Ubah:

```text
categories.json
```

### Quote

Ubah:

```text
quotes.json
```

### Feature Toggle

Ubah:

```text
appConfig
```

### Route

Ubah:

```text
route configuration
```

Jangan membuat menu, route, badge, dan category dengan hardcoded HTML apabila dapat dibuat melalui configuration.

---

# 📁 Architecture Philosophy

PinkyPlan menggunakan pendekatan:

```text
Static SPA
     +
Vanilla JS Modules
     +
Component Loader
     +
Centralized State
     +
LocalStorage
     +
JSON
     +
Configuration Driven UI
```

Tujuannya adalah membuat aplikasi yang:

```text
Easy to Understand
Easy to Extend
Easy to Debug
Easy to Deploy
Easy to Backup
Easy to Maintain
```

---

# 🎀 Final Vision

PinkyPlan bukan sekadar Todo List.

Targetnya adalah menjadi:

```text
Personal Planner
+
Schedule Manager
+
Habit / Activity Tracker
+
Hydration Tracker
+
Calendar
+
Productivity Dashboard
```

dengan visual:

```text
🩷 Cute
💜 Retro
🎀 Pixel Art
🕹️ 8-bit
⬛ Neo-Brutalism
📱 Mobile First
🧱 Material Design
✨ Animated
```

tetapi tetap:

```text
Fast
Simple
Maintainable
Responsive
Static
JSON Driven
Netlify Ready
```

> **"Plan it. Do it. Check it. Drink water. Repeat. 💧🎀"**

---

# 📝 Changelog

Semua perubahan penting dicatat di sini.

## [1.0.0] — 2026-09-23

### Added

- Implementasi lengkap sesuai `prd.md` — Static SPA tanpa backend/database.
- Login profile selection: **Arif** (PIN `181203`) & **Arum** (tanpa PIN).
- **Dual theme**: login Arif → theme biru 💙, login Arum → theme pink 💗 (bisa diganti manual di Settings).
- Dashboard (greeting, daily quote, progress, quick todo, schedule, hydration, quick stats).
- Todo CRUD + filter (all/pending/done/today/high) + progress bar.
- Schedule CRUD + **Group** + nested todo di dalam group.
- Calendar bulanan dengan **marking** jadwal per kategori + klik tanggal.
- Activity / Category configurable (`data/categories.json` + modal CRUD).
- Hydration tracker (goal, gelas, reminder schedule, reset).
- Daily quote deterministik dari `data/quotes.json`.
- Statistics dengan **D3.js** (productivity, category pie, completion rate, hydration) + fallback non-D3.
- **Three.js** decorative background particles (optional, lazy-load, fallback aman).
- Settings: theme, animation, notifikasi, hydration goal, **JSON import/export**, reset data, about.
- **Support section** → tautan Trakteer `https://trakteer.id/itsmebroarif/tip?open=true`.
- Layout responsive: **desktop sidebar + navbar**, **mobile top navbar + bottom navigation + FAB quick add**.
- PWA: `manifest.json` + `sw.js` cache offline-friendly.
- Netlify ready: `netlify.toml` + `_redirects` SPA fallback.
- Empty state, error state, toast, modal konfirmasi, JSDoc pada function penting.
- Struktur modular: `config/storage/store/router/theme` + `modules/*` + `components/*`.

### Fixed

- **`Cannot GET /dashboard`** — router default sekarang **hash routing** (`/#/dashboard`) sehingga refresh / buka URL tidak lagi request path ke server; History API hanya dipakai jika server sudah mendukung deep-link.
- Reset data & import JSON wajib konfirmasi.
- Klik link internal SPA tanpa full page reload.

---

## [1.1.0] — 2026-09-23

### Added

- **Quote Indonesia bertema pacaran sehat** — `data/quotes.json` + fallback diganti 30 quote ID; fetch selalu ulang (cache English lama diabaikan).
- **Meal Tracker** (`/#/meal`):
  - Target minimal **3× makan/hari** (boleh lebih), progress bar, preset cepat.
  - Tambah/hapus meal (nama, jam, catatan).
  - **Download PNG** daftar makan hari ini (canvas, theme-aware).
  - **Warning jam 20:00** bila masih &lt; 3× (toast 1×/hari + banner di Meal & Dashboard).
  - Widget **Meal Hari Ini** di dashboard; quick-add via FAB.
  - Ikut **export/import JSON** + reset data.
- **Menu Games** (`/#/games`) — Material Design 3, hero gradient vibrant:
  - **3 world 3D full Three.js**: 🌳 Keliling Taman, 🖥️ Area Server, 🏙️ Keliling Kota.
  - Mode **jalan-jalan santai**, tanpa game over.
  - Kontrol desktop: **WASD/panah + mouse drag/pointer lock + Shift lari**.
  - Kontrol mobile **portrait**: **analog virtual** kiri, geser layar untuk look, tombol 🚀 lari.
  - HUD MD3 (keluar, koordinat, toggle lari), fog, lampu, animasi LED/neon, head-bob.
  - Three.js lazy-load dari CDN dengan fallback error toast.

### Changed

- Navigasi desktop/mobile bertambah item **Games** via `navigationConfig` (tanpa ubah HTML).
- `formatDateShort()` default ke `new Date()` (perbaiki `Invalid time value` di download meal).


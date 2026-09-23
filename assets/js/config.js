/**
 * Konfigurasi pusat aplikasi PinkyPlan (Configuration Driven).
 * Menu, route, user, fitur, dan link support dikelola dari sini
 * tanpa perlu mengubah HTML.
 */

export const appConfig = {
    appName: "PinkyPlan",
    tagline: "Organize your day, one cute task at a time.",
    version: "1.0.0",
    storagePrefix: "pinkyplan",
    features: {
        threeJs: true,
        d3: true,
        hydration: true,
        meal: true,
        games: true,
        notifications: true,
        music: true,
        pwa: false
    }
};

/**
 * Daftar user profile + tema warna masing-masing.
 * Arif = biru, Arum = pink.
 */
export const userConfig = {
    arif: {
        id: "arif",
        name: "Arif",
        icon: "👨",
        pin: "181203",
        theme: "blue",
        greetingName: "Arif"
    },
    arum: {
        id: "arum",
        name: "Arum",
        icon: "👩",
        pin: null,
        theme: "pink",
        greetingName: "Arum"
    }
};

/**
 * Navigasi dinamis — tambah item di sini untuk menambah menu + route.
 * mobile:false menyembunyikan item dari bottom navigation.
 */
export const navigationConfig = [
    { id: "dashboard", label: "Dashboard", icon: "🏠", route: "/dashboard", mobile: true, desktop: true },
    { id: "todo", label: "Todo", icon: "📋", route: "/todo", mobile: true, desktop: true },
    { id: "habits", label: "Habits", icon: "🌱", route: "/habits", mobile: false, desktop: true },
    { id: "schedule", label: "Schedule", icon: "📅", route: "/schedule", mobile: false, desktop: true },
    { id: "calendar", label: "Calendar", icon: "🗓️", route: "/calendar", mobile: true, desktop: true },
    { id: "activity", label: "Activity", icon: "🎯", route: "/activity", mobile: false, desktop: true },
    { id: "hydration", label: "Hydration", icon: "💧", route: "/hydration", mobile: false, desktop: true },
    { id: "meal", label: "Meal", icon: "🍽️", route: "/meal", mobile: false, desktop: true },
    { id: "statistics", label: "Statistics", icon: "📊", route: "/statistics", mobile: false, desktop: true },
    { id: "quotes", label: "Quotes", icon: "💬", route: "/quotes", mobile: false, desktop: true },
    { id: "games", label: "Games", icon: "🎮", route: "/games", mobile: true, desktop: true },
    { id: "settings", label: "Settings", icon: "⚙️", route: "/settings", mobile: true, desktop: true }
];

/**
 * Item bottom navigation mobile (maksimal 5 termasuk "More").
 */
export const mobileNavConfig = [
    { id: "dashboard", label: "Home", icon: "🏠", route: "/dashboard" },
    { id: "todo", label: "Todo", icon: "📋", route: "/todo" },
    { id: "add", label: "Add", icon: "➕", action: "quick-add" },
    { id: "calendar", label: "Calendar", icon: "🗓️", route: "/calendar" },
    { id: "more", label: "More", icon: "✨", action: "more-menu" }
];

/**
 * Category default — bisa ditimpa dari data/categories.json atau LocalStorage.
 */
export const defaultCategories = [
    { id: "exercise", name: "Olahraga", icon: "🏃", color: "#FF69B4", active: true },
    { id: "vacation", name: "Liburan", icon: "🏖️", color: "#9B5DE5", active: true },
    { id: "study", name: "Belajar", icon: "📚", color: "#4DA6FF", active: true },
    { id: "work", name: "Kerja", icon: "💼", color: "#E94E9A", active: true },
    { id: "fun", name: "Hiburan", icon: "🎮", color: "#6C3BB5", active: true },
    { id: "home", name: "Rumah", icon: "🧹", color: "#F59E0B", active: true },
    { id: "personal", name: "Personal", icon: "💡", color: "#10B981", active: true },
    { id: "shopping", name: "Belanja", icon: "🛒", color: "#F472B6", active: true }
];

/**
 * Konfigurasi hydration default.
 */
export const hydrationConfig = {
    dailyGoal: 8,
    glassSize: 250,
    unit: "ml",
    reminders: ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"]
};

/**
 * Konfigurasi meal tracker — minimal 3× makan per hari (boleh lebih).
 */
export const mealConfig = {
    dailyMin: 3,
    warnHour: 20,
    presets: ["Sarapan", "Makan Siang", "Makan Malam", "Camilan", "Minum Susu"]
};

/**
 * Link support / donasi.
 */
export const supportConfig = {
    trakteerUrl: "https://trakteer.id/itsmebroarif/tip?open=true",
    trakteerLabel: "Trakteer — Tip untuk Arif ☕"
};

/**
 * Konfigurasi Send Summary Report (WhatsApp).
 * Nomor tujuan otomatis dipilih berdasarkan user yang login.
 */
export const reportConfig = {
    /** Login Arum → kirim ke nomor ini */
    arum: {
        phone: "6285817048266",
        label: "Arum"
    },
    /** Login Arif → kirim ke nomor ini */
    arif: {
        phone: "6281318192351",
        label: "Arif"
    },
    /** Fallback bila belum login */
    default: {
        phone: "081318192351",
        label: "Arif"
    }
};

/**
 * Konfigurasi background music (backsound).
 * Folder MP3: assets/music/ — auto-detect via /api/music atau manifest.json.
 * Dokumentasi lengkap: assets/music/README.md
 */
export const musicConfig = {
    /** Folder relatif tempat user menaruh file MP3. */
    folder: "assets/music",
    /** Endpoint auto-scan (local dev / Express). */
    apiEndpoint: "/api/music",
    /** Fallback manifest untuk static hosting (Netlify/Vercel). */
    manifestUrl: "assets/music/manifest.json",
    /** Ekstensi yang di-scan. */
    extensions: [".mp3", ".m4a", ".ogg", ".wav"],
    /** Volume default 0..1. */
    defaultVolume: 0.32,
    /** Coba autoplay backsound. */
    autoplay: true,
    /** Loop playlist. */
    loop: true
};

/**
 * Prioritas todo.
 */
export const priorityConfig = [
    { id: "low", label: "Low", color: "#10B981" },
    { id: "medium", label: "Medium", color: "#F59E0B" },
    { id: "high", label: "High", color: "#E94E9A" }
];

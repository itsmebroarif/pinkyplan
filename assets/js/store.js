/**
 * Centralized application state + persistence via storage.js.
 * Seluruh data utama dibaca/ditulis lewat store agar tidak tersebar.
 */
import { storage } from "./storage.js";
import { defaultCategories, hydrationConfig, musicConfig } from "./config.js";
import { uid, toISODate } from "./helpers.js";

/** Default daily habits untuk pengguna baru */
export const defaultHabits = [
    {
        id: "hab-1",
        name: "Minum 2L Air Putih",
        icon: "💧",
        color: "#4DA6FF",
        completedDates: [],
        createdAt: new Date().toISOString()
    },
    {
        id: "hab-2",
        name: "Olahraga / Stretching",
        icon: "🏃",
        color: "#FF69B4",
        completedDates: [],
        createdAt: new Date().toISOString()
    },
    {
        id: "hab-3",
        name: "Membaca / Belajar 15 Menit",
        icon: "📚",
        color: "#9B5DE5",
        completedDates: [],
        createdAt: new Date().toISOString()
    },
    {
        id: "hab-4",
        name: "Tidur Teratur & Cukup",
        icon: "🌙",
        color: "#F59E0B",
        completedDates: [],
        createdAt: new Date().toISOString()
    }
];

/** @type {Object} State aplikasi tunggal. */
const appState = {
    currentUser: null,
    currentRoute: "/dashboard",
    categories: [],
    todos: [],
    schedules: [],
    habits: [],
    hydration: null,
    meals: [],
    settings: {},
    quotes: [],
    statsHistory: {},
    pomodoroStats: {}
};

const listeners = new Set();

/**
 * Subscribe ke perubahan state.
 *
 * @param {Function} cb - Callback(state).
 * @returns {Function} Unsubscribe.
 */
export function subscribe(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

/**
 * Notifikasi seluruh subscriber atas perubahan state.
 */
function notify() {
    listeners.forEach((cb) => {
        try {
            cb(appState);
        } catch (error) {
            console.error("store subscriber error:", error);
        }
    });
}

/**
 * Load seluruh data dari LocalStorage ke state.
 */
export function loadState() {
    appState.currentUser = storage.get("activeUser", null);
    appState.categories = storage.get("categories", defaultCategories);
    appState.todos = storage.get("todos", []);
    appState.schedules = storage.get("schedules", []);
    appState.habits = storage.get("habits", defaultHabits);
    const settingsDefaults = {
        theme: null,
        animation: true,
        notifications: false,
        hydrationGoal: hydrationConfig.dailyGoal,
        musicEnabled: true,
        musicAutoplay: musicConfig.autoplay,
        musicVolume: musicConfig.defaultVolume,
        musicTrackIndex: 0
    };
    appState.settings = { ...settingsDefaults, ...storage.get("settings", {}) };
    appState.quotes = storage.get("quotes", []);
    appState.statsHistory = storage.get("statsHistory", {});
    appState.meals = storage.get("meals", []);

    const today = toISODate();
    const savedHydration = storage.get("hydration", null);
    if (!savedHydration || savedHydration.date !== today) {
        appState.hydration = {
            date: today,
            count: 0,
            goal: appState.settings.hydrationGoal || hydrationConfig.dailyGoal,
            log: []
        };
        persistHydration();
    } else {
        appState.hydration = savedHydration;
    }

    const savedPomodoro = storage.get("pomodoroStats", null);
    if (!savedPomodoro || savedPomodoro.date !== today) {
        appState.pomodoroStats = {
            date: today,
            completedToday: 0,
            sessions: []
        };
        storage.set("pomodoroStats", appState.pomodoroStats);
    } else {
        appState.pomodoroStats = savedPomodoro;
    }

    notify();
}

/**
 * Simpan seluruh state kolektif (kecuali currentUser).
 */
function persistAll() {
    storage.set("categories", appState.categories);
    storage.set("todos", appState.todos);
    storage.set("schedules", appState.schedules);
    storage.set("habits", appState.habits);
    storage.set("settings", appState.settings);
    storage.set("quotes", appState.quotes);
    storage.set("statsHistory", appState.statsHistory);
    storage.set("meals", appState.meals);
    storage.set("pomodoroStats", appState.pomodoroStats);
}

/** @returns {Object} Salinan state saat ini. */
export function getState() {
    return { ...appState };
}

/**
 * Set user aktif + persist.
 *
 * @param {Object|null} user - User profile.
 */
export function setCurrentUser(user) {
    appState.currentUser = user;
    if (user) storage.set("activeUser", user);
    else storage.remove("activeUser");
    notify();
}

/**
 * Set route aktif di state.
 *
 * @param {string} route - Path route.
 */
export function setCurrentRoute(route) {
    appState.currentRoute = route;
    notify();
}

/* ---------------- Categories ---------------- */

/**
 * @returns {Array} Daftar kategori aktif.
 */
export function getCategories() {
    return appState.categories.filter((c) => c.active !== false);
}

/**
 * Tambah kategori baru.
 *
 * @param {{name:string, icon?:string, color?:string}} data - Data kategori.
 * @returns {Object} Kategori baru.
 */
export function addCategory(data) {
    const cat = {
        id: data.id || uid("CAT"),
        name: data.name,
        icon: data.icon || "🏷️",
        color: data.color || "#FF69B4",
        active: true
    };
    appState.categories.push(cat);
    storage.set("categories", appState.categories);
    notify();
    return cat;
}

/**
 * Update kategori by id.
 *
 * @param {string} id - ID kategori.
 * @param {Object} patch - Field yang diubah.
 */
export function updateCategory(id, patch) {
    const idx = appState.categories.findIndex((c) => c.id === id);
    if (idx === -1) return;
    appState.categories[idx] = { ...appState.categories[idx], ...patch };
    storage.set("categories", appState.categories);
    notify();
}

/**
 * Hapus kategori by id.
 *
 * @param {string} id - ID kategori.
 */
export function removeCategory(id) {
    appState.categories = appState.categories.filter((c) => c.id !== id);
    storage.set("categories", appState.categories);
    notify();
}

/**
 * Cari kategori by id.
 *
 * @param {string} id - ID kategori.
 * @returns {Object|undefined}
 */
export function getCategory(id) {
    return appState.categories.find((c) => c.id === id);
}

/* ---------------- Todos ---------------- */

/**
 * @returns {Array} Seluruh todo.
 */
export function getTodos() {
    return appState.todos;
}

/**
 * Tambah todo.
 *
 * @param {Object} data - Data todo.
 * @returns {Object} Todo baru.
 */
export function addTodo(data) {
    const todo = {
        id: uid("TODO"),
        title: data.title.trim(),
        description: data.description || "",
        date: data.date || toISODate(),
        priority: data.priority || "medium",
        status: "pending",
        categoryId: data.categoryId || null,
        scheduleId: data.scheduleId || null,
        groupId: data.groupId || null,
        createdAt: new Date().toISOString()
    };
    appState.todos.push(todo);
    storage.set("todos", appState.todos);
    recordStat(todo.date);
    notify();
    return todo;
}

/**
 * Update todo by id.
 *
 * @param {string} id - ID todo.
 * @param {Object} patch - Perubahan field.
 */
export function updateTodo(id, patch) {
    const idx = appState.todos.findIndex((t) => t.id === id);
    if (idx === -1) return;
    appState.todos[idx] = { ...appState.todos[idx], ...patch };
    storage.set("todos", appState.todos);
    notify();
}

/**
 * Toggle status selesai/belum.
 *
 * @param {string} id - ID todo.
 * @returns {Object|undefined} Todo hasil update.
 */
export function toggleTodo(id) {
    const todo = appState.todos.find((t) => t.id === id);
    if (!todo) return undefined;
    todo.status = todo.status === "done" ? "pending" : "done";
    storage.set("todos", appState.todos);
    recordStat(todo.date);
    notify();
    return todo;
}

/**
 * Hapus todo by id.
 *
 * @param {string} id - ID todo.
 */
export function removeTodo(id) {
    appState.todos = appState.todos.filter((t) => t.id !== id);
    storage.set("todos", appState.todos);
    notify();
}

/**
 * Filter todo berdasarkan kriteria.
 *
 * @param {{date?:string, scheduleId?:string, groupId?:string, status?:string, categoryId?:string}} filters
 * @returns {Array}
 */
export function filterTodos(filters = {}) {
    return appState.todos.filter((t) => {
        if (filters.date && t.date !== filters.date) return false;
        if (filters.scheduleId && t.scheduleId !== filters.scheduleId) return false;
        if (filters.groupId && t.groupId !== filters.groupId) return false;
        if (filters.status && t.status !== filters.status) return false;
        if (filters.categoryId && t.categoryId !== filters.categoryId) return false;
        return true;
    });
}

/* ---------------- Schedules ---------------- */

/**
 * @returns {Array} Seluruh schedule.
 */
export function getSchedules() {
    return appState.schedules;
}

/**
 * Tambah schedule beserta groups default.
 *
 * @param {Object} data - Data schedule.
 * @returns {Object} Schedule baru.
 */
export function addSchedule(data) {
    const schedule = {
        id: uid("SCH"),
        date: data.date || toISODate(),
        endDate: data.endDate && data.endDate >= (data.date || toISODate()) ? data.endDate : null,
        startTime: data.startTime || "09:00",
        endTime: data.endTime || "10:00",
        title: data.title.trim(),
        description: data.description || "",
        categoryId: data.categoryId || null,
        icon: data.icon || "📅",
        status: "active",
        groups: data.groups || [{ id: uid("GRP"), title: "Tasks", todos: [] }],
        createdAt: new Date().toISOString()
    };
    appState.schedules.push(schedule);
    storage.set("schedules", appState.schedules);
    notify();
    return schedule;
}

/**
 * Update schedule by id.
 *
 * @param {string} id - ID schedule.
 * @param {Object} patch - Perubahan field.
 */
export function updateSchedule(id, patch) {
    const idx = appState.schedules.findIndex((s) => s.id === id);
    if (idx === -1) return;
    appState.schedules[idx] = { ...appState.schedules[idx], ...patch };
    storage.set("schedules", appState.schedules);
    notify();
}

/**
 * Hapus schedule + todo yang terkait.
 *
 * @param {string} id - ID schedule.
 */
export function removeSchedule(id) {
    appState.schedules = appState.schedules.filter((s) => s.id !== id);
    appState.todos = appState.todos.filter((t) => t.scheduleId !== id);
    storage.set("schedules", appState.schedules);
    storage.set("todos", appState.todos);
    notify();
}

/**
 * Schedule berdasarkan tanggal.
 * Mendukung schedule single-day maupun rentang (endDate).
 *
 * @param {string} date - ISO date.
 * @returns {Array}
 */
export function getSchedulesByDate(date) {
    return appState.schedules
        .filter((s) => {
            if (s.date === date) return true;
            if (s.endDate && s.date <= date && date <= s.endDate) return true;
            return false;
        })
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/**
 * Schedule berdasarkan rentang tanggal.
 *
 * @param {string} startDate - ISO date (YYYY-MM-DD).
 * @param {string} endDate - ISO date (YYYY-MM-DD).
 * @returns {Array}
 */
export function getSchedulesByRange(startDate, endDate) {
    return appState.schedules
        .filter((s) => {
            const sStart = s.date;
            const sEnd = s.endDate || s.date;
            return sStart <= endDate && sEnd >= startDate;
        })
        .sort((a, b) => {
            const dc = a.date.localeCompare(b.date);
            if (dc !== 0) return dc;
            return a.startTime.localeCompare(b.startTime);
        });
}

/**
 * Tambah group ke schedule.
 *
 * @param {string} scheduleId - ID schedule.
 * @param {string} title - Judul group.
 * @returns {Object|undefined} Group baru.
 */
export function addGroup(scheduleId, title) {
    const schedule = appState.schedules.find((s) => s.id === scheduleId);
    if (!schedule) return undefined;
    const group = { id: uid("GRP"), title: title.trim(), todos: [] };
    schedule.groups.push(group);
    storage.set("schedules", appState.schedules);
    notify();
    return group;
}

/**
 * Hapus group + todo di dalamnya.
 *
 * @param {string} scheduleId - ID schedule.
 * @param {string} groupId - ID group.
 */
export function removeGroup(scheduleId, groupId) {
    const schedule = appState.schedules.find((s) => s.id === scheduleId);
    if (!schedule) return;
    schedule.groups = schedule.groups.filter((g) => g.id !== groupId);
    appState.todos = appState.todos.filter((t) => t.groupId !== groupId);
    storage.set("schedules", appState.schedules);
    storage.set("todos", appState.todos);
    notify();
}

/* ---------------- Hydration ---------------- */

/**
 * @returns {Object} State hydration hari ini.
 */
export function getHydration() {
    return appState.hydration;
}

/**
 * Tambah satu gelas air.
 *
 * @returns {Object} Hydration terbaru.
 */
export function addWater() {
    ensureHydrationDate();
    if (appState.hydration.count < appState.hydration.goal) {
        appState.hydration.count += 1;
        appState.hydration.log.push(new Date().toISOString());
        persistHydration();
        recordStat(appState.hydration.date, { water: true });
        notify();
    }
    return appState.hydration;
}

/**
 * Kurangi satu gelas air.
 *
 * @returns {Object} Hydration terbaru.
 */
export function removeWater() {
    ensureHydrationDate();
    if (appState.hydration.count > 0) {
        appState.hydration.count -= 1;
        appState.hydration.log.pop();
        persistHydration();
        notify();
    }
    return appState.hydration;
}

/**
 * Reset hydration hari ini.
 */
export function resetWater() {
    ensureHydrationDate();
    appState.hydration.count = 0;
    appState.hydration.log = [];
    persistHydration();
    notify();
}

/**
 * Set goal harian.
 *
 * @param {number} goal - Target gelas.
 */
export function setHydrationGoal(goal) {
    appState.settings.hydrationGoal = goal;
    storage.set("settings", appState.settings);
    ensureHydrationDate();
    appState.hydration.goal = goal;
    persistHydration();
    notify();
}

function ensureHydrationDate() {
    const today = toISODate();
    if (!appState.hydration || appState.hydration.date !== today) {
        appState.hydration = {
            date: today,
            count: 0,
            goal: appState.settings.hydrationGoal || hydrationConfig.dailyGoal,
            log: []
        };
    }
}

function persistHydration() {
    storage.set("hydration", appState.hydration);
}

/* ---------------- Meals ---------------- */

/**
 * Meal pada tanggal tertentu.
 *
 * @param {string} [date=toISODate()] - ISO date.
 * @returns {Array} Daftar meal (urut waktu).
 */
export function getMealsByDate(date = toISODate()) {
    return appState.meals
        .filter((m) => m.date === date)
        .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
}

/**
 * Tambah meal.
 *
 * @param {{name:string, time?:string, note?:string, date?:string}} data - Data meal.
 * @returns {Object} Meal baru.
 */
export function addMeal(data) {
    const now = new Date();
    const meal = {
        id: uid("MEA"),
        date: data.date || toISODate(),
        name: data.name.trim(),
        time:
            data.time ||
            `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
        note: data.note || "",
        createdAt: now.toISOString()
    };
    appState.meals.push(meal);
    storage.set("meals", appState.meals);
    notify();
    return meal;
}

/**
 * Hapus meal by id.
 *
 * @param {string} id - ID meal.
 */
export function removeMeal(id) {
    appState.meals = appState.meals.filter((m) => m.id !== id);
    storage.set("meals", appState.meals);
    notify();
}

/* ---------------- Settings ---------------- */

/**
 * Update settings parsial.
 *
 * @param {Object} patch - Field settings.
 */
export function updateSettings(patch) {
    appState.settings = { ...appState.settings, ...patch };
    storage.set("settings", appState.settings);
    notify();
}

/* ---------------- Stats history ---------------- */

/**
 * Catat aktivitas harian untuk chart statistik.
 *
 * @param {string} date - ISO date.
 * @param {{water?:boolean}} [opts] - Opsi tambahan.
 */
function recordStat(date, opts = {}) {
    const entry = appState.statsHistory[date] || { completed: 0, water: 0 };
    if (opts.water) entry.water += 1;
    else entry.completed = filterTodos({ date, status: "done" }).length;
    appState.statsHistory[date] = entry;
    storage.set("statsHistory", appState.statsHistory);
}

/**
 * @returns {Object} History statistik.
 */
export function getStatsHistory() {
    return appState.statsHistory;
}

/* ---------------- Daily Habits & Streak Tracking ---------------- */

/**
 * Hitung streak habits (current streak, best streak, total, status hari ini).
 *
 * @param {string[]} completedDates - Array of ISO date string "YYYY-MM-DD".
 * @returns {{currentStreak: number, bestStreak: number, totalCompletions: number, isCompletedToday: boolean}}
 */
export function calculateHabitStreak(completedDates = []) {
    if (!completedDates || !completedDates.length) {
        return { currentStreak: 0, bestStreak: 0, totalCompletions: 0, isCompletedToday: false };
    }

    const todayStr = toISODate();
    const dateSet = new Set(completedDates);
    const isCompletedToday = dateSet.has(todayStr);

    // Hitung current streak
    let currentStreak = 0;
    const checkDate = new Date();

    // Jika hari ini belum dicentang, cek apakah kemarin selesai (streak tetap hidup)
    if (!dateSet.has(toISODate(checkDate))) {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    while (dateSet.has(toISODate(checkDate))) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
    }

    // Hitung best streak sepanjang masa
    const sorted = Array.from(dateSet).sort();
    let bestStreak = 0;
    let currentRun = 0;
    let prevDate = null;

    sorted.forEach((dateStr) => {
        const d = new Date(dateStr + "T00:00:00");
        if (prevDate) {
            const diffDays = Math.round((d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                currentRun++;
            } else if (diffDays > 1) {
                currentRun = 1;
            }
        } else {
            currentRun = 1;
        }
        if (currentRun > bestStreak) bestStreak = currentRun;
        prevDate = d;
    });

    return {
        currentStreak,
        bestStreak: Math.max(bestStreak, currentStreak),
        totalCompletions: completedDates.length,
        isCompletedToday
    };
}

/**
 * Ambil daftar seluruh habits dengan kalkulasi streak masing-masing.
 *
 * @returns {Array} Daftar habits.
 */
export function getHabits() {
    return (appState.habits || []).map((h) => {
        const streakData = calculateHabitStreak(h.completedDates || []);
        return {
            ...h,
            ...streakData
        };
    });
}

/**
 * Tambah Habit baru.
 *
 * @param {Object} data - { name, icon, color, description }
 * @returns {Object} Habit baru.
 */
export function addHabit(data) {
    const habit = {
        id: uid("HAB"),
        name: data.name,
        icon: data.icon || "🌱",
        color: data.color || "#FF69B4",
        description: data.description || "",
        completedDates: [],
        createdAt: new Date().toISOString()
    };
    appState.habits.push(habit);
    storage.set("habits", appState.habits);
    notify();
    return habit;
}

/**
 * Update data Habit.
 *
 * @param {string} id - ID habit.
 * @param {Object} patch - Field yang diupdate.
 * @returns {Object|null}
 */
export function updateHabit(id, patch) {
    const h = appState.habits.find((x) => x.id === id);
    if (!h) return null;
    Object.assign(h, patch);
    storage.set("habits", appState.habits);
    notify();
    return h;
}

/**
 * Hapus Habit.
 *
 * @param {string} id - ID habit.
 */
export function removeHabit(id) {
    appState.habits = appState.habits.filter((h) => h.id !== id);
    storage.set("habits", appState.habits);
    notify();
}

/**
 * Toggle status penyelesaian habit pada tanggal tertentu (ISO "YYYY-MM-DD").
 *
 * @param {string} habitId - ID habit.
 * @param {string} [date] - ISO date string (default hari ini).
 * @returns {{completed: boolean, streak: Object}}
 */
export function toggleHabitDate(habitId, date = toISODate()) {
    const habit = appState.habits.find((h) => h.id === habitId);
    if (!habit) return { completed: false, streak: null };

    if (!Array.isArray(habit.completedDates)) {
        habit.completedDates = [];
    }

    const set = new Set(habit.completedDates);
    let completed = false;
    if (set.has(date)) {
        set.delete(date);
        completed = false;
    } else {
        set.add(date);
        completed = true;
    }

    habit.completedDates = Array.from(set).sort();
    storage.set("habits", appState.habits);
    notify();

    const streak = calculateHabitStreak(habit.completedDates);
    return { completed, streak };
}

/* ---------------- Pomodoro Stats ---------------- */

/**
 * Ambil statistik Pomodoro hari ini.
 *
 * @returns {Object}
 */
export function getPomodoroStats() {
    const today = toISODate();
    if (!appState.pomodoroStats || appState.pomodoroStats.date !== today) {
        appState.pomodoroStats = {
            date: today,
            completedToday: 0,
            sessions: []
        };
        storage.set("pomodoroStats", appState.pomodoroStats);
    }
    return appState.pomodoroStats;
}

/**
 * Catat satu sesi Pomodoro selesai.
 *
 * @param {Object} [taskInfo] - { taskId, taskTitle, taskType, durationMinutes }
 */
export function recordPomodoroSession(taskInfo = {}) {
    const stats = getPomodoroStats();
    stats.completedToday = (stats.completedToday || 0) + 1;
    if (!Array.isArray(stats.sessions)) stats.sessions = [];
    stats.sessions.push({
        time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        ...taskInfo
    });
    storage.set("pomodoroStats", appState.pomodoroStats);
    notify();
}

/* ---------------- Import / Export ---------------- */

/**
 * Export seluruh data ke object JSON.
 *
 * @returns {Object} Payload export.
 */
export function exportData() {
    return {
        app: { name: "PinkyPlan", version: "1.0.0" },
        exportedAt: new Date().toISOString(),
        user: appState.currentUser || {},
        settings: appState.settings,
        categories: appState.categories,
        schedules: appState.schedules,
        habits: appState.habits,
        todos: appState.todos,
        hydration: appState.hydration,
        meals: appState.meals,
        statsHistory: appState.statsHistory,
        pomodoroStats: appState.pomodoroStats
    };
}

/**
 * Validasi + import payload JSON ke state & storage.
 *
 * @param {Object} payload - Object hasil JSON.parse.
 * @throws {Error} Jika struktur tidak valid.
 * @returns {boolean} true jika import sukses.
 */
export function importData(payload) {
    if (!payload || typeof payload !== "object") {
        throw new Error("File JSON tidak valid.");
    }
    if (!payload.app || payload.app.name !== "PinkyPlan") {
        throw new Error("Bukan file backup PinkyPlan yang valid.");
    }
    if (!Array.isArray(payload.todos) || !Array.isArray(payload.schedules)) {
        throw new Error("Struktur data tidak lengkap (todos/schedules hilang).");
    }
    appState.categories = Array.isArray(payload.categories) ? payload.categories : defaultCategories;
    appState.todos = payload.todos;
    appState.schedules = payload.schedules;
    if (Array.isArray(payload.habits)) appState.habits = payload.habits;
    if (payload.settings) appState.settings = { ...appState.settings, ...payload.settings };
    if (payload.statsHistory) appState.statsHistory = payload.statsHistory;
    if (Array.isArray(payload.meals)) appState.meals = payload.meals;
    persistAll();
    notify();
    return true;
}

/**
 * Reset seluruh data (kecuali user aktif).
 */
export function resetAllData() {
    appState.categories = [...defaultCategories];
    appState.todos = [];
    appState.schedules = [];
    appState.habits = [...defaultHabits];
    appState.statsHistory = {};
    appState.meals = [];
    appState.settings = { theme: null, animation: true, notifications: false, hydrationGoal: hydrationConfig.dailyGoal };
    appState.hydration = {
        date: toISODate(),
        count: 0,
        goal: hydrationConfig.dailyGoal,
        log: []
    };
    appState.pomodoroStats = { date: toISODate(), completedToday: 0, sessions: [] };
    persistAll();
    persistHydration();
    notify();
}

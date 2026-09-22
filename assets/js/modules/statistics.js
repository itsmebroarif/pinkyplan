/**
 * Statistics page — ringkasan + chart D3.js (lazy load).
 */
import { getTodos, getStatsHistory, getHydration, getCategories, filterTodos, getSchedules } from "../store.js";
import { toISODate, calcProgress, escapeHtml } from "../helpers.js";
import { appConfig } from "../config.js";

/**
 * Render halaman Statistics.
 *
 * @param {HTMLElement} container - Page content.
 */
export async function renderStatisticsPage(container) {
    const todos = getTodos();
    const progress = calcProgress(todos);
    const overdue = todos.filter((t) => t.status === "pending" && t.date < toISODate()).length;
    const hydration = getHydration();

    container.innerHTML = `
        <div class="page-enter">
            <div class="page-header">
                <div>
                    <h1>📊 Statistics</h1>
                    <p class="page-desc">Productivity overview dengan D3.js</p>
                </div>
            </div>

            <div class="stat-grid stagger">
                <div class="stat-box">
                    <div class="stat-icon">✅</div>
                    <div class="stat-value">${progress.done}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-box">
                    <div class="stat-icon">⏳</div>
                    <div class="stat-value">${progress.pending}</div>
                    <div class="stat-label">Pending</div>
                </div>
                <div class="stat-box">
                    <div class="stat-icon">🚨</div>
                    <div class="stat-value">${overdue}</div>
                    <div class="stat-label">Overdue</div>
                </div>
                <div class="stat-box">
                    <div class="stat-icon">💧</div>
                    <div class="stat-value">${hydration.count}</div>
                    <div class="stat-label">Water today</div>
                </div>
            </div>

            <div class="chart-grid" style="margin-top:1.2rem">
                <div class="card hoverable">
                    <div class="card-header">
                        <div class="card-title">📈 Tasks completed / day</div>
                        <span class="badge purple">7 hari</span>
                    </div>
                    <div class="chart-box" id="chart-productivity"><div class="spinner"></div></div>
                </div>

                <div class="card hoverable">
                    <div class="card-header">
                        <div class="card-title">🥧 Category distribution</div>
                    </div>
                    <div class="chart-box" id="chart-category"><div class="spinner"></div></div>
                    <div class="chart-legend" id="legend-category"></div>
                </div>

                <div class="card hoverable">
                    <div class="card-header">
                        <div class="card-title">📊 Completion rate</div>
                    </div>
                    <div class="chart-box" id="chart-completion"><div class="spinner"></div></div>
                    <div class="chart-legend">
                        <span><i style="background:var(--success)"></i> Completed</span>
                        <span><i style="background:var(--warning)"></i> Pending</span>
                        <span><i style="background:var(--danger)"></i> Overdue</span>
                    </div>
                </div>

                <div class="card hoverable">
                    <div class="card-header">
                        <div class="card-title">💧 Hydration by day</div>
                        <span class="badge blue">7 hari</span>
                    </div>
                    <div class="chart-box" id="chart-hydration"><div class="spinner"></div></div>
                </div>
            </div>

            <div class="card hoverable" style="margin-top:1.1rem">
                <div class="card-header">
                    <div class="card-title">📋 Summary</div>
                </div>
                <ul style="font-weight:700;display:grid;gap:0.45rem;font-size:0.95rem">
                    <li>🎯 Total todos: <strong>${todos.length}</strong></li>
                    <li>📅 Total schedules: <strong>${getSchedules().length}</strong></li>
                    <li>🏷️ Active categories: <strong>${getCategories().length}</strong></li>
                    <li>💯 Completion rate: <strong>${progress.percent}%</strong></li>
                </ul>
            </div>
        </div>
    `;

    await renderCharts(container, { todos, progress, overdue });
}

/**
 * Lazy-load D3 + render semua chart.
 *
 * @param {HTMLElement} container - Page content.
 * @param {Object} data - Data statistik.
 */
async function renderCharts(container, data) {
    if (!appConfig.features.d3) {
        paintFallbackCharts(container, data);
        return;
    }

    let d3 = null;
    try {
        if (!window.d3) {
            await loadScript("https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js");
        }
        d3 = window.d3;
    } catch (error) {
        console.warn("D3 gagal dimuat, pakai fallback:", error);
        paintFallbackCharts(container, data);
        return;
    }

    drawProductivityChart(d3, container, data);
    drawCategoryChart(d3, container, data);
    drawCompletionChart(d3, container, data);
    drawHydrationChart(d3, container, data);
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = resolve;
        s.onerror = () => reject(new Error(`Gagal load ${src}`));
        document.head.appendChild(s);
    });
}

function last7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(toISODate(d));
    }
    return days;
}

function drawProductivityChart(d3, container, data) {
    const el = container.querySelector("#chart-productivity");
    if (!el) return;
    el.innerHTML = "";

    const days = last7Days();
    const history = getStatsHistory();
    const series = days.map((iso) => ({
        label: iso.slice(8) + "/" + iso.slice(5, 7),
        value: history[iso]?.completed ?? data.todos.filter((t) => t.date === iso && t.status === "done").length
    }));

    const width = 460, height = 240, m = { top: 20, right: 16, bottom: 40, left: 36 };
    const svg = d3.select(el).append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "img")
        .attr("aria-label", "Grafik task selesai per hari");

    const x = d3.scaleBand().domain(series.map((d) => d.label)).range([m.left, width - m.right]).padding(0.3);
    const y = d3.scaleLinear().domain([0, Math.max(3, d3.max(series, (d) => d.value))]).nice().range([height - m.bottom, m.top]);

    svg.append("g").attr("transform", `translate(0,${height - m.bottom})`)
        .call(d3.axisBottom(x)).selectAll("text").attr("font-size", "10px").attr("font-weight", "700");
    svg.append("g").attr("transform", `translate(${m.left},0)`)
        .call(d3.axisLeft(y).ticks(4)).selectAll("text").attr("font-size", "10px").attr("font-weight", "700");

    svg.selectAll(".bar")
        .data(series)
        .join("rect")
        .attr("class", "bar")
        .attr("x", (d) => x(d.label))
        .attr("width", x.bandwidth())
        .attr("y", (d) => y(d.value))
        .attr("height", (d) => y(0) - y(d.value))
        .attr("fill", "var(--primary)")
        .attr("stroke", "var(--ink)")
        .attr("stroke-width", 2)
        .attr("rx", 4)
        .append("title")
        .text((d) => `${d.value} selesai`);
}

function drawCategoryChart(d3, container, data) {
    const el = container.querySelector("#chart-category");
    const legend = container.querySelector("#legend-category");
    if (!el) return;
    el.innerHTML = "";

    const cats = getCategories();
    const counts = cats
        .map((c) => ({
            label: c.name,
            value: data.todos.filter((t) => t.categoryId === c.id).length,
            color: c.color,
            icon: c.icon
        }))
        .filter((d) => d.value > 0);

    if (!counts.length) {
        el.innerHTML = `<div class="empty-state" style="border:none;box-shadow:none"><div class="empty-icon">🥧</div><p>Belum ada todo berkategori.</p></div>`;
        if (legend) legend.innerHTML = "";
        return;
    }

    const size = 220;
    const svg = d3.select(el).append("svg")
        .attr("viewBox", `0 0 ${size} ${size}`)
        .attr("role", "img")
        .attr("aria-label", "Distribusi kategori");

    const g = svg.append("g").attr("transform", `translate(${size / 2},${size / 2})`);
    const pie = d3.pie().value((d) => d.value).sort(null);
    const arc = d3.arc().innerRadius(55).outerRadius(95);
    const total = d3.sum(counts, (d) => d.value);

    g.selectAll("path")
        .data(pie(counts))
        .join("path")
        .attr("d", arc)
        .attr("fill", (d) => d.data.color)
        .attr("stroke", "var(--ink)")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .append("title")
        .text((d) => `${d.data.label}: ${d.data.value}`);

    g.append("text")
        .attr("text-anchor", "middle")
        .attr("font-size", "22px")
        .attr("font-weight", "900")
        .attr("fill", "var(--secondary-dark)")
        .text(total);

    g.append("text")
        .attr("text-anchor", "middle")
        .attr("y", 18)
        .attr("font-size", "10px")
        .attr("font-weight", "800")
        .attr("fill", "var(--text-muted)")
        .text("todos");

    if (legend) {
        legend.innerHTML = counts
            .map((c) => `<span><i style="background:${c.color}"></i> ${c.icon} ${escapeHtml(c.label)}</span>`)
            .join("");
    }
}

function drawCompletionChart(d3, container, data) {
    const el = container.querySelector("#chart-completion");
    if (!el) return;
    el.innerHTML = "";

    const series = [
        { label: "Completed", value: data.progress.done, color: "var(--success)" },
        { label: "Pending", value: data.progress.pending - data.overdue, color: "var(--warning)" },
        { label: "Overdue", value: Math.max(0, data.overdue), color: "var(--danger)" }
    ].filter((d) => d.value > 0);

    if (!series.length) {
        el.innerHTML = `<div class="empty-state" style="border:none;box-shadow:none"><p>Belum ada data.</p></div>`;
        return;
    }

    const width = 460, height = 220;
    const svg = d3.select(el).append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "img")
        .attr("aria-label", "Completion rate");

    const total = data.progress.total || 1;
    let x0 = 16;
    const barW = width - 32;
    const barH = 50;
    const y = 70;

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 36)
        .attr("text-anchor", "middle")
        .attr("font-size", "28px")
        .attr("font-weight", "900")
        .attr("fill", "var(--secondary-dark)")
        .text(`${data.progress.percent}%`);

    let offset = 0;
    series.forEach((d) => {
        const w = (d.value / total) * barW;
        svg.append("rect")
            .attr("x", 16 + offset)
            .attr("y", y)
            .attr("width", Math.max(0, w))
            .attr("height", barH)
            .attr("fill", d.color)
            .attr("stroke", "var(--ink)")
            .attr("stroke-width", 2)
            .append("title")
            .text(`${d.label}: ${d.value}`);
        offset += w;
    });

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", y + barH + 36)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("font-weight", "800")
        .attr("fill", "var(--text-muted)")
        .text(`${data.progress.done} selesai dari ${data.progress.total} todo`);
}

function drawHydrationChart(d3, container, data) {
    const el = container.querySelector("#chart-hydration");
    if (!el) return;
    el.innerHTML = "";

    const days = last7Days();
    const history = getStatsHistory();
    const todayWater = getHydration().count;
    const series = days.map((iso, i) => ({
        label: iso.slice(8) + "/" + iso.slice(5, 7),
        value: i === days.length - 1 ? todayWater : (history[iso]?.water ?? 0)
    }));

    const width = 460, height = 240, m = { top: 20, right: 16, bottom: 40, left: 36 };
    const svg = d3.select(el).append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "img")
        .attr("aria-label", "Grafik hidrasi 7 hari");

    const x = d3.scaleBand().domain(series.map((d) => d.label)).range([m.left, width - m.right]).padding(0.3);
    const y = d3.scaleLinear().domain([0, Math.max(4, d3.max(series, (d) => d.value))]).nice().range([height - m.bottom, m.top]);

    svg.append("g").attr("transform", `translate(0,${height - m.bottom})`)
        .call(d3.axisBottom(x)).selectAll("text").attr("font-size", "10px").attr("font-weight", "700");
    svg.append("g").attr("transform", `translate(${m.left},0)`)
        .call(d3.axisLeft(y).ticks(4)).selectAll("text").attr("font-size", "10px").attr("font-weight", "700");

    svg.selectAll(".bar")
        .data(series)
        .join("rect")
        .attr("class", "bar")
        .attr("x", (d) => x(d.label))
        .attr("width", x.bandwidth())
        .attr("y", (d) => y(d.value))
        .attr("height", (d) => y(0) - y(d.value))
        .attr("fill", "#60a5fa")
        .attr("stroke", "var(--ink)")
        .attr("stroke-width", 2)
        .attr("rx", 4)
        .append("title")
        .text((d) => `${d.value} gelas`);
}

/**
 * Fallback chart tanpa D3 (bar HTML sederhana).
 *
 * @param {HTMLElement} container - Page content.
 * @param {Object} data - Data statistik.
 */
function paintFallbackCharts(container, data) {
    const history = getStatsHistory();
    const days = last7Days();
    const maxV = Math.max(1, ...days.map((d) => history[d]?.completed || 0));

    const productivity = container.querySelector("#chart-productivity");
    if (productivity) {
        productivity.innerHTML = days
            .map((iso) => {
                const v = history[iso]?.completed || 0;
                const pct = Math.round((v / maxV) * 100);
                return `
                    <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.45rem">
                        <span style="font-size:0.75rem;font-weight:800;width:44px">${iso.slice(8)}/${iso.slice(5, 7)}</span>
                        <div class="progress" style="flex:1;height:16px">
                            <div class="progress-bar" style="width:${pct}%"></div>
                        </div>
                        <span style="font-size:0.75rem;font-weight:900;width:20px;text-align:right">${v}</span>
                    </div>
                `;
            })
            .join("");
    }

    ["#chart-category", "#chart-completion", "#chart-hydration"].forEach((sel) => {
        const el = container.querySelector(sel);
        if (el) {
            el.innerHTML = `<div class="empty-state" style="border:none;box-shadow:none;padding:1rem">
                <p class="text-muted">Chart offline — D3 tidak tersedia.</p>
            </div>`;
        }
    });
}

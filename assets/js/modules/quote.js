/**
 * Quote module — daily quote deterministic berdasarkan tanggal.
 */
import { getState } from "../store.js";
import { storage } from "../storage.js";
import { escapeHtml, toISODate, formatDateLong } from "../helpers.js";

/** Quote fallback bila data/quotes.json belum termuat. */
const FALLBACK_QUOTES = [
    { text: "Small steps every day create big changes.", author: "Unknown" },
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { text: "Well done is better than well said.", author: "Benjamin Franklin" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
    { text: "Happiness is not something ready made. It comes from your own actions.", author: "Dalai Lama" },
    { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
    { text: "Turn your wounds into wisdom.", author: "Oprah Winfrey" },
    { text: "Dream big and dare to fail.", author: "Norman Vaughan" },
    { text: "What we think, we become.", author: "Buddha" },
    { text: "The best way out is always through.", author: "Robert Frost" },
    { text: "Act as if what you do makes a difference. It does.", author: "William James" },
    { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
    { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
    { text: "Great things never come from comfort zones.", author: "Unknown" },
    { text: "Dream it. Wish it. Do it.", author: "Unknown" },
    { text: "Success doesn't just find you. You have to go out and get it.", author: "Unknown" },
    { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
    { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
    { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
    { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
    { text: "Little things make big days.", author: "Unknown" },
    { text: "It's a good day to have a good day.", author: "Unknown" },
    { text: "Failures are the stepping stones to success.", author: "Unknown" },
    { text: "Your only limit is you.", author: "Unknown" },
    { text: "Be stronger than your strongest excuse.", author: "Unknown" },
    { text: "Work hard in silence, let success be your noise.", author: "Frank Ocean" },
    { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
    { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" }
];

/**
 * Load quotes dari data/quotes.json, fallback ke list internal.
 *
 * @returns {Promise<Array>} Daftar quote.
 */
export async function loadQuotes() {
    const state = getState();
    if (state.quotes && state.quotes.length) return state.quotes;

    try {
        const res = await fetch("./data/quotes.json");
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length) {
                storage.set("quotes", data);
                return data;
            }
        }
    } catch (error) {
        console.warn("Gagal load quotes.json, pakai fallback:", error);
    }
    return FALLBACK_QUOTES;
}

/**
 * Quote harian — deterministik berdasarkan tanggal (stabil saat refresh).
 *
 * @param {Array} [quotes] - Opsional daftar quote.
 * @returns {Promise<{text:string, author:string}>}
 */
export async function getDailyQuote(quotes) {
    const list = quotes || (await loadQuotes());
    const today = newISOdayIndex();
    return list[today % list.length];
}

function newISOdayIndex() {
    const iso = toISODate();
    let hash = 0;
    for (let i = 0; i < iso.length; i++) {
        hash = (hash * 31 + iso.charCodeAt(i)) >>> 0;
    }
    return hash;
}

/**
 * Render quote card HTML.
 *
 * @param {{text:string, author:string}} quote
 * @returns {string} HTML string.
 */
export function quoteCardHtml(quote) {
    return `
        <div class="quote-card">
            <p class="quote-text">"${escapeHtml(quote.text)}"</p>
            <p class="quote-author">— ${escapeHtml(quote.author)}</p>
        </div>
    `;
}

/**
 * Render halaman Quotes.
 *
 * @param {HTMLElement} container - Elemen konten halaman.
 */
export async function renderQuotesPage(container) {
    const list = await loadQuotes();
    const daily = await getDailyQuote(list);
    const shown = list.slice(0, 12);

    container.innerHTML = `
        <div class="page-enter">
            <div class="page-header">
                <div>
                    <h1>💬 Daily Quotes</h1>
                    <p class="page-desc">Quote hari ini — ${formatDateLong()}</p>
                </div>
                <button type="button" class="btn btn-primary" id="shuffle-quote">🎲 Shuffle</button>
            </div>

            <div id="daily-quote">${quoteCardHtml(daily)}</div>

            <div class="dash-section-title" style="margin-top:1.4rem">
                <span>📚 Quote Collection</span>
                <span class="badge purple">${list.length} quotes</span>
            </div>

            <div class="quotes-grid stagger">
                ${shown
                    .map(
                    (q, i) => `
                    <div class="card soft hoverable" style="animation:pop-in .3s ease backwards; animation-delay:${i * 0.04}s">
                        <p style="font-weight:800;font-style:italic">"${escapeHtml(q.text)}"</p>
                        <p class="pixel-font" style="font-size:0.55rem;color:var(--secondary-dark);margin-top:0.6rem">— ${escapeHtml(q.author)}</p>
                    </div>
                `
                )
                    .join("")}
            </div>
        </div>
    `;

    container.querySelector("#shuffle-quote")?.addEventListener("click", () => {
        const random = list[Math.floor(Math.random() * list.length)];
        container.querySelector("#daily-quote").innerHTML = quoteCardHtml(random);
    });
}

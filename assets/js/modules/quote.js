/**
 * Quote module — daily quote deterministic berdasarkan tanggal.
 */
import { getState } from "../store.js";
import { storage } from "../storage.js";
import { escapeHtml, toISODate, formatDateLong } from "../helpers.js";

/** Versi cache quotes — ubah untuk paksa re-fetch dari file. */
const QUOTES_VERSION = "id-v1";

/** Quote fallback bila data/quotes.json belum termuat. */
const FALLBACK_QUOTES = [
    { text: "Pacaran sehat itu tumbuh bareng, bukan saling menghambat.", author: "PinkyPlan" },
    { text: "Komunikasi jujur lebih manis daripada tebak-tebakan.", author: "PinkyPlan" },
    { text: "Dua orang yang sehat jadi tim, bukan lawan.", author: "PinkyPlan" },
    { text: "Ruang untuk diri sendiri bikin cinta jadi lebih lega.", author: "PinkyPlan" },
    { text: "Bertengkar wajar, merendahkan tidak.", author: "PinkyPlan" },
    { text: "Saling support cita-cita itu romantis versi dewasa.", author: "PinkyPlan" },
    { text: "Tanpa kepercayaan, hubungan cuma rumah tanpa pondasi.", author: "PinkyPlan" },
    { text: "Jaga batas itu bukan jarak, itu rasa saling menghargai.", author: "PinkyPlan" },
    { text: "Pacaran sehat: sama-sama bahagia, bukan satu yang berkorban terus.", author: "PinkyPlan" },
    { text: "Marah boleh, menyakiti hati pakai kata tidak.", author: "PinkyPlan" },
    { text: "Hubungan yang tumbuh pelan lebih kuat daripada yang meledak cepat.", author: "PinkyPlan" },
    { text: "Saling mengingatkan dengan lembut itu bentuk sayang.", author: "PinkyPlan" },
    { text: "Jomblo bahagia lebih baik dari pacaran yang menyiksa.", author: "PinkyPlan" },
    { text: "Dengarkan untuk paham, bukan untuk menjawab.", author: "PinkyPlan" },
    { text: "Cinta sehat membuat kamu lebih nyaman jadi diri sendiri.", author: "PinkyPlan" },
    { text: "Komitmen itu pilihan harian, bukan paksaan sekali seumur hidup.", author: "PinkyPlan" },
    { text: "Dia yang bikin kamu overthinking bukan pertanda romantis.", author: "PinkyPlan" },
    { text: "Rasa aman datang dari konsistensi, bukan kata-kata manis doang.", author: "PinkyPlan" },
    { text: "Pacaran sehat bikin kamu jadi versi terbaik dirimu.", author: "PinkyPlan" },
    { text: "Minta maaf tulus lebih cepat memulihkan daripada ego yang tinggi.", author: "PinkyPlan" },
    { text: "Hargai waktu dia, apalagi kalau dia sudah berusaha untukmu.", author: "PinkyPlan" },
    { text: "Hubungan baik itu saling legowo, bukan selalu menang.", author: "PinkyPlan" },
    { text: "Tetap jaga teman, hobi, dan mimpi — pacaran bukan seluruh hidupmu.", author: "PinkyPlan" },
    { text: "Green flag: dia dorong kamu jadi lebih baik, bukan bikin kamu ragu.", author: "PinkyPlan" },
    { text: "Jujur itu kadang pedih, tapi bohong itu merusak pelan-pelan.", author: "PinkyPlan" },
    { text: "Cinta yang sehat tidak perlu dibuktikan dengan posesif.", author: "PinkyPlan" },
    { text: "Beda pendapat bukan alasan untuk menjatuhkan.", author: "PinkyPlan" },
    { text: "Saling jaga kesehatan mental itu bagian dari sayang.", author: "PinkyPlan" },
    { text: "Terima kekurangan dia, bukan diam-diam berharap dia berubah.", author: "PinkyPlan" },
    { text: "Hubungan sehat itu tenang, bukan selalu drama penuh warna.", author: "PinkyPlan" }
];

/**
 * Load quotes dari data/quotes.json (selalu fetch ulang agar cache lama tidak dipakai),
 * fallback ke list internal.
 *
 * @returns {Promise<Array>} Daftar quote.
 */
export async function loadQuotes() {
    try {
        const res = await fetch(`./data/quotes.json?v=${QUOTES_VERSION}`);
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
    const state = getState();
    if (state.quotes && state.quotes.length) return state.quotes;
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

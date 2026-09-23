/**
 * Games module — embed standalone `game.html` (Prisma Worlds).
 * Konten game diambil dari file itu sendiri agar satu sumber & rapi.
 */
export function renderGamesPage(container) {
    container.innerHTML = `
        <div class="page-enter game-embed">
            <div class="game-embed-bar">
                <div class="game-embed-info">
                    <h1>🎮 Prisma Worlds</h1>
                    <p>Portal jelajah 3D — tiga dunia, temukan landmark, tanpa game over. Kontrol di dalam frame.</p>
                </div>
                <div class="game-embed-actions">
                    <button type="button" class="btn btn-sm btn-ghost" id="game-reload" title="Muat ulang game">↻ Muat ulang</button>
                    <a class="btn btn-sm btn-secondary" href="./game.html" target="_blank" rel="noopener">↗ Tab baru</a>
                </div>
            </div>
            <div class="game-frame-wrap">
                <iframe
                    id="game-frame"
                    title="Prisma Worlds — Portal Jelajah 3D"
                    src="./game.html"
                    allow="pointer-lock; fullscreen; gamepad; autoplay; accelerometer; gyroscope"
                    allowfullscreen
                    loading="lazy"
                ></iframe>
            </div>
        </div>
    `;

    container.querySelector("#game-reload")?.addEventListener("click", () => {
        const frame = container.querySelector("#game-frame");
        if (frame) {
            frame.src = "./game.html";
        }
    });
}

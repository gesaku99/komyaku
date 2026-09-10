// ★【タイポ完全修復版】PC・スマホ両立 ＆ 二重発火を完全封鎖したイベント・起動処理
function handleActionStart(x, y) { const cell = getCellFromCoords(x, y); if (cell) { startCell = cell; hasMovedInSession = false; } }
function handleActionMove(x, y) {
    const cell = getCellFromCoords(x, y);
    if (cell && startCell) {
        if (cell.r !== startCell.r || cell.c !== startCell.c) hasMovedInSession = true;
        const oldColor = userGrid[cell.r][cell.c]; const newColor = currentSelectedColor;
        if (oldColor !== newColor) { userGrid[cell.r][cell.c] = newColor; recordChange(cell.r, cell.c, oldColor, newColor); drawPuzzle(); }
    }
}
function handleActionEnd() {
    if (!startCell) return;
    if (!hasMovedInSession) {
        const oldColor = userGrid[startCell.r][startCell.c]; let newColor = currentSelectedColor;
        if (oldColor > 0) newColor = 0; 
        if (oldColor !== newColor) { userGrid[startCell.r][startCell.c] = newColor; recordChange(startCell.r, startCell.c, oldColor, newColor); drawPuzzle(); }
    }
    updateHistoryButtons(); startCell = null; hasMovedInSession = false;
}

canvas.addEventListener('mousedown', function(e) { if (e.button !== 0) return; isDrawing = true; const rect = canvas.getBoundingClientRect(); handleActionStart(e.clientX - rect.left, e.clientY - rect.top); });
canvas.addEventListener('mousemove', function(e) { if (!isDrawing) return; const rect = canvas.getBoundingClientRect(); handleActionMove(e.clientX - rect.left, e.clientY - rect.top); });
window.addEventListener('mouseup', () => { if (isDrawing) { isDrawing = false; handleActionEnd(); } });

canvas.addEventListener('touchstart', function(e) {
    e.preventDefault(); isDrawing = true; const rect = canvas.getBoundingClientRect(); 
    const touch = e.touches[0]; // ★完全修復：謎の記述を削除し、1本目の指のデータを正しく取得
    handleActionStart(touch.clientX - rect.left, touch.clientY - rect.top);
});
canvas.addEventListener('touchmove', function(e) {
    if (!isDrawing) return; e.preventDefault(); const rect = canvas.getBoundingClientRect(); 
    const touch = e.touches[0]; // ★完全修復：移動中の指の座標を正確に追従
    handleActionMove(touch.clientX - rect.left, touch.clientY - rect.top);
}, { passive: false });
canvas.addEventListener('touchend', function(e) { e.preventDefault(); if (isDrawing) { isDrawing = false; handleActionEnd(); } });

function createPalette() {
    paletteContainer.innerHTML = ''; 
    for (let i = 0; i <= 9; i++) {
        const btn = document.createElement('div'); btn.className = 'color-btn';
        if (i === currentSelectedColor) btn.classList.add('active');
        btn.style.backgroundColor = COLOR_PALETTE[i]; btn.onclick = () => { currentSelectedColor = i; createPalette(); };
        paletteContainer.appendChild(btn);
    }
}
function selectColor(colorId) { currentSelectedColor = colorId; createPalette(); }

// ★初回起動シーケンス：すべての合流を確認して一発起動
// ★重要：インターネットからのWebフォント読み込みが100%完了したことを検知してから起動する
document.fonts.ready.then(function() {
    loadPuzzleFromUrlOrId("E95A000007C1084");
    createPalette(); 
    updateHistoryButtons(); 
});

let isErasingMode = false;     
let lastIntersectedV = null; // ★追加：壁引きドラッグ中に直前に通過した格子点を記憶するフラグ

// ★追加：オレンジのアシスト製図機能で使う、ドラッグ中の始点と終点の格子点座標を記憶するグローバル変数
let assistStartV = null;
let assistCurrentV = null;

// ★追加：引こうとしている壁の両脇のマスを調べて、手動で操作可能か（少なくとも片方がnullか）チェックする関数
function isWallEditable(w) {
    let m1, m2;
    if (w.r1 === w.r2) { // 横線の場合、上下のマスを調べる
        m1 = (w.r1 - 1 >= 0) ? userGrid[w.r1 - 1][Math.min(w.c1, w.c2)] : null;
        m2 = (w.r1 < GRID_SIZE) ? userGrid[w.r1][Math.min(w.c1, w.c2)] : null;
    } else { // 縦線の場合、左右のマスを調べる
        m1 = (w.c1 - 1 >= 0) ? userGrid[Math.min(w.r1, w.r2)][w.c1 - 1] : null;
        m2 = (w.c1 < GRID_SIZE) ? userGrid[Math.min(w.r1, w.r2)][w.c1] : null;
    }
    // 画面外の境界線は操作不可
    if (m1 === undefined || m2 === undefined) return false;
    // 💡ご指定ルール：両脇のいずれかがnull（未着色）のときだけ、手動操作（追加・消去）を許可する！
    return (m1 === null || m2 === null);
}

// ★追加：両脇のマスがどちらも色マス（null以外）になった手動壁を、全自動で一括お掃除する関数
function cleanUserWalls() {
    userWalls = userWalls.filter(w => isWallEditable(w));
}

function handleActionStart(x, y) {
    const cell = getCellFromCoords(x, y);
    const nearestV = getNearestVertex(x, y); // タップ・クリック位置の最寄りの格子点を調べる

    if (currentSelectedColor === 9) {
        // ✏️【壁引きモード】
        lastIntersectedV = nearestV;
        startCell = cell;
        hasMovedInSession = false;
    } else {
        // 🎨【通常の色塗りモード】
        if (nearestV) {
            assistStartV = nearestV;
            assistCurrentV = nearestV;
        }
        startCell = cell;
        hasMovedInSession = false;
        if (cell) {
            isErasingMode = (userGrid[cell.r][cell.c] !== null);
        }
    }
}

function handleActionMove(x, y) {
    if (currentSelectedColor === 9) {
        // ✏️【壁引きモード】の処理
        const currentV = getNearestVertex(x, y);
        if (currentV && lastIntersectedV) {
            const dist = Math.abs(currentV.c - lastIntersectedV.c) + Math.abs(currentV.r - lastIntersectedV.r);
            if (dist === 1) {
                const newWall = { r1: lastIntersectedV.r, c1: lastIntersectedV.c, r2: currentV.r, c2: currentV.c };
                if (isWallEditable(newWall)) {
                    const existingIdx = userWalls.findIndex(w => 
                        (w.r1 === newWall.r1 && w.c1 === newWall.c1 && w.r2 === newWall.r2 && w.c2 === newWall.c2) ||
                        (w.r1 === newWall.r2 && w.c1 === newWall.c2 && w.r2 === newWall.r1 && w.c2 === newWall.c1)
                    );
                    if (existingIdx !== -1) { userWalls.splice(existingIdx, 1); } else { userWalls.push(newWall); }
                    hasMovedInSession = true;
                    drawPuzzle();
                }
                lastIntersectedV = currentV; 
            }
        }
    } else {
        // 🎨【通常の色塗りモード】
        if (assistStartV) {
            const currentV = getNearestVertex(x, y);
            if (currentV) {
                assistCurrentV = currentV;
            }
            drawPuzzle(); 
        }

        const cell = getCellFromCoords(x, y);
        if (cell && startCell && !assistStartV) {
            if (cell.r !== startCell.r || cell.c !== startCell.c) hasMovedInSession = true;
            const oldColor = userGrid[cell.r][cell.c];
            const newColor = isErasingMode ? null : currentSelectedColor;
            if (oldColor !== newColor) {
                userGrid[cell.r][cell.c] = newColor;
                recordChange(cell.r, cell.c, oldColor, newColor);
                cleanUserWalls(); 
                drawPuzzle();
            }
        }
    }
}
function handleActionEnd() {
    if (currentSelectedColor === 9) {
        lastIntersectedV = null;
        if (typeof cleanUserWalls === 'function') cleanUserWalls();
    } else if (startCell && !hasMovedInSession && !assistStartV) {
        const oldColor = userGrid[startCell.r][startCell.c];
        let newColor = currentSelectedColor;
        if (oldColor !== null) newColor = null; 
        if (oldColor !== newColor) {
            userGrid[startCell.r][startCell.c] = newColor;
            recordChange(startCell.r, startCell.c, oldColor, newColor);
            cleanUserWalls(); 
        }
    }
    
    updateHistoryButtons();
    startCell = null;
    hasMovedInSession = false;
    isErasingMode = false;
    
    assistStartV = null;
    assistCurrentV = null;

    drawPuzzle(); 

    setTimeout(() => {
        if (typeof checkAnswer === 'function') checkAnswer(true);
    }, 0);
}

function undo() {
    if (undoStack.length === 0) return;
    clearErrorDisplay();
    const change = undoStack.pop();
    redoStack.push({ r: change.r, c: change.c, from: change.to, to: change.from });
    userGrid[change.r][change.c] = change.from;
    while (undoStack.length > 0 && undoStack[undoStack.length - 1].to === 0 && change.to === 0) {
        const nextChange = undoStack.pop();
        redoStack.push({ r: nextChange.r, c: nextChange.c, from: nextChange.to, to: nextChange.from });
        userGrid[nextChange.r][nextChange.c] = nextChange.from;
    }
    drawPuzzle(); 
    updateHistoryButtons();
    setTimeout(() => {
        if (typeof checkAnswer === 'function') checkAnswer(true);
    }, 0);
}

function redo() {
    if (redoStack.length === 0) return;
    clearErrorDisplay();
    const change = redoStack.pop();
    undoStack.push({ r: change.r, c: change.c, from: change.to, to: change.from });
    userGrid[change.r][change.c] = change.from;
    while (redoStack.length > 0 && redoStack[redoStack.length - 1].from === 0 && change.from === 0) {
        const nextChange = redoStack.pop();
        undoStack.push({ r: nextChange.r, c: nextChange.c, from: nextChange.to, to: nextChange.from });
        userGrid[nextChange.r][nextChange.c] = nextChange.from;
    }
    drawPuzzle(); 
    updateHistoryButtons();
    setTimeout(() => {
        if (typeof checkAnswer === 'function') checkAnswer(true);
    }, 0);
}

function getNearestVertex(x, y) {
    let nearestV = null;
    let minDistance = 25; 
    for (let r = 0; r <= GRID_SIZE; r++) {
        for (let c = 0; c <= GRID_SIZE; c++) {
            const vx = OFFSET + c * CELL_PIXEL;
            const vy = OFFSET + r * CELL_PIXEL + 30; 
            const distance = Math.sqrt((x - vx) ** 2 + (y - vy) ** 2);
            if (distance < minDistance) {
                minDistance = distance;
                nearestV = { r, c };
            }
        }
    }
    return nearestV;
}

// ─── 📱 iPhoneお守り：マウス＆タッチイベントの完全な非アクティブ化とブラウザ既定動作の相殺 ───
canvas.addEventListener('mousedown', function(e) { if (e.button !== 0) return; isDrawing = true; const rect = canvas.getBoundingClientRect(); handleActionStart(e.clientX - rect.left, e.clientY - rect.top); });
canvas.addEventListener('mousemove', function(e) { if (!isDrawing) return; const rect = canvas.getBoundingClientRect(); handleActionMove(e.clientX - rect.left, e.clientY - rect.top); });
window.addEventListener('mouseup', () => { if (isDrawing) { isDrawing = false; handleActionEnd(); } });

// 💡 修正仕様：{ passive: false } を明示して、iPhone Safariによるタッチキャンセルを完全に先回りして破壊・防止する
canvas.addEventListener('touchstart', function(e) {
    e.preventDefault(); isDrawing = true; const rect = canvas.getBoundingClientRect(); 
    const touch = e.touches[0]; 
    handleActionStart(touch.clientX - rect.left, touch.clientY - rect.top);
}, { passive: false });

canvas.addEventListener('touchmove', function(e) {
    if (!isDrawing) return; e.preventDefault(); const rect = canvas.getBoundingClientRect(); 
    const touch = e.touches[0]; 
    handleActionMove(touch.clientX - rect.left, touch.clientY - rect.top);
}, { passive: false });

canvas.addEventListener('touchend', function(e) { 
    e.preventDefault(); if (isDrawing) { isDrawing = false; handleActionEnd(); } 
}, { passive: false });

function createPalette() {
    paletteContainer.innerHTML = ''; 
    for (let i = 0; i <= 9; i++) {
        const btn = document.createElement('div'); 
        btn.className = 'color-btn';
        if (i === currentSelectedColor) btn.classList.add('active');
        btn.style.backgroundColor = COLOR_PALETTE[i]; 
        btn.onclick = () => { currentSelectedColor = i; createPalette(); };
        
        if (i === 9) {
            btn.innerText = ''; 
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'center';
            btn.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#222222" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M 5.00 4.00 L 5.00 21.00 L 11.50 21.00" stroke-width="2.30"></path>
                    <path d="M 16.50 5.15 L 17.75 2.98 L 18.50 3.41 L 17.25 5.58 Z" fill="#333333" stroke="#222222"></path>
                    <path d="M 9.77 15.54 L 15.77 5.15 L 19.23 7.15 L 13.23 17.54 Z" fill="#ffffff"></path>
                    <path d="M 9.77 15.54 L 11.50 21.00 L 13.23 17.54 Z" fill="#ffffff"></path>
                </svg>
            `;
        }
        paletteContainer.appendChild(btn);
    }
}
function selectColor(colorId) { currentSelectedColor = colorId; createPalette(); }

document.fonts.ready.then(function() {
    loadPuzzleFromUrlOrId("E2A8313C20");
    createPalette(); 
    updateHistoryButtons(); 
});

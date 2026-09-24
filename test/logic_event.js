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

// ★追加：ドラッグ開始時の手動壁の状態を一時保存する変数
let wallSnapshotBeforeDrag = [];

function handleActionStart(x, y) {
    const cell = getCellFromCoords(x, y);
    const nearestV = getNearestVertex(x, y);

    if (currentSelectedColor === 9) {
        // ✏️【壁引きモード】ドラッグ開始前の壁の配列を深くコピーして記憶
        wallSnapshotBeforeDrag = userWalls.map(w => ({ ...w }));
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
        // ✏️【壁引きモード】
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
            if (currentV) assistCurrentV = currentV;
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

// 💡【完全復活 ＆ 履歴合流】消滅していた handleActionEnd を、手動壁のUndoスタック記録処理を内包して再定義
function handleActionEnd() {
    if (currentSelectedColor === 9) {
        lastIntersectedV = null;
        if (typeof cleanUserWalls === 'function') cleanUserWalls();
        
        // ✏️ 手動壁引き操作が実際に発生していた場合、ドラッグ前の状態との差分をUndoスタックに刻む
        if (hasMovedInSession) {
            clearErrorDisplay();
            undoStack.push({
                type: 'wall',
                from: wallSnapshotBeforeDrag,
                to: userWalls.map(w => ({ ...w }))
            });
            redoStack.length = 0;
        }
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

// 💡【完全復活 ＆ 壁対応化】手動境界線もサクスパ戻せるように拡張した Undo ロジック
function undo() {
    if (undoStack.length === 0) return;
    clearErrorDisplay();
    const change = undoStack.pop();
    
    if (change.type === 'wall') {
        // ✏️ 壁引きのUndo処理（Redoスタックへ未来をバトンタッチ）
        redoStack.push({ type: 'wall', from: change.to, to: change.from });
        userWalls = change.from.map(w => ({ ...w }));
    } else {
        // 🎨 色塗りのUndo処理
        redoStack.push({ r: change.r, c: change.c, from: change.to, to: change.from });
        userGrid[change.r][change.c] = change.from;
        while (undoStack.length > 0 && undoStack[undoStack.length - 1].to === 0 && change.to === 0) {
            const nextChange = undoStack.pop();
            redoStack.push({ r: nextChange.r, c: nextChange.c, from: nextChange.to, to: nextChange.from });
            userGrid[nextChange.r][nextChange.c] = nextChange.from;
        }
    }
    drawPuzzle(); 
    updateHistoryButtons();
    setTimeout(() => { if (typeof checkAnswer === 'function') checkAnswer(true); }, 0);
}

function redo() {
    if (redoStack.length === 0) return;
    clearErrorDisplay();
    const change = redoStack.pop();
    
    if (change.type === 'wall') {
        // ✏️ 壁引きのRedo処理
        undoStack.push({ type: 'wall', from: change.to, to: change.from });
        userWalls = change.from.map(w => ({ ...w }));
    } else {
        // 🎨 色塗りのRedo処理
        undoStack.push({ r: change.r, c: change.c, from: change.to, to: change.from });
        userGrid[change.r][change.c] = change.from;
        while (undoStack.length > 0 && undoStack[undoStack.length - 1].from === 0 && change.from === 0) {
            const nextChange = redoStack.pop();
            undoStack.push({ r: nextChange.r, c: nextChange.c, from: nextChange.to, to: nextChange.from });
            userGrid[nextChange.r][nextChange.c] = nextChange.from;
        }
    }
    drawPuzzle(); 
    updateHistoryButtons();
    setTimeout(() => { if (typeof checkAnswer === 'function') checkAnswer(true); }, 0);
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
                    <!-- ①左上(5.00, 4.00)から下部余白(5.00, 21.00)へ下ろし、右へ(11.50, 21.00)まで引いた太さ2.30の境界線 -->
                    <path d="M 5.00 4.00 L 5.00 21.00 L 11.50 21.00" stroke-width="2.30"></path>
                    
                    <!-- ②【立体ノックボタン】1番目と4番目の短辺中点が、胴体後端中点(18.50, 9.10)と100%完全同軸ドッキングするパーツ -->
                    <path d="M 17.65 8.60 L 19.15 6.05 L 20.85 7.05 L 19.35 9.60 Z" fill="#333333" stroke="#222222"></path>

                    <!-- ③【ペン胴体部分（完全な長方形）】右肩下がりの短辺を維持し、直角90度（内積=0）を完璧に証明した白抜きボディ -->
                    <path d="M 11.80 16.60 L 16.80 8.10 L 20.20 10.10 L 15.20 18.60 Z" fill="#ffffff"></path>
                    
                    <!-- ④【ペン先の三角錐（完全な二等辺三角形）】最先端(11.50, 21.00)が境界線の端点へのり、胴体底辺と100%完璧に融合するチップ -->
                    <path d="M 11.80 16.60 L 11.50 21.00 L 15.20 18.60 Z" fill="#ffffff"></path>
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

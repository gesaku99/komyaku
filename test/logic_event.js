let isErasingMode = false;     
let lastIntersectedV = null; // ★追加：壁引きドラッグ中に直前に通過した格子点を記憶するフラグ

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
    if (currentSelectedColor === 9) {
        // ✏️【壁引きモード】：最寄りの格子点（交差点）を検知する
        lastIntersectedV = getNearestVertex(x, y);
        startCell = cell;
        hasMovedInSession = false;
    } else if (cell) {
        // 🎨【通常の色塗りモード】
        startCell = cell;
        hasMovedInSession = false;
        isErasingMode = (userGrid[cell.r][cell.c] !== null);
    }
}

function handleActionMove(x, y) {
    if (currentSelectedColor === 9) {
        // ✏️【壁引きモード】のマグネット追従
        const currentV = getNearestVertex(x, y);
        if (currentV && lastIntersectedV) {
            // 直前に触れた格子点と、今触れた格子点が「お隣さん（1マス離れた位置）」である場合
            const dist = Math.abs(currentV.c - lastIntersectedV.c) + Math.abs(currentV.r - lastIntersectedV.r);
            if (dist === 1) {
                const newWall = { r1: lastIntersectedV.r, c1: lastIntersectedV.c, r2: currentV.r, c2: currentV.c };
                
                // 💡ご指定ルール：その壁の両脇の少なくとも1マスがnull（未着色）のときだけ処理する
                if (isWallEditable(newWall)) {
                    // すでに同じ壁があるか探す（順不同チェック）
                    const existingIdx = userWalls.findIndex(w => 
                        (w.r1 === newWall.r1 && w.c1 === newWall.c1 && w.r2 === newWall.r2 && w.c2 === newWall.c2) ||
                        (w.r1 === newWall.r2 && w.c1 === newWall.c2 && w.r2 === newWall.r1 && w.c2 === newWall.c1)
                    );
                    
                    if (existingIdx !== -1) {
                        // 💡ご指定ルール：すでに登録がある境界線を改めてなぞったら、トグル消去する
                        userWalls.splice(existingIdx, 1);
                    } else {
                        // 新しい壁として登録
                        userWalls.push(newWall);
                    }
                    hasMovedInSession = true;
                    drawPuzzle();
                }
                lastIntersectedV = currentV; // 次の線の起点にバトンタッチ
            }
        }
    } else {
        // 🎨【通常の色塗りモード】（既存の完璧なドラッグ処理）
        const cell = getCellFromCoords(x, y);
        if (cell && startCell) {
            if (cell.r !== startCell.r || cell.c !== startCell.c) hasMovedInSession = true;
            const oldColor = userGrid[cell.r][cell.c];
            const newColor = isErasingMode ? null : currentSelectedColor;
            if (oldColor !== newColor) {
                userGrid[cell.r][cell.c] = newColor;
                recordChange(cell.r, cell.c, oldColor, newColor);
                cleanUserWalls(); // ★追加：色を塗った瞬間、両脇が埋まった手動壁を自動消去！
                drawPuzzle();
            }
        }
    }
}

function handleActionEnd() {
    if (currentSelectedColor === 9) {
        lastIntersectedV = null;
    } else if (startCell && !hasMovedInSession) {
        // 🎨シングルタップ時の色トグル処理
        const oldColor = userGrid[startCell.r][startCell.c];
        let newColor = currentSelectedColor;
        if (oldColor !== null) newColor = null; 
        if (oldColor !== newColor) {
            userGrid[startCell.r][startCell.c] = newColor;
            recordChange(startCell.r, startCell.c, oldColor, newColor);
            cleanUserWalls(); // ★追加：ここでも両脇が埋まった手動壁を自動消去！
            drawPuzzle();
        }
    }
    updateHistoryButtons();
    startCell = null;
    hasMovedInSession = false;
    isErasingMode = false;
}

// ★追加：指の現在地から、半径25px以内にある最も近い「格子点（マスの角）」を返す超強力なマグネットセンサー
function getNearestVertex(x, y) {
    let nearestV = null;
    let minDistance = 25; // 吸着範囲（25ピクセル以内なら吸い付く）
    for (let r = 0; r <= GRID_SIZE; r++) {
        for (let c = 0; c <= GRID_SIZE; c++) {
            const vx = OFFSET + c * CELL_PIXEL;
            const vy = OFFSET + r * CELL_PIXEL + 30; // titleBarHeight = 30
            const distance = Math.sqrt((x - vx) ** 2 + (y - vy) ** 2);
            if (distance < minDistance) {
                minDistance = distance;
                nearestV = { r, c };
            }
        }
    }
    return nearestV;
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
        const btn = document.createElement('div'); 
        btn.className = 'color-btn';
        if (i === currentSelectedColor) btn.classList.add('active');
        btn.style.backgroundColor = COLOR_PALETTE[i]; 
        btn.onclick = () => { currentSelectedColor = i; createPalette(); };
        
        // ★新仕様：9番目のグレーボタンを、境界線を引いている「鉛筆アイコン」へと強制トランスフォーム！
        if (i === 9) {
            btn.innerText = '✏️──'; // 境界線を引いているペンのビジュアルアイコン
            btn.style.color = '#333333';
            btn.style.textAlign = 'center';
            btn.style.lineHeight = '40px'; 
            btn.style.fontSize = '12px'; // アイコンのバランスを整えるフォントサイズ
            btn.style.fontWeight = 'bold';
        }
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

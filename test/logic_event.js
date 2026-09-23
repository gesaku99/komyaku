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
        // ★新仕様：通常の色塗りモードのとき、もし「格子点（マスの角）」からドラッグが開始されたら、アシスト始点として記憶
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
        // ★追加：アシストモード作動中（格子点スタート）なら、リアルタイムで現在の終点格子点を追従・記憶
        if (assistStartV) {
            const currentV = getNearestVertex(x, y);
            if (currentV) {
                assistCurrentV = currentV;
            }
            drawPuzzle(); // アシスト線をリアルタイム描画するために毎フレームCanvasを更新
        }

        const cell = getCellFromCoords(x, y);
        // ★修正：アシスト作動中（格子点からのドラッグ時）は、背景の色塗りが誤って暴発しないようにガードをかけます
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
        // ✏️【壁引きモード】終了時の処理
        lastIntersectedV = null;
        // 壁引きドラッグが終わったので、この瞬間に手動壁リスト(userWalls)の自動お掃除を実行
        if (typeof cleanUserWalls === 'function') cleanUserWalls();
    } else if (startCell && !hasMovedInSession && !assistStartV) {
        // 🎨シングルタップ時の色トグル処理（格子点ドラッグではない、純粋な1マスタップ時のみ発動）
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
    
    // アシストの記憶を綺麗にリセット
    assistStartV = null;
    assistCurrentV = null;

    // ─── ✨【描画遅延の解消 ＆ 色・手動壁の両対応自動正解チェック】 ───
    // 1. まず、最後の1マスや最後の1本の手動壁をキャンバス上へ完全に描き切る
    drawPuzzle(); 

    // 2. 0ミリ秒遅らせる非同期タイマーを挟み、ブラウザが画面を100%更新し終えた直後に判定を起動する
    setTimeout(() => {
        if (typeof checkAnswer === 'function') checkAnswer(true);
    }, 0);
}
// ★重要：既存の source: 8 側にあった undo / redo と重複して誤作動するのを防ぐため、
// ここの操作連携ファイル側の関数が実行された際にも、完璧に同期して裏で自動チェックを走らせます。
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

    // 先に最後の1マスの着色をキャンバス上へ完全に描き切る
    drawPuzzle(); 
    updateHistoryButtons();

    // 0ミリ秒遅らせる非同期処理（これによりブラウザが先に100%画面を更新する）
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

    // 先に最後の1マスの着色をキャンバス上へ完全に描き切る
    drawPuzzle(); 
    updateHistoryButtons();

    // 0ミリ秒遅らせる非同期処理（これによりブラウザが先に100%画面を更新する）
    setTimeout(() => {
        if (typeof checkAnswer === 'function') checkAnswer(true);
    }, 0);
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
    const touch = e.touches[0]; 
    handleActionStart(touch.clientX - rect.left, touch.clientY - rect.top);
});
canvas.addEventListener('touchmove', function(e) {
    if (!isDrawing) return; e.preventDefault(); const rect = canvas.getBoundingClientRect(); 
    const touch = e.touches[0]; 
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
        
        // ★新仕様：どの端末でも向きが変わらない高精度なSVG鉛筆アイコンへと強制トランスフォーム！
        if (i === 9) {
            btn.innerText = ''; // 文字は消去
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'center';
            
            // 32pxの丸枠いっぱいに、直角にカチッと折れ曲がる境界線と巨大なペン先をスタイリッシュに配置
            btn.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#222222" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
                    <!-- ①左上から左下、右へ折れ曲がる境界線パス（太さはそのまま維持） -->
                    <path d="M 5 4 L 5 18 L 13 18" stroke-width="2.3"></path>
                    
                    <!-- ②右上から左下へ向かう、極細アウトラインの美しいペン本体（中を白抜きに透過） -->
                    <path d="M11.8 16.8 l -1.3 2.7 l 2.7 -1.3 l 7.3 -7.3 a 1.5 1.5 0 0 0 -2.1 -2.1 z" fill="#ffffff"></path>
                    
                    <!-- ③【ディテール補強】高級感を演出するペンのサイドクリップ線 -->
                    <path d="M17.5 5.5 L 20 8" stroke="#222222"></path>
                    <!-- ④【ディテール補強】ペン先（チップ）を分けるシャープな境界線 -->
                    <path d="M12.5 16.1 L 14.2 17.8" stroke="#222222"></path>
                </svg>
            `;
        }
        paletteContainer.appendChild(btn);
    }
}
function selectColor(colorId) { currentSelectedColor = colorId; createPalette(); }

// ★初回起動シーケンス：すべての合流を確認して一発起動
document.fonts.ready.then(function() {
    loadPuzzleFromUrlOrId("E95A000007C1084");
    createPalette(); 
    updateHistoryButtons(); 
});

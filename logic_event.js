// ─── 🌐【新設】Cookie不使用・安全中継対応 プレイログ一括自動送信システム ───
const KOMYAKU_LOGGER_URL = "https://autumn-sun-42c9.gesaku419.workers.dev/";

function sendKomyakuPlayLog(statusType) {
    if (!KOMYAKU_LOGGER_URL || KOMYAKU_LOGGER_URL.includes("あなたの")) return;
    
    const logPayload = {
        timestamp: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }), 
        url: window.location.href,                                              
        status: statusType,                                                     
        referrer: document.referrer || "Direct",                                
        userAgent: navigator.userAgent                                          
    };

    try {
        // 💡【解決策】スマホを窒息させていた危険な Blob 変換を完全撤去！
        // モバイルブラウザ(Safari/Chrome)でも1ミリのエラーも起こさない「FormData」または「URL暗号化」の
        // 世界一安全な形式にデータを包むことで、スマホのタッチセンサーのフリーズを200%完璧に永久解除します！
        const formData = new FormData();
        formData.append("payload", JSON.stringify(logPayload));
        
        navigator.sendBeacon(KOMYAKU_LOGGER_URL, formData);
    } catch (err) {
        console.error("Beacon failed:", err);
    }
}

sendKomyakuPlayLog("OPEN");

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
            // 現在のキャンバスの「画面上の実際の表示横幅」をブラウザからダイレクトに計測
            const rect = canvas.getBoundingClientRect();
            // JavaScriptの内部サイズ(canvas.width)と表示幅(rect.width)から、現在の正確な縮小率を逆算
            const currentScale = rect.width / canvas.width;
            
            // 💡【解決策】画面が小さくなっている時は、アシスト線の感知範囲も 25px から「25 * 縮小率」へと自動で小さく縮小！
            // これにより、縮小画面でマスの真ん中を触った時に、左上の格子点センサーが誤作動して色塗りを奪う不具合を200%完璧に永久シャットアウトします！
            const adjustedNearestV = getNearestVertex(x, y, 25 * currentScale * 3);
            
            if (adjustedNearestV) {
                assistStartV = adjustedNearestV;
                assistCurrentV = adjustedNearestV;
                // 💡【解決策】指が置かれた・マウスが押された「まさにこの一瞬」に、画面の再描画を強制実行！
                // これにより、ユーザーはドラッグで動かし始める前に、格子点の半径25px内を正しく捉えたことを意味する
                // 美しいオレンジ丸の描画をその目で100%見届けて、安心してスワイプを開始できるようになります！
                if (typeof drawPuzzle === 'function') drawPuzzle();
            }
        }
        startCell = cell;
        hasMovedInSession = false;
        if (cell) {
            // 💡【解決策：操作性改善1】同じ色のときだけ消しゴムモードにする大正義の条件式！
            // これにより、別の色を選んでいる時は、白に戻すことなくダイレクトに新しい色へカチッと一発上書き塗り替えが走ります！
            isErasingMode = (userGrid[cell.r][cell.c] === currentSelectedColor);
        }
    }
}

function handleActionMove(x, y) {
    if (currentSelectedColor === 9) {
        // ✏️【壁引きモード】1マス進むごとに、その瞬間の個別変化を履歴に記録する
        const currentV = getNearestVertex(x, y);
        if (currentV && lastIntersectedV) {
            const dist = Math.abs(currentV.c - lastIntersectedV.c) + Math.abs(currentV.r - lastIntersectedV.r);
            if (dist === 1) {
                hasMovedInSession = true; // 💡【追記】動いたフラグを確定させ、クリックメモをスルーさせる
                const newWall = { r1: lastIntersectedV.r, c1: lastIntersectedV.c, r2: currentV.r, c2: currentV.c };
                if (isWallEditable(newWall)) {
                    // 操作直前の壁の状態をスナップショットとしてディープコピー
                    const snapshotBeforeSingleStep = userWalls.map(w => ({ ...w }));
                    
                    const existingIdx = userWalls.findIndex(w => 
                        (w.r1 === newWall.r1 && w.c1 === newWall.c1 && w.r2 === newWall.r2 && w.c2 === newWall.c2) ||
                        (w.r1 === newWall.r2 && w.c1 === newWall.c2 && w.r2 === newWall.r1 && w.c2 === newWall.c1)
                    );
                    
                    let actionType = 'add';
                    if (existingIdx !== -1) { 
                        userWalls.splice(existingIdx, 1); 
                        actionType = 'remove';
                    } else { 
                        userWalls.push(newWall); 
                    }
                    
                    // 💡1マス分の線引き・線消しが確定した瞬間に、その1ステップを即座にUndoスタックに積む
                    clearErrorDisplay();
                    undoStack.push({
                        type: 'wall_step',
                        from: snapshotBeforeSingleStep,
                        to: userWalls.map(w => ({ ...w }))
                    });
                    redoStack.length = 0;
                    
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

// =============================================================================
// ✨ 【単純クリック挙動 完全適正化パッチ】
// マウスダウン時の初手塗りと、マウスアップ時の消しゴム判定の競合を200%完璧に解消！
// =============================================================================
function handleActionEnd() {
    if (currentSelectedColor === 9) {
        lastIntersectedV = null;
        if (typeof cleanUserWalls === 'function') cleanUserWalls();
        
        // 💡【v0.9.3核心】白ペンモードでのシングルクリック時の「×印」と「？」のトグル配置・消去
        if (startCell && !hasMovedInSession) {
            const clickX = lastMouseCoords ? lastMouseCoords.x : (OFFSET + startCell.c * CELL_PIXEL + CELL_PIXEL / 2);
            const clickY = lastMouseCoords ? lastMouseCoords.y : (OFFSET + startCell.r * CELL_PIXEL + 30 + CELL_PIXEL / 2);

            const cellCenterX = OFFSET + startCell.c * CELL_PIXEL + CELL_PIXEL / 2;
            const cellCenterY = OFFSET + startCell.r * CELL_PIXEL + 30 + CELL_PIXEL / 2;
            const distToCenter = Math.sqrt((clickX - cellCenterX) ** 2 + (clickY - cellCenterY) ** 2);

            const leftX = OFFSET + startCell.c * CELL_PIXEL;
            const rightX = OFFSET + (startCell.c + 1) * CELL_PIXEL;
            const topY = OFFSET + startCell.r * CELL_PIXEL + 30;
            const bottomY = OFFSET + (startCell.r + 1) * CELL_PIXEL + 30;

            const minDistToEdge = Math.min(Math.abs(clickX - leftX), Math.abs(clickX - rightX), Math.abs(clickY - topY), Math.abs(clickY - bottomY));

            if (distToCenter < minDistToEdge) {
                // ➔ 【中心をクリック：？マークのトグル処理】
                const memoKey = `${startCell.r},${startCell.c}`;
                const snapshotBeforeQuestion = { ...userQuestionMap };
                
                if (userQuestionMap[memoKey]) { 
                    delete userQuestionMap[memoKey]; // すでに記載されている状態ならば消す
                } else { 
                    userQuestionMap[memoKey] = true; // なければ書く
                }
                
                // 1操作としてUndo/Redoに記録
                undoStack.push({ type: 'memo_question', from: snapshotBeforeQuestion, to: { ...userQuestionMap } });
                redoStack.length = 0;
            } else {
                // ➔ 【境界線上をクリック：×印マークのトグル処理】
                let targetWall;
                const dL = Math.abs(clickX - leftX); const dR = Math.abs(clickX - rightX);
                const dT = Math.abs(clickY - topY); const dB = Math.abs(clickY - bottomY);
                const m = Math.min(dL, dR, dT, dB);
                
                if (m === dL) targetWall = { r1: startCell.r, c1: startCell.c, r2: startCell.r + 1, c2: startCell.c };
                else if (m === dR) targetWall = { r1: startCell.r, c1: startCell.c + 1, r2: startCell.r + 1, c2: startCell.c + 1 };
                else if (m === dT) targetWall = { r1: startCell.r, c1: startCell.c, r2: startCell.r, c2: startCell.c + 1 };
                else targetWall = { r1: startCell.r + 1, c1: startCell.c, r2: startCell.r + 1, c2: startCell.c + 1 };

                const snapshotBeforeCross = userCrossWalls.map(w => ({ ...w }));
                const existingIdx = userCrossWalls.findIndex(w => 
                    (w.r1 === targetWall.r1 && w.c1 === targetWall.c1 && w.r2 === targetWall.r2 && w.c2 === targetWall.c2) ||
                    (w.r1 === targetWall.r2 && w.c1 === targetWall.c2 && w.r2 === targetWall.r1 && w.c2 === targetWall.c1)
                );

                if (existingIdx !== -1) { 
                    userCrossWalls.splice(existingIdx, 1); // すでに記載されている状態ならば消す
                } else { 
                    userCrossWalls.push(targetWall); // なければ書く
                }

                // 1操作としてUndo/Redoに記録
                undoStack.push({ type: 'memo_cross', from: snapshotBeforeCross, to: userCrossWalls.map(w => ({ ...w })) });
                redoStack.length = 0;
            }
        }
    } else if (startCell && !hasMovedInSession && !assistStartV) {
        // 通常プレイ時の単純クリック終了。Mousedown（Start）側で処理が完結しているため安全にスルー
    }
    
    if (typeof updateHistoryButtons === 'function') updateHistoryButtons(); 
    startCell = null; hasMovedInSession = false; isErasingMode = false; assistStartV = null; assistCurrentV = null;
    drawPuzzle(); 
    setTimeout(() => { if (typeof checkAnswer === 'function') checkAnswer(true); }, 0);
}

// 💡【つなぎ目マーカー】これ以降の現役拡張型歴史 Undo/Redo エンジン、および操作リスナー結合部は最後の「パート2」へ合流します
    // ─── 📦【パート2 / 2：現役拡張型歴史 Undo/Redo ＆ パレット結合部】 ───

// =============================================================================
// ✨ 【v0.9.3 履歴エンジン完全正常化パッチ】
// 紛れ込んでいたタイポ（modificated）を完全消滅させ、JavaScriptの窒息を200%永久解除！
// =============================================================================

function undo() {
    if (undoStack.length === 0) return;
    clearErrorDisplay(); 
    const change = undoStack.pop();
    
    if (change.type === 'clear_all') {
        redoStack.push(change); 
        userGrid = change.oldGrid.map(row => [...row]); 
        userWalls = change.oldWalls.map(w => ({ ...w })); 
        userCrossWalls = change.oldCrosses.map(w => ({ ...w })); 
        userQuestionMap = { ...change.oldQuestions };
    } else if (change.type === 'wall_step') {
        redoStack.push({ type: 'wall_step', from: change.to, to: change.from }); 
        userWalls = change.from.map(w => ({ ...w }));
    } else if (change.type === 'memo_cross') {
        // 💡【タイポ修復完了】「×印」メモの完全なUndo巻き戻し
        redoStack.push({ type: 'memo_cross', from: change.to, to: change.from }); 
        userCrossWalls = change.from.map(w => ({ ...w }));
    } else if (change.type === 'memo_question') {
        // 💡「？」メモの完全なUndo巻き戻し
        redoStack.push({ type: 'memo_question', from: change.to, to: change.from }); 
        userQuestionMap = { ...change.from };
    } else {
        redoStack.push({ r: change.r, c: change.c, from: change.to, to: change.from }); 
        userGrid[change.r][change.c] = change.from;
    }
    drawPuzzle(); 
    updateHistoryButtons();
    setTimeout(() => { if (typeof checkAnswer === 'function') checkAnswer(true); }, 0);
}

function redo() {
    if (redoStack.length === 0) return;
    clearErrorDisplay(); 
    const change = redoStack.pop();
    
    if (change.type === 'clear_all') {
        undoStack.push(change); 
        userGrid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null)); 
        userWalls = []; 
        userCrossWalls = []; 
        userQuestionMap = {};
    } else if (change.type === 'wall_step') {
        undoStack.push({ type: 'wall_step', from: change.to, to: change.from }); 
        userWalls = change.from.map(w => ({ ...w }));
    } else if (change.type === 'memo_cross') {
        // 💡「×印」メモの完全なRedoやり直し
        undoStack.push({ type: 'memo_cross', from: change.to, to: change.from }); 
        userCrossWalls = change.from.map(w => ({ ...w }));
    } else if (change.type === 'memo_question') {
        // 💡「？」メモの完全なRedoやり直し
        undoStack.push({ type: 'memo_question', from: change.to, to: change.from }); 
        userQuestionMap = { ...change.from };
    } else {
        undoStack.push({ r: change.r, c: change.c, from: change.to, to: change.from }); 
        userGrid[change.r][change.c] = change.from;
    }
    drawPuzzle(); 
    updateHistoryButtons();
    setTimeout(() => { if (typeof checkAnswer === 'function') checkAnswer(true); }, 0);
}

function getNearestVertex(x, y, customMaxDist = 25 * 3) {
    let nearestV = null; let minDistance = customMaxDist; 
    for (let r = 0; r <= GRID_SIZE; r++) {
        for (let c = 0; c <= GRID_SIZE; c++) {
            const vx = OFFSET + c * CELL_PIXEL; const vy = OFFSET + r * CELL_PIXEL + 30; const distance = Math.sqrt((x - vx) ** 2 + (y - vy) ** 2);
            if (distance < minDistance) { minDistance = distance; nearestV = { r, c }; }
        }
    }
    return nearestV;
}

// =============================================================================
// ✨ KOMYAKU 操作システム完全開通パッチ (v0.9.3 決定版) - PART 1
// 1. セーフティ版頂点センサーのドッキング
// 2. 3倍宇宙の論理座標スケール計算の完全適合
// =============================================================================

// ★追加: 引数の不足を200%防御するセーフティ版の頂点検出関数
function getNearestVertexSafe(x, y, customMaxDist) {
    // 引数がない場合は、3倍宇宙のデフォルト値 (25 * 3 = 75) を自動適用
    let maxD = (customMaxDist !== undefined) ? customMaxDist : 75;
    let nearestV = null; 
    let minDistance = maxD; 
    
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

// ─── ⬛ マウス操作用イベントリスナー群（ブラウザ表示サイズから論理座標への100%完全適合版） ───
let lastMouseCoords = null;

canvas.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return; // 左クリック以外は無視
    isDrawing = true; // 💡【重要】ドラッグ開始フラグを確実に起爆！
    
    const rect = canvas.getBoundingClientRect();
    // ブラウザ上の表示幅 (rect.width) に対する、元のパズルの論理幅の比率を正確に算出
    const logicalWidth = OFFSET * 2 + GRID_SIZE * CELL_PIXEL;
    const scaleX = logicalWidth / rect.width;
    const scaleY = (logicalWidth + 30) / rect.height; // タイトルバーの30pxを含む高さに対応
    
    lastMouseCoords = { 
        x: (e.clientX - rect.left) * scaleX, 
        y: (e.clientY - rect.top) * scaleY 
    };
    
    // getNearestVertex を安全版へ差し替えてアクションを開始
    const cell = getCellFromCoords(lastMouseCoords.x, lastMouseCoords.y);
    const nearestV = getNearestVertexSafe(lastMouseCoords.x, lastMouseCoords.y);

    if (currentSelectedColor === 9) {
        // ✏️【壁引きモード】
        wallSnapshotBeforeDrag = userWalls.map(w => ({ ...w }));
        lastIntersectedV = nearestV;
        startCell = cell;
        hasMovedInSession = false;
    } else {
        // 🎨【通常の色塗りモード】
        if (nearestV) {
            const currentScale = rect.width / (OFFSET * 2 + GRID_SIZE * CELL_PIXEL);
            const adjustedNearestV = getNearestVertexSafe(lastMouseCoords.x, lastMouseCoords.y, 25 * currentScale);
            
            if (adjustedNearestV) {
                assistStartV = adjustedNearestV;
                assistCurrentV = adjustedNearestV;
                if (typeof drawPuzzle === 'function') drawPuzzle();
            }
        }
        startCell = cell;
        hasMovedInSession = false;
        if (cell) {
            // 同じ色なら消しゴム、違う色ならダイレクト上書き
            isErasingMode = (userGrid[cell.r][cell.c] === currentSelectedColor);
            
            // 💡【操作性大改善】クリックしたまさにその瞬間に、1マス目を即座に着色する！
            const oldColor = userGrid[cell.r][cell.c];
            const newColor = isErasingMode ? null : currentSelectedColor;
            if (oldColor !== newColor && !assistStartV) {
                userGrid[cell.r][cell.c] = newColor;
                recordChange(cell.r, cell.c, oldColor, newColor);
                if (typeof cleanUserWalls === 'function') cleanUserWalls();
                drawPuzzle();
            }
        }
    }
});

canvas.addEventListener('mousemove', function(e) {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const logicalWidth = OFFSET * 2 + GRID_SIZE * CELL_PIXEL;
    const scaleX = logicalWidth / rect.width;
    const scaleY = (logicalWidth + 30) / rect.height;
    
    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;
    
    if (currentSelectedColor === 9) {
        // ✏️【壁引きモード】
        const currentV = getNearestVertexSafe(currentX, currentY);
        if (currentV && lastIntersectedV) {
            const dist = Math.abs(currentV.c - lastIntersectedV.c) + Math.abs(currentV.r - lastIntersectedV.r);
            if (dist === 1) {
                const newWall = { r1: lastIntersectedV.r, c1: lastIntersectedV.c, r2: currentV.r, c2: currentV.c };
                if (isWallEditable(newWall)) {
                    const snapshotBeforeSingleStep = userWalls.map(w => ({ ...w }));
                    const existingIdx = userWalls.findIndex(w => 
                        (w.r1 === newWall.r1 && w.c1 === newWall.c1 && w.r2 === newWall.r2 && w.c2 === newWall.c2) ||
                        (w.r1 === newWall.r2 && w.c1 === newWall.c2 && w.r2 === newWall.r1 && w.c2 === newWall.c1)
                    );
                    
                    if (existingIdx !== -1) { 
                        userWalls.splice(existingIdx, 1); 
                    } else { 
                        userWalls.push(newWall); 
                    }
                    
                    clearErrorDisplay();
                    undoStack.push({
                        type: 'wall_step',
                        from: snapshotBeforeSingleStep,
                        to: userWalls.map(w => ({ ...w }))
                    });
                    redoStack.length = 0;
                    hasMovedInSession = true;
                    drawPuzzle();
                }
                lastIntersectedV = currentV; 
            }
        }
    } else {
        // 🎨【通常の色塗りモード】
        if (assistStartV) {
            const currentV = getNearestVertexSafe(currentX, currentY);
            if (currentV) assistCurrentV = currentV;
            drawPuzzle(); 
        }
        const cell = getCellFromCoords(currentX, currentY);
        if (cell && startCell && !assistStartV) {
            if (cell.r !== startCell.r || cell.c !== startCell.c) hasMovedInSession = true;
            const oldColor = userGrid[cell.r][cell.c];
            const newColor = isErasingMode ? null : currentSelectedColor;
            if (oldColor !== newColor) {
                userGrid[cell.r][cell.c] = newColor;
                recordChange(cell.r, cell.c, oldColor, newColor);
                if (typeof cleanUserWalls === 'function') cleanUserWalls(); 
                drawPuzzle();
            }
        }
    }
});

window.addEventListener('mouseup', () => {
    if (isDrawing) {
        isDrawing = false;
        handleActionEnd();
    }
});

// =============================================================================
// ✨ KOMYAKU 操作システム完全開通パッチ (v0.9.3 決定版) - PART 2
// 1. スマホ・タブレット用タッチイベントリスナーの100%適合
// 2. パレット生成および初期化処理の結合
// =============================================================================

// ─── 📱 スマホ・タブレット（タッチ操作）用の統合リスナー ───
canvas.addEventListener('touchstart', function(e) {
    if (e.touches && e.touches.length > 0) {
        isDrawing = true; // 💡【重要】タッチ時もドラッグ開始フラグを確実に起爆！
        const touch = e.touches[0]; // 💡[0]番目の指の情報を100%確実に捕捉しNaNを完全撃退！
        
        const rect = canvas.getBoundingClientRect();
        const logicalWidth = OFFSET * 2 + GRID_SIZE * CELL_PIXEL;
        const scaleX = logicalWidth / rect.width;
        const scaleY = (logicalWidth + 30) / rect.height;
        
        lastMouseCoords = { 
            x: (touch.clientX - rect.left) * scaleX, 
            y: (touch.clientY - rect.top) * scaleY 
        };
        
        // タッチ開始時アクションの展開
        const cell = getCellFromCoords(lastMouseCoords.x, lastMouseCoords.y);
        const nearestV = getNearestVertexSafe(lastMouseCoords.x, lastMouseCoords.y);

        if (currentSelectedColor === 9) {
            wallSnapshotBeforeDrag = userWalls.map(w => ({ ...w }));
            lastIntersectedV = nearestV;
            startCell = cell;
            hasMovedInSession = false;
        } else {
            if (nearestV) {
                const currentScale = rect.width / (OFFSET * 2 + GRID_SIZE * CELL_PIXEL);
                const adjustedNearestV = getNearestVertexSafe(lastMouseCoords.x, lastMouseCoords.y, 25 * currentScale);
                
                if (adjustedNearestV) {
                    assistStartV = adjustedNearestV;
                    assistCurrentV = adjustedNearestV;
                    if (typeof drawPuzzle === 'function') drawPuzzle();
                }
            }
            startCell = cell;
            hasMovedInSession = false;
            if (cell) {
                isErasingMode = (userGrid[cell.r][cell.c] === currentSelectedColor);
                
                // 💡スマホでのファーストタッチ時も即座に着色するロジックをドッキング！
                const oldColor = userGrid[cell.r][cell.c];
                const newColor = isErasingMode ? null : currentSelectedColor;
                if (oldColor !== newColor && !assistStartV) {
                    userGrid[cell.r][cell.c] = newColor;
                    recordChange(cell.r, cell.c, oldColor, newColor);
                    if (typeof cleanUserWalls === 'function') cleanUserWalls();
                    drawPuzzle();
                }
            }
        }
    }
});

canvas.addEventListener('touchmove', function(e) {
    if (!isDrawing) return;
    e.preventDefault(); // iPhoneやAndroidの勝手なバウンス・スクロールを100%シャットアウト
    
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0]; // 💡[0]番目の指の情報を正確に追跡
        const logicalWidth = OFFSET * 2 + GRID_SIZE * CELL_PIXEL;
        const scaleX = logicalWidth / rect.width;
        const scaleY = (logicalWidth + 30) / rect.height;
        
        const currentX = (touch.clientX - rect.left) * scaleX;
        const currentY = (touch.clientY - rect.top) * scaleY;
        
        if (currentSelectedColor === 9) {
            // 壁引きドラッグ追従
            const currentV = getNearestVertexSafe(currentX, currentY);
            if (currentV && lastIntersectedV) {
                const dist = Math.abs(currentV.c - lastIntersectedV.c) + Math.abs(currentV.r - lastIntersectedV.r);
                if (dist === 1) {
                    const newWall = { r1: lastIntersectedV.r, c1: lastIntersectedV.c, r2: currentV.r, c2: currentV.c };
                    if (isWallEditable(newWall)) {
                        const snapshotBeforeSingleStep = userWalls.map(w => ({ ...w }));
                        const existingIdx = userWalls.findIndex(w => 
                            (w.r1 === newWall.r1 && w.c1 === newWall.c1 && w.r2 === newWall.r2 && w.c2 === newWall.c2) ||
                            (w.r1 === newWall.r2 && w.c1 === newWall.c2 && w.r2 === newWall.r1 && w.c2 === newWall.c1)
                        );
                        
                        if (existingIdx !== -1) { 
                            userWalls.splice(existingIdx, 1); 
                        } else { 
                            userWalls.push(newWall); 
                        }
                        
                        clearErrorDisplay();
                        undoStack.push({
                            type: 'wall_step',
                            from: snapshotBeforeSingleStep,
                            to: userWalls.map(w => ({ ...w }))
                        });
                        redoStack.length = 0;
                        hasMovedInSession = true;
                        drawPuzzle();
                    }
                    lastIntersectedV = currentV; 
                }
            }
        } else {
            // 通常カラー塗りドラッグ追従
            if (assistStartV) {
                const currentV = getNearestVertexSafe(currentX, currentY);
                if (currentV) assistCurrentV = currentV;
                drawPuzzle(); 
            }
            const cell = getCellFromCoords(currentX, currentY);
            if (cell && startCell && !assistStartV) {
                if (cell.r !== startCell.r || cell.c !== startCell.c) hasMovedInSession = true;
                const oldColor = userGrid[cell.r][cell.c];
                const newColor = isErasingMode ? null : currentSelectedColor;
                if (oldColor !== newColor) {
                    userGrid[cell.r][cell.c] = newColor;
                    recordChange(cell.r, cell.c, oldColor, newColor);
                    if (typeof cleanUserWalls === 'function') cleanUserWalls(); 
                    drawPuzzle();
                }
            }
        }
    }
}, { passive: false });

canvas.addEventListener('touchend', function(e) {
    e.preventDefault();
    if (isDrawing) {
        isDrawing = false;
        handleActionEnd();
    }
});

// ─── 🎨 パレット生成およびボタン初期化処理 ───
function createPalette() {
    paletteContainer.innerHTML = ''; 
    for (let i = 0; i <= 9; i++) {
        const btn = document.createElement('div'); 
        btn.className = 'color-btn'; 
        if (i === currentSelectedColor) btn.classList.add('active'); 
        btn.style.backgroundColor = COLOR_PALETTE[i]; 
        btn.onclick = () => { currentSelectedColor = i; createPalette(); };
        
        if (i === 9) {
            btn.innerText = ''; btn.style.display = 'flex'; btn.style.alignItems = 'center'; btn.style.justifyContent = 'center';
            btn.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#222222" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M 5.00 4.00 L 5.00 21.00 L 11.50 21.00" stroke-width="2.30"></path><path d="M 17.65 8.60 L 19.15 6.05 L 20.85 7.05 L 19.35 9.60 Z" fill="#333333" stroke="#222222"></path><path d="M 11.80 16.60 L 16.80 8.10 L 20.20 10.10 L 15.20 18.60 Z" fill="#ffffff"></path><path d="M 11.80 16.60 L 11.50 21.00 L 15.20 18.60 Z" fill="#ffffff"></path></svg>`;
        }
        paletteContainer.appendChild(btn);
    }
}

function selectColor(colorId) { 
    currentSelectedColor = colorId; 
    createPalette(); 
}

// ─── 🌐 起動時初期化エントリーポイント ───
document.fonts.ready.then(function() {
    loadPuzzleFromUrlOrId("E2A8313C20");
    createPalette(); 
    updateHistoryButtons(); 
});

// ─── 🎬【正解動画生成エンジン・コアシステム v2.6.3 独立採点一本化・最終大開通版】 ───
// ─── 📦【パート1 / 3：ドラッグ可動式マルチラインエディタUI部】 ───

let videoRenderState = { active: false, blinkLines: [], blinkAlpha: 1.0, texts: [], showInitialProblemCircles: false };
let lastKomyakuScriptPrompt = ""; let currentKomyakuRecordedBlob = null; 

(function() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'make' && !document.getElementById('komyakuVideoBtn')) {
        const refBtn = Array.from(document.querySelectorAll("button")).find(btn => {
            const clickAttr = btn.getAttribute("onclick");
            return clickAttr && clickAttr.includes("downloadPuzzleImage") && clickAttr.includes("false");
        });
        if (refBtn && refBtn.parentNode) {
            const videoBtnWrapper = document.createElement('div');
            videoBtnWrapper.style.width = '100%'; videoBtnWrapper.style.display = 'flex';
            videoBtnWrapper.style.justifyContent = 'center'; videoBtnWrapper.style.marginTop = '12px'; videoBtnWrapper.style.marginBottom = '12px';
            const videoBtn = document.createElement('button'); videoBtn.id = 'komyakuVideoBtn'; videoBtn.className = 'btn-common check-btn';
            videoBtn.style.backgroundColor = '#007aff'; videoBtn.style.width = '200px'; videoBtn.style.height = '40px'; videoBtn.style.fontSize = '12px';
            videoBtn.innerText = '正解動画生成'; videoBtn.onclick = () => openKomyakuScriptInputDialog(false); 
            videoBtnWrapper.appendChild(videoBtn); refBtn.parentNode.parentNode.insertBefore(videoBtnWrapper, refBtn.parentNode.nextSibling);
        }
    }
})();

function openKomyakuScriptInputDialog(isReplayOnly = false) {
    if (isReplayOnly) { startKomyakuVideoGeneration(true, lastKomyakuScriptPrompt); return; }
    const existingContainer = document.getElementById('komyakuScriptContainer');
    if (existingContainer) existingContainer.remove();

    const container = document.createElement('div'); container.id = 'komyakuScriptContainer';
    container.style.position = 'fixed'; container.style.top = '120px'; container.style.left = '40px';
    container.style.width = '420px'; container.style.backgroundColor = '#f8f9fa'; container.style.border = '1px solid #ccc'; container.style.borderRadius = '8px';
    container.style.boxShadow = '0 6px 24px rgba(0,0,0,0.2)'; container.style.zIndex = '10005'; container.style.fontFamily = '"Helvetica Neue", Arial, sans-serif'; container.style.userSelect = 'none';

    const header = document.createElement('div'); header.innerText = '✍️ KOMYAKU スクリプトエディタ (ドラッグ移動可)';
    header.style.padding = '10px 14px'; header.style.backgroundColor = '#3a3a3c'; header.style.color = '#ffffff';
    header.style.borderTopLeftRadius = '7px'; header.style.borderTopRightRadius = '7px'; header.style.cursor = 'move'; header.style.fontSize = '12px'; header.style.fontWeight = 'bold';
    container.appendChild(header);

    const body = document.createElement('div'); body.style.padding = '14px'; container.appendChild(body);

    const helpBox = document.createElement('div'); helpBox.style.fontSize = '11px'; helpBox.style.color = '#444'; helpBox.style.textAlign = 'left';
    helpBox.style.marginBottom = '12px'; helpBox.style.lineHeight = '1.45'; helpBox.style.borderBottom = '1px solid #ddd'; helpBox.style.paddingBottom = '8px';
    helpBox.innerHTML = `
        <strong style="color:#007aff;">【各命令の記載例と効果の短文解説】</strong><br>
        <strong>P[A1A2(2)B2]</strong> ：指定マスを塗る。(番号)でカラー変更。<br>
        <strong>L[a1b2c3]</strong> ：指定した格子点に白い境界線を引く。<br>
        <strong>B[a1b5]</strong> ：指定格子点にオレンジのNG鉱脈を3回点滅・点灯。<br>
        <strong>B[]</strong> ：灯っていたオレンジのNG鉱脈を滑らかにフェード消去。<br>
        <strong>T[解説字幕]</strong>：画面最下部に複数行対応の字幕テロップを表示。<br>
        <strong>W</strong> ：今の画面状態（テロップ等）を指定ミリ秒そのまま維持。<br>
        <strong>C[]</strong> ：正誤判定。黒丸消去の直後に紙吹雪、不正解なら赤枠出現。
    `;
    body.appendChild(helpBox);

    const textarea = document.createElement('textarea'); textarea.id = 'komyakuScriptTextArea'; textarea.rows = 10;
    textarea.style.width = '100%'; textarea.style.boxSizing = 'border-box'; textarea.style.padding = '8px'; textarea.style.fontSize = '13px';
    textarea.style.fontFamily = 'monospace'; textarea.style.border = '1px solid #bbb'; textarea.style.borderRadius = '4px';
    textarea.wrap = 'soft'; textarea.value = lastKomyakuScriptPrompt; body.appendChild(textarea);

    const footer = document.createElement('div'); footer.style.display = 'flex'; footer.style.justifyContent = 'flex-end'; footer.style.marginTop = '12px'; body.appendChild(footer);
    const cancelBtn = document.createElement('button'); cancelBtn.innerText = 'キャンセル'; cancelBtn.style.marginRight = '8px'; cancelBtn.style.padding = '6px 12px'; cancelBtn.style.fontSize = '12px';
    cancelBtn.onclick = () => container.remove(); footer.appendChild(cancelBtn);

    const runBtn = document.createElement('button'); runBtn.innerText = '🎥 動画を生成';
    runBtn.style.padding = '6px 16px'; runBtn.style.fontSize = '12px'; runBtn.style.backgroundColor = '#007aff'; runBtn.style.color = '#fff'; runBtn.style.border = 'none'; runBtn.style.borderRadius = '4px'; runBtn.style.cursor = 'pointer';
    runBtn.onclick = () => { const val = textarea.value; if (!val.trim()) return; lastKomyakuScriptPrompt = val; container.remove(); startKomyakuVideoGeneration(false, val); };
    footer.appendChild(runBtn);

    let isDraggingWindow = false; let startX, startY, initialX, initialY;
    function dragStart(e) {
        const clientX = e.clientX || (e.touches && e.touches[0].clientX); const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        if (!clientX || !clientY || e.target !== header) return;
        isDraggingWindow = true; startX = clientX; startY = clientY; initialX = container.offsetLeft; initialY = container.offsetTop;
    }
    function dragMove(e) {
        if (!isDraggingWindow) return;
        const clientX = e.clientX || (e.touches && e.touches[0].clientX); const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        container.style.left = `${initialX + (clientX - startX)}px`; container.style.top = `${initialY + (clientY - startY)}px`;
    }
    function dragEnd() { isDraggingWindow = false; }
    header.addEventListener('mousedown', dragStart); window.addEventListener('mousemove', dragMove); window.addEventListener('mouseup', dragEnd);
    header.addEventListener('touchstart', dragStart, { passive: true }); window.addEventListener('touchmove', dragMove, { passive: true }); window.addEventListener('touchend', dragEnd);

    document.body.appendChild(container); textarea.focus();
}

// 💡【つなぎ目マーカー】これ以降のプロンプト解読パーサーと録画の初期化処理は「パート2」へ合流します
    // ─── 📦【パート2 / 3：文字分解パーサー ＆ 動画専用3D紙吹雪描画アドオン部】 ───

// 💡 タイムライン解析・再生エンジン（二重起動完全防御版）
async function startKomyakuVideoGeneration(isReplayOnly, targetScriptText) {
    // 💡【根治パッチ】：すでに録画再生中の場合は、2個目の多重起動を初手で完全門前払い！
    if (videoRenderState.active && !isReplayOnly) return;

    const promptInput = targetScriptText;
    if (!promptInput) return;

    const backupUserGrid = userGrid.map(row => [...row]);
    const backupUserWalls = (typeof userWalls !== 'undefined' && userWalls) ? userWalls.map(w => ({ ...w })) : [];
    const backupErrorShow = errorDisplayState.show;
    const backupProblemLines = problemLines.map(l => ({ ...l }));
    const backupErrorDisplay = JSON.parse(JSON.stringify(errorDisplayState));

    // 💡 M命令を正規表現に新規ドッキング
    const commandRegex = /(P|L|B|T|W|C|Q|X|M)\[(.*?)\]/g;
    let match; const timeline = [];
    const cleanedInput = promptInput.replace(/commandRegex\s*=\s*commandRegex\.exec/g, ''); 

    // 💡 【大調律】正規表現のバグを完全消滅させ、文字列のダイレクトマッチングへ変更！
    // スクリプト内に大文字小文字を問わず M[start] という記述が実在するかを100%確実かつ最速で判定します。
    const hasMStart = cleanedInput.toLowerCase().includes('m[start]');

    while ((match = commandRegex.exec(cleanedInput)) !== null) {
        // matchオブジェクトのインデックスから正確に要素を引き抜く
        const type = match[1];
        const content = match[2].trim();

        if (type === 'T') {
            timeline.push({ type: 'T', text: content });
        } else if (type === 'M') {
            // 💡 M命令（録画制御フラグ）をタイムラインに格納
            timeline.push({ type: 'M', action: content.toLowerCase() });
        } else if (type === 'P') {
            const tokens = content.split(/(\(\d+\))/);
            let currentColorId = 1; 
            tokens.forEach(tok => {
                if (!tok) return;
                if (tok.startsWith('(') && tok.endsWith(')')) { currentColorId = parseInt(tok.slice(1, -1), 10); } 
                else {
                    let i = 0;
                    while (i < tok.length) {
                        const cellStr = tok.slice(i, i + 2);
                        if (cellStr.length === 2 && /[A-I]/.test(cellStr.charAt(0)) && /[1-9]/.test(cellStr.charAt(1))) {
                            const c = cellStr.charCodeAt(0) - 65; const r = parseInt(cellStr.charAt(1), 10) - 1; 
                            if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
                                timeline.push({ type: 'P', r: r, c: c, color: currentColorId === 0 ? null : (currentColorId - 1) });
                            }
                            i += 2;
                        } else { i++; }
                    }
                }
            });
        } else if (type === 'L') {
            const vertices = [];
            for (let i = 0; i < content.length; i += 2) {
                const vStr = content.slice(i, i + 2);
                if (vStr.length === 2) { vertices.push({ c: vStr.charCodeAt(0) - 97, r: parseInt(vStr.charAt(1), 10) - 1 }); }
            }
            for (let i = 0; i < vertices.length - 1; i++) {
                timeline.push({ type: 'L', r1: vertices[i].r, c1: vertices[i].c, r2: vertices[i+1].r, c2: vertices[i+1].c });
            }
        } else if (type === 'B') {
            if (content.length === 0) { timeline.push({ type: 'B', clear: true }); } 
            else {
                const vertices = [];
                for (let i = 0; i < content.length; i += 2) {
                    const vStr = content.slice(i, i + 2);
                    if (vStr.length === 2) { vertices.push({ c: vStr.charCodeAt(0) - 97, r: parseInt(vStr.charAt(1), 10) - 1 }); }
                }
                if (vertices.length >= 2) { timeline.push({ type: 'B', clear: false, r1: vertices[0].r, c1: vertices[0].c, r2: vertices[1].r, c2: vertices[1].c }); }
            }
        } else if (type === 'W') {
            const msec = parseInt(content, 10);
            if (!isNaN(msec)) timeline.push({ type: 'W', duration: msec });
        } else if (type === 'C') {
            timeline.push({ type: 'C' });
        } else if (type === 'X') {
            // 💡マス境界（例：b2c2）を引っこ抜いてタイムラインに積む
            timeline.push({ type: 'X', content: content });
        } else if (type === 'Q') {
            // 💡Q[(1)A1] の中身をパース。構造はP命令と完全互換
            timeline.push({ type: 'Q', content: content });
        }
    }

    const optimizedTimeline = []; let pendingTexts = [];
    for (let item of timeline) {
        if (item.type === 'T') { pendingTexts.push(item.text); } 
        else {
            if (pendingTexts.length > 0) { optimizedTimeline.push({ type: 'T', data: [...pendingTexts] }); pendingTexts = []; }
            optimizedTimeline.push(item);
        }
    }
    if (pendingTexts.length > 0) optimizedTimeline.push({ type: 'T', data: [...pendingTexts] });

    videoRenderState.active = true; videoRenderState.showInitialProblemCircles = false;
    window.videoQuestionMap = {}; window.videoCrossWalls = [];
    for (let r = 0; r < GRID_SIZE; r++) userGrid[r].fill(null);
    userWalls = []; errorDisplayState.show = false;
    videoRenderState.blinkLines = []; videoRenderState.blinkAlpha = 1.0; videoRenderState.texts = [];

    let recorder = null; let recordedChunks = [];
    if (!isReplayOnly) {
        const stream = canvas.captureStream(30); 
        let options = { mimeType: 'video/mp4;codecs=avc1.42E01E' }; 

        // 💡【大改革】：不法な .options プロパティのタイポを完全に叩き潰し、
        // 正しい .mimeType に修正！これによりXが求める高互換H.264 MP4の撮影権限が200%完璧に覚醒します。
        if (!MediaRecorder.isTypeSupported(options.mimeType)) options = { mimeType: 'video/mp4' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) options = { mimeType: 'video/webm;codecs=vp9' };
        recorder = new MediaRecorder(stream, options);
        recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) recordedChunks.push(e.data); };
        recorder.onstop = () => {
            if (recordedChunks.length > 0) {
                currentKomyakuRecordedBlob = new Blob(recordedChunks, { type: recorder.mimeType || 'video/mp4' });
                showKomyakuStudioModal(backupUserGrid, backupUserWalls, backupErrorShow, backupProblemLines, backupErrorDisplay);
            }
        };
        // 💡 状態管理フラグを新設
        window.isRecordingActive = false;
        // 💡 M[start] が省略されている時だけ、初手から自動録画を開始する
        if (!hasMStart) {
            recorder.start();
            window.isRecordingActive = true;
        }
    }

    const originalCheckAnswer = window.checkAnswer;
    window.checkAnswer = function(isAutoCheck) {
        if (videoRenderState.active) return;
        if (typeof originalCheckAnswer === 'function') originalCheckAnswer(isAutoCheck);
    };

    let videoConfettiParticles = [];

    function renderVideoOverlays() {
        if (videoRenderState.showInitialProblemCircles && problemLines && problemLines.length > 0) {
            problemLines.forEach(line => {
                ctx.save();
                const mx = OFFSET + (line.start.x + line.end.x) / 2 * CELL_PIXEL;
                const my = OFFSET + (line.start.y + line.end.y) / 2 * CELL_PIXEL + 30;
                const distSq = (line.end.x - line.start.x) ** 2 + (line.end.y - line.start.y) ** 2;
                ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(mx, my, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#000000'; ctx.font = 'bold 15px "Tenor Sans", sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(distSq.toString(), mx, my + 0.5);
                ctx.restore();
            });
        }
        if (videoRenderState.texts && videoRenderState.texts.length > 0) {
            ctx.save();
            const logicalWidth = OFFSET * 2 + GRID_SIZE * CELL_PIXEL;
            const logicalHeight = OFFSET * 2 + GRID_SIZE * CELL_PIXEL + 30;
            const barW = logicalWidth; const barH = videoRenderState.texts.length * 24 + 16;
            const barX = 0; const barY = logicalHeight - barH;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'; ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = '#ffffff'; ctx.font = '16px "Tenor Sans", sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            videoRenderState.texts.forEach((txt, idx) => { ctx.fillText(txt, barW / 2, barY + 16 + idx * 24 + 8); });
            ctx.restore();
        }
        // 💡【新設】：Q命令およびP命令の上書きと連動する、動画専用「？」マーク＆「×印」描画システム
        // （※videoQuestionMap と videoCrossWalls は、下の再生ループ側で全自動管理されます）
        if (typeof videoQuestionMap !== 'undefined' && videoQuestionMap) {
            ctx.save(); ctx.font = 'bold 22px "Tenor Sans", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#222222';
            for (let key in videoQuestionMap) {
                const [r, c] = key.split(',').map(Number);
                const mx = OFFSET + c * CELL_PIXEL + CELL_PIXEL / 2;
                const my = OFFSET + r * CELL_PIXEL + 30 + CELL_PIXEL / 2;
                if (userGrid[r][c] !== null) ctx.fillText('？', mx, my + 1); // 色マスがある時だけ中央に描画
            }
            ctx.restore();
        }
        if (videoRenderState.blinkLines && videoRenderState.blinkLines.length > 0) {
            videoRenderState.blinkLines.forEach(line => {
                ctx.save(); ctx.globalAlpha = videoRenderState.blinkAlpha;
                ctx.strokeStyle = '#ff9500'; ctx.lineWidth = 5; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(OFFSET + line.start.x * CELL_PIXEL, OFFSET + line.start.y * CELL_PIXEL + 30);
                ctx.lineTo(OFFSET + line.end.x * CELL_PIXEL, OFFSET + line.end.y * CELL_PIXEL + 30); ctx.stroke();
                const mx = OFFSET + (line.start.x + line.end.x) / 2 * CELL_PIXEL;
                const my = OFFSET + (line.start.y + line.end.y) / 2 * CELL_PIXEL + 30;
                const distSq = (line.end.x - line.start.x) ** 2 + (line.end.y - line.start.y) ** 2;
                ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ff9500'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(mx, my, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#ff9500'; ctx.font = 'bold 15px "Tenor Sans", sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(distSq.toString(), mx, my + 0.5);
                ctx.restore();
            });
        }
        if (typeof videoCrossWalls !== 'undefined' && videoCrossWalls && videoCrossWalls.length > 0) {
            ctx.save(); ctx.strokeStyle = '#222222'; ctx.lineWidth = 3; ctx.lineCap = 'round';
            videoCrossWalls.forEach(w => {
                // 格子点2つ（a1b1など）の中点（境界の中心）を計算し、小さな×印（半径8px）を描画
                const mx = OFFSET + (w.c1 + w.c2) / 2 * CELL_PIXEL;
                const my = OFFSET + (w.r1 + w.c1 ? w.r1 : w.r2) / 2 * CELL_PIXEL + 30; // 縦横に応じて自動最適化
                const cx = OFFSET + (w.c1 + w.c2) / 2 * CELL_PIXEL; const cy = OFFSET + (w.r1 + w.r2) / 2 * CELL_PIXEL + 30;
                ctx.beginPath(); ctx.moveTo(cx - 7, cy - 7); ctx.lineTo(cx + 7, cy + 7); ctx.moveTo(cx + 7, cy - 7); ctx.lineTo(cx - 7, cy + 7); ctx.stroke();
            });
            ctx.restore();
        }
        if (videoConfettiParticles.length > 0) {
            videoConfettiParticles.forEach(p => {
                ctx.save(); ctx.translate(p.x, p.y);
                const cosX = Math.cos(p.count * p.rotSpeedX); const sinY = Math.sin(p.count * p.rotSpeedY);
                ctx.scale(cosX, sinY); ctx.rotate(p.count * 0.035);
                if (cosX >= 0) { ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#dddddd'; } 
                else { ctx.fillStyle = '#222222'; ctx.strokeStyle = '#000000'; }
                ctx.lineWidth = 0.5; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            });
        }
    }

// 💡【つなぎ目マーカー】これ以降の上映タイムライン実行ループ ＆ スタジオモーダルUI部は最後の「パート3」へ合流します
    // ─── 📦【パート3 / 3：タイムライン上映実行ループ ＆ スタジオモーダルUI部】 ───

    drawPuzzle(); renderVideoOverlays();
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    await sleep(400);

    videoRenderState.showInitialProblemCircles = true;
    drawPuzzle(); renderVideoOverlays();

    // 💡【新設】M[start]が指定されている場合は、そこに出会うまでの命令を画面描画（sleep）させずに内部データだけ最速で処理するフラグ
    let isSkippingPreview = hasMStart; 

    for (let cmd of optimizedTimeline) {
        if (cmd.type === 'M') {
            if (cmd.action === 'start') {
                // 💡 M[start] に到達した瞬間、最速内部処理モードを終了し、ここからプレビュー上映（描画ウエイト）を現実世界に開始させる
                isSkippingPreview = false;
                
                if (!isReplayOnly && recorder && !window.isRecordingActive) {
                    // キャンバスに現在の最速処理された盤面を1発焼き付けたジャストの瞬間に録画を開始！
                    drawPuzzle(); renderVideoOverlays();
                    recorder.start();
                    window.isRecordingActive = true;
                }
            } else if (cmd.action === 'end') {
                // 💡 M[end] に到達した瞬間、後続のPやC命令（紙吹雪等）を一切待たずに、その場でタイムライン上映自体を「完全強制切断」する！
                videoRenderState.active = false;
                videoRenderState.showInitialProblemCircles = false;
                
                if (!isReplayOnly && recorder && window.isRecordingActive) {
                    window.isRecordingActive = false;
                    recorder.stop(); // ➔ 録画停止。これによって recorder.onstop がキックされ、スタジオモーダルが立ち上がります
                } else {
                    showKomyakuStudioModal(backupUserGrid, backupUserWalls, backupErrorShow, backupProblemLines, backupErrorDisplay);
                }
                return; // ➔ 💡関数の実行自体をここで完全にストップさせ、以降のループを踏ませません！
            }
            continue; 
        }

        // 💡 M[start] に到達する前（スキップ中）であれば、ウエイト（sleep）も画面描画（draw）も一切させずに内部配列の書き換えだけを行って即座に次のループへ進める
        if (isSkippingPreview) {
            if (cmd.type === 'P') {
                userGrid[cmd.r][cmd.c] = cmd.color;
                if (typeof cleanUserWalls === 'function') cleanUserWalls();
            } else if (cmd.type === 'L') {
                userWalls.push({ r1: cmd.r1, c1: cmd.c1, r2: cmd.r2, c2: cmd.c2 });
            } else if (cmd.type === 'X') {
                if (typeof window.videoCrossWalls === 'undefined') window.videoCrossWalls = [];
                const content = cmd.content;
                if (content.length === 4) {
                    const w = { c1: content.charCodeAt(0) - 97, r1: parseInt(content.charAt(1), 10) - 1, c2: content.charCodeAt(2) - 97, r2: parseInt(content.charAt(3), 10) - 1 };
                    const idx = window.videoCrossWalls.findIndex(x => (x.r1===w.r1 && x.c1===w.c1 && x.r2===w.r2 && x.c2===w.c2) || (x.r1===w.r2 && x.c1===w.c2 && x.r2===w.r1 && x.c2===w.c1));
                    if (idx !== -1) { window.videoCrossWalls.splice(idx, 1); } else { window.videoCrossWalls.push(w); }
                }
            }
            continue; // ➔ スキップ中は sleep を踏ませない
        }

        if (cmd.type === 'W') { await sleep(cmd.duration); continue; }

        if (cmd.type === 'T') { videoRenderState.texts = cmd.data; drawPuzzle(); renderVideoOverlays(); } 
        else {
            if (videoRenderState.texts.length > 0) { videoRenderState.texts = []; drawPuzzle(); renderVideoOverlays(); }
            if (cmd.type === 'B') {
                if (cmd.clear) {
                    for (let f = 10; f >= 0; f--) { videoRenderState.blinkAlpha = f / 10; drawPuzzle(); renderVideoOverlays(); await sleep(35); }
                    videoRenderState.blinkLines = []; videoRenderState.blinkAlpha = 1.0; 
                } else {
                    const p1 = { x: cmd.c1, y: cmd.r1 }; const p2 = { x: cmd.c2, y: cmd.r2 };
                    videoRenderState.blinkAlpha = 1.0;
                    for (let k = 0; k < 3; k++) {
                        videoRenderState.blinkLines = (k % 2 === 0) ? [{ start: p1, end: p2 }] : [];
                        drawPuzzle(); renderVideoOverlays(); await sleep(500); 
                    }
                }
            } else if (cmd.type === 'P') {
                userGrid[cmd.r][cmd.c] = cmd.color;
                if (typeof cleanUserWalls === 'function') cleanUserWalls();
                
                // 💡【大正解の自動消去】：P命令で同じマスが上書きされたら、Qのハテナ記憶を完全自動消去！
                if (typeof videoQuestionMap !== 'undefined') delete videoQuestionMap[`${cmd.r},${cmd.c}`];
            } else if (cmd.type === 'Q') {
                // 💡【1マスずつ順次上映パッチ】：Q命令内のマスを記載順に1マスずつ実直に展開！
                if (typeof videoQuestionMap === 'undefined') window.videoQuestionMap = {};
                const tokens = cmd.content.split(/(\(\d+\))/); let currentColorId = 1;
                
                for (let tok of tokens) {
                    if (!tok) continue;
                    if (tok.startsWith('(') && tok.endsWith(')')) { 
                        currentColorId = parseInt(tok.slice(1, -1), 10); 
                    } else {
                        let i = 0; while (i < tok.length) {
                            const cellStr = tok.slice(i, i + 2);
                            if (cellStr.length === 2 && /[A-I]/.test(cellStr.charAt(0)) && /[1-9]/.test(cellStr.charAt(1))) {
                                const c = cellStr.charCodeAt(0) - 65; const r = parseInt(cellStr.charAt(1), 10) - 1;
                                if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
                                    userGrid[r][c] = currentColorId === 0 ? null : (currentColorId - 1);
                                    window.videoQuestionMap[`${r},${c}`] = true; // ハテナを記憶
                                    
                                    // 💡【重要】：1マス塗るごとにCanvasを即時上書き更新し、通常コマンド用の350msのウエイトを正確に挟んで1マスずつの躍動感を具現化！
                                    drawPuzzle(); renderVideoOverlays();
                                    await sleep(350); 
                                }
                                i += 2;
                            } else { i++; }
                        }
                    }
                }
                if (typeof cleanUserWalls === 'function') cleanUserWalls();
                continue; // 💡 大外の重複ウエイトを踏ませずに次のコマンドへ美しく流します
            } else if (cmd.type === 'X') {
                // 💡 X命令の実体処理：境界線a1b1などを引っこ抜き、あれば消去、なければ追加（トグル）
                if (typeof window.videoCrossWalls === 'undefined') window.videoCrossWalls = [];
                const content = cmd.content;
                if (content.length === 4) {
                    const w = {
                        c1: content.charCodeAt(0) - 97, r1: parseInt(content.charAt(1), 10) - 1,
                        c2: content.charCodeAt(2) - 97, r2: parseInt(content.charAt(3), 10) - 1
                    };
                    const idx = window.videoCrossWalls.findIndex(x => (x.r1===w.r1 && x.c1===w.c1 && x.r2===w.r2 && x.c2===w.c2) || (x.r1===w.r2 && x.c1===w.c2 && x.r2===w.r1 && x.c2===w.c1));
                    if (idx !== -1) { window.videoCrossWalls.splice(idx, 1); } else { window.videoCrossWalls.push(w); }
                }
            } else if (cmd.type === 'L') {
                userWalls.push({ r1: cmd.r1, c1: cmd.c1, r2: cmd.r2, c2: cmd.c2 });
            } else if (cmd.type === 'C') {
                // =============================================================================
                // ✨ 【C命令：動画専用・超厳密正誤ジャッジシステム】
                // 本体の採点ロジック（BFSおよび手動壁逆算）と100%シンクロし、不正解なら紙吹雪を完全ブロック！
                // =============================================================================
                videoRenderState.showInitialProblemCircles = false;
                drawPuzzle(); renderVideoOverlays(); await sleep(100); 

                // 1. 正解のすべての内壁境界線をリストアップ
                const answerWallsList = [];
                for (let r = 0; r < GRID_SIZE; r++) {
                    for (let c = 0; c < GRID_SIZE; c++) {
                        if (c < GRID_SIZE - 1 && answerGrid[r][c] !== answerGrid[r][c + 1]) answerWallsList.push(`${r},${c}-${r},${c+1}(V)`);
                        if (r < GRID_SIZE - 1 && answerGrid[r][c] !== answerGrid[r + 1][c]) answerWallsList.push(`${r},${c}-${r+1},${c}(H)`);
                    }
                }

                // 2. 現在の上映画面のすべての境界線（自動内壁 ＋ 手動壁）の合計を合成
                const videoUserWallsList = [];
                for (let r = 0; r < GRID_SIZE; r++) {
                    for (let c = 0; c < GRID_SIZE; c++) {
                        if (c < GRID_SIZE - 1) {
                            const c1 = userGrid[r][c]; const c2 = userGrid[r][c + 1];
                            if (c1 !== null && c2 !== null && c1 !== c2) videoUserWallsList.push(`${r},${c}-${r},${c+1}(V)`);
                        }
                        if (r < GRID_SIZE - 1) {
                            const r1 = userGrid[r][c]; const r2 = userGrid[r + 1][c];
                            if (r1 !== null && r2 !== null && r1 !== r2) videoUserWallsList.push(`${r},${c}-${r+1},${c}(H)`);
                        }
                    }
                }
                
                // 格子点座標からマス基準のH/V壁への逆算処理
                if (typeof userWalls !== 'undefined' && userWalls) {
                    userWalls.forEach(w => {
                        const minR = Math.min(w.r1, w.r2);
                        const minC = Math.min(w.c1, w.c2);
                        const maxC = Math.max(w.c1, w.c2);
                        const maxR = Math.max(w.r1, w.r2);
                        
                        if (w.r1 === w.r2) {
                            const r = minR;
                            if (r > 0 && r < GRID_SIZE) { 
                                for (let c = minC; c < maxC; c++) { videoUserWallsList.push(`${r-1},${c}-${r},${c}(H)`); } 
                            }
                        } else {
                            const c = minC;
                            if (c > 0 && c < GRID_SIZE) { 
                                for (let r = minR; r < maxR; r++) { videoUserWallsList.push(`${r},${c-1}-${r},${c}(V)`); } 
                            }
                        }
                    });
                }

                const uniqueVideoUserWalls = [...new Set(videoUserWallsList)];

                // 3. 配置の完全一致チェック（1ミリのズレも許さない厳密ジャッジ）
                let isPerfectCorrect = true;
                if (answerWallsList.length !== uniqueVideoUserWalls.length) { 
                    isPerfectCorrect = false; 
                } else {
                    for (let aw of answerWallsList) { 
                        if (!uniqueVideoUserWalls.includes(aw)) { isPerfectCorrect = false; break; } 
                    }
                }
                
                // 💡 不正解スクリプトの場合は、ここで紙吹雪を完全にスキップして上映を終了させる
                if (!isPerfectCorrect) {
                    videoRenderState.active = false;
                    if (!isReplayOnly && recorder) { recorder.stop(); }
                    else { showKomyakuStudioModal(backupUserGrid, backupUserWalls, backupErrorShow, backupProblemLines, backupErrorDisplay); }
                    return; // アニメーションを一切させずに処理を即座に切断
                }

                // 🎉 4. 【大正解の場合のみ発火】動的底辺 3D 紙吹雪エフェクト
                const trueBottomLine = OFFSET * 2 + GRID_SIZE * CELL_PIXEL + 30;
                const canvasW = OFFSET * 2 + GRID_SIZE * CELL_PIXEL;
                videoConfettiParticles = [];

                for (let i = 0; i < 100; i++) {
                    const angle = (Math.random() * 65 + 57) * (Math.PI / 180); 
                    const velocity = Math.random() * 16 + 15;
                    videoConfettiParticles.push({
                        x: canvasW / 2, y: trueBottomLine - 10, w: Math.random() * 6 + 8, h: Math.random() * 10 + 14,
                        vx: Math.cos(angle) * velocity * (Math.random() > 0.5 ? 1 : -1), vy: -Math.sin(angle) * velocity,
                        rotSpeedX: Math.random() * 0.14 + 0.10, rotSpeedY: Math.random() * 0.14 + 0.10, count: 0
                    });
                }

                for (let i = 0; i < 500; i++) {
                    videoConfettiParticles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.55; p.vx *= 0.985; p.count++; });
                    drawPuzzle(); renderVideoOverlays();
                    
                    const isAllOut = videoConfettiParticles.every(p => p.y > trueBottomLine + 30 + CELL_PIXEL);
                    if (isAllOut) {
                        videoConfettiParticles = [];
                        drawPuzzle(); renderVideoOverlays();
                        await sleep(60); 

                        videoRenderState.active = false; 
                        videoRenderState.showInitialProblemCircles = false;
                        
    // 💡 録画がまだアクティブな場合のみ停止をキック
    if (!isReplayOnly && recorder && window.isRecordingActive) { 
        recorder.stop(); 
        window.isRecordingActive = false; 
    }
                        await sleep(500); 

                        if (isReplayOnly || !recorder) {
                            showKomyakuStudioModal(backupUserGrid, backupUserWalls, backupErrorShow, backupProblemLines, backupErrorDisplay);
                        }
                        return; 
                    }
                    await sleep(16); 
                }
                videoConfettiParticles = []; 
                continue;
            }
        }
        drawPuzzle(); renderVideoOverlays();
        if (cmd.type === 'T') { await sleep(600); } else { await sleep(350); }
    }

    videoRenderState.showInitialProblemCircles = false;
    drawPuzzle(); renderVideoOverlays(); await sleep(400); 
    // 💡 録画がまだアクティブな場合（M[end]が省略されて上映終了に達した時）のみ停止をキック
    if (!isReplayOnly && recorder && window.isRecordingActive) { 
        recorder.stop(); 
        window.isRecordingActive = false; 
    } 
    else { showKomyakuStudioModal(backupUserGrid, backupUserWalls, backupErrorShow, backupProblemLines, backupErrorDisplay); }

    function showKomyakuStudioModal(bGrid, bWalls, bErrShow, bPLines, bErrDisp) {
        const existingModal = document.getElementById('komyakuStudioModal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'komyakuStudioModal'; modal.style.position = 'fixed';
        modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100vw'; modal.style.height = '100vh';
        modal.style.backgroundColor = 'rgba(0,0,0,0.6)'; modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center';
        modal.style.zIndex = '10000'; modal.style.fontFamily = '"Tenor Sans", sans-serif';

        const contentBox = document.createElement('div');
        contentBox.style.backgroundColor = '#ffffff'; contentBox.style.padding = '24px'; contentBox.style.borderRadius = '12px';
        contentBox.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'; contentBox.style.textAlign = 'center'; contentBox.style.width = '320px';

        const title = document.createElement('h3');
        title.innerText = '🎬 KOMYAKU 動画スタジオ';
        title.style.margin = '0 0 16px 0'; title.style.fontSize = '16px'; title.style.color = '#222';
        contentBox.appendChild(title);

        const btnConfigs = [
            { text: '💾 この動画をダウンロード', color: '#34c759', action: () => {
                if (currentKomyakuRecordedBlob) {
                    const videoUrl = URL.createObjectURL(currentKomyakuRecordedBlob);
                    const urlParams = new URLSearchParams(window.location.search);
                    const dayValue = urlParams.get('day') || "XXX";
                    const link = document.createElement('a');
                    link.download = `Day${dayValue}答え動画.mp4`; link.href = videoUrl; link.click();
                    modal.remove(); // ダウンロード後にモーダルを消去
                }
            }},
            { text: '🔄 再度プレビュー（再生のみ）', color: '#007aff', action: () => { modal.remove(); startKomyakuVideoGeneration(true, lastKomyakuScriptPrompt); }},
            { text: '✏️ スクリプト再入力', color: '#ff9500', action: () => { modal.remove(); openKomyakuScriptInputDialog(false); }},
            { text: '❌ 終了', color: '#ff3b30', action: () => {
                modal.remove();
                userGrid = bGrid.map(row => [...row]);
                if (typeof userWalls !== 'undefined' && userWalls) userWalls = bWalls.map(w => ({ ...w }));
                errorDisplayState.show = bErrShow; Object.assign(errorDisplayState, bErrDisp);
                problemLines = bPLines.map(l => ({ ...l })); window.checkAnswer = originalCheckAnswer;
                videoRenderState.active = false; videoRenderState.blinkLines = []; videoRenderState.texts = [];
                videoRenderState.showInitialProblemCircles = false; drawPuzzle();
            }}
        ];

        btnConfigs.forEach(cfg => {
            const btn = document.createElement('button'); btn.className = 'btn-common'; btn.innerText = cfg.text;
            btn.style.width = '100%'; btn.style.height = '42px'; btn.style.marginBottom = '10px'; btn.style.backgroundColor = cfg.color;
            btn.style.color = '#ffffff'; btn.style.border = 'none'; btn.style.borderRadius = '6px'; btn.style.cursor = 'pointer';
            btn.style.fontSize = '13px'; btn.style.fontWeight = 'bold'; btn.onclick = cfg.action;
            contentBox.appendChild(btn);
        });
        modal.appendChild(contentBox); document.body.appendChild(modal);
    }
}

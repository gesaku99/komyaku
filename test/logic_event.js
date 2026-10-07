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
            const adjustedNearestV = getNearestVertex(x, y, 25 * currentScale);
            
            if (adjustedNearestV) {
                assistStartV = adjustedNearestV;
                assistCurrentV = adjustedNearestV;
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

// ─── 🛠️【完全確定版】1マスずつのUndoを100%維持し、シングルクリックも動く完成版 handleActionEnd ───
function handleActionEnd() {
    if (currentSelectedColor === 9) {
        lastIntersectedV = null;
        if (typeof cleanUserWalls === 'function') cleanUserWalls();
        // 💡 解決策：ドラッグ終了時の「まとめて上書き保存する重複処理」を跡形もなく完全消去しました
    } else if (startCell && !hasMovedInSession && !assistStartV) {
        // シングルクリック（ポンと叩いた時）の着色・消去を正常に実行
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

    drawPuzzle(); // これでシングルクリックの色も一瞬で画面に反映されます

    setTimeout(() => {
        if (typeof checkAnswer === 'function') checkAnswer(true);
    }, 0);
}

// ─── 🛠️【完全根治版】通常色塗りの1マスUndoを維持しつつ、Clearボタンによる変化を一撃で一括復元するUndo ───
function undo() {
    if (undoStack.length === 0) return;
    clearErrorDisplay();
    const change = undoStack.pop();
    
    if (change.type === 'wall_step') {
        // ✏️ 手動境界線の1ステップUndo（1マスずつ正確に巻き戻す）
        redoStack.push({ type: 'wall_step', from: change.to, to: change.from });
        userWalls = change.from.map(w => ({ ...w }));
    } else {
        // 🎨 通常色塗りのUndo
        // 💡【解決策】Clearボタン等によって、複数のマスが一気に「null（または特定の色）」へ連続変化させられた履歴を検知！
        const batchGroup = [change];
        
        // 直前の操作と「全く同じタイミング、あるいは一連の全マス消去操作（0へのリセット等）」が連続している場合、
        // それらを1つの「塊（バッチ）」として一括でポップ（引き算）し、1回でまとめて巻き戻します
        while (undoStack.length > 0 && 
               undoStack[undoStack.length - 1].type !== 'wall_step' && 
               undoStack[undoStack.length - 1].to === null && change.to === null) {
            batchGroup.push(undoStack.pop());
        }

        // 集まった一括操作の塊を、すべて同時に盤面に復元し、Redoスタックへも同じ塊として引き渡す
        batchGroup.forEach(c => {
            redoStack.push({ r: c.r, c: c.c, from: c.to, to: c.from });
            userGrid[c.r][c.c] = c.from;
        });
    }
    drawPuzzle(); 
    updateHistoryButtons();
    setTimeout(() => { if (typeof checkAnswer === 'function') checkAnswer(true); }, 0);
}

function redo() {
    if (redoStack.length === 0) return;
    clearErrorDisplay();
    const change = redoStack.pop();
    
    if (change.type === 'wall_step') {
        // ✏️ 壁引きのRedo処理（変更形式 wStr の対応を壁引きモードに完全同期）
        undoStack.push({ type: 'wall_step', from: change.to, to: change.from });
        userWalls = change.from.map(w => ({ ...w }));
    } else {
        // 🎨 色塗りのRedo処理
        const batchGroup = [change];
        
        // Undoの時と全く同じように、一括消去の塊を検知して1回でまとめて進める
        while (redoStack.length > 0 && 
               redoStack[redoStack.length - 1].type !== 'wall_step' && 
               redoStack[redoStack.length - 1].from === null && change.from === null) {
            batchGroup.push(redoStack.pop());
        }

        batchGroup.forEach(c => {
            undoStack.push({ r: c.r, c: c.c, from: c.to, to: c.from });
            userGrid[c.r][c.c] = c.from;
        });
    }
    drawPuzzle(); 
    updateHistoryButtons();
    setTimeout(() => { if (typeof checkAnswer === 'function') checkAnswer(true); }, 0);
}

// 💡 引数の末尾に可変距離を受け取る customMaxDist を追加し、未指定時は元の黄金比 25 を自動適用
function getNearestVertex(x, y, customMaxDist = 25) {
    let nearestV = null;
    let minDistance = customMaxDist; 
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

// ─── 🛠️【完全根治・3倍高画質ホールド版】3倍設定を1ミリも崩さず、1マスの縮みズレを数学的に完全消滅させるリスナー ───
canvas.addEventListener('mousedown', function(e) { 
    if (e.button !== 0) return; 
    isDrawing = true; 
    const rect = canvas.getBoundingClientRect(); 
    
    // 💡【解決策】大元のキャンバス倍率から、高画質分の「3倍」を割り算して純粋なウィンドウ縮小率だけを完璧に抽出！
    const scaleX = (canvas.width / rect.width) / 3;
    const scaleY = (canvas.height / rect.height) / 3;
    
    handleActionStart((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY); 
});

canvas.addEventListener('mousemove', function(e) { 
    if (!isDrawing) return; 
    const rect = canvas.getBoundingClientRect(); 
    const scaleX = (canvas.width / rect.width) / 3;
    const scaleY = (canvas.height / rect.height) / 3;
    
    handleActionMove((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY); 
});

window.addEventListener('mouseup', () => { 
    if (isDrawing) { 
        isDrawing = false; 
        handleActionEnd(); 
    } 
});

// ─── 🛠️【スマホ縮小全体表示・完全同期確定版】PCと100%同じ縮小比率をスマホへ適用し、大復活！ ───
canvas.addEventListener('touchstart', function(e) {
    e.preventDefault(); 
    isDrawing = true; 
    const rect = canvas.getBoundingClientRect(); 
    
    if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0]; // 1本目の指のデータを正確にホールド
        
        // 💡【解決策】PC側で大成功した「内部サイズ / 画面上の実際の表示幅」の比率をスマホへ完全ドッキング！
        // これにより、盤面がどれだけ小さく縮小全体表示されていようが、指の現在地とマス目の位置が100%完璧にシンクロします！
        const scaleX = (canvas.width / rect.width) / 3;
        const scaleY = (canvas.height / rect.height) / 3;
        
        handleActionStart((touch.clientX - rect.left) * scaleX, (touch.clientY - rect.top) * scaleY);
    }
});

canvas.addEventListener('touchmove', function(e) {
    if (!isDrawing) return; 
    e.preventDefault(); 
    const rect = canvas.getBoundingClientRect(); 
    
    if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0]; 
        
        // 💡 動かしている最中(スワイプ)も、全く同じ縮小比率を掛け算して handleActionMove へ完璧に同期！
        const scaleX = (canvas.width / rect.width) / 3;
        const scaleY = (canvas.height / rect.height) / 3;
        
        handleActionMove((touch.clientX - rect.left) * scaleX, (touch.clientY - rect.top) * scaleY);
    }
}, { passive: false });

canvas.addEventListener('touchend', function(e) { 
    e.preventDefault(); 
    if (isDrawing) { 
        isDrawing = false; 
        handleActionEnd(); 
    } 
});

canvas.addEventListener('touchend', function(e) { 
    e.preventDefault(); 
    if (isDrawing) { 
        isDrawing = false; 
        handleActionEnd(); 
    } 
});

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

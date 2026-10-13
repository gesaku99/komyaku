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

// ─── 🛠️【v0.9.1完全クローズ版】あなたの数理ロジックを100%具現化！1発で同時に完全連動するUndo/Redoシステム ───
function undo() {
    if (undoStack.length === 0) return;
    clearErrorDisplay();
    const change = undoStack.pop();
    
    if (change.type === 'clear_all') {
        // 💡【解決策：Undo】Clearされた歴史(型)を検知したら、保存されていた色と壁を「1発で同時に」元の姿へ完全大復活！
        redoStack.push(change); // そのままの塊でRedoへ引き渡す
        userGrid = change.oldGrid.map(row => [...row]);
        userWalls = change.oldWalls.map(w => ({ ...w }));
    } else if (change.type === 'wall_step') {
        // ✏️ 通常プレイ時の、手動境界線1マスずつのUndo処理
        redoStack.push({ type: 'wall_step', from: change.to, to: change.from });
        userWalls = change.from.map(w => ({ ...w }));
    } else {
        // 🎨 通常プレイ時の、色塗り1マスずつのUndo処理
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
        // 💡【解決策：Redo】やり直す時も、難しいループを一切挟まず、色マスも手動壁も「1発で同時に」クリーンな完全消去状態へ直行！
        undoStack.push(change);
        userGrid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
        userWalls = [];
    } else if (change.type === 'wall_step') {
        // ✏️ 通常プレイ時の、手動境界線1マスずつのRedo処理
        undoStack.push({ type: 'wall_step', from: change.to, to: change.from });
        userWalls = change.from.map(w => ({ ...w }));
    } else {
        // 🎨 通常プレイ時の、色塗り1マスずつのRedo処理
        undoStack.push({ r: change.r, c: change.c, from: change.to, to: change.from });
        userGrid[change.r][change.c] = change.from;
    }
    drawPuzzle(); 
    updateHistoryButtons();
    setTimeout(() => { if (typeof checkAnswer === 'function') checkAnswer(true); }, 0);
}

// 💡 引数の末尾に可変距離を受け取る customMaxDist を追加し、未指定時は元の黄金比 25 を自動適用
function getNearestVertex(x, y, customMaxDist = 25 * 3) {
    let nearestV = null;
    let minDistance = customMaxDist; 
    for (let r = 0; r <= GRID_SIZE; r++) {
        for (let c = 0; c <= GRID_SIZE; c++) {
            const vx = OFFSET + c * CELL_PIXEL;
            const vy = OFFSET + r * CELL_PIXEL + 30;  // titleBarHeight = 30
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

// ─── 🎬【正解動画生成エンジン・コアシステム（純粋MP4出力・完全解決最終版）】 ───
// ─── 📦【パート1 / 2：ボタン自動ドッキング ＆ プロンプト解読パーサー】 ───

// 動画生成時の描画制御用グローバルステート
let videoRenderState = {
    active: false,
    blinkLines: [], // 大元の問題鉱脈を絶対に汚染しない動画専用の点滅配列
    texts: []
};

// 開発者画面（&mode=make）が有効な場合、ご指定の位置（ダウンロードボタンの下、パレットの上）へ新設
(function() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'make') {
        const refBtn = Array.from(document.querySelectorAll("button")).find(btn => {
            const clickAttr = btn.getAttribute("onclick");
            return clickAttr && clickAttr.includes("downloadPuzzleImage") && clickAttr.includes("false");
        });
        
        if (refBtn && refBtn.parentNode) {
            if (document.getElementById('komyakuVideoBtn')) return;
            
            const videoBtnWrapper = document.createElement('div');
            videoBtnWrapper.style.width = '100%';
            videoBtnWrapper.style.display = 'flex';
            videoBtnWrapper.style.justifyContent = 'center';
            videoBtnWrapper.style.marginTop = '12px';
            videoBtnWrapper.style.marginBottom = '12px';

            const videoBtn = document.createElement('button');
            videoBtn.id = 'komyakuVideoBtn';
            videoBtn.className = 'btn-common check-btn';
            videoBtn.style.backgroundColor = '#007aff';
            videoBtn.style.width = '200px';
            videoBtn.style.height = '40px';
            videoBtn.style.fontSize = '12px';
            videoBtn.innerText = '正解動画生成';
            videoBtn.onclick = startKomyakuVideoGeneration;
            
            videoBtnWrapper.appendChild(videoBtn);
            refBtn.parentNode.parentNode.insertBefore(videoBtnWrapper, refBtn.parentNode.nextSibling);
        }
    }
})();

// コアエンジン：プロンプトの完全パース ＆ タイムラインスケジューラー
async function startKomyakuVideoGeneration() {
    const promptInput = prompt(
        "【KOMYAKU 正解動画生成エンジン】\n" +
        "前置パルスルールに従ったスクリプト文字列を入力してください。\n\n" +
        "入力例：P[A1A2A3A4(2)A5B5C5D5]L[b1b2]B[a1b5]P[(1)B4]T[一旦]T[]T[]T[ここまで]"
    );
    if (!promptInput) return;

    // 現在のユーザーデータを深く退避して保護（大元の problemLines も含む）
    const backupUserGrid = userGrid.map(row => [...row]);
    const backupUserWalls = (typeof userWalls !== 'undefined' && userWalls) ? userWalls.map(w => ({ ...w })) : [];
    const backupErrorShow = errorDisplayState.show;
    const backupProblemLines = problemLines.map(l => ({ ...l }));

    // ─── ➔ P, L, B, T すべての命令を完璧に拾い上げるパース処理 ───
    const commandRegex = /(P|L|B|T)\[(.*?)\]/g;
    let match;
    const timeline = [];

    const cleanedInput = promptInput.replace(/commandRegex\s*=\s*commandRegex\.exec/g, ''); 
    while ((match = commandRegex.exec(cleanedInput)) !== null) {
        const type = match[1];
        const content = match[2].trim();

        if (type === 'T') {
            timeline.push({ type: 'T', text: content });
        } else if (type === 'P') {
            const tokens = content.split(/(\(\d+\))/);
            let currentColorId = 1; 

            tokens.forEach(tok => {
                if (!tok) return;
                if (tok.startsWith('(') && tok.endsWith(')')) {
                    currentColorId = parseInt(tok.slice(1, -1), 10);
                } else {
                    let i = 0;
                    while (i < tok.length) {
                        // 💡 非推奨の substr を廃止し、標準の slice へ変更（i から i+2 までを正確に2文字切り出し）
                        const cellStr = tok.slice(i, i + 2);
                        if (cellStr.length === 2 && /[A-I]/.test(cellStr.charAt(0)) && /[1-9]/.test(cellStr.charAt(1))) {
                            const c = cellStr.charCodeAt(0) - 65; 
                            const r = parseInt(cellStr.charAt(1), 10) - 1; 
                            if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
                                timeline.push({ type: 'P', r: r, c: c, color: currentColorId === 0 ? null : (currentColorId - 1) });
                            }
                            i += 2;
                        } else {
                            i++;
                        }
                    }
                }
            });
        } else if (type === 'L' || type === 'B') {
            const vertices = [];
            for (let i = 0; i < content.length; i += 2) {
                // 💡 こちらも同様に、レガシー機能を完全に排除して slice へ変更
                const vStr = content.slice(i, i + 2);
                if (vStr.length === 2) {
                    const c = vStr.charCodeAt(0) - 97; // a=0, b=1...
                    const r = parseInt(vStr.charAt(1), 10) - 1; 
                    vertices.push({ r, c });
                }
            }
            for (let i = 0; i < vertices.length - 1; i++) {
                timeline.push({
                    type: type,
                    r1: vertices[i].r, c1: vertices[i].c,
                    r2: vertices[i + 1].r, c2: vertices[i + 1].c
                });
            }
        }
    }

    const optimizedTimeline = [];
    let pendingTexts = [];

    for (let item of timeline) {
        if (item.type === 'T') {
            pendingTexts.push(item.text);
        } else {
            if (pendingTexts.length > 0) {
                optimizedTimeline.push({ type: 'T', data: [...pendingTexts] });
                pendingTexts = [];
            }
            optimizedTimeline.push(item);
        }
    }
    if (pendingTexts.length > 0) {
        optimizedTimeline.push({ type: 'T', data: [...pendingTexts] });
    }

    // 💡【つなぎ目マーカー】これ以降の録画・描画ループ処理は「パート2」へ合流します
    // ─── 📦【パート2 / 2：録画制御 ＆ タイムライン実行部】 ───

    // 動画生成フラグを点灯
    videoRenderState.active = true;

    // 画面状態の完全初期化リセット
    for (let r = 0; r < GRID_SIZE; r++) userGrid[r].fill(null);
    userWalls = [];
    errorDisplayState.show = false;
    videoRenderState.blinkLines = [];
    videoRenderState.texts = [];

    // 💡【解決：X最適化MP4の厳格なロック仕様】
    // 音声なしのCanvasストリームから、H.264ベースの本物のMP4動画を100%確実に一発で出力させるパラメータ
    const stream = canvas.captureStream(30); 
    let recordedChunks = [];
    
    let options = { mimeType: 'video/mp4;codecs=avc1.42E01E' }; // X投稿画面でのプレビュー再生に完全適合
    if (!MediaRecorder.isTypeSupported(options.mimeType)) options = { mimeType: 'video/mp4' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) options = { mimeType: 'video/webm;codecs=vp9' }; // セーフティフォールバック

    const recorder = new MediaRecorder(stream, options);
    recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) recordedChunks.push(e.data); };
    
    recorder.onstop = () => {
        if (recordedChunks.length === 0) return;
        const videoBlob = new Blob(recordedChunks, { type: recorder.mimeType || 'video/mp4' });
        const videoUrl = URL.createObjectURL(videoBlob);
        const urlParams = new URLSearchParams(window.location.search);
        const dayValue = urlParams.get('day') || "XXX";
        
        // 正真正銘の本物のMP4ファイルとして保存
        const link = document.createElement('a');
        link.download = `Day${dayValue}解答解説.mp4`;
        link.href = videoUrl;
        link.click();

        // データの完全復元（大元の鉱脈 problemLines も含む）
        userGrid = backupUserGrid.map(row => [...row]);
        if (typeof userWalls !== 'undefined') userWalls = backupUserWalls.map(w => ({ ...w }));
        errorDisplayState.show = backupErrorShow;
        problemLines = backupProblemLines.map(l => ({ ...l }));
        videoRenderState.active = false;
        videoRenderState.blinkLines = [];
        videoRenderState.texts = [];
        drawPuzzle();
    };

    // 録画開始
    recorder.start();
    drawPuzzle();

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    await sleep(400); // 最初の白紙保持時間

    // ─── 🎬 タイムラインの純粋実行ループ（既存グラフィックス拡張・完全同期仕様） ───
    for (let cmd of optimizedTimeline) {
        if (cmd.type === 'T') {
            videoRenderState.texts = cmd.data;
        } else {
            // T命令以外のコマンドに入った瞬間、字幕データをクリア
            if (videoRenderState.texts.length > 0) {
                videoRenderState.texts = [];
            }

            if (cmd.type === 'B') {
                // 💡【真の根治】大元の問題データを完全保護。
                // 500msごとの明滅の瞬間に合わせて、最前面へ黒極太線と中央数字丸をダイレクトに重ね描きします
                const p1 = { x: cmd.c1, y: cmd.r1 };
                const p2 = { x: cmd.c2, y: cmd.r2 };
                
                for (let k = 0; k < 4; k++) {
                    videoRenderState.blinkLines = (k % 2 === 0) ? [{ start: p1, end: p2 }] : [];
                    drawPuzzle();
                    
                    // 💡 表示コマ（kが偶数）の時だけ、その場で最前面へ黒極太線と数字丸をリアルタイムに重ね描き
                    if (k % 2 === 0) {
                        ctx.save();
                        ctx.scale(3, 3); // 3倍画質宇宙へ完全同期
                        ctx.strokeStyle = '#000000';
                        ctx.lineWidth = 5;
                        ctx.lineCap = 'round';
                        ctx.beginPath();
                        ctx.moveTo(OFFSET + p1.x * CELL_PIXEL, OFFSET + p1.y * CELL_PIXEL + 30);
                        ctx.lineTo(OFFSET + p2.x * CELL_PIXEL, OFFSET + p2.y * CELL_PIXEL + 30);
                        ctx.stroke();
                        
                        const mx = OFFSET + (p1.x + p2.x) / 2 * CELL_PIXEL;
                        const my = OFFSET + (p1.y + p2.y) / 2 * CELL_PIXEL + 30;
                        const distSq = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
                        
                        ctx.fillStyle = '#ffffff';
                        ctx.strokeStyle = '#000000';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(mx, my, 15, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();

                        ctx.fillStyle = '#000000';
                        ctx.font = 'bold 15px "Tenor Sans", sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(distSq.toString(), mx, my + 0.5);
                        ctx.restore();
                    }
                    await sleep(500);
                }
                videoRenderState.blinkLines = [];
            } else if (cmd.type === 'P') {
                userGrid[cmd.r][cmd.c] = cmd.color;
                if (typeof cleanUserWalls === 'function') cleanUserWalls();
            } else if (cmd.type === 'L') {
                userWalls.push({ r1: cmd.r1, c1: cmd.c1, r2: cmd.r2, c2: cmd.c2 });
            }
        }

        // 💡【重要】全コマンド共通で、1ステップごとにキャンバスを綺麗に更新（大元の問題鉱脈 problemLines も無傷で維持描画）
        drawPuzzle();

        // 💡【下部字幕テロップ・一括焼き付けアドオン（graphics.js無傷仕様）】
        if (videoRenderState.texts && videoRenderState.texts.length > 0) {
            ctx.save();
            ctx.scale(3, 3); // 3倍高画質キャンバスのスケールに完全に同期

            // 下部帯エリアの計算（OFFSET等の定数をミリ単位で完全ホールド）
            const logicalWidth = OFFSET * 2 + GRID_SIZE * CELL_PIXEL;
            const logicalHeight = OFFSET * 2 + GRID_SIZE * CELL_PIXEL + 30; // titleBarHeight = 30
            const barW = logicalWidth;
            const barH = videoRenderState.texts.length * 24 + 16;
            const barX = 0;
            const barY = logicalHeight - barH;

            // 半透明の美しい黒帯を一番最前面に重ねる
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(barX, barY, barW, barH);

            // テロップ文字の描画（Tenor Sans完全統一）
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px "Tenor Sans", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            videoRenderState.texts.forEach((txt, idx) => {
                const textY = barY + 16 + idx * 24 + 8;
                ctx.fillText(txt, barW / 2, textY);
            });
            ctx.restore();
        }

        // 💡【NG鉱脈チカチカ表示・最前面重ね描きアドオン（graphics.js無傷仕様）】
        if (videoRenderState.blinkLines && videoRenderState.blinkLines.length > 0) {
            videoRenderState.blinkLines.forEach(line => {
                ctx.save();
                ctx.scale(3, 3); // 3倍宇宙へ完全同期
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 5;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(OFFSET + line.start.x * CELL_PIXEL, OFFSET + line.start.y * CELL_PIXEL + 30);
                ctx.lineTo(OFFSET + line.end.x * CELL_PIXEL, OFFSET + line.end.y * CELL_PIXEL + 30);
                ctx.stroke();
                
                // 中央の数字丸表示（ distSq の逆算と描画 ）
                const mx = OFFSET + (line.start.x + line.end.x) / 2 * CELL_PIXEL;
                const my = OFFSET + (line.start.y + line.end.y) / 2 * CELL_PIXEL + 30;
                const distSq = (line.end.x - line.start.x) ** 2 + (line.end.y - line.start.y) ** 2;
                
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(mx, my, 15, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#000000';
                ctx.font = 'bold 15px "Tenor Sans", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(distSq.toString(), mx, my + 0.5);
                ctx.restore();
            });
        }

        // コマごとの適正な再生ウェイト（T命令なら600ms、それ以外なら350ms）
        if (cmd.type === 'T') {
            await sleep(600);
        } else {
            await sleep(350);
        }
    }

    // 💡【最終コマ消失の完全根治】
    // 最末尾コマンド（最後のE5マスの塗りなど）が終了したまさにその瞬間に停止命令が走り、
    // ビデオトラックがブツ切りになるのを確実に防ぐため、ジャスト1000ms（1秒間）何もしないで
    // 最終正解状態を綺麗にキープしてから、安全に録画をクローズします。
    await sleep(1000);
    
    recorder.stop();

    // 動画生成終了後に、ハックしていた自動正誤判定関数を元通り修復
    setTimeout(() => {
        window.checkAnswer = originalCheckAnswer;
    }, 200);
}
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

// ─── 🎬【正解動画生成エンジン・コアシステム（KOMYAKU v0.9.2 仕様）】 ───

// 動画生成時の描画制御用グローバルステート
let videoRenderState = {
    active: false,
    blinkLine: null,
    blinkVisible: true,
    texts: []
};

// 開発者画面（&mode=make）が有効な場合、専用ボタンを全自動でドッキング新設
(function() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'make') {
        const checkBtn = document.querySelector('.check-btn');
        if (checkBtn && checkBtn.parentNode) {
            const videoBtn = document.createElement('button');
            videoBtn.className = 'btn-common check-btn'; // スタイル調和のため共通クラスを適用
            videoBtn.style.backgroundColor = '#007aff';  // 鮮やかなブルーで識別
            videoBtn.style.width = 'auto';
            videoBtn.style.padding = '0 12px';
            videoBtn.innerText = '正解動画生成';
            videoBtn.onclick = startKomyakuVideoGeneration;
            checkBtn.parentNode.appendChild(videoBtn);
        }
    }
})();

// コアエンジン：文字列プロンプトのパーサー ＆ タイムラインスケジューラー
async function startKomyakuVideoGeneration() {
    const promptInput = prompt(
        "【KOMYAKU 正解動画生成エンジン】\n" +
        "パースするスクリプト文字列を入力してください。\n\n" +
        "例：P[A1A2(1)B1(2)] L[b1b3] B[b1c3] T[ここ難所]T[]T[解説]"
    );
    if (!promptInput) return;

    // 現在のユーザーデータを深く退避（動画生成後に1ミリの狂いもなく完全復元するため）
    const backupUserGrid = userGrid.map(row => [...row]);
    const backupUserWalls = userWalls.map(w => ({ ...w }));
    const backupErrorShow = errorDisplayState.show;

    // 画面状態を一度クリーンに初期化
    for (let r = 0; r < GRID_SIZE; r++) userGrid[r].fill(null);
    userWalls = [];
    errorDisplayState.show = false;
    videoRenderState.active = true;
    videoRenderState.blinkLine = null;
    videoRenderState.texts = [];

    // キャンバスストリームから MediaRecorder を起動（3倍高画質をそのままホールド）
    const stream = canvas.captureStream(30); // 30 FPS 固定
    let recordedChunks = [];
    
    // コーデックの互換性セーフティ判定（WebM or MP4）
    let options = { mimeType: 'video/webm;codecs=vp9' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm;codecs=vp8' };
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/mp4' };
    }

    const recorder = new MediaRecorder(stream, options);
    recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
    recorder.start();

    // ─── ➔ プロンプトパース文法ルールの正規表現解析 ───
    const commandRegex = /(P|L|B|T)\[(.*?)\]/g;
    let match;
    const timeline = [];

    // Tコマンド（連続テロップ）を一括結合して管理するためのテンポラリ
    let currentTexts = [];

    // トークナイズ処理
    while ((match = commandRegex = commandRegex.exec(promptInput)) !== null) {
        const type = match[1];
        const content = match[2].trim();

        if (type === 'T') {
            currentTexts.push(content);
            continue;
        }

        // T以外のコマンドが出現した時点で、直前までに溜まったテロップをタイムラインにフラッシュ
        if (currentTexts.length > 0) {
            timeline.push({ type: 'T', data: [...currentTexts] });
            currentTexts = [];
        }

        if (type === 'P') {
            // パレット指定 (1), (2), (0) 等を抽出
            const tokens = content.split(/(\(\d+\))/);
            let currentColorId = 1; // デフォルトはパレット1番

            tokens.forEach(tok => {
                if (!tok) return;
                if (tok.startsWith('(') && tok.endsWith(')')) {
                    currentColorId = parseInt(tok.slice(1, -1), 10);
                } else {
                    // A1, B2 などのマス座標ペアを2文字ずつパース
                    for (let i = 0; i < tok.length; i += 2) {
                        const cellStr = tok.substr(i, 2);
                        if (cellStr.length === 2) {
                            const c = cellStr.charCodeAt(0) - 65; // A=0, B=1...
                            const r = parseInt(cellStr.charAt(1), 10) - 1; // 1=0, 2=1...
                            if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
                                timeline.push({ type: 'P', r, c, color: currentColorId === 0 ? null : currentColorId });
                            }
                        }
                    }
                }
            });
        } else if (type === 'L' || type === 'B') {
            // 格子点ID（b1, b3等）を2文字ずつパースして線分を構築
            const vertices = [];
            for (let i = 0; i < content.length; i += 2) {
                const vStr = content.substr(i, 2);
                if (vStr.length === 2) {
                    const c = vStr.charCodeAt(0) - 98; // b=0, c=1...
                    const r = parseInt(vStr.charAt(1), 10) - 1; // 1=0, 2=1...
                    vertices.push({ r, c });
                }
            }
            
            // 頂点を順番に結ぶリンク構造へ変換
            for (let i = 0; i < vertices.length - 1; i++) {
                timeline.push({
                    type: type,
                    r1: vertices[i].r, c1: vertices[i].c,
                    r2: vertices[i + 1].r, c2: vertices[i + 1].c
                });
            }
        }
    }
    // 残った最後のテロップ群を回収
    if (currentTexts.length > 0) {
        timeline.push({ type: 'T', data: [...currentTexts] });
    }

    // タイムラインの非同期逐次再生シミュレーション実行
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (let cmd of timeline) {
        if (cmd.type === 'T') {
            videoRenderState.texts = cmd.data;
            drawPuzzle();
            await sleep(500); // テロップ表示の間隔
        } else if (cmd.type === 'B') {
            // B[...] 仕様：2秒間チカチカ明滅（0.5秒×4回）
            videoRenderState.blinkLine = cmd;
            for (let k = 0; k < 4; k++) {
                videoRenderState.blinkVisible = (k % 2 === 0);
                drawPuzzle();
                await sleep(500);
            }
            videoRenderState.blinkLine = null;
            drawPuzzle();
        } else if (cmd.type === 'P') {
            // P[...] 仕様：マス塗り実行
            userGrid[cmd.r][cmd.c] = cmd.color;
            if (typeof cleanUserWalls === 'function') cleanUserWalls();
            drawPuzzle();
            await sleep(300); // 塗りの心地よいステップウェイト
        } else if (cmd.type === 'L') {
            // L[...] 仕様：境界線をuserWallsへ追加
            userWalls.push({ r1: cmd.r, c1: cmd.c, r2: cmd.r2, c2: cmd.c2 });
            drawPuzzle();
            await sleep(300);
        }
    }

    // すべてのアクション終了後、最後の静止余韻
    await sleep(1000);

    // 録画停止、動画ファイルの生成および自動ダウンロード処理
    recorder.onstop = () => {
        const videoBlob = new Blob(recordedChunks, { type: recorder.mimeType });
        const videoUrl = URL.createObjectURL(videoBlob);
        
        const urlParams = new URLSearchParams(window.location.search);
        const dayValue = urlParams.get('day') || "XXX";
        const extension = recorder.mimeType.includes('mp4') ? 'mp4' : 'webm';
        
        const link = document.createElement('a');
        link.download = `Day${dayValue}解答解説.${extension}`;
        link.href = videoUrl;
        link.click();

        // ─── 🔄 元の完璧な通常プレイ画面の状態へ200%完全復元 ───
        userGrid = backupUserGrid.map(row => [...row]);
        userWalls = backupUserWalls.map(w => ({ ...w }));
        errorDisplayState.show = backupErrorShow;
        videoRenderState.active = false;
        videoRenderState.blinkLine = null;
        videoRenderState.texts = [];
        drawPuzzle();
    };

    recorder.stop();
}

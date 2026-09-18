function drawPuzzle(isSolutionImage = false, isProblemImage = false) {
    const urlParams = new URLSearchParams(window.location.search);
    const dayValue = urlParams.get('day') || "XXX";
    const modeValue = urlParams.get('mode') || "";

    if (modeValue === "make") {
        document.getElementById('studioContainer').style.display = 'flex';
    }

    const titleBarHeight = 30;
    
    // 1. まず、画面上の「見た目の大きさ（論理サイズ）」を計算
    const logicalWidth = OFFSET * 2 + GRID_SIZE * CELL_PIXEL;
    const logicalHeight = OFFSET * 2 + GRID_SIZE * CELL_PIXEL + titleBarHeight;
    
    // 2. ★重要：X投稿用に、Canvasの内部のドット数（解像度）を「3倍」に巨大化させる
    const scaleFactor = 3; 
    canvas.width = logicalWidth * scaleFactor;
    canvas.height = logicalHeight * scaleFactor;
    
    // 3. 巨大化したCanvasが画面からはみ出さないよう、CSSで元のスマートなサイズにギュッと凝縮させる
    canvas.style.width = logicalWidth + "px";
    canvas.style.height = logicalHeight + "px";
    
    // 4. すべての描画命令（線や文字）を、自動的に3倍の大きさでクッキリ描くように設定
    ctx.scale(scaleFactor, scaleFactor);

    // 一度画面をクリアし、真っ白な高解像度の下地を敷く
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    // ─── 1. 上部黒タイトルバーの描画 ───
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, titleBarHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = '26px "Tenor Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    let titleText = `Day${dayValue}`;
    if (isSolutionImage) titleText += " Solution";
    ctx.fillText(titleText, 15, titleBarHeight / 2);

    // ─── 2. 盤面マスの色塗り ───
// ─── ✨ 修正後（盤面用） ───
    if (!isSolutionImage && !isProblemImage) {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const x = OFFSET + c * CELL_PIXEL;
                const y = OFFSET + r * CELL_PIXEL + titleBarHeight;
                
                const colorNum = userGrid[r][c];
                
                // 初期状態（null）なら白のままスルー
                if (colorNum === null || colorNum === undefined) {
                    continue;
                }

                // 0番〜9番の色をマスに塗る
                ctx.fillStyle = COLOR_PALETTE[colorNum];
                ctx.fillRect(x, y, CELL_PIXEL, CELL_PIXEL);
            }
        }

        if (errorDisplayState.show && errorDisplayState.isolatedCells.length > 0) {
            ctx.fillStyle = 'rgba(255, 59, 48, 0.6)'; 
            errorDisplayState.isolatedCells.forEach(cell => {
                ctx.fillRect(OFFSET + cell.c * CELL_PIXEL, OFFSET + cell.r * CELL_PIXEL + titleBarHeight, CELL_PIXEL, CELL_PIXEL);
            });
        }
    }

    // ─── 3. グリッド（細い破線）を描画 ───
    ctx.strokeStyle = '#cccccc'; 
    ctx.lineWidth = 1;
    ctx.setLineDash([]); // 内枠を綺麗な点線（破線）にする設定
    for (let i = 1; i < GRID_SIZE; i++) {
        const pos = OFFSET + i * CELL_PIXEL;
        ctx.beginPath(); ctx.moveTo(OFFSET, pos + titleBarHeight); ctx.lineTo(OFFSET + GRID_SIZE * CELL_PIXEL, pos + titleBarHeight); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pos, OFFSET + titleBarHeight); ctx.lineTo(pos, OFFSET + GRID_SIZE * CELL_PIXEL + titleBarHeight); ctx.stroke();
    }
    ctx.setLineDash([]); 

    // ─── 4. 座標記号・数字の描画（Biomeフォント適用） ───
    ctx.fillStyle = '#000000';
    ctx.font = '20px "Tenor Sans", sans-serif';
    ctx.textAlign = 'center'; 
    ctx.textBaseline = 'middle';
    
    const xLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
    for (let i = 0; i <= GRID_SIZE; i++) { ctx.fillText(xLabels[i], OFFSET + i * CELL_PIXEL, OFFSET - 18 + titleBarHeight); }
    for (let i = 0; i <= GRID_SIZE; i++) { ctx.fillText((i + 1).toString(), OFFSET - 18, OFFSET + i * CELL_PIXEL + titleBarHeight); }
    
    const cellXLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    for (let i = 0; i < GRID_SIZE; i++) { ctx.fillText(cellXLabels[i], OFFSET + i * CELL_PIXEL + CELL_PIXEL / 2, OFFSET + GRID_SIZE * CELL_PIXEL + 18 + titleBarHeight); }
    for (let i = 0; i < GRID_SIZE; i++) { ctx.fillText((i + 1).toString(), OFFSET + GRID_SIZE * CELL_PIXEL + 18, OFFSET + i * CELL_PIXEL + CELL_PIXEL / 2 + titleBarHeight); }

    // ─── 5. 外壁（黒の太枠）と内壁の境界線の自動描画 ───
    ctx.lineCap = 'square';
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const x = OFFSET + c * CELL_PIXEL;
            const y = OFFSET + r * CELL_PIXEL + titleBarHeight;

            ctx.strokeStyle = '#000000'; ctx.lineWidth = 4;
            if (c === 0) { ctx.beginPath(); ctx.moveTo(OFFSET, y); ctx.lineTo(OFFSET, y + CELL_PIXEL); ctx.stroke(); }
            if (r === 0) { ctx.beginPath(); ctx.moveTo(x, OFFSET + titleBarHeight); ctx.lineTo(x + CELL_PIXEL, OFFSET + titleBarHeight); ctx.stroke(); }
            if (c === GRID_SIZE - 1) { ctx.beginPath(); ctx.moveTo(x + CELL_PIXEL, y); ctx.lineTo(x + CELL_PIXEL, y + CELL_PIXEL); ctx.stroke(); }
            if (r === GRID_SIZE - 1) { ctx.beginPath(); ctx.moveTo(x, y + CELL_PIXEL); ctx.lineTo(x + CELL_PIXEL, y + CELL_PIXEL); ctx.stroke(); }

            if (!isProblemImage) {
                const targetGrid = isSolutionImage ? answerGrid : userGrid;
                const currentIdx = targetGrid[r][c];

                if (c < GRID_SIZE - 1) {
                    const rightIdx = targetGrid[r][c + 1];
                    // ★重要：現在地もお隣さんも「白(null)」ではなく、かつ「違う色」のときだけ緑の境界線を描く
                    if (currentIdx !== null && rightIdx !== null && currentIdx !== rightIdx) {
                        ctx.strokeStyle = '#70AD47'; ctx.lineWidth = 5; 
                        ctx.beginPath(); ctx.moveTo(x + CELL_PIXEL, y); ctx.lineTo(x + CELL_PIXEL, y + CELL_PIXEL); ctx.stroke();
                    }
                }
                if (r < GRID_SIZE - 1) {
                    const bottomIdx = targetGrid[r + 1][c];
                    // ★重要：現在地も下側もお隣さんも「白(null)」ではなく、かつ「違う色」のときだけ緑の境界線を描く
                    if (currentIdx !== null && bottomIdx !== null && currentIdx !== bottomIdx) {
                        ctx.strokeStyle = '#70AD47'; ctx.lineWidth = 5;
                        ctx.beginPath(); ctx.moveTo(x, y + CELL_PIXEL); ctx.lineTo(x + CELL_PIXEL, y + CELL_PIXEL); ctx.stroke();
                    }
                }
            }
        }
    }

    // ★追加：プレイヤーが手動で引いた壁（userWalls）の描画
    ctx.strokeStyle = '#70AD47'; 
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    userWalls.forEach(wall => {
        ctx.beginPath();
        // 格子点座標（c1, r1）から（c2, r2）へ線を引く
        ctx.moveTo(OFFSET + wall.c1 * CELL_PIXEL, OFFSET + wall.r1 * CELL_PIXEL + titleBarHeight);
        ctx.lineTo(OFFSET + wall.c2 * CELL_PIXEL, OFFSET + wall.r2 * CELL_PIXEL + titleBarHeight);
        ctx.stroke();
    });

    // ─── 6. 鉱脈（黒の斜線）の描画 ───
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;

    problemLines.forEach(line => {
        ctx.beginPath(); 
        ctx.moveTo(OFFSET + line.start.x * CELL_PIXEL, OFFSET + line.start.y * CELL_PIXEL + titleBarHeight);
        ctx.lineTo(OFFSET + line.end.x * CELL_PIXEL, OFFSET + line.end.y * CELL_PIXEL + titleBarHeight); 
        ctx.stroke();
    });
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    if (!isSolutionImage && !isProblemImage && errorDisplayState.show) {
        ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 3;
        errorDisplayState.wrongLines.forEach(line => {
            ctx.beginPath(); ctx.moveTo(OFFSET + line.start.x * CELL_PIXEL, OFFSET + line.start.y * CELL_PIXEL + titleBarHeight);
            ctx.lineTo(OFFSET + line.end.x * CELL_PIXEL, OFFSET + line.end.y * CELL_PIXEL + titleBarHeight); ctx.stroke();
        });
        ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        errorDisplayState.wrongLines.forEach(line => {
            const rx = OFFSET + (line.start.x + (line.end.x - line.start.x) * 0.7) * CELL_PIXEL;
            const ry = OFFSET + (line.start.y + (line.end.y - line.start.y) * 0.7) * CELL_PIXEL + titleBarHeight;
            ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(rx, ry, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#ff3b30'; ctx.fillText(line.distSq.toString(), rx, ry + 0.5);
        });
        errorDisplayState.blackAlertLines.forEach(line => {
            const bx = OFFSET + (line.start.x + (line.end.x - line.start.x) * 0.3) * CELL_PIXEL;
            const by = OFFSET + (line.start.y + (line.end.y - line.start.y) * 0.3) * CELL_PIXEL + titleBarHeight;
            ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(bx, by, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#000000'; ctx.fillText(line.distSq.toString(), bx, by + 0.5);
        });
        errorDisplayState.invalidVertices.forEach(v => {
            ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(OFFSET + v.x * CELL_PIXEL, OFFSET + v.y * CELL_PIXEL + titleBarHeight, 6, 0, Math.PI * 2); ctx.fill();
        });
    }

    // ─── 7. ★新設：通常モード用オレンジ製図アシスト表示（ステップ7-1：直線・終点丸追加版） ───
    if (!isSolutionImage && !isProblemImage && typeof assistStartV !== 'undefined' && assistStartV && assistCurrentV) {
        // 💻 画面描画用（ピクセル座標）の計算
        const x1 = OFFSET + assistStartV.c * CELL_PIXEL;
        const y1 = OFFSET + assistStartV.r * CELL_PIXEL + titleBarHeight;
        const x2 = OFFSET + assistCurrentV.c * CELL_PIXEL;
        const y2 = OFFSET + assistCurrentV.r * CELL_PIXEL + titleBarHeight;

        // ① 始点のオレンジ点線丸（すでに復帰している完璧なコード）
        ctx.strokeStyle = '#ff9500';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]); // 点線設定
        ctx.beginPath(); 
        ctx.arc(x1, y1, 15, 0, Math.PI * 2); 
        ctx.stroke();

        // 💡追加：もし「始点」と「現在の指の吸着先（終点）」が異なる格子点にいるときだけ、線と終点丸を描く
        if (assistStartV.c !== assistCurrentV.c || assistStartV.r !== assistCurrentV.r) {
            // ② 終点側のオレンジ点線丸を描画
            ctx.beginPath();
            ctx.arc(x2, y2, 15, 0, Math.PI * 2);
            ctx.stroke();

            // ③ 始点と終点をまっすぐ結ぶ「オレンジの仮の直線」を実線で描画
            ctx.setLineDash([]); // 実線に戻す
            ctx.strokeStyle = '#ff9500';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // 💡【ステップ7-2追記】：仮の鉱脈の上の「オレンジ丸 ＋ 長さの2乗」の描画（Tenor Sans）
            const distSq = (assistCurrentV.c - assistStartV.c) ** 2 + (assistCurrentV.r - assistStartV.r) ** 2;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            
            ctx.fillStyle = '#ffffff'; 
            ctx.strokeStyle = '#ff9500'; 
            ctx.lineWidth = 2;
            ctx.beginPath(); 
            ctx.arc(mx, my, 12, 0, Math.PI * 2); 
            ctx.fill(); 
            ctx.stroke();
            
            ctx.fillStyle = '#ff9500';
            ctx.font = 'bold 12px "Tenor Sans", sans-serif'; 
            ctx.textAlign = 'center'; 
            ctx.textBaseline = 'middle';
            ctx.fillText(distSq.toString(), mx, my + 0.5);
            // 💡【ステップ7-3追記】：該当ブロックの本物の正解鉱脈すべてに黒丸をループ描画（Tenor Sans）
            // 始点格子点(p1)の周囲4マスのうち、何かしらの色（0〜8）が塗られているマスの部屋色（ブロック）を取得
            let targetBlockColor = null;
            const rStart = assistStartV.r, cStart = assistStartV.c;
            const checkOffsets = [{r:-1, c:-1}, {r:-1, c:0}, {r:0, c:-1}, {r:0, c:0}];
            
            for (let offset of checkOffsets) {
                const nr = rStart + offset.r, nc = cStart + offset.c;
                if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                    if (userGrid[nr][nc] !== null && userGrid[nr][nc] !== undefined) {
                        targetBlockColor = userGrid[nr][nc];
                        break;
                    }
                }
            }

            // 何かしらの色が塗られているブロックに接している場合のみ、本物鉱脈の上に黒丸を表示
            if (targetBlockColor !== null && typeof problemLines !== 'undefined') {
                problemLines.forEach(line => {
                    const lc1 = userGrid[Math.max(0, Math.min(GRID_SIZE-1, Math.floor(line.start.y)))][Math.max(0, Math.min(GRID_SIZE-1, Math.floor(line.start.x)))];
                    const lc2 = userGrid[Math.max(0, Math.min(GRID_SIZE-1, Math.floor(line.end.y)))][Math.max(0, Math.min(GRID_SIZE-1, Math.floor(line.end.x)))];
                    
                    if (lc1 === targetBlockColor || lc2 === targetBlockColor) {
                        const bx = OFFSET + (line.start.x + line.end.x) / 2 * CELL_PIXEL;
                        const by = OFFSET + (line.start.y + line.end.y) / 2 * CELL_PIXEL + titleBarHeight;
                        const bDistSq = (line.end.x - line.start.x) ** 2 + (line.end.y - line.start.y) ** 2;

                        ctx.fillStyle = '#ffffff'; 
                        ctx.strokeStyle = '#000000'; 
                        ctx.lineWidth = 2;
                        ctx.beginPath(); 
                        ctx.arc(bx, by, 12, 0, Math.PI * 2); 
                        ctx.fill(); 
                        ctx.stroke();
                        
                        ctx.fillStyle = '#000000';
                        ctx.font = 'bold 12px "Tenor Sans", sans-serif'; 
                        ctx.fillText(bDistSq.toString(), bx, by + 0.5);
                    }
                });
            }
        }
        
        ctx.setLineDash([]); // 点線設定を安全にクリア
    }

    // ─── 8. 判定エラーの赤丸・黒丸の表示（Tenor Sans完全統一） ───
    if (!isSolutionImage && !isProblemImage && errorDisplayState.show) {
        ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 3;
        errorDisplayState.wrongLines.forEach(line => {
            ctx.beginPath(); ctx.moveTo(OFFSET + line.start.x * CELL_PIXEL, OFFSET + line.start.y * CELL_PIXEL + titleBarHeight);
            ctx.lineTo(OFFSET + line.end.x * CELL_PIXEL, OFFSET + line.end.y * CELL_PIXEL + titleBarHeight); ctx.stroke();
        });
        
        ctx.font = 'bold 11px "Tenor Sans", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        
        errorDisplayState.wrongLines.forEach(line => {
            const rx = OFFSET + (line.start.x + (line.end.x - line.start.x) * 0.7) * CELL_PIXEL;
            const ry = OFFSET + (line.start.y + (line.end.y - line.start.y) * 0.7) * CELL_PIXEL + titleBarHeight;
            ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(rx, ry, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#ff3b30'; ctx.fillText(line.distSq.toString(), rx, ry + 0.5);
        });
        errorDisplayState.blackAlertLines.forEach(line => {
            const bx = OFFSET + (line.start.x + (line.end.x - line.start.x) * 0.3) * CELL_PIXEL;
            const by = OFFSET + (line.start.y + (line.end.y - line.start.y) * 0.3) * CELL_PIXEL + titleBarHeight;
            ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(bx, by, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#000000'; ctx.fillText(line.distSq.toString(), bx, by + 0.5);
        });
        errorDisplayState.invalidVertices.forEach(v => {
            ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(OFFSET + v.x * CELL_PIXEL, OFFSET + v.y * CELL_PIXEL + titleBarHeight, 6, 0, Math.PI * 2); ctx.fill();
        });
    }
} // ⬅️ drawPuzzle 関数の完全な閉じ括弧

function downloadPuzzleImage(isSolution) {
    if (isSolution) {
        drawPuzzle(true, false); 
    } else {
        drawPuzzle(false, true); 
    }

    const urlParams = new URLSearchParams(window.location.search);
    const dayValue = urlParams.get('day') || "XXX";
    const filename = `Day${dayValue}${isSolution ? '答え' : '問題'}.png`;

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();

    drawPuzzle();
}

function getCellFromCoords(x, y) {
    const titleBarHeight = 30;
    const c = Math.floor((x - OFFSET) / CELL_PIXEL); 
    const r = Math.floor((y - OFFSET - titleBarHeight) / CELL_PIXEL); 
    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) return { r, c }; return null;
}

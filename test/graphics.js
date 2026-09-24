function drawPuzzle(isSolutionImage = false, isProblemImage = false) {
    const urlParams = new URLSearchParams(window.location.search);
    const dayValue = urlParams.get('day') || "XXX";
    const modeValue = urlParams.get('mode') || "";

    if (modeValue === "make") {
        document.getElementById('studioContainer').style.display = 'flex';
    }

    const titleBarHeight = 30;
    const logicalWidth = OFFSET * 2 + GRID_SIZE * CELL_PIXEL;
    const logicalHeight = OFFSET * 2 + GRID_SIZE * CELL_PIXEL + titleBarHeight;
    
    const scaleFactor = 3; 
    canvas.width = logicalWidth * scaleFactor;
    canvas.height = logicalHeight * scaleFactor;
    canvas.style.width = logicalWidth + "px";
    canvas.style.height = logicalHeight + "px";
    ctx.scale(scaleFactor, scaleFactor);

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
    let titleText = (dayValue === "XXX") ? `Example` : `Day${dayValue}`;
    if (isSolutionImage) titleText += " Solution";
    ctx.fillText(titleText, 15, titleBarHeight / 2);

    // ─── 2. 盤面マスの色塗り ───
    if (!isSolutionImage && !isProblemImage) {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const x = OFFSET + c * CELL_PIXEL;
                const y = OFFSET + r * CELL_PIXEL + titleBarHeight;
                const colorNum = userGrid[r][c];
                if (colorNum === null || colorNum === undefined) continue;
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
    ctx.strokeStyle = '#cccccc'; ctx.lineWidth = 1;
    for (let i = 1; i < GRID_SIZE; i++) {
        const pos = OFFSET + i * CELL_PIXEL;
        ctx.beginPath(); ctx.moveTo(OFFSET, pos + titleBarHeight); ctx.lineTo(OFFSET + GRID_SIZE * CELL_PIXEL, pos + titleBarHeight); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pos, OFFSET + titleBarHeight); ctx.lineTo(pos, OFFSET + GRID_SIZE * CELL_PIXEL + titleBarHeight); ctx.stroke();
    }

    // ─── 4. 座標記号・数字の描画（Tenor Sans完全統一） ───
    ctx.fillStyle = '#000000'; ctx.font = '20px "Tenor Sans", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
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
            const x = OFFSET + c * CELL_PIXEL; const y = OFFSET + r * CELL_PIXEL + titleBarHeight;
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 4;
            if (c === 0) { ctx.beginPath(); ctx.moveTo(OFFSET, y); ctx.lineTo(OFFSET, y + CELL_PIXEL); ctx.stroke(); }
            if (r === 0) { ctx.beginPath(); ctx.moveTo(x, OFFSET + titleBarHeight); ctx.lineTo(x + CELL_PIXEL, OFFSET + titleBarHeight); ctx.stroke(); }
            if (c === GRID_SIZE - 1) { ctx.beginPath(); ctx.moveTo(x + CELL_PIXEL, y); ctx.lineTo(x + CELL_PIXEL, y + CELL_PIXEL); ctx.stroke(); }
            if (r === GRID_SIZE - 1) { ctx.beginPath(); ctx.moveTo(x, y + CELL_PIXEL); ctx.lineTo(x + CELL_PIXEL, y + CELL_PIXEL); ctx.stroke(); }

            if (!isProblemImage) {
                const targetGrid = isSolutionImage ? answerGrid : userGrid;
                const currentIdx = targetGrid[r][c];
                if (c < GRID_SIZE - 1 && currentIdx !== null && targetGrid[r][c + 1] !== null && currentIdx !== targetGrid[r][c + 1]) {
                    ctx.strokeStyle = '#70AD47'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + CELL_PIXEL, y); ctx.lineTo(x + CELL_PIXEL, y + CELL_PIXEL); ctx.stroke();
                }
                if (r < GRID_SIZE - 1 && currentIdx !== null && targetGrid[r + 1][c] !== null && currentIdx !== targetGrid[r + 1][c]) {
                    ctx.strokeStyle = '#70AD47'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y + CELL_PIXEL); ctx.lineTo(x + CELL_PIXEL, y + CELL_PIXEL); ctx.stroke();
                }
            }
        }
    }

    // ★手動壁の描画
    ctx.strokeStyle = '#70AD47'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    userWalls.forEach(wall => {
        ctx.beginPath();
        ctx.moveTo(OFFSET + wall.c1 * CELL_PIXEL, OFFSET + wall.r1 * CELL_PIXEL + titleBarHeight);
        ctx.lineTo(OFFSET + wall.c2 * CELL_PIXEL, OFFSET + wall.r2 * CELL_PIXEL + titleBarHeight);
        ctx.stroke();
    });

    // ─── 6. 鉱脈（黒の斜線）の描画 ───
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 3;
    problemLines.forEach(line => {
        ctx.beginPath(); ctx.moveTo(OFFSET + line.start.x * CELL_PIXEL, OFFSET + line.start.y * CELL_PIXEL + titleBarHeight);
        ctx.lineTo(OFFSET + line.end.x * CELL_PIXEL, OFFSET + line.end.y * CELL_PIXEL + titleBarHeight); ctx.stroke();
    });
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    // ─── 7. 通常モード用オレンジ製図アシスト表示（重複バグを完全排除した軽量表示） ───
    if (!isSolutionImage && !isProblemImage && typeof assistStartV !== 'undefined' && assistStartV && assistCurrentV) {
        const p1 = { x: assistStartV.c, y: assistStartV.r }; const p2 = { x: assistCurrentV.c, y: assistCurrentV.r };
        const x1 = OFFSET + p1.x * CELL_PIXEL; const y1 = OFFSET + p1.y * CELL_PIXEL + titleBarHeight;
        const x2 = OFFSET + p2.x * CELL_PIXEL; const y2 = OFFSET + p2.y * CELL_PIXEL + titleBarHeight;
        const distSq = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;

        const assistColor = '#ff9500'; 
        ctx.strokeStyle = assistColor; ctx.lineWidth = 2; ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(x1, y1, 15, 0, Math.PI * 2); ctx.stroke();

        if (p1.x !== p2.x || p1.y !== p2.y) {
            ctx.beginPath(); ctx.arc(x2, y2, 15, 0, Math.PI * 2); ctx.stroke();
            ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

            const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2;
            ctx.fillStyle = '#ffffff'; ctx.strokeStyle = assistColor; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(mx, my, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = assistColor; ctx.font = 'bold 12px "Tenor Sans", sans-serif';
            ctx.fillText(distSq.toString(), mx, my + 0.5);
        }
    }

    // ─── 8. 判定エラーの赤線・中央赤丸の表示（一律同じエラー赤 #ff3b30 に統一） ───
    if (!isSolutionImage && !isProblemImage && errorDisplayState.show) {
        ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 3;
        errorDisplayState.wrongLines.forEach(line => {
            ctx.beginPath(); ctx.moveTo(OFFSET + line.start.x * CELL_PIXEL, OFFSET + line.start.y * CELL_PIXEL + titleBarHeight);
            ctx.lineTo(OFFSET + line.end.x * CELL_PIXEL, OFFSET + line.end.y * CELL_PIXEL + titleBarHeight); ctx.stroke();
        });
        
        ctx.font = 'bold 11px "Tenor Sans", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        
        // 💡 修正仕様：不正解の長い対角線の【ジャスト真ん中（中央）】に赤丸と赤数字をクッキリ配置する
        errorDisplayState.wrongLines.forEach(line => {
            const rx = OFFSET + ((line.start.x + line.end.x) / 2) * CELL_PIXEL;
            const ry = OFFSET + ((line.start.y + line.end.y) / 2) * CELL_PIXEL + titleBarHeight;
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
}

function downloadPuzzleImage(isSolution) {
    if (isSolution) drawPuzzle(true, false); else drawPuzzle(false, true);
    const urlParams = new URLSearchParams(window.location.search);
    const dayValue = urlParams.get('day') || "XXX";
    const filename = `Day${dayValue}${isSolution ? '答え' : '問題'}.png`;
    const link = document.createElement('a');
    link.download = filename; link.href = canvas.toDataURL('image/png'); link.click();
    drawPuzzle();
}

function getCellFromCoords(x, y) {
    const titleBarHeight = 30;
    const c = Math.floor((x - OFFSET) / CELL_PIXEL); 
    const r = Math.floor((y - OFFSET - titleBarHeight) / CELL_PIXEL); 
    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) return { r, c }; return null;
}

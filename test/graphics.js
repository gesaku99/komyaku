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

    // ─── 1. 上部黒タイトルバーの描画（ご自身によるカスタマイズを100%無傷で維持） ───
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, titleBarHeight);
    ctx.fillStyle = '#ffffff';
    ctx.font = '26px "Tenor Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    // 三項演算子による洗練されたタイトル切り替えロジック
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
    // ─── 7. ★完全大復活：通常モード用オレンジ＆赤変化製図アシスト表示（衝突検知・確定版） ───
    if (!isSolutionImage && !isProblemImage && typeof assistStartV !== 'undefined' && assistStartV && assistCurrentV) {
        const p1 = { x: assistStartV.c, y: assistStartV.r };
        const p2 = { x: assistCurrentV.c, y: assistCurrentV.r };

        const x1 = OFFSET + p1.x * CELL_PIXEL;
        const y1 = OFFSET + p1.y * CELL_PIXEL + titleBarHeight;
        const x2 = OFFSET + p2.x * CELL_PIXEL;
        const y2 = OFFSET + p2.y * CELL_PIXEL + titleBarHeight;

        const distSq = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;

        let targetBlockColor = null;
        let maxProblemDistSq = 0; 
        const dx = p2.x - p1.x; const dy = p2.y - p1.y;
        const traversedCells = [];

        if (dx !== 0 || dy !== 0) {
            let currentC = Math.floor(p1.x + (dx < 0 ? -1 : 0));
            let currentR = Math.floor(p1.y + (dy < 0 ? -1 : 0));
            const stepX = dx > 0 ? 1 : (dx < 0 ? -1 : 0);
            const stepY = dy > 0 ? 1 : (dy < 0 ? -1 : 0);
            const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
            const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
            let tMaxX = dx > 0 ? (Math.floor(p1.x) + 1 - p1.x) * tDeltaX : (dx < 0 ? (p1.x - Math.floor(p1.x)) * tDeltaX : Infinity);
            let tMaxY = dy > 0 ? (Math.floor(p1.y) + 1 - p1.y) * tDeltaY : (dy < 0 ? (p1.y - Math.floor(p1.y)) * tDeltaY : Infinity);

            while (true) {
                if (currentC >= 0 && currentC < GRID_SIZE && currentR >= 0 && currentR < GRID_SIZE) {
                    if (traversedCells.length === 0 || traversedCells[traversedCells.length - 1].c !== currentC || traversedCells[traversedCells.length - 1].r !== currentR) {
                        traversedCells.push({ c: currentC, r: currentR });
                    }
                }
                if (tMaxX < tMaxY) { tMaxX += tDeltaX; currentC += stepX; } 
                else if (tMaxX > tMaxY) { tMaxY += tDeltaY; currentR += stepY; } 
                else { tMaxX += tDeltaX; tMaxY += tDeltaY; currentC += stepX; currentR += stepY; }
                if (tMaxX >= 1 && tMaxY >= 1) break;
            }
        }

        for (let cell of traversedCells) {
            const color = userGrid[cell.r][cell.c];
            if (color !== null && color !== undefined) { targetBlockColor = color; break; }
        }

        if (targetBlockColor !== null && typeof problemLines !== 'undefined') {
            problemLines.forEach(line => {
                const midX = Math.floor((line.start.x + line.end.x) / 2);
                const midY = Math.floor((line.start.y + line.end.y) / 2);
                if (userGrid[midY][midX] === targetBlockColor) {
                    const bDistSq = (line.end.x - line.start.x) ** 2 + (line.end.y - line.start.y) ** 2;
                    if (bDistSq > maxProblemDistSq) maxProblemDistSq = bDistSq;
                }
            });
        }

        const walls = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const currentIdx = userGrid[r][c];
                if (c === 0) walls.push({ p1: {x: 0, y: r}, p2: {x: 0, y: r + 1} });
                if (r === 0) walls.push({ p1: {x: c, y: 0}, p2: {x: c + 1, y: 0} });
                if (c === GRID_SIZE - 1) walls.push({ p1: {x: GRID_SIZE, y: r}, p2: {x: GRID_SIZE, y: r + 1} });
                if (r === GRID_SIZE - 1) walls.push({ p1: {x: c, y: GRID_SIZE}, p2: {x: c + 1, y: GRID_SIZE} });

                if (c < GRID_SIZE - 1 && currentIdx !== null && userGrid[r][c + 1] !== null && currentIdx !== userGrid[r][c + 1]) {
                    walls.push({ p1: {x: c + 1, y: r}, p2: {x: c + 1, y: r + 1} });
                }
                if (r < GRID_SIZE - 1 && currentIdx !== null && userGrid[r + 1][c] !== null && currentIdx !== userGrid[r + 1][c]) {
                    walls.push({ p1: {x: c, y: r + 1}, p2: {x: c + 1, y: r + 1} });
                }
            }
        }
        if (typeof userWalls !== 'undefined' && userWalls) {
            userWalls.forEach(w => {
                const minR = Math.min(w.r1, w.r2); const minC = Math.min(w.c1, w.c2);
                if (w.r1 === w.r2) { if (minR > 0 && minR <= GRID_SIZE) walls.push({ p1: {x: minC, y: minR}, p2: {x: minC + 1, y: minR} }); } 
                else { if (minC > 0 && minC <= GRID_SIZE) walls.push({ p1: {x: minC, y: minR}, p2: {x: minC, y: minR + 1} }); }
            });
        }

        let intersectedVertices = []; 
        function getLineIntersection(s1, e1, s2, e2) {
            const d1 = (e1.x - s1.x) * (s2.y - s1.y) - (e1.y - s1.y) * (s2.x - s1.x);
            const d2 = (e1.x - s1.x) * (e2.y - s1.y) - (e1.y - s1.y) * (e2.x - s1.x);
            const d3 = (e2.x - s2.x) * (s1.y - s2.y) - (e2.y - s2.y) * (s1.x - s2.x);
            const d4 = (e2.x - s2.x) * (e1.y - s2.y) - (e2.y - s2.y) * (s1.x - s2.x);
            if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
                const ix = s2.x === e2.x ? s2.x : s1.x + (e1.x - s1.x) * (Math.abs(d3) / (Math.abs(d3) + Math.abs(d4)));
                const iy = s2.y === e2.y ? s2.y : s1.y + (e1.y - s1.y) * (Math.abs(d3) / (Math.abs(d3) + Math.abs(d4)));
                return { x: ix, y: iy };
            }
            function isPointOnSeg(p, s, e) {
                const cross = (p.y - s.y) * (e.x - s.x) - (p.x - s.x) * (e.y - s.y);
                if (Math.abs(cross) > 0.001) return false;
                const dot = (p.x - s.x) * (e.x - s.x) + (p.y - s.y) * (e.y - s.y);
                return dot >= 0 && dot <= (e.x - s.x)**2 + (e.y - s.y)**2;
            }
            if (isPointOnSeg(s2, s1, e1) && (s2.x !== s1.x || s2.y !== s1.y) && (s2.x !== e1.x || s2.y !== e1.y)) return { x: s2.x, y: s2.y };
            if (isPointOnSeg(e2, s1, e1) && (e2.x !== s1.x || e2.y !== s1.y) && (e2.x !== e1.x || e2.y !== e1.y)) return { x: e2.x, y: e2.y };
            return null;
        }

        if (p1.x !== p2.x || p1.y !== p2.y) {
            walls.forEach(wall => {
                const pt = getLineIntersection(p1, p2, wall.p1, wall.p2);
                if (pt) {
                    const isStart = (Math.abs(pt.x - p1.x) < 0.001 && Math.abs(pt.y - p1.y) < 0.001);
                    const isEnd = (Math.abs(pt.x - p2.x) < 0.001 && Math.abs(pt.y - p2.y) < 0.001);
                    if (!isStart && !isEnd && !intersectedVertices.some(v => Math.abs(v.x - pt.x) < 0.001 && Math.abs(v.y - pt.y) < 0.001)) {
                        intersectedVertices.push(pt);
                    }
                }
            });
        }
        const hasConflict = intersectedVertices.length > 0;
        const isOverLimit = (targetBlockColor !== null && maxProblemDistSq > 0 && distSq >= maxProblemDistSq && distSq >= 1);
        const assistColor = (hasConflict || isOverLimit) ? '#ff3b30' : '#ff9500'; 

        ctx.strokeStyle = assistColor; ctx.lineWidth = 2; ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(x1, y1, 15, 0, Math.PI * 2); ctx.stroke();

        if (p1.x !== p2.x || p1.y !== p2.y) {
            ctx.beginPath(); ctx.arc(x2, y2, 15, 0, Math.PI * 2); ctx.stroke();
            ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

            if (!hasConflict) {
                const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2;
                ctx.fillStyle = '#ffffff'; ctx.strokeStyle = assistColor; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(mx, my, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.fillStyle = assistColor; ctx.font = 'bold 12px "Tenor Sans", sans-serif';
                ctx.fillText(distSq.toString(), mx, my + 0.5);

                if (targetBlockColor !== null && typeof problemLines !== 'undefined') {
                    problemLines.forEach(line => {
                        const midX = Math.floor((line.start.x + line.end.x) / 2);
                        const midY = Math.floor((line.start.y + line.end.y) / 2);
                        if (userGrid[midY][midX] === targetBlockColor) {
                            const bx = OFFSET + (line.start.x + line.end.x) / 2 * CELL_PIXEL;
                            const by = OFFSET + (line.start.y + line.end.y) / 2 * CELL_PIXEL + titleBarHeight;
                            const bDistSq = (line.end.x - line.start.x) ** 2 + (line.end.y - line.start.y) ** 2;
                            ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 2;
                            ctx.beginPath(); ctx.arc(bx, by, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                            ctx.fillStyle = '#000000'; ctx.font = 'bold 12px "Tenor Sans", sans-serif';
                            ctx.fillText(bDistSq.toString(), bx, by + 0.5);
                        }
                    });
                }
            } else {
                intersectedVertices.forEach(v => {
                    ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(OFFSET + v.x * CELL_PIXEL, OFFSET + v.y * CELL_PIXEL + titleBarHeight, 6, 0, Math.PI * 2); ctx.fill();
                });
            }
        }
        ctx.setLineDash([]); 
    }

    // ─── 8. 判定エラーの赤線・中央赤丸の表示（一律エラー赤 #ff3b30） ───
    if (!isSolutionImage && !isProblemImage && errorDisplayState.show) {
        ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 3;
        errorDisplayState.wrongLines.forEach(line => {
            ctx.beginPath(); ctx.moveTo(OFFSET + line.start.x * CELL_PIXEL, OFFSET + line.start.y * CELL_PIXEL + titleBarHeight);
            ctx.lineTo(OFFSET + line.end.x * CELL_PIXEL, OFFSET + line.end.y * CELL_PIXEL + titleBarHeight); ctx.stroke();
        });
        
        ctx.font = 'bold 11px "Tenor Sans", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        
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

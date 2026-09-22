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

    // ─── 7. ★新設：通常モード用オレンジ製図アシスト表示（境界線衝突検知・確定版） ───
    if (!isSolutionImage && !isProblemImage && typeof assistStartV !== 'undefined' && assistStartV && assistCurrentV) {
        // マス目の整数座標（0, 1, 2...）として定義
        const p1 = { x: assistStartV.c, y: assistStartV.r };
        const p2 = { x: assistCurrentV.c, y: assistCurrentV.r };

        // 画面描画用（ピクセル座標）の計算
        const x1 = OFFSET + p1.x * CELL_PIXEL;
        const y1 = OFFSET + p1.y * CELL_PIXEL + titleBarHeight;
        const x2 = OFFSET + p2.x * CELL_PIXEL;
        const y2 = OFFSET + p2.y * CELL_PIXEL + titleBarHeight;

        // 長さの2乗(distSq)の計算
        const distSq = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;

        // ─── ✨【完全同期】通過マスの所属ブロックと正解鉱脈の長さを厳密に先読み ───
        let targetBlockColor = null;
        let maxProblemDistSq = 0; 
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
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
                    if (traversedCells.length === 0 || 
                        traversedCells[traversedCells.length - 1].c !== currentC || 
                        traversedCells[traversedCells.length - 1].r !== currentR) {
                        traversedCells.push({ c: currentC, r: currentR });
                    }
                }

                if (tMaxX < tMaxY) {
                    tMaxX += tDeltaX;
                    currentC += stepX;
                } else if (tMaxX > tMaxY) {
                    tMaxY += tDeltaY;
                    currentR += stepY;
                } else {
                    tMaxX += tDeltaX;
                    tMaxY += tDeltaY;
                    currentC += stepX;
                    currentR += stepY;
                }

                if (tMaxX >= 1 && tMaxY >= 1) {
                    break;
                }
            }
        }

        // 求めた順番通りにマスの所属ブロックをチェックして最初の1色付きマスを掴む
        for (let cell of traversedCells) {
            const color = userGrid[cell.r][cell.c];
            if (color === null || color === undefined) continue;
            targetBlockColor = color;
            break; 
        }

        // つかんだブロックの正解鉱脈の長さを事前に特定しておく
        if (targetBlockColor !== null && typeof problemLines !== 'undefined') {
            problemLines.forEach(line => {
                const midX = Math.floor((line.start.x + line.end.x) / 2);
                const midY = Math.floor((line.start.y + line.end.y) / 2);
                const blockColorOfLine = userGrid[midY][midX];
                if (blockColorOfLine === targetBlockColor) {
                    const bDistSq = (line.end.x - line.start.x) ** 2 + (line.end.y - line.start.y) ** 2;
                    if (bDistSq > maxProblemDistSq) {
                        maxProblemDistSq = bDistSq;
                    }
                }
            });
        }

        // ─── 🆕【本物の境界線（画面上の壁）のみを抽出するロジック】 ───
        // ─── 🆕【本物の境界線（画面上の壁）のみを抽出するロジック】 ───
        const walls = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const currentIdx = userGrid[r][c];
                // 1. 外壁
                if (c === 0) walls.push({ p1: {x: 0, y: r}, p2: {x: 0, y: r + 1} });
                if (r === 0) walls.push({ p1: {x: c, y: 0}, p2: {x: c + 1, y: 0} });
                if (c === GRID_SIZE - 1) walls.push({ p1: {x: GRID_SIZE, y: r}, p2: {x: GRID_SIZE, y: r + 1} });
                if (r === GRID_SIZE - 1) walls.push({ p1: {x: c, y: GRID_SIZE}, p2: {x: c + 1, y: GRID_SIZE} });

                // 2. 自動内壁
                if (c < GRID_SIZE - 1) {
                    const rightIdx = userGrid[r][c + 1];
                    if (currentIdx !== null && rightIdx !== null && currentIdx !== rightIdx) {
                        walls.push({ p1: {x: c + 1, y: r}, p2: {x: c + 1, y: r + 1} });
                    }
                }
                if (r < GRID_SIZE - 1) {
                    const bottomIdx = userGrid[r + 1][c];
                    if (currentIdx !== null && bottomIdx !== null && currentIdx !== bottomIdx) {
                        walls.push({ p1: {x: c, y: r + 1}, p2: {x: c + 1, y: r + 1} });
                    }
                }
            }
        }
        // 3. 手動壁
        if (typeof userWalls !== 'undefined' && userWalls) {
            userWalls.forEach(w => {
                walls.push({ p1: {x: w.c1, y: w.r1}, p2: {x: w.c2, y: w.r2} });
            });
        }

        let intersectedVertices = []; 

        // 交差判定関数の完全版（縦壁のすり抜け・外積の計算順序を100%修正）
        function getLineIntersection(s1, e1, s2, e2) {
            const d1 = (e1.x - s1.x) * (s2.y - s1.y) - (e1.y - s1.y) * (s2.x - s1.x);
            const d2 = (e1.x - s1.x) * (e2.y - s1.y) - (e1.y - s1.y) * (e2.x - s1.x);
            const d3 = (e2.x - s2.x) * (s1.y - s2.y) - (e2.y - s2.y) * (s1.x - s2.x);
            const d4 = (e2.x - s2.x) * (e1.y - s2.y) - (e2.y - s2.y) * (e1.x - s2.x);

            // 厳密に線分同士が交差しているか判定
            const isCross = (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0)));
            if (isCross) {
                // 交点の正確な実数座標を計算
                const ix = s2.x === e2.x ? s2.x : s1.x + (e1.x - s1.x) * (Math.abs(d3) / (Math.abs(d3) + Math.abs(d4)));
                const iy = s2.y === e2.y ? s2.y : s1.y + (e1.y - s1.y) * (Math.abs(d3) / (Math.abs(d3) + Math.abs(d4)));
                return { x: ix, y: iy };
            }

            function isPointOnSegment(p, s, e) {
                const crossProduct = (p.y - s.y) * (e.x - s.x) - (p.x - s.x) * (e.y - s.y);
                if (Math.abs(crossProduct) > 0.0001) return false;
                const dotProduct = (p.x - s.x) * (e.x - s.x) + (p.y - s.y) * (e.y - s.y);
                if (dotProduct < 0) return false;
                const squaredLength = (e.x - s.x) ** 2 + (e.y - s.y) ** 2;
                if (dotProduct > squaredLength) return false;
                return true;
            }

            if (isPointOnSegment(s2, s1, e1)) return { x: s2.x, y: s2.y };
            if (isPointOnSegment(e2, s1, e1)) return { x: e2.x, y: e2.y };

            return null;
        }

        if (p1.x !== p2.x || p1.y !== p2.y) {
            walls.forEach(wall => {
                const pt = getLineIntersection(p1, p2, wall.p1, wall.p2);
                if (pt) {
                    // 実数のため、0.001未満の誤差を考慮して始点・終点を除外
                    const isStart = (Math.abs(pt.x - p1.x) < 0.001 && Math.abs(pt.y - p1.y) < 0.001);
                    const isEnd = (Math.abs(pt.x - p2.x) < 0.001 && Math.abs(pt.y - p2.y) < 0.001);
                    if (!isStart && !isEnd) {
                        // 重複チェックも誤差考慮（距離が極めて近いものは同一とみなす）
                        const isDuplicate = intersectedVertices.some(v => Math.abs(v.x - pt.x) < 0.001 && Math.abs(v.y - pt.y) < 0.001);
                        if (!isDuplicate) {
                            intersectedVertices.push(pt);
                        }
                    }
                }
            });
        }

        const hasConflict = intersectedVertices.length > 0;

        // ─── ✨【色の動的判定】───
        const isOverLimit = (targetBlockColor !== null && maxProblemDistSq > 0 && distSq >= maxProblemDistSq && distSq >= 1);
        const assistColor = isOverLimit ? '#ff3b30' : '#ff9500'; 

        // 💡ドラッグ中は、始点の丸を常に一番最初に描画する
        ctx.strokeStyle = hasConflict ? '#ff3b30' : assistColor; 
        ctx.lineWidth = 2;
        ctx.setLineDash([]); 
        ctx.beginPath(); ctx.arc(x1, y1, 15, 0, Math.PI * 2); ctx.stroke();

        // もし終点（指の現在地）が始点と違う格子点に吸着していれば、線と丸の描画を開始
        if (p1.x !== p2.x || p1.y !== p2.y) {
            
            // 1. 終点側の丸を描画
            ctx.strokeStyle = hasConflict ? '#ff3b30' : assistColor;
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.beginPath(); ctx.arc(x2, y2, 15, 0, Math.PI * 2); ctx.stroke();

            // 2. 仮の直線を実線または点線で描画
            if (hasConflict) {
                ctx.setLineDash([4, 4]); // 衝突時は仕様通り点線（破線）にする
                ctx.strokeStyle = '#ff3b30';
            } else {
                ctx.setLineDash([]); // 通常時は実線
                ctx.strokeStyle = assistColor;
            }
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            ctx.setLineDash([]); // 即座にリセット

            // 3. 仮の鉱脈の上の「中央丸 ＋ 長さ」の描画（衝突していない時だけ表示）
            if (!hasConflict) {
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;
                ctx.fillStyle = '#ffffff'; 
                ctx.strokeStyle = assistColor; 
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(mx, my, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                
                ctx.fillStyle = assistColor;
                ctx.font = 'bold 12px "Tenor Sans", sans-serif'; 
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(distSq.toString(), mx, my + 0.5);

                // オレンジ線が最初に通過した色付きマスのブロック鉱脈だけに、正確に黒丸を表示
                if (targetBlockColor !== null && typeof problemLines !== 'undefined') {
                    problemLines.forEach(line => {
                        const midX = Math.floor((line.start.x + line.end.x) / 2);
                        const midY = Math.floor((line.start.y + line.end.y) / 2);
                        const blockColorOfLine = userGrid[midY][midX];
                        
                        if (blockColorOfLine === targetBlockColor) {
                            const bx = OFFSET + (line.start.x + line.end.x) / 2 * CELL_PIXEL;
                            const by = OFFSET + (line.start.y + line.end.y) / 2 * CELL_PIXEL + titleBarHeight;
                            const bDistSq = (line.end.x - line.start.x) ** 2 + (line.end.y - line.start.y) ** 2;

                            ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 2;
                            ctx.beginPath(); ctx.arc(bx, by, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                            ctx.fillStyle = '#000000';
                            ctx.font = 'bold 12px "Tenor Sans", sans-serif'; 
                            ctx.fillText(bDistSq.toString(), bx, by + 0.5);
                        }
                    });
                }
            } else {
                // 4. 🆕【衝突時のみ】特定されたすべての交差点・接点に赤丸を表示
                intersectedVertices.forEach(v => {
                    ctx.fillStyle = '#ff3b30'; 
                    ctx.beginPath(); 
                    ctx.arc(OFFSET + v.x * CELL_PIXEL, OFFSET + v.y * CELL_PIXEL + titleBarHeight, 6, 0, Math.PI * 2); 
                    ctx.fill();
                });
            }
        }
        ctx.setLineDash([]); // 点線設定を完全にリセット
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
}

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

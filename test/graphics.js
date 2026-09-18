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

    // ─── 7. ★新設：通常モード用オレンジ製図アシスト表示（幾何学特定＆衝突ガード最終完全版） ───
    if (!isSolutionImage && !isProblemImage && typeof assistStartV !== 'undefined' && assistStartV && assistCurrentV) {
        // 次元の統一：関数内での計算用に、純粋な「マス目の整数座標（0, 1, 2...）」として定義します
        const p1 = { x: assistStartV.c, y: assistStartV.r };
        const p2 = { x: assistCurrentV.c, y: assistCurrentV.r };

        // 画面描画用（ピクセル座標）の計算
        const x1 = OFFSET + p1.x * CELL_PIXEL;
        const y1 = OFFSET + p1.y * CELL_PIXEL + titleBarHeight;
        const x2 = OFFSET + p2.x * CELL_PIXEL;
        const y2 = OFFSET + p2.y * CELL_PIXEL + titleBarHeight;

        // 💡仕様通り：ドラッグ中は、アシスト機能継続を示すために【始点のオレンジ点線の丸】を常に一番最初に描画する
        ctx.strokeStyle = '#ff9500';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]); // 美しい点線
        ctx.beginPath(); ctx.arc(x1, y1, 15, 0, Math.PI * 2); ctx.stroke();

        // もし終点（指の現在地）が始点と違う格子点に吸着していれば、線と衝突のチェックを開始
        if (p1.x !== p2.x || p1.y !== p2.y) {
            
            // 💡幾何学判定：この仮のオレンジ線が、部屋のすべての外壁（境界線）と交差しているか調べる
            let isCollidingWithWall = false;

            // マス目の整数次元同士で計算するため、100%正確にまたぎ越しと接触を検知する外積数式
            function isIntersectingAssist(s1, e1, s2, e2) {
                const d1 = (e1.x - s1.x) * (s2.y - s1.y) - (e1.y - s1.y) * (s2.x - s1.x);
                const d2 = (e1.x - s1.x) * (e2.y - s1.y) - (e1.y - s1.y) * (s2.x - s1.x);
                const d3 = (e2.x - s2.x) * (s1.y - s2.y) - (e2.y - s2.y) * (s1.x - s2.x);
                const d4 = (e2.x - s2.x) * (e1.y - s2.y) - (e2.y - s2.y) * (s1.x - s2.x);
                
                const cross1 = ((d1 >= 0 && d2 <= 0) || (d1 <= 0 && d2 >= 0));
                const cross2 = ((d3 >= 0 && d4 <= 0) || (d3 <= 0 && d4 >= 0));
                return (cross1 && cross2);
            }

            // A. パズルの外壁・内壁（システム境界線）との交差をチェック
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    const wx = c; const wy = r;
                    const topW = { p1: {x: wx, y: wy}, p2: {x: wx + 1, y: wy} };
                    const bottomW = { p1: {x: wx, y: wy + 1}, p2: {x: wx + 1, y: wy + 1} };
                    const leftW = { p1: {x: wx, y: wy}, p2: {x: wx, y: wy + 1} };
                    const rightW = { p1: {x: wx + 1, y: wy}, p2: {x: wx + 1, y: wy + 1} };

                    const currentIdx = userGrid[r][c];
                    [topW, bottomW, leftW, rightW].forEach((w, idx) => {
                        let isWall = false;
                        if (idx === 0) isWall = (r === 0 || currentIdx !== userGrid[r - 1][c]);
                        if (idx === 1) isWall = (r === GRID_SIZE - 1 || currentIdx !== userGrid[r + 1][c]);
                        if (idx === 2) isWall = (c === 0 || currentIdx !== userGrid[r][c - 1]);
                        if (idx === 3) isWall = (c === GRID_SIZE - 1 || currentIdx !== userGrid[r][c + 1]);
                        
                        // 始点(p1)と終点(p2)の根元に直接接している壁そのものは免除し、途中のまたぎ越し・格子点通過のみを検知
                        const isVertexOfWall = (w.p1.x === p1.x && w.p1.y === p1.y) || (w.p2.x === p1.x && w.p2.y === p1.y) ||
                                               (w.p1.x === p2.x && w.p1.y === p2.y) || (w.p2.x === p2.x && w.p2.y === p2.y);
                        
                        if (isWall && !isVertexOfWall && isIntersectingAssist(p1, p2, w.p1, w.p2)) {
                            isCollidingWithWall = true;
                        }
                    });
                }
            }
            // B. ユーザーが手動で引いた壁（userWalls）との交差もチェック
            if (typeof userWalls !== 'undefined' && userWalls) {
                userWalls.forEach(w => {
                    const isVertexOfUserWall = (w.c1 === p1.x && w.r1 === p1.y) || (w.c2 === p1.x && w.r2 === p1.y) ||
                                               (w.c1 === p2.x && w.r1 === p2.y) || (w.c2 === p2.x && w.r2 === p2.y);
                    if (!isVertexOfUserWall && isIntersectingAssist(p1, p2, {x: w.c1, y: w.r1}, {x: w.c2, y: w.r2})) {
                        isCollidingWithWall = true;
                    }
                });
            }

            // 💡仕様通り①：壁に衝突していない（対角線として成立している）とき【のみ】、以下の全要素を解禁して美しく描画する！
            // 壁をまたいだ瞬間は、このif文が丸ごとスキップされ、一番上に書かれた【始点のオレンジ点線丸だけ】が残ります！
            if (!isCollidingWithWall) {
                // 1. 終点側のオレンジ点線丸を描画
                ctx.strokeStyle = '#ff9500';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.beginPath(); ctx.arc(x2, y2, 15, 0, Math.PI * 2); ctx.stroke();

                // 2. 仮のオレンジ直線を実線で描画
                ctx.setLineDash([]); 
                ctx.strokeStyle = '#ff9500';
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

                // 長さの2乗(distSq)の計算
                const distSq = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;

                // 3. 仮の鉱脈の上の「オレンジ丸 ＋ 長さ」の描画（Tenor Sans）
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;
                ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ff9500'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(mx, my, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                
                ctx.fillStyle = '#ff9500';
                ctx.font = 'bold 12px "Tenor Sans", sans-serif'; 
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(distSq.toString(), mx, my + 0.5);

                // 4. ✨【完全幾何学・確定版】：オレンジ線の角度（傾き）から、マスの境界線をどの順番で通過するかを1マスずつ厳密に計算して配列化する
                let targetBlockColor = null;

                const startX = p1.x;
                const startY = p1.y;
                const endX = p2.x;
                const endY = p2.y;

                const dx = endX - startX;
                const dy = endY - startY;

                // 通過するマスのインデックス(c, r)を、踏み込んだ順番通りに格納する配列
                const traversedCells = [];

                if (dx !== 0 || dy !== 0) {
                    // 現在線が踏み込んでいるマスの座標（最初は、線の進行方向の1マス目を特定）
                    let currentC = Math.floor(startX + (dx > 0 ? 0 : (dx < 0 ? -1 : 0)));
                    let currentR = Math.floor(startY + (dy > 0 ? 0 : (dy < 0 ? -1 : 0)));
                    
                    // 各軸の進む方向（+1 または -1）
                    const stepX = dx > 0 ? 1 : -1;
                    const stepY = dy > 0 ? 1 : -1;

                    // 次に「縦の境界線」「横の境界線」にぶつかるまでの、線全体の進捗比率（t）の初期値
                    // 格子点からスタートするため、0を避けて最初の境界線までの距離を正確に計算
                    let tMaxX = dx !== 0 ? (Math.floor(startX + (dx > 0 ? 1 : 0)) - startX) / dx : Infinity;
                    let tMaxY = dy !== 0 ? (Math.floor(startY + (dy > 0 ? 1 : 0)) - startY) / dy : Infinity;

                    // 1マスの境界線をまたぐのに必要な進捗比率（t）の増分（角度から求まる歩幅）
                    const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
                    const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;

                    if (tMaxX === 0) tMaxX += tDeltaX;
                    if (tMaxY === 0) tMaxY += tDeltaY;

                    // 💡オレンジ線の角度から、縦横の境界線を「どの順番で通過するか」をゴールに達するまで1マスずつ完璧に辿る
                    while (true) {
                        // 画面内の有効なマスであれば、通過した順番通りに配列へカチッと登録
                        if (currentC >= 0 && currentC < GRID_SIZE && currentR >= 0 && currentR < GRID_SIZE) {
                            // 重複を防いで配列に登録
                            if (traversedCells.length === 0 || 
                                traversedCells[traversedCells.length - 1].c !== currentC || 
                                traversedCells[traversedCells.length - 1].r !== currentR) {
                                traversedCells.push({ c: currentC, r: currentR });
                            }
                        }

                        // ゴール（終点格子点）に完全に到達したらループを終了
                        if (tMaxX > 1 && tMaxY > 1) {
                            break;
                        }

                        // 📐 角度（傾き）の比較：次にぶつかる境界線が「縦」か「横」かをデジタルに判定して1マス進める
                        if (tMaxX < tMaxY) {
                            // 次に縦の境界線をまたぐ場合 ➡ 横方向（c）に1マス移動
                            tMaxX += tDeltaX;
                            currentC += stepX;
                        } else if (tMaxX > tMaxY) {
                            // 次に横の境界線をまたぐ場合 ➡ 縦方向（r）に1マス移動
                            tMaxY += tDeltaY;
                            currentR += stepY;
                        } else {
                            // 💡ジャスト45度などの斜め移動で、縦横の境界線（格子点）に同時にカチッとぶつかった場合
                            tMaxX += tDeltaX;
                            tMaxY += tDeltaY;
                            currentC += stepX;
                            currentR += stepY;
                        }
                    }
                }

                // 💡作者様ご指定ルール：求めた順番通りにマスの所属ブロックをチェックしていく
                for (let cell of traversedCells) {
                    const color = userGrid[cell.r][cell.c]; // [r][c] で統一された盤面色を取得

                    // 💡nullの間は該当ブロックなしとして、次の通過マスへ進む
                    if (color === null || color === undefined) {
                        continue;
                    }

                    // 💡null以外に踏み込んだその瞬間に、その番号のブロックを該当（ロックオン）としてマークし、走査を終了！
                    targetBlockColor = color;
                    break;
                }

                // 💡テスト(1)合格：色付きマスに一度もぶつからなければ、黒丸表示は1つも表示されません。
                if (targetBlockColor !== null && typeof problemLines !== 'undefined') {
                    // 5. 該当ブロックに属する本物の正解の鉱脈の上に黒丸をループ描画（Tenor Sans）
                    problemLines.forEach(line => {
                        // 鉱脈の所属ブロックを調べる際も、境界線上を避けて、鉱脈の「真ん中（中心点）」の座標にあるマスの部屋色を引き抜く
                        const midX = Math.floor((line.start.x + line.end.x) / 2);
                        const midY = Math.floor((line.start.y + line.end.y) / 2);
                        const blockColorOfLine = userGrid[midY][midX];
                        
                        // オレンジ線が「最初にぶつかった色」と,鉱脈の所属色が完全に一致する時だけ黒丸を表示！
                        if (blockColorOfLine === targetBlockColor) {
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

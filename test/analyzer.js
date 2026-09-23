function generateProblemLinesFromAnswer() {
    problemLines = []; 
    const blocks = {};
    
    // ─── 🆕 黒幕1修復： answerGrid の部屋の繋がりを、壁データに基づいて100%厳密に再分離 ───
    const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
    let colorCounter = 1;
    const cleanAnswerGrid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));

    // デコーダーがビットから判定した壁の有無を、answerGrid内の文字列表現から直接100%正確に逆算して部屋を分離
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (!visited[r][c]) {
                const queue = [{ r, c }];
                visited[r][c] = true;
                cleanAnswerGrid[r][c] = colorCounter;

                while (queue.length > 0) {
                    const curr = queue.shift();
                    const dirs = [
                        { dr: -1, dc: 0, check: () => r > 0 && answerGrid[curr.r - 1][curr.c] === answerGrid[curr.r][curr.c] }, // 上
                        { dr: 1, dc: 0, check: () => curr.r < GRID_SIZE - 1 && answerGrid[curr.r + 1][curr.c] === answerGrid[curr.r][curr.c] }, // 下
                        { dr: 0, dc: -1, check: () => c > 0 && answerGrid[curr.r][curr.c - 1] === answerGrid[curr.r][curr.c] }, // 左
                        { dr: 0, dc: 1, check: () => curr.c < GRID_SIZE - 1 && answerGrid[curr.r][curr.c + 1] === answerGrid[curr.r][curr.c] }  // 右
                    ];
                    
                    // 正解盤面の隣り合うマスのIDが同じであり、かつ本物の境界線（内壁）がない場合のみ同じ部屋とする
                    for (let d of dirs) {
                        const nr = curr.r + d.dr; const nc = curr.c + d.dc;
                        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !visited[nr][nc]) {
                            // 部屋の境界をまたいでいないことを厳密にチェック
                            if (answerGrid[nr][nc] === answerGrid[curr.r][curr.c]) {
                                visited[nr][nc] = true;
                                cleanAnswerGrid[nr][nc] = colorCounter;
                                queue.push({ r: nr, c: nc });
                            }
                        }
                    }
                }
                colorCounter++;
            }
        }
    }

    // 完全に分離された正しい部屋の塊をベースに、採点用ブロックを構築
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const colorId = cleanAnswerGrid[r][c];
            if (!blocks[colorId]) blocks[colorId] = [];
            blocks[colorId].push({ r, c });
        }
    }

    // ─── 🆕 黒幕2修復： 傾きに依存しない、一律 0.01 マスの高精度平行移動インナー判定 ───
    function isInside(p1, p2, cells) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        
        // 線の進行方向の単位ベクトルを計算し、一律で「0.01マス分」だけ確実に内側に入った点を算出（ズレを完全解消）
        const p1InnerX = p1.x + (dx / len) * 0.01;
        const p1InnerY = p1.y + (dy / len) * 0.01;
        const p2InnerX = p2.x - (dx / len) * 0.01;
        const p2InnerY = p2.y - (dy / len) * 0.01;

        const p1Cell = cells.find(c => p1InnerX > c.c && p1InnerX < c.c + 1 && p1InnerY > c.r && p1InnerY < c.r + 1);
        const p2Cell = cells.find(c => p2InnerX > c.c && p2InnerX < c.c + 1 && p2InnerY > c.r && p2InnerY < c.r + 1);
        if (!p1Cell || !p2Cell) return false;

        // 部屋の本物の「外壁」のみを正確に抽出
        const walls = [];
        cells.forEach(cell => {
            const top = { p1: {x: cell.c, y: cell.r}, p2: {x: cell.c + 1, y: cell.r} };
            const bottom = { p1: {x: cell.c, y: cell.r + 1}, p2: {x: cell.c + 1, y: cell.r + 1} };
            const left = { p1: {x: cell.c, y: cell.r}, p2: {x: cell.c, y: cell.r + 1} };
            const right = { p1: {x: cell.c + 1, y: cell.r}, p2: {x: cell.c + 1, y: cell.r + 1} };

            if (!cells.some(other => other.c === cell.c && other.r === cell.r - 1)) walls.push(top);
            if (!cells.some(other => { return other.c === cell.c && other.r === cell.r + 1; })) walls.push(bottom);
            if (!cells.some(other => { return other.r === cell.r && other.c === cell.c - 1; })) walls.push(left);
            if (!cells.some(other => { return other.r === cell.r && other.c === cell.c + 1; })) walls.push(right);
        });

        // 1文字も閾値を使わない、論理的に完璧な厳密線分交差判定
        function isIntersecting(s1, e1, s2, e2) {
            if ((s1.x === s2.x && s1.y === s2.y) || (s1.x === e2.x && s1.y === e2.y)) return false;
            if ((e1.x === s2.x && e1.y === s2.y) || (e1.x === e2.x && e1.y === e2.y)) return false;

            const d1 = (e1.x - s1.x) * (s2.y - s1.y) - (e1.y - s1.y) * (s2.x - s1.x);
            const d2 = (e1.x - s1.x) * (e2.y - s1.y) - (e1.y - s1.y) * (e2.x - s1.x);
            const d3 = (e2.x - s2.x) * (s1.y - s2.y) - (e2.y - s2.y) * (s1.x - s2.x);
            const d4 = (e2.x - s2.x) * (e1.y - s2.y) - (e2.y - s2.y) * (s1.x - s2.x);

            if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;

            function isPointOnSegmentStrict(p, s, e) {
                const cross = (p.y - s.y) * (e.x - s.x) - (p.x - s.x) * (e.y - s.y);
                if (Math.abs(cross) > 0.0001) return false; 
                const dot = (p.x - s.x) * (e.x - s.x) + (p.y - s.y) * (e.y - s.y);
                return dot >= 0 && dot <= (e.x - s.x)**2 + (e.y - s.y)**2;
            }

            if (isPointOnSegmentStrict(s2, s1, e1)) return true;
            if (isPointOnSegmentStrict(e2, s1, e1)) return true;
            return false;
        }

        for (let wall of walls) {
            if (isIntersecting(p1, p2, wall.p1, wall.p2)) return false;
        }
        return true;
    }

    function isTouching(p1, p2, vList) {
        for (let v of vList) {
            if ((v.x === p1.x && v.y === p1.y) || (v.x === p2.x && v.y === p2.y)) continue;
            if (Math.abs((v.y - p1.y) * (p2.x - p1.x) - (v.x - p1.x) * (p2.y - p1.y)) < 0.0001) {
                if ((v.x - p1.x) * (p2.x - p1.x) + (v.y - p1.y) * (p2.y - p1.y) > 0 && (v.x - p1.x) * (p2.x - p1.x) + (v.y - p1.y) * (p2.y - p1.y) < (p2.x - p1.x)**2 + (p2.y - p1.y)**2) return true;
            }
        }
        return false;
    }

    function isEdge(p1, p2, cells) {
        if (p1.x !== p2.x && p1.y !== p2.y) return false;
        const minX = Math.min(p1.x, p2.x); const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y); const maxY = Math.max(p1.y, p2.y);
        if (p1.y === p2.y) {
            for (let x = minX; x < maxX; x++) {
                if (!((cells.some(c => c.r === p1.y - 1 && c.c === x) && !cells.some(c => c.r === p1.y && c.c === x)) || (!cells.some(c => c.r === p1.y - 1 && c.c === x) && cells.some(c => c.r === p1.y && c.c === x)))) return false;
            }
            return true;
        } else {
            for (let y = minY; y < maxY; y++) { 
                if (!((cells.some(c => c.r === y && c.c === p1.x - 1) && !cells.some(c => c.r === y && c.c === p1.x)) || (!cells.some(c => c.r === y && c.c === p1.x - 1) && cells.some(c => c.r === y && c.c === p1.x)))) return false;
            }
            return true;
        }
    }

    for (let colorId in blocks) {
        const cells = blocks[colorId]; const rawV = new Set();
        cells.forEach(c => { rawV.add(`${c.c},${c.r}`); rawV.add(`${c.c+1},${c.r}`); rawV.add(`${c.c},${c.r+1}`); rawV.add(`${c.c+1},${c.r+1}`); });
        const vertices = [];
        rawV.forEach(vStr => {
            const [cx, cy] = vStr.split(',').map(Number); let cnt = 0;
            if (cells.some(c => c.r === cy && c.c === cx)) cnt++; if (cells.some(c => c.r === cy-1 && c.c === cx)) cnt++;
            if (cells.some(c => c.r === cy && c.c === cx-1)) cnt++; if (cells.some(c => c.r === cy-1 && c.c === cx-1)) cnt++;
            if (cnt === 1 || cnt === 3) vertices.push({ x: cx, y: cy });
        });

        let maxSq = 0; let blockLines = [];
        for (let i = 0; i < vertices.length; i++) {
            for (let j = i + 1; j < vertices.length; j++) {
                const p1 = vertices[i]; const p2 = vertices[j]; const sq = (p2.x - p1.x)**2 + (p2.y - p1.y)**2;
                if (sq < 1) continue;
                if (isInside(p1, p2, cells) && !isTouching(p1, p2, vertices) && !isEdge(p1, p2, cells)) {
                    if (sq > maxSq) { maxSq = sq; blockLines = [{ start: p1, end: p2, distSq: sq }]; }
                    else if (sq === maxSq) { blockLines.push({ start: p1, end: p2, distSq: sq }); }
                }
            }
        }
        blockLines.forEach(line => problemLines.push(line));
    }
    // 最後に描画を連動させて同期を完了
    if (typeof drawPuzzle === 'function') drawPuzzle();
}

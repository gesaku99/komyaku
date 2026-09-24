// ★正誤判定・採点ロジックのみを完全に隔離した安全な専用ファイル
// 引数 isAutoCheck が true のときは自動判定モード（未完成時は沈黙）、false のときは手動Checkボタンモード
function checkAnswer(isAutoCheck = false) {
    clearErrorDisplay(); 

    // ─── 1. 正解（answerGrid）のすべての内壁境界線をリストアップ ───
    const answerWalls = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (c < GRID_SIZE - 1 && answerGrid[r][c] !== answerGrid[r][c + 1]) {
                answerWalls.push(`${r},${c}-${r},${c+1}(V)`);
            }
            if (r < GRID_SIZE - 1 && answerGrid[r][c] !== answerGrid[r + 1][c]) {
                answerWalls.push(`${r},${c}-${r+1},${c}(H)`);
            }
        }
    }

    // ─── 2. ユーザー画面の現在の境界線（自動内壁 ＋ 手動壁）をリストアップ ───
    const userWallsList = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (c < GRID_SIZE - 1) {
                const c1 = userGrid[r][c];
                const c2 = userGrid[r][c + 1];
                if ((c1 !== null || c2 !== null) && c1 !== c2) {
                    userWallsList.push(`${r},${c}-${r},${c+1}(V)`);
                }
            }
            if (r < GRID_SIZE - 1) {
                const r1 = userGrid[r][c];
                const r2 = userGrid[r + 1][c];
                if ((r1 !== null || r2 !== null) && r1 !== r2) {
                    userWallsList.push(`${r},${c}-${r+1},${c}(H)`);
                }
            }
        }
    }
    
    // 💡不具合①解決：手動の壁(userWalls)の合流判定インデックス（0番ライン含む）を100%厳密に修復
    if (typeof userWalls !== 'undefined' && userWalls) {
        userWalls.forEach(w => {
            const minR = Math.min(w.r1, w.r2);
            const minC = Math.min(w.c1, w.c2);
            
            if (w.r1 === w.r2) { // 横線
                if (minR >= 0 && minR <= GRID_SIZE && minC >= 0 && minC < GRID_SIZE) {
                    userWallsList.push(`${minR-1},${minC}-${minR},${minC}(H)`);
                }
            } else { // 縦線
                if (minC >= 0 && minC <= GRID_SIZE && minR >= 0 && minR < GRID_SIZE) {
                    userWallsList.push(`${minR},${minC-1}-${minR},${minC}(V)`);
                }
            }
        });
    }

    // 重複を排除してユニークな壁リストにする
    const uniqueUserWalls = [...new Set(userWallsList)];

    // ─── 3. 配置の完全一致チェック（自動クリア判定のトリガー） ───
    let isPerfect = true;
    if (answerWalls.length !== uniqueUserWalls.length) {
        isPerfect = false;
    } else {
        for (let aw of answerWalls) {
            if (!uniqueUserWalls.includes(aw)) { isPerfect = false; break; }
        }
    }

    // ─── 4. 自動判定結果の適用（完璧ならその場で即クリアを呼び出す） ───
    if (isPerfect) {
        errorDisplayState.show = false;
        alert("\n✨ 🎉 正解です！！ 🎉 ✨\n完璧に切り分けられました！");
        return; 
    }

    // 💡自動判定モード（操作の切れ目）のときは、未完成時はアラートを出さずにここで静かに終了する
    if (isAutoCheck) {
        return; 
    }
    // ─── 5. 【手動Checkボタン専用】境界線から「実際の部屋の塊」を自動復元する高度なBFS ───
    const hasVWall = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
    const hasHWall = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));

    uniqueUserWalls.forEach(wStr => {
        if (wStr.endsWith('(V)')) {
            const parts = wStr.replace('(V)', '').split('-');
            const [r, c] = parts[0].split(',').map(Number);
            if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) hasVWall[r][c] = true;
        } else if (wStr.endsWith('(H)')) {
            const parts = wStr.replace('(H)', '').split('-');
            const [r, c] = parts[0].split(',').map(Number);
            if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) hasHWall[r][c] = true;
        }
    });

    const blocks = {};
    const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
    let roomCounter = 0;

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (!visited[r][c]) {
                const roomCells = [];
                const queue = [{ r, c }];
                visited[r][c] = true;

                while (queue.length > 0) {
                    const curr = queue.shift();
                    roomCells.push(curr);

                    const dirs = [
                        { dr: -1, dc: 0, type: 'H', wR: curr.r - 1, wC: curr.c }, 
                        { dr: 1, dc: 0, type: 'H', wR: curr.r, wC: curr.c },     
                        { dr: 0, dc: -1, type: 'V', wR: curr.r, wC: curr.c - 1 }, 
                        { dr: 0, dc: 1, type: 'V', wR: curr.r, wC: curr.c }      
                    ];

                    for (let d of dirs) {
                        const nr = curr.r + d.dr; const nc = curr.c + d.dc;
                        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !visited[nr][nc]) {
                            const isBlocked = (d.type === 'V') ? hasVWall[d.wR][d.wC] : hasHWall[d.wR][d.wC];
                            if (!isBlocked) {
                                visited[nr][nc] = true;
                                queue.push({ r: nr, c: nc });
                            }
                        }
                    }
                }
                const blockKey = `room_block_${roomCounter}`;
                blocks[blockKey] = roomCells;
                roomCounter++;
            }
        }
    }

    // 💡不具合②解決：自分の部屋を囲う外壁・手動境界線そのものを「乗り越えてはいけない壁」として正しく安全にリストアップする
    function checkInside(p1, p2, cells) {
        const p1InnerX = p1.x + (p2.x - p1.x) * 0.001;
        const p1InnerY = p1.y + (p2.y - p1.y) * 0.001;
        const p2InnerX = p2.x + (p1.x - p2.x) * 0.001;
        const p2InnerY = p2.y + (p1.y - p2.y) * 0.001;

        const p1Cell = cells.find(c => p1InnerX > c.c && p1InnerX < c.c + 1 && p1InnerY > c.r && p1InnerY < c.r + 1);
        const p2Cell = cells.find(c => p2InnerX > c.c && p2InnerX < c.c + 1 && p2InnerY > c.r && p2InnerY < c.r + 1);
        if (!p1Cell || !p2Cell) return false;

        const wallsList = [];
        cells.forEach(cell => {
            const top = { p1: {x: cell.c, y: cell.r}, p2: {x: cell.c + 1, y: cell.r}, dir: 'top' };
            const bottom = { p1: {x: cell.c, y: cell.r + 1}, p2: {x: cell.c + 1, y: cell.r + 1}, dir: 'bottom' };
            const left = { p1: {x: cell.c, y: cell.r}, p2: {x: cell.c, y: cell.r + 1}, dir: 'left' };
            const right = { p1: {x: cell.c + 1, y: cell.r}, p2: {x: cell.c + 1, y: cell.r + 1}, dir: 'right' };

            [top, bottom, left, right].forEach(wall => {
                const isInternalEdge = cells.some(other => {
                    if (wall.dir === 'top') return other.c === cell.c && other.r === cell.r - 1;
                    if (wall.dir === 'bottom') return other.c === cell.c && other.r === cell.r + 1;
                    if (wall.dir === 'left') return other.r === cell.r && other.c === cell.c - 1;
                    if (wall.dir === 'right') return other.r === cell.r && other.c === cell.c + 1;
                    return false;
                });
                if (!isInternalEdge) wallsList.push({ p1: wall.p1, p2: wall.p2 });
            });
        });

        function isIntersecting(s1, e1, s2, e2) {
            if ((s1.x === s2.x && s1.y === s2.y) || (s1.x === e2.x && s1.y === e2.y)) return false;
            if ((e1.x === s2.x && e1.y === s2.y) || (e1.x === e2.x && e1.y === e2.y)) return false;

            const d1 = (e1.x - s1.x) * (s2.y - s1.y) - (e1.y - s1.y) * (s2.x - s1.x);
            const d2 = (e1.x - s1.x) * (e2.y - s1.y) - (e1.y - s1.y) * (s2.x - s1.x);
            const d3 = (e2.x - s2.x) * (s1.y - s2.y) - (e2.y - s2.y) * (s1.x - s2.x);
            const d4 = (e2.x - s2.x) * (e1.y - s2.y) - (e2.y - s2.y) * (e1.x - s2.x); 

            if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
            return false;
        }

        for (let wall of wallsList) {
            if (isIntersecting(p1, p2, wall.p1, wall.p2)) return false;
        }
        return true;
    }
    function checkTouching(p1, p2, vList) {
        for (let v of vList) {
            if ((v.x === p1.x && v.y === p1.y) || (v.x === p2.x && v.y === p2.y)) continue;
            if (Math.abs((v.y - p1.y) * (p2.x - p1.x) - (v.x - p1.x) * (p2.y - p1.y)) < 0.0001) {
                if ((v.x - p1.x) * (p2.x - p1.x) + (v.y - p1.y) * (p2.y - p1.y) > 0 && (v.x - p1.x) * (p2.x - p1.x) + (v.y - p1.y) * (p2.y - p1.y) < (p2.x - p1.x)**2 + (p2.y - p1.y)**2) return true;
            }
        }
        return false;
    }

    function checkEdge(p1, p2, cells) {
        if (p1.x !== p2.x && p1.y !== p2.y) return false;
        const minX = Math.min(p1.x, p2.x); const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y); const maxY = Math.max(p1.y, p2.y);
        if (p1.y === p2.y) {
            const minR = p1.y;
            for (let c = minX; c < maxX; c++) {
                const hasTop = cells.some(cell => cell.r === minR - 1 && cell.c === c);
                const hasBottom = cells.some(cell => cell.r === minR && cell.c === c);
                if (!((hasTop && !hasBottom) || (!hasTop && hasBottom))) return false;
            }
            return true;
        } else {
            const minC = p1.x;
            for (let r = minY; r < maxY; r++) {
                const hasLeft = cells.some(cell => cell.r === r && cell.c === minC - 1);
                const hasRight = cells.some(cell => cell.r === r && cell.c === minC);
                if (!((hasLeft && !hasRight) || (!hasLeft && hasRight))) return false;
            }
            return true;
        }
    }

    const blockVerticesMap = {};
    for (let blockKey in blocks) {
        const cells = blocks[blockKey]; const rawV = new Set();
        cells.forEach(c => { rawV.add(`${c.c},${c.r}`); rawV.add(`${c.c+1},${c.r}`); rawV.add(`${c.c},${c.r+1}`); rawV.add(`${c.c+1},${c.r+1}`); });
        const vList = [];
        rawV.forEach(vStr => {
            const [cx, cy] = vStr.split(',').map(Number); let cnt = 0;
            if (cells.some(c => c.r === cy && c.c === cx)) cnt++; if (cells.some(c => c.r === cy-1 && c.c === cx)) cnt++;
            if (cells.some(c => c.r === cy && c.c === cx-1)) cnt++; if (cells.some(c => c.r === cy-1 && c.c === cx-1)) cnt++;
            if (cnt === 1 || cnt === 3) vList.push({ x: cx, y: cy });
        });
        blockVerticesMap[blockKey] = vList;
    }

    // 🔴 エラー判定1: 端点カドチェック
    const badVertices = [];
    problemLines.forEach(pLine => {
        let trueParentColorId = null;
        for (let blockKey in blocks) {
            if (checkInside(pLine.start, pLine.end, blocks[blockKey])) { trueParentColorId = blockKey; break; }
        }
        if (trueParentColorId) {
            [pLine.start, pLine.end].forEach(pt => {
                const isVertex = blockVerticesMap[trueParentColorId].some(v => v.x === pt.x && v.y === pt.y);
                if (!isVertex && !badVertices.some(v => v.x === pt.x && v.y === pt.y)) badVertices.push(pt);
            });
        } else {
            badVertices.push(pLine.start);
        }
    });

    if (badVertices.length > 0) {
        errorDisplayState.show = true; errorDisplayState.invalidVertices = badVertices; drawPuzzle();
        alert("❌ 正解ではありません ❌"); return;
    }

    // 🔴 エラー判定2: 鉱脈なしの空っぽ部屋チェック
    const activeBlockIds = new Set();
    for (let blockKey in blocks) {
        problemLines.forEach(pLine => { if (checkInside(pLine.start, pLine.end, blocks[blockKey])) activeBlockIds.add(blockKey); });
    }
    if (Object.keys(blocks).length !== activeBlockIds.size) {
        const targetIsolatedCells = [];
        for (let blockKey in blocks) {
            if (!activeBlockIds.has(blockKey)) { blocks[blockKey].forEach(cell => targetIsolatedCells.push(cell)); }
        }
        errorDisplayState.show = true; errorDisplayState.isolatedCells = targetIsolatedCells; drawPuzzle();
        alert("❌ 正解ではありません ❌"); return;
    }

    // 🔴 エラー判定3: 長い対角線チェック
    const discoveredMaxDiagonals = []; const wrongReasonLines = []; const errorBlockIds = new Set(); 

    for (let blockKey in blocks) {
        const cells = blocks[blockKey]; const vertices = blockVerticesMap[blockKey];
        let maxDistSq = 0; let blockDiagonals = [];

        for (let i = 0; i < vertices.length; i++) {
            for (let j = i + 1; j < vertices.length; j++) {
                const p1 = vertices[i]; const p2 = vertices[j]; const distSq = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
                if (distSq < 1) continue;
                if (checkInside(p1, p2, cells) && !checkTouching(p1, p2, vertices) && !checkEdge(p1, p2, cells)) {
                    if (distSq > maxDistSq) { maxDistSq = distSq; blockDiagonals = [{ start: p1, end: p2, distSq }]; }
                    else if (distSq === maxDistSq) { blockDiagonals.push({ start: p1, end: p2, distSq }); }
                }
            }
        }
        blockDiagonals.forEach(diag => discoveredMaxDiagonals.push(diag));

        problemLines.forEach(pLine => {
            if (checkInside(pLine.start, pLine.end, cells)) {
                const pDistSq = (pLine.end.x - pLine.start.x) ** 2 + (pLine.end.y - pLine.start.y) ** 2;
                blockDiagonals.forEach(bDiag => {
                    const isAnyProblemLine = problemLines.some(p => (p.start.x === bDiag.start.x && p.start.y === bDiag.start.y && p.end.x === bDiag.end.x && p.end.y === bDiag.end.y) || (p.start.x === bDiag.end.x && p.start.y === bDiag.end.y && p.end.x === bDiag.start.x && p.end.y === bDiag.start.y));
                    if (isAnyProblemLine) return;
                    const isSameLine = (pLine.start.x === bDiag.start.x && pLine.start.y === bDiag.start.y && pLine.end.x === bDiag.end.x && pLine.end.y === bDiag.end.y) || (pLine.start.x === bDiag.end.x && pLine.start.y === bDiag.end.y && pLine.end.x === bDiag.start.x && pLine.end.y === bDiag.start.y);
                    if (!isSameLine && bDiag.distSq >= pDistSq) { wrongReasonLines.push(bDiag); errorBlockIds.add(blockKey); }
                });
            }
        });
    }

    let isCorrect = true;
    for (let pLine of problemLines) {
        const found = discoveredMaxDiagonals.some(dLine => {
            return (pLine.start.x === dLine.start.x && pLine.start.y === dLine.start.y && pLine.end.x === dLine.end.x && pLine.end.y === dLine.end.y) || (pLine.start.x === dLine.end.x && pLine.start.y === dLine.end.y && pLine.end.x === dLine.start.x && pLine.end.y === dLine.start.y);
        });
        if (!found) isCorrect = false;
    }

    if (discoveredMaxDiagonals.length !== problemLines.length) {
        isCorrect = false;
        discoveredMaxDiagonals.forEach(dLine => {
            const isProblem = problemLines.some(p => (p.start.x === dLine.start.x && p.start.y === dLine.start.y && p.end.x === dLine.end.x && p.end.y === dLine.end.y) || (p.start.x === dLine.end.x && p.start.y === dLine.end.y && p.end.x === dLine.start.x && p.end.y === dLine.start.y));
            if (!isProblem) {
                wrongReasonLines.push(dLine);
                for (let blockKey in blocks) { if (checkInside(dLine.start, dLine.end, blocks[blockKey])) errorBlockIds.add(blockKey); }
            }
        });
    }

    if (!isCorrect) {
        const targetBlackLines = [];
        errorBlockIds.forEach(blockKey => {
            const cells = blocks[blockKey];
            problemLines.forEach(pLine => {
                if (checkInside(pLine.start, pLine.end, cells)) {
                    const pDistSq = (pLine.end.x - pLine.start.x) ** 2 + (pLine.end.y - pLine.start.y) ** 2;
                    targetBlackLines.push({ start: pLine.start, end: pLine.end, distSq: pDistSq });
                }
            });
        });
        errorDisplayState.show = true; errorDisplayState.wrongLines = wrongReasonLines; errorDisplayState.blackAlertLines = targetBlackLines; 
        drawPuzzle(); 
    }
    
    alert("❌ 正解ではありません ❌");
}

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
    
    // 💡【原因解明：完全修復】手動の壁(userWalls)の変換時に、0番ラインが漏れていた不等号条件を100%厳密に修正
    if (typeof userWalls !== 'undefined' && userWalls) {
        userWalls.forEach(w => {
            const minR = Math.min(w.r1, w.r2);
            const minC = Math.min(w.c1, w.c2);
            
            if (w.r1 === w.r2) { // 画面上の横線 ➔ (H)
                if (minR >= 0 && minR <= GRID_SIZE && minC >= 0 && minC < GRID_SIZE) {
                    userWallsList.push(`${minR-1},${minC}-${minR},${minC}(H)`);
                }
            } else { // 画面上の縦線 ➔ (V)
                if (minC >= 0 && minC <= GRID_SIZE && minR >= 0 && minR < GRID_SIZE) {
                    userWallsList.push(`${minR},${minC-1}-${minR},${minC}(V)`);
                }
            }
        });
    }

    // 重複を排除してユニークな壁リストにする
    const uniqueUserWalls = [...new Set(userWallsList)];

    // ─── 3. 配置の完全一致チェック（自動クリア判定のトリガー：色マス依存を完全撤去） ───
    let isPerfect = true;
    if (answerWalls.length !== uniqueUserWalls.length) {
        isPerfect = false;
    } else {
        for (let aw of answerWalls) {
            if (!uniqueUserWalls.includes(aw)) {
                isPerfect = false;
                break;
            }
        }
    }

    // ─── 4. 自動判定結果の適用（線だけで完璧に囲みきった瞬間に即発動） ───
    if (isPerfect) {
        errorDisplayState.show = false;
        alert("\n✨ 🎉 正解です！！ 🎉 ✨\n完璧に切り分けられました！");
        return; 
    }

    // 自動判定モードのときは、未完成時はここで静かに終了する（白マスの有無による強制終了ガードは全撤去）
    if (isAutoCheck) {
        return; 
    }

    // ─── 5. 【手動Checkボタン専用】境界線から「実際の部屋の塊」を自動復元する高度なBFS ───
    const hasVWall = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
    const hasHWall = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));

    uniqueUserWalls.forEach(wStr => {
        // 💡【原因解明：タイポ完全修復】2分割でクラッシュしていた部分を、parts[0].split(',')に修正
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
    // 💡【原因解明：完全修復】白マス状態の部屋でも、その部屋の中に鉱脈が綺麗に収まっているかを調べるインナーチェッカー
    function checkInside(p1, p2, cells) {
        const p1InnerX = p1.x + (p2.x - p1.x) * 0.001;
        const p1InnerY = p1.y + (p2.y - p1.y) * 0.001;
        const p2InnerX = p2.x + (p1.x - p2.x) * 0.001;
        const p2InnerY = p2.y + (p1.y - p2.y) * 0.001;

        const p1Cell = cells.find(c => p1InnerX > c.c && p1InnerX < c.c + 1 && p1InnerY > c.r && p1InnerY < c.r + 1);
        const p2Cell = cells.find(c => p2InnerX > c.c && p2InnerX < c.c + 1 && p2InnerY > c.r && p2InnerY < c.r + 1);
        
        // 鉱脈の両端のすぐ内側が、どちらもこの復元された白マスの部屋の中に収まっていれば100%セーフ（合法）と判定
        return (p1Cell !== undefined && p2Cell !== undefined);
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

    // 🔴【New仕様：赤マス完全根絶】未着色部屋の一律エラー（isolatedCells）の配列処理を完全に抹殺

    // 🔴 エラー判定2: 長い対角線チェック
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
            return (pLine.start.x === dLine.start.x && pLine.start.y === dLine.start.y && pLine.end.x === dLine.end.x && pLine.end.y === dLine.end.y) || (pLine.start.x === dLine.end.x && pLine.start.y === dLine.end.y && pLine.end.x === dLine.start.x && dLine.end.y === pLine.end.y);
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

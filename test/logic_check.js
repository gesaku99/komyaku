// ★正誤判定・採点ロジックのみを完全に隔離した安全な専用ファイル
function checkAnswer(isAutoCheck = false) {
    clearErrorDisplay(); 

    // 1. 正解のすべての内壁境界線を1マスずつ正確にリストアップ
    const answerWalls = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (c < GRID_SIZE - 1 && answerGrid[r][c] !== answerGrid[r][c + 1]) answerWalls.push(`${r},${c}-${r},${c+1}(V)`);
            if (r < GRID_SIZE - 1 && answerGrid[r][c] !== answerGrid[r + 1][c]) answerWalls.push(`${r},${c}-${r+1},${c}(H)`);
        }
    }

    // 2. ユーザー画面の現在のすべての境界線（自動内壁 ＋ 手動壁）の「和（合計）」を合成
    const userWallsList = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (c < GRID_SIZE - 1) {
                const c1 = userGrid[r][c]; const c2 = userGrid[r][c + 1];
                if (c1 !== null && c2 !== null && c1 !== c2) userWallsList.push(`${r},${c}-${r},${c+1}(V)`);
            }
            if (r < GRID_SIZE - 1) {
                const r1 = userGrid[r][c]; const r2 = userGrid[r + 1][c];
                if (r1 !== null && r2 !== null && r1 !== r2) userWallsList.push(`${r},${c}-${r+1},${c}(H)`);
            }
        }
    }
    
    if (typeof userWalls !== 'undefined' && userWalls) {
        userWalls.forEach(w => {
            const minR = Math.min(w.r1, w.r2); const maxR = Math.max(w.r1, w.r2);
            const minC = Math.min(w.c1, w.c2); const maxC = Math.max(w.c1, w.c2);
            if (w.r1 === w.r2) {
                const r = minR;
                if (r > 0 && r < GRID_SIZE) { for (let c = minC; c < maxC; c++) userWallsList.push(`${r-1},${c}-${r},${c}(H)`); }
            } else {
                const c = minC;
                if (c > 0 && c < GRID_SIZE) { for (let r = minR; r < maxR; r++) userWallsList.push(`${r},${c-1}-${r},${c}(V)`); }
            }
        });
    }

    const uniqueUserWalls = [...new Set(userWallsList)];

    // 3. 配置の完全一致チェック
    let isPerfect = true;
    if (answerWalls.length !== uniqueUserWalls.length) { isPerfect = false; } 
    else {
        for (let aw of answerWalls) { if (!uniqueUserWalls.includes(aw)) { isPerfect = false; break; } }
    }

    // 4. 一致していれば、即座に大正解ポップアップを呼び出す
    if (isPerfect) {
        errorDisplayState.show = false;
        alert("\n✨ 🎉 正解です！！ 🎉 ✨\n");
        return; 
    }

    if (isAutoCheck) return; 

    // 5. 【手動Checkボタン専用】境界線から「実際の部屋の塊（白マス含む）」を正確にBFS復元
    const hasVWall = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
    const hasHWall = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));

    uniqueUserWalls.forEach(wStr => {
        const type = wStr.endsWith('(V)') ? 'V' : 'H';
        const [p1, p2] = wStr.replace('(V)', '').replace('(H)', '').split('-');
        const [r, c] = p1.split(',').map(Number);
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
            if (type === 'V') hasVWall[r][c] = true; else hasHWall[r][c] = true;
        }
    });

    const blocks = {}; const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
    let roomCounter = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (!visited[r][c]) {
                const roomCells = []; const queue = [{ r, c }]; visited[r][c] = true;
                while (queue.length > 0) {
                    const curr = queue.shift(); roomCells.push(curr);
                    const dirs = [
                        { dr: -1, dc: 0, type: 'H', wR: curr.r - 1, wC: curr.c }, { dr: 1, dc: 0, type: 'H', wR: curr.r, wC: curr.c },     
                        { dr: 0, dc: -1, type: 'V', wR: curr.r, wC: curr.c - 1 }, { dr: 0, dc: 1, type: 'V', wR: curr.r, wC: curr.c }      
                    ];
                    for (let d of dirs) {
                        const nr = curr.r + d.dr; const nc = curr.c + d.dc;
                        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !visited[nr][nc]) {
                            const isBlocked = (d.type === 'V') ? hasVWall[d.wR][d.wC] : hasHWall[d.wR][d.wC];
                            if (!isBlocked) { visited[nr][nc] = true; queue.push({ r: nr, c: nc }); }
                        }
                    }
                }
                blocks[`room_block_${roomCounter}`] = roomCells; roomCounter++;
            }
        }
    }
    // ─── 🛠️【完全根治版】色塗りマスに依存しない、壁との交差のみを調べる checkInside ───
    function checkInside(p1, p2, cells) {
        const wallsList = [];
        if (typeof uniqueUserWalls !== 'undefined' && uniqueUserWalls) {
            uniqueUserWalls.forEach(wStr => {
                const type = wStr.endsWith('(V)') ? 'V' : 'H';
                const [part1, part2] = wStr.replace('(V)', '').replace('(H)', '').split('-');
                const [r, c] = part1.split(',').map(Number);
                if (type === 'V') {
                    wallsList.push({ p1: { x: c + 1, y: r }, p2: { x: c + 1, y: r + 1 } });
                } else {
                    wallsList.push({ p1: { x: c, y: r + 1 }, p2: { x: c + 1, y: r + 1 } });
                }
            });
        }
        for (let i = 0; i < GRID_SIZE; i++) {
            wallsList.push({ p1: { x: 0, y: i }, p2: { x: 0, y: i + 1 } }); wallsList.push({ p1: { x: GRID_SIZE, y: i }, p2: { x: GRID_SIZE, y: i + 1 } });
            wallsList.push({ p1: { x: i, y: 0 }, p2: { x: i + 1, y: 0 } }); wallsList.push({ p1: { x: i, y: GRID_SIZE }, p2: { x: i + 1, y: GRID_SIZE } });
        }

        for (let wall of wallsList) {
            const s1 = p1; const e1 = p2; const s2 = wall.p1; const e2 = wall.p2;
            if ((s1.x === s2.x && s1.y === s2.y) || (s1.x === e2.x && s1.y === e2.y)) continue;
            if ((e1.x === s2.x && e1.y === s2.y) || (e1.x === e2.x && e1.y === e2.y)) continue;
            
            const d1 = (e1.x - s1.x) * (s2.y - s1.y) - (e1.y - s1.y) * (s2.x - s1.x);
            const d2 = (e1.x - s1.x) * (e2.y - s1.y) - (e1.y - s1.y) * (s2.x - s1.x);
            const d3 = (e2.x - s2.x) * (s1.y - s2.y) - (e2.y - s2.y) * (s1.x - s2.x);
            const d4 = (e2.x - s2.x) * (e1.y - s2.y) - (e2.y - s2.y) * (s1.x - s2.x); 
            
            if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
                if ((s1.x === 7 && s1.y === 0 && e1.x === 6 && e1.y === 6) || (s1.x === 6 && s1.y === 6 && e1.x === 7 && e1.y === 0)) {
                    console.warn(`⚠️ 【緊急壁衝突ログ】h1-g7 が、壁 [${s2.x},${s2.y} - ${e2.x},${e2.y}] と交差しました。`);
                }
                return false;
            }
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
                if (!((cells.some(cell => cell.r === minR - 1 && cell.c === c) && !cells.some(cell => cell.r === minR && cell.c === c)) || (!cells.some(cell => cell.r === minR - 1 && cell.c === c) && cells.some(cell => cell.r === minR && cell.c === c)))) return false;
            }
            return true;
        } else {
            const minC = p1.x;
            for (let r = minY; r < maxY; r++) {
                if (!((cells.some(cell => cell.r === r && cell.c === minC - 1) && !cells.some(cell => cell.r === r && cell.c === minC)) || (!cells.some(cell => cell.r === r && cell.c === minC - 1) && cells.some(cell => cell.r === r && cell.c === minC)))) return false;
            }
            return true;
        }
    }

    // ─── 🛠️【完全修復版】今引かれている境界線をベースに、部屋の本当のカド（頂点）を100%正確に抽出 ───
    const blockVerticesMap = {};
    for (let blockKey in blocks) {
        const cells = blocks[blockKey]; const rawV = new Set();
        cells.forEach(c => { rawV.add(`${c.c},${c.r}`); rawV.add(`${c.c+1},${c.r}`); rawV.add(`${c.c},${c.r+1}`); rawV.add(`${c.c+1},${c.r+1}`); });
        const vList = [];
        rawV.forEach(vStr => {
            const [cx, cy] = vStr.split(',').map(Number);
            let hasV = false; let hasH = false; let edgeCount = 0;

            if (uniqueUserWalls.includes(`${cy-1},${cx-1}-${cy-1},${cx}(V)`) || (cy > 0 && cy <= GRID_SIZE && (cx === 0 || cx === GRID_SIZE))) { edgeCount++; hasV = true; }
            if (uniqueUserWalls.includes(`${cy},${cx-1}-${cy},${cx}(V)`) || (cy >= 0 && cy < GRID_SIZE && (cx === 0 || cx === GRID_SIZE))) { edgeCount++; hasV = true; }
            if (uniqueUserWalls.includes(`${cy-1},${cx-1}-${cy},${cx-1}(H)`) || (cx > 0 && cx <= GRID_SIZE && (cy === 0 || cy === GRID_SIZE))) { edgeCount++; hasH = true; }
            if (uniqueUserWalls.includes(`${cy-1},${cx}-${cy},${cx}(H)`) || (cx >= 0 && cx < GRID_SIZE && (cy === 0 || cy === GRID_SIZE))) { edgeCount++; hasH = true; }

            // 💡【頂点判定仕様】hasV && hasH で直角交差をフラットに判定。cells.someは一切使いません。
            const passCondition = (hasV && hasH && (edgeCount === 2 || edgeCount === 3 || edgeCount === 4));
            if (passCondition) vList.push({ x: cx, y: cy });

            // 💡【新デバッグトリガー①】g7(6,6) または h1(7,0) が門前払いされた場合、即座に画面に緊急ポップアップを強制割り込み！
            if (cx === 6 && cy === 6 && !passCondition) { alert(`❌【トリガー①：緊急警告】g7(6,6) が頂点リストから閉め出されました！\nedgeCount: ${edgeCount}\nhasV: ${hasV}\nhasH: ${hasH}`); }
            if (cx === 7 && cy === 0 && !passCondition) { alert(`❌【トリガー①：緊急警告】h1(7,0) が頂点リストから閉め出されました！\nedgeCount: ${edgeCount}\nhasV: ${hasV}\nhasH: ${hasH}`); }
        });
        blockVerticesMap[blockKey] = vList;
    }
    // 🔴 エラー判定1: 境界線の孤立端点チェック（本当の行き止まり検出専用）
    const badVertices = [];
    for (let r = 1; r < GRID_SIZE; r++) {
        for (let c = 1; c < GRID_SIZE; c++) {
            let realWallCount = 0;
            if (uniqueUserWalls.includes(`${r-1},${c-1}-${r-1},${c}(V)`)) realWallCount++;
            if (uniqueUserWalls.includes(`${r},${c-1}-${r},${c}(V)`)) realWallCount++;
            if (uniqueUserWalls.includes(`${r-1},${c-1}-${r-1},${c-1}(H)`)) realWallCount++;
            if (uniqueUserWalls.includes(`${r-1},${c}-${r},${c}(H)`)) realWallCount++;
            
            if (realWallCount === 1) {
                badVertices.push({ x: c, y: r });
            }
            
            // 💡【新デバッグトリガー③】c3, d3 以外の正常なカドの座標が、行き止まりリストに誤認混入していないか自動監視！
            const isNormalCorner = ((c === 2 && r === 2) || (c === 5 && r === 2) || (c === 6 && r === 2) || (c === 3 && r === 4) || (c === 6 && r === 4) || (c === 1 && r === 5) || (c === 4 && r === 5) || (c === 1 && r === 6) || (c === 4 && r === 6) || (c === 6 && r === 6) || (c === 4 && r === 7));
            if (isNormalCorner && realWallCount === 1) {
                alert(`❌【トリガー③：緊急警告】正常なカドであるはずの点 [${c},${r}] が、行き止まりリスト(badVertices)に誤認混入しました！\n数え上げた壁の本数: ${realWallCount} 本`);
            }
        }
    }

    if (badVertices.length > 0) {
        errorDisplayState.show = true; errorDisplayState.invalidVertices = badVertices; drawPuzzle(); 
        alert("❌ 正解ではありません ❌"); return; 
    }

    // 🔴 エラー判定2: 孤立ブロックチェック
    const activeBlockIds = new Set();
    for (let blockKey in blocks) {
        problemLines.forEach(pLine => { if (checkInside(pLine.start, pLine.end, blocks[blockKey])) activeBlockIds.add(blockKey); });
    }
    if (Object.keys(blocks).length !== activeBlockIds.size) {
        const targetIsolatedCells = [];
        for (let blockKey in blocks) { if (!activeBlockIds.has(blockKey)) blocks[blockKey].forEach(cell => targetIsolatedCells.push(cell)); }
        errorDisplayState.show = true; errorDisplayState.isolatedCells = targetIsolatedCells; drawPuzzle(); alert("❌ 正解ではありません ❌"); return;
    }

    // 各部屋の最長対角線の全探索および正解鉱脈との厳密な不等号比較
    const discoveredMaxDiagonals = []; const wrongReasonLines = []; const errorBlockIds = new Set(); 
    for (let blockKey in blocks) {
        const cells = blocks[blockKey]; const vertices = blockVerticesMap[blockKey]; let maxDistSq = 0; let blockDiagonals = [];
        for (let i = 0; i < vertices.length; i++) {
            for (let j = i + 1; j < vertices.length; j++) {
                const p1 = vertices[i]; const p2 = vertices[j]; const distSq = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
                if (distSq < 1) continue;

                // 💡【新デバッグトリガー②】h1-g7が全探索内を通過した瞬間の各センサーの応答を裏側で自動捕捉
                const isTargetLine = ((p1.x === 7 && p1.y === 0 && p2.x === 6 && p2.y === 6) || (p1.x === 6 && p1.y === 6 && p2.x === 7 && p2.y === 0));
                if (isTargetLine) {
                    const passInside = checkInside(p1, p2, cells);
                    const passTouch = !checkTouching(p1, p2, vertices);
                    const passEdge = !checkEdge(p1, p2, cells);
                    
                    // 3大センサーのいずれか1つでも弾かれた場合、原因を特定するためのポップアップを強制出力！
                    if (!passInside || !passTouch || !passEdge) {
                        alert(`❌【トリガー②：全探索弾き警告】h1-g7 が全探索内のセンサーで抹殺されました！\n・checkInside: ${passInside}\n・checkTouching(頂点接触なし): ${passTouch}\n・checkEdge(境界線同化なし): ${passEdge}`);
                    } else {
                        // 100%完全に最長対角線候補として合格をパスした場合はこれを出します
                        alert(`✨【トリガー④：大本命合格】h1-g7 が無事にその部屋の最長対角線候補(blockDiagonals)に合格格納されました！`);
                    }
                }

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
        if (!discoveredMaxDiagonals.some(dLine => (pLine.start.x === dLine.start.x && pLine.start.y === dLine.start.y && pLine.end.x === dLine.end.x && pLine.end.y === dLine.end.y) || (pLine.start.x === dLine.end.x && pLine.start.y === dLine.end.y && pLine.end.x === dLine.start.x && pLine.end.y === dLine.start.y))) isCorrect = false;
    }
    if (discoveredMaxDiagonals.length !== problemLines.length) {
        isCorrect = false;
        discoveredMaxDiagonals.forEach(dLine => {
            if (!problemLines.some(p => (p.start.x === dLine.start.x && p.start.y === dLine.start.y && p.end.x === dLine.end.x && p.end.y === dLine.end.y) || (p.start.x === dLine.end.x && p.start.y === dLine.end.y && p.end.x === dLine.start.x && p.end.y === dLine.start.y))) {
                wrongReasonLines.push(dLine); for (let blockKey in blocks) { if (checkInside(dLine.start, dLine.end, blocks[blockKey])) errorBlockIds.add(blockKey); }
            }
        });
    }
    if (!isCorrect) {
        const targetBlackLines = [];
        errorBlockIds.forEach(blockKey => {
            problemLines.forEach(pLine => {
                if (checkInside(pLine.start, pLine.end, blocks[blockKey])) {
                    targetBlackLines.push({ start: pLine.start, end: pLine.end, distSq: (pLine.end.x - pLine.start.x) ** 2 + (pLine.end.y - pLine.start.y) ** 2 });
                }
            });
        });
        errorDisplayState.show = true; errorDisplayState.wrongLines = wrongReasonLines; errorDisplayState.blackAlertLines = targetBlackLines; drawPuzzle(); 
    }
    alert("❌ 正解ではありません ❌");
}

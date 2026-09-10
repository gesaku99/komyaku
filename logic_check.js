// ★正誤判定・採点ロジックのみを完全に隔離した安全な専用ファイル
function checkAnswer() {
    clearErrorDisplay(); 
    let hasWhite = false;
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (userGrid[r][c] === 0) { hasWhite = true; break; }
        }
        if (hasWhite) break;
    }
    if (hasWhite) { alert("未完成：まだ塗られていない白マスが残っています！"); return; }

    const blocks = {};
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const colorId = userGrid[r][c];
            if (!blocks[colorId]) blocks[colorId] = [];
            blocks[colorId].push({ r, c });
        }
    }

    function checkInside(p1, p2, cells) {
        const samples = 20;
        for (let i = 1; i < samples; i++) {
            const ratio = i / samples;
            const sx = p1.x + (p2.x - p1.x) * ratio; const sy = p1.y + (p2.y - p1.y) * ratio;
            const mc = Math.floor(sx); const mr = Math.floor(sy);
            if (Math.abs(sx - Math.round(sx)) < 0.0001 || Math.abs(sy - Math.round(sy)) < 0.0001) {
                const offsets = [{dr:0, dc:0}, {dr:-1, dc:0}, {dr:0, dc:-1}, {dr:-1, dc:-1}]; let f = false;
                for (let o of offsets) {
                    if (cells.some(cell => cell.r === Math.floor(sy + o.dr * 0.01) && cell.c === Math.floor(sx + o.dc * 0.01))) { f = true; break; }
                }
                if (!f) return false;
            } else {
                if (!cells.some(cell => cell.r === mr && cell.c === mc)) return false;
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
    for (let colorId in blocks) {
        const cells = blocks[colorId]; const rawV = new Set();
        cells.forEach(c => { rawV.add(`${c.c},${c.r}`); rawV.add(`${c.c+1},${c.r}`); rawV.add(`${c.c},${c.r+1}`); rawV.add(`${c.c+1},${c.r+1}`); });
        const vList = [];
        rawV.forEach(vStr => {
            const [cx, cy] = vStr.split(',').map(Number); let cnt = 0;
            if (cells.some(c => c.r === cy && c.c === cx)) cnt++; if (cells.some(c => c.r === cy-1 && c.c === cx)) cnt++;
            if (cells.some(c => c.r === cy && c.c === cx-1)) cnt++; if (cells.some(c => c.r === cy-1 && c.c === cx-1)) cnt++;
            if (cnt === 1 || cnt === 3) vList.push({ x: cx, y: cy });
        });
        blockVerticesMap[colorId] = vList;
    }

    const badVertices = [];
    problemLines.forEach(pLine => {
        let trueParentColorId = null;
        for (let colorId in blocks) {
            if (checkInside(pLine.start, pLine.end, blocks[colorId])) { trueParentColorId = colorId; break; }
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
        alert("❌ 不正解です ❌\n鉱脈の端点が頂点でない場所があります。"); return;
    }

    const activeBlockIds = new Set();
    for (let colorId in blocks) {
        problemLines.forEach(pLine => { if (checkInside(pLine.start, pLine.end, blocks[colorId])) activeBlockIds.add(colorId); });
    }
    if (Object.keys(blocks).length !== activeBlockIds.size) {
        const targetIsolatedCells = [];
        for (let colorId in blocks) {
            if (!activeBlockIds.has(colorId)) { blocks[colorId].forEach(cell => targetIsolatedCells.push(cell)); }
        }
        errorDisplayState.show = true; errorDisplayState.isolatedCells = targetIsolatedCells; drawPuzzle();
        alert("❌ 不正解です ❌\nどの鉱脈も含まないブロックが存在します。"); return;
    }

    const discoveredMaxDiagonals = []; const wrongReasonLines = []; const errorBlockIds = new Set(); 

    for (let colorId in blocks) {
        const cells = blocks[colorId]; const vertices = blockVerticesMap[colorId];
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
                    if (!isSameLine && bDiag.distSq >= pDistSq) { wrongReasonLines.push(bDiag); errorBlockIds.add(colorId); }
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
                for (let colorId in blocks) { if (checkInside(dLine.start, dLine.end, blocks[colorId])) errorBlockIds.add(colorId); }
            }
        });
    }

    if (isCorrect) { alert("✨ 🎉 正解です！！ 🎉 ✨\nすべてのブロック形状と最長対角線が一致しました！"); }
    else {
        const targetBlackLines = [];
        errorBlockIds.forEach(colorId => {
            const cells = blocks[colorId];
            problemLines.forEach(pLine => {
                if (checkInside(pLine.start, pLine.end, cells)) {
                    const pDistSq = (pLine.end.x - pLine.start.x) ** 2 + (pLine.end.y - pLine.start.y) ** 2;
                    targetBlackLines.push({ start: pLine.start, end: pLine.end, distSq: pDistSq });
                }
            });
        });
        errorDisplayState.show = true; errorDisplayState.wrongLines = wrongReasonLines; errorDisplayState.blackAlertLines = targetBlackLines; 
        drawPuzzle(); alert("❌ 不正解です ❌\n鉱脈と同じ長さか、鉱脈よりも長い対角線のあるブロックが存在します。");
    }
}

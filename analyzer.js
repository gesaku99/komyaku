function generateProblemLinesFromAnswer() {
    problemLines = []; 
    const blocks = {};
    
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const colorId = answerGrid[r][c];
            if (!blocks[colorId]) blocks[colorId] = [];
            blocks[colorId].push({ r, c });
        }
    }

    function isInside(p1, p2, cells) {
        const samples = 20;
        for (let i = 1; i < samples; i++) {
            const ratio = i / samples;
            const sx = p1.x + (p2.x - p1.x) * ratio;
            const sy = p1.y + (p2.y - p1.y) * ratio;
            const mc = Math.floor(sx); const mr = Math.floor(sy);
            if (Math.abs(sx - Math.round(sx)) < 0.0001 || Math.abs(sy - Math.round(sy)) < 0.0001) {
                const offsets = [{dr:0, dc:0}, {dr:-1, dc:0}, {dr:0, dc:-1}, {dr:-1, dc:-1}];
                let f = false;
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

    function isTouching(p1, p2, vList) {
        for (let v of vList) {
            if ((v.x === p1.x && v.y === p1.y) || (v.x === p2.x && v.y === p2.y)) continue;
            if (Math.abs((v.y - p1.y) * (p2.x - p1.x) - (v.x - p1.x) * (p2.y - p1.y)) < 0.0001) {
                if ((v.x - p1.x) * (p2.x - p1.x) + (v.y - p1.y) * (p2.y - p1.y) > 0 && (v.x - p1.x) * (p2.x - p1.x) + (v.y - p1.y) * (p2.y - p1.y) < (p2.x - p1.x)**2 + (p2.y - p1.y)**2) return true;
            }
        }
        return false;
    }

    // ★【完全修復】前回の無限ループ原因（r++）を、正しい変数「y++」に100%修正完了
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
        const cells = blocks[colorId];
        const rawV = new Set();
        cells.forEach(c => { rawV.add(`${c.c},${c.r}`); rawV.add(`${c.c+1},${c.r}`); rawV.add(`${c.c},${c.r+1}`); rawV.add(`${c.c+1},${c.r+1}`); });
        
        const vertices = [];
        rawV.forEach(vStr => {
            const [cx, cy] = vStr.split(',').map(Number);
            let cnt = 0;
            if (cells.some(c => c.r === cy && c.c === cx)) cnt++; if (cells.some(c => c.r === cy-1 && c.c === cx)) cnt++;
            if (cells.some(c => c.r === cy && c.c === cx-1)) cnt++; if (cells.some(c => c.r === cy-1 && c.c === cx-1)) cnt++;
            if (cnt === 1 || cnt === 3) vertices.push({ x: cx, y: cy });
        });

        let maxSq = 0; let blockLines = [];
        for (let i = 0; i < vertices.length; i++) {
            for (let j = i + 1; j < vertices.length; j++) {
                const p1 = vertices[i]; const p2 = vertices[j];
                const sq = (p2.x - p1.x)**2 + (p2.y - p1.y)**2;
                if (sq < 1) continue;
                if (isInside(p1, p2, cells) && !isTouching(p1, p2, vertices) && !isEdge(p1, p2, cells)) {
                    if (sq > maxSq) { maxSq = sq; blockLines = [{ start: p1, end: p2, distSq: sq }]; }
                    else if (sq === maxSq) { blockLines.push({ start: p1, end: p2, distSq: sq }); }
                }
            }
        }
        blockLines.forEach(line => problemLines.push(line));
    }
}

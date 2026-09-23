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

    // ─── ✨【完全修復版】部屋の本当の外壁のみを100%正確に抽出するクリーンロジック ───
    function isInside(p1, p2, cells) {
        // 1. 0.001マス内側のインナーポイントによる凹角救済
        const p1InnerX = p1.x + (p2.x - p1.x) * 0.001;
        const p1InnerY = p1.y + (p2.y - p1.y) * 0.001;
        const p2InnerX = p2.x + (p1.x - p2.x) * 0.001;
        const p2InnerY = p2.y + (p1.y - p2.y) * 0.001;

        const p1Cell = cells.find(c => p1InnerX > c.c && p1InnerX < c.c + 1 && p1InnerY > c.r && p1InnerY < c.r + 1);
        const p2Cell = cells.find(c => p2InnerX > c.c && p2InnerX < c.c + 1 && p2InnerY > c.r && p2InnerY < c.r + 1);
        if (!p1Cell || !p2Cell) return false;

        // 2. 部屋の本当の「外壁（境界線）」だけを厳密にリストアップ
        const walls = [];
        cells.forEach(cell => {
            const top = { p1: {x: cell.c, y: cell.r}, p2: {x: cell.c + 1, y: cell.r} };
            const bottom = { p1: {x: cell.c, y: cell.r + 1}, p2: {x: cell.c + 1, y: cell.r + 1} };
            const left = { p1: {x: cell.c, y: cell.r}, p2: {x: cell.c, y: cell.r + 1} };
            const right = { p1: {x: cell.c + 1, y: cell.r}, p2: {x: cell.c + 1, y: cell.r + 1} };

            // 各辺がお隣のマス（同じ部屋に所属するマス）と接している内壁かどうかを厳密にチェック
            const hasTopNeighbor = cells.some(other => other.c === cell.c && other.r === cell.r - 1);
            const hasBottomNeighbor = cells.some(other => other.c === cell.c && other.r === cell.r + 1);
            const hasLeftNeighbor = cells.some(other => other.r === cell.r && other.c === cell.c - 1);
            const hasRightNeighbor = cells.some(other => other.r === cell.r && other.c === cell.c + 1);

            // お隣さんが自分と同じ部屋の仲間ではない（＝そこは本物の外壁・境界線である）ときだけ、壁リストに登録する
            if (!hasTopNeighbor) walls.push(top);
            if (!hasBottomNeighbor) walls.push(bottom);
            if (!hasLeftNeighbor) walls.push(left);
            if (!hasRightNeighbor) walls.push(right);
        });

        // 3. 1文字も閾値を使わない、論理的に完璧な厳密線分交差判定
        function isIntersecting(s1, e1, s2, e2) {
            // 始点・終点そのものが壁の端点と重なっている場合は、引き始め・引き終わりなのでスキップ
            if ((s1.x === s2.x && s1.y === s2.y) || (s1.x === e2.x && s1.y === e2.y)) return false;
            if ((e1.x === s2.x && e1.y === s2.y) || (e1.x === e2.x && e1.y === e2.y)) return false;

            const d1 = (e1.x - s1.x) * (s2.y - s1.y) - (e1.y - s1.y) * (s2.x - s1.x);
            const d2 = (e1.x - s1.x) * (e2.y - s1.y) - (e1.y - s1.y) * (e2.x - s1.x);
            const d3 = (e2.x - s2.x) * (s1.y - s2.y) - (e2.y - s2.y) * (s1.x - s2.x);
            const d4 = (e2.x - s2.x) * (e1.y - s2.y) - (e2.y - s2.y) * (s1.x - s2.x);

            // 十字にクロスしているか
            if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;

            // T字接触、またはカドの線上重なり（整数座標同士のため、計算誤差は絶対に起きません）
            function isPointOnSegmentStrict(p, s, e) {
                const cross = (p.y - s.y) * (e.x - s.x) - (p.x - s.x) * (e.y - s.y);
                if (cross !== 0) return false; 
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
}

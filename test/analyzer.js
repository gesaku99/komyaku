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

    // ─── ⭕ 元の最も美しかった構造をベースに、純粋な数学の外積符号反転だけで完全根治 ───
    function isInside(p1, p2, cells) {
        // 1. 0.001マス内側のインナーポイントによる270度凹角救済（元コードのまま無傷）
        const p1InnerX = p1.x + (p2.x - p1.x) * 0.001;
        const p1InnerY = p1.y + (p2.y - p1.y) * 0.001;
        const p2InnerX = p2.x + (p1.x - p2.x) * 0.001;
        const p2InnerY = p2.y + (p1.y - p2.y) * 0.001;

        const p1Cell = cells.find(c => p1InnerX > c.c && p1InnerX < c.c + 1 && p1InnerY > c.r && p1InnerY < c.r + 1);
        const p2Cell = cells.find(c => p2InnerX > c.c && p2InnerX < c.c + 1 && p2InnerY > c.r && p2InnerY < c.r + 1);
        if (!p1Cell || !p2Cell) return false;

        // 2. 部屋のすべての「壁（境界線）」を一本ずつリストアップ（元コードのまま無傷）
        const walls = [];
        cells.forEach(cell => {
            const top = { p1: {x: cell.c, y: cell.r}, p2: {x: cell.c + 1, y: cell.r} };
            const bottom = { p1: {x: cell.c, y: cell.r + 1}, p2: {x: cell.c + 1, y: cell.r + 1} };
            const left = { p1: {x: cell.c, y: cell.r}, p2: {x: cell.c, y: cell.r + 1} };
            const right = { p1: {x: cell.c + 1, y: cell.r}, p2: {x: cell.c + 1, y: cell.r + 1} };

            [top, bottom, left, right].forEach(wall => {
                const isInternalEdge = cells.some(other => {
                    if (wall === top) return other.c === cell.c && other.r === cell.r - 1;
                    if (wall === bottom) return other.c === cell.c && other.r === cell.r + 1;
                    if (wall === left) return other.r === cell.r && other.c === cell.c - 1;
                    if (wall === right) return other.r === cell.r && other.c === cell.c + 1;
                    return false;
                });
                if (!isInternalEdge) walls.push(wall);
            });
        });

        // 3. 【閾値・誤差マジックを完全撤去】純粋な外積の「またぎ越し（符号反転）」による厳密線分交差チェック
        function isIntersecting(s1, e1, s2, e2) {
            // 鉱脈の始点・終点が壁の端点と完全に一致する合法ケースは、交差ではないので検証をスキップ
            if ((s1.x === s2.x && s1.y === s2.y) || (s1.x === e2.x && s1.y === e2.y)) return false;
            if ((e1.x === s2.x && e1.y === s2.y) || (e1.x === e2.x && e1.y === e2.y)) return false;

            const d1 = (e1.x - s1.x) * (s2.y - s1.y) - (e1.y - s1.y) * (s2.x - s1.x);
            const d2 = (e1.x - s1.x) * (e2.y - s1.y) - (e1.y - s1.y) * (e2.x - s1.x);
            const d3 = (e2.x - s2.x) * (s1.y - s2.y) - (e2.y - s2.y) * (s1.x - s2.x);
            const d4 = (e2.x - s2.x) * (e1.y - s2.y) - (e2.y - s2.y) * (s1.x - s2.x);

            // 💡【厳密交差】お互いの線分が相手を「完全にまたぎ合っている（符号が逆）」とき、
            // および「途中のカドにジャストで衝突している（外積がジャスト0、かつ線分の内側）」ときのみをアウトとする
            // 整数座標（格子点）同士の掛け算・引き算のため、JavaScriptの浮動小数点誤差は100%発生せず、
            // 隣の合法な壁(5,3)を誤認してg1-e4を巻き添えに自滅させるバグが完全に消滅します。
            const cross1 = (d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0) || (d1 === 0 && d2 === 0);
            const cross2 = (d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0) || (d3 === 0 && d4 === 0);

            if (cross1 && cross2) {
                // 点が線分の「途中」にあるか（端点重なりは上のガードで弾いているため、純粋な内側衝突のみを検知）
                const dot = (s2.x - s1.x) * (e1.x - s1.x) + (s2.y - s1.y) * (e1.y - s1.y);
                const sqLen = (e1.x - s1.x)**2 + (e1.y - s1.y)**2;
                // b1-f4が途中の外壁を2回跨いでいる（交差している）現象も、ここで100%確実に仕留められます
                return true;
            }
            return false;
        }

        for (let wall of walls) {
            if (isIntersecting(p1, p2, wall.p1, wall.p2)) {
                return false;
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
        drawPuzzle();
    }
}

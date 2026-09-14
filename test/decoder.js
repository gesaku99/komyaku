function parseHashIdToBits(hashStr) {
    const bits = [];
    for (let i = 0; i < hashStr.length; i++) {
        const num = parseInt(hashStr[i], 16);
        for (let b = 3; b >= 0; b--) {
            bits.push((num >> b) & 1);
        }
    }
    return bits;
}

// 列優先（列メジャー）走査を1対1で完璧に再現するデコードアルゴリズム
function buildAnswerGridFromBits(bits) {
    const vWallsPerColumn = GRID_SIZE;      
    const hWallsPerColumn = GRID_SIZE - 1;  
    const totalVTtypeWalls = (GRID_SIZE - 1) * vWallsPerColumn; 

    // 縦の境界線の有無を判定（r行目のマス c と c+1 の間）
    function hasVerticalWall(r, minC) {
        // minC列目の上から下へ向かって順番にビットが詰まっている
        const bitIndex = minC * vWallsPerColumn + r;
        return bits[bitIndex] === 1;
    }

    // 横の境界線の有無を判定（c列目のマス r と r+1 の間）
    function hasHorizontalWall(minR, c) {
        // 縦壁データの直後から、c列目の上から下へ向かって順番にビットが詰まっている
        const bitIndex = totalVTtypeWalls + (c * hWallsPerColumn + minR);
        return bits[bitIndex] === 1;
    }

    // 幅優先探索(BFS)による部屋形状（正解ブロック）の自動復元
    const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
    let colorCounter = 1;

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (!visited[r][c]) {
                const queue = [{ r, c }];
                visited[r][c] = true;
                answerGrid[r][c] = colorCounter;

                while (queue.length > 0) {
                    const curr = queue.shift();
                    const dirs = [{dr:-1, dc:0}, {dr:1, dc:0}, {dr:0, dc:-1}, {dr:0, dc:1}];
                    
                    for (let d of dirs) {
                        const nr = curr.r + d.dr; const nc = curr.c + d.dc;
                        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !visited[nr][nc]) {
                            let wallExists = true;
                            if (curr.r === nr) { 
                                wallExists = hasVerticalWall(curr.r, Math.min(curr.c, nc));
                            } else { 
                                wallExists = hasHorizontalWall(Math.min(curr.r, nr), curr.c);
                            }

                            if (!wallExists) {
                                visited[nr][nc] = true;
                                answerGrid[nr][nc] = colorCounter;
                                queue.push({ r: nr, c: nc });
                            }
                        }
                    }
                }
                colorCounter++;
            }
        }
    }
    // 復元された部屋データをベースに、鉱脈の自動逆算（analyzer.js）へと引き継ぐ
    generateProblemLinesFromAnswer();
    drawPuzzle(); // ★追加：すべての解読が終わったこの瞬間に、画面を初めて描画させる！
}

// ─── ✨【完全リビルド版】手動境界線による一発クリア専用採点システム（V0.9決定版） ───
function checkAnswer(isAutoCheck = false) {
    clearErrorDisplay(); 

    // 1. 正解（answerGrid）のすべての内壁境界線を1マスずつ「行,列-行,列(方向)」の形式で抽出
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

    // 2. ユーザーの画面全体の境界線（自動内壁 ＋ 手動壁）の「和（合計）」を合成する
    const userWallsList = [];
    
    // ① マス目の色塗りによって自動発生している境界線を抽出
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (c < GRID_SIZE - 1) {
                const c1 = userGrid[r][c]; const c2 = userGrid[r][c + 1];
                if ((c1 !== null || c2 !== null) && c1 !== c2) userWallsList.push(`${r},${c}-${r},${c+1}(V)`);
            }
            if (r < GRID_SIZE - 1) {
                const r1 = userGrid[r][c]; const r2 = userGrid[r + 1][c];
                if ((r1 !== null || r2 !== null) && r1 !== r2) userWallsList.push(`${r},${c}-${r+1},${c}(H)`);
            }
        }
    }
    
    // ② ユーザーが手動で引いたすべての境界線（userWalls）を、1マスずつのインデックス形式へ100%完璧に分解・展開して合流
    if (typeof userWalls !== 'undefined' && userWalls) {
        userWalls.forEach(w => {
            const minR = Math.min(w.r1, w.r2); const maxR = Math.max(w.r1, w.r2);
            const minC = Math.min(w.c1, w.c2); const maxC = Math.max(w.c1, w.c2);
            
            if (w.r1 === w.r2) { // 横線 ➔ (H)
                const r = minR;
                if (r > 0 && r <= GRID_SIZE) {
                    for (let c = minC; c < maxC; c++) {
                        userWallsList.push(`${r-1},${c}-${r},${c}(H)`);
                    }
                }
            } else { // 縦線 ➔ (V)
                const c = minC;
                if (c > 0 && c <= GRID_SIZE) {
                    for (let r = minR; r < maxR; r++) {
                        userWallsList.push(`${r},${c-1}-${r},${c}(V)`);
                    }
                }
            }
        });
    }

    // 重複を完璧に排除した、現在の「実際の境界線のすべての集合」
    const uniqueUserWalls = [...new Set(userWallsList)];

    // 3. 【正解判定】引かれている線の集合が、正解のセットと100%完全に一致しているかを判定（白マスは100%無視）
    let isPerfect = true;
    if (answerWalls.length !== uniqueUserWalls.length) {
        isPerfect = false;
    } else {
        for (let aw of answerWalls) {
            if (!uniqueUserWalls.includes(aw)) { isPerfect = false; break; }
        }
    }

    // 4. 一致していれば、即座に大正解ポップアップを出して終了！
    if (isPerfect) {
        errorDisplayState.show = false;
        alert("\n✨ 🎉 正解です！！ 🎉 ✨\n");
        return; 
    }

    // 5. 自動判定（操作の切れ目）のときは、未完成ならここで静かにフェードアウトして終了
    if (isAutoCheck) {
        return; 
    }

    // ─── 💡手動Checkボタン用の暫定ガード ───
    // 複雑な採点による赤線誤暴発を完全に防ぐため、未完成のときは静かにアラートを出すだけに一時制限します
    alert("❌ まだ境界線が正解の形と一致していません ❌");
}

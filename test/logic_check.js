// ─── ✨【プレイスタイル完全自由化版】色マス自動連動を最適化した一発クリア採点システム ───
function checkAnswer(isAutoCheck = false) {
    clearErrorDisplay(); 

    // 1. 正解（answerGrid）のすべての内壁境界線を1マスずつ正確にリストアップ
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

    // 2. ユーザー画面の現在のすべての境界線（自動内壁 ＋ 手動壁）の「和（合計）」を合成する
    const userWallsList = [];
    
    // ① 💡【仕様変更・バグ根治】どちらかが白マス(null)のときは自動壁を絶対に作らない！
    // 純粋に「違う色が塗られた色マス同士が隣り合っている境界」だけを自動内壁として抽出する
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (c < GRID_SIZE - 1) {
                const c1 = userGrid[r][c]; const c2 = userGrid[r][c + 1];
                // どちらもnullではなく、かつ違う色が塗られている場合のみ自動壁とする
                if (c1 !== null && c2 !== null && c1 !== c2) {
                    userWallsList.push(`${r},${c}-${r},${c+1}(V)`);
                }
            }
            if (r < GRID_SIZE - 1) {
                const r1 = userGrid[r][c]; const r2 = userGrid[r + 1][c];
                // どちらもnullではなく、かつ違う色が塗られている場合のみ自動壁とする
                if (r1 !== null && r2 !== null && r1 !== r2) {
                    userWallsList.push(`${r},${c}-${r+1},${c}(H)`);
                }
            }
        }
    }
    
    // ② ユーザーが手動で引いた壁（userWalls）の格子点座標を完璧にマッピング展開
    if (typeof userWalls !== 'undefined' && userWalls) {
        userWalls.forEach(w => {
            const minR = Math.min(w.r1, w.r2); const maxR = Math.max(w.r1, w.r2);
            const minC = Math.min(w.c1, w.c2); const maxC = Math.max(w.c1, w.c2);
            
            if (w.r1 === w.r2) { // 横線 ➔ (H) の壁
                const r = minR;
                if (r > 0 && r < GRID_SIZE) {
                    for (let c = minC; c < maxC; c++) {
                        userWallsList.push(`${r-1},${c}-${r},${c}(H)`);
                    }
                }
            } else { // 縦線 ➔ (V) の壁
                const c = minC;
                if (c > 0 && c < GRID_SIZE) {
                    for (let r = minR; r < maxR; r++) {
                        userWallsList.push(`${r},${c-1}-${r},${c}(V)`);
                    }
                }
            }
        });
    }

    // 重複を完璧に排除した、ユーザーが構築した実際の境界線の全集合
    const uniqueUserWalls = [...new Set(userWallsList)];

    // 【デバッグ用グローバルコピー機能はそのまま維持】
    debugAnswerWalls = [...answerWalls];
    debugUserWalls = [...uniqueUserWalls];

    // 3. 【正解判定】手動＋自動の「和」が、正解のセットと100%完全に完全一致するか
    let isPerfect = true;
    if (answerWalls.length !== uniqueUserWalls.length) {
        isPerfect = false;
    } else {
        for (let aw of answerWalls) {
            if (!uniqueUserWalls.includes(aw)) { isPerfect = false; break; }
        }
    }

    // 4. 完全に一致していれば、即座に大正解ポップアップを呼び出す
    if (isPerfect) {
        errorDisplayState.show = false;
        alert("\n✨ 🎉 正解です！！ 🎉 ✨\n");
        return; 
    }

    // 自動判定モード（操作の切れ目）のときは、未完成ならここで静かに終了
    if (isAutoCheck) {
        return; 
    }

    // 5. 【手動Checkボタン専用ガード】
    alert("❌ まだ境界線が正解の形と一致していません ❌");
}

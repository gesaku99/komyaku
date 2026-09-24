// ─── ✨【正確さ最優先・完全同期版】手動境界線による一発クリア専用採点システム ───
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
    
    // ① マス目の色塗り（userGrid）によって自動発生している内壁境界線を抽出
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (c < GRID_SIZE - 1) {
                const c1 = userGrid[r][c]; const c2 = userGrid[r][c + 1];
                if ((c1 !== null || c2 !== null) && c1 !== c2) {
                    userWallsList.push(`${r},${c}-${r},${c+1}(V)`);
                }
            }
            if (r < GRID_SIZE - 1) {
                const r1 = userGrid[r][c]; const r2 = userGrid[r + 1][c];
                if ((r1 !== null || r2 !== null) && r1 !== r2) {
                    userWallsList.push(`${r},${c}-${r+1},${c}(H)`);
                }
            }
        }
    }
    
    // ② 💡【数式完全同期】ユーザーが手動で引いた壁（userWalls）の格子点座標を、
    // 正解データ（answerWalls）の登録文字列形式と100%完全に一致するようにマッピング展開
    if (typeof userWalls !== 'undefined' && userWalls) {
        userWalls.forEach(w => {
            const minR = Math.min(w.r1, w.r2); const maxR = Math.max(w.r1, w.r2);
            const minC = Math.min(w.c1, w.c2); const maxC = Math.max(w.c1, w.c2);
            
            if (w.r1 === w.r2) { // 画面上の横線 ➔ 上下のマス目を分断する (H) の壁
                const r = minR;
                if (r > 0 && r < GRID_SIZE) { // 外壁ラインは除外
                    for (let c = minC; c < maxC; c++) {
                        // 正解形式（r-1 と r の行の間、c列目）にジャスト合致
                        userWallsList.push(`${r-1},${c}-${r},${c}(H)`);
                    }
                }
            } else { // 画面上の縦線 ➔ 左右のマス目を分断する (V) の壁
                const c = minC;
                if (c > 0 && c < GRID_SIZE) { // 外壁ラインは除外
                    for (let r = minR; r < maxR; r++) {
                        // 正解形式（c-1 と c の列の間、r行目）にジャスト合致
                        userWallsList.push(`${r},${c-1}-${r},${c}(V)`);
                    }
                }
            }
        });
    }

    // 重複を完璧に排除した、ユーザーが構築した実際の境界線の全集合
    const uniqueUserWalls = [...new Set(userWallsList)];

    // 3. 【正解判定】手動＋自動の「和」が、正解のセットと100%完全に完全一致するか（白マスは100%無視）
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
        alert("\n✨ 🎉 正解です！！ 🎉 ✨\n完璧に切り分けられました！");
        return; 
    }

    // 自動判定モード（操作の切れ目）のときは、未完成ならここで静かに終了
    if (isAutoCheck) {
        return; 
    }

    // 5. 【手動Checkボタン専用ガード】
    alert("❌ まだ境界線が正解の形と一致していません ❌");
}

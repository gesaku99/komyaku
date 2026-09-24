// ─── 🧪【差分全暴露・検証用】手動境界線採点システム ───
// コンソールからいつでも中身を覗き見れるように、変数をあらかじめ外側に用意します
var debugAnswerWalls = [];
var debugUserWalls = [];

function checkAnswer(isAutoCheck = false) {
    clearErrorDisplay(); 

    // 1. 正解の内壁境界線をリストアップ
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

    // 2. ユーザー画面の現在のすべての境界線（自動内壁 ＋ 手動壁）の「和（合計）」を合成
    const userWallsList = [];
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
    
    if (typeof userWalls !== 'undefined' && userWalls) {
        userWalls.forEach(w => {
            const minR = Math.min(w.r1, w.r2); const maxR = Math.max(w.r1, w.r2);
            const minC = Math.min(w.c1, w.c2); const maxC = Math.max(w.c1, w.c2);
            
            if (w.r1 === w.r2) { // 横線 (H)
                const r = minR;
                if (r > 0 && r < GRID_SIZE) {
                    for (let c = minC; c < maxC; c++) {
                        userWallsList.push(`${r-1},${c}-${r},${c}(H)`);
                    }
                }
            } else { // 縦線 (V)
                const c = minC;
                if (c > 0 && c < GRID_SIZE) {
                    for (let r = minR; r < maxR; r++) {
                        userWallsList.push(`${r},${c-1}-${r},${c}(V)`);
                    }
                }
            }
        });
    }

    const uniqueUserWalls = [...new Set(userWallsList)];

    // 💡【検証用仕掛け】関数の内部の最新データを、いつでも外から見れるグローバル変数へコピー
    debugAnswerWalls = [...answerWalls];
    debugUserWalls = [...uniqueUserWalls];

    // 3. 【正解判定】
    let isPerfect = true;
    if (answerWalls.length !== uniqueUserWalls.length) {
        isPerfect = false;
    } else {
        for (let aw of answerWalls) {
            if (!uniqueUserWalls.includes(aw)) { isPerfect = false; break; }
        }
    }

    if (isPerfect) {
        errorDisplayState.show = false;
        alert("\n✨ 🎉 正解です！！ 🎉 ✨\n完璧に切り分けられました！");
        return; 
    }

    if (isAutoCheck) return; 
    alert("❌ まだ境界線が正解の形と一致していません ❌");
}

const canvas = document.getElementById('puzzleCanvas');
const ctx = canvas.getContext('2d');
const paletteContainer = document.getElementById('palette');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');

const CELL_PIXEL = 60;
const OFFSET = 50;

let GRID_SIZE = 5;
let problemLines = [];
let answerGrid = [];
let userGrid = [];
// ★追加：手動で引いた壁のリスト。各壁は { r1, c1, r2, c2 } の形で格子点の座標を記憶します
let userWalls = [];

const COLOR_PALETTE = [
    '#b4fbc2', // 0番: 緑 (Light Green)
    '#bce2fe', // 1番: 水 (Light Blue)
    '#ff9ea0', // 2番: 赤 (Light Red)
    '#ffffa6', // 3番: 黄 (Light Yellow)
    '#fbb3fe', // 4番: 桃 (Light Pink)
    '#ffca73', // 5番: 橙 (Orange)
    '#c28eff', // 6番: 紫 (Purple)
    '#f2cab3', // 7番: 茶 (Light Brown)
    '#00e5ff', // 8番: 濃い青 (Deep Blue - 水色と完全に区別可能)
    '#ffffff'  // 9番: 白(ユーザー境界線描画モード)
];

let currentSelectedColor = 0; 
let isDrawing = false;
let startCell = null;
let hasMovedInSession = false;

let errorDisplayState = { show: false, wrongLines: [], blackAlertLines: [], invalidVertices: [], isolatedCells: [] };

const undoStack = []; 
const redoStack = []; 

function clearErrorDisplay() {
    if (errorDisplayState.show) {
        errorDisplayState.show = false;
        errorDisplayState.wrongLines = [];
        errorDisplayState.blackAlertLines = [];
        errorDisplayState.invalidVertices = [];
        errorDisplayState.isolatedCells = [];
    }
}

function recordChange(r, c, oldColor, newColor) {
    if (oldColor === newColor) return;
    clearErrorDisplay(); 
    undoStack.push({ r: r, c: c, from: oldColor, to: newColor });
    redoStack.length = 0; 
    updateHistoryButtons();
}

// ─── 🧹【v0.9.1リセット履歴一括凝縮版】あなたのディレクション通り、色と壁の全過去を1つの操作履歴にして1発プッシュ！ ───
function clearGrid() {
    if (typeof clearErrorDisplay === 'function') clearErrorDisplay();
    
    // 1. Clearボタンが押される「直前」の、すべての色マスと手動壁の完璧な状態を深くコピーして1つの塊にする！
    const gridSnapshotBeforeClear = userGrid.map(row => [...row]);
    const wallSnapshotBeforeClear = (typeof userWalls !== 'undefined' && userWalls) ? userWalls.map(w => ({ ...w })) : [];

    let hasChange = false;

    // 2. 画面上の色マスを真っ白(null)にする
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (userGrid[r][c] !== null) {
                userGrid[r][c] = null;
                hasChange = true;
            }
        }
    }

    // 3. 画面上の手動壁を空っぽ([])にする
    if (typeof userWalls !== 'undefined' && userWalls && userWalls.length > 0) {
        userWalls = [];
        hasChange = true;
    }

    // 4. 💡【大正解の合流】変化が起きていたら、色と壁の「元の姿」を1つのセットにして、Undoスタックへポチッと1発だけプッシュ！
    if (hasChange) {
        undoStack.push({
            type: 'clear_all',
            oldGrid: gridSnapshotBeforeClear,
            oldWalls: wallSnapshotBeforeClear
        });

        if (typeof redoStack !== 'undefined') redoStack.length = 0; 
        if (typeof drawPuzzle === 'function') drawPuzzle();
        if (typeof updateHistoryButtons === 'function') updateHistoryButtons();
    }
}

function undo() {
    if (undoStack.length === 0) return;
    clearErrorDisplay();
    const change = undoStack.pop();
    redoStack.push({ r: change.r, c: change.c, from: change.to, to: change.from });
    userGrid[change.r][change.c] = change.from;
    while (undoStack.length > 0 && undoStack[undoStack.length - 1].to === 0 && change.to === 0) {
        const nextChange = undoStack.pop();
        redoStack.push({ r: nextChange.r, c: nextChange.c, from: nextChange.to, to: nextChange.from });
        userGrid[nextChange.r][nextChange.c] = nextChange.from;
    }
    drawPuzzle();
    updateHistoryButtons();
}

function redo() {
    if (redoStack.length === 0) return;
    clearErrorDisplay();
    const change = redoStack.pop();
    undoStack.push({ r: change.r, c: change.c, from: change.to, to: change.from });
    userGrid[change.r][change.c] = change.from;
    while (redoStack.length > 0 && redoStack[redoStack.length - 1].from === 0 && change.from === 0) {
        const nextChange = redoStack.pop();
        undoStack.push({ r: nextChange.r, c: nextChange.c, from: nextChange.to, to: nextChange.from });
        userGrid[nextChange.r][nextChange.c] = nextChange.from;
    }
    drawPuzzle();
    updateHistoryButtons();
}

function updateHistoryButtons() {
    undoBtn.disabled = (undoStack.length === 0);
    redoBtn.disabled = (redoStack.length === 0);
}
// ★消滅していた問題サイズ自動識別・URL同期ローダー関数
function loadPuzzleFromUrlOrId(defaultId) {
    const urlParams = new URLSearchParams(window.location.search);
    let hashId = urlParams.get('id') || defaultId;
    
    hashId = hashId.trim().toUpperCase();
    
    // ハッシュIDの文字数から3x3〜8x8までの盤面サイズを全自動で特定
    if (hashId.length === 4) { GRID_SIZE = 3; }        
    else if (hashId.length === 6) { GRID_SIZE = 4; }   
    else if (hashId.length === 10) { GRID_SIZE = 5; }  
    else if (hashId.length === 15) { GRID_SIZE = 6; }  
    else if (hashId.length === 21) { GRID_SIZE = 7; }  
    else if (hashId.length === 28) { GRID_SIZE = 8; }  
    else {
        GRID_SIZE = 5; // デフォルトを6x6に設定
        hashId = defaultId;
    }
    
    // 現在ロードしているハッシュIDをアドレスバーのURL(?id=XXXX)に同期
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.set('id', hashId);
    history.replaceState(null, '', `${window.location.pathname}?${currentParams.toString()}`);
    
    canvas.width = OFFSET * 2 + GRID_SIZE * CELL_PIXEL;
    canvas.height = OFFSET * 2 + GRID_SIZE * CELL_PIXEL;
    
    userGrid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    answerGrid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
    
    const totalBits = parseHashIdToBits(hashId);
    buildAnswerGridFromBits(totalBits);
}

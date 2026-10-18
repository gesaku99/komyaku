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
// 💡【v0.9.3新設】：プレイヤーが通常プレイ中にメモした「×印」と「？」を永久記憶する配列とマップ
let userCrossWalls = [];
let userQuestionMap = {};

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

function clearGrid() {
    if (typeof clearErrorDisplay === 'function') clearErrorDisplay();
    
    // 💡【v0.9.3拡張】Clear直前の「色マス・手動壁・手動×印・手動？」の4つすべてをディープコピーして1つの塊にする
    const gridSnapshotBeforeClear = userGrid.map(row => [...row]);
    const wallSnapshotBeforeClear = (typeof userWalls !== 'undefined' && userWalls) ? userWalls.map(w => ({ ...w })) : [];
    const crossSnapshotBeforeClear = userCrossWalls.map(w => ({ ...w }));
    const questionSnapshotBeforeClear = { ...userQuestionMap };

    let hasChange = false;

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (userGrid[r][c] !== null) { userGrid[r][c] = null; hasChange = true; }
        }
    }
    if (userWalls && userWalls.length > 0) { userWalls = []; hasChange = true; }
    
    // 💡【v0.9.3拡張】画面上の手動×印と？マークを空っぽにする
    if (userCrossWalls.length > 0) { userCrossWalls = []; hasChange = true; }
    if (Object.keys(userQuestionMap).length > 0) { userQuestionMap = {}; hasChange = true; }

    if (hasChange) {
        undoStack.push({
            type: 'clear_all',
            oldGrid: gridSnapshotBeforeClear,
            oldWalls: wallSnapshotBeforeClear,
            oldCrosses: crossSnapshotBeforeClear,
            oldQuestions: questionSnapshotBeforeClear
        });
        if (typeof redoStack !== 'undefined') redoStack.length = 0; 
        if (typeof drawPuzzle === 'function') drawPuzzle();
        if (typeof updateHistoryButtons === 'function') updateHistoryButtons();
    }
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

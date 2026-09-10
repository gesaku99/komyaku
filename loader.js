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

const COLOR_PALETTE = [
    '#ffffff', '#add8e6', '#ffcccb', '#90ee90', '#ffffe0',
    '#e6e6fa', '#ffe4e1', '#ffb6c1', '#dda0dd', '#ffa07a'
];

let currentSelectedColor = 1; 
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
    clearErrorDisplay();
    let hasChange = false;
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (userGrid[r][c] !== 0) {
                undoStack.push({ r: r, c: c, from: userGrid[r][c], to: 0 });
                userGrid[r][c] = 0;
                hasChange = true;
            }
        }
    }
    if (hasChange) {
        redoStack.length = 0; 
        drawPuzzle();
        updateHistoryButtons();
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

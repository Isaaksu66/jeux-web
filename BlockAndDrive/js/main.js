// NEON TRACK BUILDER

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const COLS = 10;
const ROWS = 15;
const CELL_SIZE = 40; 

const COLORS = [
    null,
    '#0ff', // Cyan (I)
    '#f0f', // Magenta (O)
    '#ff0', // Yellow (T)
    '#0f0', // Green (L)
    '#f00', // Red (Z)
    '#00f', // Blue (J)
    '#f80'  // Orange (S)
];

const SHAPES = [
    [[1,1,1,1]], 
    [[2,2],[2,2]], 
    [[0,3,0],[3,3,3]], 
    [[4,0,0],[4,4,4]], 
    [[0,0,5],[5,5,5]], 
    [[0,6,6],[6,6,0]], 
    [[7,7,0],[0,7,7]]  
];

let grid = [];
let piece = null;

const CAR_WIDTH = 2;
const CAR_HEIGHT = 2;
let carPos = {x: 4, y: ROWS - 4}; // Placed a bit higher to give time

let score = 0;
let gameOver = false;
let gameRunning = false;

let lastTime = 0;
let dropCounter = 0;
let dropInterval = 500; // MUCH FASTER DROP (0.5s)
let scrollCounter = 0;
let scrollInterval = 3000; // MUCH SLOWER SCROLL (3s) to learn

function initGrid() {
    grid = [];
    for (let r = 0; r < ROWS; r++) {
        let row = new Array(COLS).fill(0);
        // Plateforme de départ encore plus grande
        if (r >= ROWS - 8) { 
            row.fill(2);
        }
        grid.push(row);
    }
}

function drawGrid() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c] !== 0) {
                ctx.fillStyle = COLORS[grid[r][c]] || '#f0f';
                ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.strokeRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            } else {
                ctx.strokeStyle = '#112'; 
                ctx.lineWidth = 1;
                ctx.strokeRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }
}

function spawnPiece() {
    const type = Math.floor(Math.random() * SHAPES.length);
    piece = {
        matrix: SHAPES[type],
        pos: {x: Math.floor(COLS/2) - 1, y: 0}
    };
    if (collide(grid, piece)) {
        triggerGameOver();
    }
}

function drawPiece() {
    piece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = COLORS[value];
                ctx.fillRect((piece.pos.x + x) * CELL_SIZE, (piece.pos.y + y) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                ctx.strokeStyle = '#fff';
                ctx.strokeRect((piece.pos.x + x) * CELL_SIZE, (piece.pos.y + y) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        });
    });
}

function collide(grid, piece) {
    for (let y = 0; y < piece.matrix.length; y++) {
        for (let x = 0; x < piece.matrix[y].length; x++) {
            if (piece.matrix[y][x] !== 0 &&
               (grid[piece.pos.y + y] && grid[piece.pos.y + y][piece.pos.x + x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(grid, piece) {
    piece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                grid[piece.pos.y + y][piece.pos.x + x] = value;
            }
        });
    });
}

function rotate(matrix) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x]
            ] = [
                matrix[y][x],
                matrix[x][y]
            ];
        }
    }
    matrix.forEach(row => row.reverse());
}

function playerDrop() {
    piece.pos.y++;
    if (collide(grid, piece)) {
        piece.pos.y--;
        merge(grid, piece);
        spawnPiece();
        score += 5; // Bonus for placing a block
    }
    dropCounter = 0;
}

function playerHardDrop() {
    while (!collide(grid, piece)) {
        piece.pos.y++;
    }
    piece.pos.y--;
    merge(grid, piece);
    spawnPiece();
    score += 10;
    dropCounter = 0;
}

function playerMove(dir) {
    piece.pos.x += dir;
    if (collide(grid, piece)) {
        piece.pos.x -= dir;
    }
}

function playerRotate() {
    const pos = piece.pos.x;
    let offset = 1;
    rotate(piece.matrix);
    while (collide(grid, piece)) {
        piece.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > piece.matrix[0].length) {
            rotate(piece.matrix); 
            rotate(piece.matrix);
            rotate(piece.matrix);
            piece.pos.x = pos;
            return;
        }
    }
}

function drawCar() {
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#fff';
    ctx.fillStyle = '#fff';
    
    ctx.fillRect(carPos.x * CELL_SIZE + 5, carPos.y * CELL_SIZE + 5, CAR_WIDTH * CELL_SIZE - 10, CAR_HEIGHT * CELL_SIZE - 10);
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#ff0';
    ctx.fillRect(carPos.x * CELL_SIZE + 10, carPos.y * CELL_SIZE, 15, 10);
    ctx.fillRect((carPos.x + 1) * CELL_SIZE + 15, carPos.y * CELL_SIZE, 15, 10);
    
    ctx.fillStyle = '#f00';
    ctx.fillRect(carPos.x * CELL_SIZE + 10, (carPos.y + CAR_HEIGHT) * CELL_SIZE - 10, 15, 10);
    ctx.fillRect((carPos.x + 1) * CELL_SIZE + 15, (carPos.y + CAR_HEIGHT) * CELL_SIZE - 10, 15, 10);
}

function checkCarFall() {
    for(let r = 0; r < CAR_HEIGHT; r++) {
        for(let c = 0; c < CAR_WIDTH; c++) {
            let gridY = carPos.y + r;
            let gridX = carPos.x + c;
            if (grid[gridY] && grid[gridY][gridX] === 0) {
                return true; 
            }
        }
    }
    return false;
}

function triggerGameOver() {
    gameOver = true;
    gameRunning = false;
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
}

function scrollRoad() {
    grid.pop(); 
    grid.unshift(new Array(COLS).fill(0)); 
    
    score += 20;
    document.getElementById('score').innerText = 'SCORE: ' + score;
    
    if (scrollInterval > 500) scrollInterval -= 50; // Accelerates
    if (dropInterval > 100) dropInterval -= 10;

    if (checkCarFall()) {
        triggerGameOver();
    }
}

function update(time = 0) {
    if (!gameRunning) return;
    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    scrollCounter += deltaTime;
    if (scrollCounter > scrollInterval) {
        scrollRoad();
        scrollCounter = 0;
    }

    draw();
    if (!gameOver) {
        requestAnimationFrame(update);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    if (piece) drawPiece();
    drawCar();
}

document.addEventListener('keydown', event => {
    if (!gameRunning) return;
    
    // Empêcher la page de scroller avec les flèches ou Espace
    if(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(event.code) > -1) {
        event.preventDefault();
    }

    if (event.key === 'ArrowLeft') {
        playerMove(-1);
    } else if (event.key === 'ArrowRight') {
        playerMove(1);
    } else if (event.key === 'ArrowDown') {
        playerDrop();
    } else if (event.key === 'ArrowUp') {
        playerRotate();
    } else if (event.code === 'Space') {
        playerHardDrop();
    }
});

function startGame() {
    initGrid();
    spawnPiece();
    score = 0;
    gameOver = false;
    scrollInterval = 3000; // Départ plus lent
    dropInterval = 500;
    document.getElementById('score').innerText = 'SCORE: 0';
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    gameRunning = true;
    lastTime = performance.now();
    update(lastTime);
}

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);

initGrid();
draw();

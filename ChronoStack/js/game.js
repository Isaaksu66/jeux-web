// =====================================================
// CHRONO STACK - Time Loop Puzzle Platformer
// UNIQUE TWIST: Ghosts degrade over time (flicker/fade)
// =====================================================

// ===================== STATE & CONSTANTS =====================
let state = 'MENU';
let currentLevel = 0;
try {
    currentLevel = parseInt(localStorage.getItem('chrono_stack_level') || '0', 10);
} catch (e) {
    console.warn('localStorage is not available:', e);
}
let loopNumber = 0;
const TILE = 40;
const PLAYER_W = 26;
const PLAYER_H = 34;
const GRAVITY = 0.55;
const JUMP_FORCE = -12;
const MOVE_SPEED = 4.2;
const LOOP_TIME = 6.0; // seconds per loop
let timer = LOOP_TIME;

const GHOST_COLORS = [
    { body: '#a855f7', head: '#c084fc', opacity: 0.55 },
    { body: '#6366f1', head: '#818cf8', opacity: 0.50 },
    { body: '#06b6d4', head: '#22d3ee', opacity: 0.45 },
    { body: '#10b981', head: '#34d399', opacity: 0.40 },
    { body: '#f59e0b', head: '#fbbf24', opacity: 0.35 },
];

let ghostRecordings = [];
let currentRecording = [];
let frameCount = 0;
let particles = [];
let screenShake = 0;

// ===================== PLAYER =====================
let player = { x: 0, y: 0, vx: 0, vy: 0, onGround: false, facingRight: true, jumpBuffer: 0 };

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (state !== 'MENU') calcLevelOffset();
}
window.addEventListener('resize', resize);
resize();

// ===================== KEYS =====================
let keys = {};
let justPressed = {};

document.addEventListener('keydown', e => {
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
    if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

// ===================== LEVELS =====================
// 0=air, 1=solid wall, 2=exit, 3=solid highlight (visual variant)
const LEVELS = [
    {
        // Level 1 - Tutorial: exit is 2 tiles high on a pillar. Need 1 ghost.
        // Strategy: Loop1 = run to pillar base, stand still. Loop2 = jump on ghost, jump to exit.
        map: [
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,2,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,1,1,1,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        ],
        spawn: { col: 2, row: 6 },
        hint: "Loop 1: Run to column 10 and WAIT. Loop 2: Jump on your ghost!"
    },
    {
        // Level 2 - Gap bridge: need a ghost to stand in the gap
        map: [
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,2,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,1,1,1],
            [1,1,1,1,0,0,0,0,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        ],
        spawn: { col: 1, row: 4 },
        hint: "Loop 1: Fall into the gap. Loop 2: Walk over your ghost's head!"
    },
    {
        // Level 3 - Staircase: need 2 ghosts at different heights
        map: [
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,2,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        ],
        spawn: { col: 8, row: 6 },
        hint: "Build a staircase of ghosts! Think about positioning."
    },
    {
        // Level 4 - Two pillars 
        map: [
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,2,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,1,1,0,0,0,0,1,1,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        ],
        spawn: { col: 1, row: 6 },
        hint: "Use platforms AND ghosts to climb higher!"
    },
    {
        // Level 5 - The tower
        map: [
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,2,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        ],
        spawn: { col: 2, row: 7 },
        hint: "Stack 3 ghosts vertically! Hurry, they degrade!"
    },
    {
        // Level 6 - Zigzag
        map: [
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,2,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,1,1,1,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        ],
        spawn: { col: 12, row: 7 },
        hint: "Zigzag up using platforms AND ghost stepping stones!"
    },
    {
        // Level 7 - The pit
        map: [
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,2,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,1,1,1,0,0,0,0,0,1],
            [1,1,1,0,0,0,0,0,0,0,0,0,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        ],
        spawn: { col: 1, row: 4 },
        hint: "Cross the pit using your ghosts as bridges!"
    },
    {
        // Level 8 - Final challenge
        map: [
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,2,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,0,0,0,0,0,0,0,0,0,0,0,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        ],
        spawn: { col: 7, row: 7 },
        hint: "The final test! Stack, bridge, and time it perfectly!"
    },
];

// ===================== LAYOUT =====================
let levelOffsetX = 0, levelOffsetY = 0, levelW = 0, levelH = 0;

function calcLevelOffset() {
    const level = LEVELS[currentLevel];
    const cols = level.map[0].length;
    const rows = level.map.length;
    levelW = cols * TILE;
    levelH = rows * TILE;
    levelOffsetX = Math.floor((canvas.width - levelW) / 2);
    levelOffsetY = Math.floor((canvas.height - levelH) / 2) + 20;
}

// ===================== TILE HELPERS =====================
function isSolid(col, row) {
    const m = LEVELS[currentLevel].map;
    if (row < 0) return false;
    if (row >= m.length || col < 0 || col >= m[0].length) return true;
    return m[row][col] === 1 || m[row][col] === 3;
}

function isExit(col, row) {
    const m = LEVELS[currentLevel].map;
    if (row < 0 || row >= m.length || col < 0 || col >= m[0].length) return false;
    return m[row][col] === 2;
}

// ===================== GHOST DEGRADATION =====================
// UNIQUE TWIST: Older ghosts flicker and become unreliable!
function getGhostStability(ghostIndex) {
    const age = loopNumber - ghostIndex - 1; // how many loops old
    if (age <= 0) return 1.0;
    if (age === 1) return 0.95;
    if (age === 2) return 0.85;
    if (age === 3) return 0.70;
    return Math.max(0.4, 1.0 - age * 0.15);
}

function isGhostVisible(ghostIndex, frame) {
    const stability = getGhostStability(ghostIndex);
    if (stability >= 0.95) return true;
    // Flicker: use a pseudo-random pattern based on frame + ghostIndex
    const flickerSpeed = Math.max(3, Math.floor(stability * 20));
    const flickerPattern = Math.sin(frame * 0.3 + ghostIndex * 7) * 0.5 + 0.5;
    return flickerPattern < stability;
}

// ===================== GHOST COLLISION =====================
function getGhostPlatform(px, py, pw, ph, vy) {
    if (vy < 0) return null; // only land when falling
    
    for (let g = 0; g < ghostRecordings.length; g++) {
        const rec = ghostRecordings[g];
        const f = Math.min(frameCount, rec.length - 1);
        const ghost = rec[f];
        if (!ghost) continue;
        
        // Skip if ghost is flickered out at this moment
        if (!isGhostVisible(g, frameCount)) continue;

        const playerBottom = py + ph;
        const ghostTop = ghost.y;
        const ghostLeft = ghost.x;
        const ghostRight = ghost.x + ghost.w;

        // Horizontal overlap (generous)
        if (px + pw > ghostLeft + 2 && px < ghostRight - 2) {
            // Land on top: player feet near ghost head
            if (playerBottom >= ghostTop - 2 && playerBottom <= ghostTop + 14 && vy >= 0) {
                return { y: ghostTop - ph, ghostIndex: g };
            }
        }
    }
    return null;
}

// ===================== PLAYER PHYSICS =====================
function updatePlayer() {
    // Horizontal input
    player.vx = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) { player.vx = -MOVE_SPEED; player.facingRight = false; }
    if (keys['ArrowRight'] || keys['KeyD']) { player.vx = MOVE_SPEED; player.facingRight = true; }

    // Jump (with small buffer)
    if (justPressed['ArrowUp'] || justPressed['KeyW'] || justPressed['Space']) {
        player.jumpBuffer = 6; // 6 frame buffer
    }
    if (player.jumpBuffer > 0 && player.onGround) {
        player.vy = JUMP_FORCE;
        player.onGround = false;
        player.jumpBuffer = 0;
        spawnParticles(player.x + PLAYER_W/2, player.y + PLAYER_H, '#a855f7', 6);
    }
    if (player.jumpBuffer > 0) player.jumpBuffer--;

    // Gravity
    player.vy += GRAVITY;
    if (player.vy > 14) player.vy = 14;

    // Variable jump height (release = cut jump short)
    if (player.vy < -2 && !(keys['ArrowUp'] || keys['KeyW'] || keys['Space'])) {
        player.vy *= 0.85;
    }

    // Move X + resolve
    player.x += player.vx;
    resolveX();

    // Move Y + resolve
    player.y += player.vy;
    player.onGround = false;
    resolveY();

    // Ghost platform
    if (!player.onGround && player.vy >= 0) {
        const gp = getGhostPlatform(player.x, player.y, PLAYER_W, PLAYER_H, player.vy);
        if (gp) {
            player.y = gp.y;
            player.vy = 0;
            player.onGround = true;
        }
    }

    // Check exit
    const cx = Math.floor((player.x + PLAYER_W/2) / TILE);
    const cy = Math.floor((player.y + PLAYER_H/2) / TILE);
    if (isExit(cx, cy)) {
        levelComplete();
    }

    // Record
    currentRecording.push({
        x: player.x, y: player.y,
        w: PLAYER_W, h: PLAYER_H,
        facingRight: player.facingRight
    });

    // Clear justPressed
    justPressed = {};
}

function resolveX() {
    const l = Math.floor(player.x / TILE);
    const r = Math.floor((player.x + PLAYER_W - 1) / TILE);
    const t = Math.floor(player.y / TILE);
    const b = Math.floor((player.y + PLAYER_H - 1) / TILE);
    for (let row = t; row <= b; row++) {
        for (let col = l; col <= r; col++) {
            if (isSolid(col, row)) {
                if (player.vx > 0) player.x = col * TILE - PLAYER_W;
                else if (player.vx < 0) player.x = (col + 1) * TILE;
                player.vx = 0;
            }
        }
    }
}

function resolveY() {
    const l = Math.floor(player.x / TILE);
    const r = Math.floor((player.x + PLAYER_W - 1) / TILE);
    const t = Math.floor(player.y / TILE);
    const b = Math.floor((player.y + PLAYER_H - 1) / TILE);
    for (let row = t; row <= b; row++) {
        for (let col = l; col <= r; col++) {
            if (isSolid(col, row)) {
                if (player.vy > 0) { player.y = row * TILE - PLAYER_H; player.vy = 0; player.onGround = true; }
                else if (player.vy < 0) { player.y = (row + 1) * TILE; player.vy = 0; }
            }
        }
    }
}

// ===================== PARTICLES =====================
function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1 + Math.random() * 3.5;
        particles.push({
            x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 1.5,
            life: 1, decay: 0.015 + Math.random() * 0.025,
            color, size: 2 + Math.random() * 4
        });
    }
}

function updateDrawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(levelOffsetX + p.x, levelOffsetY + p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// ===================== DRAWING =====================
function drawBackground() {
    ctx.fillStyle = '#0b0b1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Subtle grid dots
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let x = 0; x < canvas.width; x += 25) {
        for (let y = 0; y < canvas.height; y += 25) {
            ctx.fillRect(x, y, 1, 1);
        }
    }
}

function drawLevel() {
    const m = LEVELS[currentLevel].map;
    for (let r = 0; r < m.length; r++) {
        for (let c = 0; c < m[r].length; c++) {
            const tile = m[r][c];
            const x = levelOffsetX + c * TILE;
            const y = levelOffsetY + r * TILE;

            if (tile === 1 || tile === 3) {
                // Solid
                ctx.fillStyle = '#181832';
                ctx.fillRect(x, y, TILE, TILE);
                ctx.strokeStyle = '#2a2a55';
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
                // Inner highlight
                ctx.fillStyle = 'rgba(99,102,241,0.05)';
                ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
            } else if (tile === 2) {
                // Exit - pulsing green star
                const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.004);
                ctx.fillStyle = `rgba(74, 222, 128, ${pulse * 0.2})`;
                ctx.fillRect(x, y, TILE, TILE);
                ctx.shadowColor = '#4ade80';
                ctx.shadowBlur = 15 * pulse;
                ctx.strokeStyle = `rgba(74, 222, 128, ${0.5 + pulse * 0.5})`;
                ctx.lineWidth = 2;
                ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
                ctx.fillStyle = `rgba(74, 222, 128, ${0.7 + pulse * 0.3})`;
                ctx.font = 'bold 20px Outfit';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('★', x + TILE/2, y + TILE/2);
                ctx.shadowBlur = 0;
            }
        }
    }
}

function drawGhosts() {
    for (let g = 0; g < ghostRecordings.length; g++) {
        const rec = ghostRecordings[g];
        const f = Math.min(frameCount, rec.length - 1);
        const ghost = rec[f];
        if (!ghost) continue;

        const visible = isGhostVisible(g, frameCount);
        if (!visible) continue; // Ghost is flickered out!

        const stability = getGhostStability(g);
        const colors = GHOST_COLORS[g % GHOST_COLORS.length];
        const baseOpacity = colors.opacity * stability;
        
        const x = levelOffsetX + ghost.x;
        const y = levelOffsetY + ghost.y;

        // Jitter for unstable ghosts
        const jitterX = stability < 0.8 ? (Math.random() - 0.5) * (1 - stability) * 8 : 0;
        const jitterY = stability < 0.8 ? (Math.random() - 0.5) * (1 - stability) * 4 : 0;

        ctx.globalAlpha = baseOpacity;

        // Shadow/glow under ghost
        ctx.fillStyle = colors.body;
        ctx.shadowColor = colors.body;
        ctx.shadowBlur = 8;

        // Body (oval)
        ctx.beginPath();
        ctx.ellipse(x + ghost.w/2 + jitterX, y + ghost.h * 0.5 + jitterY, ghost.w/2 - 1, ghost.h * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Head
        ctx.fillStyle = colors.head;
        ctx.beginPath();
        ctx.arc(x + ghost.w/2 + jitterX, y + 6 + jitterY, 9, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = `rgba(255,255,255,${0.7 * stability})`;
        const ed = ghost.facingRight ? 2 : -2;
        ctx.beginPath();
        ctx.arc(x + ghost.w/2 - 3 + ed + jitterX, y + 4 + jitterY, 2, 0, Math.PI * 2);
        ctx.arc(x + ghost.w/2 + 3 + ed + jitterX, y + 4 + jitterY, 2, 0, Math.PI * 2);
        ctx.fill();

        // Stability warning icon
        if (stability < 0.8) {
            ctx.fillStyle = `rgba(255,100,100,${(1 - stability) * 1.5})`;
            ctx.font = '10px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText('⚠', x + ghost.w/2 + jitterX, y - 8 + jitterY);
        }

        // Loop label
        ctx.fillStyle = `rgba(255,255,255,${0.3 * stability})`;
        ctx.font = '9px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('L' + (g + 1), x + ghost.w/2, y - 4);

        ctx.globalAlpha = 1;
    }
}

function drawPlayer() {
    const x = levelOffsetX + player.x;
    const y = levelOffsetY + player.y;

    // Glow
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 18;

    // Body
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.ellipse(x + PLAYER_W/2, y + PLAYER_H * 0.5, PLAYER_W/2, PLAYER_H * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Head
    ctx.fillStyle = '#d8b4fe';
    ctx.beginPath();
    ctx.arc(x + PLAYER_W/2, y + 6, 10, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    const ed = player.facingRight ? 2.5 : -2.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + PLAYER_W/2 - 3 + ed, y + 4, 2.5, 0, Math.PI * 2);
    ctx.arc(x + PLAYER_W/2 + 3 + ed, y + 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(x + PLAYER_W/2 - 3 + ed * 1.2, y + 4, 1.2, 0, Math.PI * 2);
    ctx.arc(x + PLAYER_W/2 + 3 + ed * 1.2, y + 4, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // "YOU" label
    ctx.fillStyle = 'rgba(168,85,247,0.7)';
    ctx.font = 'bold 10px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('YOU', x + PLAYER_W/2, y - 6);
}

function drawHint() {
    const level = LEVELS[currentLevel];
    if (level.hint && loopNumber <= 1 && timer > 3) {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '14px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText(level.hint, canvas.width / 2, levelOffsetY + levelH + 40);
    }
}

// ===================== REWIND =====================
let rewindTimer = 0;
const REWIND_DURATION = 50;

function startRewind() {
    state = 'REWINDING';
    rewindTimer = REWIND_DURATION;
    ghostRecordings.push([...currentRecording]);
    screenShake = 8;
    spawnParticles(player.x + PLAYER_W/2, player.y + PLAYER_H/2, '#06b6d4', 25);
}

function updateRewind() {
    rewindTimer--;
    screenShake *= 0.9;
    if (rewindTimer <= 0) {
        loopNumber++;
        startLoop();
    }
}

function drawRewindEffect() {
    const progress = 1 - (rewindTimer / REWIND_DURATION);
    // Scan lines
    ctx.fillStyle = `rgba(6, 182, 212, ${0.08 * (1 - progress)})`;
    for (let y = 0; y < canvas.height; y += 4) {
        ctx.fillRect(0, y, canvas.width, 2);
    }
    // Text
    ctx.globalAlpha = Math.max(0, 1 - progress * 1.5);
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 46px Outfit';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 20;
    ctx.fillText('⟲ REWIND', canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
}

// ===================== GAME FLOW =====================
function startLoop() {
    state = 'PLAYING';
    const level = LEVELS[currentLevel];
    player.x = level.spawn.col * TILE + (TILE - PLAYER_W) / 2;
    player.y = level.spawn.row * TILE + (TILE - PLAYER_H);
    player.vx = 0; player.vy = 0;
    player.onGround = false; player.facingRight = true;
    player.jumpBuffer = 0;
    timer = LOOP_TIME;
    currentRecording = [];
    frameCount = 0;
    justPressed = {};

    document.getElementById('loop-display').textContent = 'LOOP ' + (loopNumber + 1);
    document.getElementById('timer-bar-fill').style.width = '100%';
    document.getElementById('timer-text').textContent = LOOP_TIME.toFixed(1) + 's';
    document.getElementById('timer-text').style.color = '#06b6d4';
}

function startLevel(idx) {
    currentLevel = idx;
    loopNumber = 0;
    ghostRecordings = [];
    particles = [];
    calcLevelOffset();

    document.getElementById('level-display').textContent = 'LEVEL ' + (currentLevel + 1);
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('complete-screen').classList.add('hidden');
    document.getElementById('win-screen').classList.add('hidden');

    startLoop();
}

function levelComplete() {
    state = 'COMPLETE';
    document.getElementById('loops-used').textContent = loopNumber + 1;
    document.getElementById('complete-screen').classList.remove('hidden');
    screenShake = 5;
    spawnParticles(player.x + PLAYER_W/2, player.y + PLAYER_H/2, '#4ade80', 35);
}

function resetLevel() {
    loopNumber = 0;
    ghostRecordings = [];
    particles = [];
    startLoop();
}

// ===================== MAIN LOOP =====================
const FPS = 60;
const frameDur = 1000 / FPS;
let lastTS = 0;

function gameLoop(ts) {
    const dt = ts - lastTS;
    if (dt >= frameDur) {
        lastTS = ts - (dt % frameDur);

        // Screen shake offset
        const shakeX = screenShake > 0.5 ? (Math.random() - 0.5) * screenShake : 0;
        const shakeY = screenShake > 0.5 ? (Math.random() - 0.5) * screenShake : 0;
        screenShake *= 0.92;

        ctx.save();
        ctx.translate(shakeX, shakeY);

        drawBackground();

        if (state === 'PLAYING') {
            timer -= frameDur / 1000;
            if (timer <= 0) { timer = 0; startRewind(); }

            const pct = Math.max(0, timer / LOOP_TIME) * 100;
            document.getElementById('timer-bar-fill').style.width = pct + '%';
            document.getElementById('timer-text').textContent = Math.max(0, timer).toFixed(1) + 's';
            document.getElementById('timer-text').style.color = timer < 1.5 ? '#ef4444' : '#06b6d4';

            // Pulse timer bar red when low
            if (timer < 1.5) {
                document.getElementById('timer-bar-fill').style.background =
                    `linear-gradient(90deg, #ef4444, #f97316)`;
            } else {
                document.getElementById('timer-bar-fill').style.background =
                    `linear-gradient(90deg, #06b6d4, #a855f7)`;
            }

            updatePlayer();
            frameCount++;
        }

        if (state === 'REWINDING') {
            updateRewind();
        }

        if (state !== 'MENU') {
            drawLevel();
            drawGhosts();
            if (state === 'PLAYING' || state === 'COMPLETE') drawPlayer();
            drawHint();
            updateDrawParticles();
        }

        if (state === 'REWINDING') drawRewindEffect();

        ctx.restore();
    }

    requestAnimationFrame(gameLoop);
}

// ===================== BUTTONS =====================
document.getElementById('play-btn').addEventListener('click', () => {
    document.getElementById('menu-screen').classList.add('hidden');
    startLevel(currentLevel);
});
document.getElementById('next-btn').addEventListener('click', () => {
    if (currentLevel + 1 < LEVELS.length) {
        startLevel(currentLevel + 1);
        try {
            localStorage.setItem('chrono_stack_level', currentLevel);
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
        }
    } else {
        state = 'WIN';
        try {
            localStorage.removeItem('chrono_stack_level');
        } catch (e) {
            console.warn('Could not remove from localStorage:', e);
        }
        document.getElementById('complete-screen').classList.add('hidden');
        document.getElementById('win-screen').classList.remove('hidden');
        document.getElementById('hud').classList.add('hidden');
    }
});
document.getElementById('reset-btn').addEventListener('click', resetLevel);
document.getElementById('replay-btn').addEventListener('click', () => {
    document.getElementById('win-screen').classList.add('hidden');
    try {
        localStorage.removeItem('chrono_stack_level');
    } catch (e) {
        console.warn('Could not remove from localStorage:', e);
    }
    currentLevel = 0;
    startLevel(0);
});

// ===================== INIT =====================
if (currentLevel > 0 && currentLevel < LEVELS.length) {
    document.getElementById('play-btn').textContent = '▶ CONTINUE (Lvl ' + (currentLevel + 1) + ')';
}
requestAnimationFrame(gameLoop);

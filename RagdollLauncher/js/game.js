// ====================================================
// RAGDOLL LAUNCHER - Full Game Engine
// ====================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ---- SIZING ----
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ---- CONSTANTS ----
const GRAVITY = 0.35;
const GROUND_Y_OFFSET = 150; // Ground is 150px from bottom
const BOUNCE_LOSS = 0.55;    // Energy lost on ground bounce
const AIR_RESISTANCE = 0.998;
const COIN_RADIUS = 18;
const TRAMPOLINE_BOUNCE = 1.6; // Multiplier for trampoline bounce
const BUMPER_BOUNCE = 1.4;

// ---- GAME STATE ----
let state = 'MENU'; // MENU, AIM, CHARGING, FLYING, RESULT
let power = 0;
let powerDir = 1;
let angle = 45;
let bestDistance = 0;

// ---- RAGDOLL ----
let ragdoll = {
    x: 0, y: 0,
    vx: 0, vy: 0,
    rotation: 0,
    rotSpeed: 0,
    onGround: false,
    bounceCount: 0,
    stopped: false
};

// ---- CAMERA ----
let camera = { x: 0, y: 0 };

// ---- STATS ----
let stats = { distance: 0, maxHeight: 0, coins: 0 };

// ---- WORLD OBJECTS ----
let coins = [];
let trampolines = [];
let bumpers = [];
let boosters = [];
let particles = [];
let trailParticles = [];

// ---- GROUND Y ----
function getGroundY() {
    return canvas.height - GROUND_Y_OFFSET;
}

// ---- GENERATE WORLD ----
function generateWorld() {
    coins = [];
    trampolines = [];
    bumpers = [];
    boosters = [];

    const groundY = getGroundY();

    // Generate objects spread across a long distance
    for (let i = 0; i < 200; i++) {
        const x = 400 + i * 250 + Math.random() * 150;

        // Coins (clusters of 3-5)
        const coinCount = 3 + Math.floor(Math.random() * 3);
        for (let c = 0; c < coinCount; c++) {
            coins.push({
                x: x + c * 40,
                y: groundY - 80 - Math.random() * 250,
                collected: false
            });
        }

        // Trampolines (green pads on the ground)
        if (Math.random() < 0.4) {
            trampolines.push({
                x: x + 50,
                y: groundY,
                width: 100,
                height: 15,
                animScale: 1
            });
        }

        // Bumpers (floating circles that bounce you)
        if (Math.random() < 0.3) {
            bumpers.push({
                x: x + 100 + Math.random() * 100,
                y: groundY - 150 - Math.random() * 200,
                radius: 25 + Math.random() * 15,
                hit: false,
                animTimer: 0
            });
        }

        // Boosters (rocket arrows that push you forward)
        if (Math.random() < 0.2) {
            boosters.push({
                x: x + 200,
                y: groundY - 100 - Math.random() * 150,
                width: 50,
                height: 50,
                used: false
            });
        }
    }
}

// ---- PARTICLE SYSTEM ----
function spawnParticles(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = Math.random() * speed;
        particles.push({
            x, y,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s,
            life: 1,
            decay: 0.02 + Math.random() * 0.03,
            color,
            size: 3 + Math.random() * 5
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life -= p.decay;
        if (p.life <= 0) particles.splice(i, 1);
    }

    // Trail
    if (state === 'FLYING' && !ragdoll.stopped) {
        trailParticles.push({
            x: ragdoll.x,
            y: ragdoll.y,
            life: 1,
            decay: 0.04,
            size: 4 + Math.random() * 3
        });
    }
    for (let i = trailParticles.length - 1; i >= 0; i--) {
        trailParticles[i].life -= trailParticles[i].decay;
        if (trailParticles[i].life <= 0) trailParticles.splice(i, 1);
    }
}

function drawParticles() {
    // Trail
    for (const p of trailParticles) {
        ctx.globalAlpha = p.life * 0.4;
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(p.x - camera.x, p.y - camera.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Explosion particles
    for (const p of particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x - camera.x, p.y - camera.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// ---- DRAW BACKGROUND ----
function drawBackground() {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#0a0a2e');
    grad.addColorStop(0.5, '#1a1a4e');
    grad.addColorStop(1, '#2d1b69');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stars (parallax)
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 80; i++) {
        const sx = ((i * 137.5 + 50) % (canvas.width + 500)) - (camera.x * 0.05) % (canvas.width + 500);
        const sy = ((i * 97.3 + 30) % (canvas.height * 0.6));
        const size = (i % 3) + 1;
        ctx.globalAlpha = 0.3 + (i % 5) * 0.15;
        ctx.fillRect(sx, sy, size, size);
    }
    ctx.globalAlpha = 1;

    // Mountains (parallax)
    drawMountains(canvas.height - GROUND_Y_OFFSET - 80, '#1a0a3e', 0.1, 120);
    drawMountains(canvas.height - GROUND_Y_OFFSET - 40, '#2a1a4e', 0.2, 80);
}

function drawMountains(baseY, color, parallax, height) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let x = 0; x <= canvas.width + 100; x += 5) {
        const worldX = x + camera.x * parallax;
        const y = baseY - Math.abs(Math.sin(worldX * 0.003) * height + Math.sin(worldX * 0.007) * height * 0.5);
        ctx.lineTo(x, y);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();
}

// ---- DRAW GROUND ----
function drawGround() {
    const groundY = getGroundY();
    const screenGroundY = groundY - camera.y;

    // Ground fill
    const grad = ctx.createLinearGradient(0, screenGroundY, 0, canvas.height);
    grad.addColorStop(0, '#2d8a4e');
    grad.addColorStop(0.3, '#1d6a3e');
    grad.addColorStop(1, '#0a3a1e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, screenGroundY, canvas.width, canvas.height - screenGroundY);

    // Ground line
    ctx.strokeStyle = '#4dff88';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#4dff88';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, screenGroundY);
    ctx.lineTo(canvas.width, screenGroundY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Distance markers
    ctx.fillStyle = '#fff';
    ctx.font = '14px Outfit';
    ctx.textAlign = 'center';
    const startMark = Math.floor((camera.x) / 200) * 200;
    for (let m = startMark; m < camera.x + canvas.width; m += 200) {
        const sx = m - camera.x;
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(sx, screenGroundY - 10, 2, 10);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText(Math.round(m / 10) + 'm', sx, screenGroundY + 25);
    }
}

// ---- DRAW LAUNCHER ----
function drawLauncher() {
    const groundY = getGroundY();
    const baseX = 100 - camera.x;
    const baseY = groundY - camera.y;

    // Base platform
    ctx.fillStyle = '#555';
    ctx.fillRect(baseX - 30, baseY - 10, 60, 10);

    // Arm
    ctx.save();
    ctx.translate(baseX, baseY - 10);
    const rad = -angle * Math.PI / 180;
    ctx.rotate(rad);
    ctx.fillStyle = '#888';
    ctx.fillRect(0, -6, 80, 12);
    // Bucket
    ctx.fillStyle = '#aaa';
    ctx.fillRect(70, -15, 15, 30);
    ctx.restore();
}

// ---- DRAW RAGDOLL ----
function drawRagdoll() {
    const sx = ragdoll.x - camera.x;
    const sy = ragdoll.y - camera.y;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ragdoll.rotation);

    // Body
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#ffd93d';
    ctx.beginPath();
    ctx.arc(0, -22, 10, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(-4, -24, 2, 0, Math.PI * 2);
    ctx.arc(4, -24, 2, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    // Left arm
    ctx.beginPath();
    ctx.moveTo(-10, -8);
    ctx.lineTo(-22, 5 + Math.sin(ragdoll.rotation * 3) * 8);
    ctx.stroke();
    // Right arm
    ctx.beginPath();
    ctx.moveTo(10, -8);
    ctx.lineTo(22, 5 + Math.cos(ragdoll.rotation * 3) * 8);
    ctx.stroke();

    // Legs
    ctx.strokeStyle = '#4d96ff';
    ctx.lineWidth = 6;
    // Left leg
    ctx.beginPath();
    ctx.moveTo(-6, 16);
    ctx.lineTo(-14, 34 + Math.sin(ragdoll.rotation * 4) * 6);
    ctx.stroke();
    // Right leg
    ctx.beginPath();
    ctx.moveTo(6, 16);
    ctx.lineTo(14, 34 + Math.cos(ragdoll.rotation * 4) * 6);
    ctx.stroke();

    ctx.restore();
}

// ---- DRAW COINS ----
function drawCoins() {
    for (const coin of coins) {
        if (coin.collected) continue;
        const sx = coin.x - camera.x;
        const sy = coin.y - camera.y;
        if (sx < -50 || sx > canvas.width + 50) continue;

        // Glow
        ctx.shadowColor = '#ffd93d';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ffd93d';
        ctx.beginPath();
        ctx.arc(sx, sy, COIN_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner circle
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(sx, sy, COIN_RADIUS - 5, 0, Math.PI * 2);
        ctx.fill();

        // Dollar sign
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Outfit';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', sx, sy);
    }
}

// ---- DRAW TRAMPOLINES ----
function drawTrampolines() {
    for (const t of trampolines) {
        const sx = t.x - camera.x;
        const sy = t.y - camera.y;
        if (sx < -150 || sx > canvas.width + 150) continue;

        // Legs
        ctx.fillStyle = '#888';
        ctx.fillRect(sx - t.width/2 + 5, sy - 5, 8, 15);
        ctx.fillRect(sx + t.width/2 - 13, sy - 5, 8, 15);

        // Pad
        const squeeze = t.animScale;
        ctx.fillStyle = '#6bcb77';
        ctx.shadowColor = '#6bcb77';
        ctx.shadowBlur = 12;
        ctx.fillRect(sx - (t.width * squeeze)/2, sy - t.height, t.width * squeeze, t.height);
        ctx.shadowBlur = 0;

        // Animate back
        t.animScale += (1 - t.animScale) * 0.1;
    }
}

// ---- DRAW BUMPERS ----
function drawBumpers() {
    for (const b of bumpers) {
        const sx = b.x - camera.x;
        const sy = b.y - camera.y;
        if (sx < -100 || sx > canvas.width + 100) continue;

        const r = b.radius + (b.animTimer > 0 ? Math.sin(b.animTimer * 0.5) * 5 : 0);
        b.animTimer = Math.max(0, b.animTimer - 1);

        ctx.fillStyle = '#ff6b6b';
        ctx.shadowColor = '#ff6b6b';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ff9999';
        ctx.beginPath();
        ctx.arc(sx, sy, r * 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(r * 0.7)}px Outfit`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💥', sx, sy);
    }
}

// ---- DRAW BOOSTERS ----
function drawBoosters() {
    for (const b of boosters) {
        if (b.used) continue;
        const sx = b.x - camera.x;
        const sy = b.y - camera.y;
        if (sx < -100 || sx > canvas.width + 100) continue;

        ctx.fillStyle = '#4d96ff';
        ctx.shadowColor = '#4d96ff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        // Arrow shape
        ctx.moveTo(sx - 25, sy - 15);
        ctx.lineTo(sx + 25, sy);
        ctx.lineTo(sx - 25, sy + 15);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Outfit';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('»', sx, sy);
    }
}

// ---- COLLISIONS ----
function checkCollisions() {
    const groundY = getGroundY();

    // Ground collision
    if (ragdoll.y >= groundY - 20) {
        ragdoll.y = groundY - 20;
        ragdoll.bounceCount++;

        if (Math.abs(ragdoll.vy) < 2 && Math.abs(ragdoll.vx) < 1) {
            ragdoll.stopped = true;
            ragdoll.vx = 0;
            ragdoll.vy = 0;
            return;
        }

        ragdoll.vy = -Math.abs(ragdoll.vy) * BOUNCE_LOSS;
        ragdoll.vx *= 0.9;
        ragdoll.rotSpeed *= 0.7;
        spawnParticles(ragdoll.x, ragdoll.y + 15, '#4dff88', 5, 3);
    }

    // Coins
    for (const coin of coins) {
        if (coin.collected) continue;
        const dx = ragdoll.x - coin.x;
        const dy = ragdoll.y - coin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < COIN_RADIUS + 15) {
            coin.collected = true;
            stats.coins++;
            document.getElementById('coins-display').textContent = '🪙 ' + stats.coins;
            spawnParticles(coin.x, coin.y, '#ffd93d', 10, 5);
        }
    }

    // Trampolines
    for (const t of trampolines) {
        if (ragdoll.x > t.x - t.width/2 && ragdoll.x < t.x + t.width/2 &&
            ragdoll.y + 20 >= t.y - t.height && ragdoll.y + 20 <= t.y + 10 &&
            ragdoll.vy > 0) {
            ragdoll.vy = -Math.abs(ragdoll.vy) * TRAMPOLINE_BOUNCE;
            if (ragdoll.vy > -8) ragdoll.vy = -12; // Minimum bounce
            t.animScale = 0.6;
            spawnParticles(ragdoll.x, t.y - 5, '#6bcb77', 12, 5);
        }
    }

    // Bumpers
    for (const b of bumpers) {
        const dx = ragdoll.x - b.x;
        const dy = ragdoll.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < b.radius + 15) {
            const nx = dx / dist;
            const ny = dy / dist;
            const speed = Math.sqrt(ragdoll.vx * ragdoll.vx + ragdoll.vy * ragdoll.vy);
            ragdoll.vx = nx * speed * BUMPER_BOUNCE;
            ragdoll.vy = ny * speed * BUMPER_BOUNCE;
            if (Math.abs(ragdoll.vx) < 5) ragdoll.vx = nx * 10;
            if (ragdoll.vy > -5) ragdoll.vy = -8;
            b.animTimer = 20;
            ragdoll.rotSpeed += (Math.random() - 0.5) * 0.3;
            spawnParticles(ragdoll.x, ragdoll.y, '#ff6b6b', 15, 6);
        }
    }

    // Boosters
    for (const b of boosters) {
        if (b.used) continue;
        const dx = ragdoll.x - (b.x);
        const dy = ragdoll.y - (b.y);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 40) {
            b.used = true;
            ragdoll.vx += 15;
            ragdoll.vy -= 5;
            spawnParticles(b.x, b.y, '#4d96ff', 20, 8);
        }
    }
}

// ---- UPDATE ----
function update() {
    if (state === 'CHARGING') {
        power += 1.5 * powerDir;
        if (power >= 100) { power = 100; powerDir = -1; }
        if (power <= 0) { power = 0; powerDir = 1; }
        document.getElementById('power-bar-fill').style.width = power + '%';
    }

    if (state === 'FLYING') {
        if (!ragdoll.stopped) {
            ragdoll.vy += GRAVITY;
            ragdoll.vx *= AIR_RESISTANCE;
            ragdoll.x += ragdoll.vx;
            ragdoll.y += ragdoll.vy;
            ragdoll.rotation += ragdoll.rotSpeed;
            ragdoll.rotSpeed *= 0.995;

            checkCollisions();

            // Update stats
            const dist = Math.max(0, Math.round((ragdoll.x - 100) / 10));
            const height = Math.max(0, Math.round((getGroundY() - ragdoll.y) / 10));
            stats.distance = dist;
            if (height > stats.maxHeight) stats.maxHeight = height;

            document.getElementById('distance-display').textContent = dist + ' m';
            document.getElementById('height-display').textContent = '↑ ' + height + ' m';

            // Camera follows ragdoll
            camera.x += (ragdoll.x - canvas.width * 0.3 - camera.x) * 0.08;
            camera.y += (ragdoll.y - canvas.height * 0.5 - camera.y) * 0.05;
            if (camera.y > 0) camera.y = 0; // Don't go below ground level
        } else {
            // Ragdoll stopped - show results after a short delay
            setTimeout(showResults, 800);
            state = 'ENDED';
        }
    }

    updateParticles();
}

// ---- DRAW ----
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawGround();

    if (state === 'AIM' || state === 'CHARGING') {
        drawLauncher();
        // Draw ragdoll on launcher
        const rad = -angle * Math.PI / 180;
        ragdoll.x = 100 + Math.cos(rad) * 70;
        ragdoll.y = getGroundY() - 10 + Math.sin(rad) * 70;
    }

    drawTrampolines();
    drawBumpers();
    drawBoosters();
    drawCoins();
    drawParticles();

    if (state !== 'MENU') {
        drawRagdoll();
    }

    if (state === 'AIM' || state === 'CHARGING') {
        drawLauncher();
    }
}

// ---- GAME LOOP ----
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// ---- LAUNCH ----
function launchRagdoll() {
    const rad = angle * Math.PI / 180;
    const force = power * 0.35;
    ragdoll.vx = Math.cos(rad) * force;
    ragdoll.vy = -Math.sin(rad) * force;
    ragdoll.rotSpeed = 0.1 + Math.random() * 0.1;
    ragdoll.bounceCount = 0;
    ragdoll.stopped = false;
    ragdoll.onGround = false;

    state = 'FLYING';
    document.getElementById('power-bar-container').classList.add('hidden');
    document.getElementById('angle-indicator').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    spawnParticles(ragdoll.x, ragdoll.y, '#ff6b6b', 25, 8);
}

// ---- SHOW RESULTS ----
function showResults() {
    if (state !== 'ENDED') return;
    state = 'RESULT';
    if (stats.distance > bestDistance) bestDistance = stats.distance;

    let title = 'NOT BAD...';
    if (stats.distance > 50) title = 'NICE FLIGHT!';
    if (stats.distance > 150) title = 'AWESOME! 🔥';
    if (stats.distance > 300) title = 'INCREDIBLE!! 🚀';
    if (stats.distance > 500) title = 'LEGENDARY!!! 👑';

    document.getElementById('result-title').textContent = title;
    document.getElementById('result-distance').textContent = stats.distance + ' m';
    document.getElementById('result-height').textContent = stats.maxHeight + ' m';
    document.getElementById('result-coins').textContent = stats.coins;
    document.getElementById('result-best').textContent = bestDistance + ' m';
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
}

// ---- START GAME ----
function startGame() {
    state = 'AIM';
    power = 0;
    powerDir = 1;
    angle = 45;
    camera = { x: 0, y: 0 };
    stats = { distance: 0, maxHeight: 0, coins: 0 };
    ragdoll = {
        x: 100, y: getGroundY() - 30,
        vx: 0, vy: 0,
        rotation: 0, rotSpeed: 0,
        onGround: false, bounceCount: 0, stopped: false
    };
    particles = [];
    trailParticles = [];

    generateWorld();

    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('power-bar-container').classList.remove('hidden');
    document.getElementById('angle-indicator').classList.remove('hidden');
    document.getElementById('power-bar-fill').style.width = '0%';
    document.getElementById('angle-value').textContent = angle;
    document.getElementById('coins-display').textContent = '🪙 0';
    document.getElementById('distance-display').textContent = '0 m';
    document.getElementById('height-display').textContent = '↑ 0 m';
}

// ---- INPUT HANDLING ----
let spaceHeld = false;

document.addEventListener('keydown', (e) => {
    if (state === 'AIM' || state === 'CHARGING') {
        if (e.code === 'Space' && !spaceHeld) {
            e.preventDefault();
            spaceHeld = true;
            state = 'CHARGING';
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            angle = Math.min(85, angle + 2);
            document.getElementById('angle-value').textContent = angle;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            angle = Math.max(10, angle - 2);
            document.getElementById('angle-value').textContent = angle;
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && state === 'CHARGING') {
        e.preventDefault();
        spaceHeld = false;
        launchRagdoll();
    }
});

// Touch / Click support
let touching = false;
document.addEventListener('mousedown', (e) => {
    if (state === 'AIM') {
        state = 'CHARGING';
        touching = true;
    }
});
document.addEventListener('mouseup', (e) => {
    if (state === 'CHARGING' && touching) {
        touching = false;
        launchRagdoll();
    }
});
document.addEventListener('touchstart', (e) => {
    if (state === 'AIM') {
        state = 'CHARGING';
        touching = true;
    }
});
document.addEventListener('touchend', (e) => {
    if (state === 'CHARGING' && touching) {
        touching = false;
        launchRagdoll();
    }
});

// ---- BUTTONS ----
document.getElementById('play-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    startGame();
});
document.getElementById('retry-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    startGame();
});

// ---- INIT ----
generateWorld();
gameLoop();

class Ghost {
    constructor(x, y, colorCode) {
        this.x = x;
        this.y = y;
        this.size = 20;
        this.speed = 4;
        this.colorCode = colorCode; // 'C', 'M', or 'Y'
        
        // Colors for additive blending
        this.colors = {
            'C': '#00FFFF', // Cyan
            'M': '#FF00FF', // Magenta
            'Y': '#FFFF00'  // Yellow
        };
        
        this.color = this.colors[colorCode];
        this.isDead = false;
        
        this.trail = [];
    }

    update(dx, dy, level) {
        if (this.isDead) return;

        // Save trail
        this.trail.push({x: this.x, y: this.y});
        if (this.trail.length > 20) this.trail.shift();

        // Check horizontal collision
        let newX = this.x + dx * this.speed;
        let cellX = Math.floor((newX + (dx > 0 ? this.size : 0)) / level.tileSize);
        let cellYTop = Math.floor(this.y / level.tileSize);
        let cellYBot = Math.floor((this.y + this.size - 0.1) / level.tileSize);

        if (!level.isSolid(cellX, cellYTop) && !level.isSolid(cellX, cellYBot)) {
            this.x = newX;
        }

        // Check vertical collision
        let newY = this.y + dy * this.speed;
        let cellY = Math.floor((newY + (dy > 0 ? this.size : 0)) / level.tileSize);
        let cellXLeft = Math.floor(this.x / level.tileSize);
        let cellXRight = Math.floor((this.x + this.size - 0.1) / level.tileSize);

        if (!level.isSolid(cellXLeft, cellY) && !level.isSolid(cellXRight, cellY)) {
            this.y = newY;
        }
        
        // Check Hazards and Exits
        let centerX = Math.floor((this.x + this.size/2) / level.tileSize);
        let centerY = Math.floor((this.y + this.size/2) / level.tileSize);
        
        if (level.isHazard(centerX, centerY)) {
            this.isDead = true;
        }
        
        if (level.isExit(centerX, centerY)) {
            this.hasWon = true;
        }
    }

    draw(ctx, isFocused) {
        if (this.isDead) return;

        // Draw trail
        if (this.trail.length > 0) {
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x + this.size/2, this.trail[0].y + this.size/2);
            for(let i=1; i<this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x + this.size/2, this.trail[i].y + this.size/2);
            }
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.3;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }

        // Draw ghost body
        ctx.fillStyle = this.color;
        
        // Additive blending happens globally in Renderer, here we just draw the shape
        ctx.fillRect(this.x, this.y, this.size, this.size);

        if (isFocused) {
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x - 4, this.y - 4, this.size + 8, this.size + 8);
        }
    }
}

class Player {
    constructor(level) {
        this.level = level;
        this.ghosts = [];
        this.focusedIndex = 0;
        
        this.spawn();
    }

    spawn() {
        this.ghosts = [];
        // Start with one Cyan ghost at spawn
        const startX = this.level.spawnPoint.x * this.level.tileSize + 10;
        const startY = this.level.spawnPoint.y * this.level.tileSize + 10;
        this.ghosts.push(new Ghost(startX, startY, 'C'));
        this.focusedIndex = 0;
    }

    update() {
        // Handle input
        let dx = 0;
        let dy = 0;

        if (Input.isDown('KeyW') || Input.isDown('ArrowUp')) dy -= 1;
        if (Input.isDown('KeyS') || Input.isDown('ArrowDown')) dy += 1;
        if (Input.isDown('KeyA') || Input.isDown('ArrowLeft')) dx -= 1;
        if (Input.isDown('KeyD') || Input.isDown('ArrowRight')) dx += 1;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx*dx + dy*dy);
            dx /= length;
            dy /= length;
        }

        // Move all active ghosts
        this.ghosts.forEach(g => g.update(dx, dy, this.level));

        // Division Quantique (Shift)
        if (Input.isJustPressed('ShiftLeft') || Input.isJustPressed('ShiftRight')) {
            this.split();
        }

        // Changer de focus (Tab)
        if (Input.isJustPressed('Tab')) {
            this.cycleFocus();
        }

        // Effondrement Quantique (Espace)
        if (Input.isJustPressed('Space')) {
            this.collapse();
        }

        // Restart (R)
        if (Input.isJustPressed('KeyR')) {
            this.spawn();
        }
        
        // Check if all ghosts are dead
        if (this.ghosts.length > 0 && this.ghosts.every(g => g.isDead)) {
            // Game Over -> Auto restart after small delay or instantly
            this.spawn();
        }
    }

    split() {
        // Can only have up to 3 ghosts (C, M, Y)
        if (this.ghosts.length >= 3) return;

        const focusedGhost = this.ghosts[this.focusedIndex];
        if (focusedGhost.isDead) return;

        // Determine available colors
        const usedColors = this.ghosts.map(g => g.colorCode);
        const allColors = ['C', 'M', 'Y'];
        const availableColors = allColors.filter(c => !usedColors.includes(c));

        if (availableColors.length > 0) {
            // Create new ghost exactly at focused ghost's position
            const newGhost = new Ghost(focusedGhost.x, focusedGhost.y, availableColors[0]);
            this.ghosts.push(newGhost);
            
            // Visual kick
            particles.emit(focusedGhost.x + 10, focusedGhost.y + 10, newGhost.color, 20);
            
            document.getElementById('ui').classList.add('glitch');
            setTimeout(() => document.getElementById('ui').classList.remove('glitch'), 200);
        }
    }

    cycleFocus() {
        if (this.ghosts.length === 0) return;
        
        let attempts = 0;
        do {
            this.focusedIndex = (this.focusedIndex + 1) % this.ghosts.length;
            attempts++;
        } while (this.ghosts[this.focusedIndex].isDead && attempts < this.ghosts.length);
    }

    collapse() {
        if (this.ghosts.length <= 1) return; // Nothing to collapse
        
        const focusedGhost = this.ghosts[this.focusedIndex];
        if (focusedGhost.isDead) return;

        // Destroy other ghosts visually
        this.ghosts.forEach((g, idx) => {
            if (idx !== this.focusedIndex && !g.isDead) {
                particles.emit(g.x + 10, g.y + 10, g.color, 30);
            }
        });

        // Keep only the focused ghost, remove others
        this.ghosts = [focusedGhost];
        this.focusedIndex = 0;
        
        particles.emit(focusedGhost.x + 10, focusedGhost.y + 10, '#FFFFFF', 40);

        // Screen flash effect
        document.body.style.backgroundColor = 'white';
        setTimeout(() => document.body.style.backgroundColor = '#050508', 50);
    }

    draw(ctx) {
        // We use 'lighter' composite operation to merge colors
        ctx.globalCompositeOperation = 'lighter';
        
        this.ghosts.forEach((g, index) => {
            g.draw(ctx, index === this.focusedIndex);
        });
        
        // Reset composite operation
        ctx.globalCompositeOperation = 'source-over';
    }
}

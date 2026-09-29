class Level {
    constructor() {
        this.tileSize = 40;
        this.grid = [];
        this.width = 0;
        this.height = 0;
        this.buttons = []; // {x, y, id, isPressed}
        this.doors = []; // {x, y, id, isOpen}
        this.spawnPoint = { x: 2, y: 2 };
    }

    load(mapData) {
        this.grid = mapData.layout;
        this.height = this.grid.length;
        this.width = this.grid[0].length;
        this.spawnPoint = mapData.spawn;
        
        // Setup interactive elements
        this.buttons = mapData.buttons || [];
        this.doors = mapData.doors || [];
        
        // Map elements into grid for easy collision
        // 0: Floor
        // 1: Wall
        // 2: Button (walkable)
        // 3: Door (walkable if open, otherwise block)
        // 4: Hazard (kills ghost)
    }

    update(ghosts) {
        // Reset all buttons
        this.buttons.forEach(b => b.isPressed = false);

        // Check if any ghost is on a button
        ghosts.forEach(g => {
            const gx = Math.floor((g.x + g.size/2) / this.tileSize);
            const gy = Math.floor((g.y + g.size/2) / this.tileSize);
            
            this.buttons.forEach(b => {
                if (b.x === gx && b.y === gy) {
                    b.isPressed = true;
                }
            });
        });

        // Update doors based on buttons
        this.doors.forEach(d => {
            // Un interrupteur ouvre une porte avec le même ID
            const trigger = this.buttons.find(b => b.id === d.id);
            if (trigger) {
                d.isOpen = trigger.isPressed;
            }
        });
    }

    isSolid(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true; // Bounds
        
        const cell = this.grid[y][x];
        if (cell === 1) return true; // Wall
        
        // Check doors
        for (let i = 0; i < this.doors.length; i++) {
            const d = this.doors[i];
            if (d.x === x && d.y === y && !d.isOpen) {
                return true; // Closed door
            }
        }
        
        return false;
    }

    isHazard(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        return this.grid[y][x] === 4;
    }

    isExit(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        return this.grid[y][x] === 5;
    }

    draw(ctx) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.grid[y][x];
                const px = x * this.tileSize;
                const py = y * this.tileSize;

                if (cell === 1) {
                    // Wall - Glass effect
                    ctx.fillStyle = 'rgba(20, 25, 35, 0.5)';
                    ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    ctx.strokeStyle = 'rgba(100, 150, 255, 0.2)';
                    ctx.strokeRect(px, py, this.tileSize, this.tileSize);
                } else if (cell === 4) {
                    // Hazard
                    ctx.fillStyle = 'rgba(255, 50, 50, 0.2)';
                    ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    
                    // Crosshatch pattern
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(px + this.tileSize, py + this.tileSize);
                    ctx.moveTo(px + this.tileSize, py);
                    ctx.lineTo(px, py + this.tileSize);
                    ctx.strokeStyle = 'rgba(255, 50, 50, 0.5)';
                    ctx.stroke();
                } else if (cell === 5) {
                    // Exit
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.setLineDash([5, 5]);
                    ctx.strokeRect(px + 4, py + 4, this.tileSize - 8, this.tileSize - 8);
                    ctx.setLineDash([]);
                } else {
                    // Floor (subtle grid)
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
                    ctx.strokeRect(px, py, this.tileSize, this.tileSize);
                }
            }
        }

        // Draw buttons
        this.buttons.forEach(b => {
            const px = b.x * this.tileSize;
            const py = b.y * this.tileSize;
            ctx.fillStyle = b.isPressed ? 'rgba(100, 255, 100, 0.6)' : 'rgba(100, 255, 100, 0.2)';
            ctx.fillRect(px + 8, py + 8, this.tileSize - 16, this.tileSize - 16);
            ctx.strokeStyle = '#64ff64';
            ctx.strokeRect(px + 8, py + 8, this.tileSize - 16, this.tileSize - 16);
        });

        // Draw doors
        this.doors.forEach(d => {
            const px = d.x * this.tileSize;
            const py = d.y * this.tileSize;
            if (!d.isOpen) {
                // Closed door
                ctx.fillStyle = 'rgba(255, 255, 100, 0.3)';
                ctx.fillRect(px, py, this.tileSize, this.tileSize);
                ctx.strokeStyle = '#ffff64';
                
                // Draw cross
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(px + this.tileSize, py + this.tileSize);
                ctx.moveTo(px + this.tileSize, py);
                ctx.lineTo(px, py + this.tileSize);
                ctx.stroke();
            } else {
                // Open door
                ctx.fillStyle = 'rgba(255, 255, 100, 0.05)';
                ctx.fillRect(px, py, this.tileSize, this.tileSize);
            }
        });
    }
}

class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Camera setup
        this.camera = { x: 0, y: 0 };
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    updateCamera(player, level) {
        // Camera follows the focused ghost
        if (player.ghosts.length > 0 && player.ghosts[player.focusedIndex] && !player.ghosts[player.focusedIndex].isDead) {
            const targetX = player.ghosts[player.focusedIndex].x + player.ghosts[player.focusedIndex].size/2;
            const targetY = player.ghosts[player.focusedIndex].y + player.ghosts[player.focusedIndex].size/2;
            
            // Smooth follow
            this.camera.x += (targetX - this.canvas.width/2 - this.camera.x) * 0.1;
            this.camera.y += (targetY - this.canvas.height/2 - this.camera.y) * 0.1;
        }
    }

    clear() {
        this.ctx.fillStyle = '#050508';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    draw(level, player, particles) {
        this.clear();
        
        this.ctx.save();
        
        // Apply camera transform
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // Draw level
        level.draw(this.ctx);

        // Draw player (ghosts)
        player.draw(this.ctx);

        // Draw particles
        if (particles) {
            particles.draw(this.ctx);
        }

        this.ctx.restore();
    }
}

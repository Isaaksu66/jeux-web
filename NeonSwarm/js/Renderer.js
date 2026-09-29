class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.camera = { x: 0, y: 0 };
        this.shakeTime = 0;
        this.shakeIntensity = 0;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    shake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeTime = duration;
    }

    updateCamera(player, dt) {
        // Suivi doux (Lerp)
        const targetX = player.x - this.canvas.width / 2;
        const targetY = player.y - this.canvas.height / 2;
        
        this.camera.x = MathUtils.lerp(this.camera.x, targetX, 0.1);
        this.camera.y = MathUtils.lerp(this.camera.y, targetY, 0.1);

        // Screen Shake
        if (this.shakeTime > 0) {
            this.shakeTime -= dt;
            const ox = (Math.random() - 0.5) * 2 * this.shakeIntensity;
            const oy = (Math.random() - 0.5) * 2 * this.shakeIntensity;
            this.camera.x += ox;
            this.camera.y += oy;
        }
    }

    clear() {
        this.ctx.fillStyle = '#020204';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    beginDraw() {
        this.clear();
        this.ctx.save();
        
        // Appliquer la transformation de la caméra
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Grille de fond pour donner une sensation de vitesse
        this.drawGrid();
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        const gridSize = 100;
        
        const startX = Math.floor(this.camera.x / gridSize) * gridSize;
        const startY = Math.floor(this.camera.y / gridSize) * gridSize;
        
        this.ctx.beginPath();
        for (let x = startX; x < this.camera.x + this.canvas.width; x += gridSize) {
            this.ctx.moveTo(x, this.camera.y);
            this.ctx.lineTo(x, this.camera.y + this.canvas.height);
        }
        for (let y = startY; y < this.camera.y + this.canvas.height; y += gridSize) {
            this.ctx.moveTo(this.camera.x, y);
            this.ctx.lineTo(this.camera.x + this.canvas.width, y);
        }
        this.ctx.stroke();
    }

    endDraw() {
        this.ctx.restore();
    }
}

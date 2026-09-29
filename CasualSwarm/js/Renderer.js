// Renderer.js
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
        const targetX = player.x - this.canvas.width / 2;
        const targetY = player.y - this.canvas.height / 2;
        
        this.camera.x = MathUtils.lerp(this.camera.x, targetX, 0.1);
        this.camera.y = MathUtils.lerp(this.camera.y, targetY, 0.1);

        if (this.shakeTime > 0) {
            this.shakeTime -= dt;
            const ox = (Math.random() - 0.5) * 2 * this.shakeIntensity;
            const oy = (Math.random() - 0.5) * 2 * this.shakeIntensity;
            this.camera.x += ox;
            this.camera.y += oy;
        }
    }

    clear() {
        // Fond vert clair (Grass)
        this.ctx.fillStyle = '#7CB342';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    beginDraw() {
        this.clear();
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        this.drawGrid();
    }

    drawGrid() {
        // Un damier de style pelouse tondue
        this.ctx.fillStyle = '#689F38'; // Vert plus foncé
        const gridSize = 100;
        
        const startX = Math.floor(this.camera.x / gridSize) * gridSize - gridSize;
        const startY = Math.floor(this.camera.y / gridSize) * gridSize - gridSize;
        
        for (let y = startY; y < this.camera.y + this.canvas.height + gridSize; y += gridSize) {
            for (let x = startX; x < this.camera.x + this.canvas.width + gridSize; x += gridSize) {
                // Alternance du motif
                if ((Math.abs(x / gridSize) + Math.abs(y / gridSize)) % 2 === 0) {
                    this.ctx.fillRect(x, y, gridSize, gridSize);
                }
            }
        }
    }

    endDraw() {
        this.ctx.restore();
    }
}

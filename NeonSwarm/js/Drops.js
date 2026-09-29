class Gem {
    constructor(x, y, value) {
        this.x = x + MathUtils.randomRange(-10, 10);
        this.y = y + MathUtils.randomRange(-10, 10);
        this.value = value;
        this.size = value > 2 ? 6 : 4;
        this.color = value > 2 ? '#0088ff' : '#00ffff';
        
        // Animation
        this.offsetY = 0;
        this.time = Math.random() * 100;
        
        // Attraction to player
        this.isMagnetic = false;
        this.speed = 0;
        this.isCollected = false;
    }

    update(dt, player) {
        if (this.isCollected) return;

        this.time += dt * 5;
        this.offsetY = Math.sin(this.time) * 3;

        const distSq = MathUtils.distanceSq(this.x, this.y, player.x, player.y);
        
        // Magnet radius (e.g. 100 pixels)
        if (distSq < 10000) {
            this.isMagnetic = true;
        }

        if (this.isMagnetic) {
            this.speed += 500 * dt; // Accélère vers le joueur
            const angle = MathUtils.angle(this.x, this.y, player.x, player.y);
            this.x += Math.cos(angle) * this.speed * dt;
            this.y += Math.sin(angle) * this.speed * dt;
            
            // Pickup range
            if (distSq < (player.size + this.size) * (player.size + this.size)) {
                player.gainXp(this.value, window.gameInstance);
                this.isCollected = true;
                Particles.emit(this.x, this.y, this.color, 3, 2, 0.1);
            }
        }
    }

    draw(ctx) {
        if (this.isCollected) return;
        
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 5;
        ctx.shadowColor = this.color;
        
        // Dessine un losange
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.size + this.offsetY);
        ctx.lineTo(this.x + this.size, this.y + this.offsetY);
        ctx.lineTo(this.x, this.y + this.size + this.offsetY);
        ctx.lineTo(this.x - this.size, this.y + this.offsetY);
        ctx.closePath();
        ctx.fill();
        
        ctx.shadowBlur = 0;
    }
}

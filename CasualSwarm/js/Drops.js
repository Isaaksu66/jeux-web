// Drops.js
class Gem {
    constructor(x, y, value) {
        this.x = x + MathUtils.randomRange(-10, 10);
        this.y = y + MathUtils.randomRange(-10, 10);
        this.value = value;
        this.size = value > 2 ? 8 : 6;
        
        this.baseColor = value > 2 ? '#FFD54F' : '#4FC3F7';
        this.borderColor = value > 2 ? '#FF8F00' : '#0288D1';
        
        this.offsetY = 0;
        this.time = Math.random() * 100;
        
        this.isMagnetic = false;
        this.speed = 0;
        this.isCollected = false;
    }

    update(dt, player) {
        if (this.isCollected) return;

        this.time += dt * 5;
        this.offsetY = Math.sin(this.time) * 4;

        const distSq = MathUtils.distanceSq(this.x, this.y, player.x, player.y);
        
        if (distSq < 10000) { // Juste milieu
            this.isMagnetic = true;
        }

        if (this.isMagnetic) {
            this.speed += 800 * dt; 
            const angle = MathUtils.angle(this.x, this.y, player.x, player.y);
            this.x += Math.cos(angle) * this.speed * dt;
            this.y += Math.sin(angle) * this.speed * dt;
            
            if (distSq < (player.size + this.size) * (player.size + this.size)) {
                if (typeof player.gainXp === 'function') {
                    player.gainXp(this.value, window.gameInstance);
                } else {
                    player.xp += this.value;
                }
                this.isCollected = true;
                Audio.play('pickup');
                Particles.emit(this.x, this.y, this.baseColor, 5, 2, 0.1);
            }
        }
    }

    draw(ctx) {
        if (this.isCollected) return;
        
        ctx.save();
        ctx.translate(this.x, this.y + this.offsetY);
        
        // Ombre sous la pièce
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 10 - this.offsetY, this.size, this.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pièce ou Cristal
        ctx.fillStyle = this.baseColor;
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        if (this.value > 2) {
            // Dessine une étoile (Grosse gemme)
            for (let i = 0; i < 5; i++) {
                ctx.lineTo(Math.cos( (18 + i * 72) / 180 * Math.PI ) * this.size,
                           -Math.sin( (18 + i * 72) / 180 * Math.PI ) * this.size);
                ctx.lineTo(Math.cos( (54 + i * 72) / 180 * Math.PI ) * (this.size/2),
                           -Math.sin( (54 + i * 72) / 180 * Math.PI ) * (this.size/2));
            }
            ctx.closePath();
        } else {
            // Dessine un petit cristal (losange)
            ctx.moveTo(0, -this.size);
            ctx.lineTo(this.size*0.8, 0);
            ctx.lineTo(0, this.size);
            ctx.lineTo(-this.size*0.8, 0);
            ctx.closePath();
        }
        
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}

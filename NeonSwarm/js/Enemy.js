class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        
        // Types: 0 = normal (rose), 1 = fast (jaune), 2 = tank (rouge)
        this.type = type;
        
        if (type === 0) {
            this.size = 10;
            this.speed = MathUtils.randomRange(80, 120);
            this.hp = 10;
            this.color = '#ff00ff'; // Magenta
            this.xpValue = 1;
        } else if (type === 1) {
            this.size = 8;
            this.speed = MathUtils.randomRange(150, 200);
            this.hp = 5;
            this.color = '#ffff00'; // Yellow
            this.xpValue = 2;
        } else {
            this.size = 20;
            this.speed = MathUtils.randomRange(40, 60);
            this.hp = 40;
            this.color = '#ff0055'; // Red
            this.xpValue = 5;
        }
        
        this.isDead = false;
        
        // Cooldown pour les dégâts infligés au joueur
        this.damageCooldown = 0;
    }

    update(dt, player, otherEnemies) {
        if (this.isDead) return;

        // Se diriger vers le joueur
        const angle = MathUtils.angle(this.x, this.y, player.x, player.y);
        let vx = Math.cos(angle) * this.speed;
        let vy = Math.sin(angle) * this.speed;
        
        // Séparation spatiale très simple pour éviter qu'ils s'entassent complètement en un point
        // On fait un check rapide sur quelques ennemis proches au hasard (optimisation vs boucle n^2)
        const checkCount = Math.min(otherEnemies.length, 5);
        for (let i = 0; i < checkCount; i++) {
            const index = Math.floor(Math.random() * otherEnemies.length);
            const other = otherEnemies[index];
            if (other === this || other.isDead) continue;
            
            const distSq = MathUtils.distanceSq(this.x, this.y, other.x, other.y);
            const minDist = this.size + other.size;
            
            if (distSq < minDist * minDist) {
                const sepAngle = MathUtils.angle(other.x, other.y, this.x, this.y);
                vx += Math.cos(sepAngle) * this.speed * 0.5;
                vy += Math.sin(sepAngle) * this.speed * 0.5;
            }
        }
        
        this.x += vx * dt;
        this.y += vy * dt;
        
        // Dégâts au joueur
        if (this.damageCooldown > 0) {
            this.damageCooldown -= dt;
        }
        
        const distToPlayerSq = MathUtils.distanceSq(this.x, this.y, player.x, player.y);
        const hitDist = this.size + player.size;
        
        if (distToPlayerSq < hitDist * hitDist && this.damageCooldown <= 0) {
            player.takeDamage(10);
            this.damageCooldown = 1.0; // 1 second cooldown
            
            // Recul visuel de l'ennemi
            this.x -= Math.cos(angle) * 20;
            this.y -= Math.sin(angle) * 20;
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        
        // Hit flash
        Particles.emit(this.x, this.y, '#ffffff', 3, 2, 0.1);
        
        if (this.hp <= 0) {
            this.isDead = true;
            Particles.emit(this.x, this.y, this.color, 15, 4);
        }
    }

    draw(ctx) {
        if (this.isDead) return;
        
        ctx.fillStyle = '#000';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        if (this.type === 0) {
            // Carré
            ctx.rect(this.x - this.size, this.y - this.size, this.size*2, this.size*2);
        } else if (this.type === 1) {
            // Triangle rapide
            ctx.moveTo(this.x, this.y - this.size);
            ctx.lineTo(this.x + this.size, this.y + this.size);
            ctx.lineTo(this.x - this.size, this.y + this.size);
            ctx.closePath();
        } else {
            // Hexagone Tank
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                const px = this.x + Math.cos(a) * this.size;
                const py = this.y + Math.sin(a) * this.size;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        }
        
        ctx.fill();
        ctx.stroke();
    }
}
